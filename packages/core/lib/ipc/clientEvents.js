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
exports.ClientEventsArgsV = exports.GetBrightnessHistoryV = exports.PingArgsV = exports.ConfigArgsV = exports.ReloadDevicesArgsV = exports.SetLogLevelArgsV = exports.ClientMessagesV = void 0;
const t = __importStar(require("io-ts"));
const common_1 = require("../common");
exports.ClientMessagesV = t.keyof({
    setLogLevel: null,
    reloadDevices: null,
    config: null,
    ping: null,
    getBrightnessHistory: null,
});
const argsType0 = (name) => t.tuple([t.literal(name)]);
const argsType1 = (name, a) => t.tuple([t.literal(name), a]);
exports.SetLogLevelArgsV = argsType1('setLogLevel', common_1.LogLevelV);
exports.ReloadDevicesArgsV = argsType0('reloadDevices');
exports.ConfigArgsV = argsType1('config', t.UnknownRecord);
exports.PingArgsV = argsType0('ping');
exports.GetBrightnessHistoryV = argsType1('getBrightnessHistory', t.number);
exports.ClientEventsArgsV = t.union([
    exports.SetLogLevelArgsV,
    exports.ReloadDevicesArgsV,
    exports.ConfigArgsV,
    exports.PingArgsV,
    exports.GetBrightnessHistoryV,
]);
//# sourceMappingURL=clientEvents.js.map