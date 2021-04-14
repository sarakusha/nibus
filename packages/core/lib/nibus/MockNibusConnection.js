"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const common_1 = require("../common");
const debug_1 = __importDefault(require("../debug"));
const Address_1 = __importDefault(require("../Address"));
const nms_1 = require("../nms");
const nms_2 = require("../nms/nms");
const NmsServiceType_1 = __importDefault(require("../nms/NmsServiceType"));
const slip_1 = require("../slip");
const NibusDatagram_1 = require("./NibusDatagram");
const debug = debug_1.default('nibus:mock-connection');
class MockNibusConnection extends tiny_typed_emitter_1.TypedEmitter {
    constructor(session, devices) {
        super();
        this.session = session;
        this.devices = devices;
        this.path = 'mock-serial';
        this.closed = false;
        this.description = { type: 0xabc6, find: 'sarp', category: 'minihost', mib: 'minihost3' };
    }
    close() {
        const { path, description } = this;
        debug(`close connection on ${path} (${description.category})`);
        this.closed = true;
        this.emit('close');
    }
    findByType(_type) {
        throw new TypeError('NotImpl');
    }
    getVersion(address) {
        return Promise.resolve({
            version: 3,
            type: 2,
            source: new Address_1.default(address),
            timestamp: 0,
            connection: this,
        });
    }
    async ping(address) {
        return common_1.tuplify(await MockNibusConnection.pingImpl(), await this.getVersion(address));
    }
    sendDatagram(datagram) {
        if (datagram.protocol === NibusDatagram_1.Protocol.NMS) {
            const nmsDatagram = datagram;
            switch (nmsDatagram.service) {
                case NmsServiceType_1.default.Read:
                    return this.nmsReadResponse(nmsDatagram);
                case NmsServiceType_1.default.Write:
                    return new Promise(resolve => process.nextTick(() => resolve(new nms_1.NmsDatagram({
                        id: nmsDatagram.id,
                        isResponse: true,
                        nms: Buffer.from([0]),
                        destination: nmsDatagram.source,
                        service: NmsServiceType_1.default.Write,
                    }))));
                default:
                    throw new TypeError(`NotImpl ${NmsServiceType_1.default[nmsDatagram.service]}`);
            }
        }
        return Promise.resolve(undefined);
    }
    get isClosed() {
        return this.closed;
    }
    nmsReadResponse(nmsDatagram) {
        var _a;
        const { id, nms, source, destination } = nmsDatagram;
        const [device] = (_a = this.devices.find(destination)) !== null && _a !== void 0 ? _a : [];
        if (!device)
            throw new Error(`Unknown device ${destination}`);
        const ids = [id];
        if (nms) {
            ids.push(...common_1.chunkArray(nms, 3).map(([hi, low]) => ((hi & 0b111) << 8) | low));
        }
        return new Promise(resolve => {
            process.nextTick(() => {
                resolve(ids.filter(Boolean).map(varId => {
                    const name = device.getName(varId);
                    const type = nms_1.getNmsType(Reflect.getMetadata('simpleType', device, name));
                    const size = nms_2.getSizeOf(type);
                    const buffer = Buffer.alloc(2 + size);
                    buffer[1] = type;
                    if (name === 'serno') {
                        buffer.writeUInt16LE(0xdead, 2);
                    }
                    return new nms_1.NmsDatagram({
                        id: varId,
                        service: NmsServiceType_1.default.Read,
                        isResponse: true,
                        destination: source,
                        nms: buffer,
                    });
                }));
            });
        });
    }
    slipStart() {
        return Promise.resolve(false);
    }
    slipFinish() { }
    execBootloader() {
        return Promise.resolve(new slip_1.SlipDatagram(Buffer.alloc(0)));
    }
    static pingImpl() {
        return Promise.resolve(Math.round(Math.random() * 100));
    }
}
exports.default = MockNibusConnection;
//# sourceMappingURL=MockNibusConnection.js.map