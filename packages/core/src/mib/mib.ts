/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import 'reflect-metadata';

import { IMibType } from '@nibus/mibs/index';
/* eslint-disable no-bitwise,no-eval */
/* tslint:disable:no-eval */
import printf from 'printf';

export function validJsName(name: string): string {
  return name.replace(/(_\w)/g, (_, s) => s[1].toUpperCase());
}

export const withValue = (
  value: unknown,
  writable = false,
  configurable = false
): PropertyDescriptor => ({
  value,
  writable,
  configurable,
  enumerable: true,
});
const hex = /^0X[0-9A-F]+$/i;
const isHex = (str: string): boolean =>
  hex.test(str) || parseInt(str, 10).toString(10) !== str.toLowerCase().replace(/^[0 ]+/, '');

export const toInt = (value: string | boolean | number = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 'true') return 1;
  if (value === 'false') return 0;
  return parseInt(value, isHex(value) ? 16 : 10);
};

type ResultType = string | number | boolean | undefined;
type PresentType = string | number | boolean | undefined;

export interface IConverter {
  from: (value: PresentType) => ResultType;
  to: (value: ResultType) => PresentType;
}

export function unitConverter(unit: string): IConverter {
  const fromRe = new RegExp(`(\\s*${unit}\\s*)$`, 'i');
  return {
    from: value => (typeof value === 'string' ? value.replace(fromRe, '') : value),
    to: value => (value != null ? `${value}${unit}` : value),
  };
}

export function precisionConverter(precision: string): IConverter {
  const format = `%.${precision}f`;
  return {
    from: value => (typeof value === 'string' ? parseFloat(value) : value),
    to: value => (typeof value === 'number' ? printf(format, value) : value),
  };
}

/*
const MibPropertyAppInfoV = t.intersection([
  t.type({
    nms_id: t.union([t.string, t.Int]),
    access: t.string,
  }),
  t.partial({
    category: t.string,
    rank: t.string,
    zero: t.string,
    units: t.string,
    precision: t.string,
    representation: t.string,
    get: t.string,
    set: t.string,
  }),
]);
const MibPropertyV = t.type({
  type: t.string,
  annotation: t.string,
  appinfo: MibPropertyAppInfoV,
});

export interface IMibProperty extends t.TypeOf<typeof MibPropertyV> {
  // appinfo: IMibPropertyAppInfo;
}

const MibDeviceAppInfoV = t.intersection([
  t.type({
    mib_version: t.string,
  }),
  t.partial({
    device_type: t.string,
    loader_type: t.string,
    firmware: t.string,
    min_version: t.string,
    disable_batch_reading: t.string,
  }),
]);
const MibDeviceTypeV = t.type({
  annotation: t.string,
  appinfo: MibDeviceAppInfoV,
  properties: t.record(t.string, MibPropertyV),
});

export interface IMibDeviceType extends t.TypeOf<typeof MibDeviceTypeV> {}

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

export interface IMibType extends t.TypeOf<typeof MibTypeV> {}

const MibSubroutineV = t.intersection([
  t.type({
    annotation: t.string,
    appinfo: t.intersection([
      t.type({ nms_id: t.union([t.string, t.Int]) }),
      t.partial({ response: t.string }),
    ]),
  }),
  t.partial({
    properties: t.record(
      t.string,
      t.type({
        type: t.string,
        annotation: t.string,
      })
    ),
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
export const MibDeviceV = t.intersection([
  t.type({
    device: t.string,
    types: t.record(t.string, t.union([MibDeviceTypeV, MibTypeV, SubroutineTypeV])),
  }),
  t.partial({
    subroutines: t.record(t.string, MibSubroutineV),
  }),
]);

export interface MibSubroutines extends t.TypeOf<typeof MibSubroutineV> {}

export interface IMibDevice extends t.TypeOf<typeof MibDeviceV> {}
*/

export function enumerationConverter(enumerationValues: IMibType['enumeration']): IConverter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const to: any = {};
  const keys = Reflect.ownKeys(enumerationValues!) as string[];
  keys.forEach(key => {
    const value = enumerationValues![key];
    const index = toInt(key);
    from[value.annotation] = index;
    to[String(index)] = value.annotation;
  });
  // console.log('from %o, to %o', from, to);
  return {
    from: value => {
      if (Reflect.has(from, String(value))) {
        return from[String(value)];
      }
      const simple = toInt(value);
      return Number.isNaN(simple) ? value : simple;
    },
    to: value => {
      let index: number | string = toInt(value);
      if (Number.isNaN(index)) index = String(value);
      return Reflect.has(to, String(index)) ? to[String(index)] : value;
    },
  };
}

const yes = /^\s*(yes|on|true|1|да)\s*$/i;
const no = /^\s*(no|off|false|0|нет)\s*$/i;
export const booleanConverter: IConverter = {
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

export const percentConverter: IConverter = {
  from: value => {
    const val = Number(value);
    return Number.isNaN(val) ? value : Math.max(Math.min(Math.round((val * 255) / 100), 255), 0);
  },
  to: value => {
    const val = Number(value);
    return Number.isNaN(val) ? value : Math.max(Math.min(Math.round((val * 100) / 255), 100), 0);
  },
};

export function representationConverter(format: string, size: number): IConverter {
  let from: IConverter['from'];
  let to: IConverter['to'];
  let fmt: string;
  // fromFn = toFn = function (value) { return value; };

  switch (format) {
    case '%b':
    case '%B':
      fmt = `%0${size * 8}s`;
      from = value => (typeof value === 'string' ? parseInt(value, 2) : value);
      to = value => (typeof value === 'number' ? printf(fmt, value.toString(2)) : value);
      break;
    case '%x':
    case '%X':
      fmt = `%0${size}s`;
      from = value => (typeof value === 'string' ? parseInt(value, 16) : value);
      to = value => (typeof value === 'number' ? printf(fmt, value.toString(16)) : value);
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

export function packed8floatConverter(subtype: IMibType): IConverter {
  let delta = 0;
  if (subtype.appinfo && subtype.appinfo.zero) {
    delta = parseFloat(subtype.appinfo.zero) || 0;
  }
  return {
    from: value => {
      const val = typeof value === 'string' ? parseFloat(value) : value;
      return typeof val === 'number' ? Math.round((val - delta) * 100) & 0xff : val;
    },
    to: value => {
      const val = Number(value);
      return Number.isInteger(val) ? (val / 100 + delta).toString() : value;
    },
  };
}

export const fixedPointNumber4Converter: IConverter = {
  from: value => {
    const val = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof val !== 'number') {
      return val;
    }
    const dec = Math.round(val * 1000) % 1000;
    const hi = ((Math.floor(val) << 4) + Math.floor(dec / 100)) & 0xff;
    const low = ((dec % 10) + (Math.floor(dec / 10) % 10 << 4)) & 0xff;
    return (hi << 8) | low;
  },
  to: value => {
    if (typeof value !== 'number') {
      return value;
    }
    const hi = (value >> 8) & 0xff;
    const low = value & 0xff;
    const dec = (hi & 0xf) * 100 + (low >> 4) * 10 + (low & 0xf);
    return (hi >> 4) + dec / 1000;
  },
};

export const versionTypeConverter: IConverter = {
  from: () => {
    throw new Error('versionType is readonly property');
  },
  to: value =>
    typeof value === 'number'
      ? `${(value >> 8) & 0xff}.${value & 0xff} [0x${(value >>> 16).toString(16)}]`
      : value,
};

export function getIntSize(type: string): number {
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
      // console.warn('Unknown type:', type);
      return 0;
  }
}

export function minInclusiveConverter(min: number): IConverter {
  return {
    from: value => (typeof value === 'number' ? Math.max(value, min) : value),
    to: value => value,
  };
}

export function maxInclusiveConverter(max: number): IConverter {
  return {
    from: value => (typeof value === 'number' ? Math.min(value, max) : value),
    to: value => value,
  };
}

export const evalConverter = (get: string, set: string): IConverter => ({
  from: eval(set),
  to: eval(get),
});

export const convertTo =
  (converters: IConverter[]) =>
  (value: ResultType): ResultType =>
    converters.reduceRight(
      (result, converter) => result !== undefined && converter.to(result),
      value
    );

export const convertFrom =
  (converters: IConverter[]) =>
  (value: PresentType): PresentType =>
    converters.reduce((present, converter) => converter.from(present), value);
