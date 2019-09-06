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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXNzaW9uL3Nlc3Npb24udHMiXSwibmFtZXMiOlsiZGVidWciLCJub29wIiwiZGVsYXkiLCJzZWNvbmRzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJzZXRUaW1lb3V0IiwiTmlidXNTZXNzaW9uIiwiRXZlbnRFbWl0dGVyIiwicG9ydHMiLCJwcmV2IiwiY29ubmVjdGlvbnMiLCJzcGxpY2UiLCJsZW5ndGgiLCJmb3JFYWNoIiwicG9ydCIsInBvcnRJbmZvIiwiY29tTmFtZSIsImluZGV4IiwiXyIsImZpbmRJbmRleCIsInBhdGgiLCJwdXNoIiwiYWRkSGFuZGxlciIsImNvbm5lY3Rpb24iLCJjbG9zZUNvbm5lY3Rpb24iLCJkZXNjcmlwdGlvbiIsIk5pYnVzQ29ubmVjdGlvbiIsImVtaXQiLCJwcm9jZXNzIiwicGxhdGZvcm0iLCJmaW5kIiwiZGV2aWNlcyIsImdldCIsImZpbHRlciIsImRldmljZSIsInJlZHVjZSIsInByb21pc2UiLCJ0aW1lIiwicGluZyIsImFkZHJlc3MiLCJjYXRjaCIsImNsb3NlIiwidW5kZWZpbmVkIiwiZGVzY3JpcHRpb25zIiwiQXJyYXkiLCJpc0FycmF5Iiwic2VsZWN0IiwiYmFzZUNhdGVnb3J5IiwiY2F0ZWdvcnkiLCJkZXNjciIsInR5cGUiLCJtaWIiLCJKU09OIiwicGFyc2UiLCJmcyIsInJlYWRGaWxlU3luYyIsInRvU3RyaW5nIiwidHlwZXMiLCJhcHBpbmZvIiwiZGV2aWNlX3R5cGUiLCJvbmNlIiwic2FycERhdGFncmFtIiwiQWRkcmVzcyIsIm1hYyIsImZpbmRCeVR5cGUiLCJzZW5kRGF0YWdyYW0iLCJlbXB0eSIsInRoZW4iLCJkYXRhZ3JhbSIsInNvdXJjZSIsInN0YXJ0IiwicmVqZWN0IiwiaXNTdGFydGVkIiwic29ja2V0IiwiQ2xpZW50IiwiY29ubmVjdCIsIlBBVEgiLCJlcnJvciIsImNvbnNvbGUiLCJtZXNzYWdlIiwib24iLCJyZWxvYWRIYW5kbGVyIiwicmVtb3ZlSGFuZGxlciIsIl9jb25uZWN0RGV2aWNlIiwiZXZlbnQiLCJuZXh0VGljayIsImRlc3Ryb3kiLCJwaW5nRGV2aWNlIiwiaW5jbHVkZXMiLCJ0aW1lb3V0IiwiUmVmbGVjdCIsImdldE1ldGFkYXRhIiwib2NjdXBpZWQiLCJtYXAiLCJsaW5rIiwiYWNjZXB0YWJsZXMiLCJkaWZmZXJlbmNlIiwicmFjZSIsInQiLCJhZGRyIiwic2Vzc2lvbiIsImFzc2VydCIsIkFkZHJlc3NUeXBlIiwiZGV2cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBVUE7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7O0FBRUE7Ozs7Ozs7O0FBR0EsTUFBTUEsS0FBSyxHQUFHLG9CQUFhLGVBQWIsQ0FBZDs7QUFDQSxNQUFNQyxJQUFJLEdBQUcsTUFBTSxDQUFFLENBQXJCOztBQUNPLE1BQU1DLEtBQUssR0FBSUMsT0FBRCxJQUNuQixJQUFJQyxPQUFKLENBQVlDLE9BQU8sSUFBSUMsVUFBVSxDQUFDRCxPQUFELEVBQVVGLE9BQU8sR0FBRyxJQUFwQixDQUFqQyxDQURLOzs7O0FBZ0NQLE1BQU1JLFlBQU4sU0FBMkJDLG9CQUEzQixDQUF3QztBQUFBO0FBQUE7O0FBQUEseUNBQ1ksRUFEWjs7QUFBQSx1Q0FFbEIsS0FGa0I7O0FBQUE7O0FBQUEsMkNBS2JDLEtBQUQsSUFBdUI7QUFDN0MsWUFBTUMsSUFBSSxHQUFHLEtBQUtDLFdBQUwsQ0FBaUJDLE1BQWpCLENBQXdCLENBQXhCLEVBQTJCLEtBQUtELFdBQUwsQ0FBaUJFLE1BQTVDLENBQWI7QUFDQUosTUFBQUEsS0FBSyxDQUFDSyxPQUFOLENBQWVDLElBQUQsSUFBVTtBQUN0QixjQUFNO0FBQUVDLFVBQUFBLFFBQVEsRUFBRTtBQUFFQyxZQUFBQTtBQUFGO0FBQVosWUFBNEJGLElBQWxDOztBQUNBLGNBQU1HLEtBQUssR0FBR0MsZ0JBQUVDLFNBQUYsQ0FBWVYsSUFBWixFQUFrQjtBQUFFVyxVQUFBQSxJQUFJLEVBQUVKO0FBQVIsU0FBbEIsQ0FB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LENBQUNXLElBQVIsS0FBaUJvRCxxQkFBWXZDLEdBQTdCLElBQW9DeEIsT0FBTyxDQUFDVyxJQUFSLEtBQWlCLE9BRHZELEVBRUUsc0JBRkY7O0FBSUEsUUFBTXFELElBQUksR0FBR3hFLGFBQVFELElBQVIsQ0FBYVMsT0FBYixDQUFiOztBQUNBLE1BQUlnRSxJQUFJLElBQUlBLElBQUksQ0FBQzNGLE1BQUwsS0FBZ0IsQ0FBNUIsRUFBK0I7QUFDN0J3RixJQUFBQSxPQUFPLENBQUNqQixjQUFSLENBQXVCb0IsSUFBSSxDQUFDLENBQUQsQ0FBM0IsRUFBZ0NoRixVQUFoQztBQUNEO0FBQ0YsQ0FURDtBQVdBSyxPQUFPLENBQUNvRCxFQUFSLENBQVcsUUFBWCxFQUFxQixNQUFNb0IsT0FBTyxDQUFDM0QsS0FBUixFQUEzQjtBQUNBYixPQUFPLENBQUNvRCxFQUFSLENBQVcsU0FBWCxFQUFzQixNQUFNb0IsT0FBTyxDQUFDM0QsS0FBUixFQUE1QjtlQUVlMkQsTyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBPT08gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmF0YVwiIHByb2plY3QuXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2Ugdmlld1xuICogdGhlIEVVTEEgZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKi9cblxuaW1wb3J0IGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7IFNvY2tldCB9IGZyb20gJ25ldCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IEFkZHJlc3MsIHsgQWRkcmVzc1BhcmFtLCBBZGRyZXNzVHlwZSB9IGZyb20gJy4uL0FkZHJlc3MnO1xuaW1wb3J0IHsgQ2xpZW50LCBJUG9ydEFyZyB9IGZyb20gJy4uL2lwYyc7XG5pbXBvcnQgeyBkZXZpY2VzLCBJRGV2aWNlLCB0b0ludCB9IGZyb20gJy4uL21pYic7XG5pbXBvcnQgeyBnZXRNaWJGaWxlLCBJTWliRGV2aWNlVHlwZSB9IGZyb20gJy4uL21pYi9kZXZpY2VzJztcbmltcG9ydCB7IE5pYnVzQ29ubmVjdGlvbiB9IGZyb20gJy4uL25pYnVzJztcbmltcG9ydCB7IGNyZWF0ZU5tc1JlYWQgfSBmcm9tICcuLi9ubXMnO1xuaW1wb3J0IFNhcnBEYXRhZ3JhbSBmcm9tICcuLi9zYXJwL1NhcnBEYXRhZ3JhbSc7XG5pbXBvcnQgeyBQQVRIIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHsgQ2F0ZWdvcnkgfSBmcm9tICcuL0tub3duUG9ydHMnO1xuXG5jb25zdCBkZWJ1ZyA9IGRlYnVnRmFjdG9yeSgnbmlidXM6c2Vzc2lvbicpO1xuY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuZXhwb3J0IGNvbnN0IGRlbGF5ID0gKHNlY29uZHM6IG51bWJlcikgPT5cbiAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHNlY29uZHMgKiAxMDAwKSk7XG5cbmV4cG9ydCB0eXBlIEZvdW5kTGlzdGVuZXIgPVxuICAoYXJnOiB7IGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbiwgY2F0ZWdvcnk6IENhdGVnb3J5LCBhZGRyZXNzOiBBZGRyZXNzIH0pID0+IHZvaWQ7XG5cbmV4cG9ydCB0eXBlIENvbm5lY3Rpb25MaXN0ZW5lciA9IChjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pID0+IHZvaWQ7XG5leHBvcnQgdHlwZSBEZXZpY2VMaXN0ZW5lciA9IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQ7XG5cbmRlY2xhcmUgaW50ZXJmYWNlIE5pYnVzU2Vzc2lvbiB7XG4gIG9uKGV2ZW50OiAnc3RhcnQnIHwgJ2Nsb3NlJywgbGlzdGVuZXI6IEZ1bmN0aW9uKTogdGhpcztcbiAgb24oZXZlbnQ6ICdmb3VuZCcsIGxpc3RlbmVyOiBGb3VuZExpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICdhZGQnIHwgJ3JlbW92ZScsIGxpc3RlbmVyOiBDb25uZWN0aW9uTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6IERldmljZUxpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICdwdXJlQ29ubmVjdGlvbicsIGxpc3RlbmVyOiAoY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ3N0YXJ0JyB8ICdjbG9zZScsIGxpc3RlbmVyOiBGdW5jdGlvbik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdmb3VuZCcsIGxpc3RlbmVyOiBGb3VuZExpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ2FkZCcgfCAncmVtb3ZlJywgbGlzdGVuZXI6IENvbm5lY3Rpb25MaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiBEZXZpY2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdwdXJlQ29ubmVjdGlvbicsIGxpc3RlbmVyOiAoY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uKSA9PiB2b2lkKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnc3RhcnQnIHwgJ2Nsb3NlJywgbGlzdGVuZXI6IEZ1bmN0aW9uKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnZm91bmQnLCBsaXN0ZW5lcjogRm91bmRMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2FkZCcgfCAncmVtb3ZlJywgbGlzdGVuZXI6IENvbm5lY3Rpb25MaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6IERldmljZUxpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAncHVyZUNvbm5lY3Rpb24nLCBsaXN0ZW5lcjogKGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbikgPT4gdm9pZCk6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnc3RhcnQnIHwgJ2Nsb3NlJywgbGlzdGVuZXI6IEZ1bmN0aW9uKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdmb3VuZCcsIGxpc3RlbmVyOiBGb3VuZExpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdhZGQnIHwgJ3JlbW92ZScsIGxpc3RlbmVyOiBDb25uZWN0aW9uTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6IERldmljZUxpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdwdXJlQ29ubmVjdGlvbicsIGxpc3RlbmVyOiAoY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uKSA9PiB2b2lkKTogdGhpcztcbn1cblxuY2xhc3MgTmlidXNTZXNzaW9uIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBjb25uZWN0aW9uczogTmlidXNDb25uZWN0aW9uW10gPSBbXTtcbiAgcHJpdmF0ZSBpc1N0YXJ0ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBzb2NrZXQ/OiBTb2NrZXQ7IC8vID0gQ2xpZW50LmNvbm5lY3QoUEFUSCk7XG5cbiAgcHJpdmF0ZSByZWxvYWRIYW5kbGVyID0gKHBvcnRzOiBJUG9ydEFyZ1tdKSA9PiB7XG4gICAgY29uc3QgcHJldiA9IHRoaXMuY29ubmVjdGlvbnMuc3BsaWNlKDAsIHRoaXMuY29ubmVjdGlvbnMubGVuZ3RoKTtcbiAgICBwb3J0cy5mb3JFYWNoKChwb3J0KSA9PiB7XG4gICAgICBjb25zdCB7IHBvcnRJbmZvOiB7IGNvbU5hbWUgfSB9ID0gcG9ydDtcbiAgICAgIGNvbnN0IGluZGV4ID0gXy5maW5kSW5kZXgocHJldiwgeyBwYXRoOiBjb21OYW1lIH0pO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLmNvbm5lY3Rpb25zLnB1c2gocHJldi5zcGxpY2UoaW5kZXgsIDEpWzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYWRkSGFuZGxlcihwb3J0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBwcmV2LmZvckVhY2goY29ubmVjdGlvbiA9PiB0aGlzLmNsb3NlQ29ubmVjdGlvbihjb25uZWN0aW9uKSk7XG4gIH07XG5cbiAgcHJpdmF0ZSBhZGRIYW5kbGVyID0gYXN5bmMgKHsgcG9ydEluZm86IHsgY29tTmFtZSB9LCBkZXNjcmlwdGlvbiB9OiBJUG9ydEFyZykgPT4ge1xuICAgIGRlYnVnKCdhZGQnKTtcbiAgICBjb25zdCBjb25uZWN0aW9uID0gbmV3IE5pYnVzQ29ubmVjdGlvbihjb21OYW1lLCBkZXNjcmlwdGlvbik7XG4gICAgdGhpcy5jb25uZWN0aW9ucy5wdXNoKGNvbm5lY3Rpb24pO1xuICAgIHRoaXMuZW1pdCgnYWRkJywgY29ubmVjdGlvbik7XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIGF3YWl0IGRlbGF5KDIpO1xuICAgIHRoaXMuZmluZChjb25uZWN0aW9uKTtcbiAgICBkZXZpY2VzLmdldCgpXG4gICAgICAuZmlsdGVyKGRldmljZSA9PiBkZXZpY2UuY29ubmVjdGlvbiA9PSBudWxsKVxuICAgICAgLnJlZHVjZShhc3luYyAocHJvbWlzZSwgZGV2aWNlKSA9PiB7XG4gICAgICAgIGF3YWl0IHByb21pc2U7XG4gICAgICAgIGRlYnVnKCdzdGFydCBwaW5nJyk7XG4gICAgICAgIGNvbnN0IHRpbWUgPSBhd2FpdCBjb25uZWN0aW9uLnBpbmcoZGV2aWNlLmFkZHJlc3MpO1xuICAgICAgICBkZWJ1ZyhgcGluZyAke3RpbWV9YCk7XG4gICAgICAgIGlmICh0aW1lICE9PSAtMSkge1xuICAgICAgICAgIGRldmljZS5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICAgICAgICAvKipcbiAgICAgICAgICAgKiBOZXcgY29ubmVjdGVkIGRldmljZVxuICAgICAgICAgICAqIEBldmVudCBOaWJ1c1Nlc3Npb24jY29ubmVjdGVkXG4gICAgICAgICAgICogQHR5cGUgSURldmljZVxuICAgICAgICAgICAqL1xuICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdGVkJywgZGV2aWNlKTtcbiAgICAgICAgICAvLyBkZXZpY2UuZW1pdCgnY29ubmVjdGVkJyk7XG4gICAgICAgICAgZGVidWcoYG1pYi1kZXZpY2UgJHtkZXZpY2UuYWRkcmVzc30gd2FzIGNvbm5lY3RlZGApO1xuICAgICAgICB9XG4gICAgICB9LCBQcm9taXNlLnJlc29sdmUoKSlcbiAgICAgIC5jYXRjaChub29wKTtcbiAgfTtcblxuICBwcml2YXRlIGNsb3NlQ29ubmVjdGlvbihjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pIHtcbiAgICBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgZGV2aWNlcy5nZXQoKVxuICAgICAgLmZpbHRlcihkZXZpY2UgPT4gZGV2aWNlLmNvbm5lY3Rpb24gPT09IGNvbm5lY3Rpb24pXG4gICAgICAuZm9yRWFjaCgoZGV2aWNlKSA9PiB7XG4gICAgICAgIGRldmljZS5jb25uZWN0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcsIGRldmljZSk7XG4gICAgICAgIGRlYnVnKGBtaWItZGV2aWNlICR7Y29ubmVjdGlvbi5wYXRofSMke2RldmljZS5hZGRyZXNzfSB3YXMgZGlzY29ubmVjdGVkYCk7XG4gICAgICB9KTtcbiAgICB0aGlzLmVtaXQoJ3JlbW92ZScsIGNvbm5lY3Rpb24pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVIYW5kbGVyID0gKHsgcG9ydEluZm86IHsgY29tTmFtZSB9IH06IElQb3J0QXJnKSA9PiB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLmNvbm5lY3Rpb25zLmZpbmRJbmRleCgoeyBwYXRoIH0pID0+IGNvbU5hbWUgPT09IHBhdGgpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIGNvbnN0IFtjb25uZWN0aW9uXSA9IHRoaXMuY29ubmVjdGlvbnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIHRoaXMuY2xvc2VDb25uZWN0aW9uKGNvbm5lY3Rpb24pO1xuICAgIH1cbiAgfTtcblxuICBwcml2YXRlIGZpbmQoY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uKSB7XG4gICAgY29uc3QgeyBkZXNjcmlwdGlvbiB9ID0gY29ubmVjdGlvbjtcbiAgICBjb25zdCBkZXNjcmlwdGlvbnMgPSBBcnJheS5pc0FycmF5KGRlc2NyaXB0aW9uLnNlbGVjdCkgPyBkZXNjcmlwdGlvbi5zZWxlY3QgOiBbZGVzY3JpcHRpb25dO1xuICAgIGNvbnN0IGJhc2VDYXRlZ29yeSA9IEFycmF5LmlzQXJyYXkoZGVzY3JpcHRpb24uc2VsZWN0KSA/IGRlc2NyaXB0aW9uLmNhdGVnb3J5IDogbnVsbDtcbiAgICBkZXNjcmlwdGlvbnMuZm9yRWFjaCgoZGVzY3IpID0+IHtcbiAgICAgIGNvbnN0IHsgY2F0ZWdvcnkgfSA9IGRlc2NyO1xuICAgICAgc3dpdGNoIChkZXNjci5maW5kKSB7XG4gICAgICAgIGNhc2UgJ3NhcnAnOiB7XG4gICAgICAgICAgbGV0IHsgdHlwZSB9ID0gZGVzY3I7XG4gICAgICAgICAgaWYgKHR5cGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgbWliID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZ2V0TWliRmlsZShkZXNjci5taWIhKSkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBjb25zdCB7IHR5cGVzIH0gPSBtaWI7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2UgPSB0eXBlc1ttaWIuZGV2aWNlXSBhcyBJTWliRGV2aWNlVHlwZTtcbiAgICAgICAgICAgIHR5cGUgPSB0b0ludChkZXZpY2UuYXBwaW5mby5kZXZpY2VfdHlwZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbm5lY3Rpb24ub25jZSgnc2FycCcsIChzYXJwRGF0YWdyYW06IFNhcnBEYXRhZ3JhbSkgPT4ge1xuICAgICAgICAgICAgaWYgKGJhc2VDYXRlZ29yeSAmJiBjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmNhdGVnb3J5ICE9PSBiYXNlQ2F0ZWdvcnkpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChiYXNlQ2F0ZWdvcnkgJiYgY29ubmVjdGlvbi5kZXNjcmlwdGlvbi5jYXRlZ29yeSA9PT0gYmFzZUNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgIGRlYnVnKGBjYXRlZ29yeSB3YXMgY2hhbmdlZDogJHtjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmNhdGVnb3J5fSA9PiAke2NhdGVnb3J5fWApO1xuICAgICAgICAgICAgICBjb25uZWN0aW9uLmRlc2NyaXB0aW9uID0gZGVzY3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhZGRyZXNzID0gbmV3IEFkZHJlc3Moc2FycERhdGFncmFtLm1hYyk7XG4gICAgICAgICAgICBkZWJ1ZyhgZGV2aWNlICR7Y2F0ZWdvcnl9WyR7YWRkcmVzc31dIHdhcyBmb3VuZCBvbiAke2Nvbm5lY3Rpb24ucGF0aH1gKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAgICAgJ2ZvdW5kJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24sXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgYWRkcmVzcyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgY29ubmVjdGlvbi5maW5kQnlUeXBlKHR5cGUpLmNhdGNoKG5vb3ApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgJ3ZlcnNpb24nOlxuICAgICAgICAgIGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKGNyZWF0ZU5tc1JlYWQoQWRkcmVzcy5lbXB0eSwgMikpXG4gICAgICAgICAgICAudGhlbihcbiAgICAgICAgICAgICAgKGRhdGFncmFtKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFkYXRhZ3JhbSB8fCBBcnJheS5pc0FycmF5KGRhdGFncmFtKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmIChjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmNhdGVnb3J5ID09PSAnZnRkaScpIHtcbiAgICAgICAgICAgICAgICAgIGRlYnVnKGBjYXRlZ29yeSB3YXMgY2hhbmdlZDogJHtjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmNhdGVnb3J5fSA9PiAke2NhdGVnb3J5fWApO1xuICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi5kZXNjcmlwdGlvbiA9IGRlc2NyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBhZGRyZXNzID0gbmV3IEFkZHJlc3MoZGF0YWdyYW0uc291cmNlLm1hYyk7XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICAgICAgICAgJ2ZvdW5kJyxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIGFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgZGVidWcoYGRldmljZSAke2NhdGVnb3J5fVske2FkZHJlc3N9XSB3YXMgZm91bmQgb24gJHtjb25uZWN0aW9uLnBhdGh9YCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ3B1cmVDb25uZWN0aW9uJywgY29ubmVjdGlvbik7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICApO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRoaXMuZW1pdCgncHVyZUNvbm5lY3Rpb24nLCBjb25uZWN0aW9uKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIHB1YmxpYyBhc3luYyBzdGFydCh3YXRjaCA9IHRydWUpIHtcbiAgLy8gICBpZiAodGhpcy5pc1N0YXJ0ZWQpIHJldHVybjtcbiAgLy8gICBjb25zdCB7IGRldGVjdGlvbiB9ID0gZGV0ZWN0b3I7XG4gIC8vICAgaWYgKGRldGVjdGlvbiA9PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJ2RldGVjdGlvbiBpcyBOL0EnKTtcbiAgLy8gICBkZXRlY3Rvci5vbignYWRkJywgdGhpcy5hZGRIYW5kbGVyKTtcbiAgLy8gICBkZXRlY3Rvci5vbigncmVtb3ZlJywgdGhpcy5yZW1vdmVIYW5kbGVyKTtcbiAgLy8gICBhd2FpdCBkZXRlY3Rvci5nZXRQb3J0cygpO1xuICAvL1xuICAvLyAgIGlmICh3YXRjaCkgZGV0ZWN0b3Iuc3RhcnQoKTtcbiAgLy8gICB0aGlzLmlzU3RhcnRlZCA9IHRydWU7XG4gIC8vICAgcHJvY2Vzcy5vbmNlKCdTSUdJTlQnLCAoKSA9PiB0aGlzLnN0b3AoKSk7XG4gIC8vICAgcHJvY2Vzcy5vbmNlKCdTSUdURVJNJywgKCkgPT4gdGhpcy5zdG9wKCkpO1xuICAvLyAgIC8qKlxuICAvLyAgICAqIEBldmVudCBOaWJ1c1NlcnZpY2Ujc3RhcnRcbiAgLy8gICAgKi9cbiAgLy8gICB0aGlzLmVtaXQoJ3N0YXJ0Jyk7XG4gIC8vICAgZGVidWcoJ3N0YXJ0ZWQnKTtcbiAgLy8gfVxuICAvL1xuICBzdGFydCgpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1N0YXJ0ZWQpIHJldHVybiByZXNvbHZlKHRoaXMuY29ubmVjdGlvbnMubGVuZ3RoKTtcbiAgICAgIHRoaXMuaXNTdGFydGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc29ja2V0ID0gQ2xpZW50LmNvbm5lY3QoUEFUSCk7XG4gICAgICB0aGlzLnNvY2tldC5vbmNlKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvciB3aGlsZSBzdGFydCBuaWJ1cy5zZXJ2aWNlJywgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zb2NrZXQub24oJ3BvcnRzJywgdGhpcy5yZWxvYWRIYW5kbGVyKTtcbiAgICAgIHRoaXMuc29ja2V0Lm9uKCdhZGQnLCB0aGlzLmFkZEhhbmRsZXIpO1xuICAgICAgdGhpcy5zb2NrZXQub24oJ3JlbW92ZScsIHRoaXMucmVtb3ZlSGFuZGxlcik7XG4gICAgICB0aGlzLnNvY2tldC5vbmNlKCdwb3J0cycsIChwb3J0cykgPT4ge1xuICAgICAgICByZXNvbHZlKHBvcnRzLmxlbmd0aCk7XG4gICAgICAgIHRoaXMuZW1pdCgnc3RhcnQnKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zb2NrZXQub25jZSgnY2xvc2UnLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmZ1bmN0aW9uLW5hbWVcbiAgX2Nvbm5lY3REZXZpY2UoZGV2aWNlOiBJRGV2aWNlLCBjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24pIHtcbiAgICBpZiAoZGV2aWNlLmNvbm5lY3Rpb24gPT09IGNvbm5lY3Rpb24pIHJldHVybjtcbiAgICBkZXZpY2UuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgY29uc3QgZXZlbnQgPSBjb25uZWN0aW9uID8gJ2Nvbm5lY3RlZCcgOiAnZGlzY29ubmVjdGVkJztcbiAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHRoaXMuZW1pdChldmVudCwgZGV2aWNlKSk7XG4gICAgLy8gZGV2aWNlLmVtaXQoJ2Nvbm5lY3RlZCcpO1xuICAgIGRlYnVnKGBtaWItZGV2aWNlIFske2RldmljZS5hZGRyZXNzfV0gd2FzICR7ZXZlbnR9YCk7XG4gIH1cblxuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgaWYgKCF0aGlzLmlzU3RhcnRlZCkgcmV0dXJuO1xuICAgIHRoaXMuaXNTdGFydGVkID0gZmFsc2U7XG4gICAgZGVidWcoJ2Nsb3NlJyk7XG4gICAgLyoqXG4gICAgICogQGV2ZW50IE5pYnVzU2Vzc2lvbiNjbG9zZVxuICAgICAqL1xuICAgIHRoaXMuZW1pdCgnY2xvc2UnKTtcbiAgICAvLyBkZXRlY3Rvci5zdG9wKCk7XG4gICAgdGhpcy5jb25uZWN0aW9uc1xuICAgICAgLnNwbGljZSgwLCB0aGlzLmNvbm5lY3Rpb25zLmxlbmd0aClcbiAgICAgIC5mb3JFYWNoKGNvbm5lY3Rpb24gPT4gdGhpcy5jbG9zZUNvbm5lY3Rpb24oY29ubmVjdGlvbikpO1xuICAgIHRoaXMuc29ja2V0ICYmIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgICAvLyB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICB9XG5cbiAgLy9cbiAgYXN5bmMgcGluZ0RldmljZShkZXZpY2U6IElEZXZpY2UpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbnMgfSA9IHRoaXM7XG4gICAgaWYgKGRldmljZS5jb25uZWN0aW9uICYmIGNvbm5lY3Rpb25zLmluY2x1ZGVzKGRldmljZS5jb25uZWN0aW9uKSkge1xuICAgICAgY29uc3QgdGltZW91dCA9IGF3YWl0IGRldmljZS5jb25uZWN0aW9uLnBpbmcoZGV2aWNlLmFkZHJlc3MpO1xuICAgICAgaWYgKHRpbWVvdXQgIT09IC0xKSByZXR1cm4gdGltZW91dDtcbiAgICAgIGRldmljZS5jb25uZWN0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5lbWl0KCdkaXNjb25uZWN0ZWQnLCBkZXZpY2UpO1xuICAgICAgLy8gZGV2aWNlLmVtaXQoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IG1pYiA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYicsIGRldmljZSk7XG4gICAgY29uc3Qgb2NjdXBpZWQgPSBkZXZpY2VzLmdldCgpXG4gICAgICAubWFwKGRldmljZSA9PiBkZXZpY2UuY29ubmVjdGlvbiEpXG4gICAgICAuZmlsdGVyKGNvbm5lY3Rpb24gPT4gY29ubmVjdGlvbiAhPSBudWxsICYmICFjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmxpbmspO1xuICAgIGNvbnN0IGFjY2VwdGFibGVzID0gXy5kaWZmZXJlbmNlKGNvbm5lY3Rpb25zLCBvY2N1cGllZClcbiAgICAgIC5maWx0ZXIoKHsgZGVzY3JpcHRpb24gfSkgPT4gZGVzY3JpcHRpb24ubGluayB8fCBkZXNjcmlwdGlvbi5taWIgPT09IG1pYik7XG4gICAgaWYgKGFjY2VwdGFibGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xO1xuXG4gICAgY29uc3QgW3RpbWVvdXQsIGNvbm5lY3Rpb25dID0gYXdhaXQgUHJvbWlzZS5yYWNlKGFjY2VwdGFibGVzLm1hcChcbiAgICAgIGNvbm5lY3Rpb24gPT4gY29ubmVjdGlvbi5waW5nKGRldmljZS5hZGRyZXNzKVxuICAgICAgICAudGhlbih0ID0+IFt0LCBjb25uZWN0aW9uXSBhcyBbbnVtYmVyLCBOaWJ1c0Nvbm5lY3Rpb25dKSkpO1xuICAgIGlmICh0aW1lb3V0ID09PSAtMSkge1xuICAgICAgLy8gcGluZyhhY2NlcHRhYmxlc1swXSwgZGV2aWNlLmFkZHJlc3MpO1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH1cblxuICAgIHRoaXMuX2Nvbm5lY3REZXZpY2UoZGV2aWNlLCBjb25uZWN0aW9uKTtcbiAgICByZXR1cm4gdGltZW91dDtcbiAgfVxuXG4gIGFzeW5jIHBpbmcoYWRkcmVzczogQWRkcmVzc1BhcmFtKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb25zIH0gPSB0aGlzO1xuICAgIGNvbnN0IGFkZHIgPSBuZXcgQWRkcmVzcyhhZGRyZXNzKTtcbiAgICBpZiAoY29ubmVjdGlvbnMubGVuZ3RoID09PSAwKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKC0xKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKGNvbm5lY3Rpb25zLm1hcChjb25uZWN0aW9uID0+IGNvbm5lY3Rpb24ucGluZyhhZGRyKSkpO1xuICB9XG5cbiAgZ2V0IHBvcnRzKCkge1xuICAgIHJldHVybiB0aGlzLmNvbm5lY3Rpb25zLmxlbmd0aDtcbiAgfVxufVxuXG5jb25zdCBzZXNzaW9uID0gbmV3IE5pYnVzU2Vzc2lvbigpO1xuXG5kZXZpY2VzLm9uKCduZXcnLCAoZGV2aWNlOiBJRGV2aWNlKSA9PiB7XG4gIGlmICghZGV2aWNlLmNvbm5lY3Rpb24pIHtcbiAgICBzZXNzaW9uLnBpbmdEZXZpY2UoZGV2aWNlKS5jYXRjaChub29wKTtcbiAgfVxufSk7XG5cbmRldmljZXMub24oJ2RlbGV0ZScsIChkZXZpY2U6IElEZXZpY2UpID0+IHtcbiAgaWYgKGRldmljZS5jb25uZWN0aW9uKSB7XG4gICAgZGV2aWNlLmNvbm5lY3Rpb24gPSB1bmRlZmluZWQ7XG4gICAgc2Vzc2lvbi5lbWl0KCdkaXNjb25uZWN0ZWQnLCBkZXZpY2UpO1xuICAgIC8vIGRldmljZS5lbWl0KCdkaXNjb25uZWN0ZWQnKTtcbiAgfVxufSk7XG5cbnNlc3Npb24ub24oJ2ZvdW5kJywgKHsgYWRkcmVzcywgY29ubmVjdGlvbiB9KSA9PiB7XG4gIGNvbnNvbGUuYXNzZXJ0KFxuICAgIGFkZHJlc3MudHlwZSA9PT0gQWRkcmVzc1R5cGUubWFjIHx8IGFkZHJlc3MudHlwZSA9PT0gJ2VtcHR5JyxcbiAgICAnbWFjLWFkZHJlc3MgZXhwZWN0ZWQnLFxuICApO1xuICBjb25zdCBkZXZzID0gZGV2aWNlcy5maW5kKGFkZHJlc3MpO1xuICBpZiAoZGV2cyAmJiBkZXZzLmxlbmd0aCA9PT0gMSkge1xuICAgIHNlc3Npb24uX2Nvbm5lY3REZXZpY2UoZGV2c1swXSwgY29ubmVjdGlvbik7XG4gIH1cbn0pO1xuXG5wcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiBzZXNzaW9uLmNsb3NlKCkpO1xucHJvY2Vzcy5vbignU0lHVEVSTScsICgpID0+IHNlc3Npb24uY2xvc2UoKSk7XG5cbmV4cG9ydCBkZWZhdWx0IHNlc3Npb247XG4iXX0=