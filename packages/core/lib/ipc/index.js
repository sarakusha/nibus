"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Client_1 = require("./Client");
exports.Client = Client_1.default;
function getSocketPath(path) {
    return `/tmp/nibus.${path.replace(/^(\/dev\/)/, '')}`;
}
exports.getSocketPath = getSocketPath;
//# sourceMappingURL=index.js.map