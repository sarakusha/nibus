"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const devices_1 = __importDefault(require("../mib/devices"));
const nms_1 = require("../nms");
const nms_2 = require("../nms/nms");
const NmsServiceType_1 = __importDefault(require("../nms/NmsServiceType"));
const helper_1 = require("./helper");
const NibusDatagram_1 = require("./NibusDatagram");
const debug = debug_1.default('nibus:mock-connection');
class MockNibusConnection extends events_1.EventEmitter {
    constructor() {
        super();
        this.path = 'mock-serial';
        this.description = { type: 0xabc6, find: 'sarp', category: 'minihost', mib: 'minihost3' };
    }
    close() {
        const { path, description } = this;
        debug(`close connection on ${path} (${description.category})`);
        this.emit('close');
    }
    findByType(_type) {
        throw new TypeError('NotImpl');
    }
    getVersion(_address) {
        return Promise.resolve([3, 2]);
    }
    ping(_address) {
        return MockNibusConnection.pingImpl();
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
    nmsReadResponse(nmsDatagram) {
        var _a;
        const { id, nms, source, destination } = nmsDatagram;
        const [device] = (_a = devices_1.default.find(destination)) !== null && _a !== void 0 ? _a : [];
        if (!device)
            throw new Error(`Unknown device ${destination}`);
        const ids = [id];
        if (nms) {
            ids.push(...helper_1.chunkArray(nms, 3).map(([hi, low]) => ((hi & 0b111) << 8) | low));
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
    static pingImpl() {
        return Promise.resolve(Math.round(Math.random() * 100));
    }
}
exports.default = MockNibusConnection;
//# sourceMappingURL=MockNibusConnection.js.map