import net, { Server } from 'net';
import { Duplex } from 'stream';
import debugFactory from 'debug';
import fs from 'fs';
import xpipe from 'xpipe';
const debug = debugFactory('nibus:IPCServer');
const noop = () => { };
export var Direction;
(function (Direction) {
    Direction[Direction["in"] = 0] = "in";
    Direction[Direction["out"] = 1] = "out";
})(Direction || (Direction = {}));
class IPCServer extends Duplex {
    constructor(path, raw = false) {
        super();
        this.raw = raw;
        this.closed = false;
        this.reading = false;
        this.connectionHandler = (socket) => {
            this.emit('connection', socket);
            this.clients.push(socket);
            socket
                .once('error', this.clientErrorHandler.bind(this, socket))
                .on('data', this.clientDataHandler.bind(this, socket))
                .once('close', () => this.removeClient(socket));
            debug('new connection on', this.path, this.clients.length);
        };
        this.errorHandler = (err) => {
            if (err.code === 'EADDRINUSE') {
                const check = net.connect(xpipe.eq(this.path), () => {
                    debug('Server running, giving up...');
                    process.exit();
                });
                check.once('error', e => {
                    if (e.code === 'ECONNREFUSED') {
                        fs.unlinkSync(xpipe.eq(this.path));
                        this.server.listen(xpipe.eq(this.path), () => {
                            debug('restart', this.server.address());
                        });
                    }
                });
            }
            else {
                throw err;
            }
        };
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
        this.clients = [];
        this.server = new Server();
        this.server = net
            .createServer(this.connectionHandler)
            .on('error', this.errorHandler)
            .on('close', this.close)
            .listen(xpipe.eq(path), () => {
            debug('listening on', this.server.address());
        });
        process.on('SIGINT', () => this.close());
        process.on('SIGTERM', () => this.close());
    }
    clientErrorHandler(client, err) {
        debug('error on client', err.message);
        this.emit('client:error', client, err);
        this.removeClient(client);
    }
    clientDataHandler(client, data) {
        if (this.reading) {
            this.reading = this.push(data);
        }
        if (this.raw) {
            this.emit('raw', data, Direction.in);
            return;
        }
        debug('data from', client.remoteAddress, data.toString());
        const { event, args } = JSON.parse(data.toString());
        this.emit(`client:${event}`, client, ...args);
    }
    removeClient(client) {
        const index = this.clients.findIndex(item => item === client);
        if (index !== -1) {
            this.clients.splice(index, 1);
        }
        client.destroy();
        debug('destroy connection on', this.path, this.clients.length);
    }
    _write(chunk, encoding, callback) {
        this.emit('raw', chunk, Direction.out);
        this.clients.forEach(client => client.write(chunk, encoding, noop));
        callback();
    }
    _read(_size) {
        this.reading = true;
    }
    get path() {
        return (this.server.address() || '').toString();
    }
    send(client, event, ...args) {
        if (this.closed) {
            return Promise.reject(new Error('Server is closed'));
        }
        const data = {
            event,
            args,
        };
        return new Promise(resolve => client.write(JSON.stringify(data), () => resolve()));
    }
    broadcast(event, ...args) {
        return Promise.all(this.clients.map(client => this.send(client, event, ...args)))
            .then(() => { });
    }
}
export default IPCServer;
//# sourceMappingURL=Server.js.map