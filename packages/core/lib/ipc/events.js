"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventFromString = exports.EventFromStringType = exports.FromStringType = exports.EventV = exports.PortRemovedEventV = exports.PortAddedEventV = exports.PortsEventV = exports.PortArgV = void 0;

require("source-map-support/register");

var t = _interopRequireWildcard(require("io-ts"));

var _ioTsTypes = require("io-ts-types");

var _MibDescription = require("../MibDescription");

var _KnownPorts = require("../session/KnownPorts");

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
const eventType = (name, a, b) => t.type({
  event: t.literal(name),
  args: b ? t.tuple([a, b]) : t.tuple([a])
});

const PortArgV = t.type({
  portInfo: _KnownPorts.KnownPortV,
  description: _MibDescription.MibDescriptionV
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9pcGMvZXZlbnRzLnRzIl0sIm5hbWVzIjpbImV2ZW50VHlwZSIsIm5hbWUiLCJhIiwiYiIsInQiLCJ0eXBlIiwiZXZlbnQiLCJsaXRlcmFsIiwiYXJncyIsInR1cGxlIiwiUG9ydEFyZ1YiLCJwb3J0SW5mbyIsIktub3duUG9ydFYiLCJkZXNjcmlwdGlvbiIsIk1pYkRlc2NyaXB0aW9uViIsIlBvcnRzRXZlbnRWIiwiYXJyYXkiLCJQb3J0QWRkZWRFdmVudFYiLCJQb3J0UmVtb3ZlZEV2ZW50ViIsIkV2ZW50ViIsInRhZ2dlZFVuaW9uIiwiRnJvbVN0cmluZ1R5cGUiLCJUeXBlIiwiY29uc3RydWN0b3IiLCJpcyIsIm0iLCJjIiwianNvblZhbGlkYXRpb24iLCJKU09ORnJvbVN0cmluZyIsInZhbGlkYXRlIiwiaXNMZWZ0IiwidmFsdWUiLCJKU09OIiwic3RyaW5naWZ5IiwiRXZlbnRGcm9tU3RyaW5nVHlwZSIsIkV2ZW50RnJvbVN0cmluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBV0E7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7OztBQWZBOzs7Ozs7Ozs7O0FBVUE7QUFPQSxNQUFNQSxTQUFTLEdBQUcsQ0FBbUNDLElBQW5DLEVBQWlEQyxDQUFqRCxFQUF1REMsQ0FBdkQsS0FBaUVDLENBQUMsQ0FBQ0MsSUFBRixDQUFPO0FBQ3hGQyxFQUFBQSxLQUFLLEVBQUVGLENBQUMsQ0FBQ0csT0FBRixDQUFVTixJQUFWLENBRGlGO0FBRXhGTyxFQUFBQSxJQUFJLEVBQUVMLENBQUMsR0FBR0MsQ0FBQyxDQUFDSyxLQUFGLENBQVEsQ0FBQ1AsQ0FBRCxFQUFJQyxDQUFKLENBQVIsQ0FBSCxHQUFxQkMsQ0FBQyxDQUFDSyxLQUFGLENBQVEsQ0FBQ1AsQ0FBRCxDQUFSO0FBRjRELENBQVAsQ0FBbkY7O0FBS08sTUFBTVEsUUFBUSxHQUFHTixDQUFDLENBQUNDLElBQUYsQ0FBTztBQUM3Qk0sRUFBQUEsUUFBUSxFQUFFQyxzQkFEbUI7QUFFN0JDLEVBQUFBLFdBQVcsRUFBRUM7QUFGZ0IsQ0FBUCxDQUFqQjs7QUFVQSxNQUFNQyxXQUFXLEdBQUdmLFNBQVMsQ0FBQyxPQUFELEVBQVVJLENBQUMsQ0FBQ1ksS0FBRixDQUFRTixRQUFSLENBQVYsQ0FBN0I7O0FBSUEsTUFBTU8sZUFBZSxHQUFHakIsU0FBUyxDQUFDLEtBQUQsRUFBUVUsUUFBUixDQUFqQzs7QUFJQSxNQUFNUSxpQkFBaUIsR0FBR2xCLFNBQVMsQ0FBQyxRQUFELEVBQVdVLFFBQVgsQ0FBbkM7O0FBSUEsTUFBTVMsTUFBTSxHQUFHZixDQUFDLENBQUNnQixXQUFGLENBQWMsT0FBZCxFQUF1QixDQUFDTCxXQUFELEVBQWNFLGVBQWQsRUFBK0JDLGlCQUEvQixDQUF2QixDQUFmOzs7QUFJQSxNQUFNRyxjQUFOLFNBQWdDakIsQ0FBQyxDQUFDa0IsSUFBbEMsQ0FBMkQ7QUFDaEVDLEVBQUFBLFdBQVcsQ0FBQ3RCLElBQUQsRUFBZUksSUFBZixFQUE0QjtBQUNyQyxVQUNFSixJQURGLEVBRUVJLElBQUksQ0FBQ21CLEVBRlAsRUFHRSxDQUFDQyxDQUFELEVBQUlDLENBQUosS0FBVTtBQUNSLFlBQU1DLGNBQWMsR0FBR0MsMEJBQWVDLFFBQWYsQ0FBd0JKLENBQXhCLEVBQTJCQyxDQUEzQixDQUF2Qjs7QUFDQSxVQUFJQyxjQUFjLENBQUNHLE1BQWYsRUFBSixFQUE2QjtBQUMzQixlQUFPSCxjQUFQO0FBQ0Q7O0FBQ0QsWUFBTTtBQUFFSSxRQUFBQTtBQUFGLFVBQVlKLGNBQWxCO0FBQ0EsYUFBT3RCLElBQUksQ0FBQ3dCLFFBQUwsQ0FBY0UsS0FBZCxFQUFxQkwsQ0FBckIsQ0FBUDtBQUNELEtBVkgsRUFXRU0sSUFBSSxDQUFDQyxTQVhQO0FBYUQ7O0FBZitEOzs7O0FBa0IzRCxNQUFNQyxtQkFBTixTQUFrQ2IsY0FBbEMsQ0FBd0Q7QUFDN0RFLEVBQUFBLFdBQVcsR0FBRztBQUNaLFVBQU0saUJBQU4sRUFBeUJKLE1BQXpCO0FBQ0Q7O0FBSDREOzs7QUFNeEQsTUFBTWdCLGVBQWUsR0FBRyxJQUFJRCxtQkFBSixFQUF4QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBPT08gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmF0YVwiIHByb2plY3QuXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2Ugdmlld1xuICogdGhlIEVVTEEgZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKi9cblxuLyogdHNsaW50OmRpc2FibGU6dmFyaWFibGUtbmFtZSAqL1xuaW1wb3J0ICogYXMgdCBmcm9tICdpby10cyc7XG5pbXBvcnQgeyBKU09ORnJvbVN0cmluZyB9IGZyb20gJ2lvLXRzLXR5cGVzJztcbmltcG9ydCB7IE1peGVkIH0gZnJvbSAnaW8tdHMvbGliJztcbmltcG9ydCB7IElNaWJEZXNjcmlwdGlvbiwgTWliRGVzY3JpcHRpb25WIH0gZnJvbSAnLi4vTWliRGVzY3JpcHRpb24nO1xuaW1wb3J0IHsgSUtub3duUG9ydCwgS25vd25Qb3J0ViB9IGZyb20gJy4uL3Nlc3Npb24vS25vd25Qb3J0cyc7XG5cbmNvbnN0IGV2ZW50VHlwZSA9IDxBIGV4dGVuZHMgTWl4ZWQsIEIgZXh0ZW5kcyBNaXhlZD4obmFtZTogc3RyaW5nLCBhOiBBLCBiPzogQikgPT4gdC50eXBlKHtcbiAgZXZlbnQ6IHQubGl0ZXJhbChuYW1lKSxcbiAgYXJnczogYiA/IHQudHVwbGUoW2EsIGJdKSA6IHQudHVwbGUoW2FdKSxcbn0pO1xuXG5leHBvcnQgY29uc3QgUG9ydEFyZ1YgPSB0LnR5cGUoe1xuICBwb3J0SW5mbzogS25vd25Qb3J0VixcbiAgZGVzY3JpcHRpb246IE1pYkRlc2NyaXB0aW9uVixcbn0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElQb3J0QXJnIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIFBvcnRBcmdWPiB7XG4gIHBvcnRJbmZvOiBJS25vd25Qb3J0O1xuICBkZXNjcmlwdGlvbjogSU1pYkRlc2NyaXB0aW9uO1xufVxuXG5leHBvcnQgY29uc3QgUG9ydHNFdmVudFYgPSBldmVudFR5cGUoJ3BvcnRzJywgdC5hcnJheShQb3J0QXJnVikpO1xuXG5leHBvcnQgaW50ZXJmYWNlIElQb3J0c0V2ZW50IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIFBvcnRzRXZlbnRWPiB7fVxuXG5leHBvcnQgY29uc3QgUG9ydEFkZGVkRXZlbnRWID0gZXZlbnRUeXBlKCdhZGQnLCBQb3J0QXJnVik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVBvcnRBZGRlZEV2ZW50IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIFBvcnRBZGRlZEV2ZW50Vj4ge31cblxuZXhwb3J0IGNvbnN0IFBvcnRSZW1vdmVkRXZlbnRWID0gZXZlbnRUeXBlKCdyZW1vdmUnLCBQb3J0QXJnVik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSVBvcnRSZW1vdmVkRXZlbnQgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgUG9ydFJlbW92ZWRFdmVudFY+IHt9XG5cbmV4cG9ydCBjb25zdCBFdmVudFYgPSB0LnRhZ2dlZFVuaW9uKCdldmVudCcsIFtQb3J0c0V2ZW50ViwgUG9ydEFkZGVkRXZlbnRWLCBQb3J0UmVtb3ZlZEV2ZW50Vl0pO1xuXG5leHBvcnQgdHlwZSBFdmVudCA9IElQb3J0c0V2ZW50IHwgSVBvcnRBZGRlZEV2ZW50IHwgSVBvcnRSZW1vdmVkRXZlbnQ7XG5cbmV4cG9ydCBjbGFzcyBGcm9tU3RyaW5nVHlwZTxBPiBleHRlbmRzIHQuVHlwZTxBLCBzdHJpbmcsIHVua25vd24+IHtcbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCB0eXBlOiBNaXhlZCkge1xuICAgIHN1cGVyKFxuICAgICAgbmFtZSxcbiAgICAgIHR5cGUuaXMsXG4gICAgICAobSwgYykgPT4ge1xuICAgICAgICBjb25zdCBqc29uVmFsaWRhdGlvbiA9IEpTT05Gcm9tU3RyaW5nLnZhbGlkYXRlKG0sIGMpO1xuICAgICAgICBpZiAoanNvblZhbGlkYXRpb24uaXNMZWZ0KCkpIHtcbiAgICAgICAgICByZXR1cm4ganNvblZhbGlkYXRpb24gYXMgYW55O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHsgdmFsdWUgfSA9IGpzb25WYWxpZGF0aW9uO1xuICAgICAgICByZXR1cm4gdHlwZS52YWxpZGF0ZSh2YWx1ZSwgYyk7XG4gICAgICB9LFxuICAgICAgSlNPTi5zdHJpbmdpZnksXG4gICAgKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRXZlbnRGcm9tU3RyaW5nVHlwZSBleHRlbmRzIEZyb21TdHJpbmdUeXBlPEV2ZW50PiB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCdFdmVudEZyb21TdHJpbmcnLCBFdmVudFYpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBFdmVudEZyb21TdHJpbmcgPSBuZXcgRXZlbnRGcm9tU3RyaW5nVHlwZSgpO1xuIl19