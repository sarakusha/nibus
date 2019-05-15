"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("source-map-support/register");

var _PathReporter = require("io-ts/lib/PathReporter");

var _path = _interopRequireDefault(require("path"));

var _mib = require("@nibus/core/lib/mib");

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
const mibCommand = {
  command: 'mib <mibfile>',
  describe: 'добавить mib-файл',
  builder: argv => argv.positional('mibfile', {
    describe: 'путь к mib-файлу',
    type: 'string'
  }).demandOption('mibfile'),
  handler: async ({
    mibfile
  }) => {
    const dest = _path.default.resolve(__dirname, '../../../mibs');

    await (0, _mib.convert)(mibfile, dest);

    const validation = _mib.MibDeviceV.decode(require(dest));

    if (validation.isLeft()) {
      throw new Error(`Invalid mib file: ${mibfile}
      ${_PathReporter.PathReporter.report(validation)}`);
    }
  }
};
var _default = mibCommand;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvbWliLnRzIl0sIm5hbWVzIjpbIm1pYkNvbW1hbmQiLCJjb21tYW5kIiwiZGVzY3JpYmUiLCJidWlsZGVyIiwiYXJndiIsInBvc2l0aW9uYWwiLCJ0eXBlIiwiZGVtYW5kT3B0aW9uIiwiaGFuZGxlciIsIm1pYmZpbGUiLCJkZXN0IiwicGF0aCIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJ2YWxpZGF0aW9uIiwiTWliRGV2aWNlViIsImRlY29kZSIsInJlcXVpcmUiLCJpc0xlZnQiLCJFcnJvciIsIlBhdGhSZXBvcnRlciIsInJlcG9ydCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBVUE7O0FBRUE7O0FBQ0E7Ozs7QUFiQTs7Ozs7Ozs7O0FBZUEsTUFBTUEsVUFBeUIsR0FBRztBQUNoQ0MsRUFBQUEsT0FBTyxFQUFFLGVBRHVCO0FBRWhDQyxFQUFBQSxRQUFRLEVBQUUsbUJBRnNCO0FBR2hDQyxFQUFBQSxPQUFPLEVBQUVDLElBQUksSUFBSUEsSUFBSSxDQUNsQkMsVUFEYyxDQUNILFNBREcsRUFDUTtBQUNyQkgsSUFBQUEsUUFBUSxFQUFFLGtCQURXO0FBRXJCSSxJQUFBQSxJQUFJLEVBQUU7QUFGZSxHQURSLEVBS2RDLFlBTGMsQ0FLRCxTQUxDLENBSGU7QUFTaENDLEVBQUFBLE9BQU8sRUFBRSxPQUFPO0FBQUVDLElBQUFBO0FBQUYsR0FBUCxLQUF1QjtBQUM5QixVQUFNQyxJQUFJLEdBQUdDLGNBQUtDLE9BQUwsQ0FBYUMsU0FBYixFQUF3QixlQUF4QixDQUFiOztBQUNBLFVBQU0sa0JBQVFKLE9BQVIsRUFBMkJDLElBQTNCLENBQU47O0FBQ0EsVUFBTUksVUFBVSxHQUFHQyxnQkFBV0MsTUFBWCxDQUFrQkMsT0FBTyxDQUFDUCxJQUFELENBQXpCLENBQW5COztBQUNBLFFBQUlJLFVBQVUsQ0FBQ0ksTUFBWCxFQUFKLEVBQXlCO0FBQ3ZCLFlBQU0sSUFBSUMsS0FBSixDQUFXLHFCQUFvQlYsT0FBUTtRQUMzQ1csMkJBQWFDLE1BQWIsQ0FBb0JQLFVBQXBCLENBQWdDLEVBRDVCLENBQU47QUFFRDtBQUNGO0FBakIrQixDQUFsQztlQW9CZWQsVSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG5pbXBvcnQgeyBQYXRoUmVwb3J0ZXIgfSBmcm9tICdpby10cy9saWIvUGF0aFJlcG9ydGVyJztcbmltcG9ydCB7IENvbW1hbmRNb2R1bGUgfSBmcm9tICd5YXJncyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNvbnZlcnQsIE1pYkRldmljZVYgfSBmcm9tICdAbmlidXMvY29yZS9saWIvbWliJztcblxuY29uc3QgbWliQ29tbWFuZDogQ29tbWFuZE1vZHVsZSA9IHtcbiAgY29tbWFuZDogJ21pYiA8bWliZmlsZT4nLFxuICBkZXNjcmliZTogJ9C00L7QsdCw0LLQuNGC0YwgbWliLdGE0LDQudC7JyxcbiAgYnVpbGRlcjogYXJndiA9PiBhcmd2XG4gICAgLnBvc2l0aW9uYWwoJ21pYmZpbGUnLCB7XG4gICAgICBkZXNjcmliZTogJ9C/0YPRgtGMINC6IG1pYi3RhNCw0LnQu9GDJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgIH0pXG4gICAgLmRlbWFuZE9wdGlvbignbWliZmlsZScpLFxuICBoYW5kbGVyOiBhc3luYyAoeyBtaWJmaWxlIH0pID0+IHtcbiAgICBjb25zdCBkZXN0ID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uL21pYnMnKTtcbiAgICBhd2FpdCBjb252ZXJ0KG1pYmZpbGUgYXMgc3RyaW5nLCBkZXN0KTtcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gTWliRGV2aWNlVi5kZWNvZGUocmVxdWlyZShkZXN0KSk7XG4gICAgaWYgKHZhbGlkYXRpb24uaXNMZWZ0KCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtaWIgZmlsZTogJHttaWJmaWxlfVxuICAgICAgJHtQYXRoUmVwb3J0ZXIucmVwb3J0KHZhbGlkYXRpb24pfWApO1xuICAgIH1cbiAgfSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1pYkNvbW1hbmQ7XG4iXX0=