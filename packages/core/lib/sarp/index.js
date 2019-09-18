"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createSarp = createSarp;
Object.defineProperty(exports, "SarpDatagram", {
  enumerable: true,
  get: function () {
    return _SarpDatagram.default;
  }
});
Object.defineProperty(exports, "ISarpOptions", {
  enumerable: true,
  get: function () {
    return _SarpDatagram.ISarpOptions;
  }
});
Object.defineProperty(exports, "SarpQueryType", {
  enumerable: true,
  get: function () {
    return _SarpQueryType.default;
  }
});

require("source-map-support/register");

var _Address = _interopRequireDefault(require("../Address"));

var _SarpDatagram = _interopRequireWildcard(require("./SarpDatagram"));

var _SarpQueryType = _interopRequireDefault(require("./SarpQueryType"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
function createSarp(queryType, queryParam = Buffer.alloc(5)) {
  const param = Buffer.isBuffer(queryParam) ? queryParam : Buffer.from(queryParam);
  return new _SarpDatagram.default({
    queryType,
    destination: _Address.default.broadcast,
    queryParam: param
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zYXJwL2luZGV4LnRzIl0sIm5hbWVzIjpbImNyZWF0ZVNhcnAiLCJxdWVyeVR5cGUiLCJxdWVyeVBhcmFtIiwiQnVmZmVyIiwiYWxsb2MiLCJwYXJhbSIsImlzQnVmZmVyIiwiZnJvbSIsIlNhcnBEYXRhZ3JhbSIsImRlc3RpbmF0aW9uIiwiQWRkcmVzcyIsImJyb2FkY2FzdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBVUE7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBWkE7Ozs7Ozs7OztBQWlCTyxTQUFTQSxVQUFULENBQ0xDLFNBREssRUFDcUJDLFVBQTBDLEdBQUdDLE1BQU0sQ0FBQ0MsS0FBUCxDQUFhLENBQWIsQ0FEbEUsRUFDbUY7QUFDeEYsUUFBTUMsS0FBYSxHQUFHRixNQUFNLENBQUNHLFFBQVAsQ0FBZ0JKLFVBQWhCLElBQ2xCQSxVQURrQixHQUVsQkMsTUFBTSxDQUFDSSxJQUFQLENBQXVCTCxVQUF2QixDQUZKO0FBR0EsU0FBTyxJQUFJTSxxQkFBSixDQUFpQjtBQUN0QlAsSUFBQUEsU0FEc0I7QUFFdEJRLElBQUFBLFdBQVcsRUFBRUMsaUJBQVFDLFNBRkM7QUFHdEJULElBQUFBLFVBQVUsRUFBRUc7QUFIVSxHQUFqQixDQUFQO0FBS0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gT09PIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbmltcG9ydCBBZGRyZXNzIGZyb20gJy4uL0FkZHJlc3MnO1xuaW1wb3J0IFNhcnBEYXRhZ3JhbSwgeyBJU2FycE9wdGlvbnMgfSBmcm9tICcuL1NhcnBEYXRhZ3JhbSc7XG5pbXBvcnQgU2FycFF1ZXJ5VHlwZSBmcm9tICcuL1NhcnBRdWVyeVR5cGUnO1xuXG5leHBvcnQgeyBTYXJwUXVlcnlUeXBlIH07XG5leHBvcnQgeyBTYXJwRGF0YWdyYW0sIElTYXJwT3B0aW9ucyB9O1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FycChcbiAgcXVlcnlUeXBlOiBTYXJwUXVlcnlUeXBlLCBxdWVyeVBhcmFtOiBCdWZmZXIgfCBVaW50OEFycmF5IHwgbnVtYmVyW10gPSBCdWZmZXIuYWxsb2MoNSkpIHtcbiAgY29uc3QgcGFyYW06IEJ1ZmZlciA9IEJ1ZmZlci5pc0J1ZmZlcihxdWVyeVBhcmFtKVxuICAgID8gcXVlcnlQYXJhbVxuICAgIDogQnVmZmVyLmZyb20oPG51bWJlcltdPihxdWVyeVBhcmFtKSk7XG4gIHJldHVybiBuZXcgU2FycERhdGFncmFtKHtcbiAgICBxdWVyeVR5cGUsXG4gICAgZGVzdGluYXRpb246IEFkZHJlc3MuYnJvYWRjYXN0LFxuICAgIHF1ZXJ5UGFyYW06IHBhcmFtLFxuICB9KTtcbn1cbiJdfQ==