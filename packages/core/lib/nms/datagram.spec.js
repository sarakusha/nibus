"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const crc_1 = require("crc");
const Address_1 = __importDefault(require("../Address"));
const nbconst_1 = require("../nbconst");
const NmsDatagram_1 = __importDefault(require("./NmsDatagram"));
const index_1 = require("./index");
describe('NmsDatagram tests', () => {
    const options = {
        destination: new Address_1.default('::12:34'),
        id: 123,
        isResponse: true,
        notReply: false,
        nms: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]),
        priority: 3,
        service: index_1.NmsServiceType.Read,
        source: new Address_1.default('FF::67'),
    };
    test('options test', () => {
        const nms = new NmsDatagram_1.default(options);
        expect(nms).toHaveProperty('destination', options.destination);
        expect(nms).toHaveProperty('id', options.id);
        expect(nms).toHaveProperty('isResponse', options.isResponse);
        expect(nms).toHaveProperty('notReply', options.notReply);
        expect(nms).toHaveProperty('nms', options.nms);
        expect(nms).toHaveProperty('priority', options.priority);
        expect(nms).toHaveProperty('service', options.service);
        expect(nms).toHaveProperty('source', options.source);
        expect(nms).toHaveProperty('protocol', 1);
    });
    test('to raw test', () => {
        const nms = new NmsDatagram_1.default(options);
        expect(nms.raw.readInt8(0)).toBe(nbconst_1.PREAMBLE);
        expect(nms.raw.length).toBe(nbconst_1.Offsets.DATA + (3 + options.nms.length) + 2);
    });
    test('from raw test', () => {
        const hexFrame = '7e000000006efa000000000000c004010802008d0d';
        const frame = Buffer.from(hexFrame, 'hex');
        const nms = new NmsDatagram_1.default(frame);
        expect(nms.destination.equals('::6e:fa')).toBe(true);
        expect(nms.source.equals(Address_1.default.empty)).toBe(true);
        expect(nms.service).toBe(index_1.NmsServiceType.Read);
        expect(nms.id).toBe(2);
        expect(crc_1.crc16ccitt(frame.slice(1, -2), 0)).toBe(frame.readUInt16BE(frame.length - 2));
    });
    test('circular test', () => {
        const nms = new NmsDatagram_1.default(options);
        const copy = new NmsDatagram_1.default(nms.raw);
        expect(nms).toEqual(copy);
        expect(nms.raw.equals(copy.raw)).toBe(true);
    });
    test('NmsRead', () => {
        const read = index_1.createNmsRead(Address_1.default.empty, 2);
        expect(read).toHaveProperty('id', 2);
    });
});
//# sourceMappingURL=datagram.spec.js.map