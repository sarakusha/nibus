"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _serialport = _interopRequireDefault(require("serialport"));

var _debug = _interopRequireDefault(require("debug"));

var _events = require("events");

var _Server = _interopRequireDefault(require("./Server"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const debug = (0, _debug.default)('nibus:serial-tee');
const portOptions = {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1
};

class SerialTee extends _events.EventEmitter {
  static getSocketPath(path) {
    return `/tmp/nibus.${path.replace(/^(\/dev\/)/, '')}`;
  }

  constructor(portInfo, description) {
    super();
    this.portInfo = portInfo;
    this.description = description;

    _defineProperty(this, "serial", void 0);

    _defineProperty(this, "closed", false);

    _defineProperty(this, "server", void 0);

    _defineProperty(this, "close", () => {
      if (this.closed) return;
      const {
        serial,
        server
      } = this;

      if (serial.isOpen) {
        debug('close serial', serial.path);
        serial.close();
      }

      server.close();
      this.closed = true;
      this.emit('close', this.portInfo.comName);
    });

    const {
      comName: path
    } = portInfo;
    this.serial = new _serialport.default(path, { ...portOptions,
      baudRate: description.baudRate || 115200
    });
    this.serial.on('close', this.close);
    this.server = new _Server.default(SerialTee.getSocketPath(path), true);
    this.server.pipe(this.serial);
    this.serial.pipe(this.server);
    debug(`new connection on ${path} (${description.category})`);
  }

  get path() {
    return this.server.path;
  }

  toJSON() {
    const {
      portInfo,
      description
    } = this;
    return {
      portInfo,
      description
    };
  }

}

exports.default = SerialTee;