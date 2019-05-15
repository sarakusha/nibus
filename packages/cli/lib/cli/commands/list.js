"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _lodash = _interopRequireDefault(require("lodash"));

var _tableLayout = _interopRequireDefault(require("table-layout"));

var _core = require("@nibus/core");

var _ipc = require("@nibus/core/lib/ipc");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// @ts-ignore
const listCommand = {
  command: 'list',
  describe: 'Показать список доступных устройств',
  builder: {},
  handler: async () => new Promise((resolve, reject) => {
    const socket = _ipc.Client.connect(_core.PATH);

    let resolved = false;
    let error;
    socket.once('close', () => {
      resolved ? resolve() : reject(error && error.message);
    });
    socket.on('ports', ports => {
      // debug('ports', ports);
      const rows = _lodash.default.sortBy(ports, [_lodash.default.property('description.category')]).map(({
        portInfo: {
          manufacturer,
          category,
          device,
          comName
        }
      }) => ({
        manufacturer,
        category,
        device,
        comName
      }));

      const table = new _tableLayout.default(rows, {
        maxWidth: 80
      });
      console.info(table.toString());
      resolved = true;
      socket.destroy();
    });
    socket.on('error', err => {
      if (err.code === 'ENOENT') {
        error = {
          message: 'Сервис не запущен'
        };
      } else {
        error = err;
      }
    });
  }) // const rows = _.sortBy<IKnownPort>(ports, [_.property('manufacturer'),
  // _.property('category')]) .map(({ manufacturer, category, device, comName }) => ({
  // manufacturer, category, device, comName, })); const table = new Table(rows, { maxWidth: 80
  // }); console.info(table.toString());

};
var _default = listCommand;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvbGlzdC50cyJdLCJuYW1lcyI6WyJsaXN0Q29tbWFuZCIsImNvbW1hbmQiLCJkZXNjcmliZSIsImJ1aWxkZXIiLCJoYW5kbGVyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJzb2NrZXQiLCJDbGllbnQiLCJjb25uZWN0IiwiUEFUSCIsInJlc29sdmVkIiwiZXJyb3IiLCJvbmNlIiwibWVzc2FnZSIsIm9uIiwicG9ydHMiLCJyb3dzIiwiXyIsInNvcnRCeSIsInByb3BlcnR5IiwibWFwIiwicG9ydEluZm8iLCJtYW51ZmFjdHVyZXIiLCJjYXRlZ29yeSIsImRldmljZSIsImNvbU5hbWUiLCJ0YWJsZSIsIlRhYmxlIiwibWF4V2lkdGgiLCJjb25zb2xlIiwiaW5mbyIsInRvU3RyaW5nIiwiZGVzdHJveSIsImVyciIsImNvZGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQVdBOztBQUVBOztBQUNBOztBQUNBOzs7O0FBSEE7QUFLQSxNQUFNQSxXQUEwQixHQUFHO0FBQ2pDQyxFQUFBQSxPQUFPLEVBQUUsTUFEd0I7QUFFakNDLEVBQUFBLFFBQVEsRUFBRSxxQ0FGdUI7QUFHakNDLEVBQUFBLE9BQU8sRUFBRSxFQUh3QjtBQUlqQ0MsRUFBQUEsT0FBTyxFQUFFLFlBQVksSUFBSUMsT0FBSixDQUFZLENBQUNDLE9BQUQsRUFBVUMsTUFBVixLQUFxQjtBQUNwRCxVQUFNQyxNQUFNLEdBQUdDLFlBQU9DLE9BQVAsQ0FBZUMsVUFBZixDQUFmOztBQUNBLFFBQUlDLFFBQVEsR0FBRyxLQUFmO0FBQ0EsUUFBSUMsS0FBSjtBQUNBTCxJQUFBQSxNQUFNLENBQUNNLElBQVAsQ0FBWSxPQUFaLEVBQXFCLE1BQU07QUFDekJGLE1BQUFBLFFBQVEsR0FBR04sT0FBTyxFQUFWLEdBQWVDLE1BQU0sQ0FBQ00sS0FBSyxJQUFJQSxLQUFLLENBQUNFLE9BQWhCLENBQTdCO0FBQ0QsS0FGRDtBQUdBUCxJQUFBQSxNQUFNLENBQUNRLEVBQVAsQ0FBVSxPQUFWLEVBQW9CQyxLQUFELElBQXVCO0FBQ3hDO0FBQ0EsWUFBTUMsSUFBSSxHQUFHQyxnQkFBRUMsTUFBRixDQUFTSCxLQUFULEVBQWdCLENBQUNFLGdCQUFFRSxRQUFGLENBQVcsc0JBQVgsQ0FBRCxDQUFoQixFQUNWQyxHQURVLENBQ04sQ0FBQztBQUFFQyxRQUFBQSxRQUFRLEVBQUU7QUFBRUMsVUFBQUEsWUFBRjtBQUFnQkMsVUFBQUEsUUFBaEI7QUFBMEJDLFVBQUFBLE1BQTFCO0FBQWtDQyxVQUFBQTtBQUFsQztBQUFaLE9BQUQsTUFBZ0U7QUFDbkVILFFBQUFBLFlBRG1FO0FBRW5FQyxRQUFBQSxRQUZtRTtBQUduRUMsUUFBQUEsTUFIbUU7QUFJbkVDLFFBQUFBO0FBSm1FLE9BQWhFLENBRE0sQ0FBYjs7QUFPQSxZQUFNQyxLQUFLLEdBQUcsSUFBSUMsb0JBQUosQ0FBVVgsSUFBVixFQUFnQjtBQUM1QlksUUFBQUEsUUFBUSxFQUFFO0FBRGtCLE9BQWhCLENBQWQ7QUFHQUMsTUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWFKLEtBQUssQ0FBQ0ssUUFBTixFQUFiO0FBQ0FyQixNQUFBQSxRQUFRLEdBQUcsSUFBWDtBQUNBSixNQUFBQSxNQUFNLENBQUMwQixPQUFQO0FBQ0QsS0FmRDtBQWdCQTFCLElBQUFBLE1BQU0sQ0FBQ1EsRUFBUCxDQUFVLE9BQVYsRUFBb0JtQixHQUFELElBQVM7QUFDMUIsVUFBS0EsR0FBRCxDQUFhQyxJQUFiLEtBQXNCLFFBQTFCLEVBQW9DO0FBQ2xDdkIsUUFBQUEsS0FBSyxHQUFHO0FBQUVFLFVBQUFBLE9BQU8sRUFBRTtBQUFYLFNBQVI7QUFDRCxPQUZELE1BRU87QUFDTEYsUUFBQUEsS0FBSyxHQUFHc0IsR0FBUjtBQUNEO0FBQ0YsS0FORDtBQU9ELEdBOUJvQixDQUpZLENBb0NuQztBQUNBO0FBQ0E7QUFDQTs7QUF2Q21DLENBQW5DO2VBMENlbkMsVyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG5pbXBvcnQgeyBDb21tYW5kTW9kdWxlIH0gZnJvbSAneWFyZ3MnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIEB0cy1pZ25vcmVcbmltcG9ydCBUYWJsZSBmcm9tICd0YWJsZS1sYXlvdXQnO1xuaW1wb3J0IHsgUEFUSCB9IGZyb20gJ0BuaWJ1cy9jb3JlJztcbmltcG9ydCB7IENsaWVudCwgSVBvcnRBcmcgfSBmcm9tICdAbmlidXMvY29yZS9saWIvaXBjJztcblxuY29uc3QgbGlzdENvbW1hbmQ6IENvbW1hbmRNb2R1bGUgPSB7XG4gIGNvbW1hbmQ6ICdsaXN0JyxcbiAgZGVzY3JpYmU6ICfQn9C+0LrQsNC30LDRgtGMINGB0L/QuNGB0L7QuiDQtNC+0YHRgtGD0L/QvdGL0YUg0YPRgdGC0YDQvtC50YHRgtCyJyxcbiAgYnVpbGRlcjoge30sXG4gIGhhbmRsZXI6IGFzeW5jICgpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBzb2NrZXQgPSBDbGllbnQuY29ubmVjdChQQVRIKTtcbiAgICBsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcbiAgICBsZXQgZXJyb3I6IGFueTtcbiAgICBzb2NrZXQub25jZSgnY2xvc2UnLCAoKSA9PiB7XG4gICAgICByZXNvbHZlZCA/IHJlc29sdmUoKSA6IHJlamVjdChlcnJvciAmJiBlcnJvci5tZXNzYWdlKTtcbiAgICB9KTtcbiAgICBzb2NrZXQub24oJ3BvcnRzJywgKHBvcnRzOiBJUG9ydEFyZ1tdKSA9PiB7XG4gICAgICAvLyBkZWJ1ZygncG9ydHMnLCBwb3J0cyk7XG4gICAgICBjb25zdCByb3dzID0gXy5zb3J0QnkocG9ydHMsIFtfLnByb3BlcnR5KCdkZXNjcmlwdGlvbi5jYXRlZ29yeScpXSlcbiAgICAgICAgLm1hcCgoeyBwb3J0SW5mbzogeyBtYW51ZmFjdHVyZXIsIGNhdGVnb3J5LCBkZXZpY2UsIGNvbU5hbWUgfSB9KSA9PiAoe1xuICAgICAgICAgIG1hbnVmYWN0dXJlcixcbiAgICAgICAgICBjYXRlZ29yeSxcbiAgICAgICAgICBkZXZpY2UsXG4gICAgICAgICAgY29tTmFtZSxcbiAgICAgICAgfSkpO1xuICAgICAgY29uc3QgdGFibGUgPSBuZXcgVGFibGUocm93cywge1xuICAgICAgICBtYXhXaWR0aDogODAsXG4gICAgICB9KTtcbiAgICAgIGNvbnNvbGUuaW5mbyh0YWJsZS50b1N0cmluZygpKTtcbiAgICAgIHJlc29sdmVkID0gdHJ1ZTtcbiAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgfSk7XG4gICAgc29ja2V0Lm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgIGlmICgoZXJyIGFzIGFueSkuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgZXJyb3IgPSB7IG1lc3NhZ2U6ICfQodC10YDQstC40YEg0L3QtSDQt9Cw0L/Rg9GJ0LXQvScgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgfVxuICAgIH0pO1xuICB9KSxcblxuLy8gY29uc3Qgcm93cyA9IF8uc29ydEJ5PElLbm93blBvcnQ+KHBvcnRzLCBbXy5wcm9wZXJ0eSgnbWFudWZhY3R1cmVyJyksXG4vLyBfLnByb3BlcnR5KCdjYXRlZ29yeScpXSkgLm1hcCgoeyBtYW51ZmFjdHVyZXIsIGNhdGVnb3J5LCBkZXZpY2UsIGNvbU5hbWUgfSkgPT4gKHtcbi8vIG1hbnVmYWN0dXJlciwgY2F0ZWdvcnksIGRldmljZSwgY29tTmFtZSwgfSkpOyBjb25zdCB0YWJsZSA9IG5ldyBUYWJsZShyb3dzLCB7IG1heFdpZHRoOiA4MFxuLy8gfSk7IGNvbnNvbGUuaW5mbyh0YWJsZS50b1N0cmluZygpKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGxpc3RDb21tYW5kO1xuIl19