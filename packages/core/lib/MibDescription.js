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
exports.MibDescriptionV = exports.NibusParityV = exports.NibusBaudRateV = exports.FindKindV = void 0;
const t = __importStar(require("io-ts"));
exports.FindKindV = t.keyof({
    sarp: null,
    version: null,
}, 'FindKind');
exports.NibusBaudRateV = t.union([t.literal(115200), t.literal(57600), t.literal(28800)], 'NibusBaudRate');
exports.NibusParityV = t.keyof({
    none: null,
    even: null,
    mark: null,
}, 'NibusParity');
exports.MibDescriptionV = t.recursion('MibDescriptionV', () => t.partial({
    type: t.number,
    mib: t.string,
    link: t.boolean,
    baudRate: exports.NibusBaudRateV,
    parity: exports.NibusParityV,
    category: t.string,
    find: exports.FindKindV,
    disableBatchReading: t.boolean,
    select: t.array(exports.MibDescriptionV),
    win32: t.union([exports.MibDescriptionV, t.undefined]),
    foreign: t.boolean,
}));
//# sourceMappingURL=MibDescription.js.map