"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeAddressHandler = void 0;

require("source-map-support/register");

var _mib = require("@nibus/core/lib/mib");

var _core = _interopRequireWildcard(require("@nibus/core"));

var _nibus = require("@nibus/core/lib/nibus");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

const makeAddressHandler = (action, breakout = false) => args => new Promise(async (resolve, reject) => {
  let hasFound = false;

  const close = err => {
    clearTimeout(timeout);

    _core.default.close();

    if (err || !hasFound) {
      return reject(err || 'Устройство не найдено');
    }

    resolve();
  };

  const mac = new _core.Address(args.mac);
  let count = await _core.default.start();

  if (args.timeout && args.timeout !== (0, _nibus.getNibusTimeout)() * 1000) {
    (0, _nibus.setNibusTimeout)(args.timeout * 1000);
  } // На Windows сложнее метод определения и занимает больше времени


  if (process.platform === 'win32') {
    count *= 3;
  } // const setCount: NibusCounter = (handler = (c: number) => c) => count = handler(count);


  const perform = async (connection, mibOrType, version) => {
    clearTimeout(timeout);

    const device = _mib.devices.create(mac, mibOrType, version);

    device.connection = connection;
    await action(device, args);
    hasFound = true;
  };

  _core.default.on('found', async ({
    address,
    connection
  }) => {
    try {
      if (address.equals(mac) && connection.description.mib) {
        if (!args.mib || args.mib === connection.description.mib) {
          await perform(connection, connection.description.mib);
          if (breakout) return close();
          wait();
        }
      }

      if (address.equals(mac) && connection.description.type || connection.description.link) {
        count += 1;
        const [version, type] = await connection.getVersion(mac);

        if (type) {
          await perform(connection, type, version);
          if (breakout) return close();
          wait();
        }
      }
    } catch (e) {
      close(e.message || e);
    }

    count -= 1;

    if (count === 0) {
      clearTimeout(timeout);
      process.nextTick(close);
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
});

exports.makeAddressHandler = makeAddressHandler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGkvaGFuZGxlcnMudHMiXSwibmFtZXMiOlsibWFrZUFkZHJlc3NIYW5kbGVyIiwiYWN0aW9uIiwiYnJlYWtvdXQiLCJhcmdzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJoYXNGb3VuZCIsImNsb3NlIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dCIsInNlc3Npb24iLCJtYWMiLCJBZGRyZXNzIiwiY291bnQiLCJzdGFydCIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInBlcmZvcm0iLCJjb25uZWN0aW9uIiwibWliT3JUeXBlIiwidmVyc2lvbiIsImRldmljZSIsImRldmljZXMiLCJjcmVhdGUiLCJvbiIsImFkZHJlc3MiLCJlcXVhbHMiLCJkZXNjcmlwdGlvbiIsIm1pYiIsIndhaXQiLCJ0eXBlIiwibGluayIsImdldFZlcnNpb24iLCJlIiwibWVzc2FnZSIsIm5leHRUaWNrIiwic2V0VGltZW91dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBV0E7O0FBQ0E7O0FBQ0E7Ozs7QUFTQSxNQUFNQSxrQkFBa0IsR0FBRyxDQUMxQkMsTUFEMEIsRUFDSEMsUUFBUSxHQUFHLEtBRFIsS0FFeEJDLElBQUQsSUFDRSxJQUFJQyxPQUFKLENBQVksT0FBT0MsT0FBUCxFQUFnQkMsTUFBaEIsS0FBMkI7QUFDckMsTUFBSUMsUUFBUSxHQUFHLEtBQWY7O0FBQ0EsUUFBTUMsS0FBSyxHQUFJQyxHQUFELElBQWtCO0FBQzlCQyxJQUFBQSxZQUFZLENBQUNDLE9BQUQsQ0FBWjs7QUFDQUMsa0JBQVFKLEtBQVI7O0FBQ0EsUUFBSUMsR0FBRyxJQUFJLENBQUNGLFFBQVosRUFBc0I7QUFDcEIsYUFBT0QsTUFBTSxDQUFDRyxHQUFHLElBQUksdUJBQVIsQ0FBYjtBQUNEOztBQUNESixJQUFBQSxPQUFPO0FBQ1IsR0FQRDs7QUFRQSxRQUFNUSxHQUFHLEdBQUcsSUFBSUMsYUFBSixDQUFZWCxJQUFJLENBQUNVLEdBQWpCLENBQVo7QUFDQSxN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TUFBSUcsT0FBTyxHQUFHMkIsVUFBVSxDQUFDUCxJQUFELEVBQU8sNkJBQVAsQ0FBeEI7QUFDRCxDQW5FRCxDQUhKIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cywgRGVmaW5lZCB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCB7IGRldmljZXMsIElEZXZpY2UgfSBmcm9tICdAbmlidXMvY29yZS9saWIvbWliJztcbmltcG9ydCBzZXNzaW9uLCB7IEFkZHJlc3MgfSBmcm9tICdAbmlidXMvY29yZSc7XG5pbXBvcnQgeyBnZXROaWJ1c1RpbWVvdXQsIE5pYnVzQ29ubmVjdGlvbiwgc2V0TmlidXNUaW1lb3V0IH0gZnJvbSAnQG5pYnVzL2NvcmUvbGliL25pYnVzJztcbmltcG9ydCB7IENvbW1vbk9wdHMgfSBmcm9tICcuL29wdGlvbnMnO1xuXG4vLyBleHBvcnQgdHlwZSBOaWJ1c0NvdW50ZXIgPSAoaGFuZGxlcjogKGNvdW50OiBudW1iZXIpID0+IG51bWJlcikgPT4gdm9pZDtcblxuaW50ZXJmYWNlIEFjdGlvbkZ1bmM8Tz4ge1xuICAoZGV2aWNlOiBJRGV2aWNlLCBhcmdzOiBBcmd1bWVudHM8Tz4pOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5jb25zdCBtYWtlQWRkcmVzc0hhbmRsZXIgPSA8TyBleHRlbmRzIERlZmluZWQ8Q29tbW9uT3B0cywgJ20nIHwgJ21hYyc+PlxuKGFjdGlvbjogQWN0aW9uRnVuYzxPPiwgYnJlYWtvdXQgPSBmYWxzZSkgPT5cbiAgKGFyZ3M6IEFyZ3VtZW50czxPPikgPT5cbiAgICBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBsZXQgaGFzRm91bmQgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGNsb3NlID0gKGVycj86IHN0cmluZykgPT4ge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHNlc3Npb24uY2xvc2UoKTtcbiAgICAgICAgaWYgKGVyciB8fCAhaGFzRm91bmQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KGVyciB8fCAn0KPRgdGC0YDQvtC50YHRgtCy0L4g0L3QtSDQvdCw0LnQtNC10L3QvicpO1xuICAgICAgICB9XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBtYWMgPSBuZXcgQWRkcmVzcyhhcmdzLm1hYyk7XG4gICAgICBsZXQgY291bnQgPSBhd2FpdCBzZXNzaW9uLnN0YXJ0KCk7XG4gICAgICBpZiAoYXJncy50aW1lb3V0ICYmIGFyZ3MudGltZW91dCAhPT0gZ2V0TmlidXNUaW1lb3V0KCkgKiAxMDAwKSB7XG4gICAgICAgIHNldE5pYnVzVGltZW91dChhcmdzLnRpbWVvdXQgKiAxMDAwKTtcbiAgICAgIH1cbiAgICAgIC8vINCd0LAgV2luZG93cyDRgdC70L7QttC90LXQtSDQvNC10YLQvtC0INC+0L/RgNC10LTQtdC70LXQvdC40Y8g0Lgg0LfQsNC90LjQvNCw0LXRgiDQsdC+0LvRjNGI0LUg0LLRgNC10LzQtdC90LhcbiAgICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgICAgIGNvdW50ICo9IDM7XG4gICAgICB9XG4gICAgICAvLyBjb25zdCBzZXRDb3VudDogTmlidXNDb3VudGVyID0gKGhhbmRsZXIgPSAoYzogbnVtYmVyKSA9PiBjKSA9PiBjb3VudCA9IGhhbmRsZXIoY291bnQpO1xuXG4gICAgICBjb25zdCBwZXJmb3JtID0gYXN5bmMgKGNvbm5lY3Rpb246IE5pYnVzQ29ubmVjdGlvbiwgbWliT3JUeXBlOiBhbnksIHZlcnNpb24/OiBudW1iZXIpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICBjb25zdCBkZXZpY2UgPSBkZXZpY2VzLmNyZWF0ZShtYWMsIG1pYk9yVHlwZSwgdmVyc2lvbik7XG4gICAgICAgIGRldmljZS5jb25uZWN0aW9uID0gY29ubmVjdGlvbjtcbiAgICAgICAgYXdhaXQgYWN0aW9uKGRldmljZSwgYXJncyk7XG4gICAgICAgIGhhc0ZvdW5kID0gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIHNlc3Npb24ub24oJ2ZvdW5kJywgYXN5bmMgKHsgYWRkcmVzcywgY29ubmVjdGlvbiB9KSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKGFkZHJlc3MuZXF1YWxzKG1hYykgJiYgY29ubmVjdGlvbi5kZXNjcmlwdGlvbi5taWIpIHtcbiAgICAgICAgICAgIGlmICghYXJncy5taWIgfHwgYXJncy5taWIgPT09IGNvbm5lY3Rpb24uZGVzY3JpcHRpb24ubWliKSB7XG4gICAgICAgICAgICAgIGF3YWl0IHBlcmZvcm0oY29ubmVjdGlvbiwgY29ubmVjdGlvbi5kZXNjcmlwdGlvbi5taWIpO1xuICAgICAgICAgICAgICBpZiAoYnJlYWtvdXQpIHJldHVybiBjbG9zZSgpO1xuICAgICAgICAgICAgICB3YWl0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhZGRyZXNzLmVxdWFscyhtYWMpICYmIGNvbm5lY3Rpb24uZGVzY3JpcHRpb24udHlwZSB8fCBjb25uZWN0aW9uLmRlc2NyaXB0aW9uLmxpbmspIHtcbiAgICAgICAgICAgIGNvdW50ICs9IDE7XG4gICAgICAgICAgICBjb25zdCBbdmVyc2lvbiwgdHlwZV0gPSBhd2FpdCBjb25uZWN0aW9uLmdldFZlcnNpb24obWFjKTtcbiAgICAgICAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgICAgICAgIGF3YWl0IHBlcmZvcm0oY29ubmVjdGlvbiwgdHlwZSwgdmVyc2lvbik7XG4gICAgICAgICAgICAgIGlmIChicmVha291dCkgcmV0dXJuIGNsb3NlKCk7XG4gICAgICAgICAgICAgIHdhaXQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBjbG9zZShlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICAgIH1cbiAgICAgICAgY291bnQgLT0gMTtcbiAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soY2xvc2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgd2FpdCA9ICgpID0+IHtcbiAgICAgICAgY291bnQgLT0gMTtcbiAgICAgICAgaWYgKGNvdW50ID4gMCkge1xuICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdhaXQsIGdldE5pYnVzVGltZW91dCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBsZXQgdGltZW91dCA9IHNldFRpbWVvdXQod2FpdCwgZ2V0TmlidXNUaW1lb3V0KCkpO1xuICAgIH0pO1xuXG5leHBvcnQgeyBtYWtlQWRkcmVzc0hhbmRsZXIgfTtcbiJdfQ==