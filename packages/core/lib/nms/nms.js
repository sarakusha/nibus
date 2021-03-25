"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNmsType = exports.encodeValue = exports.writeValue = exports.decodeValue = exports.getSizeOf = void 0;
const iconv_lite_1 = require("iconv-lite");
const common_1 = require("../common");
const errors_1 = require("../errors");
const nbconst_1 = require("../nbconst");
const NmsValueType_1 = __importDefault(require("./NmsValueType"));
const packByte = (b) => ((b % 100) / 10) * 16 + (b % 10);
const unpackByte = (byte) => (byte & 0x0f) + ((byte >> 4) & 0x0f) * 10;
function getDateTime(buffer, offset = 0) {
    const day = unpackByte(buffer.readUInt8(offset));
    const month = unpackByte(buffer.readUInt8(1 + offset));
    const year = unpackByte(buffer.readUInt8(3 + offset)) + 100 * unpackByte(buffer.readUInt8(2 + offset));
    const hour = unpackByte(buffer.readUInt8(4 + offset));
    const minute = unpackByte(buffer.readUInt8(5 + offset));
    const second = unpackByte(buffer.readUInt8(6 + offset));
    const ms = unpackByte(buffer.readUInt8(8 + offset)) + 100 * (buffer.readUInt8(7 + offset) & 0x0f);
    return new Date(year, month, day, hour, minute, second, ms);
}
function getSizeOf(valueType, value) {
    switch (valueType) {
        case undefined:
            return 0;
        case NmsValueType_1.default.Boolean:
        case NmsValueType_1.default.Int8:
        case NmsValueType_1.default.UInt8:
            return 1;
        case NmsValueType_1.default.Int16:
        case NmsValueType_1.default.UInt16:
            return 2;
        case NmsValueType_1.default.Int32:
        case NmsValueType_1.default.UInt32:
        case NmsValueType_1.default.Real32:
            return 4;
        case NmsValueType_1.default.Int64:
        case NmsValueType_1.default.UInt64:
        case NmsValueType_1.default.Real64:
            return 8;
        case NmsValueType_1.default.DateTime:
            return 10;
        case NmsValueType_1.default.String:
            return value ? value.length + 1 : 0;
        default:
    }
    if ((valueType & NmsValueType_1.default.Array) === 0) {
        throw new errors_1.MibError(`Invalid ValueType ${valueType} ${new Error().stack}`);
    }
    const arrayType = valueType & (NmsValueType_1.default.Array - 1);
    const itemSize = getSizeOf(arrayType) || 0;
    return value ? value.length * itemSize : itemSize;
}
exports.getSizeOf = getSizeOf;
function decodeValue(valueType, buffer, offset = 0) {
    console.assert(buffer.length >= offset + getSizeOf(valueType), `Buffer is too small ${buffer.length} < ${offset} + ${getSizeOf(valueType)}`);
    switch (valueType) {
        case NmsValueType_1.default.Boolean:
            return !!buffer[offset];
        case NmsValueType_1.default.Int8:
            return buffer.readInt8(offset);
        case NmsValueType_1.default.Int16:
            return buffer.readInt16LE(offset);
        case NmsValueType_1.default.Int32:
            return buffer.readInt32LE(offset);
        case NmsValueType_1.default.Int64:
        case NmsValueType_1.default.UInt64:
            return buffer
                .toString('hex', offset, offset + 8)
                .match(/.{2}/g)
                .reverse()
                .join('')
                .toUpperCase();
        case NmsValueType_1.default.UInt8:
            return buffer.readUInt8(offset);
        case NmsValueType_1.default.UInt16:
            return buffer.readUInt16LE(offset);
        case NmsValueType_1.default.UInt32:
            return buffer.readUInt32LE(offset);
        case NmsValueType_1.default.Real32:
            return buffer.readFloatLE(offset);
        case NmsValueType_1.default.Real64:
            return buffer.readDoubleLE(offset);
        case NmsValueType_1.default.String: {
            const nil = buffer.indexOf(0, offset);
            return iconv_lite_1.decode(buffer.slice(offset, nil !== -1 ? nil : undefined), 'win1251');
        }
        case NmsValueType_1.default.DateTime:
            return getDateTime(buffer, offset);
        default:
            break;
    }
    if ((valueType & NmsValueType_1.default.Array) === 0) {
        throw new errors_1.MibError(`Invalid ValueType ${NmsValueType_1.default[valueType]}`);
    }
    const arrayType = valueType & (NmsValueType_1.default.Array - 1);
    const arraySize = buffer.length - offset;
    const itemSize = getSizeOf(arrayType);
    const arrayLength = arraySize / itemSize;
    const array = [];
    for (let i = 0; i < arrayLength; i += 1) {
        const value = decodeValue(arrayType, buffer, offset + i * itemSize);
        array.push(value);
    }
    return array;
}
exports.decodeValue = decodeValue;
function writeValue(valueType, value, buffer, offset = 0) {
    let pos = offset;
    switch (valueType) {
        case NmsValueType_1.default.Boolean:
            pos = buffer.writeUInt8(value ? 1 : 0, pos);
            break;
        case NmsValueType_1.default.Int8:
            pos = buffer.writeInt8(value, pos);
            break;
        case NmsValueType_1.default.Int16:
            pos = buffer.writeInt16LE(value, pos);
            break;
        case NmsValueType_1.default.Int32:
            pos = buffer.writeInt32LE(value, pos);
            break;
        case NmsValueType_1.default.Int64:
            console.error('signedLong is not implemented');
            break;
        case NmsValueType_1.default.UInt64: {
            const strVal = typeof value === 'number' ? value.toString(16) : value.toString();
            pos = buffer.write(common_1.chunkArray(strVal.padStart(16, '0'), 2).reverse().join(''), pos, 8, 'hex');
            break;
        }
        case NmsValueType_1.default.UInt8:
            pos = buffer.writeUInt8(value, pos);
            break;
        case NmsValueType_1.default.UInt16:
            pos = buffer.writeUInt16LE(value, pos);
            break;
        case NmsValueType_1.default.UInt32:
            pos = buffer.writeUInt32LE(value, pos);
            break;
        case NmsValueType_1.default.Real32:
            pos = buffer.writeFloatLE(value, pos);
            break;
        case NmsValueType_1.default.Real64:
            pos = buffer.writeDoubleLE(value, pos);
            break;
        case NmsValueType_1.default.String: {
            let src = iconv_lite_1.encode(value, 'win1251');
            if (src.length > nbconst_1.NMS_MAX_DATA_LENGTH - 2) {
                src = src.slice(0, nbconst_1.NMS_MAX_DATA_LENGTH - 2);
            }
            pos = src.copy(buffer, pos);
            pos = buffer.writeUInt8(0, pos + offset);
            break;
        }
        case NmsValueType_1.default.DateTime: {
            const dtValue = value;
            const dtbuffer = Buffer.from([
                packByte(dtValue.getDate()),
                packByte(dtValue.getMonth()),
                packByte(dtValue.getFullYear() % 100),
                packByte(Math.floor(dtValue.getFullYear() / 100)),
                packByte(dtValue.getHours()),
                packByte(dtValue.getMinutes()),
                packByte(dtValue.getSeconds()),
                packByte(Math.floor(dtValue.getMilliseconds() / 100) & 0x0f),
                packByte(dtValue.getMilliseconds() % 100),
                packByte(dtValue.getDay() + 1),
            ]);
            pos = offset + dtbuffer.copy(buffer, pos);
            break;
        }
        default:
            break;
    }
    if (valueType & NmsValueType_1.default.Array) {
        const arrayType = valueType & (NmsValueType_1.default.Array - 1);
        for (const item of value) {
            pos = writeValue(arrayType, item, buffer, pos);
        }
    }
    return pos;
}
exports.writeValue = writeValue;
function encodeValue(valueType, value) {
    const buffer = Buffer.alloc(1 + getSizeOf(valueType, value));
    buffer[0] = valueType & 0xff;
    writeValue(valueType, value, buffer, 1);
    return buffer;
}
exports.encodeValue = encodeValue;
function getNmsType(simpleType) {
    switch (simpleType) {
        case 'xs:boolean':
            return NmsValueType_1.default.Boolean;
        case 'xs:unsignedByte':
            return NmsValueType_1.default.UInt8;
        case 'xs:byte':
            return NmsValueType_1.default.Int8;
        case 'xs:short':
            return NmsValueType_1.default.Int16;
        case 'xs:unsignedShort':
            return NmsValueType_1.default.UInt16;
        case 'xs:int':
            return NmsValueType_1.default.Int32;
        case 'xs:unsignedInt':
            return NmsValueType_1.default.UInt32;
        case 'xs:long':
            return NmsValueType_1.default.Int64;
        case 'xs:unsignedLong':
            return NmsValueType_1.default.UInt64;
        case 'xs:float':
            return NmsValueType_1.default.Real32;
        case 'xs:NMTOKEN':
            return NmsValueType_1.default.UInt8;
        case 'xs:string':
            return NmsValueType_1.default.String;
        default:
            return NmsValueType_1.default.Unknown;
    }
}
exports.getNmsType = getNmsType;
//# sourceMappingURL=nms.js.map