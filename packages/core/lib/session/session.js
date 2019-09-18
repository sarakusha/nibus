"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.delay = void 0;

require("source-map-support/register");

var _debug = _interopRequireDefault(require("debug"));

var _events = require("events");

var _lodash = _interopRequireDefault(require("lodash"));

var _fs = _interopRequireDefault(require("fs"));

var _Address = _interopRequireWildcard(require("../Address"));

var _ipc = require("../ipc");

var _mib = require("../mib");

var _devices = require("../mib/devices");

var _nibus = require("../nibus");

var _nms = require("../nms");

var _common = require("./common");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const debug = (0, _debug.default)('nibus:session');

const noop = () => {};

const delay = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000));

exports.delay = delay;

class NibusSession extends _events.EventEmitter {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "connections", []);

    _defineProperty(this, "isStarted", false);

    _defineProperty(this, "socket", void 0);

    _defineProperty(this, "reloadHandler", ports => {
      const prev = this.connections.splice(0, this.connections.length);
      ports.forEach(port => {
        const {
          portInfo: {
            comName
          }
        } = port;

        const index = _lodash.default.findIndex(prev, {
          path: comName
        });

        if (index !== -1) {
          this.connections.push(prev.splice(index, 1)[0]);
        } else {
          this.addHandler(port);
        }
      });
      prev.forEach(connection => this.closeConnection(connection));
    });

    _defineProperty(this, "addHandler", async ({
      portInfo: {
        comName
      },
      description
    }) => {
      debug('add');
      const connection = new _nibus.NibusConnection(comName, description);
      this.connections.push(connection);
      this.emit('add', connection);
      if (process.platform === 'win32') await delay(2);
      this.find(connection);

      _mib.devices.get().filter(device => device.connection == null).reduce(async (promise, device) => {
        await promise;
        debug('start ping');
        const time = await connection.ping(device.address);
        debug(`ping ${time}`);

        if (time !== -1) {
          device.connection = connection;
          /**
           * New connected device
           * @event NibusSession#connected
           * @type IDevice
           */

          this.emit('connected', device); // device.emit('connected');

          debug(`mib-device ${device.address} was connected`);
        }
      }, Promise.resolve()).catch(noop);
    });

    _defineProperty(this, "removeHandler", ({
      portInfo: {
        comName
      }
    }) => {
      const index = this.connections.findIndex(({
        path
      }) => comName === path);

      if (index !== -1) {
        const [connection] = this.connections.splice(index, 1);
        this.closeConnection(connection);
      }
    });
  }

  closeConnection(connection) {
    connection.close();

    _mib.devices.get().filter(device => device.connection === connection).forEach(device => {
      device.connection = undefined;
      this.emit('disconnected', device);
      debug(`mib-device ${connection.path}#${device.address} was disconnected`);
    });

    this.emit('remove', connection);
  }

  find(connection) {
    const {
      description
    } = connection;
    const descriptions = Array.isArray(description.select) ? description.select : [description];
    const baseCategory = Array.isArray(description.select) ? description.category : null;
    descriptions.forEach(descr => {
      const {
        category
      } = descr;

      switch (descr.find) {
        case 'sarp':
          {
            let {
              type
            } = descr;

            if (type === undefined) {
              const mib = JSON.parse(_fs.default.readFileSync((0, _devices.getMibFile)(descr.mib)).toString());
              const {
                types
              } = mib;
              const device = types[mib.device];
              type = (0, _mib.toInt)(device.appinfo.device_type);
            }

            connection.once('sarp', sarpDatagram => {
              if (baseCategory && connection.description.category !== baseCategory) return;

              if (baseCategory && connection.description.category === baseCategory) {
                debug(`category was changed: ${connection.description.category} => ${category}`);
                connection.description = descr;
              }

              const address = new _Address.default(sarpDatagram.mac);
              debug(`device ${category}[${address}] was found on ${connection.path}`);
              this.emit('found', {
                connection,
                category,
                address
              });
            });
            connection.findByType(type).catch(noop);
            break;
          }

        case 'version':
          connection.sendDatagram((0, _nms.createNmsRead)(_Address.default.empty, 2)).then(datagram => {
            if (!datagram || Array.isArray(datagram)) return;

            if (connection.description.category === 'ftdi') {
              debug(`category was changed: ${connection.description.category} => ${category}`);
              connection.description = descr;
            }

            const address = new _Address.default(datagram.source.mac);
            this.emit('found', {
              connection,
              category,
              address
            });
            debug(`device ${category}[${address}] was found on ${connection.path}`);
          }, () => {
            this.emit('pureConnection', connection);
          });
          break;

        default:
          this.emit('pureConnection', connection);
          break;
      }
    });
  } // public async start(watch = true) {
  //   if (this.isStarted) return;
  //   const { detection } = detector;
  //   if (detection == null) throw new Error('detection is N/A');
  //   detector.on('add', this.addHandler);
  //   detector.on('remove', this.removeHandler);
  //   await detector.getPorts();
  //
  //   if (watch) detector.start();
  //   this.isStarted = true;
  //   process.once('SIGINT', () => this.stop());
  //   process.once('SIGTERM', () => this.stop());
  //   /**
  //    * @event NibusService#start
  //    */
  //   this.emit('start');
  //   debug('started');
  // }
  //


  start() {
    return new Promise((resolve, reject) => {
      if (this.isStarted) return resolve(this.connections.length);
      this.isStarted = true;
      this.socket = _ipc.Client.connect(_common.PATH);
      this.socket.once('error', error => {
        console.error('error while start nibus.service', error.message);
        this.close();
        reject(error);
      });
      this.socket.on('ports', this.reloadHandler);
      this.socket.on('add', this.addHandler);
      this.socket.on('remove', this.removeHandler);
      this.socket.once('ports', ports => {
        resolve(ports.length);
        this.emit('start');
      });
      this.socket.once('close', () => this.close());
    });
  } // tslint:disable-next-line:function-name


  _connectDevice(device, connection) {
    if (device.connection === connection) return;
    device.connection = connection;
    const event = connection ? 'connected' : 'disconnected';
    process.nextTick(() => this.emit(event, device)); // device.emit('connected');

    debug(`mib-device [${device.address}] was ${event}`);
  }

  close() {
    if (!this.isStarted) return;
    this.isStarted = false;
    debug('close');
    /**
     * @event NibusSession#close
     */

    this.emit('close'); // detector.stop();

    this.connections.splice(0, this.connections.length).forEach(connection => this.closeConnection(connection));
    this.socket && this.socket.destroy(); // this.removeAllListeners();
  } //


  async pingDevice(device) {
    const {
      connections
    } = this;

    if (device.connection && connections.includes(device.connection)) {
      const timeout = await device.connection.ping(device.address);
      if (timeout !== -1) return timeout;
      device.connection = undefined;
      this.emit('disconnected', device); // device.emit('disconnected');
    }

    const mib = Reflect.getMetadata('mib', device);

    const occupied = _mib.devices.get().map(device => device.connection).filter(connection => connection != null && !connection.description.link);

    const acceptables = _lodash.default.difference(connections, occupied).filter(({
      description
    }) => description.link || description.mib === mib);

    if (acceptables.length === 0) return -1;
    const [timeout, connection] = await Promise.race(acceptables.map(connection => connection.ping(device.address).then(t => [t, connection])));

    if (timeout === -1) {
      // ping(acceptables[0], device.address);
      return -1;
    }

    this._connectDevice(device, connection);

    return timeout;
  }

  async ping(address) {
    const {
      connections
    } = this;
    const addr = new _Address.default(address);
    if (connections.length === 0) return Promise.resolve(-1);
    return Promise.race(connections.map(connection => connection.ping(addr)));
  }

  get ports() {
    return this.connections.length;
  }

}

const session = new NibusSession();

_mib.devices.on('new', device => {
  if (!device.connection) {
    session.pingDevice(device).catch(noop);
  }
});

_mib.devices.on('delete', device => {
  if (device.connection) {
    device.connection = undefined;
    session.emit('disconnected', device); // device.emit('disconnected');
  }
});

session.on('found', ({
  address,
  connection
}) => {
  console.assert(address.type === _Address.AddressType.mac || address.type === 'empty', 'mac-address expected');

  const devs = _mib.devices.find(address);

  if (devs && devs.length === 1) {
    session._connectDevice(devs[0], connection);
  }
});
process.on('SIGINT', () => session.close());
process.on('SIGTERM', () => session.close());
var _default = session;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXNzaW9uL3Nlc3Npb24udHMiXSwibmFtZXMiOlsiZGVidWciLCJub29wIiwiZGVsYXkiLCJzZWNvbmRzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJzZXRUaW1lb3V0IiwiTmlidXNTZXNzaW9uIiwiRXZlbnRFbWl0dGVyIiwicG9ydHMiLCJwcmV2IiwiY29ubmVjdGlvbnMiLCJzcGxpY2UiLCJsZW5ndGgiLCJmb3JFYWNoIiwicG9ydCIsInBvcnRJbmZvIiwiY29tTmFtZSIsImluZGV4IiwiXyIsImZpbmRJbmRleCIsInBhdGgiLCJwdXNoIiwiYWRkSGFuZGxlciIsImNvbm5lY3Rpb24iLCJjbG9zZUNvbm5lY3Rpb24iLCJkZXNjcmlwdGlvbiIsIk5pYnVzQ29ubmVjdGlvbiIsImVtaXQiLCJwcm9jZXNzIiwicGxhdGZvcm0iLCJmaW5kIiwiZGV2aWNlcyIsImdldCIsImZpbHRlciIsImRldmljZSIsInJlZHVjZSIsInByb21pc2UiLCJ0aW1lIiwicGluZyIsImFkZHJlc3MiLCJjYXRjaCIsImNsb3NlIiwidW5kZWZpbmVkIiwiZGVzY3JpcHRpb25zIiwiQXJyYXkiLCJpc0FycmF5Iiwic2VsZWN0IiwiYmFzZUNhdGVnb3J5IiwiY2F0ZWdvcnkiLCJkZXNjciIsInR5cGUiLCJtaWIiLCJKU09OIiwicGFyc2UiLCJmcyIsInJlYWRGaWxlU3luYyIsInRvU3RyaW5nIiwidHlwZXMiLCJhcHBpbmZvIiwiZGV2aWNlX3R5cGUiLCJvbmNlIiwic2FycERhdGFncmFtIiwiQWRkcmVzcyIsIm1hYyIsImZpbmRCeVR5cGUiLCJzZW5kRGF0YWdyYW0iLCJlbXB0eSIsInRoZW4iLCJkYXRhZ3JhbSIsInNvdXJjZSIsInN0YXJ0IiwicmVqZWN0IiwiaXNTdGFydGVkIiwic29ja2V0IiwiQ2xpZW50IiwiY29ubmVjdCIsIlBBVEgiLCJlcnJvciIsImNvbnNvbGUiLCJtZXNzYWdlIiwib24iLCJyZWxvYWRIYW5kbGVyIiwicmVtb3ZlSGFuZGxlciIsIl9jb25uZWN0RGV2aWNlIiwiZXZlbnQiLCJuZXh0VGljayIsImRlc3Ryb3kiLCJwaW5nRGV2aWNlIiwiaW5jbHVkZXMiLCJ0aW1lb3V0IiwiUmVmbGVjdCIsImdldE1ldGFkYXRhIiwib2NjdXBpZWQiLCJtYXAiLCJsaW5rIiwiYWNjZXB0YWJsZXMiLCJkaWZmZXJlbmNlIiwicmFjZSIsInQiLCJhZGRyIiwic2Vzc2lvbiIsImFzc2VydCIsIkFkZHJlc3NUeXBlIiwiZGV2cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBVUE7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBRUE7Ozs7Ozs7Ozs7QUFHQSxNQUFNQSxLQUFLLEdBQUcsb0JBQWEsZUFBYixDQUFkOztBQUNBLE1BQU1DLElBQUksR0FBRyxNQUFNLENBQUUsQ0FBckI7O0FBQ08sTUFBTUMsS0FBSyxHQUFJQyxPQUFELElBQ25CLElBQUlDLE9BQUosQ0FBWUMsT0FBTyxJQUFJQyxVQUFVLENBQUNELE9BQUQsRUFBVUYsT0FBTyxHQUFHLElBQXBCLENBQWpDLENBREs7Ozs7QUFnQ1AsTUFBTUksWUFBTixTQUEyQkMsb0JBQTNCLENBQXdDO0FBQUE7QUFBQTs7QUFBQSx5Q0FDWSxFQURaOztBQUFBLHVDQUVsQixLQUZrQjs7QUFBQTs7QUFBQSwyQ0FLYkMsS0FBRCxJQUF1QjtBQUM3QyxZQUFNQyxJQUFJLEdBQUcsS0FBS0MsV0FBTCxDQUFpQkMsTUFBakIsQ0FBd0IsQ0FBeEIsRUFBMkIsS0FBS0QsV0FBTCxDQUFpQkUsTUFBNUMsQ0FBYjtBQUNBSixNQUFBQSxLQUFLLENBQUNLLE9BQU4sQ0FBZUMsSUFBRCxJQUFVO0FBQ3RCLGNBQU07QUFBRUMsVUFBQUEsUUFBUSxFQUFFO0FBQUVDLFlBQUFBO0FBQUY7QUFBWixZQUE0QkYsSUFBbEM7O0FBQ0EsY0FBTUcsS0FBSyxHQUFHQyxnQkFBRUMsU0FBRixDQUFZVixJQUFaLEVBQWtCO0FBQUVXLFVBQUFBLElBQUksRUFBRUo7QUFBUixTQUFsQixD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QU8sQ0FBQ1csSUFBUixLQUFpQm9ELHFCQUFZdkMsR0FBN0IsSUFBb0N4QixPQUFPLENBQUNXLElBQVIsS0FBaUIsT0FEdkQsRUFFRSxzQkFGRjs7QUFJQSxRQUFNcUQsSUFBSSxHQUFHeEUsYUFBUUQsSUFBUixDQUFhUyxPQUFiLENBQWI7O0FBQ0EsTUFBSWdFLElBQUksSUFBSUEsSUFBSSxDQUFDM0YsTUFBTCxLQUFnQixDQUE1QixFQUErQjtBQUM3QndGLElBQUFBLE9BQU8sQ0FBQ2pCLGNBQVIsQ0FBdUJvQixJQUFJLENBQUMsQ0FBRCxDQUEzQixFQUFnQ2hGLFVBQWhDO0FBQ0Q7QUFDRixDQVREO0FBV0FLLE9BQU8sQ0FBQ29ELEVBQVIsQ0FBVyxRQUFYLEVBQXFCLE1BQU1vQixPQUFPLENBQUMzRCxLQUFSLEVBQTNCO0FBQ0FiLE9BQU8sQ0FBQ29ELEVBQVIsQ0FBVyxTQUFYLEVBQXNCLE1BQU1vQixPQUFPLENBQUMzRCxLQUFSLEVBQTVCO2VBRWUyRCxPIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE9PTyBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG5pbXBvcnQgZGVidWdGYWN0b3J5IGZyb20gJ2RlYnVnJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAnbmV0JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgQWRkcmVzcywgeyBBZGRyZXNzUGFyYW0sIEFkZHJlc3NUeXBlIH0gZnJvbSAnLi4vQWRkcmVzcyc7XG5pbXBvcnQgeyBDbGllbnQsIElQb3J0QXJnIH0gZnJvbSAnLi4vaXBjJztcbmltcG9ydCB7IGRldmljZXMsIElEZXZpY2UsIHRvSW50IH0gZnJvbSAnLi4vbWliJztcbmltcG9ydCB7IGdldE1pYkZpbGUsIElNaWJEZXZpY2VUeXBlIH0gZnJvbSAnLi4vbWliL2RldmljZXMnO1xuaW1wb3J0IHsgTmlidXNDb25uZWN0aW9uIH0gZnJvbSAnLi4vbmlidXMnO1xuaW1wb3J0IHsgY3JlYXRlTm1zUmVhZCB9IGZyb20gJy4uL25tcyc7XG5pbXBvcnQgU2FycERhdGFncmFtIGZyb20gJy4uL3NhcnAvU2FycERhdGFncmFtJztcbmltcG9ydCB7IFBBVEggfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgeyBDYXRlZ29yeSB9IGZyb20gJy4vS25vd25Qb3J0cyc7XG5cbmNvbnN0IGRlYnVnID0gZGVidWdGYWN0b3J5KCduaWJ1czpzZXNzaW9uJyk7XG5jb25zdCBub29wID0gKCkgPT4ge307XG5leHBvcnQgY29uc3QgZGVsYXkgPSAoc2Vjb25kczogbnVtYmVyKSA9PlxuICBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgc2Vjb25kcyAqIDEwMDApKTtcblxuZXhwb3J0IHR5cGUgRm91bmRMaXN0ZW5lciA9XG4gIChhcmc6IHsgY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uLCBjYXRlZ29yeTogQ2F0ZWdvcnksIGFkZHJlc3M6IEFkZHJlc3MgfSkgPT4gdm9pZDtcblxuZXhwb3J0IHR5cGUgQ29ubmVjdGlvbkxpc3RlbmVyID0gKGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbikgPT4gdm9pZDtcbmV4cG9ydCB0eXBlIERldmljZUxpc3RlbmVyID0gKGRldmljZTogSURldmljZSkgPT4gdm9pZDtcblxuZGVjbGFyZSBpbnRlcmZhY2UgTmlidXNTZXNzaW9uIHtcbiAgb24oZXZlbnQ6ICdzdGFydCcgfCAnY2xvc2UnLCBsaXN0ZW5lcjogRnVuY3Rpb24pOiB0aGlzO1xuICBvbihldmVudDogJ2ZvdW5kJywgbGlzdGVuZXI6IEZvdW5kTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2FkZCcgfCAncmVtb3ZlJywgbGlzdGVuZXI6IENvbm5lY3Rpb25MaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogRGV2aWNlTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3B1cmVDb25uZWN0aW9uJywgbGlzdGVuZXI6IChjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnc3RhcnQnIHwgJ2Nsb3NlJywgbGlzdGVuZXI6IEZ1bmN0aW9uKTogdGhpcztcbiAgb25jZShldmVudDogJ2ZvdW5kJywgbGlzdGVuZXI6IEZvdW5kTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnYWRkJyB8ICdyZW1vdmUnLCBsaXN0ZW5lcjogQ29ubmVjdGlvbkxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6IERldmljZUxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3B1cmVDb25uZWN0aW9uJywgbGlzdGVuZXI6IChjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pID0+IHZvaWQpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdzdGFydCcgfCAnY2xvc2UnLCBsaXN0ZW5lcjogRnVuY3Rpb24pOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdmb3VuZCcsIGxpc3RlbmVyOiBGb3VuZExpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnYWRkJyB8ICdyZW1vdmUnLCBsaXN0ZW5lcjogQ29ubmVjdGlvbkxpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogRGV2aWNlTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdwdXJlQ29ubmVjdGlvbicsIGxpc3RlbmVyOiAoY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uKSA9PiB2b2lkKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdzdGFydCcgfCAnY2xvc2UnLCBsaXN0ZW5lcjogRnVuY3Rpb24pOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2ZvdW5kJywgbGlzdGVuZXI6IEZvdW5kTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2FkZCcgfCAncmVtb3ZlJywgbGlzdGVuZXI6IENvbm5lY3Rpb25MaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogRGV2aWNlTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3B1cmVDb25uZWN0aW9uJywgbGlzdGVuZXI6IChjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pID0+IHZvaWQpOiB0aGlzO1xufVxuXG5jbGFzcyBOaWJ1c1Nlc3Npb24gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IGNvbm5lY3Rpb25zOiBOaWJ1c0Nvbm5lY3Rpb25bXSA9IFtdO1xuICBwcml2YXRlIGlzU3RhcnRlZCA9IGZhbHNlO1xuICBwcml2YXRlIHNvY2tldD86IFNvY2tldDsgLy8gPSBDbGllbnQuY29ubmVjdChQQVRIKTtcblxuICBwcml2YXRlIHJlbG9hZEhhbmRsZXIgPSAocG9ydHM6IElQb3J0QXJnW10pID0+IHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5jb25uZWN0aW9ucy5zcGxpY2UoMCwgdGhpcy5jb25uZWN0aW9ucy5sZW5ndGgpO1xuICAgIHBvcnRzLmZvckVhY2goKHBvcnQpID0+IHtcbiAgICAgIGNvbnN0IHsgcG9ydEluZm86IHsgY29tTmFtZSB9IH0gPSBwb3J0O1xuICAgICAgY29uc3QgaW5kZXggPSBfLmZpbmRJbmRleChwcmV2LCB7IHBhdGg6IGNvbU5hbWUgfSk7XG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvbnMucHVzaChwcmV2LnNwbGljZShpbmRleCwgMSlbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hZGRIYW5kbGVyKHBvcnQpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHByZXYuZm9yRWFjaChjb25uZWN0aW9uID0+IHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5lY3Rpb24pKTtcbiAgfTtcblxuICBwcml2YXRlIGFkZEhhbmRsZXIgPSBhc3luYyAoeyBwb3J0SW5mbzogeyBjb21OYW1lIH0sIGRlc2NyaXB0aW9uIH06IElQb3J0QXJnKSA9PiB7XG4gICAgZGVidWcoJ2FkZCcpO1xuICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgTmlidXNDb25uZWN0aW9uKGNvbU5hbWUsIGRlc2NyaXB0aW9uKTtcbiAgICB0aGlzLmNvbm5lY3Rpb25zLnB1c2goY29ubmVjdGlvbik7XG4gICAgdGhpcy5lbWl0KCdhZGQnLCBjb25uZWN0aW9uKTtcbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykgYXdhaXQgZGVsYXkoMik7XG4gICAgdGhpcy5maW5kKGNvbm5lY3Rpb24pO1xuICAgIGRldmljZXMuZ2V0KClcbiAgICAgIC5maWx0ZXIoZGV2aWNlID0+IGRldmljZS5jb25uZWN0aW9uID09IG51bGwpXG4gICAgICAucmVkdWNlKGFzeW5jIChwcm9taXNlLCBkZXZpY2UpID0+IHtcbiAgICAgICAgYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgZGVidWcoJ3N0YXJ0IHBpbmcnKTtcbiAgICAgICAgY29uc3QgdGltZSA9IGF3YWl0IGNvbm5lY3Rpb24ucGluZyhkZXZpY2UuYWRkcmVzcyk7XG4gICAgICAgIGRlYnVnKGBwaW5nICR7dGltZX1gKTtcbiAgICAgICAgaWYgKHRpbWUgIT09IC0xKSB7XG4gICAgICAgICAgZGV2aWNlLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIE5ldyBjb25uZWN0ZWQgZGV2aWNlXG4gICAgICAgICAgICogQGV2ZW50IE5pYnVzU2Vzc2lvbiNjb25uZWN0ZWRcbiAgICAgICAgICAgKiBAdHlwZSBJRGV2aWNlXG4gICAgICAgICAgICovXG4gICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0ZWQnLCBkZXZpY2UpO1xuICAgICAgICAgIC8vIGRldmljZS5lbWl0KCdjb25uZWN0ZWQnKTtcbiAgICAgICAgICBkZWJ1ZyhgbWliLWRldmljZSAke2RldmljZS5hZGRyZXNzfSB3YXMgY29ubmVjdGVkYCk7XG4gICAgICAgIH1cbiAgICAgIH0sIFByb21pc2UucmVzb2x2ZSgpKVxuICAgICAgLmNhdGNoKG5vb3ApO1xuICB9O1xuXG4gIHByaXZhdGUgY2xvc2VDb25uZWN0aW9uKGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbikge1xuICAgIGNvbm5lY3Rpb24uY2xvc2UoKTtcbiAgICBkZXZpY2VzLmdldCgpXG4gICAgICAuZmlsdGVyKGRldmljZSA9PiBkZXZpY2UuY29ubmVjdGlvbiA9PT0gY29ubmVjdGlvbilcbiAgICAgIC5mb3JFYWNoKChkZXZpY2UpID0+IHtcbiAgICAgICAgZGV2aWNlLmNvbm5lY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZW1pdCgnZGlzY29ubmVjdGVkJywgZGV2aWNlKTtcbiAgICAgICAgZGVidWcoYG1pYi1kZXZpY2UgJHtjb25uZWN0aW9uLnBhdGh9IyR7ZGV2aWNlLmFkZHJlc3N9IHdhcyBkaXNjb25uZWN0ZWRgKTtcbiAgICAgIH0pO1xuICAgIHRoaXMuZW1pdCgncmVtb3ZlJywgY29ubmVjdGlvbik7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZUhhbmRsZXIgPSAoeyBwb3J0SW5mbzogeyBjb21OYW1lIH0gfTogSVBvcnRBcmcpID0+IHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuY29ubmVjdGlvbnMuZmluZEluZGV4KCh7IHBhdGggfSkgPT4gY29tTmFtZSA9PT0gcGF0aCk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgY29uc3QgW2Nvbm5lY3Rpb25dID0gdGhpcy5jb25uZWN0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oY29ubmVjdGlvbik7XG4gICAgfVxuICB9O1xuXG4gIHByaXZhdGUgZmluZChjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pIHtcbiAgICBjb25zdCB7IGRlc2NyaXB0aW9uIH0gPSBjb25uZWN0aW9uO1xuICAgIGNvbnN0IGRlc2NyaXB0aW9ucyA9IEFycmF5LmlzQXJyYXkoZGVzY3JpcHRpb24uc2VsZWN0KSA/IGRlc2NyaXB0aW9uLnNlbGVjdCA6IFtkZXNjcmlwdGlvbl07XG4gICAgY29uc3QgYmFzZUNhdGVnb3J5ID0gQXJyYXkuaXNBcnJheShkZXNjcmlwdGlvbi5zZWxlY3QpID8gZGVzY3JpcHRpb24uY2F0ZWdvcnkgOiBudWxsO1xuICAgIGRlc2NyaXB0aW9ucy5mb3JFYWNoKChkZXNjcikgPT4ge1xuICAgICAgY29uc3QgeyBjYXRlZ29yeSB9ID0gZGVzY3I7XG4gICAgICBzd2l0Y2ggKGRlc2NyLmZpbmQpIHtcbiAgICAgICAgY2FzZSAnc2FycCc6IHtcbiAgICAgICAgICBsZXQgeyB0eXBlIH0gPSBkZXNjcjtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBtaWIgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhnZXRNaWJGaWxlKGRlc2NyLm1pYiEpKS50b1N0cmluZygpKTtcbiAgICAgICAgICAgIGNvbnN0IHsgdHlwZXMgfSA9IG1pYjtcbiAgICAgICAgICAgIGNvbnN0IGRldmljZSA9IHR5cGVzW21pYi5kZXZpY2VdIGFzIElNaWJEZXZpY2VUeXBlO1xuICAgICAgICAgICAgdHlwZSA9IHRvSW50KGRldmljZS5hcHBpbmZvLmRldmljZV90eXBlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29ubmVjdGlvbi5vbmNlKCdzYXJwJywgKHNhcnBEYXRhZ3JhbTogU2FycERhdGFncmFtKSA9PiB7XG4gICAgICAgICAgICBpZiAoYmFzZUNhdGVnb3J5ICYmIGNvbm5lY3Rpb24uZGVzY3JpcHRpb24uY2F0ZWdvcnkgIT09IGJhc2VDYXRlZ29yeSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKGJhc2VDYXRlZ29yeSAmJiBjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmNhdGVnb3J5ID09PSBiYXNlQ2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgZGVidWcoYGNhdGVnb3J5IHdhcyBjaGFuZ2VkOiAke2Nvbm5lY3Rpb24uZGVzY3JpcHRpb24uY2F0ZWdvcnl9ID0+ICR7Y2F0ZWdvcnl9YCk7XG4gICAgICAgICAgICAgIGNvbm5lY3Rpb24uZGVzY3JpcHRpb24gPSBkZXNjcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3MgPSBuZXcgQWRkcmVzcyhzYXJwRGF0YWdyYW0ubWFjKTtcbiAgICAgICAgICAgIGRlYnVnKGBkZXZpY2UgJHtjYXRlZ29yeX1bJHthZGRyZXNzfV0gd2FzIGZvdW5kIG9uICR7Y29ubmVjdGlvbi5wYXRofWApO1xuICAgICAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgICAnZm91bmQnLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbixcbiAgICAgICAgICAgICAgICBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBhZGRyZXNzLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjb25uZWN0aW9uLmZpbmRCeVR5cGUodHlwZSkuY2F0Y2gobm9vcCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAndmVyc2lvbic6XG4gICAgICAgICAgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oY3JlYXRlTm1zUmVhZChBZGRyZXNzLmVtcHR5LCAyKSlcbiAgICAgICAgICAgIC50aGVuKFxuICAgICAgICAgICAgICAoZGF0YWdyYW0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWRhdGFncmFtIHx8IEFycmF5LmlzQXJyYXkoZGF0YWdyYW0pKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKGNvbm5lY3Rpb24uZGVzY3JpcHRpb24uY2F0ZWdvcnkgPT09ICdmdGRpJykge1xuICAgICAgICAgICAgICAgICAgZGVidWcoYGNhdGVnb3J5IHdhcyBjaGFuZ2VkOiAke2Nvbm5lY3Rpb24uZGVzY3JpcHRpb24uY2F0ZWdvcnl9ID0+ICR7Y2F0ZWdvcnl9YCk7XG4gICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLmRlc2NyaXB0aW9uID0gZGVzY3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGFkZHJlc3MgPSBuZXcgQWRkcmVzcyhkYXRhZ3JhbS5zb3VyY2UubWFjKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgICAgICAgICAnZm91bmQnLFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBkZWJ1ZyhgZGV2aWNlICR7Y2F0ZWdvcnl9WyR7YWRkcmVzc31dIHdhcyBmb3VuZCBvbiAke2Nvbm5lY3Rpb24ucGF0aH1gKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgncHVyZUNvbm5lY3Rpb24nLCBjb25uZWN0aW9uKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhpcy5lbWl0KCdwdXJlQ29ubmVjdGlvbicsIGNvbm5lY3Rpb24pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gcHVibGljIGFzeW5jIHN0YXJ0KHdhdGNoID0gdHJ1ZSkge1xuICAvLyAgIGlmICh0aGlzLmlzU3RhcnRlZCkgcmV0dXJuO1xuICAvLyAgIGNvbnN0IHsgZGV0ZWN0aW9uIH0gPSBkZXRlY3RvcjtcbiAgLy8gICBpZiAoZGV0ZWN0aW9uID09IG51bGwpIHRocm93IG5ldyBFcnJvcignZGV0ZWN0aW9uIGlzIE4vQScpO1xuICAvLyAgIGRldGVjdG9yLm9uKCdhZGQnLCB0aGlzLmFkZEhhbmRsZXIpO1xuICAvLyAgIGRldGVjdG9yLm9uKCdyZW1vdmUnLCB0aGlzLnJlbW92ZUhhbmRsZXIpO1xuICAvLyAgIGF3YWl0IGRldGVjdG9yLmdldFBvcnRzKCk7XG4gIC8vXG4gIC8vICAgaWYgKHdhdGNoKSBkZXRlY3Rvci5zdGFydCgpO1xuICAvLyAgIHRoaXMuaXNTdGFydGVkID0gdHJ1ZTtcbiAgLy8gICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsICgpID0+IHRoaXMuc3RvcCgpKTtcbiAgLy8gICBwcm9jZXNzLm9uY2UoJ1NJR1RFUk0nLCAoKSA9PiB0aGlzLnN0b3AoKSk7XG4gIC8vICAgLyoqXG4gIC8vICAgICogQGV2ZW50IE5pYnVzU2VydmljZSNzdGFydFxuICAvLyAgICAqL1xuICAvLyAgIHRoaXMuZW1pdCgnc3RhcnQnKTtcbiAgLy8gICBkZWJ1Zygnc3RhcnRlZCcpO1xuICAvLyB9XG4gIC8vXG4gIHN0YXJ0KCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzU3RhcnRlZCkgcmV0dXJuIHJlc29sdmUodGhpcy5jb25uZWN0aW9ucy5sZW5ndGgpO1xuICAgICAgdGhpcy5pc1N0YXJ0ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5zb2NrZXQgPSBDbGllbnQuY29ubmVjdChQQVRIKTtcbiAgICAgIHRoaXMuc29ja2V0Lm9uY2UoJ2Vycm9yJywgKGVycm9yKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Vycm9yIHdoaWxlIHN0YXJ0IG5pYnVzLnNlcnZpY2UnLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnNvY2tldC5vbigncG9ydHMnLCB0aGlzLnJlbG9hZEhhbmRsZXIpO1xuICAgICAgdGhpcy5zb2NrZXQub24oJ2FkZCcsIHRoaXMuYWRkSGFuZGxlcik7XG4gICAgICB0aGlzLnNvY2tldC5vbigncmVtb3ZlJywgdGhpcy5yZW1vdmVIYW5kbGVyKTtcbiAgICAgIHRoaXMuc29ja2V0Lm9uY2UoJ3BvcnRzJywgKHBvcnRzKSA9PiB7XG4gICAgICAgIHJlc29sdmUocG9ydHMubGVuZ3RoKTtcbiAgICAgICAgdGhpcy5lbWl0KCdzdGFydCcpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnNvY2tldC5vbmNlKCdjbG9zZScsICgpID0+IHRoaXMuY2xvc2UoKSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6ZnVuY3Rpb24tbmFtZVxuICBfY29ubmVjdERldmljZShkZXZpY2U6IElEZXZpY2UsIGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbikge1xuICAgIGlmIChkZXZpY2UuY29ubmVjdGlvbiA9PT0gY29ubmVjdGlvbikgcmV0dXJuO1xuICAgIGRldmljZS5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICBjb25zdCBldmVudCA9IGNvbm5lY3Rpb24gPyAnY29ubmVjdGVkJyA6ICdkaXNjb25uZWN0ZWQnO1xuICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gdGhpcy5lbWl0KGV2ZW50LCBkZXZpY2UpKTtcbiAgICAvLyBkZXZpY2UuZW1pdCgnY29ubmVjdGVkJyk7XG4gICAgZGVidWcoYG1pYi1kZXZpY2UgWyR7ZGV2aWNlLmFkZHJlc3N9XSB3YXMgJHtldmVudH1gKTtcbiAgfVxuXG4gIHB1YmxpYyBjbG9zZSgpIHtcbiAgICBpZiAoIXRoaXMuaXNTdGFydGVkKSByZXR1cm47XG4gICAgdGhpcy5pc1N0YXJ0ZWQgPSBmYWxzZTtcbiAgICBkZWJ1ZygnY2xvc2UnKTtcbiAgICAvKipcbiAgICAgKiBAZXZlbnQgTmlidXNTZXNzaW9uI2Nsb3NlXG4gICAgICovXG4gICAgdGhpcy5lbWl0KCdjbG9zZScpO1xuICAgIC8vIGRldGVjdG9yLnN0b3AoKTtcbiAgICB0aGlzLmNvbm5lY3Rpb25zXG4gICAgICAuc3BsaWNlKDAsIHRoaXMuY29ubmVjdGlvbnMubGVuZ3RoKVxuICAgICAgLmZvckVhY2goY29ubmVjdGlvbiA9PiB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uZWN0aW9uKSk7XG4gICAgdGhpcy5zb2NrZXQgJiYgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICAgIC8vIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gIH1cblxuICAvL1xuICBhc3luYyBwaW5nRGV2aWNlKGRldmljZTogSURldmljZSk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9ucyB9ID0gdGhpcztcbiAgICBpZiAoZGV2aWNlLmNvbm5lY3Rpb24gJiYgY29ubmVjdGlvbnMuaW5jbHVkZXMoZGV2aWNlLmNvbm5lY3Rpb24pKSB7XG4gICAgICBjb25zdCB0aW1lb3V0ID0gYXdhaXQgZGV2aWNlLmNvbm5lY3Rpb24ucGluZyhkZXZpY2UuYWRkcmVzcyk7XG4gICAgICBpZiAodGltZW91dCAhPT0gLTEpIHJldHVybiB0aW1lb3V0O1xuICAgICAgZGV2aWNlLmNvbm5lY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcsIGRldmljZSk7XG4gICAgICAvLyBkZXZpY2UuZW1pdCgnZGlzY29ubmVjdGVkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgbWliID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgZGV2aWNlKTtcbiAgICBjb25zdCBvY2N1cGllZCA9IGRldmljZXMuZ2V0KClcbiAgICAgIC5tYXAoZGV2aWNlID0+IGRldmljZS5jb25uZWN0aW9uISlcbiAgICAgIC5maWx0ZXIoY29ubmVjdGlvbiA9PiBjb25uZWN0aW9uICE9IG51bGwgJiYgIWNvbm5lY3Rpb24uZGVzY3JpcHRpb24ubGluayk7XG4gICAgY29uc3QgYWNjZXB0YWJsZXMgPSBfLmRpZmZlcmVuY2UoY29ubmVjdGlvbnMsIG9jY3VwaWVkKVxuICAgICAgLmZpbHRlcigoeyBkZXNjcmlwdGlvbiB9KSA9PiBkZXNjcmlwdGlvbi5saW5rIHx8IGRlc2NyaXB0aW9uLm1pYiA9PT0gbWliKTtcbiAgICBpZiAoYWNjZXB0YWJsZXMubGVuZ3RoID09PSAwKSByZXR1cm4gLTE7XG5cbiAgICBjb25zdCBbdGltZW91dCwgY29ubmVjdGlvbl0gPSBhd2FpdCBQcm9taXNlLnJhY2UoYWNjZXB0YWJsZXMubWFwKFxuICAgICAgY29ubmVjdGlvbiA9PiBjb25uZWN0aW9uLnBpbmcoZGV2aWNlLmFkZHJlc3MpXG4gICAgICAgIC50aGVuKHQgPT4gW3QsIGNvbm5lY3Rpb25dIGFzIFtudW1iZXIsIE5pYnVzQ29ubmVjdGlvbl0pKSk7XG4gICAgaWYgKHRpbWVvdXQgPT09IC0xKSB7XG4gICAgICAvLyBwaW5nKGFjY2VwdGFibGVzWzBdLCBkZXZpY2UuYWRkcmVzcyk7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuXG4gICAgdGhpcy5fY29ubmVjdERldmljZShkZXZpY2UsIGNvbm5lY3Rpb24pO1xuICAgIHJldHVybiB0aW1lb3V0O1xuICB9XG5cbiAgYXN5bmMgcGluZyhhZGRyZXNzOiBBZGRyZXNzUGFyYW0pOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbnMgfSA9IHRoaXM7XG4gICAgY29uc3QgYWRkciA9IG5ldyBBZGRyZXNzKGFkZHJlc3MpO1xuICAgIGlmIChjb25uZWN0aW9ucy5sZW5ndGggPT09IDApIHJldHVybiBQcm9taXNlLnJlc29sdmUoLTEpO1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoY29ubmVjdGlvbnMubWFwKGNvbm5lY3Rpb24gPT4gY29ubmVjdGlvbi5waW5nKGFkZHIpKSk7XG4gIH1cblxuICBnZXQgcG9ydHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbnMubGVuZ3RoO1xuICB9XG59XG5cbmNvbnN0IHNlc3Npb24gPSBuZXcgTmlidXNTZXNzaW9uKCk7XG5cbmRldmljZXMub24oJ25ldycsIChkZXZpY2U6IElEZXZpY2UpID0+IHtcbiAgaWYgKCFkZXZpY2UuY29ubmVjdGlvbikge1xuICAgIHNlc3Npb24ucGluZ0RldmljZShkZXZpY2UpLmNhdGNoKG5vb3ApO1xuICB9XG59KTtcblxuZGV2aWNlcy5vbignZGVsZXRlJywgKGRldmljZTogSURldmljZSkgPT4ge1xuICBpZiAoZGV2aWNlLmNvbm5lY3Rpb24pIHtcbiAgICBkZXZpY2UuY29ubmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICBzZXNzaW9uLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcsIGRldmljZSk7XG4gICAgLy8gZGV2aWNlLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcpO1xuICB9XG59KTtcblxuc2Vzc2lvbi5vbignZm91bmQnLCAoeyBhZGRyZXNzLCBjb25uZWN0aW9uIH0pID0+IHtcbiAgY29uc29sZS5hc3NlcnQoXG4gICAgYWRkcmVzcy50eXBlID09PSBBZGRyZXNzVHlwZS5tYWMgfHwgYWRkcmVzcy50eXBlID09PSAnZW1wdHknLFxuICAgICdtYWMtYWRkcmVzcyBleHBlY3RlZCcsXG4gICk7XG4gIGNvbnN0IGRldnMgPSBkZXZpY2VzLmZpbmQoYWRkcmVzcyk7XG4gIGlmIChkZXZzICYmIGRldnMubGVuZ3RoID09PSAxKSB7XG4gICAgc2Vzc2lvbi5fY29ubmVjdERldmljZShkZXZzWzBdLCBjb25uZWN0aW9uKTtcbiAgfVxufSk7XG5cbnByb2Nlc3Mub24oJ1NJR0lOVCcsICgpID0+IHNlc3Npb24uY2xvc2UoKSk7XG5wcm9jZXNzLm9uKCdTSUdURVJNJywgKCkgPT4gc2Vzc2lvbi5jbG9zZSgpKTtcblxuZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbjtcbiJdfQ==