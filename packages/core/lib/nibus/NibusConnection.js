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
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const debug_1 = __importDefault(require("../debug"));
const Address_1 = __importDefault(require("../Address"));
const errors_1 = require("../errors");
const nms_1 = require("../nms");
const NmsServiceType_1 = __importDefault(require("../nms/NmsServiceType"));
const sarp_1 = require("../sarp");
const MibDescription_1 = require("../MibDescription");
const slip_1 = require("../slip");
const NibusEncoder_1 = __importDefault(require("./NibusEncoder"));
const NibusDecoder_1 = __importDefault(require("./NibusDecoder"));
const config_1 = __importDefault(require("./config"));
const common_1 = require("../common");
exports.MINIHOST_TYPE = 0xabc6;
const VERSION_ID = 2;
const debug = debug_1.default('nibus:connection');
class WaitedNmsDatagram {
    constructor(req, resolve, reject, callback) {
        this.req = req;
        let timer;
        let counter = req.service !== NmsServiceType_1.default.Read ? 1 : Math.floor(req.nms.length / 3) + 1;
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
                timer = global.setTimeout(timeout, req.timeout || config_1.default.timeout);
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
const empty = Buffer.alloc(0);
class NibusConnection extends tiny_typed_emitter_1.TypedEmitter {
    constructor(session, path, description, port, host) {
        super();
        this.session = session;
        this.path = path;
        this.port = port;
        this.host = host;
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
        this.stopWaiting = (waited) => {
            lodash_1.default.remove(this.waited, waited);
        };
        this.onDatagram = (datagram) => {
            if (datagram instanceof nms_1.NmsDatagram) {
                if (datagram.isResponse) {
                    const resp = this.waited.find(item => datagram.isResponseFor(item.req));
                    if (resp) {
                        resp.resolve(datagram);
                    }
                }
                this.emit('nms', datagram);
            }
            else if (datagram instanceof sarp_1.SarpDatagram) {
                this.emit('sarp', datagram);
            }
        };
        const validate = MibDescription_1.MibDescriptionV.decode(description);
        if (Either_1.isLeft(validate)) {
            const msg = PathReporter_1.PathReporter.report(validate).join('\n');
            debug(`<error> ${msg}`);
            throw new TypeError(msg);
        }
        this.description = validate.right;
        this.socket = net_1.connect(port, host, () => {
            this.socket.write(path);
            window.setTimeout(() => {
                this.socket.pipe(this.decoder);
                this.encoder.pipe(this.socket);
            }, 100);
        });
        this.decoder.on('data', this.onDatagram);
        this.socket.once('close', this.close);
        debug(`new connection on ${path} (${description.category})`);
    }
    get isClosed() {
        return this.closed;
    }
    sendDatagram(datagram) {
        const { encoder, stopWaiting, waited, closed } = this;
        return new Promise((resolve, reject) => {
            this.ready = this.ready.finally(async () => {
                if (closed)
                    return reject(new Error('Closed'));
                if (!encoder.write(datagram)) {
                    await new Promise(cb => encoder.once('drain', cb));
                }
                if (!(datagram instanceof nms_1.NmsDatagram) || datagram.notReply) {
                    return resolve(undefined);
                }
                return waited.push(new WaitedNmsDatagram(datagram, resolve, reject, stopWaiting));
            });
        });
    }
    ping(address) {
        const now = Date.now();
        return this.getVersion(address)
            .then(response => response
            ? common_1.tuplify(response.timestamp - now, response)
            : [-1, undefined])
            .catch(() => [-1, undefined]);
    }
    findByType(type = exports.MINIHOST_TYPE) {
        debug(`findByType ${type} on ${this.path} (${this.description.category})`);
        const sarp = sarp_1.createSarp(sarp_1.SarpQueryType.ByType, [0, 0, 0, (type >> 8) & 0xff, type & 0xff]);
        let sarpHandler = () => { };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new errors_1.TimeoutError("Device didn't respond")), config_1.default.timeout);
            sarpHandler = sarpDatagram => {
                clearTimeout(timeout);
                resolve(sarpDatagram);
            };
            this.once('sarp', sarpHandler);
            return this.sendDatagram(sarp);
        }).finally(() => this.off('sarp', sarpHandler));
    }
    async getVersion(address) {
        const nmsRead = nms_1.createNmsRead(address, VERSION_ID);
        try {
            const datagram = (await this.sendDatagram(nmsRead));
            const { value, status, source } = datagram;
            const timestamp = Number(Reflect.getOwnMetadata('timeStamp', datagram));
            if (status !== 0) {
                debug(`<error> ${status}`);
                return undefined;
            }
            const version = value & 0xffff;
            const type = value >>> 16;
            return { version, type, source, timestamp, connection: this };
        }
        catch (err) {
            return undefined;
        }
    }
    async execBootloader(fn, data) {
        const { finishSlip, encoder, decoder } = this;
        if (!finishSlip)
            throw new Error('SLIP mode required');
        const chunks = slip_1.slipChunks(fn, data);
        const wait = () => {
            let onData = (__) => { };
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new errors_1.TimeoutError(`execBootloader timeout ${fn}`));
                }, 2000);
                onData = (datagram) => {
                    if (datagram instanceof slip_1.SlipDatagram) {
                        clearTimeout(timer);
                        resolve(datagram);
                    }
                };
                decoder.on('data', onData);
            }).finally(() => decoder.off('data', onData));
        };
        let response = new slip_1.SlipDatagram(empty);
        for (const [chunk, offset] of chunks) {
            this.emit('chunk', offset);
            const datagram = new slip_1.SlipDatagram(chunk);
            encoder.write(datagram);
            response = await wait();
            if (response.errorCode !== undefined) {
                chunks.throw(new Error(`error ${response.errorCode}`));
                break;
            }
        }
        return response;
    }
    slipStart(force = false) {
        if (this.finishSlip)
            return Promise.resolve(true);
        return new Promise(resolve => {
            this.ready.finally(async () => {
                if (this.description.mib !== 'minihost3')
                    return resolve(false);
                if (!force) {
                    const readResp = await this.sendDatagram(nms_1.createNmsRead(Address_1.default.empty, 0x3a8));
                    if (!readResp || Array.isArray(readResp) || readResp.value !== true)
                        return resolve(false);
                    await this.sendDatagram(nms_1.createExecuteProgramInvocation(Address_1.default.empty, 12));
                }
                this.ready = new Promise(finishSlip => {
                    this.finishSlip = finishSlip;
                    this.decoder.setSlipMode(true);
                });
                force || (await common_1.delay(1000));
                return resolve(true);
            });
        });
    }
    slipFinish() {
        if (this.finishSlip) {
            this.decoder.setSlipMode(false);
            this.finishSlip();
            this.finishSlip = undefined;
        }
    }
}
exports.default = NibusConnection;
//# sourceMappingURL=NibusConnection.js.map