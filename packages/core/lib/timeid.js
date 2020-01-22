"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let lastTimeid;
function timeid() {
    const time = Date.now();
    const last = lastTimeid || time;
    lastTimeid = time > last ? time : last + 1;
    return lastTimeid.toString(36);
}
exports.default = timeid;
//# sourceMappingURL=timeid.js.map