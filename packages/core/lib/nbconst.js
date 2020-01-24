"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var States;
(function (States) {
    States[States["PREAMBLE_WAITING"] = 0] = "PREAMBLE_WAITING";
    States[States["HEADER_READING"] = 1] = "HEADER_READING";
    States[States["DATA_READING"] = 2] = "DATA_READING";
})(States = exports.States || (exports.States = {}));
var Offsets;
(function (Offsets) {
    Offsets[Offsets["DESTINATION"] = 1] = "DESTINATION";
    Offsets[Offsets["SOURCE"] = 7] = "SOURCE";
    Offsets[Offsets["SERVICE"] = 13] = "SERVICE";
    Offsets[Offsets["LENGTH"] = 14] = "LENGTH";
    Offsets[Offsets["PROTOCOL"] = 15] = "PROTOCOL";
    Offsets[Offsets["DATA"] = 16] = "DATA";
})(Offsets = exports.Offsets || (exports.Offsets = {}));
exports.PREAMBLE = 0x7E;
exports.SERVICE_INFO_LENGTH = Offsets.DATA;
exports.MAX_DATA_LENGTH = 238;
exports.NMS_MAX_DATA_LENGTH = 63;
//# sourceMappingURL=nbconst.js.map