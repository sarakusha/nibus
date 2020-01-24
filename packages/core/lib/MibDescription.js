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
}));
//# sourceMappingURL=MibDescription.js.map