"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElectron = void 0;
const node_1 = __importDefault(require("debug/src/node"));
const electron_log_1 = __importDefault(require("electron-log"));
electron_log_1.default.transports.file.level = 'info';
electron_log_1.default.transports.file.fileName = process.env.NIBUS_LOG || 'nibus-cli.log';
electron_log_1.default.transports.console.level = false;
exports.isElectron = {}.hasOwnProperty.call(process.versions, 'electron');
exports.default = (namespace) => {
    const debug = node_1.default(namespace);
    if (exports.isElectron) {
        debug.log = electron_log_1.default.log.bind(electron_log_1.default);
        debug.enabled = true;
        debug.useColors = true;
    }
    return debug;
};
//# sourceMappingURL=debug.js.map