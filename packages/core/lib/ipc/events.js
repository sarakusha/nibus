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
exports.EventFromString = exports.EventFromStringType = exports.EventV = exports.PortRemovedEventV = exports.PortAddedEventV = exports.PortsEventV = exports.PortArgV = void 0;
const Either_1 = require("fp-ts/lib/Either");
const t = __importStar(require("io-ts"));
const MibDescription_1 = require("../MibDescription");
const KnownPorts_1 = require("../session/KnownPorts");
const eventType = (name, a, b) => t.type({
    event: t.literal(name),
    args: b ? t.tuple([a, b]) : t.tuple([a]),
});
exports.PortArgV = t.type({
    portInfo: KnownPorts_1.KnownPortV,
    description: MibDescription_1.MibDescriptionV,
});
exports.PortsEventV = eventType('ports', t.array(exports.PortArgV));
exports.PortAddedEventV = eventType('add', exports.PortArgV);
exports.PortRemovedEventV = eventType('remove', exports.PortArgV);
exports.EventV = t.union([exports.PortsEventV, exports.PortAddedEventV, exports.PortRemovedEventV]);
class FromStringType extends t.Type {
    constructor(name, type) {
        super(name, type.is, (m, c) => {
            const sv = t.string.validate(m, c);
            if (Either_1.isLeft(sv))
                return sv;
            const jv = Either_1.parseJSON(sv.right, e => [{
                    value: sv.right,
                    context: c,
                    message: Either_1.toError(e).message,
                }]);
            if (Either_1.isLeft(jv))
                return jv;
            return type.validate(jv.right, c);
        }, JSON.stringify);
    }
}
class EventFromStringType extends FromStringType {
    constructor() {
        super('EventFromString', exports.EventV);
    }
}
exports.EventFromStringType = EventFromStringType;
exports.EventFromString = new EventFromStringType();
//# sourceMappingURL=events.js.map