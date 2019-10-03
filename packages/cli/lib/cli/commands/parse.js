"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _nibus = require("@nibus/core/lib/nibus");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * @license
 * Copyright (c) 2019. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
// import { printBuffer } from '@nibus/core/lib/nibus/helper';
// import Configstore from 'configstore';

/*
const pkgName = '@nata/nibus.js'; // = require('../../package.json');
const conf = new Configstore(
  pkgName,
  {
    logLevel: 'none',
    omit: ['priority'],
  },
);
*/
const makeNibusDecoder = (pick, omit) => {
  const decoder = new _nibus.NibusDecoder();
  decoder.on('data', datagram => {
    console.info(datagram.toString({
      pick,
      omit
    }));
  });
  return decoder;
};

const parseCommand = {
  command: 'parse',
  describe: 'Разбор пакетов',
  builder: argv => argv // .option('level', {
  //   alias: 'l',
  //   desc: 'уровень',
  //   choices: ['hex', 'nibus'],
  //   default: 'nibus',
  //   required: true,
  // })
  .option('pick', {
    desc: 'выдавать указанные поля в логах nibus',
    string: true,
    array: true
  }).option('omit', {
    desc: 'выдавть поля кроме указанных в логах nibus',
    string: true,
    array: true
  }).option('input', {
    alias: 'i',
    string: true,
    desc: 'входной файл с данными',
    required: true
  }),
  handler: ({
    level,
    pick,
    omit,
    input
  }) => new Promise((resolve, reject) => {
    const inputPath = _path.default.resolve(process.cwd(), input); // console.log('PARSE', inputPath);


    if (!_fs.default.existsSync(inputPath)) {
      return reject(Error(`File ${inputPath} not found`));
    }

    const stream = _fs.default.createReadStream(inputPath);

    stream.on('finish', () => resolve());
    stream.on('error', reject); // if (level === 'nibus') {

    const decoder = makeNibusDecoder(pick, omit);
    stream.pipe(decoder); // } else {
    //   const logger = new Writable({
    //     write: (chunk: any, encoding: string, callback: Function) => {
    //       console.log('write');
    //       console.info(printBuffer(chunk as Buffer));
    //       callback();
    //     },
    //   });
    //   stream.pipe(logger);
    // }
    // console.log('END');
  })
};
var _default = parseCommand;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvcGFyc2UudHMiXSwibmFtZXMiOlsibWFrZU5pYnVzRGVjb2RlciIsInBpY2siLCJvbWl0IiwiZGVjb2RlciIsIk5pYnVzRGVjb2RlciIsIm9uIiwiZGF0YWdyYW0iLCJjb25zb2xlIiwiaW5mbyIsInRvU3RyaW5nIiwicGFyc2VDb21tYW5kIiwiY29tbWFuZCIsImRlc2NyaWJlIiwiYnVpbGRlciIsImFyZ3YiLCJvcHRpb24iLCJkZXNjIiwic3RyaW5nIiwiYXJyYXkiLCJhbGlhcyIsInJlcXVpcmVkIiwiaGFuZGxlciIsImxldmVsIiwiaW5wdXQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImlucHV0UGF0aCIsInBhdGgiLCJwcm9jZXNzIiwiY3dkIiwiZnMiLCJleGlzdHNTeW5jIiwiRXJyb3IiLCJzdHJlYW0iLCJjcmVhdGVSZWFkU3RyZWFtIiwicGlwZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBU0E7O0FBR0E7O0FBQ0E7Ozs7QUFiQTs7Ozs7Ozs7O0FBVUE7QUFDQTs7QUFRQTs7Ozs7Ozs7OztBQVdBLE1BQU1BLGdCQUFnQixHQUFHLENBQUNDLElBQUQsRUFBa0JDLElBQWxCLEtBQXNDO0FBQzdELFFBQU1DLE9BQU8sR0FBRyxJQUFJQyxtQkFBSixFQUFoQjtBQUNBRCxFQUFBQSxPQUFPLENBQUNFLEVBQVIsQ0FBVyxNQUFYLEVBQW9CQyxRQUFELElBQTZCO0FBQzlDQyxJQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYUYsUUFBUSxDQUFDRyxRQUFULENBQWtCO0FBQzdCUixNQUFBQSxJQUQ2QjtBQUU3QkMsTUFBQUE7QUFGNkIsS0FBbEIsQ0FBYjtBQUlELEdBTEQ7QUFNQSxTQUFPQyxPQUFQO0FBQ0QsQ0FURDs7QUFrQkEsTUFBTU8sWUFBcUQsR0FBRztBQUM1REMsRUFBQUEsT0FBTyxFQUFFLE9BRG1EO0FBRTVEQyxFQUFBQSxRQUFRLEVBQUUsZ0JBRmtEO0FBRzVEQyxFQUFBQSxPQUFPLEVBQUVDLElBQUksSUFBSUEsSUFBSSxDQUNuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQVBtQixHQVFsQkMsTUFSYyxDQVFQLE1BUk8sRUFRQztBQUNkQyxJQUFBQSxJQUFJLEVBQUUsdUNBRFE7QUFFZEMsSUFBQUEsTUFBTSxFQUFFLElBRk07QUFHZEMsSUFBQUEsS0FBSyxFQUFFO0FBSE8sR0FSRCxFQWFkSCxNQWJjLENBYVAsTUFiTyxFQWFDO0FBQ2RDLElBQUFBLElBQUksRUFBRSw0Q0FEUTtBQUVkQyxJQUFBQSxNQUFNLEVBQUUsSUFGTTtBQUdkQyxJQUFBQSxLQUFLLEVBQUU7QUFITyxHQWJELEVBa0JkSCxNQWxCYyxDQWtCUCxPQWxCTyxFQWtCRTtBQUNmSSxJQUFBQSxLQUFLLEVBQUUsR0FEUTtBQUVmRixJQUFBQSxNQUFNLEVBQUUsSUFGTztBQUdmRCxJQUFBQSxJQUFJLEVBQUUsd0JBSFM7QUFJZkksSUFBQUEsUUFBUSxFQUFFO0FBSkssR0FsQkYsQ0FIMkM7QUEyQjVEQyxFQUFBQSxPQUFPLEVBQUcsQ0FBQztBQUFFQyxJQUFBQSxLQUFGO0FBQVNyQixJQUFBQSxJQUFUO0FBQWVDLElBQUFBLElBQWY7QUFBcUJxQixJQUFBQTtBQUFyQixHQUFELEtBQWtDLElBQUlDLE9BQUosQ0FBWSxDQUFDQyxPQUFELEVBQVVDLE1BQVYsS0FBcUI7QUFDM0UsVUFBTUMsU0FBUyxHQUFHQyxjQUFLSCxPQUFMLENBQWFJLE9BQU8sQ0FBQ0MsR0FBUixFQUFiLEVBQTRCUCxLQUE1QixDQUFsQixDQUQyRSxDQUUzRTs7O0FBQ0EsUUFBSSxDQUFDUSxZQUFHQyxVQUFILENBQWNMLFNBQWQsQ0FBTCxFQUErQjtBQUM3QixhQUFPRCxNQUFNLENBQUNPLEtBQUssQ0FBRSxRQUFPTixTQUFVLFlBQW5CLENBQU4sQ0FBYjtBQUNEOztBQUNELFVBQU1PLE1BQU0sR0FBR0gsWUFBR0ksZ0JBQUgsQ0FBb0JSLFNBQXBCLENBQWY7O0FBQ0FPLElBQUFBLE1BQU0sQ0FBQzdCLEVBQVAsQ0FBVSxRQUFWLEVBQW9CLE1BQU1vQixPQUFPLEVBQWpDO0FBQ0FTLElBQUFBLE1BQU0sQ0FBQzdCLEVBQVAsQ0FBVSxPQUFWLEVBQW1CcUIsTUFBbkIsRUFSMkUsQ0FTM0U7O0FBQ0EsVUFBTXZCLE9BQU8sR0FBR0gsZ0JBQWdCLENBQUNDLElBQUQsRUFBT0MsSUFBUCxDQUFoQztBQUNBZ0MsSUFBQUEsTUFBTSxDQUFDRSxJQUFQLENBQVlqQyxPQUFaLEVBWDJFLENBWTNFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDRCxHQXZCMkM7QUEzQmdCLENBQTlEO2VBcURlTyxZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5pYnVzXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuaW1wb3J0IHsgTmlidXNEYXRhZ3JhbSwgTmlidXNEZWNvZGVyIH0gZnJvbSAnQG5pYnVzL2NvcmUvbGliL25pYnVzJztcbi8vIGltcG9ydCB7IHByaW50QnVmZmVyIH0gZnJvbSAnQG5pYnVzL2NvcmUvbGliL25pYnVzL2hlbHBlcic7XG4vLyBpbXBvcnQgQ29uZmlnc3RvcmUgZnJvbSAnY29uZmlnc3RvcmUnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyBjb25zdCB7IFdyaXRhYmxlIH0gPSByZXF1aXJlKCdzdHJlYW0nKTtcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBDb21tb25PcHRzIH0gZnJvbSAnLi4vb3B0aW9ucyc7XG5cbi8qXG5jb25zdCBwa2dOYW1lID0gJ0BuYXRhL25pYnVzLmpzJzsgLy8gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKTtcbmNvbnN0IGNvbmYgPSBuZXcgQ29uZmlnc3RvcmUoXG4gIHBrZ05hbWUsXG4gIHtcbiAgICBsb2dMZXZlbDogJ25vbmUnLFxuICAgIG9taXQ6IFsncHJpb3JpdHknXSxcbiAgfSxcbik7XG4qL1xuXG5jb25zdCBtYWtlTmlidXNEZWNvZGVyID0gKHBpY2s/OiBzdHJpbmdbXSwgb21pdD86IHN0cmluZ1tdKSA9PiB7XG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgTmlidXNEZWNvZGVyKCk7XG4gIGRlY29kZXIub24oJ2RhdGEnLCAoZGF0YWdyYW06IE5pYnVzRGF0YWdyYW0pID0+IHtcbiAgICBjb25zb2xlLmluZm8oZGF0YWdyYW0udG9TdHJpbmcoe1xuICAgICAgcGljayxcbiAgICAgIG9taXQsXG4gICAgfSkpO1xuICB9KTtcbiAgcmV0dXJuIGRlY29kZXI7XG59O1xuXG50eXBlIFBhcnNlT3B0aW9ucyA9IENvbW1vbk9wdHMgJiB7XG4gIHBpY2s/OiBzdHJpbmdbXSxcbiAgb21pdD86IHN0cmluZ1tdLFxuICAvLyBsZXZlbDogc3RyaW5nLFxuICBpbnB1dDogc3RyaW5nLFxufTtcblxuY29uc3QgcGFyc2VDb21tYW5kOiBDb21tYW5kTW9kdWxlPENvbW1vbk9wdHMsIFBhcnNlT3B0aW9ucz4gPSB7XG4gIGNvbW1hbmQ6ICdwYXJzZScsXG4gIGRlc2NyaWJlOiAn0KDQsNC30LHQvtGAINC/0LDQutC10YLQvtCyJyxcbiAgYnVpbGRlcjogYXJndiA9PiBhcmd2XG4gICAgLy8gLm9wdGlvbignbGV2ZWwnLCB7XG4gICAgLy8gICBhbGlhczogJ2wnLFxuICAgIC8vICAgZGVzYzogJ9GD0YDQvtCy0LXQvdGMJyxcbiAgICAvLyAgIGNob2ljZXM6IFsnaGV4JywgJ25pYnVzJ10sXG4gICAgLy8gICBkZWZhdWx0OiAnbmlidXMnLFxuICAgIC8vICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgLy8gfSlcbiAgICAub3B0aW9uKCdwaWNrJywge1xuICAgICAgZGVzYzogJ9Cy0YvQtNCw0LLQsNGC0Ywg0YPQutCw0LfQsNC90L3Ri9C1INC/0L7Qu9GPINCyINC70L7Qs9Cw0YUgbmlidXMnLFxuICAgICAgc3RyaW5nOiB0cnVlLFxuICAgICAgYXJyYXk6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCdvbWl0Jywge1xuICAgICAgZGVzYzogJ9Cy0YvQtNCw0LLRgtGMINC/0L7Qu9GPINC60YDQvtC80LUg0YPQutCw0LfQsNC90L3Ri9GFINCyINC70L7Qs9Cw0YUgbmlidXMnLFxuICAgICAgc3RyaW5nOiB0cnVlLFxuICAgICAgYXJyYXk6IHRydWUsXG4gICAgfSlcbiAgICAub3B0aW9uKCdpbnB1dCcsIHtcbiAgICAgIGFsaWFzOiAnaScsXG4gICAgICBzdHJpbmc6IHRydWUsXG4gICAgICBkZXNjOiAn0LLRhdC+0LTQvdC+0Lkg0YTQsNC50Lsg0YEg0LTQsNC90L3Ri9C80LgnLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgfSksXG4gIGhhbmRsZXI6ICgoeyBsZXZlbCwgcGljaywgb21pdCwgaW5wdXQgfSkgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGlucHV0UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBpbnB1dCk7XG4gICAgLy8gY29uc29sZS5sb2coJ1BBUlNFJywgaW5wdXRQYXRoKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5wdXRQYXRoKSkge1xuICAgICAgcmV0dXJuIHJlamVjdChFcnJvcihgRmlsZSAke2lucHV0UGF0aH0gbm90IGZvdW5kYCkpO1xuICAgIH1cbiAgICBjb25zdCBzdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGlucHV0UGF0aCk7XG4gICAgc3RyZWFtLm9uKCdmaW5pc2gnLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgIHN0cmVhbS5vbignZXJyb3InLCByZWplY3QpO1xuICAgIC8vIGlmIChsZXZlbCA9PT0gJ25pYnVzJykge1xuICAgIGNvbnN0IGRlY29kZXIgPSBtYWtlTmlidXNEZWNvZGVyKHBpY2ssIG9taXQpO1xuICAgIHN0cmVhbS5waXBlKGRlY29kZXIpO1xuICAgIC8vIH0gZWxzZSB7XG4gICAgLy8gICBjb25zdCBsb2dnZXIgPSBuZXcgV3JpdGFibGUoe1xuICAgIC8vICAgICB3cml0ZTogKGNodW5rOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbikgPT4ge1xuICAgIC8vICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZScpO1xuICAgIC8vICAgICAgIGNvbnNvbGUuaW5mbyhwcmludEJ1ZmZlcihjaHVuayBhcyBCdWZmZXIpKTtcbiAgICAvLyAgICAgICBjYWxsYmFjaygpO1xuICAgIC8vICAgICB9LFxuICAgIC8vICAgfSk7XG4gICAgLy8gICBzdHJlYW0ucGlwZShsb2dnZXIpO1xuICAgIC8vIH1cbiAgICAvLyBjb25zb2xlLmxvZygnRU5EJyk7XG4gIH0pKSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlQ29tbWFuZDtcbiJdfQ==