"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nibus/core");
const Either_1 = require("fp-ts/lib/Either");
const net_1 = __importDefault(require("net"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const debug_1 = __importDefault(require("../debug"));
const debug = debug_1.default('nibus:IPCServer');
class IPCServer extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.ports = {};
        this.closed = false;
        this.tail = '';
        this.close = () => {
            if (this.closed)
                return;
            this.closed = true;
            const path = this.server.address();
            this.clients.forEach(client => client.destroy());
            this.clients.length = 0;
            this.server.close();
            setTimeout(() => Object.values(this.ports).forEach(serial => serial.close()), 0);
            debug(`${JSON.stringify(path)} closed`);
        };
        this.connectionHandler = (socket) => {
            const addClient = () => {
                this.clients.push(socket);
                this.emit('connection', socket);
                debug(`${socket.remoteAddress} connected`);
            };
            let waitingPreamble = true;
            const clientErrorHandler = (err) => {
                debug('error on client %s', err.message);
                this.emit('client:error', socket, err);
            };
            const clientDataHandler = (data) => {
                if (waitingPreamble) {
                    waitingPreamble = false;
                    const preamble = data.toString();
                    if (preamble === 'NIBUS')
                        addClient();
                    else {
                        removeClient();
                        const serial = this.ports[preamble];
                        if (serial) {
                            serial.addConnection(socket);
                        }
                    }
                    return;
                }
                const chunks = data.toString().split(core_1.MSG_DELIMITER);
                chunks[0] = this.tail + chunks[0];
                [this.tail] = chunks.splice(-1, 1);
                chunks.filter(line => line && line.trim().length > 0).forEach(line => {
                    try {
                        const { event, args, } = JSON.parse(line);
                        const res = core_1.ClientEventsArgsV.decode([event, ...args].filter(item => !!item));
                        if (Either_1.isRight(res)) {
                            const [name, ...opts] = res.right;
                            if (name === 'ping') {
                                this.send(socket, 'pong').catch(console.error);
                            }
                            else {
                                this.emit(`client:${name}`, ...[socket, ...opts]);
                            }
                        }
                    }
                    catch (err) {
                        debug(`error while parse ${line}`);
                    }
                });
            };
            const removeClient = () => {
                const index = this.clients.findIndex(item => item === socket);
                if (index !== -1) {
                    this.clients.splice(index, 1);
                    debug(`${socket.remoteAddress} disconnected`);
                }
                socket.off('error', clientErrorHandler);
                socket.off('data', clientDataHandler);
                socket.off('end', removeClient);
            };
            socket
                .once('error', clientErrorHandler)
                .on('data', clientDataHandler)
                .once('end', removeClient);
        };
        this.clients = [];
        this.server = net_1.default
            .createServer(this.connectionHandler)
            .on('close', this.close);
        process.on('SIGINT', () => this.close());
        process.on('SIGTERM', () => this.close());
    }
    get path() {
        return JSON.stringify(this.server.address());
    }
    listen(port, host) {
        return new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen({
                port,
                host,
            }, () => {
                debug('listening on %o', this.server.address());
                this.server.off('error', reject);
                resolve();
            });
        });
    }
    send(client, event, ...args) {
        if (this.closed) {
            return Promise.reject(new Error('Server closed'));
        }
        if (client.destroyed) {
            return Promise.resolve();
        }
        const data = {
            event,
            args,
        };
        return new Promise(resolve => {
            try {
                client.write(`${JSON.stringify(data)}${core_1.MSG_DELIMITER}`, () => resolve());
            }
            catch (err) {
                debug(`error while send ${JSON.stringify(data)}`);
                resolve();
            }
        });
    }
    broadcast(event, ...args) {
        return Promise.all(this.clients.map(client => this.send(client, event, ...args))).then(() => { });
    }
}
exports.default = IPCServer;
//# sourceMappingURL=Server.js.map