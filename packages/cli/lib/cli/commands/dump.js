"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _chalk = _interopRequireDefault(require("chalk"));

var _cliTable = _interopRequireDefault(require("cli-table3"));

var _lodash = _interopRequireDefault(require("lodash"));

var _debug = _interopRequireDefault(require("debug"));

var _core = _interopRequireWildcard(require("@nibus/core"));

var _mib = require("@nibus/core/lib/mib");

var _nibus = require("@nibus/core/lib/nibus");

var _sarp = require("@nibus/core/lib/sarp");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * @license
 * Copyright (c) 2019. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
const debug = (0, _debug.default)('nibus:dump');
let count = 0;

async function dumpDevice(address, connection, argv, mib) {
  const raw = argv.raw;
  const compact = argv.compact;
  let device;

  if (!mib) {
    const [version, type] = await connection.getVersion(address);
    device = _mib.devices.create(address, type, version);
  } else {
    device = _mib.devices.create(address, mib);
  }

  device.connection = connection;
  let ids = [];

  if (argv.name) {
    ids = argv.name.map(name => device.getId(name));
  }

  const result = await device.read(...ids);
  const rows = Object.keys(result).map(key => {
    const value = raw ? device.getError(key) || device.getRawValue(key) : result[key];
    return {
      value,
      key,
      displayName: Reflect.getMetadata('displayName', device, key)
    };
  });
  const proto = Reflect.getPrototypeOf(device);
  device.release();

  const categories = _lodash.default.groupBy(rows, ({
    key
  }) => Reflect.getMetadata('category', proto, key) || '');

  console.info(` Устройство ${Reflect.getMetadata('mib', proto)} [${address.toString()}]`);
  const table = new _cliTable.default({
    head: ['Название', 'Значение', 'Имя'],
    style: {
      compact
    },
    wordWrap: true
  });

  const toRow = ({
    displayName,
    value,
    key
  }) => {
    let val;

    if (value && value.error) {
      val = _chalk.default.red(value.error);
    } else if (value && value.errcode) {
      val = _chalk.default.red(`errcode: ${value.errcode}`);
    } else {
      val = JSON.stringify(value);

      if (!Reflect.getMetadata('isWritable', proto, key)) {
        val = _chalk.default.grey(val);
      }
    }

    return [displayName, val, key];
  };

  Object.keys(categories).forEach(category => {
    const rows = categories[category];

    if (category) {
      table.push([{
        colSpan: 3,
        content: _chalk.default.yellow(category.toUpperCase())
      }]);
    }

    table.push(...rows.map(toRow));
  });
  console.info(table.toString());
}

function findDevices(mib, connection, argv) {
  count += 1;
  const proto = (0, _mib.getMibPrototype)(mib);
  const type = Reflect.getMetadata('deviceType', proto);
  connection.findByType(type).catch(e => debug('error while findByType', e.stack));
  connection.on('sarp', datagram => {
    count += 1;
    if (datagram.queryType !== _sarp.SarpQueryType.ByType || datagram.deviceType !== type) return;
    const address = new _core.Address(datagram.mac);
    dumpDevice(address, connection, argv, mib).catch( // () => {},
    e => console.error('error while dump:', e.message));
  });
}

const dumpCommand = {
  command: 'dump',
  describe: 'Выдать дампы устройств',
  builder: argv => argv.check(argv => {
    if (argv.id && !argv.mac && !argv.mib) {
      throw `Данный аргумент требует следующий дополнительный аргумент:
 id -> mib или id -> mac`;
    }

    return true;
  }),
  handler: argv => new Promise(async (resolve, reject) => {
    const close = err => {
      clearTimeout(timeout);

      _core.default.close();

      if (err) reject(err);else resolve();
    };

    const mac = argv.mac && new _core.Address(argv.mac);
    count = await _core.default.start(); // На Windows сложнее метод определения и занимает больше времени

    if (process.platform === 'win32') {
      count *= 2;
    }

    _core.default.on('found', async ({
      address,
      connection
    }) => {
      try {
        if (connection.description.link) {
          if (mac) {
            count += 1;
            await dumpDevice(mac, connection, argv);
          } else if (argv.mib) {
            findDevices(argv.mib, connection, argv);
          }
        }

        if ((!mac || mac.equals(address)) && (!argv.mib || argv.mib === connection.description.mib)) {
          await dumpDevice(address, connection, argv, connection.description.mib);
        }

        count -= 1;

        if (count === 0) {
          clearTimeout(timeout);
          process.nextTick(close);
        }
      } catch (e) {
        close(e.message || e);
      }
    });

    const wait = () => {
      count -= 1;

      if (count > 0) {
        timeout = setTimeout(wait, (0, _nibus.getNibusTimeout)());
      } else {
        close();
      }
    };

    let timeout = setTimeout(wait, (0, _nibus.getNibusTimeout)());
  })
};
var _default = dumpCommand;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvZHVtcC50cyJdLCJuYW1lcyI6WyJkZWJ1ZyIsImNvdW50IiwiZHVtcERldmljZSIsImFkZHJlc3MiLCJjb25uZWN0aW9uIiwiYXJndiIsIm1pYiIsInJhdyIsImNvbXBhY3QiLCJkZXZpY2UiLCJ2ZXJzaW9uIiwidHlwZSIsImdldFZlcnNpb24iLCJkZXZpY2VzIiwiY3JlYXRlIiwiaWRzIiwibmFtZSIsIm1hcCIsImdldElkIiwicmVzdWx0IiwicmVhZCIsInJvd3MiLCJPYmplY3QiLCJrZXlzIiwia2V5IiwidmFsdWUiLCJnZXRFcnJvciIsImdldFJhd1ZhbHVlIiwiZGlzcGxheU5hbWUiLCJSZWZsZWN0IiwiZ2V0TWV0YWRhdGEiLCJwcm90byIsImdldFByb3RvdHlwZU9mIiwicmVsZWFzZSIsImNhdGVnb3JpZXMiLCJfIiwiZ3JvdXBCeSIsImNvbnNvbGUiLCJpbmZvIiwidG9TdHJpbmciLCJ0YWJsZSIsIlRhYmxlIiwiaGVhZCIsInN0eWxlIiwid29yZFdyYXAiLCJ0b1JvdyIsInZhbCIsImVycm9yIiwiY2hhbGsiLCJyZWQiLCJlcnJjb2RlIiwiSlNPTiIsInN0cmluZ2lmeSIsImdyZXkiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJwdXNoIiwiY29sU3BhbiIsImNvbnRlbnQiLCJ5ZWxsb3ciLCJ0b1VwcGVyQ2FzZSIsImZpbmREZXZpY2VzIiwiZmluZEJ5VHlwZSIsImNhdGNoIiwiZSIsInN0YWNrIiwib24iLCJkYXRhZ3JhbSIsInF1ZXJ5VHlwZSIsIlNhcnBRdWVyeVR5cGUiLCJCeVR5cGUiLCJkZXZpY2VUeXBlIiwiQWRkcmVzcyIsIm1hYyIsIm1lc3NhZ2UiLCJkdW1wQ29tbWFuZCIsImNvbW1hbmQiLCJkZXNjcmliZSIsImJ1aWxkZXIiLCJjaGVjayIsImlkIiwiaGFuZGxlciIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY2xvc2UiLCJlcnIiLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0Iiwic2Vzc2lvbiIsInN0YXJ0IiwicHJvY2VzcyIsInBsYXRmb3JtIiwiZGVzY3JpcHRpb24iLCJsaW5rIiwiZXF1YWxzIiwibmV4dFRpY2siLCJ3YWl0Iiwic2V0VGltZW91dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBVUE7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBQ0E7O0FBQ0E7Ozs7OztBQXBCQTs7Ozs7Ozs7O0FBNEJBLE1BQU1BLEtBQUssR0FBRyxvQkFBYSxZQUFiLENBQWQ7QUFDQSxJQUFJQyxLQUFLLEdBQUcsQ0FBWjs7QUFFQSxlQUFlQyxVQUFmLENBQ0VDLE9BREYsRUFFRUMsVUFGRixFQUdFQyxJQUhGLEVBSUVDLEdBSkYsRUFJK0I7QUFDN0IsUUFBTUMsR0FBRyxHQUFHRixJQUFJLENBQUNFLEdBQWpCO0FBQ0EsUUFBTUMsT0FBTyxHQUFHSCxJQUFJLENBQUNHLE9BQXJCO0FBRUEsTUFBSUMsTUFBSjs7QUFDQSxNQUFJLENBQUNILEdBQUwsRUFBVTtBQUNSLFVBQU0sQ0FBQ0ksT0FBRCxFQUFVQyxJQUFWLElBQWtCLE1BQU1QLFVBQVUsQ0FBQ1EsVUFBWCxDQUFzQlQsT0FBdEIsQ0FBOUI7QUFDQU0sSUFBQUEsTUFBTSxHQUFHSSxhQUFRQyxNQUFSLENBQWVYLE9BQWYsRUFBd0JRLElBQXhCLEVBQStCRCxPQUEvQixDQUFUO0FBQ0QsR0FIRCxNQUdPO0FBQ0xELElBQUFBLE1BQU0sR0FBR0ksYUFBUUMsTUFBUixDQUFlWCxPQUFmLEVBQXdCRyxHQUF4QixDQUFUO0FBQ0Q7O0FBQ0RHLEVBQUFBLE1BQU0sQ0FBQ0wsVUFBUCxHQUFvQkEsVUFBcEI7QUFDQSxNQUFJVyxHQUFhLEdBQUcsRUFBcEI7O0FBQ0EsTUFBSVYsSUFBSSxDQUFDVyxJQUFULEVBQWU7QUFDYkQsSUFBQUEsR0FBRyxHQUFHVixJQUFJLENBQUNXLElBQUwsQ0FBVUMsR0FBVixDQUFjRCxJQUFJLElBQUlQLE1BQU0sQ0FBQ1MsS0FBUCxDQUFhRixJQUFiLENBQXRCLENBQU47QUFDRDs7QUFDRCxR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S0FBSyxJQUFJLENBQVQ7O0FBQ0EsVUFBSUEsS0FBSyxHQUFHLENBQVosRUFBZTtBQUNidUYsUUFBQUEsT0FBTyxHQUFHVSxVQUFVLENBQUNELElBQUQsRUFBTyw2QkFBUCxDQUFwQjtBQUNELE9BRkQsTUFFTztBQUNMWixRQUFBQSxLQUFLO0FBQ047QUFDRixLQVBEOztBQVNBLFFBQUlHLE9BQU8sR0FBR1UsVUFBVSxDQUFDRCxJQUFELEVBQU8sNkJBQVAsQ0FBeEI7QUFDRCxHQTlDZ0I7QUFYc0MsQ0FBekQ7ZUE0RGV0QixXIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgVGFibGUsIHsgSG9yaXpvbnRhbFRhYmxlIH0gZnJvbSAnY2xpLXRhYmxlMyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHsgQXJndW1lbnRzLCBDb21tYW5kTW9kdWxlIH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5cbmltcG9ydCBzZXNzaW9uLCB7IEFkZHJlc3MgfSBmcm9tICdAbmlidXMvY29yZSc7XG5pbXBvcnQgeyBDb21tb25PcHRzIH0gZnJvbSAnLi4vb3B0aW9ucyc7XG5pbXBvcnQgeyBkZXZpY2VzLCBnZXRNaWJQcm90b3R5cGUsIElEZXZpY2UgfSBmcm9tICdAbmlidXMvY29yZS9saWIvbWliJztcbmltcG9ydCB7IGdldE5pYnVzVGltZW91dCwgTmlidXNDb25uZWN0aW9uIH0gZnJvbSAnQG5pYnVzL2NvcmUvbGliL25pYnVzJztcbmltcG9ydCB7IFNhcnBRdWVyeVR5cGUgfSBmcm9tICdAbmlidXMvY29yZS9saWIvc2FycCc7XG5cbnR5cGUgUm93VHlwZSA9IHtcbiAgZGlzcGxheU5hbWU6IHN0cmluZyxcbiAgdmFsdWU6IGFueSxcbiAga2V5OiBzdHJpbmcsXG59O1xuXG5jb25zdCBkZWJ1ZyA9IGRlYnVnRmFjdG9yeSgnbmlidXM6ZHVtcCcpO1xubGV0IGNvdW50ID0gMDtcblxuYXN5bmMgZnVuY3Rpb24gZHVtcERldmljZShcbiAgYWRkcmVzczogQWRkcmVzcyxcbiAgY29ubmVjdGlvbjogTmlidXNDb25uZWN0aW9uLFxuICBhcmd2OiBBcmd1bWVudHM8RHVtcE9wdHM+LFxuICBtaWI/OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgcmF3ID0gYXJndi5yYXc7XG4gIGNvbnN0IGNvbXBhY3QgPSBhcmd2LmNvbXBhY3Q7XG5cbiAgbGV0IGRldmljZTogSURldmljZTtcbiAgaWYgKCFtaWIpIHtcbiAgICBjb25zdCBbdmVyc2lvbiwgdHlwZV0gPSBhd2FpdCBjb25uZWN0aW9uLmdldFZlcnNpb24oYWRkcmVzcyk7XG4gICAgZGV2aWNlID0gZGV2aWNlcy5jcmVhdGUoYWRkcmVzcywgdHlwZSEsIHZlcnNpb24pO1xuICB9IGVsc2Uge1xuICAgIGRldmljZSA9IGRldmljZXMuY3JlYXRlKGFkZHJlc3MsIG1pYik7XG4gIH1cbiAgZGV2aWNlLmNvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICBsZXQgaWRzOiBudW1iZXJbXSA9IFtdO1xuICBpZiAoYXJndi5uYW1lKSB7XG4gICAgaWRzID0gYXJndi5uYW1lLm1hcChuYW1lID0+IGRldmljZS5nZXRJZChuYW1lKSk7XG4gIH1cbiAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBkZXZpY2UucmVhZCguLi5pZHMpO1xuICBjb25zdCByb3dzOiBSb3dUeXBlW10gPSBPYmplY3Qua2V5cyhyZXN1bHQpXG4gICAgLm1hcCgoa2V5KSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHJhdyA/IGRldmljZS5nZXRFcnJvcihrZXkpIHx8IGRldmljZS5nZXRSYXdWYWx1ZShrZXkpIDogcmVzdWx0W2tleV07XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZSxcbiAgICAgICAga2V5LFxuICAgICAgICBkaXNwbGF5TmFtZTogUmVmbGVjdC5nZXRNZXRhZGF0YSgnZGlzcGxheU5hbWUnLCBkZXZpY2UsIGtleSksXG4gICAgICB9O1xuICAgIH0pO1xuICBjb25zdCBwcm90byA9IFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YoZGV2aWNlKTtcbiAgZGV2aWNlLnJlbGVhc2UoKTtcbiAgY29uc3QgY2F0ZWdvcmllcyA9IF8uZ3JvdXBCeShcbiAgICByb3dzLFxuICAgICh7IGtleSB9KSA9PiBSZWZsZWN0LmdldE1ldGFkYXRhKCdjYXRlZ29yeScsIHByb3RvLCBrZXkpIHx8ICcnLFxuICApO1xuICBjb25zb2xlLmluZm8oYCDQo9GB0YLRgNC+0LnRgdGC0LLQviAke1JlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYicsIHByb3RvKX0gWyR7YWRkcmVzcy50b1N0cmluZygpfV1gKTtcbiAgY29uc3QgdGFibGUgPSBuZXcgVGFibGUoe1xuICAgIGhlYWQ6IFsn0J3QsNC30LLQsNC90LjQtScsICfQl9C90LDRh9C10L3QuNC1JywgJ9CY0LzRjyddLFxuICAgIHN0eWxlOiB7IGNvbXBhY3QgfSxcbiAgICB3b3JkV3JhcDogdHJ1ZSxcbiAgfSkgYXMgSG9yaXpvbnRhbFRhYmxlO1xuICBjb25zdCB0b1JvdyA9ICh7IGRpc3BsYXlOYW1lLCB2YWx1ZSwga2V5IH06IFJvd1R5cGUpID0+IHtcbiAgICBsZXQgdmFsO1xuICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5lcnJvcikge1xuICAgICAgdmFsID0gY2hhbGsucmVkKHZhbHVlLmVycm9yKTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHZhbHVlLmVycmNvZGUpIHtcbiAgICAgIHZhbCA9IGNoYWxrLnJlZChgZXJyY29kZTogJHt2YWx1ZS5lcnJjb2RlfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWwgPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICBpZiAoIVJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2lzV3JpdGFibGUnLCBwcm90bywga2V5KSkge1xuICAgICAgICB2YWwgPSBjaGFsay5ncmV5KHZhbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbZGlzcGxheU5hbWUsIHZhbCwga2V5XTtcbiAgfTtcbiAgT2JqZWN0LmtleXMoY2F0ZWdvcmllcykuZm9yRWFjaCgoY2F0ZWdvcnkpID0+IHtcbiAgICBjb25zdCByb3dzID0gY2F0ZWdvcmllc1tjYXRlZ29yeV0gYXMgUm93VHlwZVtdO1xuICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgdGFibGUucHVzaChbe1xuICAgICAgICBjb2xTcGFuOiAzLFxuICAgICAgICBjb250ZW50OiBjaGFsay55ZWxsb3coY2F0ZWdvcnkudG9VcHBlckNhc2UoKSksXG4gICAgICB9XSk7XG4gICAgfVxuICAgIHRhYmxlLnB1c2goLi4ucm93cy5tYXAodG9Sb3cpKTtcbiAgfSk7XG4gIGNvbnNvbGUuaW5mbyh0YWJsZS50b1N0cmluZygpKTtcbn1cblxuZnVuY3Rpb24gZmluZERldmljZXMobWliOiBzdHJpbmcsIGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbiwgYXJndjogQXJndW1lbnRzPER1bXBPcHRzPikge1xuICBjb3VudCArPSAxO1xuICBjb25zdCBwcm90byA9IGdldE1pYlByb3RvdHlwZShtaWIpO1xuICBjb25zdCB0eXBlID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnZGV2aWNlVHlwZScsIHByb3RvKSBhcyBudW1iZXI7XG4gIGNvbm5lY3Rpb24uZmluZEJ5VHlwZSh0eXBlKS5jYXRjaChlID0+IGRlYnVnKCdlcnJvciB3aGlsZSBmaW5kQnlUeXBlJywgZS5zdGFjaykpO1xuICBjb25uZWN0aW9uLm9uKCdzYXJwJywgKGRhdGFncmFtKSA9PiB7XG4gICAgY291bnQgKz0gMTtcbiAgICBpZiAoZGF0YWdyYW0ucXVlcnlUeXBlICE9PSBTYXJwUXVlcnlUeXBlLkJ5VHlwZSB8fCBkYXRhZ3JhbS5kZXZpY2VUeXBlICE9PSB0eXBlKSByZXR1cm47XG4gICAgY29uc3QgYWRkcmVzcyA9IG5ldyBBZGRyZXNzKGRhdGFncmFtLm1hYyk7XG4gICAgZHVtcERldmljZShhZGRyZXNzLCBjb25uZWN0aW9uLCBhcmd2LCBtaWIpLmNhdGNoKFxuICAgICAgLy8gKCkgPT4ge30sXG4gICAgICBlID0+IGNvbnNvbGUuZXJyb3IoJ2Vycm9yIHdoaWxlIGR1bXA6JywgZS5tZXNzYWdlKSxcbiAgICApO1xuICB9KTtcbn1cblxudHlwZSBEdW1wT3B0cyA9IENvbW1vbk9wdHM7XG5cbmNvbnN0IGR1bXBDb21tYW5kOiBDb21tYW5kTW9kdWxlPENvbW1vbk9wdHMsIER1bXBPcHRzPiA9IHtcbiAgY29tbWFuZDogJ2R1bXAnLFxuICBkZXNjcmliZTogJ9CS0YvQtNCw0YLRjCDQtNCw0LzQv9GLINGD0YHRgtGA0L7QudGB0YLQsicsXG4gIGJ1aWxkZXI6IGFyZ3YgPT4gYXJndlxuICAgIC5jaGVjaygoYXJndikgPT4ge1xuICAgICAgaWYgKGFyZ3YuaWQgJiYgKCFhcmd2Lm1hYyAmJiAhYXJndi5taWIpKSB7XG4gICAgICAgIHRocm93IGDQlNCw0L3QvdGL0Lkg0LDRgNCz0YPQvNC10L3RgiDRgtGA0LXQsdGD0LXRgiDRgdC70LXQtNGD0Y7RidC40Lkg0LTQvtC/0L7Qu9C90LjRgtC10LvRjNC90YvQuSDQsNGA0LPRg9C80LXQvdGCOlxuIGlkIC0+IG1pYiDQuNC70LggaWQgLT4gbWFjYDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pLFxuICBoYW5kbGVyOiBhcmd2ID0+IG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBjbG9zZSA9IChlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgIGlmIChlcnIpIHJlamVjdChlcnIpOyBlbHNlIHJlc29sdmUoKTtcbiAgICB9O1xuICAgIGNvbnN0IG1hYyA9IGFyZ3YubWFjICYmIG5ldyBBZGRyZXNzKGFyZ3YubWFjKTtcbiAgICBjb3VudCA9IGF3YWl0IHNlc3Npb24uc3RhcnQoKTtcbiAgICAvLyDQndCwIFdpbmRvd3Mg0YHQu9C+0LbQvdC10LUg0LzQtdGC0L7QtCDQvtC/0YDQtdC00LXQu9C10L3QuNGPINC4INC30LDQvdC40LzQsNC10YIg0LHQvtC70YzRiNC1INCy0YDQtdC80LXQvdC4XG4gICAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgIGNvdW50ICo9IDI7XG4gICAgfVxuICAgIHNlc3Npb24ub24oJ2ZvdW5kJywgYXN5bmMgKHsgYWRkcmVzcywgY29ubmVjdGlvbiB9KSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoY29ubmVjdGlvbi5kZXNjcmlwdGlvbi5saW5rKSB7XG4gICAgICAgICAgaWYgKG1hYykge1xuICAgICAgICAgICAgY291bnQgKz0gMTtcbiAgICAgICAgICAgIGF3YWl0IGR1bXBEZXZpY2UobWFjLCBjb25uZWN0aW9uLCBhcmd2KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGFyZ3YubWliKSB7XG4gICAgICAgICAgICBmaW5kRGV2aWNlcyhhcmd2Lm1pYiEsIGNvbm5lY3Rpb24sIGFyZ3YpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoKCFtYWMgfHwgbWFjLmVxdWFscyhhZGRyZXNzKSlcbiAgICAgICAgICAmJiAoIWFyZ3YubWliIHx8IGFyZ3YubWliID09PSBjb25uZWN0aW9uLmRlc2NyaXB0aW9uLm1pYikpIHtcbiAgICAgICAgICBhd2FpdCBkdW1wRGV2aWNlKGFkZHJlc3MsIGNvbm5lY3Rpb24sIGFyZ3YsIGNvbm5lY3Rpb24uZGVzY3JpcHRpb24ubWliKTtcbiAgICAgICAgfVxuICAgICAgICBjb3VudCAtPSAxO1xuICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhjbG9zZSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2xvc2UoZS5tZXNzYWdlIHx8IGUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgd2FpdCA9ICgpID0+IHtcbiAgICAgIGNvdW50IC09IDE7XG4gICAgICBpZiAoY291bnQgPiAwKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdhaXQsIGdldE5pYnVzVGltZW91dCgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNsb3NlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxldCB0aW1lb3V0ID0gc2V0VGltZW91dCh3YWl0LCBnZXROaWJ1c1RpbWVvdXQoKSk7XG4gIH0pLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgZHVtcENvbW1hbmQ7XG4iXX0=