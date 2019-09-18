"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _serialport = _interopRequireDefault(require("serialport"));

var _debug = _interopRequireDefault(require("debug"));

var _events = require("events");

var _core = require("@nibus/core/");

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

// declare module serialport {
//   interface SerialPort {
//     write(
//       data: string | Uint8Array | Buffer,
//       callback?: (error: any, bytesWritten: number) => void): boolean;
//     write(
//       buffer: string | Uint8Array | Buffer,
//       encoding?: 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'base64' | 'binary' | 'hex',
//       callback?: (error: any, bytesWritten: number) => void): boolean;
//     test: () => void;
//   }
// }
class SerialTee extends _events.EventEmitter {
  constructor(portInfo, description) {
    super();
    this.portInfo = portInfo;
    this.description = description;

    _defineProperty(this, "serial", void 0);

    _defineProperty(this, "closed", false);

    _defineProperty(this, "server", void 0);

    _defineProperty(this, "logger", null);

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
    const win32 = process.platform === 'win32' && description.win32 || {};
    this.serial = new _serialport.default(path, { ...portOptions,
      baudRate: description.baudRate || 115200,
      parity: win32.parity || description.parity || portOptions.parity
    });
    this.serial.on('close', this.close);
    this.server = new _Server.default(_core.ipc.getSocketPath(path), true);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9pcGMvU2VyaWFsVGVlLnRzIl0sIm5hbWVzIjpbImRlYnVnIiwicG9ydE9wdGlvbnMiLCJiYXVkUmF0ZSIsImRhdGFCaXRzIiwicGFyaXR5Iiwic3RvcEJpdHMiLCJTZXJpYWxUZWUiLCJFdmVudEVtaXR0ZXIiLCJjb25zdHJ1Y3RvciIsInBvcnRJbmZvIiwiZGVzY3JpcHRpb24iLCJjbG9zZWQiLCJzZXJpYWwiLCJzZXJ2ZXIiLCJpc09wZW4iLCJwYXRoIiwiY2xvc2UiLCJlbWl0IiwiY29tTmFtZSIsIndpbjMyIiwicHJvY2VzcyIsInBsYXRmb3JtIiwiU2VyaWFsUG9ydCIsIm9uIiwiU2VydmVyIiwiaXBjIiwiZ2V0U29ja2V0UGF0aCIsInBpcGUiLCJjYXRlZ29yeSIsInNldExvZ2dlciIsImxvZ2dlciIsIm9mZiIsInRvSlNPTiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBVUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQUlBLE1BQU1BLEtBQUssR0FBRyxvQkFBYSxrQkFBYixDQUFkO0FBQ0EsTUFBTUMsV0FBd0IsR0FBRztBQUMvQkMsRUFBQUEsUUFBUSxFQUFFLE1BRHFCO0FBRS9CQyxFQUFBQSxRQUFRLEVBQUUsQ0FGcUI7QUFHL0JDLEVBQUFBLE1BQU0sRUFBRSxNQUh1QjtBQUkvQkMsRUFBQUEsUUFBUSxFQUFFO0FBSnFCLENBQWpDOztBQVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVlLE1BQU1DLFNBQU4sU0FBd0JDLG9CQUF4QixDQUFxQztBQU1sREMsRUFBQUEsV0FBVyxDQUFpQkMsUUFBakIsRUFBdURDLFdBQXZELEVBQXFGO0FBQzlGO0FBRDhGLFNBQXBFRCxRQUFvRSxHQUFwRUEsUUFBb0U7QUFBQSxTQUE5QkMsV0FBOEIsR0FBOUJBLFdBQThCOztBQUFBOztBQUFBLG9DQUovRSxLQUkrRTs7QUFBQTs7QUFBQSxvQ0FGMUQsSUFFMEQ7O0FBQUEsbUNBdUJqRixNQUFNO0FBQ25CLFVBQUksS0FBS0MsTUFBVCxFQUFpQjtBQUNqQixZQUFNO0FBQUVDLFFBQUFBLE1BQUY7QUFBVUMsUUFBQUE7QUFBVixVQUFxQixJQUEzQjs7QUFDQSxVQUFJRCxNQUFNLENBQUNFLE1BQVgsRUFBbUI7QUFDakJkLFFBQUFBLEtBQUssQ0FBQyxjQUFELEVBQWlCWSxNQUFNLENBQUNHLElBQXhCLENBQUw7QUFDQUgsUUFBQUEsTUFBTSxDQUFDSSxLQUFQO0FBQ0Q7O0FBQ0RILE1BQUFBLE1BQU0sQ0FBQ0csS0FBUDtBQUNBLFdBQUtMLE1BQUwsR0FBYyxJQUFkO0FBQ0EsV0FBS00sSUFBTCxDQUFVLE9BQVYsRUFBbUIsS0FBS1IsUUFBTCxDQUFjUyxPQUFqQztBQUNELEtBakMrRjs7QUFFOUYsVUFBTTtBQUFFQSxNQUFBQSxPQUFPLEVBQUVIO0FBQVgsUUFBb0JOLFFBQTFCO0FBQ0EsVUFBTVUsS0FBSyxHQUFHQyxPQUFPLENBQUNDLFFBQVIsS0FBcUIsT0FBckIsSUFBZ0NYLFdBQVcsQ0FBQ1MsS0FBNUMsSUFBcUQsRUFBbkU7QUFDQSxTQUFLUCxNQUFMLEdBQWMsSUFBSVUsbUJBQUosQ0FDWlAsSUFEWSxFQUVaLEVBQ0UsR0FBR2QsV0FETDtBQUVFQyxNQUFBQSxRQUFRLEVBQUVRLFdBQVcsQ0FBQ1IsUUFBWixJQUF3QixNQUZwQztBQUdFRSxNQUFBQSxNQUFNLEVBQUVlLEtBQUssQ0FBQ2YsTUFBTixJQUFnQk0sV0FBVyxDQUFDTixNQUE1QixJQUFzQ0gsV0FBVyxDQUFDRztBQUg1RCxLQUZZLENBQWQ7QUFRQSxTQUFLUSxNQUFMLENBQVlXLEVBQVosQ0FBZSxPQUFmLEVBQXdCLEtBQUtQLEtBQTdCO0FBQ0EsU0FBS0gsTUFBTCxHQUFjLElBQUlXLGVBQUosQ0FBV0MsVUFBSUMsYUFBSixDQUFrQlgsSUFBbEIsQ0FBWCxFQUFvQyxJQUFwQyxDQUFkO0FBQ0EsU0FBS0YsTUFBTCxDQUFZYyxJQUFaLENBQWlCLEtBQUtmLE1BQXRCO0FBQ0EsU0FBS0EsTUFBTCxDQUFZZSxJQUFaLENBQWlCLEtBQUtkLE1BQXRCO0FBQ0FiLElBQUFBLEtBQUssQ0FBRSxxQkFBb0JlLElBQUssVUFBUyxLQUFLSCxNQUFMLENBQVlWLFFBQVMsS0FBSVEsV0FBVyxDQUFDa0IsUUFBUyxHQUFsRixDQUFMO0FBQ0Q7O0FBRUQsTUFBV2IsSUFBWCxHQUFrQjtBQUNoQixXQUFPLEtBQUtGLE1BQUwsQ0FBWUUsSUFBbkI7QUFDRDs7QUFjTWMsRUFBQUEsU0FBUCxDQUFpQkMsTUFBakIsRUFBOEM7QUFDNUMsUUFBSSxLQUFLQSxNQUFULEVBQWlCO0FBQ2YsV0FBS2pCLE1BQUwsQ0FBWWtCLEdBQVosQ0FBZ0IsS0FBaEIsRUFBdUIsS0FBS0QsTUFBNUI7QUFDRDs7QUFDRCxTQUFLQSxNQUFMLEdBQWNBLE1BQWQ7O0FBQ0EsUUFBSSxLQUFLQSxNQUFULEVBQWlCO0FBQ2YsV0FBS2pCLE1BQUwsQ0FBWVUsRUFBWixDQUFlLEtBQWYsRUFBc0IsS0FBS08sTUFBM0I7QUFDRDtBQUNGOztBQUVERSxFQUFBQSxNQUFNLEdBQUc7QUFDUCxVQUFNO0FBQUV2QixNQUFBQSxRQUFGO0FBQVlDLE1BQUFBO0FBQVosUUFBNEIsSUFBbEM7QUFDQSxXQUFPO0FBQ0xELE1BQUFBLFFBREs7QUFFTEMsTUFBQUE7QUFGSyxLQUFQO0FBSUQ7O0FBekRpRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG5pbXBvcnQgU2VyaWFsUG9ydCwgeyBPcGVuT3B0aW9ucyB9IGZyb20gJ3NlcmlhbHBvcnQnO1xuaW1wb3J0IGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IHsgaXBjIH0gZnJvbSAnQG5pYnVzL2NvcmUvJztcbmltcG9ydCBTZXJ2ZXIsIHsgRGlyZWN0aW9uIH0gZnJvbSAnLi9TZXJ2ZXInO1xuaW1wb3J0IHsgSUtub3duUG9ydCB9IGZyb20gJ0BuaWJ1cy9jb3JlL2xpYi9zZXNzaW9uJztcbmltcG9ydCB7IElNaWJEZXNjcmlwdGlvbiB9IGZyb20gJ0BuaWJ1cy9jb3JlL2xpYi9NaWJEZXNjcmlwdGlvbic7XG5cbmNvbnN0IGRlYnVnID0gZGVidWdGYWN0b3J5KCduaWJ1czpzZXJpYWwtdGVlJyk7XG5jb25zdCBwb3J0T3B0aW9uczogT3Blbk9wdGlvbnMgPSB7XG4gIGJhdWRSYXRlOiAxMTUyMDAsXG4gIGRhdGFCaXRzOiA4LFxuICBwYXJpdHk6ICdub25lJyxcbiAgc3RvcEJpdHM6IDEsXG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcmlhbExvZ2dlciB7XG4gIChkYXRhOiBCdWZmZXIsIGRpcjogRGlyZWN0aW9uKTogdm9pZDtcbn1cblxuLy8gZGVjbGFyZSBtb2R1bGUgc2VyaWFscG9ydCB7XG4vLyAgIGludGVyZmFjZSBTZXJpYWxQb3J0IHtcbi8vICAgICB3cml0ZShcbi8vICAgICAgIGRhdGE6IHN0cmluZyB8IFVpbnQ4QXJyYXkgfCBCdWZmZXIsXG4vLyAgICAgICBjYWxsYmFjaz86IChlcnJvcjogYW55LCBieXRlc1dyaXR0ZW46IG51bWJlcikgPT4gdm9pZCk6IGJvb2xlYW47XG4vLyAgICAgd3JpdGUoXG4vLyAgICAgICBidWZmZXI6IHN0cmluZyB8IFVpbnQ4QXJyYXkgfCBCdWZmZXIsXG4vLyAgICAgICBlbmNvZGluZz86ICdhc2NpaScgfCAndXRmOCcgfCAndXRmMTZsZScgfCAndWNzMicgfCAnYmFzZTY0JyB8ICdiaW5hcnknIHwgJ2hleCcsXG4vLyAgICAgICBjYWxsYmFjaz86IChlcnJvcjogYW55LCBieXRlc1dyaXR0ZW46IG51bWJlcikgPT4gdm9pZCk6IGJvb2xlYW47XG4vLyAgICAgdGVzdDogKCkgPT4gdm9pZDtcbi8vICAgfVxuLy8gfVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZXJpYWxUZWUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IHNlcmlhbDogU2VyaWFsUG9ydDtcbiAgcHJpdmF0ZSBjbG9zZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZWFkb25seSBzZXJ2ZXI6IFNlcnZlcjtcbiAgcHJpdmF0ZSBsb2dnZXI6IFNlcmlhbExvZ2dlciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBwb3J0SW5mbzogSUtub3duUG9ydCwgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uOiBJTWliRGVzY3JpcHRpb24pIHtcbiAgICBzdXBlcigpO1xuICAgIGNvbnN0IHsgY29tTmFtZTogcGF0aCB9ID0gcG9ydEluZm87XG4gICAgY29uc3Qgd2luMzIgPSBwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInICYmIGRlc2NyaXB0aW9uLndpbjMyIHx8IHt9O1xuICAgIHRoaXMuc2VyaWFsID0gbmV3IFNlcmlhbFBvcnQoXG4gICAgICBwYXRoLFxuICAgICAge1xuICAgICAgICAuLi5wb3J0T3B0aW9ucyxcbiAgICAgICAgYmF1ZFJhdGU6IGRlc2NyaXB0aW9uLmJhdWRSYXRlIHx8IDExNTIwMCxcbiAgICAgICAgcGFyaXR5OiB3aW4zMi5wYXJpdHkgfHwgZGVzY3JpcHRpb24ucGFyaXR5IHx8IHBvcnRPcHRpb25zLnBhcml0eSxcbiAgICAgIH0sXG4gICAgKTtcbiAgICB0aGlzLnNlcmlhbC5vbignY2xvc2UnLCB0aGlzLmNsb3NlKTtcbiAgICB0aGlzLnNlcnZlciA9IG5ldyBTZXJ2ZXIoaXBjLmdldFNvY2tldFBhdGgocGF0aCksIHRydWUpO1xuICAgIHRoaXMuc2VydmVyLnBpcGUodGhpcy5zZXJpYWwpO1xuICAgIHRoaXMuc2VyaWFsLnBpcGUodGhpcy5zZXJ2ZXIpO1xuICAgIGRlYnVnKGBuZXcgY29ubmVjdGlvbiBvbiAke3BhdGh9IGJhdWQ6ICR7dGhpcy5zZXJpYWwuYmF1ZFJhdGV9ICgke2Rlc2NyaXB0aW9uLmNhdGVnb3J5fSlgKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgcGF0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXIucGF0aDtcbiAgfVxuXG4gIHB1YmxpYyBjbG9zZSA9ICgpID0+IHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHJldHVybjtcbiAgICBjb25zdCB7IHNlcmlhbCwgc2VydmVyIH0gPSB0aGlzO1xuICAgIGlmIChzZXJpYWwuaXNPcGVuKSB7XG4gICAgICBkZWJ1ZygnY2xvc2Ugc2VyaWFsJywgc2VyaWFsLnBhdGgpO1xuICAgICAgc2VyaWFsLmNsb3NlKCk7XG4gICAgfVxuICAgIHNlcnZlci5jbG9zZSgpO1xuICAgIHRoaXMuY2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXQoJ2Nsb3NlJywgdGhpcy5wb3J0SW5mby5jb21OYW1lKTtcbiAgfTtcblxuICBwdWJsaWMgc2V0TG9nZ2VyKGxvZ2dlcjogU2VyaWFsTG9nZ2VyIHwgbnVsbCkge1xuICAgIGlmICh0aGlzLmxvZ2dlcikge1xuICAgICAgdGhpcy5zZXJ2ZXIub2ZmKCdyYXcnLCB0aGlzLmxvZ2dlcik7XG4gICAgfVxuICAgIHRoaXMubG9nZ2VyID0gbG9nZ2VyO1xuICAgIGlmICh0aGlzLmxvZ2dlcikge1xuICAgICAgdGhpcy5zZXJ2ZXIub24oJ3JhdycsIHRoaXMubG9nZ2VyKTtcbiAgICB9XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgY29uc3QgeyBwb3J0SW5mbywgZGVzY3JpcHRpb24gfSA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBvcnRJbmZvLFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgfTtcbiAgfVxufVxuIl19