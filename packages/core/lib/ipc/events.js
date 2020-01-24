"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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