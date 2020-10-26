"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocketPath = exports.Client = void 0;
var Client_1 = require("./Client");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return __importDefault(Client_1).default; } });
function getSocketPath(path) {
    return `/tmp/nibus.${path.replace(/^(\/dev\/)/, '')}`;
}
exports.getSocketPath = getSocketPath;
//# sourceMappingURL=index.js.map