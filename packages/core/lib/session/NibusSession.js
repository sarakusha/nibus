"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NibusSession = void 0;
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const debug_1 = __importDefault(require("../debug"));
const Address_1 = __importDefault(require("../Address"));
const common_1 = require("../common");
const ipc_1 = require("../ipc");
const mib_1 = require("../mib");
const nibus_1 = require("../nibus");
const nms_1 = require("../nms");
const debug = debug_1.default('nibus:session');
class NibusSession extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.connections = [];
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
                const connection = new nibus_1.NibusConnection(path, description);
                this.connections.push(connection);
                this.emit('add', connection);
                if (process.platform === 'win32')
                    await common_1.delay(2000);
                this.find(connection);
                this.devices
                    .get()
                    .filter(device => device.connection == null)
                    .reduce(async (promise, device) => {
                    await promise;
                    debug('start ping');
                    const time = await connection.ping(device.address);
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
                debug(e);
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
            this.isStarted = true;
            this.socket = ipc_1.Client.connect(common_1.PATH);
            this.socket.once('error', error => {
                console.error('error while start nibus.service', error.message);
                this.close();
                reject(error);
            });
            this.socket.on('ports', this.reloadHandler);
            this.socket.on('add', this.addHandler);
            this.socket.on('remove', this.removeHandler);
            this.socket.once('ports', ports => {
                resolve(ports.length);
                this.emit('start');
            });
            this.socket.once('close', () => this.close());
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
        this.socket && this.socket.destroy();
    }
    async pingDevice(device) {
        const { connections } = this;
        if (device.connection && connections.includes(device.connection)) {
            const timeout = await device.connection.ping(device.address);
            if (timeout !== -1)
                return timeout;
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
        const [timeout, connection] = await Promise.race(acceptable.map(item => item.ping(device.address).then(t => [t, item])));
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
            return Promise.resolve(-1);
        return Promise.race(connections.map(connection => connection.ping(addr)));
    }
    reloadDevices() {
        this.socket && this.socket.send('reloadDevices');
    }
    setLogLevel(logLevel) {
        this.socket && this.socket.send('setLogLevel', logLevel);
    }
    closeConnection(connection) {
        connection.close();
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
        common_1.promiseArray(descriptions, async (desc) => {
            debug(`%o ${baseCategory}`, connection.description);
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
                        debug(`category was changed: ${connection.description.category} => ${category}`);
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
                        debug('SARP: %s, %o', e.message, connection.description);
                    }
                    break;
                }
                case 'version':
                    connection.sendDatagram(nms_1.createNmsRead(Address_1.default.empty, 2)).then(datagram => {
                        if (!datagram || Array.isArray(datagram))
                            return;
                        debug(`category was changed: ${connection.description.category} => ${category}`);
                        connection.description = desc;
                        const address = new Address_1.default(datagram.source.mac);
                        this.emit('found', {
                            connection,
                            category: category,
                            address,
                        });
                        debug(`device ${category}[${address}] was found on ${connection.path}`);
                    }, () => {
                        this.emit('pureConnection', connection);
                    });
                    break;
                default:
                    this.emit('pureConnection', connection);
                    break;
            }
        }).catch(e => debug(`error while find ${e.message}`));
    }
}
exports.NibusSession = NibusSession;
//# sourceMappingURL=NibusSession.js.map