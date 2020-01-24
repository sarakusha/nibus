"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Address_1 = __importDefault(require("../Address"));
const nbconst_1 = require("../nbconst");
const NibusDatagram_1 = __importDefault(require("../nibus/NibusDatagram"));
class SarpDatagram extends NibusDatagram_1.default {
    constructor(frameOrOptions) {
        if (Buffer.isBuffer(frameOrOptions)) {
            super(frameOrOptions);
        }
        else {
            const options = Object.assign({ isResponse: false, mac: Address_1.default.empty.raw }, frameOrOptions);
            if (options.queryParam.length !== 5) {
                throw new Error('Invalid query param');
            }
            if (options.mac.length !== 6) {
                throw new Error('Invalid mac param');
            }
            const nibusData = [
                (options.isResponse ? 0x80 : 0) | (options.queryType),
                ...options.queryParam,
                ...options.mac,
            ];
            const nibusOptions = Object.assign({ data: Buffer.from(nibusData), protocol: 2 }, options);
            super(nibusOptions);
        }
        const { data } = this;
        console.assert(data.length === 12, 'Unexpected sarp length');
        this.isResponse = (data[0] & 0x80) !== 0;
        this.queryType = (data[0] & 0x0f);
        this.queryParam = data.slice(1, 6);
        this.mac = data.slice(6);
        Object.freeze(this);
    }
    static isSarpFrame(frame) {
        return Buffer.isBuffer(frame) && frame.length === nbconst_1.Offsets.DATA + 12 + 2
            && frame[nbconst_1.Offsets.PROTOCOL] === 2 && frame[nbconst_1.Offsets.LENGTH] === 13;
    }
    get deviceType() {
        return this.isResponse ? this.queryParam.readUInt16BE(3) : undefined;
    }
}
exports.default = SarpDatagram;
//# sourceMappingURL=SarpDatagram.js.map