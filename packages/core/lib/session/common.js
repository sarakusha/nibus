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