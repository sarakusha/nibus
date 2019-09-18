"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MibDescriptionV = exports.NibusParityV = exports.NibusBaudRateV = exports.FindKindV = void 0;

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
const FindKindV = t.keyof({
  sarp: null,
  version: null
}, 'FindKind');
exports.FindKindV = FindKindV;
const NibusBaudRateV = t.union([t.literal(115200), t.literal(57600), t.literal(28800)], 'NibusBaudRate');
exports.NibusBaudRateV = NibusBaudRateV;
const NibusParityV = t.keyof({
  none: null,
  even: null,
  mark: null
}, 'NibusParity');
exports.NibusParityV = NibusParityV;
const MibDescriptionV = t.recursion('MibDescriptionV', () => t.partial({
  type: t.number,
  mib: t.string,
  link: t.boolean,
  baudRate: NibusBaudRateV,
  parity: NibusParityV,
  category: t.string,
  find: FindKindV,
  disableBatchReading: t.boolean,
  select: t.array(MibDescriptionV),
  win32: t.union([MibDescriptionV, t.undefined])
}));
exports.MibDescriptionV = MibDescriptionV;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9NaWJEZXNjcmlwdGlvbi50cyJdLCJuYW1lcyI6WyJGaW5kS2luZFYiLCJ0Iiwia2V5b2YiLCJzYXJwIiwidmVyc2lvbiIsIk5pYnVzQmF1ZFJhdGVWIiwidW5pb24iLCJsaXRlcmFsIiwiTmlidXNQYXJpdHlWIiwibm9uZSIsImV2ZW4iLCJtYXJrIiwiTWliRGVzY3JpcHRpb25WIiwicmVjdXJzaW9uIiwicGFydGlhbCIsInR5cGUiLCJudW1iZXIiLCJtaWIiLCJzdHJpbmciLCJsaW5rIiwiYm9vbGVhbiIsImJhdWRSYXRlIiwicGFyaXR5IiwiY2F0ZWdvcnkiLCJmaW5kIiwiZGlzYWJsZUJhdGNoUmVhZGluZyIsInNlbGVjdCIsImFycmF5Iiwid2luMzIiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQVVBOzs7Ozs7QUFWQTs7Ozs7Ozs7OztBQVNBO0FBR08sTUFBTUEsU0FBUyxHQUFHQyxDQUFDLENBQUNDLEtBQUYsQ0FBUTtBQUMvQkMsRUFBQUEsSUFBSSxFQUFFLElBRHlCO0FBRS9CQyxFQUFBQSxPQUFPLEVBQUU7QUFGc0IsQ0FBUixFQUd0QixVQUhzQixDQUFsQjs7QUFNQSxNQUFNQyxjQUFjLEdBQUdKLENBQUMsQ0FBQ0ssS0FBRixDQUM1QixDQUFDTCxDQUFDLENBQUNNLE9BQUYsQ0FBVSxNQUFWLENBQUQsRUFBb0JOLENBQUMsQ0FBQ00sT0FBRixDQUFVLEtBQVYsQ0FBcEIsRUFBc0NOLENBQUMsQ0FBQ00sT0FBRixDQUFVLEtBQVYsQ0FBdEMsQ0FENEIsRUFFNUIsZUFGNEIsQ0FBdkI7O0FBS0EsTUFBTUMsWUFBWSxHQUFHUCxDQUFDLENBQUNDLEtBQUYsQ0FDMUI7QUFDRU8sRUFBQUEsSUFBSSxFQUFFLElBRFI7QUFFRUMsRUFBQUEsSUFBSSxFQUFFLElBRlI7QUFHRUMsRUFBQUEsSUFBSSxFQUFFO0FBSFIsQ0FEMEIsRUFNMUIsYUFOMEIsQ0FBckI7O0FBWUEsTUFBTUMsZUFBd0MsR0FBR1gsQ0FBQyxDQUFDWSxTQUFGLENBQVksaUJBQVosRUFBK0IsTUFDckZaLENBQUMsQ0FBQ2EsT0FBRixDQUFVO0FBQ1JDLEVBQUFBLElBQUksRUFBRWQsQ0FBQyxDQUFDZSxNQURBO0FBRVJDLEVBQUFBLEdBQUcsRUFBRWhCLENBQUMsQ0FBQ2lCLE1BRkM7QUFHUkMsRUFBQUEsSUFBSSxFQUFFbEIsQ0FBQyxDQUFDbUIsT0FIQTtBQUlSQyxFQUFBQSxRQUFRLEVBQUVoQixjQUpGO0FBS1JpQixFQUFBQSxNQUFNLEVBQUVkLFlBTEE7QUFNUmUsRUFBQUEsUUFBUSxFQUFFdEIsQ0FBQyxDQUFDaUIsTUFOSjtBQU9STSxFQUFBQSxJQUFJLEVBQUV4QixTQVBFO0FBUVJ5QixFQUFBQSxtQkFBbUIsRUFBRXhCLENBQUMsQ0FBQ21CLE9BUmY7QUFTUk0sRUFBQUEsTUFBTSxFQUFFekIsQ0FBQyxDQUFDMEIsS0FBRixDQUFRZixlQUFSLENBVEE7QUFVUmdCLEVBQUFBLEtBQUssRUFBRTNCLENBQUMsQ0FBQ0ssS0FBRixDQUFRLENBQUNNLGVBQUQsRUFBa0JYLENBQUMsQ0FBQzRCLFNBQXBCLENBQVI7QUFWQyxDQUFWLENBRHNELENBQWpEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE9PTyBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuLyogdHNsaW50OmRpc2FibGU6dmFyaWFibGUtbmFtZSAqL1xuaW1wb3J0ICogYXMgdCBmcm9tICdpby10cyc7XG5cbmV4cG9ydCBjb25zdCBGaW5kS2luZFYgPSB0LmtleW9mKHtcbiAgc2FycDogbnVsbCxcbiAgdmVyc2lvbjogbnVsbCxcbn0sICdGaW5kS2luZCcpO1xuZXhwb3J0IHR5cGUgRmluZEtpbmQgPSB0LlR5cGVPZjx0eXBlb2YgRmluZEtpbmRWPjtcblxuZXhwb3J0IGNvbnN0IE5pYnVzQmF1ZFJhdGVWID0gdC51bmlvbihcbiAgW3QubGl0ZXJhbCgxMTUyMDApLCB0LmxpdGVyYWwoNTc2MDApLCB0LmxpdGVyYWwoMjg4MDApXSxcbiAgJ05pYnVzQmF1ZFJhdGUnLFxuKTtcblxuZXhwb3J0IGNvbnN0IE5pYnVzUGFyaXR5ViA9IHQua2V5b2YoXG4gIHtcbiAgICBub25lOiBudWxsLFxuICAgIGV2ZW46IG51bGwsXG4gICAgbWFyazogbnVsbCxcbiAgfSxcbiAgJ05pYnVzUGFyaXR5Jyxcbik7XG5cbmV4cG9ydCB0eXBlIE5pYnVzQmF1ZFJhdGUgPSB0LlR5cGVPZjx0eXBlb2YgTmlidXNCYXVkUmF0ZVY+O1xuZXhwb3J0IHR5cGUgTmlidXNQYXJpdHkgPSB0LlR5cGVPZjx0eXBlb2YgTmlidXNQYXJpdHlWPjtcblxuZXhwb3J0IGNvbnN0IE1pYkRlc2NyaXB0aW9uVjogdC5UeXBlPElNaWJEZXNjcmlwdGlvbj4gPSB0LnJlY3Vyc2lvbignTWliRGVzY3JpcHRpb25WJywgKCkgPT5cbiAgdC5wYXJ0aWFsKHtcbiAgICB0eXBlOiB0Lm51bWJlcixcbiAgICBtaWI6IHQuc3RyaW5nLFxuICAgIGxpbms6IHQuYm9vbGVhbixcbiAgICBiYXVkUmF0ZTogTmlidXNCYXVkUmF0ZVYsXG4gICAgcGFyaXR5OiBOaWJ1c1Bhcml0eVYsXG4gICAgY2F0ZWdvcnk6IHQuc3RyaW5nLFxuICAgIGZpbmQ6IEZpbmRLaW5kVixcbiAgICBkaXNhYmxlQmF0Y2hSZWFkaW5nOiB0LmJvb2xlYW4sXG4gICAgc2VsZWN0OiB0LmFycmF5KE1pYkRlc2NyaXB0aW9uViksXG4gICAgd2luMzI6IHQudW5pb24oW01pYkRlc2NyaXB0aW9uViwgdC51bmRlZmluZWRdKSxcbiAgfSksXG4pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElNaWJEZXNjcmlwdGlvbiB7XG4gIHR5cGU/OiBudW1iZXI7XG4gIG1pYj86IHN0cmluZztcbiAgbGluaz86IGJvb2xlYW47XG4gIGJhdWRSYXRlPzogTmlidXNCYXVkUmF0ZTtcbiAgcGFyaXR5PzogTmlidXNQYXJpdHk7XG4gIGNhdGVnb3J5Pzogc3RyaW5nO1xuICBmaW5kPzogRmluZEtpbmQ7XG4gIGRpc2FibGVCYXRjaFJlYWRpbmc/OiBib29sZWFuO1xuICBzZWxlY3Q/OiBJTWliRGVzY3JpcHRpb25bXTtcbiAgd2luMzI/OiBJTWliRGVzY3JpcHRpb247XG59XG4iXX0=