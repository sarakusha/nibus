"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MockNibusSession_1 = __importDefault(require("./MockNibusSession"));
const NibusSession_1 = require("./NibusSession");
const session = !process.env.MOCKED_NIBUS
    ? new NibusSession_1.NibusSession()
    : new MockNibusSession_1.default();
process.on('SIGINT', () => session.close());
process.on('SIGTERM', () => session.close());
exports.default = session;
//# sourceMappingURL=session.js.map