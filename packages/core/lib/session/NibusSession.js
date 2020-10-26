"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NibusSession = exports.delay = void 0;
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const Address_1 = __importDefault(require("../Address"));
const common_1 = require("../common");
const ipc_1 = require("../ipc");
const mib_1 = require("../mib");
const NibusConnection_1 = __importDefault(require("../nibus/NibusConnection"));
const nms_1 = require("../nms");
const common_2 = require("./common");
const debug = debug_1.default('nibus:session');
exports.delay = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));
class NibusSession extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.connections = [];
        this.isStarted = false;
        this.reloadHandler = (ports) => {
            const prev = this.connections.splice(0, this.connections.length);
            ports.forEach(port => {
                const { portInfo: { path }, } = port;
                const index = lodash_1.default.findIndex(prev, { path });
                if (index !== -1) {
                    this.connections.push(prev.splice(index, 1)[0]);
                }
                else {
                    this.addHandler(port);
                }
            });
            prev.forEach(connection => this.closeConnection(connection));
        };
        this.addHandler = async ({ portInfo: { path }, description }) => {
            debug('add');
            const connection = new NibusConnection_1.default(path, description);
            this.connections.push(connection);
            this.emit('add', connection);
            if (process.platform === 'win32')
                await exports.delay(2);
            this.find(connection);
            mib_1.devices
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
        };
        this.removeHandler = ({ portInfo: { path: port } }) => {
            const index = this.connections.findIndex(({ path }) => port === path);
            if (index !== -1) {
                const [connection] = this.connections.splice(index, 1);
                this.closeConnection(connection);
            }
        };
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
            this.socket = ipc_1.Client.connect(common_2.PATH);
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
        const occupied = mib_1.devices
            .get()
            .map(item => item.connection)
            .filter(connection => connection != null && !connection.description.link);
        const acceptables = lodash_1.default.difference(connections, occupied).filter(({ description }) => description.link || description.mib === mib);
        if (acceptables.length === 0)
            return -1;
        const [timeout, connection] = await Promise.race(acceptables.map(item => item.ping(device.address).then(t => [t, item])));
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
    closeConnection(connection) {
        connection.close();
        mib_1.devices
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
        descriptions.forEach(descr => {
            const { category } = descr;
            switch (descr.find) {
                case 'sarp': {
                    let { type } = descr;
                    if (type === undefined) {
                        const mib = JSON.parse(fs_1.default.readFileSync(mib_1.getMibFile(descr.mib)).toString());
                        const { types } = mib;
                        const device = types[mib.device];
                        type = mib_1.toInt(device.appinfo.device_type);
                    }
                    connection.once('sarp', (sarpDatagram) => {
                        if (baseCategory && connection.description.category !== baseCategory)
                            return;
                        if (baseCategory && connection.description.category === baseCategory) {
                            debug(`category was changed: ${connection.description.category} => ${category}`);
                            connection.description = descr;
                        }
                        const address = new Address_1.default(sarpDatagram.mac);
                        debug(`device ${category}[${address}] was found on ${connection.path}`);
                        this.emit('found', {
                            connection,
                            category,
                            address,
                        });
                    });
                    connection.findByType(type).catch(common_1.noop);
                    break;
                }
                case 'version':
                    connection.sendDatagram(nms_1.createNmsRead(Address_1.default.empty, 2)).then(datagram => {
                        if (!datagram || Array.isArray(datagram))
                            return;
                        if (connection.description.category === 'ftdi') {
                            debug(`category was changed: ${connection.description.category} => ${category}`);
                            connection.description = descr;
                        }
                        const address = new Address_1.default(datagram.source.mac);
                        this.emit('found', {
                            connection,
                            category,
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
        });
    }
}
exports.NibusSession = NibusSession;
//# sourceMappingURL=NibusSession.js.map