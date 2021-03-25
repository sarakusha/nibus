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
exports.detectionPath = exports.NibusService = void 0;
const core_1 = require("@nibus/core");
const configstore_1 = __importDefault(require("configstore"));
const Either_1 = require("fp-ts/lib/Either");
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const os_1 = __importDefault(require("os"));
const readline_1 = require("readline");
const bonjour_hap_1 = __importDefault(require("bonjour-hap"));
const debug_1 = __importDefault(require("../debug"));
const ipc_1 = require("../ipc");
const detector_1 = __importDefault(require("./detector"));
const bonjour = bonjour_hap_1.default();
const pkgName = '@nata/nibus.js';
const conf = new configstore_1.default(pkgName, {
    logLevel: 'none',
    omit: ['priority'],
});
const debug = debug_1.default('nibus:service');
const debugIn = debug_1.default('nibus:<<<');
const debugOut = debug_1.default('nibus:>>>');
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
            case ipc_1.Direction.in:
                debugIn(core_1.printBuffer(data));
                break;
            case ipc_1.Direction.out:
                debugOut(core_1.printBuffer(data));
                break;
            default:
                console.warn('invalid direction', dir);
                break;
        }
    },
    nibus: (data, dir) => {
        switch (dir) {
            case ipc_1.Direction.in:
                decoderIn.write(data);
                break;
            case ipc_1.Direction.out:
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
        var _a;
        this.port = +((_a = process.env.NIBUS_PORT) !== null && _a !== void 0 ? _a : 9001);
        this.isStarted = false;
        this.logLevelHandler = (client, logLevel) => {
            debug(`setLogLevel: ${logLevel}`);
            if (logLevel) {
                conf.set('logLevel', logLevel);
                this.server
                    .broadcast('logLevel', logLevel)
                    .catch(e => debug(`error while broadcast: ${e.message}`));
            }
            this.updateLogger();
        };
        this.connectionHandler = (socket) => {
            const { server } = this;
            server
                .send(socket, 'ports', Object.values(server.ports).map(port => port.toJSON()))
                .catch(err => debug(`<error> while send 'ports': ${err.message}`));
            server
                .send(socket, 'host', {
                name: os_1.default.hostname(),
                platform: os_1.default.platform(),
                arch: os_1.default.arch(),
                version: os_1.default.version(),
            })
                .catch(err => debug(`<error> while send 'host': ${err.message}`));
            debug(`logLevel`, conf.get('logLevel'));
            server
                .send(socket, 'logLevel', conf.get('logLevel'))
                .catch(e => debug(`error while send logLevel ${e.message}`));
        };
        this.addHandler = (portInfo) => {
            const { category } = portInfo;
            const mibCategory = detector_1.default.getDetection().mibCategories[category];
            if (mibCategory) {
                const serial = new ipc_1.SerialTee(portInfo, mibCategory);
                serial.on('close', (path) => this.removeHandler({ path }));
                this.server.ports[serial.path] = serial;
                this.server.broadcast('add', serial.toJSON()).catch(noop);
                this.updateLogger(serial);
            }
        };
        this.removeHandler = ({ path }) => {
            const serial = this.server.ports[path];
            if (serial) {
                delete this.server.ports[path];
                serial.close();
                this.server.broadcast('remove', serial.toJSON()).catch(noop);
            }
        };
        this.server = new ipc_1.Server();
        this.server.on('connection', this.connectionHandler);
        this.server.on('client:setLogLevel', this.logLevelHandler);
        this.server.on('client:reloadDevices', this.reload);
    }
    get path() {
        return this.server.path;
    }
    updateLogger(connection) {
        const logger = loggers[conf.get('logLevel')];
        const connections = connection ? [connection] : Object.values(this.server.ports);
        connections.forEach(con => con.setLogger(logger));
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isStarted)
                return;
            yield this.server.listen(this.port, process.env.NIBUS_HOST);
            this.isStarted = true;
            this.ad = bonjour.publish({
                name: os_1.default.hostname().replace(/\.local\.?$/, ''),
                type: 'nibus',
                port: this.port,
                txt: {
                    version: require('../../package.json').version,
                },
            });
            const detection = detector_1.default.getDetection();
            if (detection == null)
                throw new Error('detection is N/A');
            detector_1.default.on('add', this.addHandler);
            detector_1.default.on('remove', this.removeHandler);
            detector_1.default.start();
            process.once('SIGINT', () => this.stop());
            process.once('SIGTERM', () => this.stop());
            debug('started');
            yield detector_1.default.getPorts();
        });
    }
    stop() {
        if (!this.isStarted)
            return;
        if (this.ad) {
            this.ad.stop();
            this.ad = undefined;
        }
        this.server.close();
        detector_1.default.removeListener('add', this.addHandler);
        detector_1.default.removeListener('remove', this.removeHandler);
        detector_1.default.stop();
        this.server.close();
        this.isStarted = false;
        debug('stopped');
    }
    reload() {
        detector_1.default.reload();
    }
}
exports.NibusService = NibusService;
const service = new NibusService();
var detector_2 = require("./detector");
Object.defineProperty(exports, "detectionPath", { enumerable: true, get: function () { return detector_2.detectionPath; } });
exports.default = service;
//# sourceMappingURL=index.js.map