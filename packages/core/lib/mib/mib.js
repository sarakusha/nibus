"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const t = __importStar(require("io-ts"));
const printf_1 = __importDefault(require("printf"));
function validJsName(name) {
    return name.replace(/(_\w)/g, (_, s) => s[1].toUpperCase());
}
exports.validJsName = validJsName;
exports.withValue = (value, writable = false, configurable = false) => ({
    value,
    writable,
    configurable,
    enumerable: true,
});
const hex = /^0X[0-9A-F]+$/i;
const isHex = (str) => hex.test(str)
    || parseInt(str, 10).toString(10) !== str.toLowerCase().replace(/^[0 ]+/, '');
exports.toInt = (value = 0) => {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'boolean')
        return value ? 1 : 0;
    if (value === 'true')
        return 1;
    if (value === 'false')
        return 0;
    return parseInt(value, isHex(value) ? 16 : 10);
};
function unitConverter(unit) {
    const fromRe = new RegExp(`(\\s*${unit}\\s*)$`, 'i');
    return {
        from: value => (typeof value === 'string' ? value.replace(fromRe, '') : value),
        to: value => (value != null ? `${value}${unit}` : value),
    };
}
exports.unitConverter = unitConverter;
function precisionConverter(precision) {
    const format = `%.${precision}f`;
    return {
        from: value => (typeof value === 'string' ? parseFloat(value) : value),
        to: value => (typeof value === 'number' ? printf_1.default(format, value) : value),
    };
}
exports.precisionConverter = precisionConverter;
const MibPropertyAppInfoV = t.intersection([
    t.type({
        nms_id: t.union([t.string, t.Int]),
        access: t.string,
    }),
    t.partial({
        category: t.string,
    }),
]);
const MibPropertyV = t.type({
    type: t.string,
    annotation: t.string,
    appinfo: MibPropertyAppInfoV,
});
const MibDeviceAppInfoV = t.intersection([
    t.type({
        mib_version: t.string,
    }),
    t.partial({
        device_type: t.string,
        loader_type: t.string,
        firmware: t.string,
        min_version: t.string,
    }),
]);
const MibDeviceTypeV = t.type({
    annotation: t.string,
    appinfo: MibDeviceAppInfoV,
    properties: t.record(t.string, MibPropertyV),
});
const MibTypeV = t.intersection([
    t.type({
        base: t.string,
    }),
    t.partial({
        appinfo: t.partial({
            zero: t.string,
            units: t.string,
            precision: t.string,
            representation: t.string,
            get: t.string,
            set: t.string,
        }),
        minInclusive: t.string,
        maxInclusive: t.string,
        enumeration: t.record(t.string, t.type({ annotation: t.string })),
    }),
]);
const MibSubroutineV = t.intersection([
    t.type({
        annotation: t.string,
        appinfo: t.intersection([
            t.type({ nms_id: t.union([t.string, t.Int]) }),
            t.partial({ response: t.string }),
        ]),
    }),
    t.partial({
        properties: t.record(t.string, t.type({
            type: t.string,
            annotation: t.string,
        })),
    }),
]);
const SubroutineTypeV = t.type({
    annotation: t.string,
    properties: t.type({
        id: t.type({
            type: t.literal('xs:unsignedShort'),
            annotation: t.string,
        }),
    }),
});
exports.MibDeviceV = t.intersection([
    t.type({
        device: t.string,
        types: t.record(t.string, t.union([MibDeviceTypeV, MibTypeV, SubroutineTypeV])),
    }),
    t.partial({
        subroutines: t.record(t.string, MibSubroutineV),
    }),
]);
function enumerationConverter(enumerationValues) {
    const from = {};
    const to = {};
    const keys = Reflect.ownKeys(enumerationValues);
    keys.forEach(key => {
        const value = enumerationValues[key];
        const index = exports.toInt(key);
        from[value.annotation] = index;
        to[String(index)] = value.annotation;
    });
    return {
        from: value => {
            if (Reflect.has(from, String(value))) {
                return from[String(value)];
            }
            const simple = exports.toInt(value);
            return Number.isNaN(simple) ? value : simple;
        },
        to: value => {
            let index = exports.toInt(value);
            if (Number.isNaN(index))
                index = String(value);
            return Reflect.has(to, String(index)) ? to[String(index)] : value;
        },
    };
}
exports.enumerationConverter = enumerationConverter;
const yes = /^\s*(yes|on|true|1|да)\s*$/i;
const no = /^\s*(no|off|false|0|нет)\s*$/i;
exports.booleanConverter = {
    from: value => {
        if (typeof value === 'string') {
            if (yes.test(value)) {
                return true;
            }
            if (no.test(value)) {
                return false;
            }
        }
        return value;
    },
    to: value => {
        if (typeof value === 'boolean') {
            return value ? 'Да' : 'Нет';
        }
        return value;
    },
};
exports.percentConverter = {
    from: value => (typeof value === 'number' ? Math.max(Math.min(Math.round((value * 255) / 100), 255), 0) : value),
    to: value => (typeof value === 'number' ? Math.max(Math.min(Math.round((value * 100) / 255), 100), 0) : value),
};
function representationConverter(format, size) {
    let from;
    let to;
    let fmt;
    switch (format) {
        case '%b':
        case '%B':
            fmt = `%0${size * 8}s`;
            from = value => (typeof value === 'string' ? parseInt(value, 2) : value);
            to = value => (typeof value === 'number' ? printf_1.default(fmt, value.toString(2)) : value);
            break;
        case '%x':
        case '%X':
            fmt = `%0${size}s`;
            from = value => (typeof value === 'string' ? parseInt(value, 16) : value);
            to = value => (typeof value === 'number' ? printf_1.default(fmt, value.toString(16)) : value);
            break;
        default:
            from = value => value;
            to = from;
    }
    return {
        from,
        to,
    };
}
exports.representationConverter = representationConverter;
function packed8floatConverter(subtype) {
    let delta = 0;
    if (subtype.appinfo && subtype.appinfo.zero) {
        delta = parseFloat(subtype.appinfo.zero) || 0;
    }
    return {
        from: value => {
            const val = typeof value === 'string' ? parseFloat(value) : value;
            return typeof val === 'number' ? Math.floor((val - delta) * 100) & 0xFF : val;
        },
        to: value => (typeof value === 'number' ? value / 100 + delta : value),
    };
}
exports.packed8floatConverter = packed8floatConverter;
exports.fixedPointNumber4Converter = {
    from: value => {
        const val = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof val !== 'number') {
            return val;
        }
        const dec = Math.round(val * 1000) % 1000;
        const hi = ((Math.floor(val) << 4) + Math.floor(dec / 100)) & 0xFF;
        const low = ((dec % 10) + ((Math.floor(dec / 10) % 10) << 4)) & 0xFF;
        return (hi << 8) | low;
    },
    to: value => {
        if (typeof value !== 'number') {
            return value;
        }
        const hi = (value >> 8) & 0xFF;
        const low = value & 0xFF;
        const dec = (hi & 0xF) * 100 + (low >> 4) * 10 + (low & 0xF);
        return (hi >> 4) + dec / 1000;
    },
};
exports.versionTypeConverter = {
    from: () => {
        throw new Error('versionType is readonly property');
    },
    to: value => (typeof value === 'number'
        ? `${(value >> 8) & 0xFF}.${value & 0xFF} [0x${(value >>> 16).toString(16)}]`
        : value),
};
function getIntSize(type) {
    switch (type) {
        case 'xs:NMTOKEN':
        case 'xs:unsignedByte':
        case 'xs:byte':
            return 1;
        case 'xs:short':
        case 'xs:unsignedShort':
            return 2;
        case 'xs:int':
        case 'xs:unsignedInt':
            return 4;
        case 'xs:long':
        case 'xs:unsignedLong':
            return 8;
        default:
            return 0;
    }
}
exports.getIntSize = getIntSize;
function minInclusiveConverter(min) {
    return {
        from: value => (typeof value === 'number' ? Math.max(value, min) : value),
        to: value => value,
    };
}
exports.minInclusiveConverter = minInclusiveConverter;
function maxInclusiveConverter(max) {
    return {
        from: value => (typeof value === 'number' ? Math.min(value, max) : value),
        to: value => value,
    };
}
exports.maxInclusiveConverter = maxInclusiveConverter;
exports.evalConverter = (get, set) => ({
    from: eval(set),
    to: eval(get),
});
exports.convertTo = (converters) => (value) => converters.reduceRight((result, converter) => result !== undefined && converter.to(result), value);
exports.convertFrom = (converters) => (value) => converters.reduce((present, converter) => converter.from(present), value);
//# sourceMappingURL=mib.js.map