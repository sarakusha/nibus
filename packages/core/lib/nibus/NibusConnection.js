"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINIHOST_TYPE = void 0;
const Either_1 = require("fp-ts/lib/Either");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const lodash_1 = __importDefault(require("lodash"));
const net_1 = require("net");
const xpipe_1 = __importDefault(require("xpipe"));
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const errors_1 = require("../errors");
const ipc_1 = require("../ipc");
const nms_1 = require("../nms");
const NmsServiceType_1 = __importDefault(require("../nms/NmsServiceType"));
const sarp_1 = require("../sarp");
const MibDescription_1 = require("../MibDescription");
const NibusEncoder_1 = __importDefault(require("./NibusEncoder"));
const NibusDecoder_1 = __importDefault(require("./NibusDecoder"));
const config_1 = __importDefault(require("./config"));
exports.MINIHOST_TYPE = 0xabc6;
const VERSION_ID = 2;
const debug = debug_1.default('nibus:connection');
class WaitedNmsDatagram {
    constructor(req, resolve, reject, callback) {
        this.req = req;
        let timer;
        let counter = req.service !== NmsServiceType_1.default.Read
            ? 1
            : Math.floor(req.nms.length / 3) + 1;
        const datagrams = [];
        const timeout = () => {
            callback(this);
            if (datagrams.length === 0) {
                reject(new errors_1.TimeoutError(`Timeout error on ${req.destination} while ${NmsServiceType_1.default[req.service]}`));
            }
            else {
                resolve(datagrams);
            }
        };
        const restart = (step = 1) => {
            counter -= step;
            clearTimeout(timer);
            if (counter > 0) {
                timer = setTimeout(timeout, req.timeout || config_1.default.timeout);
            }
            else if (counter === 0) {
                callback(this);
            }
            return counter === 0;
        };
        restart(0);
        this.resolve = (datagram) => {
            datagrams.push(datagram);
            if (restart()) {
                resolve(datagrams.length > 1 ? datagrams : datagram);
            }
        };
    }
}
class NibusConnection extends events_1.EventEmitter {
    constructor(path, description) {
        super();
        this.path = path;
        this.encoder = new NibusEncoder_1.default();
        this.decoder = new NibusDecoder_1.default();
        this.ready = Promise.resolve();
        this.closed = false;
        this.waited = [];
        this.close = () => {
            if (this.closed)
                return;
            const { path, description } = this;
            debug(`close connection on ${path} (${description.category})`);
            this.closed = true;
            this.encoder.end();
            this.decoder.removeAllListeners('data');
            this.socket.destroy();
            this.emit('close');
        };
        this.stopWaiting = (waited) => { lodash_1.default.remove(this.waited, waited); };
        this.onDatagram = (datagram) => {
            let showLog = true;
            if (datagram instanceof nms_1.NmsDatagram) {
                if (datagram.isResponse) {
                    const resp = this.waited.find(item => datagram.isResponseFor(item.req));
                    if (resp) {
                        resp.resolve(datagram);
                        showLog = false;
                    }
                }
                this.emit('nms', datagram);
            }
            else if (datagram instanceof sarp_1.SarpDatagram) {
                this.emit('sarp', datagram);
                showLog = false;
            }
            showLog
                && debug('datagram received', JSON.stringify(datagram.toJSON()));
        };
        const validate = MibDescription_1.MibDescriptionV.decode(description);
        if (Either_1.isLeft(validate)) {
            const msg = PathReporter_1.PathReporter.report(validate).join('\n');
            debug('<error>', msg);
            throw new TypeError(msg);
        }
        this.description = validate.right;
        this.socket = net_1.connect(xpipe_1.default.eq(ipc_1.getSocketPath(path)));
        this.socket.pipe(this.decoder);
        this.encoder.pipe(this.socket);
        this.decoder.on('data', this.onDatagram);
        this.socket.once('close', this.close);
        debug(`new connection on ${path} (${description.category})`);
    }
    sendDatagram(datagram) {
        const { encoder, stopWaiting, waited, closed, } = this;
        return new Promise((resolve, reject) => {
            this.ready = this.ready.finally(async () => {
                if (closed)
                    return reject(new Error('Closed'));
                if (!encoder.write(datagram)) {
                    await new Promise(cb => encoder.once('drain', cb));
                }
                if (!(datagram instanceof nms_1.NmsDatagram) || datagram.notReply) {
                    return resolve();
                }
                return waited.push(new WaitedNmsDatagram(datagram, resolve, reject, stopWaiting));
            });
        });
    }
    ping(address) {
        debug(`ping [${address.toString()}] ${this.path}`);
        const now = Date.now();
        return this.sendDatagram(nms_1.createNmsRead(address, VERSION_ID))
            .then(datagram => Number(Reflect.getOwnMetadata('timeStamp', datagram)) - now)
            .catch(() => -1);
    }
    findByType(type = exports.MINIHOST_TYPE) {
        debug(`findByType ${type} on ${this.path} (${this.description.category})`);
        const sarp = sarp_1.createSarp(sarp_1.SarpQueryType.ByType, [0, 0, 0, (type >> 8) & 0xFF, type & 0xFF]);
        return this.sendDatagram(sarp);
    }
    async getVersion(address) {
        const nmsRead = nms_1.createNmsRead(address, VERSION_ID);
        try {
            const { value, status } = await this.sendDatagram(nmsRead);
            if (status !== 0) {
                debug('<error>', status);
                return [];
            }
            const version = value & 0xFFFF;
            const type = value >>> 16;
            return [version, type];
        }
        catch (err) {
            debug('<error>', err.message || err);
            return [];
        }
    }
}
exports.default = NibusConnection;
//# sourceMappingURL=NibusConnection.js.map