import SerialPort from 'serialport';
import debugFactory from 'debug';
import { EventEmitter } from 'events';
import { getSocketPath } from '@nibus/core';
import Server from './Server';
const debug = debugFactory('nibus:serial-tee');
const portOptions = {
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
};
export default class SerialTee extends EventEmitter {
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
            this.emit('close', this.portInfo.comName);
        };
        const { comName: path } = portInfo;
        const win32 = (process.platform === 'win32' && description.win32) || {};
        this.serial = new SerialPort(path, {
            ...portOptions,
            baudRate: description.baudRate || 115200,
            parity: win32.parity || description.parity || portOptions.parity,
        });
        this.serial.on('close', this.close);
        this.server = new Server(getSocketPath(path), true);
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
//# sourceMappingURL=SerialTee.js.map