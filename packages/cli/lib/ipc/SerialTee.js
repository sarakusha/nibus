"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Direction = void 0;
const serialport_1 = __importDefault(require("serialport"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const debug_1 = __importDefault(require("../debug"));
const debug = debug_1.default('nibus:serial-tee');
const portOptions = {
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
};
var Direction;
(function (Direction) {
    Direction[Direction["in"] = 0] = "in";
    Direction[Direction["out"] = 1] = "out";
})(Direction = exports.Direction || (exports.Direction = {}));
class SerialTee extends tiny_typed_emitter_1.TypedEmitter {
    constructor(portInfo, description) {
        super();
        this.portInfo = portInfo;
        this.description = description;
        this.connections = [];
        this.closed = false;
        this.logger = null;
        this.close = () => {
            if (this.closed)
                return;
            const { serial } = this;
            if (serial.isOpen) {
                debug('close serial', serial.path);
                serial.close();
            }
            const connections = this.connections.slice();
            this.connections.length = 0;
            connections.forEach(socket => this.releaseSocket(socket));
            this.closed = true;
            this.emit('close', this.portInfo.path);
        };
        this.broadcast = (data) => {
            const { logger, closed, connections } = this;
            if (closed)
                return;
            connections.forEach(socket => socket.write(data));
            logger && logger(data, Direction.out);
        };
        this.send = (data) => {
            const { logger, closed, serial } = this;
            if (closed)
                return;
            serial.write(data);
            logger && logger(data, Direction.in);
        };
        const { path } = portInfo;
        const win32 = (process.platform === 'win32' && description.win32) || {};
        this.serial = new serialport_1.default(path, {
            ...portOptions,
            baudRate: description.baudRate || 115200,
            parity: win32.parity || description.parity || portOptions.parity,
        }, err => {
            if (err) {
                debug(`error while open serial port: ${err.message}`);
                process.platform === 'linux' &&
                    debug(`WARNING! You would add user '${process.env.USER}' to the dialout group: "sudo usermode -aG dialout ${process.env.USER}"`);
                this.close();
            }
        });
        this.serial.on('close', this.close);
        this.serial.on('error', this.close);
        this.serial.on('data', this.broadcast);
        debug(`create serial tee on ${path} baud: ${this.serial.baudRate} (${description.category})`);
    }
    get path() {
        return this.portInfo.path;
    }
    setLogger(logger) {
        this.logger = logger;
    }
    toJSON() {
        const { portInfo, description } = this;
        return {
            portInfo,
            description,
        };
    }
    releaseSocket(socket) {
        socket.off('data', this.send);
        socket.destroyed || socket.destroy();
        const index = this.connections.findIndex(item => item === socket);
        if (index !== -1)
            this.connections.splice(index, 1);
    }
    addConnection(socket) {
        const { closed, connections } = this;
        if (closed)
            return;
        connections.push(socket);
        socket.on('data', this.send);
        socket.once('close', () => this.releaseSocket(socket));
    }
}
exports.default = SerialTee;
//# sourceMappingURL=SerialTee.js.map