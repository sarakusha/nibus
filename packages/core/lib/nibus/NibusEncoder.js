"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
class NibusEncoder extends stream_1.Transform {
    constructor(options) {
        super(Object.assign(Object.assign({}, options), { writableObjectMode: true }));
    }
    _transform(chunk, _encoding, callback) {
        const chunks = Array.isArray(chunk) ? chunk : [chunk];
        chunks.forEach((datagram) => {
            this.push(datagram.raw);
        });
        callback();
    }
}
exports.default = NibusEncoder;
//# sourceMappingURL=NibusEncoder.js.map