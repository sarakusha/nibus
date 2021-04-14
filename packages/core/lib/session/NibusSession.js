"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultSession = exports.findDeviceById = exports.getSessions = exports.getDefaultSession = exports.getNibusSession = exports.NibusSession = void 0;
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const Address_1 = __importDefault(require("../Address"));
const common_1 = require("../common");
const debug_1 = __importDefault(require("../debug"));
const ipc_1 = require("../ipc");
const mib_1 = require("../mib");
const nibus_1 = require("../nibus");
const nms_1 = require("../nms");
const debug = debug_1.default('nibus:session');
class NibusSession extends tiny_typed_emitter_1.TypedEmitter {
    constructor(port, host) {
        super();
        this.port = port;
        this.host = host;
        this.connections = [];
        this.nmsListeners = new Map();
        this.isStarted = false;
        this.devices = new mib_1.Devices();
        this.reloadHandler = (ports) => {
            const prev = this.connections.splice(0, this.connections.length);
            ports.forEach(port => {
                const { portInfo: { path }, } = port;
                const index = lodash_1.default.findIndex(prev, { path });
                if (index !== -1) {
                    this.connections.push(prev.splice(index, 1)[0]);
                }
                else {
                    this.addHandler(port).catch(common_1.noop);
                }
            });
            prev.forEach(connection => this.closeConnection(connection));
        };
        this.addHandler = async ({ portInfo: { path }, description }) => {
            try {
                debug('add');
                const { port, host } = this;
                const connection = new nibus_1.NibusConnection(this, path, description, port, host);
                const nmsListener = nms => {
                    if (nms.service === nms_1.NmsServiceType.InformationReport) {
                        this.emit('informationReport', connection, nms);
                    }
                };
                this.nmsListeners.set(connection, nmsListener);
                connection.on('nms', nmsListener);
                this.connections.push(connection);
                this.emit('add', connection);
                await common_1.delay(2000);
                this.find(connection);
                this.devices
                    .get()
                    .filter(device => device.connection == null)
                    .reduce(async (promise, device) => {
                    await promise;
                    debug('start ping');
                    const [time] = await connection.ping(device.address);
                    debug(`ping ${time}`);
                    if (time !== -1) {
                        device.connection = connection;
                        this.emit('connected', device);
                        debug(`mib-device ${device.address} was connected`);
                    }
                }, Promise.resolve())
                    .catch(common_1.noop);
            }
            catch (e) {
                console.error(e);
                debug(`error while new connection ${e.message}`);
            }
        };
        this.removeHandler = ({ portInfo: { path: port } }) => {
            const index = this.connections.findIndex(({ path }) => port === path);
            if (index !== -1) {
                const [connection] = this.connections.splice(index, 1);
                this.closeConnection(connection);
            }
        };
        this.devices.on('new', device => {
            if (!device.connection) {
                this.pingDevice(device).catch();
            }
        });
        this.devices.on('delete', device => {
            if (device.connection) {
                device.connection = undefined;
                this.emit('disconnected', device);
            }
        });
    }
    get ports() {
        return this.connections.length;
    }
    start() {
        return new Promise((resolve, reject) => {
            if (this.isStarted) {
                resolve(this.connections.length);
                return;
            }
            const { port, host } = this;
            this.socket = ipc_1.Client.connect({ port, host });
            this.socket.on('online', value => this.emit('online', value));
            this.socket.on('displays', value => this.emit('displays', value));
            this.socket.once('connect', () => {
                this.isStarted = true;
            });
            this.socket.once('error', error => {
                console.error('error while start nibus.service', error.message);
                if (this.isStarted)
                    this.close();
                else
                    reject(error);
            });
            this.socket.on('ports', this.reloadHandler);
            this.socket.on('add', this.addHandler);
            this.socket.on('remove', this.removeHandler);
            this.socket.once('ports', ports => {
                resolve(ports.length);
                this.emit('start');
            });
            this.socket.once('close', () => this.isStarted && this.close());
            this.socket.on('logLevel', level => {
                this.emit('logLevel', level);
            });
            this.socket.on('config', config => {
                this.emit('config', config);
            });
            this.socket.on('host', hostOpts => this.emit('host', hostOpts));
            this.socket.on('log', line => this.emit('log', line));
        });
    }
    connectDevice(device, connection) {
        if (device.connection === connection)
            return;
        device.connection = connection;
        const event = connection ? 'connected' : 'disconnected';
        process.nextTick(() => this.emit(event, device));
        debug(`mib-device [${device.address}] was ${event}`);
    }
    close() {
        if (!this.isStarted)
            return;
        this.isStarted = false;
        debug('close');
        this.emit('close');
        this.connections
            .splice(0, this.connections.length)
            .forEach(connection => this.closeConnection(connection));
        if (this.socket) {
            this.socket.destroy();
        }
    }
    async pingDevice(device) {
        const { connections } = this;
        const deviceType = Reflect.getMetadata('deviceType', device);
        if (device.connection && connections.includes(device.connection)) {
            const [timeout, info] = await device.connection.ping(device.address);
            if (timeout !== -1) {
                const { type } = info;
                if (deviceType === type)
                    return timeout;
            }
            device.connection = undefined;
            this.emit('disconnected', device);
        }
        const mib = Reflect.getMetadata('mib', device);
        const occupied = this.devices
            .get()
            .map(item => item.connection)
            .filter(connection => connection != null && !connection.description.link);
        const acceptable = lodash_1.default.difference(connections, occupied).filter(({ description }) => description.link || description.mib === mib);
        if (acceptable.length === 0)
            return -1;
        const [timeout, connection] = await Promise.race(acceptable.map(item => item
            .ping(device.address)
            .then(([t, info]) => common_1.tuplify((info === null || info === void 0 ? void 0 : info.type) === deviceType ? t : -1, item))));
        if (timeout === -1) {
            return -1;
        }
        this.connectDevice(device, connection);
        return timeout;
    }
    async ping(address) {
        const { connections } = this;
        const addr = new Address_1.default(address);
        if (connections.length === 0)
            return Promise.resolve([-1, undefined]);
        return Promise.race(connections.map(connection => connection.ping(addr)));
    }
    reloadDevices() {
        this.socket && this.socket.send('reloadDevices');
    }
    setLogLevel(logLevel) {
        this.socket && this.socket.send('setLogLevel', logLevel);
    }
    saveConfig(config) {
        this.socket && this.socket.send('config', config);
    }
    getBrightnessHistory(dt = Date.now()) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected'));
                return;
            }
            let timer = 0;
            const handler = (history) => {
                window.clearTimeout(timer);
                resolve(history);
            };
            timer = window.setTimeout(() => {
                var _a;
                (_a = this.socket) === null || _a === void 0 ? void 0 : _a.off('brightnessHistory', handler);
                reject(new Error('Timeout'));
            }, 1000);
            this.socket.once('brightnessHistory', handler);
            this.socket.send('getBrightnessHistory', dt);
        });
    }
    closeConnection(connection) {
        connection.close();
        const nmsListener = this.nmsListeners.get(connection);
        nmsListener && connection.off('nms', nmsListener);
        this.devices
            .get()
            .filter(device => device.connection === connection)
            .forEach(device => {
            device.connection = undefined;
            this.emit('disconnected', device);
            debug(`mib-device ${connection.path}#${device.address} was disconnected`);
        });
        this.emit('remove', connection);
    }
    find(connection) {
        const { description } = connection;
        const descriptions = Array.isArray(description.select) ? description.select : [description];
        const baseCategory = Array.isArray(description.select) ? description.category : null;
        const tryFind = () => {
            if (connection.isClosed)
                return;
            common_1.promiseArray(descriptions, async (desc) => {
                var _a;
                debug(`find ${JSON.stringify(connection.description)} ${baseCategory}`);
                if (baseCategory && connection.description.category !== baseCategory)
                    return;
                const { category } = desc;
                switch (desc.find) {
                    case 'sarp': {
                        let { type } = desc;
                        if (type === undefined) {
                            const mib = JSON.parse(fs_1.default.readFileSync(mib_1.getMibFile(desc.mib)).toString());
                            const { types } = mib;
                            const device = types[mib.device];
                            type = mib_1.toInt(device.appinfo.device_type);
                        }
                        try {
                            const sarpDatagram = await connection.findByType(type);
                            connection.description = desc;
                            const address = new Address_1.default(sarpDatagram.mac);
                            debug(`device ${category}[${address}] was found on ${connection.path}`);
                            this.emit('found', {
                                connection,
                                category: category,
                                address,
                            });
                            const devs = this.devices
                                .find(address)
                                .filter(dev => Reflect.getMetadata('deviceType', dev) === type);
                            if ((devs === null || devs === void 0 ? void 0 : devs.length) === 1) {
                                this.connectDevice(devs[0], connection);
                            }
                        }
                        catch (e) {
                            debug(`SARP error: ${e.message}, ${JSON.stringify(connection.description)}`);
                            if (!connection.isClosed)
                                setTimeout(() => tryFind(), 5000);
                        }
                        break;
                    }
                    case 'version':
                        try {
                            const { type, source: address } = (_a = (await connection.getVersion(Address_1.default.empty))) !== null && _a !== void 0 ? _a : {};
                            debug(`find version - type:${type}, address: ${address}, desc: ${JSON.stringify(desc)}`);
                            if (desc.type === type && address) {
                                debug(`category was changed: ${connection.description.category} => ${category}`);
                                connection.description = desc;
                                this.emit('found', {
                                    connection,
                                    category: category,
                                    address,
                                });
                                debug(`device ${category}[${address}] was found on ${connection.path}`);
                            }
                        }
                        catch (err) {
                            this.emit('pureConnection', connection);
                        }
                        break;
                    default:
                        this.emit('pureConnection', connection);
                        break;
                }
            }).catch(e => debug(`error while find ${e.message}`));
        };
        tryFind();
    }
}
exports.NibusSession = NibusSession;
const sessions = new Map();
const getKey = (port, host) => `${host !== null && host !== void 0 ? host : ''}:${port}`;
let defaultSession;
const getNibusSession = (port, host) => {
    var _a;
    if (port === void 0) { port = +((_a = process.env.NIBUS_PORT) !== null && _a !== void 0 ? _a : 9001); }
    const key = getKey(port, host);
    if (!sessions.has(key)) {
        const session = new NibusSession(port, host);
        session.once('close', () => {
            sessions.has(key) && sessions.delete(key);
        });
        sessions.set(key, session);
        if (!defaultSession)
            defaultSession = session;
    }
    return sessions.get(key);
};
exports.getNibusSession = getNibusSession;
const release = () => {
    const values = [...sessions.values()];
    sessions.clear();
    values.forEach(session => session.close());
    defaultSession = undefined;
};
const getDefaultSession = () => {
    if (!defaultSession) {
        defaultSession = exports.getNibusSession();
    }
    return defaultSession;
};
exports.getDefaultSession = getDefaultSession;
const getSessions = () => [...sessions.values()];
exports.getSessions = getSessions;
const findDeviceById = (id) => {
    const values = [...sessions.values()];
    for (let i = 0; i < values.length; i += 1) {
        const device = values[i].devices.findById(id);
        if (device)
            return device;
    }
    return undefined;
};
exports.findDeviceById = findDeviceById;
const setDefaultSession = (port, host) => {
    defaultSession = exports.getNibusSession(port, host);
    return defaultSession;
};
exports.setDefaultSession = setDefaultSession;
process.on('SIGINT', release);
process.on('SIGTERM', release);
//# sourceMappingURL=NibusSession.js.map