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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MSG_DELIMITER = exports.promiseArray = exports.replaceBuffers = exports.printBuffer = exports.chunkArray = exports.delay = exports.noop = exports.ConfigV = exports.LogLevelV = void 0;
const t = __importStar(require("io-ts"));
const lodash_1 = __importDefault(require("lodash"));
exports.LogLevelV = t.keyof({
    none: null,
    hex: null,
    nibus: null,
});
const MibTypeV = t.array(t.intersection([t.type({ mib: t.string }), t.partial({ minVersion: t.number })]));
exports.ConfigV = t.partial({
    logLevel: exports.LogLevelV,
    omit: t.union([t.array(t.string), t.null]),
    pick: t.union([t.array(t.string), t.null]),
    mibs: t.array(t.string),
    mibTypes: t.record(t.string, MibTypeV),
});
const noop = () => { };
exports.noop = noop;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.delay = delay;
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
const replaceBuffers = (obj) => Object.entries(obj).reduce((result, [name, value]) => (Object.assign(Object.assign({}, result), { [name]: Buffer.isBuffer(value)
        ? printBuffer(value)
        : lodash_1.default.isPlainObject(value)
            ? exports.replaceBuffers(value)
            : value })), {});
exports.replaceBuffers = replaceBuffers;
function promiseArray(array, action) {
    return array.reduce((acc, item, index) => acc.then(async (items) => {
        const result = await action(item, index, array);
        return Array.isArray(result) ? [...items, ...result] : [...items, result];
    }), Promise.resolve([]));
}
exports.promiseArray = promiseArray;
exports.MSG_DELIMITER = '\n';
//# sourceMappingURL=common.js.map