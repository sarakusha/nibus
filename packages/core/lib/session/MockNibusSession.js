"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockNibusSession = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const debug_1 = __importDefault(require("../debug"));
const Address_1 = __importDefault(require("../Address"));
const mib_1 = require("../mib");
const MockNibusConnection_1 = __importDefault(require("../nibus/MockNibusConnection"));
const debug = debug_1.default('nibus:mock-session');
class MockNibusSession extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super(...arguments);
        this.ports = 1;
        this.devices = new mib_1.Devices();
        this.port = 9001;
        this.connection = new MockNibusConnection_1.default(this, this.devices);
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
    connectDevice(device) {
        if (device.connection === this.connection)
            return;
        device.connection = this.connection;
        process.nextTick(() => this.emit('connected', device));
        debug(`mib-device [${device.address}] was connected`);
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
        return Promise.resolve([-1, undefined]);
    }
    reloadDevices() { }
    setLogLevel() { }
    saveConfig() { }
    getBrightnessHistory() {
        return Promise.reject(new Error('Not implemented'));
    }
}
exports.MockNibusSession = MockNibusSession;
const session = new MockNibusSession();
exports.default = session;
//# sourceMappingURL=MockNibusSession.js.map