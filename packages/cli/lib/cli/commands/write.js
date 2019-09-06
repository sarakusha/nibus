"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.action = action;
exports.default = void 0;

require("source-map-support/register");

var _handlers = require("../handlers");

async function action(device, args) {
  const vars = args._.slice(1).map(arg => arg.split('=', 2)).filter(([name, value]) => name !== '' && value !== '').map(([name, value]) => [device.getName(name), device.getId(name), value]);

  vars.forEach(([name,, value]) => {
    device[name] = value;
  });

  if (vars.length === 0) {
    return [];
  }

  args.quiet || console.log(`Writing to ${Reflect.getMetadata('mib', device)} [${device.address}]`);
  return device.write(...vars.map(([, id]) => id)).then(ids => {
    const names = ids.map(id => device.getName(id));

    if (!args.quiet) {
      names.forEach(name => console.log(` - ${name} = ${JSON.stringify(device[name])}`));
    }

    return names;
  });
}

const writeCommand = {
  command: 'write',
  describe: 'запись переменных в устройство',
  builder: argv => argv.demandOption(['mac', 'm']).example('$0 write -m ::ab:cd hofs=100 vofs=300 brightness=34', `записать в переменные: hofs<-100, vofs<-300, brightness<-34 на устройстве с адресом ::ab:cd
      mib указывать не обязательно, если у устройства есть firmware_version`),
  handler: (0, _handlers.makeAddressHandler)(action, true)
};
var _default = writeCommand;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvd3JpdGUudHMiXSwibmFtZXMiOlsiYWN0aW9uIiwiZGV2aWNlIiwiYXJncyIsInZhcnMiLCJfIiwic2xpY2UiLCJtYXAiLCJhcmciLCJzcGxpdCIsImZpbHRlciIsIm5hbWUiLCJ2YWx1ZSIsImdldE5hbWUiLCJnZXRJZCIsImZvckVhY2giLCJsZW5ndGgiLCJxdWlldCIsImNvbnNvbGUiLCJsb2ciLCJSZWZsZWN0IiwiZ2V0TWV0YWRhdGEiLCJhZGRyZXNzIiwid3JpdGUiLCJpZCIsInRoZW4iLCJpZHMiLCJuYW1lcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJ3cml0ZUNvbW1hbmQiLCJjb21tYW5kIiwiZGVzY3JpYmUiLCJidWlsZGVyIiwiYXJndiIsImRlbWFuZE9wdGlvbiIsImV4YW1wbGUiLCJoYW5kbGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBYUE7O0FBT08sZUFBZUEsTUFBZixDQUFzQkMsTUFBdEIsRUFBdUNDLElBQXZDLEVBQXNGO0FBQzNGLFFBQU1DLElBQW1CLEdBQUdELElBQUksQ0FBQ0UsQ0FBTCxDQUN6QkMsS0FEeUIsQ0FDbkIsQ0FEbUIsRUFFekJDLEdBRnlCLENBRXJCQyxHQUFHLElBQUlBLEdBQUcsQ0FBQ0MsS0FBSixDQUFVLEdBQVYsRUFBZSxDQUFmLENBRmMsRUFHekJDLE1BSHlCLENBR2xCLENBQUMsQ0FBQ0MsSUFBRCxFQUFPQyxLQUFQLENBQUQsS0FBbUJELElBQUksS0FBSyxFQUFULElBQWVDLEtBQUssS0FBSyxFQUgxQixFQUl6QkwsR0FKeUIsQ0FJckIsQ0FBQyxDQUFDSSxJQUFELEVBQU9DLEtBQVAsQ0FBRCxLQUFtQixDQUFDVixNQUFNLENBQUNXLE9BQVAsQ0FBZUYsSUFBZixDQUFELEVBQXVCVCxNQUFNLENBQUNZLEtBQVAsQ0FBYUgsSUFBYixDQUF2QixFQUEyQ0MsS0FBM0MsQ0FKRSxDQUE1Qjs7QUFLQVIsRUFBQUEsSUFBSSxDQUFDVyxPQUFMLENBQWEsQ0FBQyxDQUFDSixJQUFELEdBQVNDLEtBQVQsQ0FBRCxLQUFxQjtBQUNoQ1YsSUFBQUEsTUFBTSxDQUFDUyxJQUFELENBQU4sR0FBZUMsS0FBZjtBQUNELEdBRkQ7O0FBR0EsTUFBSVIsSUFBSSxDQUFDWSxNQUFMLEtBQWdCLENBQXBCLEVBQXVCO0FBQ3JCLFdBQU8sRUFBUDtBQUNEOztBQUNEYixFQUFBQSxJQUFJLENBQUNjLEtBQUwsSUFBY0MsT0FBTyxDQUFDQyxHQUFSLENBQWEsY0FBYUMsT0FBTyxDQUFDQyxXQUFSLENBQW9CLEtBQXBCLEVBQTJCbkIsTUFBM0IsQ0FBbUMsS0FBSUEsTUFBTSxDQUFDb0IsT0FBUSxHQUFoRixDQUFkO0FBQ0EsU0FBT3BCLE1BQU0sQ0FBQ3FCLEtBQVAsQ0FBYSxHQUFHbkIsSUFBSSxDQUFDRyxHQUFMLENBQVMsQ0FBQyxHQUFHaUIsRUFBSCxDQUFELEtBQVlBLEVBQXJCLENBQWhCLEVBQTBDQyxJQUExQyxDQUFnREMsR0FBRCxJQUFTO0FBQzdELFVBQU1DLEtBQUssR0FBR0QsR0FBRyxDQUFDbkIsR0FBSixDQUFRaUIsRUFBRSxJQUFJdEIsTUFBTSxDQUFDVyxPQUFQLENBQWVXLEVBQWYsQ0FBZCxDQUFkOztBQUNBLFFBQUksQ0FBQ3JCLElBQUksQ0FBQ2MsS0FBVixFQUFpQjtBQUNmVSxNQUFBQSxLQUFLLENBQUNaLE9BQU4sQ0FBY0osSUFBSSxJQUFJTyxPQUFPLENBQUNDLEdBQVIsQ0FBYSxNQUFLUixJQUFLLE1BQUtpQixJQUFJLENBQUNDLFNBQUwsQ0FBZTNCLE1BQU0sQ0FBQ1MsSUFBRCxDQUFyQixDQUE2QixFQUF6RCxDQUF0QjtBQUNEOztBQUNELFdBQU9nQixLQUFQO0FBQ0QsR0FOTSxDQUFQO0FBT0Q7O0FBRUQsTUFBTUcsWUFBa0QsR0FBRztBQUN6REMsRUFBQUEsT0FBTyxFQUFFLE9BRGdEO0FBRXpEQyxFQUFBQSxRQUFRLEVBQUUsZ0NBRitDO0FBR3pEQyxFQUFBQSxPQUFPLEVBQUVDLElBQUksSUFBSUEsSUFBSSxDQUNsQkMsWUFEYyxDQUNELENBQUMsS0FBRCxFQUFRLEdBQVIsQ0FEQyxFQUVkQyxPQUZjLENBR2IscURBSGEsRUFJWjs0RUFKWSxDQUh3QztBQVV6REMsRUFBQUEsT0FBTyxFQUFFLGtDQUFtQnBDLE1BQW5CLEVBQTJCLElBQTNCO0FBVmdELENBQTNEO2VBYWU2QixZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbmltcG9ydCB7IEFyZ3VtZW50cywgQ29tbWFuZE1vZHVsZSwgRGVmaW5lZCB9IGZyb20gJ3lhcmdzJztcblxuaW1wb3J0IHsgSURldmljZSB9IGZyb20gJ0BuaWJ1cy9jb3JlL2xpYi9taWInO1xuaW1wb3J0IHsgbWFrZUFkZHJlc3NIYW5kbGVyIH0gZnJvbSAnLi4vaGFuZGxlcnMnO1xuaW1wb3J0IHsgQ29tbW9uT3B0cyB9IGZyb20gJy4uL29wdGlvbnMnO1xuXG50eXBlIFdyaXRlT3B0cyA9IERlZmluZWQ8Q29tbW9uT3B0cywgJ21hYycgfCAnbSc+O1xuXG50eXBlIE5hbWVJZFZhbHVlID0gW3N0cmluZywgbnVtYmVyLCBzdHJpbmddO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aW9uKGRldmljZTogSURldmljZSwgYXJnczogQXJndW1lbnRzPFdyaXRlT3B0cz4pOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gIGNvbnN0IHZhcnM6IE5hbWVJZFZhbHVlW10gPSBhcmdzLl9cbiAgICAuc2xpY2UoMSlcbiAgICAubWFwKGFyZyA9PiBhcmcuc3BsaXQoJz0nLCAyKSlcbiAgICAuZmlsdGVyKChbbmFtZSwgdmFsdWVdKSA9PiBuYW1lICE9PSAnJyAmJiB2YWx1ZSAhPT0gJycpXG4gICAgLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gW2RldmljZS5nZXROYW1lKG5hbWUpLCBkZXZpY2UuZ2V0SWQobmFtZSksIHZhbHVlXSBhcyBOYW1lSWRWYWx1ZSk7XG4gIHZhcnMuZm9yRWFjaCgoW25hbWUsICwgdmFsdWVdKSA9PiB7XG4gICAgZGV2aWNlW25hbWVdID0gdmFsdWU7XG4gIH0pO1xuICBpZiAodmFycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgYXJncy5xdWlldCB8fCBjb25zb2xlLmxvZyhgV3JpdGluZyB0byAke1JlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYicsIGRldmljZSl9IFske2RldmljZS5hZGRyZXNzfV1gKTtcbiAgcmV0dXJuIGRldmljZS53cml0ZSguLi52YXJzLm1hcCgoWywgaWRdKSA9PiBpZCkpLnRoZW4oKGlkcykgPT4ge1xuICAgIGNvbnN0IG5hbWVzID0gaWRzLm1hcChpZCA9PiBkZXZpY2UuZ2V0TmFtZShpZCkpO1xuICAgIGlmICghYXJncy5xdWlldCkge1xuICAgICAgbmFtZXMuZm9yRWFjaChuYW1lID0+IGNvbnNvbGUubG9nKGAgLSAke25hbWV9ID0gJHtKU09OLnN0cmluZ2lmeShkZXZpY2VbbmFtZV0pfWApKTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzO1xuICB9KTtcbn1cblxuY29uc3Qgd3JpdGVDb21tYW5kOiBDb21tYW5kTW9kdWxlPENvbW1vbk9wdHMsIFdyaXRlT3B0cz4gPSB7XG4gIGNvbW1hbmQ6ICd3cml0ZScsXG4gIGRlc2NyaWJlOiAn0LfQsNC/0LjRgdGMINC/0LXRgNC10LzQtdC90L3Ri9GFINCyINGD0YHRgtGA0L7QudGB0YLQstC+JyxcbiAgYnVpbGRlcjogYXJndiA9PiBhcmd2XG4gICAgLmRlbWFuZE9wdGlvbihbJ21hYycsICdtJ10pXG4gICAgLmV4YW1wbGUoXG4gICAgICAnJDAgd3JpdGUgLW0gOjphYjpjZCBob2ZzPTEwMCB2b2ZzPTMwMCBicmlnaHRuZXNzPTM0JyxcbiAgICAgIGDQt9Cw0L/QuNGB0LDRgtGMINCyINC/0LXRgNC10LzQtdC90L3Ri9C1OiBob2ZzPC0xMDAsIHZvZnM8LTMwMCwgYnJpZ2h0bmVzczwtMzQg0L3QsCDRg9GB0YLRgNC+0LnRgdGC0LLQtSDRgSDQsNC00YDQtdGB0L7QvCA6OmFiOmNkXG4gICAgICBtaWIg0YPQutCw0LfRi9Cy0LDRgtGMINC90LUg0L7QsdGP0LfQsNGC0LXQu9GM0L3Qviwg0LXRgdC70Lgg0YMg0YPRgdGC0YDQvtC50YHRgtCy0LAg0LXRgdGC0YwgZmlybXdhcmVfdmVyc2lvbmAsXG4gICAgKSxcbiAgaGFuZGxlcjogbWFrZUFkZHJlc3NIYW5kbGVyKGFjdGlvbiwgdHJ1ZSksXG59O1xuXG5leHBvcnQgZGVmYXVsdCB3cml0ZUNvbW1hbmQ7XG4iXX0=