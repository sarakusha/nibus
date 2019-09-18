"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeAddressHandler = void 0;

require("source-map-support/register");

var _mib = require("@nibus/core/lib/mib");

var _core = _interopRequireWildcard(require("@nibus/core"));

var _nibus = require("@nibus/core/lib/nibus");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGkvaGFuZGxlcnMudHMiXSwibmFtZXMiOlsibWFrZUFkZHJlc3NIYW5kbGVyIiwiYWN0aW9uIiwiYnJlYWtvdXQiLCJhcmdzIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJoYXNGb3VuZCIsImNsb3NlIiwiZXJyIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dCIsInNlc3Npb24iLCJtYWMiLCJBZGRyZXNzIiwiY291bnQiLCJzdGFydCIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInBlcmZvcm0iLCJjb25uZWN0aW9uIiwibWliT3JUeXBlIiwidmVyc2lvbiIsImRldmljZSIsImRldmljZXMiLCJjcmVhdGUiLCJvbiIsImFkZHJlc3MiLCJlcXVhbHMiLCJkZXNjcmlwdGlvbiIsIm1pYiIsIndhaXQiLCJ0eXBlIiwibGluayIsImdldFZlcnNpb24iLCJlIiwibWVzc2FnZSIsIm5leHRUaWNrIiwic2V0VGltZW91dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBV0E7O0FBQ0E7O0FBQ0E7Ozs7OztBQVNBLE1BQU1BLGtCQUFrQixHQUFHLENBQzFCQyxNQUQwQixFQUNIQyxRQUFRLEdBQUcsS0FEUixLQUV4QkMsSUFBRCxJQUNFLElBQUlDLE9BQUosQ0FBWSxPQUFPQyxPQUFQLEVBQWdCQyxNQUFoQixLQUEyQjtBQUNyQyxNQUFJQyxRQUFRLEdBQUcsS0FBZjs7QUFDQSxRQUFNQyxLQUFLLEdBQUlDLEdBQUQsSUFBa0I7QUFDOUJDLElBQUFBLFlBQVksQ0FBQ0MsT0FBRCxDQUFaOztBQUNBQyxrQkFBUUosS0FBUjs7QUFDQSxRQUFJQyxHQUFHLElBQUksQ0FBQ0YsUUFBWixFQUFzQjtBQUNwQixhQUFPRCxNQUFNLENBQUNHLEdBQUcsSUFBSSx1QkFBUixDQUFiO0FBQ0Q7O0FBQ0RKLElBQUFBLE9BQU87QUFDUixHQVBEOztBQVFBLFFBQU1RLEdBQUcsR0FBRyxJQUFJQyxhQUFKLENBQVlYLElBQUksQ0FBQ1UsR0FBakIsQ0FBWjtBQUNBLE1BQUlFLEtBQUssR0FBRyxNQUFNSCxjQUFRSSxLQUFSLEVBQWxCOztBQUNBLE1BQUliLElBQUksQ0FBQ1EsT0FBTCxJQUFnQlIsSUFBSSxDQUFDUSxPQUFMLEtBQWlCLGdDQUFvQixJQUF6RCxFQUErRDtBQUM3RCxnQ0FBZ0JSLElBQUksQ0FBQ1EsT0FBTCxHQUFlLElBQS9CO0FBQ0QsR0Fkb0MsQ0FlckM7OztBQUNBLE1BQUlNLE9BQU8sQ0FBQ0MsUUFBUixLQUFxQixPQUF6QixFQUFrQztBQUNoQ0gsSUFBQUEsS0FBSyxJQUFJLENBQVQ7QUFDRCxHQWxCb0MsQ0FtQnJDOzs7QUFFQSxRQUFNSSxPQUFPLEdBQUcsT0FBT0MsVUFBUCxFQUFvQ0MsU0FBcEMsRUFBb0RDLE9BQXBELEtBQXlFO0FBQ3ZGWixJQUFBQSxZQUFZLENBQUNDLE9BQUQsQ0FBWjs7QUFDQSxVQUFNWSxNQUFNLEdBQUdDLGFBQVFDLE1BQVIsQ0FBZVosR0FBZixFQUFvQlEsU0FBcEIsRUFBK0JDLE9BQS9CLENBQWY7O0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0gsVUFBUCxHQUFvQkEsVUFBcEI7QUFDQSxVQUFNbkIsTUFBTSxDQUFDc0IsTUFBRCxFQUFTcEIsSUFBVCxDQUFaO0FBQ0FJLElBQUFBLFFBQVEsR0FBRyxJQUFYO0FBQ0QsR0FORDs7QUFRQUssZ0JBQVFjLEVBQVIsQ0FBVyxPQUFYLEVBQW9CLE9BQU87QUFBRUMsSUFBQUEsT0FBRjtBQUFXUCxJQUFBQTtBQUFYLEdBQVAsS0FBbUM7QUFDckQsUUFBSTtBQUNGLFVBQUlPLE9BQU8sQ0FBQ0MsTUFBUixDQUFlZixHQUFmLEtBQXVCTyxVQUFVLENBQUNTLFdBQVgsQ0FBdUJDLEdBQWxELEVBQXVEO0FBQ3JELFlBQUksQ0FBQzNCLElBQUksQ0FBQzJCLEdBQU4sSUFBYTNCLElBQUksQ0FBQzJCLEdBQUwsS0FBYVYsVUFBVSxDQUFDUyxXQUFYLENBQXVCQyxHQUFyRCxFQUEwRDtBQUN4RCxnQkFBTVgsT0FBTyxDQUFDQyxVQUFELEVBQWFBLFVBQVUsQ0FBQ1MsV0FBWCxDQUF1QkMsR0FBcEMsQ0FBYjtBQUNBLGNBQUk1QixRQUFKLEVBQWMsT0FBT00sS0FBSyxFQUFaO0FBQ2R1QixVQUFBQSxJQUFJO0FBQ0w7QUFDRjs7QUFDRCxVQUFJSixPQUFPLENBQUNDLE1BQVIsQ0FBZWYsR0FBZixLQUF1Qk8sVUFBVSxDQUFDUyxXQUFYLENBQXVCRyxJQUE5QyxJQUFzRFosVUFBVSxDQUFDUyxXQUFYLENBQXVCSSxJQUFqRixFQUF1RjtBQUNyRmxCLFFBQUFBLEtBQUssSUFBSSxDQUFUO0FBQ0EsY0FBTSxDQUFDTyxPQUFELEVBQVVVLElBQVYsSUFBa0IsTUFBTVosVUFBVSxDQUFDYyxVQUFYLENBQXNCckIsR0FBdEIsQ0FBOUI7O0FBQ0EsWUFBSW1CLElBQUosRUFBVTtBQUNSLGdCQUFNYixPQUFPLENBQUNDLFVBQUQsRUFBYVksSUFBYixFQUFtQlYsT0FBbkIsQ0FBYjtBQUNBLGNBQUlwQixRQUFKLEVBQWMsT0FBT00sS0FBSyxFQUFaO0FBQ2R1QixVQUFBQSxJQUFJO0FBQ0w7QUFDRjtBQUNGLEtBakJELENBaUJFLE9BQU9JLENBQVAsRUFBVTtBQUNWM0IsTUFBQUEsS0FBSyxDQUFDMkIsQ0FBQyxDQUFDQyxPQUFGLElBQWFELENBQWQsQ0FBTDtBQUNEOztBQUNEcEIsSUFBQUEsS0FBSyxJQUFJLENBQVQ7O0FBQ0EsUUFBSUEsS0FBSyxLQUFLLENBQWQsRUFBaUI7QUFDZkwsTUFBQUEsWUFBWSxDQUFDQyxPQUFELENBQVo7QUFDQU0sTUFBQUEsT0FBTyxDQUFDb0IsUUFBUixDQUFpQjdCLEtBQWpCO0FBQ0Q7QUFDRixHQTFCRDs7QUE0QkEsUUFBTXVCLElBQUksR0FBRyxNQUFNO0FBQ2pCaEIsSUFBQUEsS0FBSyxJQUFJLENBQVQ7O0FBQ0EsUUFBSUEsS0FBSyxHQUFHLENBQVosRUFBZTtBQUNiSixNQUFBQSxPQUFPLEdBQUcyQixVQUFVLENBQUNQLElBQUQsRUFBTyw2QkFBUCxDQUFwQjtBQUNELEtBRkQsTUFFTztBQUNMdkIsTUFBQUEsS0FBSztBQUNOO0FBQ0YsR0FQRDs7QUFTQSxNQUFJRyxPQUFPLEdBQUcyQixVQUFVLENBQUNQLElBQUQsRUFBTyw2QkFBUCxDQUF4QjtBQUNELENBbkVELENBSEoiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmF0YVwiIHByb2plY3QuXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2Ugdmlld1xuICogdGhlIEVVTEEgZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKi9cblxuaW1wb3J0IHsgQXJndW1lbnRzLCBEZWZpbmVkIH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IHsgZGV2aWNlcywgSURldmljZSB9IGZyb20gJ0BuaWJ1cy9jb3JlL2xpYi9taWInO1xuaW1wb3J0IHNlc3Npb24sIHsgQWRkcmVzcyB9IGZyb20gJ0BuaWJ1cy9jb3JlJztcbmltcG9ydCB7IGdldE5pYnVzVGltZW91dCwgTmlidXNDb25uZWN0aW9uLCBzZXROaWJ1c1RpbWVvdXQgfSBmcm9tICdAbmlidXMvY29yZS9saWIvbmlidXMnO1xuaW1wb3J0IHsgQ29tbW9uT3B0cyB9IGZyb20gJy4vb3B0aW9ucyc7XG5cbi8vIGV4cG9ydCB0eXBlIE5pYnVzQ291bnRlciA9IChoYW5kbGVyOiAoY291bnQ6IG51bWJlcikgPT4gbnVtYmVyKSA9PiB2b2lkO1xuXG5pbnRlcmZhY2UgQWN0aW9uRnVuYzxPPiB7XG4gIChkZXZpY2U6IElEZXZpY2UsIGFyZ3M6IEFyZ3VtZW50czxPPik6IFByb21pc2U8YW55Pjtcbn1cblxuY29uc3QgbWFrZUFkZHJlc3NIYW5kbGVyID0gPE8gZXh0ZW5kcyBEZWZpbmVkPENvbW1vbk9wdHMsICdtJyB8ICdtYWMnPj5cbihhY3Rpb246IEFjdGlvbkZ1bmM8Tz4sIGJyZWFrb3V0ID0gZmFsc2UpID0+XG4gIChhcmdzOiBBcmd1bWVudHM8Tz4pID0+XG4gICAgbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgbGV0IGhhc0ZvdW5kID0gZmFsc2U7XG4gICAgICBjb25zdCBjbG9zZSA9IChlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICBzZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIGlmIChlcnIgfHwgIWhhc0ZvdW5kKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIgfHwgJ9Cj0YHRgtGA0L7QudGB0YLQstC+INC90LUg0L3QsNC50LTQtdC90L4nKTtcbiAgICAgICAgfVxuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgY29uc3QgbWFjID0gbmV3IEFkZHJlc3MoYXJncy5tYWMpO1xuICAgICAgbGV0IGNvdW50ID0gYXdhaXQgc2Vzc2lvbi5zdGFydCgpO1xuICAgICAgaWYgKGFyZ3MudGltZW91dCAmJiBhcmdzLnRpbWVvdXQgIT09IGdldE5pYnVzVGltZW91dCgpICogMTAwMCkge1xuICAgICAgICBzZXROaWJ1c1RpbWVvdXQoYXJncy50aW1lb3V0ICogMTAwMCk7XG4gICAgICB9XG4gICAgICAvLyDQndCwIFdpbmRvd3Mg0YHQu9C+0LbQvdC10LUg0LzQtdGC0L7QtCDQvtC/0YDQtdC00LXQu9C10L3QuNGPINC4INC30LDQvdC40LzQsNC10YIg0LHQvtC70YzRiNC1INCy0YDQtdC80LXQvdC4XG4gICAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgICAgICBjb3VudCAqPSAzO1xuICAgICAgfVxuICAgICAgLy8gY29uc3Qgc2V0Q291bnQ6IE5pYnVzQ291bnRlciA9IChoYW5kbGVyID0gKGM6IG51bWJlcikgPT4gYykgPT4gY291bnQgPSBoYW5kbGVyKGNvdW50KTtcblxuICAgICAgY29uc3QgcGVyZm9ybSA9IGFzeW5jIChjb25uZWN0aW9uOiBOaWJ1c0Nvbm5lY3Rpb24sIG1pYk9yVHlwZTogYW55LCB2ZXJzaW9uPzogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgY29uc3QgZGV2aWNlID0gZGV2aWNlcy5jcmVhdGUobWFjLCBtaWJPclR5cGUsIHZlcnNpb24pO1xuICAgICAgICBkZXZpY2UuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgICAgIGF3YWl0IGFjdGlvbihkZXZpY2UsIGFyZ3MpO1xuICAgICAgICBoYXNGb3VuZCA9IHRydWU7XG4gICAgICB9O1xuXG4gICAgICBzZXNzaW9uLm9uKCdmb3VuZCcsIGFzeW5jICh7IGFkZHJlc3MsIGNvbm5lY3Rpb24gfSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChhZGRyZXNzLmVxdWFscyhtYWMpICYmIGNvbm5lY3Rpb24uZGVzY3JpcHRpb24ubWliKSB7XG4gICAgICAgICAgICBpZiAoIWFyZ3MubWliIHx8IGFyZ3MubWliID09PSBjb25uZWN0aW9uLmRlc2NyaXB0aW9uLm1pYikge1xuICAgICAgICAgICAgICBhd2FpdCBwZXJmb3JtKGNvbm5lY3Rpb24sIGNvbm5lY3Rpb24uZGVzY3JpcHRpb24ubWliKTtcbiAgICAgICAgICAgICAgaWYgKGJyZWFrb3V0KSByZXR1cm4gY2xvc2UoKTtcbiAgICAgICAgICAgICAgd2FpdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYWRkcmVzcy5lcXVhbHMobWFjKSAmJiBjb25uZWN0aW9uLmRlc2NyaXB0aW9uLnR5cGUgfHwgY29ubmVjdGlvbi5kZXNjcmlwdGlvbi5saW5rKSB7XG4gICAgICAgICAgICBjb3VudCArPSAxO1xuICAgICAgICAgICAgY29uc3QgW3ZlcnNpb24sIHR5cGVdID0gYXdhaXQgY29ubmVjdGlvbi5nZXRWZXJzaW9uKG1hYyk7XG4gICAgICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgICAgICBhd2FpdCBwZXJmb3JtKGNvbm5lY3Rpb24sIHR5cGUsIHZlcnNpb24pO1xuICAgICAgICAgICAgICBpZiAoYnJlYWtvdXQpIHJldHVybiBjbG9zZSgpO1xuICAgICAgICAgICAgICB3YWl0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY2xvc2UoZS5tZXNzYWdlIHx8IGUpO1xuICAgICAgICB9XG4gICAgICAgIGNvdW50IC09IDE7XG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGNsb3NlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHdhaXQgPSAoKSA9PiB7XG4gICAgICAgIGNvdW50IC09IDE7XG4gICAgICAgIGlmIChjb3VudCA+IDApIHtcbiAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCh3YWl0LCBnZXROaWJ1c1RpbWVvdXQoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbGV0IHRpbWVvdXQgPSBzZXRUaW1lb3V0KHdhaXQsIGdldE5pYnVzVGltZW91dCgpKTtcbiAgICB9KTtcblxuZXhwb3J0IHsgbWFrZUFkZHJlc3NIYW5kbGVyIH07XG4iXX0=