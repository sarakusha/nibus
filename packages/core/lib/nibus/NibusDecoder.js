"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crc_1 = require("crc");
const debug_1 = __importDefault(require("debug"));
const stream_1 = require("stream");
const nbconst_1 = require("../nbconst");
const nms_1 = require("../nms");
const sarp_1 = require("../sarp");
const helper_1 = require("./helper");
const NibusDatagram_1 = __importDefault(require("./NibusDatagram"));
const debug = debug_1.default('nibus:decoder');
function crcNibus(byteArray) {
    const crc = crc_1.crc16ccitt(Buffer.from(byteArray), 0);
    return crc === 0;
}
class NibusDecoder extends stream_1.Transform {
    constructor(options) {
        super(Object.assign(Object.assign({}, options), { readableObjectMode: true }));
        this.buf = [];
    }
    _transform(chunk, encoding, callback) {
        console.assert(encoding === 'buffer', 'Unexpected encoding');
        const data = [...this.buf, ...chunk];
        if (data.length > 0) {
            this.buf = this.analyze(data);
        }
        callback();
    }
    _flush(callback) {
        this.buf.length = 0;
        callback();
    }
    analyze(data) {
        let start = -1;
        let lastEnd = 0;
        let expectedLength = -1;
        let state = nbconst_1.States.PREAMBLE_WAITING;
        const reset = () => {
            console.assert(start !== -1, 'reset outside datagram');
            const ret = start;
            start = expectedLength = -1;
            state = nbconst_1.States.PREAMBLE_WAITING;
            return ret;
        };
        for (let i = 0; i < data.length; i += 1) {
            switch (state) {
                case nbconst_1.States.PREAMBLE_WAITING:
                    if (data[i] === nbconst_1.PREAMBLE) {
                        state = nbconst_1.States.HEADER_READING;
                        start = i;
                    }
                    break;
                case nbconst_1.States.HEADER_READING:
                    if (i - start === nbconst_1.Offsets.LENGTH) {
                        const length = data[start + nbconst_1.Offsets.LENGTH];
                        if (length - 1 > nbconst_1.MAX_DATA_LENGTH) {
                            i = reset();
                            continue;
                        }
                        state = nbconst_1.States.DATA_READING;
                        expectedLength = length + nbconst_1.SERVICE_INFO_LENGTH + 2 - 1;
                    }
                    break;
                case nbconst_1.States.DATA_READING:
                    if (expectedLength === i - start + 1) {
                        state = nbconst_1.States.PREAMBLE_WAITING;
                        const datagram = data.slice(start, i + 1);
                        if (crcNibus(datagram.slice(1))) {
                            const frame = Buffer.from(datagram);
                            if (start > lastEnd) {
                                debug('skipped: ', helper_1.printBuffer(Buffer.from(data.slice(lastEnd, start))));
                            }
                            if (nms_1.NmsDatagram.isNmsFrame(frame)) {
                                this.push(new nms_1.NmsDatagram(frame));
                            }
                            else if (sarp_1.SarpDatagram.isSarpFrame(frame)) {
                                this.push(new sarp_1.SarpDatagram(frame));
                            }
                            else {
                                this.push(new NibusDatagram_1.default(frame));
                            }
                            start = expectedLength = -1;
                            state = nbconst_1.States.PREAMBLE_WAITING;
                            lastEnd = i + 1;
                        }
                        else {
                            debug('CRC error');
                            i = reset();
                            continue;
                        }
                    }
                    break;
                default:
                    console.assert(true, 'Unexpected state');
                    break;
            }
        }
        const skipped = start === -1 ? data.slice(lastEnd) : data.slice(lastEnd, start);
        if (skipped.length)
            debug('skipped: ', helper_1.printBuffer(Buffer.from(skipped)));
        return start === -1 ? [] : data.slice(start);
    }
}
exports.default = NibusDecoder;
//# sourceMappingURL=NibusDecoder.js.map