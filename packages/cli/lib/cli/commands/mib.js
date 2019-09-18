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
    const dest = _path.default.resolve(__dirname, '../../../../core/mibs');

    const jsonpath = await (0, _mib.convert)(mibfile, dest);

    const validation = _mib.MibDeviceV.decode(require(jsonpath));

    if (validation.isLeft()) {
      throw new Error(`Invalid mib file: ${mibfile}
      ${_PathReporter.PathReporter.report(validation)}`);
    }
  }
};
var _default = mibCommand;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jbGkvY29tbWFuZHMvbWliLnRzIl0sIm5hbWVzIjpbIm1pYkNvbW1hbmQiLCJjb21tYW5kIiwiZGVzY3JpYmUiLCJidWlsZGVyIiwiYXJndiIsInBvc2l0aW9uYWwiLCJ0eXBlIiwiZGVtYW5kT3B0aW9uIiwiaGFuZGxlciIsIm1pYmZpbGUiLCJkZXN0IiwicGF0aCIsInJlc29sdmUiLCJfX2Rpcm5hbWUiLCJqc29ucGF0aCIsInZhbGlkYXRpb24iLCJNaWJEZXZpY2VWIiwiZGVjb2RlIiwicmVxdWlyZSIsImlzTGVmdCIsIkVycm9yIiwiUGF0aFJlcG9ydGVyIiwicmVwb3J0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFVQTs7QUFFQTs7QUFDQTs7OztBQWJBOzs7Ozs7Ozs7QUFlQSxNQUFNQSxVQUF5QixHQUFHO0FBQ2hDQyxFQUFBQSxPQUFPLEVBQUUsZUFEdUI7QUFFaENDLEVBQUFBLFFBQVEsRUFBRSxtQkFGc0I7QUFHaENDLEVBQUFBLE9BQU8sRUFBRUMsSUFBSSxJQUFJQSxJQUFJLENBQ2xCQyxVQURjLENBQ0gsU0FERyxFQUNRO0FBQ3JCSCxJQUFBQSxRQUFRLEVBQUUsa0JBRFc7QUFFckJJLElBQUFBLElBQUksRUFBRTtBQUZlLEdBRFIsRUFLZEMsWUFMYyxDQUtELFNBTEMsQ0FIZTtBQVNoQ0MsRUFBQUEsT0FBTyxFQUFFLE9BQU87QUFBRUMsSUFBQUE7QUFBRixHQUFQLEtBQXVCO0FBQzlCLFVBQU1DLElBQUksR0FBR0MsY0FBS0MsT0FBTCxDQUFhQyxTQUFiLEVBQXdCLHVCQUF4QixDQUFiOztBQUNBLFVBQU1DLFFBQVEsR0FBRyxNQUFNLGtCQUFRTCxPQUFSLEVBQTJCQyxJQUEzQixDQUF2Qjs7QUFDQSxVQUFNSyxVQUFVLEdBQUdDLGdCQUFXQyxNQUFYLENBQWtCQyxPQUFPLENBQUNKLFFBQUQsQ0FBekIsQ0FBbkI7O0FBQ0EsUUFBSUMsVUFBVSxDQUFDSSxNQUFYLEVBQUosRUFBeUI7QUFDdkIsWUFBTSxJQUFJQyxLQUFKLENBQVcscUJBQW9CWCxPQUFRO1FBQzNDWSwyQkFBYUMsTUFBYixDQUFvQlAsVUFBcEIsQ0FBZ0MsRUFENUIsQ0FBTjtBQUVEO0FBQ0Y7QUFqQitCLENBQWxDO2VBb0JlZixVIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbmltcG9ydCB7IFBhdGhSZXBvcnRlciB9IGZyb20gJ2lvLXRzL2xpYi9QYXRoUmVwb3J0ZXInO1xuaW1wb3J0IHsgQ29tbWFuZE1vZHVsZSB9IGZyb20gJ3lhcmdzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY29udmVydCwgTWliRGV2aWNlViB9IGZyb20gJ0BuaWJ1cy9jb3JlL2xpYi9taWInO1xuXG5jb25zdCBtaWJDb21tYW5kOiBDb21tYW5kTW9kdWxlID0ge1xuICBjb21tYW5kOiAnbWliIDxtaWJmaWxlPicsXG4gIGRlc2NyaWJlOiAn0LTQvtCx0LDQstC40YLRjCBtaWIt0YTQsNC50LsnLFxuICBidWlsZGVyOiBhcmd2ID0+IGFyZ3ZcbiAgICAucG9zaXRpb25hbCgnbWliZmlsZScsIHtcbiAgICAgIGRlc2NyaWJlOiAn0L/Rg9GC0Ywg0LogbWliLdGE0LDQudC70YMnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgfSlcbiAgICAuZGVtYW5kT3B0aW9uKCdtaWJmaWxlJyksXG4gIGhhbmRsZXI6IGFzeW5jICh7IG1pYmZpbGUgfSkgPT4ge1xuICAgIGNvbnN0IGRlc3QgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4vLi4vY29yZS9taWJzJyk7XG4gICAgY29uc3QganNvbnBhdGggPSBhd2FpdCBjb252ZXJ0KG1pYmZpbGUgYXMgc3RyaW5nLCBkZXN0KTtcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gTWliRGV2aWNlVi5kZWNvZGUocmVxdWlyZShqc29ucGF0aCkpO1xuICAgIGlmICh2YWxpZGF0aW9uLmlzTGVmdCgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbWliIGZpbGU6ICR7bWliZmlsZX1cbiAgICAgICR7UGF0aFJlcG9ydGVyLnJlcG9ydCh2YWxpZGF0aW9uKX1gKTtcbiAgICB9XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtaWJDb21tYW5kO1xuIl19