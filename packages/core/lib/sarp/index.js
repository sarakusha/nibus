"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSarp = exports.SarpDatagram = exports.SarpQueryType = void 0;
const Address_1 = __importDefault(require("../Address"));
const SarpDatagram_1 = __importDefault(require("./SarpDatagram"));
exports.SarpDatagram = SarpDatagram_1.default;
const SarpQueryType_1 = __importDefault(require("./SarpQueryType"));
exports.SarpQueryType = SarpQueryType_1.default;
function createSarp(queryType, queryParam = Buffer.alloc(5)) {
    const param = Buffer.isBuffer(queryParam)
        ? queryParam
        : Array.isArray(queryParam)
            ? Buffer.from(queryParam)
            : Buffer.from(queryParam.buffer);
    return new SarpDatagram_1.default({
        queryType,
        destination: Address_1.default.broadcast,
        queryParam: param,
    });
}
exports.createSarp = createSarp;
//# sourceMappingURL=index.js.map