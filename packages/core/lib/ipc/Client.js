"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const Either_1 = require("fp-ts/lib/Either");
const xpipe_1 = __importDefault(require("xpipe"));
const debug_1 = __importDefault(require("../debug"));
const events_1 = require("./events");
const debug = debug_1.default('nibus:IPCClient');
class IPCClient extends net_1.Socket {
    constructor(options) {
        super(options);
        this.parseEvents = (data) => {
            data
                .toString()
                .split('\n')
                .filter(line => line && line.trim().length > 0)
                .forEach(line => {
                const result = events_1.EventFromString.decode(line);
                if (Either_1.isLeft(result)) {
                    debug(`Unknown event: ${PathReporter_1.PathReporter.report(result)}`);
                    return;
                }
                const { right: { event, args }, } = result;
                this.emit(event, ...args);
            });
        };
        this.on('data', this.parseEvents);
    }
    send(event, ...args) {
        const data = {
            event,
            args,
        };
        return new Promise(resolve => this.write(JSON.stringify(data), () => resolve()));
    }
    static connect(path, connectionListener) {
        const client = new IPCClient();
        return client.connect(xpipe_1.default.eq(path), connectionListener);
    }
}
exports.default = IPCClient;
//# sourceMappingURL=Client.js.map