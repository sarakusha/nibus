"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KnownPortV = exports.CategoryV = void 0;

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
const CategoryV = t.union([t.keyof({
  siolynx: null,
  minihost: null,
  fancontrol: null,
  c22: null,
  relay: null,
  ftdi: null,
  undefined: null
}), t.undefined]);
exports.CategoryV = CategoryV;
const KnownPortV = t.intersection([t.type({
  comName: t.string,
  productId: t.number,
  vendorId: t.number
}), t.partial({
  manufacturer: t.string,
  serialNumber: t.string,
  pnpId: t.string,
  locationId: t.string,
  deviceAddress: t.number,
  device: t.string,
  category: CategoryV
})]); // export const FindKindV = t.keyof({
//   sarp: null,
//   version: null,
// }, 'FindKind');
// export type FindKind = t.TypeOf<typeof FindKindV>;
//
// export const NibusBaudRateV = t.union(
//   [t.literal(115200), t.literal(57600), t.literal(28800)],
//   'NibusBaudRate',
// );
//
// export const NibusParityV = t.keyof(
//   {
//     none: null,
//     even: null,
//     mark: null,
//   },
//   'NibusParity',
// );
// export type NibusBaudRate = t.TypeOf<typeof NibusBaudRateV>;
// export type NibusParity = t.TypeOf<typeof NibusParityV>;
//
// export const MibDescriptionV = t.partial({
//   type: t.number,
//   mib: t.string,
//   link: t.boolean,
//   baudRate: NibusBaudRateV,
//   parity: NibusParityV,
//   category: t.string,
//   find: FindKindV,
//   disableBatchReading: t.boolean,
//   select: t.array(t.string),
// });
//
// export interface IMibDescription extends t.TypeOf<typeof MibDescriptionV> {
//   baudRate?: NibusBaudRate;
//   parity?: NibusParity;
//   find?: FindKind;
// }

exports.KnownPortV = KnownPortV;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zZXNzaW9uL0tub3duUG9ydHMudHMiXSwibmFtZXMiOlsiQ2F0ZWdvcnlWIiwidCIsInVuaW9uIiwia2V5b2YiLCJzaW9seW54IiwibWluaWhvc3QiLCJmYW5jb250cm9sIiwiYzIyIiwicmVsYXkiLCJmdGRpIiwidW5kZWZpbmVkIiwiS25vd25Qb3J0ViIsImludGVyc2VjdGlvbiIsInR5cGUiLCJjb21OYW1lIiwic3RyaW5nIiwicHJvZHVjdElkIiwibnVtYmVyIiwidmVuZG9ySWQiLCJwYXJ0aWFsIiwibWFudWZhY3R1cmVyIiwic2VyaWFsTnVtYmVyIiwicG5wSWQiLCJsb2NhdGlvbklkIiwiZGV2aWNlQWRkcmVzcyIsImRldmljZSIsImNhdGVnb3J5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFXQTs7Ozs7O0FBWEE7Ozs7Ozs7Ozs7QUFVQTtBQUtPLE1BQU1BLFNBQVMsR0FBR0MsQ0FBQyxDQUFDQyxLQUFGLENBQVEsQ0FDL0JELENBQUMsQ0FBQ0UsS0FBRixDQUFRO0FBQ05DLEVBQUFBLE9BQU8sRUFBRSxJQURIO0FBRU5DLEVBQUFBLFFBQVEsRUFBRSxJQUZKO0FBR05DLEVBQUFBLFVBQVUsRUFBRSxJQUhOO0FBSU5DLEVBQUFBLEdBQUcsRUFBRSxJQUpDO0FBS05DLEVBQUFBLEtBQUssRUFBRSxJQUxEO0FBTU5DLEVBQUFBLElBQUksRUFBRSxJQU5BO0FBT05DLEVBQUFBLFNBQVMsRUFBRTtBQVBMLENBQVIsQ0FEK0IsRUFVL0JULENBQUMsQ0FBQ1MsU0FWNkIsQ0FBUixDQUFsQjs7QUFhQSxNQUFNQyxVQUFVLEdBQUdWLENBQUMsQ0FBQ1csWUFBRixDQUFlLENBQ3ZDWCxDQUFDLENBQUNZLElBQUYsQ0FBTztBQUNMQyxFQUFBQSxPQUFPLEVBQUViLENBQUMsQ0FBQ2MsTUFETjtBQUVMQyxFQUFBQSxTQUFTLEVBQUVmLENBQUMsQ0FBQ2dCLE1BRlI7QUFHTEMsRUFBQUEsUUFBUSxFQUFFakIsQ0FBQyxDQUFDZ0I7QUFIUCxDQUFQLENBRHVDLEVBTXZDaEIsQ0FBQyxDQUFDa0IsT0FBRixDQUFVO0FBQ1JDLEVBQUFBLFlBQVksRUFBRW5CLENBQUMsQ0FBQ2MsTUFEUjtBQUVSTSxFQUFBQSxZQUFZLEVBQUVwQixDQUFDLENBQUNjLE1BRlI7QUFHUk8sRUFBQUEsS0FBSyxFQUFFckIsQ0FBQyxDQUFDYyxNQUhEO0FBSVJRLEVBQUFBLFVBQVUsRUFBRXRCLENBQUMsQ0FBQ2MsTUFKTjtBQUtSUyxFQUFBQSxhQUFhLEVBQUV2QixDQUFDLENBQUNnQixNQUxUO0FBTVJRLEVBQUFBLE1BQU0sRUFBRXhCLENBQUMsQ0FBQ2MsTUFORjtBQU9SVyxFQUFBQSxRQUFRLEVBQUUxQjtBQVBGLENBQVYsQ0FOdUMsQ0FBZixDQUFuQixDLENBbUJQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBPT08gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmF0YVwiIHByb2plY3QuXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2Ugdmlld1xuICogdGhlIEVVTEEgZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKi9cblxuLyogdHNsaW50OmRpc2FibGU6dmFyaWFibGUtbmFtZSAqL1xuaW1wb3J0ICogYXMgdCBmcm9tICdpby10cyc7XG4vLyBpbXBvcnQgeyBOaWJ1c0JhdWRSYXRlLCBOaWJ1c0JhdWRSYXRlViB9IGZyb20gJy4uL25pYnVzJztcblxuZXhwb3J0IHR5cGUgSGV4T3JOdW1iZXIgPSBzdHJpbmcgfCBudW1iZXI7XG5leHBvcnQgY29uc3QgQ2F0ZWdvcnlWID0gdC51bmlvbihbXG4gIHQua2V5b2Yoe1xuICAgIHNpb2x5bng6IG51bGwsXG4gICAgbWluaWhvc3Q6IG51bGwsXG4gICAgZmFuY29udHJvbDogbnVsbCxcbiAgICBjMjI6IG51bGwsXG4gICAgcmVsYXk6IG51bGwsXG4gICAgZnRkaTogbnVsbCxcbiAgICB1bmRlZmluZWQ6IG51bGwsXG4gIH0pLFxuICB0LnVuZGVmaW5lZCxcbl0pO1xuZXhwb3J0IHR5cGUgQ2F0ZWdvcnkgPSB0LlR5cGVPZjx0eXBlb2YgQ2F0ZWdvcnlWPjtcbmV4cG9ydCBjb25zdCBLbm93blBvcnRWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGNvbU5hbWU6IHQuc3RyaW5nLFxuICAgIHByb2R1Y3RJZDogdC5udW1iZXIsXG4gICAgdmVuZG9ySWQ6IHQubnVtYmVyLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBtYW51ZmFjdHVyZXI6IHQuc3RyaW5nLFxuICAgIHNlcmlhbE51bWJlcjogdC5zdHJpbmcsXG4gICAgcG5wSWQ6IHQuc3RyaW5nLFxuICAgIGxvY2F0aW9uSWQ6IHQuc3RyaW5nLFxuICAgIGRldmljZUFkZHJlc3M6IHQubnVtYmVyLFxuICAgIGRldmljZTogdC5zdHJpbmcsXG4gICAgY2F0ZWdvcnk6IENhdGVnb3J5VixcbiAgfSksXG5dKTtcblxuZXhwb3J0IGludGVyZmFjZSBJS25vd25Qb3J0IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIEtub3duUG9ydFY+IHt9XG5cbi8vIGV4cG9ydCBjb25zdCBGaW5kS2luZFYgPSB0LmtleW9mKHtcbi8vICAgc2FycDogbnVsbCxcbi8vICAgdmVyc2lvbjogbnVsbCxcbi8vIH0sICdGaW5kS2luZCcpO1xuLy8gZXhwb3J0IHR5cGUgRmluZEtpbmQgPSB0LlR5cGVPZjx0eXBlb2YgRmluZEtpbmRWPjtcbi8vXG4vLyBleHBvcnQgY29uc3QgTmlidXNCYXVkUmF0ZVYgPSB0LnVuaW9uKFxuLy8gICBbdC5saXRlcmFsKDExNTIwMCksIHQubGl0ZXJhbCg1NzYwMCksIHQubGl0ZXJhbCgyODgwMCldLFxuLy8gICAnTmlidXNCYXVkUmF0ZScsXG4vLyApO1xuLy9cbi8vIGV4cG9ydCBjb25zdCBOaWJ1c1Bhcml0eVYgPSB0LmtleW9mKFxuLy8gICB7XG4vLyAgICAgbm9uZTogbnVsbCxcbi8vICAgICBldmVuOiBudWxsLFxuLy8gICAgIG1hcms6IG51bGwsXG4vLyAgIH0sXG4vLyAgICdOaWJ1c1Bhcml0eScsXG4vLyApO1xuXG4vLyBleHBvcnQgdHlwZSBOaWJ1c0JhdWRSYXRlID0gdC5UeXBlT2Y8dHlwZW9mIE5pYnVzQmF1ZFJhdGVWPjtcbi8vIGV4cG9ydCB0eXBlIE5pYnVzUGFyaXR5ID0gdC5UeXBlT2Y8dHlwZW9mIE5pYnVzUGFyaXR5Vj47XG4vL1xuLy8gZXhwb3J0IGNvbnN0IE1pYkRlc2NyaXB0aW9uViA9IHQucGFydGlhbCh7XG4vLyAgIHR5cGU6IHQubnVtYmVyLFxuLy8gICBtaWI6IHQuc3RyaW5nLFxuLy8gICBsaW5rOiB0LmJvb2xlYW4sXG4vLyAgIGJhdWRSYXRlOiBOaWJ1c0JhdWRSYXRlVixcbi8vICAgcGFyaXR5OiBOaWJ1c1Bhcml0eVYsXG4vLyAgIGNhdGVnb3J5OiB0LnN0cmluZyxcbi8vICAgZmluZDogRmluZEtpbmRWLFxuLy8gICBkaXNhYmxlQmF0Y2hSZWFkaW5nOiB0LmJvb2xlYW4sXG4vLyAgIHNlbGVjdDogdC5hcnJheSh0LnN0cmluZyksXG4vLyB9KTtcbi8vXG4vLyBleHBvcnQgaW50ZXJmYWNlIElNaWJEZXNjcmlwdGlvbiBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJEZXNjcmlwdGlvblY+IHtcbi8vICAgYmF1ZFJhdGU/OiBOaWJ1c0JhdWRSYXRlO1xuLy8gICBwYXJpdHk/OiBOaWJ1c1Bhcml0eTtcbi8vICAgZmluZD86IEZpbmRLaW5kO1xuLy8gfVxuIl19