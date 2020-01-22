import Configstore from 'configstore';
import debugFactory from 'debug';
import { isLeft } from 'fp-ts/lib/Either';
import _ from 'lodash';
import { getMibFile, getMibs, toInt, MibDeviceV, NibusDecoder, printBuffer, PATH, } from '@nibus/core';
import { createInterface } from 'readline';
import fs from 'fs';
import detector from './detector';
import { Direction } from '../ipc/Server';
import { SerialTee, Server } from '../ipc';
const pkgName = '@nata/nibus.js';
const conf = new Configstore(pkgName, {
    logLevel: 'none',
    omit: ['priority'],
});
const debug = debugFactory('nibus:service');
const debugIn = debugFactory('nibus:INP<<<');
const debugOut = debugFactory('nibus:OUT>>>');
debug(`config path: ${conf.path}`);
const noop = () => { };
if (process.platform === 'win32') {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
}
const minVersionToInt = (str) => {
    if (!str)
        return 0;
    const [high, low] = str.split('.', 2);
    return (toInt(high) << 8) + toInt(low);
};
async function updateMibTypes() {
    const mibs = await getMibs();
    conf.set('mibs', mibs);
    const mibTypes = {};
    mibs.forEach(mib => {
        const mibfile = getMibFile(mib);
        const validation = MibDeviceV.decode(JSON.parse(fs.readFileSync(mibfile).toString()));
        if (isLeft(validation)) {
            debug(`<error>: Invalid mib file ${mibfile}`);
        }
        else {
            const { types } = validation.right;
            const device = types[validation.right.device];
            const type = toInt(device.appinfo.device_type);
            const minVersion = minVersionToInt(device.appinfo.min_version);
            const currentMibs = mibTypes[type] || [];
            currentMibs.push({
                mib,
                minVersion,
            });
            mibTypes[type] = _.sortBy(currentMibs, 'minVersion');
        }
    });
    conf.set('mibTypes', mibTypes);
}
updateMibTypes().catch(e => debug(`<error> ${e.message}`));
const decoderIn = new NibusDecoder();
decoderIn.on('data', (datagram) => {
    debugIn(datagram.toString({
        pick: conf.get('pick'),
        omit: conf.get('omit'),
    }));
});
const decoderOut = new NibusDecoder();
decoderOut.on('data', (datagram) => {
    debugOut(datagram.toString({
        pick: conf.get('pick'),
        omit: conf.get('omit'),
    }));
});
const loggers = {
    none: null,
    hex: (data, dir) => {
        switch (dir) {
            case Direction.in:
                debugIn(printBuffer(data));
                break;
            case Direction.out:
                debugOut(printBuffer(data));
                break;
            default:
                console.warn('invalid direction', dir);
                break;
        }
    },
    nibus: (data, dir) => {
        switch (dir) {
            case Direction.in:
                decoderIn.write(data);
                break;
            case Direction.out:
                decoderOut.write(data);
                break;
            default:
                console.warn('invalid direction', dir);
                break;
        }
    },
};
class NibusService {
    constructor() {
        this.isStarted = false;
        this.connections = [];
        this.logLevelHandler = (client, logLevel, pickFields, omitFields) => {
            logLevel && conf.set('logLevel', logLevel);
            pickFields && conf.set('pick', pickFields);
            omitFields && conf.set('omit', omitFields);
            this.updateLogger();
        };
        this.connectionHandler = (socket) => {
            const { server, connections } = this;
            server
                .send(socket, 'ports', connections.map(connection => connection.toJSON()))
                .catch(err => {
                debug('<error>', err.stack);
            });
        };
        this.addHandler = (portInfo) => {
            const { category } = portInfo;
            const mibCategory = detector.getDetection().mibCategories[category];
            if (mibCategory) {
                const connection = new SerialTee(portInfo, mibCategory);
                connection.on('close', (comName) => this.removeHandler({ comName }));
                this.connections.push(connection);
                this.server.broadcast('add', connection.toJSON()).catch(noop);
                this.updateLogger(connection);
            }
        };
        this.removeHandler = ({ comName }) => {
            const index = this.connections.findIndex(({ portInfo: { comName: port } }) => port === comName);
            if (index !== -1) {
                const [connection] = this.connections.splice(index, 1);
                connection.close();
                this.server.broadcast('remove', connection.toJSON()).catch(noop);
            }
        };
        this.server = new Server(PATH);
        this.server.on('connection', this.connectionHandler);
        this.server.on('client:setLogLevel', this.logLevelHandler);
    }
    get path() {
        return this.server.path;
    }
    updateLogger(connection) {
        const logger = loggers[conf.get('logLevel')];
        const connections = connection ? [connection] : this.connections;
        connections.forEach(con => con.setLogger(logger));
    }
    start() {
        if (this.isStarted)
            return;
        this.isStarted = true;
        const detection = detector.getDetection();
        if (detection == null)
            throw new Error('detection is N/A');
        detector.on('add', this.addHandler);
        detector.on('remove', this.removeHandler);
        detector.getPorts().catch(err => {
            console.error('error while get ports', err.stack);
        });
        detector.start();
        process.once('SIGINT', () => this.stop());
        process.once('SIGTERM', () => this.stop());
        debug('started');
    }
    stop() {
        if (!this.isStarted)
            return;
        const connections = this.connections.splice(0, this.connections.length);
        if (connections.length) {
            setTimeout(() => {
                connections.forEach(connection => connection.close());
            }, 0);
        }
        detector.removeListener('add', this.addHandler);
        detector.removeListener('remove', this.removeHandler);
        this.isStarted = false;
        debug('stopped');
    }
}
const service = new NibusService();
export default service;
//# sourceMappingURL=index.js.map