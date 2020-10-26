"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBuffer = exports.chunkArray = void 0;
function chunkArray(array, len) {
    const ret = [];
    const size = Math.ceil(array.length / len);
    ret.length = size;
    let offset;
    for (let i = 0; i < size; i += 1) {
        offset = i * len;
        ret[i] = array.slice(offset, offset + len);
    }
    return ret;
}
exports.chunkArray = chunkArray;
function printBuffer(buffer) {
    return chunkArray(chunkArray(buffer.toString('hex'), 2), 16)
        .map(chunk => chunk.join('-'))
        .join('=');
}
exports.printBuffer = printBuffer;
//# sourceMappingURL=helper.js.map