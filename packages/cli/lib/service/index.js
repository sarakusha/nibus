"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const configstore_1 = __importDefault(require("configstore"));
const debug_1 = __importDefault(require("debug"));
const Either_1 = require("fp-ts/lib/Either");
const lodash_1 = __importDefault(require("lodash"));
const core_1 = require("@nibus/core");
const readline_1 = require("readline");
const fs_1 = __importDefault(require("fs"));
const detector_1 = __importDefault(require("./detector"));
const Server_1 = require("../ipc/Server");
const ipc_1 = require("../ipc");
const pkgName = '@nata/nibus.js';
const conf = new configstore_1.default(pkgName, {
    logLevel: 'none',
    omit: ['priority'],
});
const debug = debug_1.default('nibus:service');
const debugIn = debug_1.default('nibus:INP<<<');
const debugOut = debug_1.default('nibus:OUT>>>');
debug(`config path: ${conf.path}`);
const noop = () => { };
if (process.platform === 'win32') {
    const rl = readline_1.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
}
const minVersionToInt = (str) => {
    if (!str)
        return 0;
    const [high, low] = str.split('.', 2);
    return (core_1.toInt(high) << 8) + core_1.toInt(low);
};
function updateMibTypes() {
    return __awaiter(this, void 0, void 0, function* () {
        const mibs = yield core_1.getMibs();
        conf.set('mibs', mibs);
        const mibTypes = {};
        mibs.forEach(mib => {
            const mibfile = core_1.getMibFile(mib);
            const validation = core_1.MibDeviceV.decode(JSON.parse(fs_1.default.readFileSync(mibfile).toString()));
            if (Either_1.isLeft(validation)) {
                debug(`<error>: Invalid mib file ${mibfile}`);
            }
            else {
                const { types } = validation.right;
                const device = types[validation.right.device];
                const type = core_1.toInt(device.appinfo.device_type);
                const minVersion = minVersionToInt(device.appinfo.min_version);
                const currentMibs = mibTypes[type] || [];
                currentMibs.push({
                    mib,
                    minVersion,
                });
                mibTypes[type] = lodash_1.default.sortBy(currentMibs, 'minVersion');
            }
        });
        conf.set('mibTypes', mibTypes);
    });
}
updateMibTypes().catch(e => debug(`<error> ${e.message}`));
const decoderIn = new core_1.NibusDecoder();
decoderIn.on('data', (datagram) => {
    debugIn(datagram.toString({
        pick: conf.get('pick'),
        omit: conf.get('omit'),
    }));
});
const decoderOut = new core_1.NibusDecoder();
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
            case Server_1.Direction.in:
                debugIn(core_1.printBuffer(data));
                break;
            case Server_1.Direction.out:
                debugOut(core_1.printBuffer(data));
                break;
            default:
                console.warn('invalid direction', dir);
                break;
        }
    },
    nibus: (data, dir) => {
        switch (dir) {
            case Server_1.Direction.in:
                decoderIn.write(data);
                break;
            case Server_1.Direction.out:
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
            const mibCategory = detector_1.default.getDetection().mibCategories[category];
            if (mibCategory) {
                const connection = new ipc_1.SerialTee(portInfo, mibCategory);
                connection.on('close', (path) => this.removeHandler({ path }));
                this.connections.push(connection);
                this.server.broadcast('add', connection.toJSON()).catch(noop);
                this.updateLogger(connection);
            }
        };
        this.removeHandler = ({ path }) => {
            const index = this.connections.findIndex(({ portInfo: { path: port } }) => port === path);
            if (index !== -1) {
                const [connection] = this.connections.splice(index, 1);
                connection.close();
                this.server.broadcast('remove', connection.toJSON()).catch(noop);
            }
        };
        this.server = new ipc_1.Server(core_1.PATH);
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
        const detection = detector_1.default.getDetection();
        if (detection == null)
            throw new Error('detection is N/A');
        detector_1.default.on('add', this.addHandler);
        detector_1.default.on('remove', this.removeHandler);
        detector_1.default.getPorts().catch(err => {
            console.error('error while get ports', err.stack);
        });
        detector_1.default.start();
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
        detector_1.default.removeListener('add', this.addHandler);
        detector_1.default.removeListener('remove', this.removeHandler);
        detector_1.default.stop();
        this.isStarted = false;
        debug('stopped');
    }
}
const service = new NibusService();
exports.default = service;
//# sourceMappingURL=index.js.map