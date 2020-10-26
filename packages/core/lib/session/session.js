"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Address_1 = require("../Address");
const common_1 = require("../common");
const mib_1 = require("../mib");
const MockNibusSession_1 = __importDefault(require("./MockNibusSession"));
const NibusSession_1 = require("./NibusSession");
const session = !process.env.MOCKED_NIBUS
    ? new NibusSession_1.NibusSession()
    : new MockNibusSession_1.default();
mib_1.devices.on('new', (device) => {
    if (!device.connection) {
        session.pingDevice(device).catch(common_1.noop);
    }
});
mib_1.devices.on('delete', (device) => {
    if (device.connection) {
        device.connection = undefined;
        session.emit('disconnected', device);
    }
});
session.on('found', ({ address, connection }) => {
    console.assert(address.type === Address_1.AddressType.mac || address.type === 'empty', 'mac-address expected');
    const devs = mib_1.devices.find(address);
    if (devs && devs.length === 1) {
        session.connectDevice(devs[0], connection);
    }
});
process.on('SIGINT', () => session.close());
process.on('SIGTERM', () => session.close());
exports.default = session;
//# sourceMappingURL=session.js.map