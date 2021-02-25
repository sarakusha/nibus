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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElectron = void 0;
const debug_1 = __importDefault(require("debug"));
exports.isElectron = {}.hasOwnProperty.call(process.versions, 'electron');
exports.default = (namespace) => {
    const debug = debug_1.default(namespace);
    if (exports.isElectron) {
        Promise.resolve().then(() => __importStar(require('electron-log'))).then(({ default: log }) => {
            log.transports.file.level = 'info';
            log.transports.file.fileName = process.env.NIBUS_LOG || 'nibus-core.log';
            log.transports.console.level = false;
            debug.log = log.log.bind(log);
        });
    }
    return debug;
};
//# sourceMappingURL=debug.js.map