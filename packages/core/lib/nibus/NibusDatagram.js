"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const crc_1 = require("crc");
const lodash_1 = __importDefault(require("lodash"));
const Address_1 = __importDefault(require("../Address"));
const nbconst_1 = require("../nbconst");
const helper_1 = require("./helper");
var Protocol;
(function (Protocol) {
    Protocol[Protocol["NMS"] = 1] = "NMS";
    Protocol[Protocol["SARP"] = 2] = "SARP";
})(Protocol = exports.Protocol || (exports.Protocol = {}));
const leadZero = (value) => value.toString().padStart(2, '0');
const replaceBuffers = (obj) => Object.entries(obj).reduce((result, [name, value]) => (Object.assign(Object.assign({}, result), { [name]: Buffer.isBuffer(value) ? helper_1.printBuffer(value) : lodash_1.default.isPlainObject(value)
        ? replaceBuffers(value)
        : value })), {});
class NibusDatagram {
    constructor(frameOrOptions) {
        if (Buffer.isBuffer(frameOrOptions)) {
            const frame = Buffer.from(frameOrOptions);
            console.assert(nbconst_1.Offsets.DATA < frame.length && frame.length < 256, 'Invalid datagram');
            this.raw = frame;
        }
        else {
            const options = Object.assign({ priority: 0, source: NibusDatagram.defaultSource }, frameOrOptions);
            console.assert(options.data.length <= nbconst_1.MAX_DATA_LENGTH);
            const destination = Address_1.default.toAddress(options.destination);
            const source = Address_1.default.toAddress(options.source);
            const frame = [
                nbconst_1.PREAMBLE,
                ...destination.raw,
                ...source.raw,
                0xC0
                    | ((options.priority & 3) << 4)
                    | ((destination.rawType & 3) << 2)
                    | (source.rawType & 3),
                options.data.length + 1,
                options.protocol,
                ...options.data,
            ];
            const crc = crc_1.crc16ccitt(Buffer.from(frame.slice(1)), 0);
            frame.push(crc >> 8, crc & 255);
            this.raw = Buffer.from(frame);
        }
        const serviceByte = this.raw[nbconst_1.Offsets.SERVICE];
        const destAddressType = (serviceByte >> 2) & 3;
        const srcAddressType = serviceByte & 3;
        this.priority = (serviceByte >> 4) & 3;
        this.protocol = this.raw[nbconst_1.Offsets.PROTOCOL];
        this.destination = Address_1.default.read(destAddressType, this.raw, nbconst_1.Offsets.DESTINATION);
        this.source = Address_1.default.read(srcAddressType, this.raw, nbconst_1.Offsets.SOURCE);
        this.data = this.raw.slice(nbconst_1.Offsets.DATA, (nbconst_1.Offsets.DATA + this.raw[nbconst_1.Offsets.LENGTH]) - 1);
        Reflect.defineMetadata('timeStamp', Date.now(), this);
        process.nextTick(() => Object.freeze(this));
    }
    toJSON() {
        const ts = new Date(Reflect.getMetadata('timeStamp', this));
        return {
            priority: this.priority,
            protocol: Protocol[this.protocol],
            source: this.source.toString(),
            destination: this.destination.toString(),
            timeStamp: `${leadZero(ts.getHours())}:${leadZero(ts.getMinutes())}:\
${leadZero(ts.getSeconds())}.${ts.getMilliseconds()}`,
            data: Buffer.from(this.data),
        };
    }
    toString(opts) {
        let self = replaceBuffers(this.toJSON());
        if (opts) {
            if (opts.pick) {
                self = lodash_1.default.pick(self, opts.pick);
            }
            if (opts.omit) {
                self = lodash_1.default.omit(self, opts.omit);
            }
        }
        return JSON.stringify(self);
    }
}
exports.default = NibusDatagram;
NibusDatagram.defaultSource = Address_1.default.empty;
//# sourceMappingURL=NibusDatagram.js.map