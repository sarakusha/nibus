"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlipDatagram = exports.slipChunks = exports.uint32ToBytes = exports.trySlipDecode = exports.encode = exports.END = exports.CHUNK_SIZE = exports.FLASH_SIZE = exports.BootloaderFunction = void 0;
const crc_1 = require("crc");
const common_1 = require("../common");
var BootloaderFunction;
(function (BootloaderFunction) {
    BootloaderFunction[BootloaderFunction["ECHO"] = 0] = "ECHO";
    BootloaderFunction[BootloaderFunction["VERSION"] = 1] = "VERSION";
    BootloaderFunction[BootloaderFunction["READ"] = 4] = "READ";
    BootloaderFunction[BootloaderFunction["EXECUTE"] = 5] = "EXECUTE";
    BootloaderFunction[BootloaderFunction["WRITE"] = 19] = "WRITE";
})(BootloaderFunction = exports.BootloaderFunction || (exports.BootloaderFunction = {}));
exports.FLASH_SIZE = 28 * 1024;
exports.CHUNK_SIZE = 228;
exports.END = 0xc0;
const ESC = 0xdb;
const ESC_END = 0xdc;
const ESC_ESC = 0xdd;
const CRC_PREV = 0xde;
const CRC_END = crc_1.crc81wire(Buffer.from([exports.END]), CRC_PREV);
const encode = (data, offset = 0, maxSize = Number.MAX_SAFE_INTEGER) => {
    const chunk = [];
    let pos = offset;
    while (chunk.length < maxSize && pos < data.length) {
        let val = data[pos++];
        if (val === exports.END) {
            chunk.push(ESC);
            val = ESC_END;
        }
        else if (val === ESC) {
            chunk.push(ESC);
            val = ESC_ESC;
        }
        chunk.push(val);
    }
    return [chunk, pos];
};
exports.encode = encode;
const decode = (data) => {
    if (data.length > 255)
        throw new Error('data too long');
    let escape = false;
    const result = [];
    for (let i = 0; i < data.length; i += 1) {
        let val = data[i];
        if (escape) {
            if (val === ESC_ESC)
                val = ESC;
            else if (val === ESC_END)
                val = exports.END;
            escape = false;
        }
        else {
            if (val === ESC) {
                escape = true;
            }
            if (val === exports.END)
                throw new Error('Invalid byte sequence');
        }
        if (!escape)
            result.push(val);
    }
    return result;
};
const trySlipDecode = (data) => {
    if (data.length < 4 || data.length > 255 || data[0] !== exports.END)
        return undefined;
    try {
        const payload = decode(data.slice(1));
        const [crc] = payload.splice(-1, 1);
        if (crc_1.crc81wire(Buffer.from([exports.END, ...payload]), CRC_PREV) !== crc)
            return undefined;
        const [fn, length, ...rest] = payload;
        if (length !== rest.length)
            return undefined;
        const hasError = fn & 0x80;
        let errorCode = 0;
        if (hasError && length > 0)
            [errorCode] = rest.splice(0, 1);
        if (![
            0,
            1,
            4,
            5,
            19,
        ].includes(fn & 0x7f))
            return undefined;
        return {
            fn,
            errorCode: hasError ? errorCode : undefined,
            arg: rest.length > 0 ? rest : undefined,
        };
    }
    catch (e) {
        console.error('error while trying decode SLIP', e.message);
        return undefined;
    }
};
exports.trySlipDecode = trySlipDecode;
const uint32ToBytes = (value) => [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
];
exports.uint32ToBytes = uint32ToBytes;
function* slipChunks(fn, data = []) {
    let cancel = false;
    let offset = 0;
    const hasAddress = fn === 19;
    do {
        const [, end] = exports.encode(data, offset, exports.CHUNK_SIZE);
        const length = end - offset + (hasAddress ? 4 : 0);
        const frame = [fn, length];
        hasAddress && frame.push(...exports.uint32ToBytes(offset));
        frame.push(...data.slice(offset, end));
        const crc = crc_1.crc81wire(Buffer.from(frame), CRC_END);
        const [encoded] = exports.encode([...frame, crc]);
        if (fn !== 19 && end !== data.length)
            throw new Error('too long buffer');
        cancel = yield [Buffer.from([exports.END, ...encoded]), offset];
        offset = end;
    } while (!cancel && offset < data.length);
}
exports.slipChunks = slipChunks;
class SlipDatagram {
    constructor(raw, resp) {
        this.raw = raw;
        if (resp) {
            this.fn = resp.fn;
            this.errorCode = resp.errorCode;
            this.arg = resp.arg;
        }
    }
    toJSON() {
        return { fn: this.fn, errorCode: this.errorCode, arg: this.arg };
    }
    toString() {
        const self = common_1.replaceBuffers(this.toJSON());
        return JSON.stringify(self);
    }
}
exports.SlipDatagram = SlipDatagram;
//# sourceMappingURL=index.js.map