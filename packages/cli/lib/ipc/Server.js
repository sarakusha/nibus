"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Direction = void 0;
const fs_1 = __importDefault(require("fs"));
const net_1 = __importDefault(require("net"));
const stream_1 = require("stream");
const xpipe_1 = __importDefault(require("xpipe"));
const debug_1 = __importDefault(require("../debug"));
const debug = debug_1.default('nibus:IPCServer');
const noop = () => { };
var Direction;
(function (Direction) {
    Direction[Direction["in"] = 0] = "in";
    Direction[Direction["out"] = 1] = "out";
})(Direction = exports.Direction || (exports.Direction = {}));
class IPCServer extends stream_1.Duplex {
    constructor(pathOrPort, raw = false) {
        super();
        this.raw = raw;
        this.closed = false;
        this.reading = false;
        this.close = () => {
            if (this.closed)
                return;
            const path = this.server.address();
            this.clients.forEach(client => client.destroy());
            this.clients.length = 0;
            this.server.close();
            this.raw && this.push(null);
            this.closed = true;
            debug(`${path} closed`);
        };
        this.connectionHandler = (socket) => {
            this.emit('connection', socket);
            this.clients.push(socket);
            const clientErrorHandler = (err) => {
                debug('error on client', err.message);
                this.emit('client:error', socket, err);
                removeClient();
            };
            const clientDataHandler = (data) => {
                if (this.reading) {
                    this.reading = this.push(data);
                }
                if (this.raw) {
                    this.emit('raw', data, Direction.in);
                    return;
                }
                const { event, args, } = JSON.parse(data.toString());
                this.emit(`client:${event}`, socket, ...args);
            };
            const removeClient = () => {
                const index = this.clients.findIndex(item => item === socket);
                if (index !== -1) {
                    this.clients.splice(index, 1);
                }
                socket.off('error', clientErrorHandler);
                socket.off('data', clientDataHandler);
                socket.off('close', removeClient);
                socket.destroy();
                debug('destroy connection on', this.path, this.clients.length);
            };
            socket
                .once('error', clientErrorHandler)
                .on('data', clientDataHandler)
                .once('close', removeClient);
            debug('new connection on', this.path, this.clients.length);
        };
        this.errorHandler = (err) => {
            const { code } = err;
            if (code === 'EADDRINUSE') {
                const check = net_1.default.connect(xpipe_1.default.eq(this.path), () => {
                    debug('Server running, giving up...');
                    process.exit();
                });
                check.once('error', e => {
                    const { code: errCode } = e;
                    if (errCode === 'ECONNREFUSED') {
                        fs_1.default.unlinkSync(xpipe_1.default.eq(this.path));
                        this.server.listen(xpipe_1.default.eq(this.path), () => {
                            debug('restart', this.server.address());
                        });
                    }
                });
            }
            else {
                throw err;
            }
        };
        this.clients = [];
        this.server = net_1.default
            .createServer(this.connectionHandler)
            .on('error', this.errorHandler)
            .on('close', this.close)
            .listen(typeof pathOrPort === 'string' ? xpipe_1.default.eq(pathOrPort) : {
            host: 'localhost',
            port: pathOrPort,
        }, () => {
            debug('listening on', this.server.address());
        });
        process.on('SIGINT', () => this.close());
        process.on('SIGTERM', () => this.close());
    }
    get path() {
        return (this.server.address() || '').toString();
    }
    _write(chunk, encoding, callback) {
        this.emit('raw', chunk, Direction.out);
        this.clients.forEach(client => client.write(chunk, encoding, noop));
        callback();
    }
    _read(_size) {
        this.reading = true;
    }
    send(client, event, ...args) {
        if (this.closed) {
            return Promise.reject(new Error('Server is closed'));
        }
        const data = {
            event,
            args,
        };
        return new Promise(resolve => client.write(`${JSON.stringify(data)}\n`, () => resolve()));
    }
    broadcast(event, ...args) {
        return Promise.all(this.clients.map(client => this.send(client, event, ...args))).then(() => { });
    }
}
exports.default = IPCServer;
//# sourceMappingURL=Server.js.map