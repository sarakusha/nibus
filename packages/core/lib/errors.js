"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutError = exports.NibusError = exports.MibError = void 0;
const Address_1 = __importDefault(require("./Address"));
class MibError extends Error {
}
exports.MibError = MibError;
const getErrMsg = (errcode, prototype) => {
    var _a, _b;
    const errEnum = Reflect.getMetadata('errorType', prototype);
    return (_b = (errEnum && ((_a = errEnum[errcode]) === null || _a === void 0 ? void 0 : _a.annotation))) !== null && _b !== void 0 ? _b : `NiBUS error ${errcode}`;
};
class NibusError extends Error {
    constructor(errcode, prototype, msg) {
        super(`${msg ? `${msg}: ` : ''}${getErrMsg(errcode, prototype)} (${errcode})`);
        this.errcode = errcode;
    }
}
exports.NibusError = NibusError;
class TimeoutError extends Error {
    constructor(param) {
        const defaultMsg = 'Timeout error';
        const msg = param instanceof Address_1.default ? `${defaultMsg} on ${param}` : param !== null && param !== void 0 ? param : defaultMsg;
        super(msg);
    }
}
exports.TimeoutError = TimeoutError;
//# sourceMappingURL=errors.js.map