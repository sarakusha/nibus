"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const Address_1 = __importDefault(require("../Address"));
const MockNibusConnection_1 = __importDefault(require("../nibus/MockNibusConnection"));
const debug = debug_1.default('nibus:mock-session');
class MockNibusSession extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.ports = 1;
        this.connection = new MockNibusConnection_1.default();
        this.isStarted = false;
    }
    start() {
        this.isStarted = true;
        setTimeout(() => {
            this.emit('add', this.connection);
            this.emit('found', {
                connection: this.connection,
                category: 'minihost',
                address: new Address_1.default('::DE:AD'),
            });
        }, 500);
        return Promise.resolve(1);
    }
    connectDevice(device, connection) {
        if (device.connection === connection)
            return;
        device.connection = connection;
        const event = connection ? 'connected' : 'disconnected';
        process.nextTick(() => this.emit(event, device));
        debug(`mib-device [${device.address}] was ${event}`);
    }
    close() {
        if (!this.isStarted)
            return;
        this.isStarted = false;
        debug('close');
        this.emit('close');
    }
    pingDevice(_device) {
        return MockNibusConnection_1.default.pingImpl();
    }
    ping(_address) {
        return MockNibusConnection_1.default.pingImpl();
    }
}
exports.default = MockNibusSession;
//# sourceMappingURL=MockNibusSession.js.map