"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElectron = void 0;
const debug_1 = __importDefault(require("debug"));
const electron_log_1 = __importDefault(require("electron-log"));
electron_log_1.default.transports.file.level = 'info';
electron_log_1.default.transports.file.fileName = 'nibus-cli.log';
electron_log_1.default.transports.console.level = false;
exports.isElectron = {}.hasOwnProperty.call(process.versions, 'electron');
exports.default = (namespace) => {
    const debug = debug_1.default(namespace);
    if (exports.isElectron) {
        debug.log = electron_log_1.default.log.bind(electron_log_1.default);
    }
    return debug;
};
//# sourceMappingURL=debug.js.map