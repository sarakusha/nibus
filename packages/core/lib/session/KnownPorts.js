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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnownPortV = exports.CategoryV = void 0;
const t = __importStar(require("io-ts"));
exports.CategoryV = t.union([
    t.keyof({
        siolynx: null,
        minihost: null,
        fancontrol: null,
        c22: null,
        relay: null,
        ftdi: null,
        sensor: null,
        novastar: null,
    }),
    t.undefined,
]);
exports.KnownPortV = t.intersection([
    t.type({
        path: t.string,
        productId: t.number,
        vendorId: t.number,
    }),
    t.partial({
        manufacturer: t.string,
        serialNumber: t.string,
        pnpId: t.string,
        locationId: t.string,
        deviceAddress: t.number,
        device: t.string,
        category: exports.CategoryV,
    }),
]);
//# sourceMappingURL=KnownPorts.js.map