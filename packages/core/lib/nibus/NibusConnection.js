"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.getNibusTimeout = exports.setNibusTimeout = exports.MINIHOST_TYPE = void 0;

require("source-map-support/register");

var _PathReporter = require("io-ts/lib/PathReporter");

var _lodash = _interopRequireDefault(require("lodash"));

var _net = require("net");

var _xpipe = _interopRequireDefault(require("xpipe"));

var _events = require("events");

var _debug = _interopRequireDefault(require("debug"));

var _errors = require("../errors");

var _ipc = require("../ipc");

var _nms = require("../nms");

var _NmsServiceType = _interopRequireDefault(require("../nms/NmsServiceType"));

var _sarp = require("../sarp");

var _MibDescription = require("../MibDescription");

var _NibusEncoder = _interopRequireDefault(require("./NibusEncoder"));

var _NibusDecoder = _interopRequireDefault(require("./NibusDecoder"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const MINIHOST_TYPE = 0xabc6; // const FIRMWARE_VERSION_ID = 0x85;

exports.MINIHOST_TYPE = MINIHOST_TYPE;
const VERSION_ID = 2;
const debug = (0, _debug.default)('nibus:connection');
let NIBUS_TIMEOUT = 1000;

const setNibusTimeout = timeout => {
  NIBUS_TIMEOUT = timeout;
};

exports.setNibusTimeout = setNibusTimeout;

const getNibusTimeout = () => NIBUS_TIMEOUT;

exports.getNibusTimeout = getNibusTimeout;

class WaitedNmsDatagram {
  constructor(req, resolve, reject, callback) {
    this.req = req;

    _defineProperty(this, "resolve", void 0);

    let timer;
    let counter = req.service !== _NmsServiceType.default.Read ? 1 : Math.floor(req.nms.length / 3) + 1;
    const datagrams = [];

    const timeout = () => {
      callback(this);
      datagrams.length === 0 ? reject(new _errors.TimeoutError(`Timeout error on ${req.destination} while ${_NmsServiceType.default[req.service]}`)) : resolve(datagrams);
    };

    const restart = (step = 1) => {
      counter -= step;
      clearTimeout(timer);

      if (counter > 0) {
        timer = setTimeout(timeout, req.timeout || NIBUS_TIMEOUT);
      } else if (counter === 0) {
        callback(this);
      }

      return counter === 0;
    };

    restart(0);

    this.resolve = datagram => {
      datagrams.push(datagram);

      if (restart()) {
        resolve(datagrams.length > 1 ? datagrams : datagram);
      }
    };
  }

}

class NibusConnection extends _events.EventEmitter {
  constructor(path, _description) {
    super();
    this.path = path;

    _defineProperty(this, "socket", void 0);

    _defineProperty(this, "encoder", new _NibusEncoder.default());

    _defineProperty(this, "decoder", new _NibusDecoder.default());

    _defineProperty(this, "ready", Promise.resolve());

    _defineProperty(this, "closed", false);

    _defineProperty(this, "waited", []);

    _defineProperty(this, "description", void 0);

    _defineProperty(this, "stopWaiting", waited => _lodash.default.remove(this.waited, waited));

    _defineProperty(this, "onDatagram", datagram => {
      let showLog = true;

      if (datagram instanceof _nms.NmsDatagram) {
        if (datagram.isResponse) {
          const resp = this.waited.find(item => datagram.isResponseFor(item.req));

          if (resp) {
            resp.resolve(datagram);
            showLog = false;
          }
        }

        this.emit('nms', datagram);
      } else if (datagram instanceof _sarp.SarpDatagram) {
        this.emit('sarp', datagram);
        showLog = false;
      }

      showLog && debug(`datagram received`, JSON.stringify(datagram.toJSON()));
    });

    _defineProperty(this, "close", () => {
      if (this.closed) return;
      const {
        path,
        description
      } = this;
      debug(`close connection on ${path} (${description.category})`);
      this.closed = true;
      this.encoder.end();
      this.decoder.removeAllListeners('data');
      this.socket.destroy();
      this.emit('close');
    });

    const validate = _MibDescription.MibDescriptionV.decode(_description);

    if (validate.isLeft()) {
      const msg = _PathReporter.PathReporter.report(validate).join('\n');

      debug('<error>', msg);
      throw new TypeError(msg);
    }

    this.description = validate.value;
    this.socket = (0, _net.connect)(_xpipe.default.eq((0, _ipc.getSocketPath)(path)));
    this.socket.pipe(this.decoder);
    this.encoder.pipe(this.socket);
    this.decoder.on('data', this.onDatagram);
    this.socket.once('close', this.close);
    debug(`new connection on ${path} (${_description.category})`);
  }

  sendDatagram(datagram) {
    // debug('write datagram from ', datagram.source.toString());
    const {
      encoder,
      stopWaiting,
      waited,
      closed
    } = this;
    return new Promise((resolve, reject) => {
      this.ready = this.ready.finally(async () => {
        if (closed) return reject(new Error('Closed'));

        if (!encoder.write(datagram)) {
          await new Promise(cb => encoder.once('drain', cb));
        }

        if (!(datagram instanceof _nms.NmsDatagram) || datagram.notReply) {
          return resolve();
        }

        waited.push(new WaitedNmsDatagram(datagram, resolve, reject, stopWaiting));
      });
    });
  }

  ping(address) {
    debug(`ping [${address.toString()}] ${this.path}`);
    const now = Date.now();
    return this.sendDatagram((0, _nms.createNmsRead)(address, VERSION_ID)).then(datagram => {
      return Reflect.getOwnMetadata('timeStamp', datagram) - now;
    }).catch(() => {
      // debug(`ping [${address}] failed ${reson}`);
      return -1;
    });
  }

  findByType(type = MINIHOST_TYPE) {
    debug(`findByType ${type} on ${this.path} (${this.description.category})`);
    const sarp = (0, _sarp.createSarp)(_sarp.SarpQueryType.ByType, [0, 0, 0, type >> 8 & 0xFF, type & 0xFF]);
    return this.sendDatagram(sarp);
  }

  async getVersion(address) {
    const nmsRead = (0, _nms.createNmsRead)(address, VERSION_ID);

    try {
      const {
        value,
        status
      } = await this.sendDatagram(nmsRead);

      if (status !== 0) {
        debug('<error>', status);
        return [];
      }

      const version = value & 0xFFFF;
      const type = value >>> 16;
      return [version, type];
    } catch (err) {
      debug('<error>', err.message || err);
      return [];
    }
  }

}

var _default = NibusConnection;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9uaWJ1cy9OaWJ1c0Nvbm5lY3Rpb24udHMiXSwibmFtZXMiOlsiTUlOSUhPU1RfVFlQRSIsIlZFUlNJT05fSUQiLCJkZWJ1ZyIsIk5JQlVTX1RJTUVPVVQiLCJzZXROaWJ1c1RpbWVvdXQiLCJ0aW1lb3V0IiwiZ2V0TmlidXNUaW1lb3V0IiwiV2FpdGVkTm1zRGF0YWdyYW0iLCJjb25zdHJ1Y3RvciIsInJlcSIsInJlc29sdmUiLCJyZWplY3QiLCJjYWxsYmFjayIsInRpbWVyIiwiY291bnRlciIsInNlcnZpY2UiLCJObXNTZXJ2aWNlVHlwZSIsIlJlYWQiLCJNYXRoIiwiZmxvb3IiLCJubXMiLCJsZW5ndGgiLCJkYXRhZ3JhbXMiLCJUaW1lb3V0RXJyb3IiLCJkZXN0aW5hdGlvbiIsInJlc3RhcnQiLCJzdGVwIiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImRhdGFncmFtIiwicHVzaCIsIk5pYnVzQ29ubmVjdGlvbiIsIkV2ZW50RW1pdHRlciIsInBhdGgiLCJkZXNjcmlwdGlvbiIsIk5pYnVzRW5jb2RlciIsIk5pYnVzRGVjb2RlciIsIlByb21pc2UiLCJ3YWl0ZWQiLCJfIiwicmVtb3ZlIiwic2hvd0xvZyIsIk5tc0RhdGFncmFtIiwiaXNSZXNwb25zZSIsInJlc3AiLCJmaW5kIiwiaXRlbSIsImlzUmVzcG9uc2VGb3IiLCJlbWl0IiwiU2FycERhdGFncmFtIiwiSlNPTiIsInN0cmluZ2lmeSIsInRvSlNPTiIsImNsb3NlZCIsImNhdGVnb3J5IiwiZW5jb2RlciIsImVuZCIsImRlY29kZXIiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJzb2NrZXQiLCJkZXN0cm95IiwidmFsaWRhdGUiLCJNaWJEZXNjcmlwdGlvblYiLCJkZWNvZGUiLCJpc0xlZnQiLCJtc2ciLCJQYXRoUmVwb3J0ZXIiLCJyZXBvcnQiLCJqb2luIiwiVHlwZUVycm9yIiwidmFsdWUiLCJ4cGlwZSIsImVxIiwicGlwZSIsIm9uIiwib25EYXRhZ3JhbSIsIm9uY2UiLCJjbG9zZSIsInNlbmREYXRhZ3JhbSIsInN0b3BXYWl0aW5nIiwicmVhZHkiLCJmaW5hbGx5IiwiRXJyb3IiLCJ3cml0ZSIsImNiIiwibm90UmVwbHkiLCJwaW5nIiwiYWRkcmVzcyIsInRvU3RyaW5nIiwibm93IiwiRGF0ZSIsInRoZW4iLCJSZWZsZWN0IiwiZ2V0T3duTWV0YWRhdGEiLCJjYXRjaCIsImZpbmRCeVR5cGUiLCJ0eXBlIiwic2FycCIsIlNhcnBRdWVyeVR5cGUiLCJCeVR5cGUiLCJnZXRWZXJzaW9uIiwibm1zUmVhZCIsInN0YXR1cyIsInZlcnNpb24iLCJlcnIiLCJtZXNzYWdlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFVQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7QUFFQTs7QUFJQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7Ozs7O0FBRU8sTUFBTUEsYUFBYSxHQUFHLE1BQXRCLEMsQ0FDUDs7O0FBQ0EsTUFBTUMsVUFBVSxHQUFHLENBQW5CO0FBRUEsTUFBTUMsS0FBSyxHQUFHLG9CQUFhLGtCQUFiLENBQWQ7QUFDQSxJQUFJQyxhQUFhLEdBQUcsSUFBcEI7O0FBRU8sTUFBTUMsZUFBZSxHQUFJQyxPQUFELElBQXFCO0FBQ2xERixFQUFBQSxhQUFhLEdBQUdFLE9BQWhCO0FBQ0QsQ0FGTTs7OztBQUlBLE1BQU1DLGVBQWUsR0FBRyxNQUFNSCxhQUE5Qjs7OztBQUVQLE1BQU1JLGlCQUFOLENBQXdCO0FBR3RCQyxFQUFBQSxXQUFXLENBQ09DLEdBRFAsRUFFVEMsT0FGUyxFQUdUQyxNQUhTLEVBSVRDLFFBSlMsRUFJb0M7QUFBQTs7QUFBQTs7QUFDN0MsUUFBSUMsS0FBSjtBQUNBLFFBQUlDLE9BQWUsR0FBR0wsR0FBRyxDQUFDTSxPQUFKLEtBQWdCQyx3QkFBZUMsSUFBL0IsR0FDbEIsQ0FEa0IsR0FFbEJDLElBQUksQ0FBQ0MsS0FBTCxDQUFXVixHQUFHLENBQUNXLEdBQUosQ0FBUUMsTUFBUixHQUFpQixDQUE1QixJQUFpQyxDQUZy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QSxLQUFLLENBQUMsU0FBRCxFQUFZb0csTUFBWixDQUFMO0FBQ0EsZUFBTyxFQUFQO0FBQ0Q7O0FBQ0QsWUFBTUMsT0FBTyxHQUFJakMsS0FBRCxHQUFvQixNQUFwQztBQUNBLFlBQU0wQixJQUFJLEdBQUkxQixLQUFELEtBQXNCLEVBQW5DO0FBQ0EsYUFBTyxDQUFDaUMsT0FBRCxFQUFVUCxJQUFWLENBQVA7QUFDRCxLQVRELENBU0UsT0FBT1EsR0FBUCxFQUFZO0FBQ1p0RyxNQUFBQSxLQUFLLENBQUMsU0FBRCxFQUFZc0csR0FBRyxDQUFDQyxPQUFKLElBQWVELEdBQTNCLENBQUw7QUFDQSxhQUFPLEVBQVA7QUFDRDtBQUNGOztBQXZHd0M7O2VBcUg1QnpFLGUiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gT09PIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbmltcG9ydCB7IFBhdGhSZXBvcnRlciB9IGZyb20gJ2lvLXRzL2xpYi9QYXRoUmVwb3J0ZXInO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IFNvY2tldCwgY29ubmVjdCB9IGZyb20gJ25ldCc7XG5pbXBvcnQgeHBpcGUgZnJvbSAneHBpcGUnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCBkZWJ1Z0ZhY3RvcnkgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgQWRkcmVzc1BhcmFtIH0gZnJvbSAnLi4vQWRkcmVzcyc7XG5pbXBvcnQgeyBUaW1lb3V0RXJyb3IgfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHsgZ2V0U29ja2V0UGF0aCB9IGZyb20gJy4uL2lwYyc7XG4vLyBpbXBvcnQgeyBkZXZpY2VzIH0gZnJvbSAnLi4vbWliJztcbmltcG9ydCB7XG4gIGNyZWF0ZU5tc1JlYWQsXG4gIE5tc0RhdGFncmFtLFxufSBmcm9tICcuLi9ubXMnO1xuaW1wb3J0IE5tc1NlcnZpY2VUeXBlIGZyb20gJy4uL25tcy9ObXNTZXJ2aWNlVHlwZSc7XG5pbXBvcnQgeyBjcmVhdGVTYXJwLCBTYXJwUXVlcnlUeXBlLCBTYXJwRGF0YWdyYW0gfSBmcm9tICcuLi9zYXJwJztcbmltcG9ydCB7IE1pYkRlc2NyaXB0aW9uViwgSU1pYkRlc2NyaXB0aW9uIH0gZnJvbSAnLi4vTWliRGVzY3JpcHRpb24nO1xuaW1wb3J0IE5pYnVzRGF0YWdyYW0gZnJvbSAnLi9OaWJ1c0RhdGFncmFtJztcbmltcG9ydCBOaWJ1c0VuY29kZXIgZnJvbSAnLi9OaWJ1c0VuY29kZXInO1xuaW1wb3J0IE5pYnVzRGVjb2RlciBmcm9tICcuL05pYnVzRGVjb2Rlcic7XG5cbmV4cG9ydCBjb25zdCBNSU5JSE9TVF9UWVBFID0gMHhhYmM2O1xuLy8gY29uc3QgRklSTVdBUkVfVkVSU0lPTl9JRCA9IDB4ODU7XG5jb25zdCBWRVJTSU9OX0lEID0gMjtcblxuY29uc3QgZGVidWcgPSBkZWJ1Z0ZhY3RvcnkoJ25pYnVzOmNvbm5lY3Rpb24nKTtcbmxldCBOSUJVU19USU1FT1VUID0gMTAwMDtcblxuZXhwb3J0IGNvbnN0IHNldE5pYnVzVGltZW91dCA9ICh0aW1lb3V0OiBudW1iZXIpID0+IHtcbiAgTklCVVNfVElNRU9VVCA9IHRpbWVvdXQ7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0TmlidXNUaW1lb3V0ID0gKCkgPT4gTklCVVNfVElNRU9VVDtcblxuY2xhc3MgV2FpdGVkTm1zRGF0YWdyYW0ge1xuICByZWFkb25seSByZXNvbHZlOiAoZGF0YWdyYW06IE5tc0RhdGFncmFtKSA9PiB2b2lkO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSByZXE6IE5tc0RhdGFncmFtLFxuICAgIHJlc29sdmU6IChkYXRhZ3JhbTogTm1zRGF0YWdyYW0gfCBObXNEYXRhZ3JhbVtdKSA9PiB2b2lkLFxuICAgIHJlamVjdDogKHJlYXNvbjogRXJyb3IpID0+IHZvaWQsXG4gICAgY2FsbGJhY2s6IChzZWxmOiBXYWl0ZWRObXNEYXRhZ3JhbSkgPT4gdm9pZCkge1xuICAgIGxldCB0aW1lcjogTm9kZUpTLlRpbWVyO1xuICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSByZXEuc2VydmljZSAhPT0gTm1zU2VydmljZVR5cGUuUmVhZFxuICAgICAgPyAxXG4gICAgICA6IE1hdGguZmxvb3IocmVxLm5tcy5sZW5ndGggLyAzKSArIDE7XG4gICAgY29uc3QgZGF0YWdyYW1zOiBObXNEYXRhZ3JhbVtdID0gW107XG4gICAgY29uc3QgdGltZW91dCA9ICgpID0+IHtcbiAgICAgIGNhbGxiYWNrKHRoaXMpO1xuICAgICAgZGF0YWdyYW1zLmxlbmd0aCA9PT0gMFxuICAgICAgICA/IHJlamVjdChuZXcgVGltZW91dEVycm9yKFxuICAgICAgICBgVGltZW91dCBlcnJvciBvbiAke3JlcS5kZXN0aW5hdGlvbn0gd2hpbGUgJHtObXNTZXJ2aWNlVHlwZVtyZXEuc2VydmljZV19YCkpXG4gICAgICAgIDogcmVzb2x2ZShkYXRhZ3JhbXMpO1xuICAgIH07XG4gICAgY29uc3QgcmVzdGFydCA9IChzdGVwID0gMSkgPT4ge1xuICAgICAgY291bnRlciAtPSBzdGVwO1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgIGlmIChjb3VudGVyID4gMCkge1xuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQodGltZW91dCwgcmVxLnRpbWVvdXQgfHwgTklCVVNfVElNRU9VVCk7XG4gICAgICB9IGVsc2UgaWYgKGNvdW50ZXIgPT09IDApIHtcbiAgICAgICAgY2FsbGJhY2sodGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY291bnRlciA9PT0gMDtcbiAgICB9O1xuICAgIHJlc3RhcnQoMCk7XG4gICAgdGhpcy5yZXNvbHZlID0gKGRhdGFncmFtOiBObXNEYXRhZ3JhbSkgPT4ge1xuICAgICAgZGF0YWdyYW1zLnB1c2goZGF0YWdyYW0pO1xuICAgICAgaWYgKHJlc3RhcnQoKSkge1xuICAgICAgICByZXNvbHZlKGRhdGFncmFtcy5sZW5ndGggPiAxID8gZGF0YWdyYW1zIDogZGF0YWdyYW0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxudHlwZSBTYXJwTGlzdG5lciA9IChkYXRhZ3JhbTogU2FycERhdGFncmFtKSA9PiB2b2lkO1xudHlwZSBObXNMaXN0ZW5lciA9IChkYXRhZ3JhbTogTm1zRGF0YWdyYW0pID0+IHZvaWQ7XG5cbmRlY2xhcmUgaW50ZXJmYWNlIE5pYnVzQ29ubmVjdGlvbiB7XG4gIG9uKGV2ZW50OiAnc2FycCcsIGxpc3RlbmVyOiBTYXJwTGlzdG5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnbm1zJywgbGlzdGVuZXI6IE5tc0xpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3NhcnAnLCBsaXN0ZW5lcjogU2FycExpc3RuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnbm1zJywgbGlzdGVuZXI6IE5tc0xpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdzYXJwJywgbGlzdGVuZXI6IFNhcnBMaXN0bmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdubXMnLCBsaXN0ZW5lcjogTm1zTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdzYXJwJywgbGlzdGVuZXI6IFNhcnBMaXN0bmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnbm1zJywgbGlzdGVuZXI6IE5tc0xpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdzYXJwJywgbGlzdGVuZXI6IFNhcnBMaXN0bmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdubXMnLCBsaXN0ZW5lcjogTm1zTGlzdGVuZXIpOiB0aGlzO1xufVxuXG5jbGFzcyBOaWJ1c0Nvbm5lY3Rpb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHNvY2tldDogU29ja2V0O1xuICBwcml2YXRlIHJlYWRvbmx5IGVuY29kZXIgPSBuZXcgTmlidXNFbmNvZGVyKCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZGVjb2RlciA9IG5ldyBOaWJ1c0RlY29kZXIoKTtcbiAgcHJpdmF0ZSByZWFkeSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICBwcml2YXRlIGNsb3NlZCA9IGZhbHNlO1xuICBwcml2YXRlIHJlYWRvbmx5IHdhaXRlZDogV2FpdGVkTm1zRGF0YWdyYW1bXSA9IFtdO1xuICBwdWJsaWMgZGVzY3JpcHRpb246IElNaWJEZXNjcmlwdGlvbjtcblxuICBwcml2YXRlIHN0b3BXYWl0aW5nID0gKHdhaXRlZDogV2FpdGVkTm1zRGF0YWdyYW0pID0+IF8ucmVtb3ZlKHRoaXMud2FpdGVkLCB3YWl0ZWQpO1xuXG4gIHByaXZhdGUgb25EYXRhZ3JhbSA9IChkYXRhZ3JhbTogTmlidXNEYXRhZ3JhbSkgPT4ge1xuICAgIGxldCBzaG93TG9nID0gdHJ1ZTtcbiAgICBpZiAoZGF0YWdyYW0gaW5zdGFuY2VvZiBObXNEYXRhZ3JhbSkge1xuICAgICAgaWYgKGRhdGFncmFtLmlzUmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgcmVzcCA9IHRoaXMud2FpdGVkLmZpbmQoaXRlbSA9PiBkYXRhZ3JhbS5pc1Jlc3BvbnNlRm9yKGl0ZW0ucmVxKSk7XG4gICAgICAgIGlmIChyZXNwKSB7XG4gICAgICAgICAgcmVzcC5yZXNvbHZlKGRhdGFncmFtKTtcbiAgICAgICAgICBzaG93TG9nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuZW1pdCgnbm1zJywgZGF0YWdyYW0pO1xuICAgIH0gZWxzZSBpZiAoZGF0YWdyYW0gaW5zdGFuY2VvZiBTYXJwRGF0YWdyYW0pIHtcbiAgICAgIHRoaXMuZW1pdCgnc2FycCcsIGRhdGFncmFtKTtcbiAgICAgIHNob3dMb2cgPSBmYWxzZTtcbiAgICB9XG4gICAgc2hvd0xvZyAmJlxuICAgIGRlYnVnKGBkYXRhZ3JhbSByZWNlaXZlZGAsIEpTT04uc3RyaW5naWZ5KGRhdGFncmFtLnRvSlNPTigpKSk7XG4gIH07XG5cbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHBhdGg6IHN0cmluZywgZGVzY3JpcHRpb246IElNaWJEZXNjcmlwdGlvbikge1xuICAgIHN1cGVyKCk7XG4gICAgY29uc3QgdmFsaWRhdGUgPSBNaWJEZXNjcmlwdGlvblYuZGVjb2RlKGRlc2NyaXB0aW9uKTtcbiAgICBpZiAodmFsaWRhdGUuaXNMZWZ0KCkpIHtcbiAgICAgIGNvbnN0IG1zZyA9IFBhdGhSZXBvcnRlci5yZXBvcnQodmFsaWRhdGUpLmpvaW4oJ1xcbicpO1xuICAgICAgZGVidWcoJzxlcnJvcj4nLCBtc2cpO1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihtc2cpO1xuICAgIH1cbiAgICB0aGlzLmRlc2NyaXB0aW9uID0gdmFsaWRhdGUudmFsdWU7XG4gICAgdGhpcy5zb2NrZXQgPSBjb25uZWN0KHhwaXBlLmVxKGdldFNvY2tldFBhdGgocGF0aCkpKTtcbiAgICB0aGlzLnNvY2tldC5waXBlKHRoaXMuZGVjb2Rlcik7XG4gICAgdGhpcy5lbmNvZGVyLnBpcGUodGhpcy5zb2NrZXQpO1xuICAgIHRoaXMuZGVjb2Rlci5vbignZGF0YScsIHRoaXMub25EYXRhZ3JhbSk7XG4gICAgdGhpcy5zb2NrZXQub25jZSgnY2xvc2UnLCB0aGlzLmNsb3NlKTtcbiAgICBkZWJ1ZyhgbmV3IGNvbm5lY3Rpb24gb24gJHtwYXRofSAoJHtkZXNjcmlwdGlvbi5jYXRlZ29yeX0pYCk7XG4gIH1cblxuICBwdWJsaWMgc2VuZERhdGFncmFtKGRhdGFncmFtOiBOaWJ1c0RhdGFncmFtKTogUHJvbWlzZTxObXNEYXRhZ3JhbSB8IE5tc0RhdGFncmFtW10gfCB1bmRlZmluZWQ+IHtcbiAgICAvLyBkZWJ1Zygnd3JpdGUgZGF0YWdyYW0gZnJvbSAnLCBkYXRhZ3JhbS5zb3VyY2UudG9TdHJpbmcoKSk7XG4gICAgY29uc3QgeyBlbmNvZGVyLCBzdG9wV2FpdGluZywgd2FpdGVkLCBjbG9zZWQgfSA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVhZHkgPSB0aGlzLnJlYWR5LmZpbmFsbHkoYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoY2xvc2VkKSByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcignQ2xvc2VkJykpO1xuICAgICAgICBpZiAoIWVuY29kZXIud3JpdGUoZGF0YWdyYW0pKSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoY2IgPT4gZW5jb2Rlci5vbmNlKCdkcmFpbicsIGNiKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEoZGF0YWdyYW0gaW5zdGFuY2VvZiBObXNEYXRhZ3JhbSkgfHwgZGF0YWdyYW0ubm90UmVwbHkpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHdhaXRlZC5wdXNoKG5ldyBXYWl0ZWRObXNEYXRhZ3JhbShcbiAgICAgICAgICBkYXRhZ3JhbSxcbiAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgIHJlamVjdCxcbiAgICAgICAgICBzdG9wV2FpdGluZyxcbiAgICAgICAgKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBwaW5nKGFkZHJlc3M6IEFkZHJlc3NQYXJhbSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZGVidWcoYHBpbmcgWyR7YWRkcmVzcy50b1N0cmluZygpfV0gJHt0aGlzLnBhdGh9YCk7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICByZXR1cm4gdGhpcy5zZW5kRGF0YWdyYW0oY3JlYXRlTm1zUmVhZChhZGRyZXNzLCBWRVJTSU9OX0lEKSlcbiAgICAgIC50aGVuKChkYXRhZ3JhbSkgPT4ge1xuICAgICAgICByZXR1cm4gPG51bWJlcj4oUmVmbGVjdC5nZXRPd25NZXRhZGF0YSgndGltZVN0YW1wJywgZGF0YWdyYW0hKSkgLSBub3c7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgLy8gZGVidWcoYHBpbmcgWyR7YWRkcmVzc31dIGZhaWxlZCAke3Jlc29ufWApO1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBmaW5kQnlUeXBlKHR5cGU6IG51bWJlciA9IE1JTklIT1NUX1RZUEUpIHtcbiAgICBkZWJ1ZyhgZmluZEJ5VHlwZSAke3R5cGV9IG9uICR7dGhpcy5wYXRofSAoJHt0aGlzLmRlc2NyaXB0aW9uLmNhdGVnb3J5fSlgKTtcbiAgICBjb25zdCBzYXJwID0gY3JlYXRlU2FycChTYXJwUXVlcnlUeXBlLkJ5VHlwZSwgWzAsIDAsIDAsICh0eXBlID4+IDgpICYgMHhGRiwgdHlwZSAmIDB4RkZdKTtcbiAgICByZXR1cm4gdGhpcy5zZW5kRGF0YWdyYW0oc2FycCk7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgZ2V0VmVyc2lvbihhZGRyZXNzOiBBZGRyZXNzUGFyYW0pOiBQcm9taXNlPFtudW1iZXI/LCBudW1iZXI/XT4ge1xuICAgIGNvbnN0IG5tc1JlYWQgPSBjcmVhdGVObXNSZWFkKGFkZHJlc3MsIFZFUlNJT05fSUQpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHZhbHVlLCBzdGF0dXMgfSA9IGF3YWl0IHRoaXMuc2VuZERhdGFncmFtKG5tc1JlYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgaWYgKHN0YXR1cyAhPT0gMCkge1xuICAgICAgICBkZWJ1ZygnPGVycm9yPicsIHN0YXR1cyk7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZlcnNpb24gPSAodmFsdWUgYXMgbnVtYmVyKSAmIDB4RkZGRjtcbiAgICAgIGNvbnN0IHR5cGUgPSAodmFsdWUgYXMgbnVtYmVyKSA+Pj4gMTY7XG4gICAgICByZXR1cm4gW3ZlcnNpb24sIHR5cGVdO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgZGVidWcoJzxlcnJvcj4nLCBlcnIubWVzc2FnZSB8fCBlcnIpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBjbG9zZSA9ICgpID0+IHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHJldHVybjtcbiAgICBjb25zdCB7IHBhdGgsIGRlc2NyaXB0aW9uIH0gPSB0aGlzO1xuICAgIGRlYnVnKGBjbG9zZSBjb25uZWN0aW9uIG9uICR7cGF0aH0gKCR7ZGVzY3JpcHRpb24uY2F0ZWdvcnl9KWApO1xuICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVuY29kZXIuZW5kKCk7XG4gICAgdGhpcy5kZWNvZGVyLnJlbW92ZUFsbExpc3RlbmVycygnZGF0YScpO1xuICAgIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgICB0aGlzLmVtaXQoJ2Nsb3NlJyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IE5pYnVzQ29ubmVjdGlvbjtcbiJdfQ==