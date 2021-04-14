"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const Either_1 = require("fp-ts/lib/Either");
const common_1 = require("../common");
const debug_1 = __importDefault(require("../debug"));
const events_1 = require("./events");
const debug = debug_1.default('nibus:IPCClient');
const PING_TIMEOUT = 500;
class IPCClient extends net_1.Socket {
    constructor(host = 'localhost', options) {
        super(options);
        this.host = host;
        this.timeoutTimer = 0;
        this.online = false;
        this.tail = '';
        this.parseEvents = (data) => {
            const chunks = data.toString().split(common_1.MSG_DELIMITER);
            chunks[0] = this.tail + chunks[0];
            [this.tail] = chunks.splice(-1, 1);
            chunks
                .filter(line => line && line.trim().length > 0)
                .forEach(line => {
                const result = events_1.EventFromString.decode(line);
                if (Either_1.isLeft(result)) {
                    debug(`Unknown event: ${PathReporter_1.PathReporter.report(result)}`);
                    console.info(`Unknown event: ${line}`);
                    return;
                }
                const { right: { event, args }, } = result;
                if (event === 'pong') {
                    clearTimeout(this.timeoutTimer);
                    this.setOnline(true);
                }
                else
                    this.emit(event, ...args);
            });
        };
        this.on('data', this.parseEvents);
    }
    get isOnline() {
        return this.online;
    }
    setOnline(value) {
        if (this.online !== value) {
            this.online = value;
            this.emit('online', value);
        }
    }
    send(...[event, ...args]) {
        const data = {
            event,
            args,
        };
        return new Promise(resolve => this.write(`${JSON.stringify(data)}${common_1.MSG_DELIMITER}`, () => resolve()));
    }
    static connect(remoteServer, connectionListener) {
        var _a;
        const client = new IPCClient();
        client.connect(remoteServer.port, (_a = remoteServer.host) !== null && _a !== void 0 ? _a : 'localhost', () => {
            client.setNoDelay();
            if (remoteServer.host) {
                const pingTimer = setInterval(() => {
                    client.send('ping').catch(() => { });
                    window.clearTimeout(client.timeoutTimer);
                    client.timeoutTimer = window.setTimeout(() => {
                        client.setOnline(false);
                    }, PING_TIMEOUT);
                }, PING_TIMEOUT * 2);
                client.on('end', () => {
                    clearInterval(pingTimer);
                });
            }
            else {
                client.setOnline(true);
            }
            client.write('NIBUS');
            connectionListener && connectionListener();
        });
        client.once('error', error => {
            debug(`<error> ${error.message}`);
        });
        return client;
    }
}
exports.default = IPCClient;
//# sourceMappingURL=Client.js.map