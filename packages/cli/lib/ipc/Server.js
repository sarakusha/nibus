"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Direction = void 0;

require("source-map-support/register");

var _net = _interopRequireWildcard(require("net"));

var _stream = require("stream");

var _debug = _interopRequireDefault(require("debug"));

var _fs = _interopRequireDefault(require("fs"));

var _xpipe = _interopRequireDefault(require("xpipe"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const debug = (0, _debug.default)('nibus:IPCServer');

const noop = () => {};

let Direction;
exports.Direction = Direction;

(function (Direction) {
  Direction[Direction["in"] = 0] = "in";
  Direction[Direction["out"] = 1] = "out";
})(Direction || (exports.Direction = Direction = {}));

class IPCServer extends _stream.Duplex {
  constructor(_path, raw = false) {
    super();
    this.raw = raw;

    _defineProperty(this, "server", void 0);

    _defineProperty(this, "clients", void 0);

    _defineProperty(this, "closed", false);

    _defineProperty(this, "reading", false);

    _defineProperty(this, "connectionHandler", socket => {
      this.emit('connection', socket);
      this.clients.push(socket);
      socket.once('error', this.clientErrorHandler.bind(this, socket)).on('data', this.clientDataHandler.bind(this, socket)).once('close', () => this.removeClient(socket));
      debug('new connection on', this.path, this.clients.length);
    });

    _defineProperty(this, "errorHandler", err => {
      if (err.code === 'EADDRINUSE') {
        const check = _net.default.connect(_xpipe.default.eq(this.path), () => {
          debug('Server running, giving up...');
          process.exit();
        });

        check.once('error', e => {
          if (e.code === 'ECONNREFUSED') {
            _fs.default.unlinkSync(_xpipe.default.eq(this.path));

            this.server.listen(_xpipe.default.eq(this.path), () => {
              debug('restart', this.server.address());
            });
          }
        });
      } else {
        throw err;
      }
    });

    _defineProperty(this, "close", () => {
      if (this.closed) return;
      const path = this.server.address();
      this.clients.forEach(client => client.destroy());
      this.clients.length = 0;
      this.server.close();
      this.raw && this.push(null);
      this.closed = true;
      debug(`${path} closed`);
    });

    this.clients = [];
    this.server = new _net.Server();
    this.server = _net.default.createServer(this.connectionHandler).on('error', this.errorHandler).on('close', this.close).listen(_xpipe.default.eq(_path), () => {
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
    // if (this.raie) {
    //   debug(this.path, printBuffer(data));
    // }
    if (this.reading) {
      this.reading = this.push(data);
    }

    if (this.raw) {
      return this.emit('raw', data, Direction.in);
    }

    debug('data from', client.remoteAddress, data.toString());
    const {
      event,
      args
    } = JSON.parse(data.toString());
    this.emit(`client:${event}`, client, ...args);
  }

  removeClient(client) {
    const index = this.clients.findIndex(item => item === client);

    if (index !== -1) {
      this.clients.splice(index, 1);
    }

    client.destroy();
    debug('destroy connection on', this.path, this.clients.length);
  } // tslint:disable-next-line:function-name


  _write(chunk, encoding, callback) {
    this.emit('raw', chunk, Direction.out);
    this.clients.forEach(client => client.write(chunk, encoding, noop));
    callback();
  } // tslint:disable-next-line:function-name


  _read(size) {
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
      args
    };
    return new Promise(resolve => client.write(JSON.stringify(data), () => resolve()));
  }

  broadcast(event, ...args) {
    return Promise.all(this.clients.map(client => this.send(client, event, ...args))).then(() => {});
  }

}

var _default = IPCServer;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9pcGMvU2VydmVyLnRzIl0sIm5hbWVzIjpbImRlYnVnIiwibm9vcCIsIkRpcmVjdGlvbiIsIklQQ1NlcnZlciIsIkR1cGxleCIsImNvbnN0cnVjdG9yIiwicGF0aCIsInJhdyIsInNvY2tldCIsImVtaXQiLCJjbGllbnRzIiwicHVzaCIsIm9uY2UiLCJjbGllbnRFcnJvckhhbmRsZXIiLCJiaW5kIiwib24iLCJjbGllbnREYXRhSGFuZGxlciIsInJlbW92ZUNsaWVudCIsImxlbmd0aCIsImVyciIsImNvZGUiLCJjaGVjayIsIm5ldCIsImNvbm5lY3QiLCJ4cGlwZSIsImVxIiwicHJvY2VzcyIsImV4aXQiLCJlIiwiZnMiLCJ1bmxpbmtTeW5jIiwic2VydmVyIiwibGlzdGVuIiwiYWRkcmVzcyIsImNsb3NlZCIsImZvckVhY2giLCJjbGllbnQiLCJkZXN0cm95IiwiY2xvc2UiLCJTZXJ2ZXIiLCJjcmVhdGVTZXJ2ZXIiLCJjb25uZWN0aW9uSGFuZGxlciIsImVycm9ySGFuZGxlciIsIm1lc3NhZ2UiLCJkYXRhIiwicmVhZGluZyIsImluIiwicmVtb3RlQWRkcmVzcyIsInRvU3RyaW5nIiwiZXZlbnQiLCJhcmdzIiwiSlNPTiIsInBhcnNlIiwiaW5kZXgiLCJmaW5kSW5kZXgiLCJpdGVtIiwic3BsaWNlIiwiX3dyaXRlIiwiY2h1bmsiLCJlbmNvZGluZyIsImNhbGxiYWNrIiwib3V0Iiwid3JpdGUiLCJfcmVhZCIsInNpemUiLCJzZW5kIiwiUHJvbWlzZSIsInJlamVjdCIsIkVycm9yIiwicmVzb2x2ZSIsInN0cmluZ2lmeSIsImJyb2FkY2FzdCIsImFsbCIsIm1hcCIsInRoZW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQVVBOztBQUNBOztBQUNBOztBQUNBOztBQUNBOzs7Ozs7OztBQUVBLE1BQU1BLEtBQUssR0FBRyxvQkFBYSxpQkFBYixDQUFkOztBQUNBLE1BQU1DLElBQUksR0FBRyxNQUFNLENBQUUsQ0FBckI7O0lBRVlDLFM7OztX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QU8sQ0FBQyxLQUFLeUIsTUFBTCxDQUFZRSxPQUFaLE1BQXlCLEVBQTFCLEVBQThCZSxRQUE5QixFQUFQO0FBQ0Q7O0FBRURpQixFQUFBQSxJQUFJLENBQUM3QixNQUFELEVBQWlCYSxLQUFqQixFQUFnQyxHQUFHQyxJQUFuQyxFQUErRDtBQUNqRSxRQUFJLEtBQUtoQixNQUFULEVBQWlCO0FBQ2YsYUFBT2dDLE9BQU8sQ0FBQ0MsTUFBUixDQUFlLElBQUlDLEtBQUosQ0FBVSxrQkFBVixDQUFmLENBQVA7QUFDRDs7QUFDRCxVQUFNeEIsSUFBSSxHQUFHO0FBQ1hLLE1BQUFBLEtBRFc7QUFFWEMsTUFBQUE7QUFGVyxLQUFiO0FBSUEsV0FBTyxJQUFJZ0IsT0FBSixDQUFZRyxPQUFPLElBQUlqQyxNQUFNLENBQUMwQixLQUFQLENBQWFYLElBQUksQ0FBQ21CLFNBQUwsQ0FBZTFCLElBQWYsQ0FBYixFQUFtQyxNQUFNeUIsT0FBTyxFQUFoRCxDQUF2QixDQUFQO0FBQ0Q7O0FBRURFLEVBQUFBLFNBQVMsQ0FBQ3RCLEtBQUQsRUFBZ0IsR0FBR0MsSUFBbkIsRUFBK0M7QUFDdEQsV0FBT2dCLE9BQU8sQ0FBQ00sR0FBUixDQUFZLEtBQUs5RCxPQUFMLENBQWErRCxHQUFiLENBQWlCckMsTUFBTSxJQUFJLEtBQUs2QixJQUFMLENBQVU3QixNQUFWLEVBQWtCYSxLQUFsQixFQUF5QixHQUFHQyxJQUE1QixDQUEzQixDQUFaLEVBQ0p3QixJQURJLENBQ0MsTUFBTSxDQUFFLENBRFQsQ0FBUDtBQUVEOztBQTlHNEI7O2VBNEhoQnZFLFMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmF0YVwiIHByb2plY3QuXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2Ugdmlld1xuICogdGhlIEVVTEEgZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKi9cblxuaW1wb3J0IG5ldCwgeyBTb2NrZXQsIFNlcnZlciB9IGZyb20gJ25ldCc7XG5pbXBvcnQgeyBEdXBsZXggfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHhwaXBlIGZyb20gJ3hwaXBlJztcblxuY29uc3QgZGVidWcgPSBkZWJ1Z0ZhY3RvcnkoJ25pYnVzOklQQ1NlcnZlcicpO1xuY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuXG5leHBvcnQgZW51bSBEaXJlY3Rpb24ge1xuICBpbixcbiAgb3V0LFxufVxuXG5pbnRlcmZhY2UgSVBDU2VydmVyIHtcbiAgb24oZXZlbnQ6ICdjb25uZWN0aW9uJywgbGlzdGVuZXI6IChzb2NrZXQ6IFNvY2tldCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY2xpZW50OmVycm9yJywgbGlzdGVuZXI6IChlcnI6IEVycm9yKSA9PiB2b2lkKTogdGhpcztcbiAgb24oZXZlbnQ6ICdyYXcnLCBsaXN0ZW5lcjogKGRhdGE6IEJ1ZmZlciwgZGlyOiBEaXJlY3Rpb24pID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogc3RyaW5nIHwgc3ltYm9sLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdGhpcztcblxuICBvbmNlKGV2ZW50OiAnY29ubmVjdGlvbicsIGxpc3RlbmVyOiAoc29ja2V0OiBTb2NrZXQpID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAncmF3JywgbGlzdGVuZXI6IChkYXRhOiBCdWZmZXIsIGRpcjogRGlyZWN0aW9uKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogc3RyaW5nIHwgc3ltYm9sLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKTogdGhpcztcblxuICBhZGRMaXN0ZW5lcihldmVudDogJ2Nvbm5lY3Rpb24nLCBsaXN0ZW5lcjogKHNvY2tldDogU29ja2V0KSA9PiB2b2lkKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdjbGllbnQ6ZXJyb3InLCBsaXN0ZW5lcjogKGVycjogRXJyb3IpID0+IHZvaWQpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3JhdycsIGxpc3RlbmVyOiAoZGF0YTogQnVmZmVyLCBkaXI6IERpcmVjdGlvbikgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiBzdHJpbmcgfCBzeW1ib2wsIGxpc3RlbmVyOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpOiB0aGlzO1xuXG4gIGVtaXQoZXZlbnQ6ICdjb25uZWN0aW9uJywgc29ja2V0OiBTb2NrZXQpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnY2xpZW50OmVycm9yJywgZXJyOiBFcnJvcik6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdyYXcnLCBkYXRhOiBCdWZmZXIsIGRpcjogRGlyZWN0aW9uKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogc3RyaW5nIHwgc3ltYm9sLCAuLi5hcmdzOiBhbnlbXSk6IGJvb2xlYW47XG59XG5cbmNsYXNzIElQQ1NlcnZlciBleHRlbmRzIER1cGxleCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgc2VydmVyOiBTZXJ2ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgY2xpZW50czogU29ja2V0W107XG4gIHByaXZhdGUgY2xvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZGluZyA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHBhdGg6IHN0cmluZywgcHJpdmF0ZSByZWFkb25seSByYXcgPSBmYWxzZSkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy5jbGllbnRzID0gW107XG4gICAgdGhpcy5zZXJ2ZXIgPSBuZXcgU2VydmVyKCk7XG4gICAgdGhpcy5zZXJ2ZXIgPSBuZXRcbiAgICAgIC5jcmVhdGVTZXJ2ZXIodGhpcy5jb25uZWN0aW9uSGFuZGxlcilcbiAgICAgIC5vbignZXJyb3InLCB0aGlzLmVycm9ySGFuZGxlcilcbiAgICAgIC5vbignY2xvc2UnLCB0aGlzLmNsb3NlKVxuICAgICAgLmxpc3Rlbih4cGlwZS5lcShwYXRoKSwgKCkgPT4ge1xuICAgICAgICBkZWJ1ZygnbGlzdGVuaW5nIG9uJywgdGhpcy5zZXJ2ZXIuYWRkcmVzcygpKTtcbiAgICAgIH0pO1xuICAgIHByb2Nlc3Mub24oJ1NJR0lOVCcsICgpID0+IHRoaXMuY2xvc2UoKSk7XG4gICAgcHJvY2Vzcy5vbignU0lHVEVSTScsICgpID0+IHRoaXMuY2xvc2UoKSk7XG4gIH1cblxuICBwcml2YXRlIGNvbm5lY3Rpb25IYW5kbGVyID0gKHNvY2tldDogU29ja2V0KSA9PiB7XG4gICAgdGhpcy5lbWl0KCdjb25uZWN0aW9uJywgc29ja2V0KTtcbiAgICB0aGlzLmNsaWVudHMucHVzaChzb2NrZXQpO1xuICAgIHNvY2tldFxuICAgICAgLm9uY2UoJ2Vycm9yJywgdGhpcy5jbGllbnRFcnJvckhhbmRsZXIuYmluZCh0aGlzLCBzb2NrZXQpKVxuICAgICAgLm9uKCdkYXRhJywgdGhpcy5jbGllbnREYXRhSGFuZGxlci5iaW5kKHRoaXMsIHNvY2tldCkpXG4gICAgICAub25jZSgnY2xvc2UnLCAoKSA9PiB0aGlzLnJlbW92ZUNsaWVudChzb2NrZXQpKTtcbiAgICBkZWJ1ZygnbmV3IGNvbm5lY3Rpb24gb24nLCB0aGlzLnBhdGgsIHRoaXMuY2xpZW50cy5sZW5ndGgpO1xuICB9O1xuXG4gIHByaXZhdGUgZXJyb3JIYW5kbGVyID0gKGVycjogRXJyb3IpID0+IHtcbiAgICBpZiAoKGVyciBhcyBhbnkpLmNvZGUgPT09ICdFQUREUklOVVNFJykge1xuICAgICAgY29uc3QgY2hlY2sgPSBuZXQuY29ubmVjdCh4cGlwZS5lcSh0aGlzLnBhdGgpLCAoKSA9PiB7XG4gICAgICAgIGRlYnVnKCdTZXJ2ZXIgcnVubmluZywgZ2l2aW5nIHVwLi4uJyk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgpO1xuICAgICAgfSk7XG4gICAgICBjaGVjay5vbmNlKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgIGlmICgoZSBhcyBhbnkpLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnKSB7XG4gICAgICAgICAgZnMudW5saW5rU3luYyh4cGlwZS5lcSh0aGlzLnBhdGgpKTtcbiAgICAgICAgICB0aGlzLnNlcnZlci5saXN0ZW4oeHBpcGUuZXEodGhpcy5wYXRoKSwgKCkgPT4ge1xuICAgICAgICAgICAgZGVidWcoJ3Jlc3RhcnQnLCB0aGlzLnNlcnZlci5hZGRyZXNzKCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfTtcblxuICBwcml2YXRlIGNsaWVudEVycm9ySGFuZGxlcihjbGllbnQ6IFNvY2tldCwgZXJyOiBFcnJvcikge1xuICAgIGRlYnVnKCdlcnJvciBvbiBjbGllbnQnLCBlcnIubWVzc2FnZSk7XG4gICAgdGhpcy5lbWl0KCdjbGllbnQ6ZXJyb3InLCBjbGllbnQsIGVycik7XG4gICAgdGhpcy5yZW1vdmVDbGllbnQoY2xpZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgY2xpZW50RGF0YUhhbmRsZXIoY2xpZW50OiBTb2NrZXQsIGRhdGE6IEJ1ZmZlcikge1xuICAgIC8vIGlmICh0aGlzLnJhaWUpIHtcbiAgICAvLyAgIGRlYnVnKHRoaXMucGF0aCwgcHJpbnRCdWZmZXIoZGF0YSkpO1xuICAgIC8vIH1cbiAgICBpZiAodGhpcy5yZWFkaW5nKSB7XG4gICAgICB0aGlzLnJlYWRpbmcgPSB0aGlzLnB1c2goZGF0YSk7XG4gICAgfVxuICAgIGlmICh0aGlzLnJhdykgIHtcbiAgICAgIHJldHVybiB0aGlzLmVtaXQoJ3JhdycsIGRhdGEsIERpcmVjdGlvbi5pbik7XG4gICAgfVxuICAgIGRlYnVnKCdkYXRhIGZyb20nLCBjbGllbnQucmVtb3RlQWRkcmVzcywgZGF0YS50b1N0cmluZygpKTtcbiAgICBjb25zdCB7IGV2ZW50LCBhcmdzIH0gPSBKU09OLnBhcnNlKGRhdGEudG9TdHJpbmcoKSk7XG4gICAgdGhpcy5lbWl0KGBjbGllbnQ6JHtldmVudH1gLCBjbGllbnQsIC4uLmFyZ3MpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVDbGllbnQoY2xpZW50OiBTb2NrZXQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuY2xpZW50cy5maW5kSW5kZXgoaXRlbSA9PiBpdGVtID09PSBjbGllbnQpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMuY2xpZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICBjbGllbnQuZGVzdHJveSgpO1xuICAgIGRlYnVnKCdkZXN0cm95IGNvbm5lY3Rpb24gb24nLCB0aGlzLnBhdGgsIHRoaXMuY2xpZW50cy5sZW5ndGgpO1xuICB9XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmZ1bmN0aW9uLW5hbWVcbiAgX3dyaXRlKGNodW5rOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyb3I/OiAoRXJyb3IgfCBudWxsKSkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgncmF3JywgY2h1bmsgYXMgQnVmZmVyLCBEaXJlY3Rpb24ub3V0KTtcbiAgICB0aGlzLmNsaWVudHMuZm9yRWFjaChjbGllbnQgPT4gY2xpZW50LndyaXRlKGNodW5rLCBlbmNvZGluZywgbm9vcCkpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH1cblxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6ZnVuY3Rpb24tbmFtZVxuICBfcmVhZChzaXplOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLnJlYWRpbmcgPSB0cnVlO1xuICB9XG5cbiAgcHVibGljIGdldCBwYXRoKCkge1xuICAgIHJldHVybiAodGhpcy5zZXJ2ZXIuYWRkcmVzcygpIHx8ICcnKS50b1N0cmluZygpO1xuICB9XG5cbiAgc2VuZChjbGllbnQ6IFNvY2tldCwgZXZlbnQ6IHN0cmluZywgLi4uYXJnczogYW55W10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1NlcnZlciBpcyBjbG9zZWQnKSk7XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICBldmVudCxcbiAgICAgIGFyZ3MsXG4gICAgfTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBjbGllbnQud3JpdGUoSlNPTi5zdHJpbmdpZnkoZGF0YSksICgpID0+IHJlc29sdmUoKSkpO1xuICB9XG5cbiAgYnJvYWRjYXN0KGV2ZW50OiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRoaXMuY2xpZW50cy5tYXAoY2xpZW50ID0+IHRoaXMuc2VuZChjbGllbnQsIGV2ZW50LCAuLi5hcmdzKSkpXG4gICAgICAudGhlbigoKSA9PiB7fSk7XG4gIH1cblxuICBjbG9zZSA9ICgpID0+IHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHJldHVybjtcbiAgICBjb25zdCBwYXRoID0gdGhpcy5zZXJ2ZXIuYWRkcmVzcygpO1xuICAgIHRoaXMuY2xpZW50cy5mb3JFYWNoKGNsaWVudCA9PiBjbGllbnQuZGVzdHJveSgpKTtcbiAgICB0aGlzLmNsaWVudHMubGVuZ3RoID0gMDtcbiAgICB0aGlzLnNlcnZlci5jbG9zZSgpO1xuICAgIHRoaXMucmF3ICYmIHRoaXMucHVzaChudWxsKTtcbiAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgZGVidWcoYCR7cGF0aH0gY2xvc2VkYCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IElQQ1NlcnZlcjtcbiJdfQ==