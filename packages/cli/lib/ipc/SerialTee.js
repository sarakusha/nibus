"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serialport_1 = __importDefault(require("serialport"));
const core_1 = require("@nibus/core");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const debug_1 = __importDefault(require("../debug"));
const Server_1 = __importDefault(require("./Server"));
const debug = debug_1.default('nibus:serial-tee');
const portOptions = {
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
};
class SerialTee extends tiny_typed_emitter_1.TypedEmitter {
    constructor(portInfo, description) {
        super();
        this.portInfo = portInfo;
        this.description = description;
        this.closed = false;
        this.logger = null;
        this.close = () => {
            if (this.closed)
                return;
            const { serial, server } = this;
            if (serial.isOpen) {
                debug('close serial', serial.path);
                serial.close();
            }
            server.close();
            this.closed = true;
            this.emit('close', this.portInfo.path);
        };
        const { path } = portInfo;
        const win32 = (process.platform === 'win32' && description.win32) || {};
        this.serial = new serialport_1.default(path, Object.assign(Object.assign({}, portOptions), { baudRate: description.baudRate || 115200, parity: win32.parity || description.parity || portOptions.parity }), err => {
            err && this.close();
        });
        this.serial.on('close', this.close);
        this.serial.on('error', this.close);
        this.server = new Server_1.default(core_1.getSocketPath(path), true);
        this.server.pipe(this.serial);
        this.serial.pipe(this.server);
        debug(`new connection on ${path} baud: ${this.serial.baudRate} (${description.category})`);
    }
    get path() {
        return this.server.path;
    }
    setLogger(logger) {
        if (this.logger) {
            this.server.off('raw', this.logger);
        }
        this.logger = logger;
        if (this.logger) {
            this.server.on('raw', this.logger);
        }
    }
    toJSON() {
        const { portInfo, description } = this;
        return {
            portInfo,
            description,
        };
    }
}
exports.default = SerialTee;
//# sourceMappingURL=SerialTee.js.map