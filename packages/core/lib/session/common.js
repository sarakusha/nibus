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
exports.ConfigV = exports.PATH = void 0;
const t = __importStar(require("io-ts"));
exports.PATH = '/tmp/nibus.service.sock';
const LogLevelV = t.keyof({
    none: null,
    hex: null,
    nibus: null,
});
const MibTypeV = t.array(t.intersection([
    t.type({ mib: t.string }),
    t.partial({ minVersion: t.number }),
]));
exports.ConfigV = t.partial({
    logLevel: LogLevelV,
    omit: t.union([t.array(t.string), t.null]),
    pick: t.union([t.array(t.string), t.null]),
    mibs: t.array(t.string),
    mibTypes: t.record(t.string, MibTypeV),
});
//# sourceMappingURL=common.js.map