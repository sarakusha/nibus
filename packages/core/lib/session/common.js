"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConfigV = exports.PATH = void 0;

require("source-map-support/register");

var t = _interopRequireWildcard(require("io-ts"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* tslint:disable:variable-name */
const PATH = '/tmp/nibus.service.sock';
exports.PATH = PATH;
const LogLevelV = t.keyof({
  none: null,
  hex: null,
  nibus: null
});
const MibTypeV = t.array(t.intersection([t.type({
  mib: t.string
}), t.partial({
  minVersion: t.number
})]));
const ConfigV = t.partial({
  logLevel: LogLevelV,
  omit: t.union([t.array(t.string), t.null]),
  pick: t.union([t.array(t.string), t.null]),
  mibs: t.array(t.string),
  mibTypes: t.record(t.string, MibTypeV)
}); // type MibType = t.TypeOf<typeof MibTypeV>;

exports.ConfigV = ConfigV;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXNzaW9uL2NvbW1vbi50cyJdLCJuYW1lcyI6WyJQQVRIIiwiTG9nTGV2ZWxWIiwidCIsImtleW9mIiwibm9uZSIsImhleCIsIm5pYnVzIiwiTWliVHlwZVYiLCJhcnJheSIsImludGVyc2VjdGlvbiIsInR5cGUiLCJtaWIiLCJzdHJpbmciLCJwYXJ0aWFsIiwibWluVmVyc2lvbiIsIm51bWJlciIsIkNvbmZpZ1YiLCJsb2dMZXZlbCIsIm9taXQiLCJ1bmlvbiIsIm51bGwiLCJwaWNrIiwibWlicyIsIm1pYlR5cGVzIiwicmVjb3JkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFXQTs7Ozs7O0FBWEE7Ozs7Ozs7Ozs7QUFVQTtBQUVPLE1BQU1BLElBQUksR0FBRyx5QkFBYjs7QUFFUCxNQUFNQyxTQUFTLEdBQUdDLENBQUMsQ0FBQ0MsS0FBRixDQUFRO0FBQ3hCQyxFQUFBQSxJQUFJLEVBQUUsSUFEa0I7QUFFeEJDLEVBQUFBLEdBQUcsRUFBRSxJQUZtQjtBQUd4QkMsRUFBQUEsS0FBSyxFQUFFO0FBSGlCLENBQVIsQ0FBbEI7QUFNQSxNQUFNQyxRQUFRLEdBQUdMLENBQUMsQ0FBQ00sS0FBRixDQUFRTixDQUFDLENBQUNPLFlBQUYsQ0FBZSxDQUN0Q1AsQ0FBQyxDQUFDUSxJQUFGLENBQU87QUFBRUMsRUFBQUEsR0FBRyxFQUFFVCxDQUFDLENBQUNVO0FBQVQsQ0FBUCxDQURzQyxFQUV0Q1YsQ0FBQyxDQUFDVyxPQUFGLENBQVU7QUFBRUMsRUFBQUEsVUFBVSxFQUFFWixDQUFDLENBQUNhO0FBQWhCLENBQVYsQ0FGc0MsQ0FBZixDQUFSLENBQWpCO0FBS08sTUFBTUMsT0FBTyxHQUFHZCxDQUFDLENBQUNXLE9BQUYsQ0FBVTtBQUMvQkksRUFBQUEsUUFBUSxFQUFFaEIsU0FEcUI7QUFFL0JpQixFQUFBQSxJQUFJLEVBQUVoQixDQUFDLENBQUNpQixLQUFGLENBQVEsQ0FBQ2pCLENBQUMsQ0FBQ00sS0FBRixDQUFRTixDQUFDLENBQUNVLE1BQVYsQ0FBRCxFQUFvQlYsQ0FBQyxDQUFDa0IsSUFBdEIsQ0FBUixDQUZ5QjtBQUcvQkMsRUFBQUEsSUFBSSxFQUFFbkIsQ0FBQyxDQUFDaUIsS0FBRixDQUFRLENBQUNqQixDQUFDLENBQUNNLEtBQUYsQ0FBUU4sQ0FBQyxDQUFDVSxNQUFWLENBQUQsRUFBb0JWLENBQUMsQ0FBQ2tCLElBQXRCLENBQVIsQ0FIeUI7QUFJL0JFLEVBQUFBLElBQUksRUFBRXBCLENBQUMsQ0FBQ00sS0FBRixDQUFRTixDQUFDLENBQUNVLE1BQVYsQ0FKeUI7QUFLL0JXLEVBQUFBLFFBQVEsRUFBRXJCLENBQUMsQ0FBQ3NCLE1BQUYsQ0FBU3RCLENBQUMsQ0FBQ1UsTUFBWCxFQUFtQkwsUUFBbkI7QUFMcUIsQ0FBVixDQUFoQixDLENBUVAiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gT09PIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbi8qIHRzbGludDpkaXNhYmxlOnZhcmlhYmxlLW5hbWUgKi9cbmltcG9ydCAqIGFzIHQgZnJvbSAnaW8tdHMnO1xuZXhwb3J0IGNvbnN0IFBBVEggPSAnL3RtcC9uaWJ1cy5zZXJ2aWNlLnNvY2snO1xuXG5jb25zdCBMb2dMZXZlbFYgPSB0LmtleW9mKHtcbiAgbm9uZTogbnVsbCxcbiAgaGV4OiBudWxsLFxuICBuaWJ1czogbnVsbCxcbn0pO1xuXG5jb25zdCBNaWJUeXBlViA9IHQuYXJyYXkodC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoeyBtaWI6IHQuc3RyaW5nIH0pLFxuICB0LnBhcnRpYWwoeyBtaW5WZXJzaW9uOiB0Lm51bWJlciB9KSxcbl0pKTtcblxuZXhwb3J0IGNvbnN0IENvbmZpZ1YgPSB0LnBhcnRpYWwoe1xuICBsb2dMZXZlbDogTG9nTGV2ZWxWLFxuICBvbWl0OiB0LnVuaW9uKFt0LmFycmF5KHQuc3RyaW5nKSwgdC5udWxsXSksXG4gIHBpY2s6IHQudW5pb24oW3QuYXJyYXkodC5zdHJpbmcpLCB0Lm51bGxdKSxcbiAgbWliczogdC5hcnJheSh0LnN0cmluZyksXG4gIG1pYlR5cGVzOiB0LnJlY29yZCh0LnN0cmluZywgTWliVHlwZVYpLFxufSk7XG5cbi8vIHR5cGUgTWliVHlwZSA9IHQuVHlwZU9mPHR5cGVvZiBNaWJUeXBlVj47XG5leHBvcnQgdHlwZSBDb25maWcgPSB0LlR5cGVPZjx0eXBlb2YgQ29uZmlnVj47XG5cbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gdC5UeXBlT2Y8dHlwZW9mIExvZ0xldmVsVj47XG4iXX0=