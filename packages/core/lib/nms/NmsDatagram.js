"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("../debug"));
const Address_1 = __importDefault(require("../Address"));
const nbconst_1 = require("../nbconst");
const nibus_1 = require("../nibus");
const NibusDatagram_1 = __importStar(require("../nibus/NibusDatagram"));
const nms_1 = require("./nms");
const NmsServiceType_1 = __importDefault(require("./NmsServiceType"));
const NmsValueType_1 = __importDefault(require("./NmsValueType"));
const debug = debug_1.default('nibus:nms');
const emptyBuffer = Buffer.alloc(0);
class NmsDatagram extends NibusDatagram_1.default {
    constructor(frameOrOptions) {
        if (Buffer.isBuffer(frameOrOptions)) {
            super(frameOrOptions);
        }
        else {
            const options = Object.assign({ source: new Address_1.default('auto'), isResponse: false, notReply: false, nms: emptyBuffer }, frameOrOptions);
            console.assert(options.nms.length <= nbconst_1.NMS_MAX_DATA_LENGTH);
            const nmsLength = options.service !== NmsServiceType_1.default.Read ? options.nms.length & 0x3f : 0;
            const nibusData = [
                ((options.service & 0x1f) << 3) | (options.isResponse ? 4 : 0) | ((options.id >> 8) & 3),
                options.id & 0xff,
                (options.notReply ? 0x80 : 0) | nmsLength,
                ...options.nms,
            ];
            const nibusOptions = Object.assign({ data: Buffer.from(nibusData), protocol: NibusDatagram_1.Protocol.NMS }, options);
            super(nibusOptions);
            if (frameOrOptions.timeout !== undefined) {
                this.timeout = frameOrOptions.timeout;
            }
        }
        this.protocol = NibusDatagram_1.Protocol.NMS;
        const { data } = this;
        this.id = ((data[0] & 3) << 8) | data[1];
        this.service = data[0] >> 3;
        this.isResponse = !!(data[0] & 4);
        this.notReply = !!(data[2] & 0x80);
        const nmsLength = this.service !== NmsServiceType_1.default.Read ? data[2] & 0x3f : data.length - 3;
        this.nms = this.data.slice(3, 3 + nmsLength);
    }
    static isNmsFrame(frame) {
        return (frame[0] === nbconst_1.PREAMBLE &&
            frame.length > 15 &&
            frame[nbconst_1.Offsets.PROTOCOL] === 1 &&
            frame[nbconst_1.Offsets.LENGTH] > 3);
    }
    get valueType() {
        const { nms, service } = this;
        switch (service) {
            case NmsServiceType_1.default.Read:
                if (nms.length > 2) {
                    return this.nms[1];
                }
                break;
            case NmsServiceType_1.default.InformationReport:
                return this.nms[0];
            case NmsServiceType_1.default.UploadSegment:
                return NmsValueType_1.default.UInt32;
            case NmsServiceType_1.default.RequestDomainUpload:
                return NmsValueType_1.default.UInt32;
            case NmsServiceType_1.default.RequestDomainDownload:
                return NmsValueType_1.default.UInt32;
            default:
                break;
        }
        return undefined;
    }
    get status() {
        if (this.nms.length === 0 || !this.isResponse) {
            return undefined;
        }
        return this.nms.readInt8(0);
    }
    get value() {
        const { valueType, nms, service } = this;
        if (valueType === undefined) {
            return undefined;
        }
        const { length } = nms;
        const safeDecode = (index, type = valueType) => {
            try {
                return length < index + nms_1.getSizeOf(type) ? undefined : nms_1.decodeValue(type, nms, index);
            }
            catch (e) {
                debug(`${e.message}, id: ${this.id}, buffer: ${nibus_1.printBuffer(this.raw)}`);
                return 0;
            }
        };
        switch (service) {
            case NmsServiceType_1.default.Read:
                return safeDecode(2);
            case NmsServiceType_1.default.InformationReport:
                return safeDecode(1);
            case NmsServiceType_1.default.RequestDomainUpload:
                return safeDecode(1);
            case NmsServiceType_1.default.UploadSegment:
                return {
                    data: nms.slice(5),
                    offset: safeDecode(1),
                };
            case NmsServiceType_1.default.RequestDomainDownload:
                return safeDecode(1);
            default:
                return undefined;
        }
    }
    isResponseFor(req) {
        const { isResponse, service, destination } = this;
        return isResponse && service === req.service && destination.equals(req.source);
    }
    toJSON() {
        const _a = super.toJSON(), { data } = _a, props = __rest(_a, ["data"]);
        const result = Object.assign(Object.assign({}, props), { id: this.id, service: NmsServiceType_1.default[this.service], data: undefined });
        if (this.isResponse || this.service === NmsServiceType_1.default.InformationReport) {
            if (this.valueType !== undefined) {
                result.value = this.value;
                result.valueType = NmsValueType_1.default[this.valueType];
            }
            result.status = this.status;
        }
        else {
            result.notReply = this.notReply;
            result.nms = Buffer.from(this.nms);
        }
        return result;
    }
}
exports.default = NmsDatagram;
//# sourceMappingURL=NmsDatagram.js.map