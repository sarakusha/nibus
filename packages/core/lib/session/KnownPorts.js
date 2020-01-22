"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    }),
    t.undefined,
]);
exports.KnownPortV = t.intersection([
    t.type({
        comName: t.string,
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