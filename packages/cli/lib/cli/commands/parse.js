"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _nibus = require("@nibus/core/lib/nibus");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _stream = require("stream");

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
const hexTransform = new _stream.Transform({
  transform: function (chunk, encoding, callback) {
    const data = chunk.toString().replace(/-/g, '').replace(/\n/g, '');
    const buffer = Buffer.from(data, 'hex');
    callback(null, buffer);
  }
});

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
  }).option('hex', {
    boolean: true,
    desc: 'входной файл в формате hex'
  }),
  handler: ({
    level,
    pick,
    omit,
    input,
    hex
  }) => new Promise((resolve, reject) => {
    const inputPath = _path.default.resolve(process.cwd(), input); // console.log('PARSE', inputPath);


    if (!_fs.default.existsSync(inputPath)) {
      return reject(Error(`File ${inputPath} not found`));
    }

    const stream = _fs.default.createReadStream(inputPath);

    stream.on('finish', () => resolve());
    stream.on('error', reject); // if (level === 'nibus') {

    const decoder = makeNibusDecoder(pick, omit);

    if (hex) {
      console.log('HEEEEX');
      stream.pipe(hexTransform).pipe(decoder);
    } else {
      stream.pipe(decoder);
    } // } else {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvcGFyc2UudHMiXSwibmFtZXMiOlsiaGV4VHJhbnNmb3JtIiwiVHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiY2h1bmsiLCJlbmNvZGluZyIsImNhbGxiYWNrIiwiZGF0YSIsInRvU3RyaW5nIiwicmVwbGFjZSIsImJ1ZmZlciIsIkJ1ZmZlciIsImZyb20iLCJtYWtlTmlidXNEZWNvZGVyIiwicGljayIsIm9taXQiLCJkZWNvZGVyIiwiTmlidXNEZWNvZGVyIiwib24iLCJkYXRhZ3JhbSIsImNvbnNvbGUiLCJpbmZvIiwicGFyc2VDb21tYW5kIiwiY29tbWFuZCIsImRlc2NyaWJlIiwiYnVpbGRlciIsImFyZ3YiLCJvcHRpb24iLCJkZXNjIiwic3RyaW5nIiwiYXJyYXkiLCJhbGlhcyIsInJlcXVpcmVkIiwiYm9vbGVhbiIsImhhbmRsZXIiLCJsZXZlbCIsImlucHV0IiwiaGV4IiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJpbnB1dFBhdGgiLCJwYXRoIiwicHJvY2VzcyIsImN3ZCIsImZzIiwiZXhpc3RzU3luYyIsIkVycm9yIiwic3RyZWFtIiwiY3JlYXRlUmVhZFN0cmVhbSIsImxvZyIsInBpcGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQVNBOztBQUdBOztBQUNBOztBQUNBOzs7O0FBZEE7Ozs7Ozs7OztBQVVBO0FBQ0E7O0FBU0E7Ozs7Ozs7Ozs7QUFXQSxNQUFNQSxZQUFZLEdBQUcsSUFBSUMsaUJBQUosQ0FBYztBQUNqQ0MsRUFBQUEsU0FBUyxFQUFFLFVBQ1RDLEtBRFMsRUFFVEMsUUFGUyxFQUdUQyxRQUhTLEVBR3FEO0FBQzlELFVBQU1DLElBQUksR0FBR0gsS0FBSyxDQUFDSSxRQUFOLEdBQWlCQyxPQUFqQixDQUF5QixJQUF6QixFQUErQixFQUEvQixFQUFtQ0EsT0FBbkMsQ0FBMkMsS0FBM0MsRUFBa0QsRUFBbEQsQ0FBYjtBQUNBLFVBQU1DLE1BQU0sR0FBR0MsTUFBTSxDQUFDQyxJ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QUFBLE1BQU0sQ0FBQ0csSUFBUCxDQUFZbkMsT0FBWjtBQUNELEtBaEJvQyxDQWlCckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDRCxHQTVCSztBQWpDc0QsQ0FBOUQ7ZUFnRWVNLFkiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmlidXNcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5pbXBvcnQgeyBOaWJ1c0RhdGFncmFtLCBOaWJ1c0RlY29kZXIgfSBmcm9tICdAbmlidXMvY29yZS9saWIvbmlidXMnO1xuLy8gaW1wb3J0IHsgcHJpbnRCdWZmZXIgfSBmcm9tICdAbmlidXMvY29yZS9saWIvbmlidXMvaGVscGVyJztcbi8vIGltcG9ydCBDb25maWdzdG9yZSBmcm9tICdjb25maWdzdG9yZSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBUcmFuc2Zvcm0gfSBmcm9tICdzdHJlYW0nO1xuXG4vLyBjb25zdCB7IFdyaXRhYmxlIH0gPSByZXF1aXJlKCdzdHJlYW0nKTtcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgeyBDb21tb25PcHRzIH0gZnJvbSAnLi4vb3B0aW9ucyc7XG5cbi8qXG5jb25zdCBwa2dOYW1lID0gJ0BuYXRhL25pYnVzLmpzJzsgLy8gPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKTtcbmNvbnN0IGNvbmYgPSBuZXcgQ29uZmlnc3RvcmUoXG4gIHBrZ05hbWUsXG4gIHtcbiAgICBsb2dMZXZlbDogJ25vbmUnLFxuICAgIG9taXQ6IFsncHJpb3JpdHknXSxcbiAgfSxcbik7XG4qL1xuXG5jb25zdCBoZXhUcmFuc2Zvcm0gPSBuZXcgVHJhbnNmb3JtKHtcbiAgdHJhbnNmb3JtOiBmdW5jdGlvbiAoXG4gICAgY2h1bms6IGFueSxcbiAgICBlbmNvZGluZzogc3RyaW5nLFxuICAgIGNhbGxiYWNrOiAoZXJyb3I/OiAoRXJyb3IgfCBudWxsKSwgZGF0YT86IGFueSkgPT4gdm9pZCk6IHZvaWQge1xuICAgIGNvbnN0IGRhdGEgPSBjaHVuay50b1N0cmluZygpLnJlcGxhY2UoLy0vZywgJycpLnJlcGxhY2UoL1xcbi9nLCAnJyk7XG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20oZGF0YSwgJ2hleCcpO1xuICAgIGNhbGxiYWNrKG51bGwsIGJ1ZmZlcik7XG4gIH0sXG59KTtcblxuY29uc3QgbWFrZU5pYnVzRGVjb2RlciA9IChwaWNrPzogc3RyaW5nW10sIG9taXQ/OiBzdHJpbmdbXSkgPT4ge1xuICBjb25zdCBkZWNvZGVyID0gbmV3IE5pYnVzRGVjb2RlcigpO1xuICBkZWNvZGVyLm9uKCdkYXRhJywgKGRhdGFncmFtOiBOaWJ1c0RhdGFncmFtKSA9PiB7XG4gICAgY29uc29sZS5pbmZvKGRhdGFncmFtLnRvU3RyaW5nKHtcbiAgICAgIHBpY2ssXG4gICAgICBvbWl0LFxuICAgIH0pKTtcbiAgfSk7XG4gIHJldHVybiBkZWNvZGVyO1xufTtcblxudHlwZSBQYXJzZU9wdGlvbnMgPSBDb21tb25PcHRzICYge1xuICBwaWNrPzogc3RyaW5nW107XG4gIG9taXQ/OiBzdHJpbmdbXTtcbiAgLy8gbGV2ZWw6IHN0cmluZyxcbiAgaW5wdXQ6IHN0cmluZztcbiAgaGV4PzogYm9vbGVhbjtcbn07XG5cbmNvbnN0IHBhcnNlQ29tbWFuZDogQ29tbWFuZE1vZHVsZTxDb21tb25PcHRzLCBQYXJzZU9wdGlvbnM+ID0ge1xuICBjb21tYW5kOiAncGFyc2UnLFxuICBkZXNjcmliZTogJ9Cg0LDQt9Cx0L7RgCDQv9Cw0LrQtdGC0L7QsicsXG4gIGJ1aWxkZXI6IGFyZ3YgPT4gYXJndlxuICAgIC8vIC5vcHRpb24oJ2xldmVsJywge1xuICAgIC8vICAgYWxpYXM6ICdsJyxcbiAgICAvLyAgIGRlc2M6ICfRg9GA0L7QstC10L3RjCcsXG4gICAgLy8gICBjaG9pY2VzOiBbJ2hleCcsICduaWJ1cyddLFxuICAgIC8vICAgZGVmYXVsdDogJ25pYnVzJyxcbiAgICAvLyAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIC8vIH0pXG4gICAgLm9wdGlvbigncGljaycsIHtcbiAgICAgIGRlc2M6ICfQstGL0LTQsNCy0LDRgtGMINGD0LrQsNC30LDQvdC90YvQtSDQv9C+0LvRjyDQsiDQu9C+0LPQsNGFIG5pYnVzJyxcbiAgICAgIHN0cmluZzogdHJ1ZSxcbiAgICAgIGFycmF5OiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignb21pdCcsIHtcbiAgICAgIGRlc2M6ICfQstGL0LTQsNCy0YLRjCDQv9C+0LvRjyDQutGA0L7QvNC1INGD0LrQsNC30LDQvdC90YvRhSDQsiDQu9C+0LPQsNGFIG5pYnVzJyxcbiAgICAgIHN0cmluZzogdHJ1ZSxcbiAgICAgIGFycmF5OiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignaW5wdXQnLCB7XG4gICAgICBhbGlhczogJ2knLFxuICAgICAgc3RyaW5nOiB0cnVlLFxuICAgICAgZGVzYzogJ9Cy0YXQvtC00L3QvtC5INGE0LDQudC7INGBINC00LDQvdC90YvQvNC4JyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgIH0pXG4gICAgLm9wdGlvbignaGV4Jywge1xuICAgICAgYm9vbGVhbjogdHJ1ZSxcbiAgICAgIGRlc2M6ICfQstGF0L7QtNC90L7QuSDRhNCw0LnQuyDQsiDRhNC+0YDQvNCw0YLQtSBoZXgnLFxuICAgIH0pLFxuICBoYW5kbGVyOiAoKHtcbiAgICBsZXZlbCwgcGljaywgb21pdCwgaW5wdXQsIGhleCxcbiAgfSkgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IGlucHV0UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBpbnB1dCk7XG4gICAgLy8gY29uc29sZS5sb2coJ1BBUlNFJywgaW5wdXRQYXRoKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5wdXRQYXRoKSkge1xuICAgICAgcmV0dXJuIHJlamVjdChFcnJvcihgRmlsZSAke2lucHV0UGF0aH0gbm90IGZvdW5kYCkpO1xuICAgIH1cbiAgICBjb25zdCBzdHJlYW0gPSBmcy5jcmVhdGVSZWFkU3RyZWFtKGlucHV0UGF0aCk7XG4gICAgc3RyZWFtLm9uKCdmaW5pc2gnLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgIHN0cmVhbS5vbignZXJyb3InLCByZWplY3QpO1xuICAgIC8vIGlmIChsZXZlbCA9PT0gJ25pYnVzJykge1xuICAgIGNvbnN0IGRlY29kZXIgPSBtYWtlTmlidXNEZWNvZGVyKHBpY2ssIG9taXQpO1xuICAgIGlmIChoZXgpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdIRUVFRVgnKTtcbiAgICAgIHN0cmVhbS5waXBlKGhleFRyYW5zZm9ybSkucGlwZShkZWNvZGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyZWFtLnBpcGUoZGVjb2Rlcik7XG4gICAgfVxuICAgIC8vIH0gZWxzZSB7XG4gICAgLy8gICBjb25zdCBsb2dnZXIgPSBuZXcgV3JpdGFibGUoe1xuICAgIC8vICAgICB3cml0ZTogKGNodW5rOiBhbnksIGVuY29kaW5nOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbikgPT4ge1xuICAgIC8vICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZScpO1xuICAgIC8vICAgICAgIGNvbnNvbGUuaW5mbyhwcmludEJ1ZmZlcihjaHVuayBhcyBCdWZmZXIpKTtcbiAgICAvLyAgICAgICBjYWxsYmFjaygpO1xuICAgIC8vICAgICB9LFxuICAgIC8vICAgfSk7XG4gICAgLy8gICBzdHJlYW0ucGlwZShsb2dnZXIpO1xuICAgIC8vIH1cbiAgICAvLyBjb25zb2xlLmxvZygnRU5EJyk7XG4gIH0pKSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHBhcnNlQ29tbWFuZDtcbiJdfQ==