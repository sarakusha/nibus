"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventFromString = exports.EventFromStringType = exports.FromStringType = exports.EventV = exports.PortRemovedEventV = exports.PortAddedEventV = exports.PortsEventV = exports.PortArgV = void 0;

require("source-map-support/register");

var t = _interopRequireWildcard(require("io-ts"));

var _ioTsTypes = require("io-ts-types");

var _KnownPorts = require("../session/KnownPorts");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
const eventType = (name, a, b) => t.type({
  event: t.literal(name),
  args: b ? t.tuple([a, b]) : t.tuple([a])
});

const PortArgV = t.type({
  portInfo: _KnownPorts.KnownPortV,
  description: _KnownPorts.MibDescriptionV
});
exports.PortArgV = PortArgV;
const PortsEventV = eventType('ports', t.array(PortArgV));
exports.PortsEventV = PortsEventV;
const PortAddedEventV = eventType('add', PortArgV);
exports.PortAddedEventV = PortAddedEventV;
const PortRemovedEventV = eventType('remove', PortArgV);
exports.PortRemovedEventV = PortRemovedEventV;
const EventV = t.taggedUnion('event', [PortsEventV, PortAddedEventV, PortRemovedEventV]);
exports.EventV = EventV;

class FromStringType extends t.Type {
  constructor(name, type) {
    super(name, type.is, (m, c) => {
      const jsonValidation = _ioTsTypes.JSONFromString.validate(m, c);

      if (jsonValidation.isLeft()) {
        return jsonValidation;
      }

      const {
        value
      } = jsonValidation;
      return type.validate(value, c);
    }, JSON.stringify);
  }

}

exports.FromStringType = FromStringType;

class EventFromStringType extends FromStringType {
  constructor() {
    super('EventFromString', EventV);
  }

}

exports.EventFromStringType = EventFromStringType;
const EventFromString = new EventFromStringType();
exports.EventFromString = EventFromString;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9pcGMvZXZlbnRzLnRzIl0sIm5hbWVzIjpbImV2ZW50VHlwZSIsIm5hbWUiLCJhIiwiYiIsInQiLCJ0eXBlIiwiZXZlbnQiLCJsaXRlcmFsIiwiYXJncyIsInR1cGxlIiwiUG9ydEFyZ1YiLCJwb3J0SW5mbyIsIktub3duUG9ydFYiLCJkZXNjcmlwdGlvbiIsIk1pYkRlc2NyaXB0aW9uViIsIlBvcnRzRXZlbnRWIiwiYXJyYXkiLCJQb3J0QWRkZWRFdmVudFYiLCJQb3J0UmVtb3ZlZEV2ZW50ViIsIkV2ZW50ViIsInRhZ2dlZFVuaW9uIiwiRnJvbVN0cmluZ1R5cGUiLCJUeXBlIiwiY29uc3RydWN0b3IiLCJpcyIsIm0iLCJjIiwianNvblZhbGlkYXRpb24iLCJKU09ORnJvbVN0cmluZyIsInZhbGlkYXRlIiwiaXNMZWZ0IiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiRXZlbnRGcm9tU3RyaW5nVHlwZSIsIkV2ZW50RnJvbVN0cmluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBV0E7O0FBQ0E7O0FBRUE7Ozs7QUFkQTs7Ozs7Ozs7OztBQVVBO0FBTUEsTUFBTUEsU0FBUyxHQUFHLENBQW1DQyxJQUFuQyxFQUFpREMsQ0FBakQsRUFBdURDLENBQXZELEtBQWlFQyxDQUFDLENBQUNDLElBQUYsQ0FBTztBQUN4RkMsRUFBQUEsS0FBSyxFQUFFRixDQUFDLENBQUNHLE9BQUYsQ0FBVU4sSUFBVixDQURpRjtBQUV4Rk8sRUFBQUEsSUFBSSxFQUFFTCxDQUFDLEdBQUdDLENBQUMsQ0FBQ0ssS0FBRixDQUFRLENBQUNQLENBQUQsRUFBSUMsQ0FBSixDQUFSLENBQUgsR0FBcUJDLENBQUMsQ0FBQ0ssS0FBRixDQUFRLENBQUNQLENBQUQsQ0FBUjtBQUY0RCxDQUFQLENBQW5GOztBQUtPLE1BQU1RLFFBQVEsR0FBR04sQ0FBQyxDQUFDQyxJQUFGLENBQU87QUFDN0JNLEVBQUFBLFFBQVEsRUFBRUMsc0JBRG1CO0FBRTdCQyxFQUFBQSxXQUFXLEVBQUVDO0FBRmdCLENBQVAsQ0FBakI7O0FBVUEsTUFBTUMsV0FBVyxHQUFHZixTQUFTLENBQUMsT0FBRCxFQUFVSSxDQUFDLENBQUNZLEtBQUYsQ0FBUU4sUUFBUixDQUFWLENBQTdCOztBQUlBLE1BQU1PLGVBQWUsR0FBR2pCLFNBQVMsQ0FBQyxLQUFELEVBQVFVLFFBQVIsQ0FBakM7O0FBSUEsTUFBTVEsaUJBQWlCLEdBQUdsQixTQUFTLENBQUMsUUFBRCxFQUFXVSxRQUFYLENBQW5DOztBQUlBLE1BQU1TLE1BQU0sR0FBR2YsQ0FBQyxDQUFDZ0IsV0FBRixDQUFjLE9BQWQsRUFBdUIsQ0FBQ0wsV0FBRCxFQUFjRSxlQUFkLEVBQStCQyxpQkFBL0IsQ0FBdkIsQ0FBZjs7O0FBSUEsTUFBTUcsY0FBTixTQUFnQ2pCLENBQUMsQ0FBQ2tCLElBQWxDLENBQTJEO0FBQ2hFQyxFQUFBQSxXQUFXLENBQUN0QixJQUFELEVBQWVJLElBQWYsRUFBNEI7QUFDckMsVUFDRUosSUFERixFQUVFSSxJQUFJLENBQUNtQixFQUZQLEVBR0UsQ0FBQ0MsQ0FBRCxFQUFJQyxDQUFKLEtBQVU7QUFDUixZQUFNQyxjQUFjLEdBQUdDLDBCQUFlQyxRQUFmLENBQXdCSixDQUF4QixFQUEyQkMsQ0FBM0IsQ0FBdkI7O0FBQ0EsVUFBSUMsY0FBYyxDQUFDRyxNQUFmLEVBQUosRUFBNkI7QUFDM0IsZUFBT0gsY0FBUDtBQUNEOztBQUNELFlBQU07QUFBRUksUUFBQUE7QUFBRixVQUFZSixjQUFsQjtBQUNBLGFBQU90QixJQUFJLENBQUN3QixRQUFMLENBQWNFLEtBQWQsRUFBcUJMLENBQXJCLENBQVA7QUFDRCxLQVZILEVBV0VNLElBQUksQ0FBQ0MsU0FYUDtBQWFEOztBQWYrRDs7OztBQWtCM0QsTUFBTUMsbUJBQU4sU0FBa0NiLGNBQWxDLENBQXdEO0FBQzdERSxFQUFBQSxXQUFXLEdBQUc7QUFDWixVQUFNLGlCQUFOLEVBQXlCSixNQUF6QjtBQUNEOztBQUg0RDs7O0FBTXhELE1BQU1nQixlQUFlLEdBQUcsSUFBSUQsbUJBQUosRUFBeEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gT09PIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbi8qIHRzbGludDpkaXNhYmxlOnZhcmlhYmxlLW5hbWUgKi9cbmltcG9ydCAqIGFzIHQgZnJvbSAnaW8tdHMnO1xuaW1wb3J0IHsgSlNPTkZyb21TdHJpbmcgfSBmcm9tICdpby10cy10eXBlcyc7XG5pbXBvcnQgeyBNaXhlZCB9IGZyb20gJ2lvLXRzL2xpYic7XG5pbXBvcnQgeyBJS25vd25Qb3J0LCBLbm93blBvcnRWLCBNaWJEZXNjcmlwdGlvblYsIElNaWJEZXNjcmlwdGlvbiB9IGZyb20gJy4uL3Nlc3Npb24vS25vd25Qb3J0cyc7XG5cbmNvbnN0IGV2ZW50VHlwZSA9IDxBIGV4dGVuZHMgTWl4ZWQsIEIgZXh0ZW5kcyBNaXhlZD4obmFtZTogc3RyaW5nLCBhOiBBLCBiPzogQikgPT4gdC50eXBlKHtcbiAgZXZlbnQ6IHQubGl0ZXJhbChuYW1lKSxcbiAgYXJnczogYiA/IHQudHVwbGUoW2EsIGJdKSA6IHQudHVwbGUoW2FdKSxcbn0pO1xuXG5leHBvcnQgY29uc3QgUG9ydEFyZ1YgPSB0LnR5cGUoe1xuICBwb3J0SW5mbzogS25vd25Qb3J0VixcbiAgZGVzY3JpcHRpb246IE1pYkRlc2NyaXB0aW9uVixcbn0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElQb3J0QXJnIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIFBvcnRBcmdWPiB7XG4gIHBvcnRJbmZvOiBJS25vd25Qb3J0O1xuICBkZXNjcmlwdGlvbjogSU1pYkRlc2NyaXB0aW9uO1xufVxuXG5leHBvcnQgY29uc3QgUG9ydHNFdmVudFYgPSBldmVudFR5cGUoJ3BvcnRzJywgdC5hcnJheShQb3J0QXJnVikpO1xuXG5leHBvcnQgaW50ZXJmYWNlIElQb3J0c0V2ZW50IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIFBvcnRzRXZlbnRWPiB7fVxuXG5leHBvcnQgY29uc3QgUG9ydEFkZGVkRXZlbnRWID0gZXZlbnRUeXBlKCdhZGQnLCBQb3J0QXJnVik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVBvcnRBZGRlZEV2ZW50IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIFBvcnRBZGRlZEV2ZW50Vj4ge31cblxuZXhwb3J0IGNvbnN0IFBvcnRSZW1vdmVkRXZlbnRWID0gZXZlbnRUeXBlKCdyZW1vdmUnLCBQb3J0QXJnVik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVBvcnRSZW1vdmVkRXZlbnQgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgUG9ydFJlbW92ZWRFdmVudFY+IHt9XG5cbmV4cG9ydCBjb25zdCBFdmVudFYgPSB0LnRhZ2dlZFVuaW9uKCdldmVudCcsIFtQb3J0c0V2ZW50ViwgUG9ydEFkZGVkRXZlbnRWLCBQb3J0UmVtb3ZlZEV2ZW50Vl0pO1xuXG5leHBvcnQgdHlwZSBFdmVudCA9IElQb3J0c0V2ZW50IHwgSVBvcnRBZGRlZEV2ZW50IHwgSVBvcnRSZW1vdmVkRXZlbnQ7XG5cbmV4cG9ydCBjbGFzcyBGcm9tU3RyaW5nVHlwZTxBPiBleHRlbmRzIHQuVHlwZTxBLCBzdHJpbmcsIHVua25vd24+IHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCB0eXBlOiBNaXhlZCkge1xuICAgIHN1cGVyKFxuICAgICAgbmFtZSxcbiAgICAgIHR5cGUuaXMsXG4gICAgICAobSwgYykgPT4ge1xuICAgICAgICBjb25zdCBqc29uVmFsaWRhdGlvbiA9IEpTT05Gcm9tU3RyaW5nLnZhbGlkYXRlKG0sIGMpO1xuICAgICAgICBpZiAoanNvblZhbGlkYXRpb24uaXNMZWZ0KCkpIHtcbiAgICAgICAgICByZXR1cm4ganNvblZhbGlkYXRpb24gYXMgYW55O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgdmFsdWUgfSA9IGpzb25WYWxpZGF0aW9uO1xuICAgICAgICByZXR1cm4gdHlwZS52YWxpZGF0ZSh2YWx1ZSwgYyk7XG4gICAgICB9LFxuICAgICAgSlNPTi5zdHJpbmdpZnksXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRXZlbnRGcm9tU3RyaW5nVHlwZSBleHRlbmRzIEZyb21TdHJpbmdUeXBlPEV2ZW50PiB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCdFdmVudEZyb21TdHJpbmcnLCBFdmVudFYpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBFdmVudEZyb21TdHJpbmcgPSBuZXcgRXZlbnRGcm9tU3RyaW5nVHlwZSgpO1xuIl19