/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable max-classes-per-file,@typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import { crc16ccitt } from 'crc';
import { EventEmitter } from 'events';
import sortBy from 'lodash/sortBy';
import type { Dictionary } from 'lodash';
import findLast from 'lodash/findLast';
import flatten from 'lodash/flatten';
import transform from 'lodash/transform';
import without from 'lodash/without';
import debounce from 'lodash/debounce';
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from 'debug';
import {
  type IMibDevice,
  type IMibDeviceType,
  type IMibProperty,
  type IMibType,
  getMib,
  getMibNames,
} from '@nibus/mibs';
import Address, { AddressParam, AddressType } from '../Address';
import { NibusError } from '../errors';
import { NMS_MAX_DATA_LENGTH } from '../nbconst';
import { IDLE_TIMEOUT, type INibusConnection, type VersionInfo } from '../nibus/NibusConnection';
import NibusDatagram from '../nibus/NibusDatagram';
import {
  TypedValue,
  createExecuteProgramInvocation,
  createNmsDownloadSegment,
  createNmsInitiateDownloadSequence,
  createNmsInitiateUploadSequence,
  createNmsRead,
  createNmsRequestDomainDownload,
  createNmsRequestDomainUpload,
  createNmsTerminateDownloadSequence,
  createNmsUploadSegment,
  createNmsVerifyDomainChecksum,
  createNmsWrite,
  getNmsType,
} from '../nms';
import NmsDatagram from '../nms/NmsDatagram';
import NmsValueType from '../nms/NmsValueType';
import { chunkArray, toError, toMessage } from '../common';
import timeid from '../timeid';
import {
  IConverter,
  booleanConverter,
  convertFrom,
  convertTo,
  enumerationConverter,
  evalConverter,
  fixedPointNumber4Converter,
  getIntSize,
  maxInclusiveConverter,
  minInclusiveConverter,
  packed8floatConverter,
  percentConverter,
  precisionConverter,
  representationConverter,
  toInt,
  unitConverter,
  validJsName,
  versionTypeConverter,
  withValue,
} from './mib';

const debug = debugFactory('nibus:devices');

const $values = Symbol('values');
const $errors = Symbol('errors');
const $dirties = Symbol('dirties');

function safeNumber(val: any): any {
  const num = parseFloat(val);
  return Number.isNaN(num) || `${num}` !== val ? val : num;
}

// eslint-disable-next-line no-shadow
enum PrivateProps {
  connection = -1,
}

// type DeviceConstructor = new (address: Address) => any;
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
interface DeviceConstructor extends Function {
  prototype: DevicePrototype;
  (this: DevicePrototype, address: Address): void;
}

const mibTypesCache: { [mibname: string]: DeviceConstructor } = {};

// interface IMibPropertyAppInfo extends t.TypeOf<typeof MibPropertyAppInfoV> {}

type Listener<T> = (arg: T) => void;
type ChangeArg = { id: number; names: string[] };
type ChangeListener = Listener<ChangeArg>;
type UploadStartArg = { domain: string; domainSize: number; offset: number; size: number };
type UploadStartListener = Listener<UploadStartArg>;
type UploadDataArg = { domain: string; data: Buffer; pos: number };
export type UploadDataListener = Listener<UploadDataArg>;
type UploadFinishArg = { domain: string; offset: number; data: Buffer };
type UploadFinishListener = Listener<UploadFinishArg>;
type DownloadStartArg = { domain: string; domainSize: number; offset: number; size: number };
type DownloadStartListener = Listener<DownloadStartArg>;
type DownloadDataArg = { domain: string; length: number };
export type DownloadDataListener = Listener<DownloadDataArg>;
type DownloadFinishArg = { domain: string; offset: number; size: number };
type DownloadFinishListener = Listener<DownloadFinishArg>;
export type DeviceId = string & { __brand: 'DeviceId' };

interface IDeviceEvents {
  connected: () => void;
  disconnected: () => void;
  changing: ChangeListener;
  changed: ChangeListener;
  uploadStart: UploadStartListener;
  uploadData: UploadDataListener;
  uploadFinish: UploadFinishListener;
  downloadStart: DownloadStartListener;
  downloadData: DownloadDataListener;
  downloadFinish: DownloadFinishListener;
  uploadError: (e: Error) => void;
  release: (device: IDevice) => void;
  addressChanged: (prev: Address, address: Address) => void;
  idle: (lastActivity: number) => void;
}

export interface IDevice {
  readonly id: DeviceId;
  readonly address: Address;
  readonly lastActivity: number;
  connection?: INibusConnection;
  drain(): Promise<number[]>;
  write(...ids: number[]): Promise<number[]>;
  read(...ids: number[]): Promise<{ [name: string]: any }>;
  upload(domain: string, offset?: number, size?: number): Promise<Buffer>;
  download(domain: string, data: Buffer, offset?: number, noTerm?: boolean): Promise<void>;
  execute(
    program: string,
    args?: Record<string, any>
  ): Promise<NmsDatagram | NmsDatagram[] | undefined>;
  release(): number;
  getId(idOrName: string | number): number;
  getName(idOrName: string | number): string;
  getRawValue(idOrName: number | string): any;
  getError(idOrName: number | string): any;
  isDirty(idOrName: string | number): boolean;
  ping(): Promise<number>;
  [mibProperty: string]: any;

  on<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
  once<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
  off<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
  toJSON(): unknown;
  // addListener<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
  // removeListener<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
  // emit<U extends keyof IDeviceEvents>(event: U, ...args: Parameters<IDeviceEvents[U]>): boolean;
}

interface DevicesEvents {
  // serno: (prevAddress: Address, newAddress: Address) => void;
  new: (device: IDevice) => void;
  delete: (device: IDevice) => void;
}

interface ISubroutineDesc {
  id: number;
  // name: string;
  description: string;
  notReply?: boolean;
  args?: { name: string; type: NmsValueType; desc?: string }[];
}

interface IPropertyDescriptor<Owner> {
  configurable?: boolean;
  enumerable?: boolean;
  value?: any;
  writable?: boolean;

  get?(this: Owner): any;

  set?(this: Owner, v: any): void;
}

function getBaseType(types: IMibDevice['types'], type: string): string {
  let base = type;
  for (
    let superType = types[base] as IMibType;
    superType != null;
    superType = types[superType.base] as IMibType
  ) {
    base = superType.base;
  }
  return base;
}

function defineMibProperty(
  target: DevicePrototype,
  key: string,
  types: IMibDevice['types'],
  prop: IMibProperty
): [number, string] {
  const propertyKey = validJsName(key);
  const { appinfo } = prop;
  const id = toInt(appinfo.nms_id);
  Reflect.defineMetadata('id', id, target, propertyKey);
  const simpleType = getBaseType(types, prop.type);
  const type = types[prop.type] as IMibType;
  const converters: IConverter[] = [];
  const isReadable = appinfo.access.indexOf('r') > -1;
  const isWritable = appinfo.access.indexOf('w') > -1;
  let enumeration: IMibType['enumeration'] | undefined;
  let min: number | undefined;
  let max: number | undefined;
  switch (getNmsType(simpleType)) {
    case NmsValueType.Int8:
      min = -128;
      max = 127;
      break;
    case NmsValueType.Int16:
      min = -32768;
      max = 32767;
      break;
    case NmsValueType.Int32:
      min = -2147483648;
      max = 2147483647;
      break;
    case NmsValueType.UInt8:
      min = 0;
      max = 255;
      break;
    case NmsValueType.UInt16:
      min = 0;
      max = 65535;
      break;
    case NmsValueType.UInt32:
      min = 0;
      max = 4294967295;
      break;
    default:
      break;
  }
  if (key === 'brightness' && prop.type === 'xs:unsignedByte') {
    // console.log('uSE PERCENT 100<->250');
    converters.push(percentConverter);
    Reflect.defineMetadata('unit', '%', target, propertyKey);
    Reflect.defineMetadata('min', 0, target, propertyKey);
    Reflect.defineMetadata('max', 100, target, propertyKey);
    min = undefined;
    max = undefined;
  } else if (isWritable) {
    if (type != null) {
      const { minInclusive, maxInclusive } = type;
      if (minInclusive) {
        const val = parseFloat(minInclusive);
        min = min !== undefined ? Math.max(min, val) : val;
      }
      if (maxInclusive) {
        const val = parseFloat(maxInclusive);
        max = max !== undefined ? Math.min(max, val) : val;
      }
    }
    if (min !== undefined) {
      // min = convertTo(converters)(min); // as number;
      Reflect.defineMetadata('min', min, target, propertyKey);
    }
    if (max !== undefined) {
      // max = convertTo(converters)(max); // as number;
      Reflect.defineMetadata('max', max, target, propertyKey);
    }
  }
  const info = type?.appinfo ?? appinfo;
  if (info != null) {
    //   const { appinfo: info = {} } = type;
    enumeration = type?.enumeration;
    const { units, precision, representation, get, set } = info;
    const size = getIntSize(simpleType);
    if (units) {
      if (!isWritable) converters.push(unitConverter(units));
      Reflect.defineMetadata('unit', units, target, propertyKey);
    }
    let precisionConv: IConverter = {
      from: v => v,
      to: v => v,
    };
    if (precision) {
      precisionConv = precisionConverter(precision);
      converters.push(precisionConv);
      const prec = 1 / 10 ** parseInt(precision, 10);
      Reflect.defineMetadata('step', prec, target, propertyKey);
    }
    if (enumeration) {
      // console.log({ enumeration, propertyKey });
      converters.push(enumerationConverter(enumeration));
      Reflect.defineMetadata(
        'enum',
        Object.entries(enumeration).map(([enumKey, val]) => [val!.annotation, toInt(enumKey)]),
        target,
        propertyKey
      );
    }
    // if (representation) {
    //   debug('REPR', representation, size, propertyKey);
    // }
    if (representation && size) converters.push(representationConverter(representation, size));
    if (get && set) {
      const conv = evalConverter(get, set);
      converters.push(conv);
      const [a, b] = [Number(conv.to(min)), Number(conv.to(max))];
      const minEval = parseFloat(precisionConv.to(Math.min(a, b)) as string);
      const maxEval = parseFloat(precisionConv.to(Math.max(a, b)) as string);
      Reflect.defineMetadata('min', minEval, target, propertyKey);
      Reflect.defineMetadata('max', maxEval, target, propertyKey);
    }
  }
  switch (type?.base ?? simpleType) {
    case 'packed8Float':
      converters.push(packed8floatConverter(type));
      break;
    case 'fixedPointNumber4':
      converters.push(fixedPointNumber4Converter);
      break;
    default:
      break;
  }
  if (min !== undefined) {
    converters.push(minInclusiveConverter(min));
  }
  if (max !== undefined) {
    converters.push(maxInclusiveConverter(max));
  }

  if (prop.type === 'versionType') {
    converters.push(versionTypeConverter);
  }
  if (simpleType === 'xs:boolean' && !enumeration) {
    converters.push(booleanConverter);
    Reflect.defineMetadata(
      'enum',
      [
        ['Да', true],
        ['Нет', false],
      ],
      target,
      propertyKey
    );
  }
  Reflect.defineMetadata('isWritable', isWritable, target, propertyKey);
  Reflect.defineMetadata('isReadable', isReadable, target, propertyKey);
  Reflect.defineMetadata('type', prop.type, target, propertyKey);
  Reflect.defineMetadata('simpleType', simpleType, target, propertyKey);
  Reflect.defineMetadata(
    'displayName',
    prop.annotation ? prop.annotation : key,
    target,
    propertyKey
  );
  if (appinfo.category) Reflect.defineMetadata('category', appinfo.category, target, propertyKey);
  if (appinfo.rank) Reflect.defineMetadata('rank', appinfo.rank, target, propertyKey);
  Reflect.defineMetadata('nmsType', getNmsType(simpleType), target, propertyKey);
  const attributes: IPropertyDescriptor<DevicePrototype> = {
    enumerable: isReadable,
  };
  const to = convertTo(converters);
  const from = convertFrom(converters);
  Reflect.defineMetadata('convertTo', to, target, propertyKey);
  Reflect.defineMetadata('convertFrom', from, target, propertyKey);
  attributes.get = function get() {
    console.assert(Reflect.get(this, '$countRef') > 0, 'Device was released');
    let value;
    if (!this.getError(id)) {
      value = to(this.getRawValue(id));
    }
    return value;
  };
  if (isWritable) {
    attributes.set = function set(newValue: any) {
      console.assert(Reflect.get(this, '$countRef') > 0, 'Device was released');
      const value = from(newValue);
      if (value === undefined || Number.isNaN(value as number)) {
        throw new Error(`Invalid value: ${JSON.stringify(newValue)}`);
      }
      // console.log({ setRawValue: value, newValue });
      this.setRawValue(id, value);
    };
  }
  Reflect.defineProperty(target, propertyKey, attributes);
  return [id, propertyKey];
}

// export function getMibFile(mibname: string): string {
//   return path.resolve(__dirname, '../../mibs/', `${mibname}.mib.json`);
// }

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class DevicePrototype extends TypedEmitter<IDeviceEvents> implements IDevice {
  // will be overridden for an instance
  $countRef = 1;

  $read?: Promise<any>;

  // private $debounceDrain = _.debounce(this.drain, 25);

  // will be overridden for an instance
  $lastActivity = 0;

  constructor(mibname: string) {
    super();
    const mib = getMib(mibname);
    if (!mib) throw new TypeError(`Unknown mib: ${mibname}`);
    const { types, subroutines } = mib;
    const device = types[mib.device] as IMibDeviceType;
    Reflect.defineMetadata('mib', mibname, this);
    // Reflect.defineMetadata('mibfile', `${mibname}.mib.json`, this);
    Reflect.defineMetadata('annotation', device.annotation, this);
    Reflect.defineMetadata('mibVersion', device.appinfo.mib_version, this);
    Reflect.defineMetadata('deviceType', toInt(device.appinfo.device_type), this);
    if (device.appinfo.loader_type)
      Reflect.defineMetadata('loaderType', toInt(device.appinfo.loader_type), this);
    if (device.appinfo.firmware) Reflect.defineMetadata('firmware', device.appinfo.firmware, this);
    if (device.appinfo.min_version)
      Reflect.defineMetadata('min_version', device.appinfo.min_version, this);
    if (types.errorType)
      Reflect.defineMetadata('errorType', (types.errorType as IMibType).enumeration, this);

    if (subroutines) {
      const metasubs = transform(
        subroutines,
        (result, sub, name) => {
          result[name] = {
            id: toInt(sub.appinfo.nms_id),
            description: sub.annotation,
            args:
              sub.properties &&
              Object.entries(sub.properties).map(([propName, prop]) => ({
                name: propName,
                type: getNmsType(prop.type),
                desc: prop.annotation,
              })),
          };
        },
        {} as Dictionary<ISubroutineDesc>
      );
      Reflect.defineMetadata('subroutines', metasubs, this);
    }

    // TODO: category
    // const mibCategory = _.find(detector.detection!.mibCategories, { mib: mibname });
    // if (mibCategory) {
    //   const { category, disableBatchReading } = mibCategory;
    //   Reflect.defineMetadata('category', category, this);
    //   Reflect.defineMetadata('disableBatchReading', !!disableBatchReading, this);
    // }
    if (device.appinfo.disable_batch_reading) {
      const disableBatchReading = Boolean(
        JSON.parse(device.appinfo.disable_batch_reading.toLowerCase())
      );
      Reflect.defineMetadata('disableBatchReading', disableBatchReading, this);
    }
    const keys = Reflect.ownKeys(device.properties) as string[];
    Reflect.defineMetadata('mibProperties', keys.map(validJsName), this);
    const map: { [id: number]: string[] } = {};
    keys.forEach((key: string) => {
      const [id, propName] = defineMibProperty(this, key, types, device.properties[key]);
      if (!map[id]) {
        map[id] = [propName];
      } else {
        map[id].push(propName);
      }
    });
    Reflect.defineMetadata('map', map, this);
  }

  public get connection(): INibusConnection | undefined {
    const { [$values]: values } = this;
    return values[PrivateProps.connection];
  }

  public set connection(value: INibusConnection | undefined) {
    const { [$values]: values } = this;
    const prev = values[PrivateProps.connection];
    if (prev === value) return;
    values[PrivateProps.connection] = value;
    this.emit(value != null ? 'connected' : 'disconnected');
  }

  // noinspection JSUnusedGlobalSymbols
  public toJSON(): any {
    const json: any = {
      mib: Reflect.getMetadata('mib', this),
    };
    const keys: string[] = Reflect.getMetadata('mibProperties', this);
    keys.forEach(key => {
      if (this[key] !== undefined) json[key] = this[key];
    });
    json.address = this.address.toString();
    return json;
  }

  public getId(idOrName: string | number): number {
    let id: number;
    if (typeof idOrName === 'string') {
      id = Reflect.getMetadata('id', this, idOrName);
      if (Number.isInteger(id)) return id;
      id = toInt(idOrName);
    } else {
      id = idOrName;
    }
    const map = Reflect.getMetadata('map', this);
    if (!Reflect.has(map, id)) {
      throw new Error(`Unknown property ${idOrName}`);
    }
    return id;
  }

  public getName(idOrName: string | number): string {
    const map = Reflect.getMetadata('map', this);
    if (Reflect.has(map, idOrName)) {
      return map[idOrName][0];
    }
    const keys: string[] = Reflect.getMetadata('mibProperties', this);
    if (typeof idOrName === 'string' && keys.includes(idOrName)) return idOrName;
    throw new Error(`Unknown property ${idOrName}`);
  }

  /*
    public toIds(idsOrNames: (string | number)[]): number[] {
      const map = Reflect.getMetadata('map', this);
      return idsOrNames.map((idOrName) => {
        if (typeof idOrName === 'string')
      });
    }
  */
  public getRawValue(idOrName: number | string): any {
    const id = this.getId(idOrName);
    const { [$values]: values } = this;
    return values[id];
  }

  public setRawValue(idOrName: number | string, value: any, isDirty = true): void {
    // debug(`setRawValue(${idOrName}, ${JSON.stringify(safeNumber(value))})`);
    const id = this.getId(idOrName);
    const { [$values]: values, [$errors]: errors } = this;
    const newVal = safeNumber(value);
    // if (id === 11) {
    //   console.log('SERNO', { value: value.toString(16), newVal: newVal.toString(16) });
    // }
    if (newVal !== values[id] || errors[id]) {
      values[id] = newVal;
      delete errors[id];
      this.setDirty(id, isDirty);
    }
  }

  public getError(idOrName: number | string): any {
    const id = this.getId(idOrName);
    const { [$errors]: errors } = this;
    return errors[id];
  }

  public setError(idOrName: number | string, error?: Error): void {
    const id = this.getId(idOrName);
    const { [$errors]: errors } = this;
    if (error != null) {
      errors[id] = error;
    } else {
      delete errors[id];
    }
  }

  public isDirty(idOrName: string | number): boolean {
    const id = this.getId(idOrName);
    const { [$dirties]: dirties } = this;
    return !!dirties[id];
  }

  public setDirty(idOrName: string | number, isDirty = true): void {
    const id = this.getId(idOrName);
    const map: { [id: number]: string[] } = Reflect.getMetadata('map', this);
    const { [$dirties]: dirties } = this;
    if (isDirty) {
      dirties[id] = true;
      // this.write(id).catch(() => {});
    } else {
      delete dirties[id];
    }
    const names = map[id] || [];
    this.emit(isDirty ? 'changing' : 'changed', {
      id,
      names,
    });
    if (
      names.includes('serno') &&
      !isDirty &&
      this.address.type === AddressType.mac &&
      typeof this.serno === 'string'
    ) {
      const value = this.serno;
      const prevAddress = this.address;
      const address = new Address(
        Buffer.from(value.padStart(12, '0').substring(value.length - 12), 'hex')
      );
      Reflect.defineProperty(this, 'address', withValue(address, false, true));
      this.emit('addressChanged', prevAddress, address);
      // console.log('DEFINE NEW ADDRESS', address, this.address.toString());
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      // devices.emit('serno', prevAddress, this.address);
    }
  }

  public addref(): number {
    this.$countRef += 1;
    // debug('addref', new Error('addref').stack);
    return this.$countRef;
  }

  public release(): number {
    this.$countRef -= 1;
    if (this.$countRef <= 0) {
      // const key = this.address.toString();
      this.emit('release', this);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      // devices.emit('delete', this);
    }
    return this.$countRef;
  }

  public drain(): Promise<number[]> {
    // debug(`drain [${this.address}]`);
    const { [$dirties]: dirties } = this;
    const ids = Object.keys(dirties)
      .map(Number)
      .filter(id => dirties[id]);
    return ids.length > 0 ? this.write(...ids) : Promise.resolve([]);
  }

  public write(...ids: number[]): Promise<number[]> {
    const { connection } = this;
    if (!connection) return Promise.reject(new Error(`${this.address} is disconnected`));
    const sendDatagram = this.createSender(connection);
    if (ids.length === 0) {
      return this.writeAll();
    }
    debug(`writing ${ids.join()} to [${this.address}]`);
    const map = Reflect.getMetadata('map', this);
    const invalidNms: number[] = [];
    const requests = ids.reduce((acc: NmsDatagram[], id) => {
      const [name] = map[id];
      if (!name) {
        debug(`Unknown id: ${id} for ${Reflect.getMetadata('mib', this)}`);
      } else {
        try {
          acc.push(
            createNmsWrite(
              this.address,
              id,
              Reflect.getMetadata('nmsType', this, name),
              this.getRawValue(id)
            )
          );
        } catch (e) {
          console.error('Error while create NMS datagram', toError(e).message);
          invalidNms.push(-id);
        }
      }
      return acc;
    }, []);
    return Promise.all(
      requests.map(datagram =>
        sendDatagram(datagram).then(
          response => {
            const { status } = response as NmsDatagram;
            if (status === 0) {
              this.setDirty(datagram.id, false);
              return datagram.id;
            }
            this.setError(datagram.id, new NibusError(status!, this));
            return -datagram.id;
          },
          reason => {
            this.setError(datagram.id, reason);
            return -datagram.id;
          }
        )
      )
    ).then(idss => idss.concat(invalidNms));
  }

  public writeValues(source: Record<string, unknown>, strong = true): Promise<number[]> {
    try {
      const ids = Object.keys(source).map(name => this.getId(name));
      if (ids.length === 0) return Promise.reject(new TypeError('value is empty'));
      Object.assign(this, source);
      return this.write(...ids).then(written => {
        if (written.length === 0 || (strong && written.length !== ids.length)) {
          throw this.getError(ids[0]);
        }
        return written;
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async read(...ids: number[]): Promise<{ [name: string]: any }> {
    const { connection } = this;
    if (!connection) return Promise.reject(new Error('disconnected'));
    const sendDatagram = this.createSender(connection);
    if (ids.length === 0) return this.readAll();
    // debug(`read ${ids.join()} from [${this.address}]`);
    const disableBatchReading = Reflect.getMetadata('disableBatchReading', this);
    const map: { [id: string]: string[] } = Reflect.getMetadata('map', this);
    const chunks = chunkArray(ids, disableBatchReading ? 1 : 21);
    debug(`read [${chunks.map(chunk => `[${chunk.join()}]`).join()}] from [${this.address}]`);
    const isSiolynx = Reflect.getMetadata('mib', this) === 'siolynx';
    const requests = chunks.map<[NmsDatagram, number[]]>(chunk => [
      createNmsRead(isSiolynx ? Address.empty : this.address, ...chunk),
      chunk,
    ]);
    const parseResult = (id: number, status: Error | number, value?: any): Record<string, any> => {
      if (status === 0) {
        this.setRawValue(id, value, false);
      } else {
        this.setError(id, typeof status === 'number' ? new NibusError(status, this) : status);
      }
      const result: Record<string, any> = {};
      const names = map[id];
      console.assert(names && names.length > 0, `Invalid id ${id}`);
      names.forEach(propName => {
        result[propName] =
          status === 0 ? this[propName] : { error: (this.getError(id) || {}).message || 'error' };
      });
      return result;
    };
    return requests.reduce(
      async (promise, [datagram, chunkIds]) => {
        const result = await promise;
        try {
          const response = await sendDatagram(datagram);
          const datagrams: NmsDatagram[] = Array.isArray(response)
            ? (response as NmsDatagram[])
            : [response as NmsDatagram];
          // принудительно задаем типы (ti_lux_2_3)
          if (disableBatchReading) {
            datagrams.forEach(data => {
              const name = this.getName(data.id);
              const type = Reflect.getMetadata('nmsType', this, name);
              data.nms[1] = type;
            });
          }
          datagrams.forEach(({ id, value, status }) =>
            Object.assign(result, parseResult(id, status!, value))
          );
        } catch (e) {
          chunkIds.forEach(id => Object.assign(result, parseResult(id, toError(e))));
        }
        return result;
      },
      Promise.resolve({} as { [name: string]: any })
    );
  }

  async upload(domain: string, offset = 0, size: number | undefined = undefined): Promise<Buffer> {
    const { connection } = this;
    try {
      if (!connection) throw new Error('disconnected');
      const sendDatagram = this.createSender(connection);
      const reqUpload = createNmsRequestDomainUpload(this.address, domain.padEnd(8, '\0'));
      const { id, value: domainSize, status } = (await sendDatagram(reqUpload)) as NmsDatagram;
      if (status !== 0) {
        // debug('<error>', status);
        throw new NibusError(status!, this, 'Request upload domain error');
      }
      const initUpload = createNmsInitiateUploadSequence(this.address, id);
      const { status: initStat } = (await sendDatagram(initUpload)) as NmsDatagram;
      if (initStat !== 0) {
        throw new NibusError(initStat!, this, 'Initiate upload domain error');
      }
      const total = size || domainSize - offset;
      let rest = total;
      let pos = offset;
      this.emit('uploadStart', {
        domain,
        domainSize,
        offset,
        size: total,
      });
      const bufs: Buffer[] = [];
      while (rest > 0) {
        const length = Math.min(255, rest);
        const uploadSegment = createNmsUploadSegment(this.address, id, pos, length);
        const {
          status: uploadStatus,
          value: result,
          // eslint-disable-next-line no-await-in-loop
        } = (await sendDatagram(uploadSegment)) as NmsDatagram;
        if (uploadStatus !== 0) {
          throw new NibusError(uploadStatus!, this, 'Upload segment error');
        }
        if (result.data.length === 0) {
          break;
        }
        bufs.push(result.data);
        this.emit('uploadData', {
          domain,
          pos,
          data: result.data,
        });
        rest -= result.data.length;
        pos += result.data.length;
      }
      const result = Buffer.concat(bufs);
      this.emit('uploadFinish', {
        domain,
        offset,
        data: result,
      });
      return result;
    } catch (e) {
      this.emit('uploadError', toError(e));
      throw e;
    }
  }

  async download(domain: string, buffer: Buffer, offset = 0, noTerm = false): Promise<void> {
    const { connection } = this;
    if (!connection) throw new Error('disconnected');
    const sendDatagram = this.createSender(connection);
    const reqDownload = createNmsRequestDomainDownload(this.address, domain.padEnd(8, '\0'));
    const { id, value: max, status } = (await sendDatagram(reqDownload)) as NmsDatagram;
    if (status !== 0) {
      // debug('<error>', status);
      throw new NibusError(status!, this, `Request download domain "${domain}" error`);
    }
    const terminate = async (err?: Error): Promise<void> => {
      let termStat = 0;
      if (!noTerm) {
        const req = createNmsTerminateDownloadSequence(this.address, id);
        const res = (await sendDatagram(req)) as NmsDatagram;
        termStat = res.status!;
      }
      if (err) throw err;
      if (termStat !== 0) {
        throw new NibusError(
          termStat!,
          this,
          'Terminate download sequence error, maybe need --no-term'
        );
      }
    };
    if (buffer.length > max - offset) {
      throw new Error(`Buffer too large. Expected ${max - offset} bytes`);
    }
    const initDownload = createNmsInitiateDownloadSequence(this.address, id);
    const { status: initStat } = (await sendDatagram(initDownload)) as NmsDatagram;
    if (initStat !== 0) {
      try {
        await terminate();
      } catch (e) {
        debug(`error while terminate: ${toMessage(e)}`);
      }
      throw new NibusError(initStat!, this, 'Initiate download domain error');
    }
    this.emit('downloadStart', {
      domain,
      offset,
      domainSize: max,
      size: buffer.length,
    });
    const crc = crc16ccitt(buffer, 0);
    const chunkSize = NMS_MAX_DATA_LENGTH - 4;
    const chunks = chunkArray(buffer, chunkSize);
    await chunks.reduce(async (prev, chunk: Buffer, i) => {
      await prev;
      const pos = i * chunkSize + offset;
      const segmentDownload = createNmsDownloadSegment(this.address, id!, pos, chunk);
      const { status: downloadStat } = (await sendDatagram(segmentDownload)) as NmsDatagram;
      if (downloadStat !== 0) {
        await terminate(new NibusError(downloadStat!, this, 'Download segment error'));
      }
      this.emit('downloadData', {
        domain,
        length: chunk.length,
      });
    }, Promise.resolve());
    const verify = createNmsVerifyDomainChecksum(this.address, id, offset, buffer.length, crc);
    const { status: verifyStat } = (await sendDatagram(verify)) as NmsDatagram;
    if (verifyStat !== 0) {
      await terminate(new NibusError(verifyStat!, this, 'Download segment error'));
    }
    await terminate();
    this.emit('downloadFinish', {
      domain,
      offset,
      size: buffer.length,
    });
  }

  async execute(
    program: string,
    args?: Record<string, any>
  ): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    const { connection } = this;
    if (!connection) throw new Error('disconnected');
    const sendDatagram = this.createSender(connection);
    const subroutines = Reflect.getMetadata('subroutines', this) as Record<string, ISubroutineDesc>;
    if (!subroutines || !Reflect.has(subroutines, program)) {
      console.warn('subroutines', subroutines);
      throw new Error(`Unknown program ${program}`);
    }
    const subroutine = subroutines[program];
    const props: TypedValue[] = [];
    if (subroutine.args) {
      Object.entries(subroutine.args).forEach(([name, desc]) => {
        const arg = args && args[name];
        if (!arg) throw new Error(`Expected arg ${name} in program ${program}`);
        props.push([desc.type, arg]);
      });
    }
    const req = createExecuteProgramInvocation(
      this.address,
      subroutine.id,
      subroutine.notReply,
      ...props
    );
    return sendDatagram(req);
  }

  private writeAll(): Promise<number[]> {
    const { [$values]: values } = this;
    const map = Reflect.getMetadata('map', this);
    const ids = Object.entries(values)
      .filter(([, value]) => value != null)
      .map(([id]) => Number(id))
      .filter(id => Reflect.getMetadata('isWritable', this, map[id][0]));
    return ids.length > 0 ? this.write(...ids) : Promise.resolve([]);
  }

  private readAll(): Promise<any> {
    if (this.$read) return this.$read;
    const map: { [id: string]: string[] } = Reflect.getMetadata('map', this);
    const ids = Object.entries(map)
      .filter(([, names]) => Reflect.getMetadata('isReadable', this, names[0]))
      .map(([id]) => Number(id))
      .sort();
    this.$read = ids.length > 0 ? this.read(...ids) : Promise.resolve([]);
    const clear = (): void => {
      delete this.$read;
    };
    return this.$read.finally(clear);
  }

  get lastActivity(): number {
    return this.$lastActivity;
  }

  private startIdle = debounce(function idle(this: DevicePrototype) {
    this.emit('idle', this.lastActivity);
  }, IDLE_TIMEOUT);

  protected resetIdle(): void {
    this.$lastActivity = Date.now();
    this.startIdle.bind(this)();
  }

  protected createSender(connection: INibusConnection) {
    return (datagram: NibusDatagram) => {
      this.resetIdle();
      return connection.sendDatagram(datagram);
    };
  }

  async ping(): Promise<number> {
    const { connection } = this;
    if (!connection) return -1;
    const deviceType = Reflect.getMetadata('deviceType', this);
    let timeout = 0;
    let info: VersionInfo | undefined;
    for (let i = 0; i < 3; i += 1) {
      this.resetIdle();
      // eslint-disable-next-line no-await-in-loop
      [timeout, info] = await connection.ping(this.address);
      if (timeout !== -1 && info) {
        const { type } = info;
        if (deviceType === type) return timeout;
      }
    }
    this.connection = undefined;
    return -1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface DevicePrototype {
  readonly id: DeviceId;
  readonly address: Address;
  // $countRef: number;
  $read?: Promise<any>;
  [$values]: { [id: number]: any };
  [$errors]: { [id: number]: Error };
  [$dirties]: { [id: number]: boolean };
  [mibProperty: string]: any;
}

type MibTypes = Record<string, { mib: string; minVersion: number }[]>;
let mibTypes: MibTypes | undefined;

const minVersionToInt = (str?: string): number => {
  if (!str) return 0;
  const [high, low] = str.split('.', 2);
  // eslint-disable-next-line no-bitwise
  return (toInt(high) << 8) + toInt(low);
};

export const getMibTypes = (): MibTypes => {
  if (!mibTypes) {
    const current: MibTypes = {};
    getMibNames().forEach(mibname => {
      const mib = getMib(mibname);
      if (!mib) return;
      const { types, device: deviceType } = mib;
      const device = types[deviceType] as IMibDeviceType;
      const type = toInt(device.appinfo.device_type);
      const minVersion = minVersionToInt(device.appinfo.min_version);
      const mibs = current[type] ?? [];
      mibs.push({
        mib: mibname,
        minVersion,
      });
      current[type] = sortBy(mibs, 'minVersion');
    });
    mibTypes = current;
  }
  return mibTypes;
};

export function findMibByType(type: number, version?: number): string | undefined {
  const mibs = getMibTypes()[type];
  if (mibs && mibs.length) {
    let mibType = mibs[0];
    if (version && mibs.length > 1) {
      mibType = findLast(mibs, ({ minVersion = 0 }) => minVersion <= version) || mibType;
    }
    return mibType.mib;
  }
  return undefined;
  // const cacheMibs = Object.keys(mibTypesCache);
  // const cached = cacheMibs.find(mib =>
  //   Reflect.getMetadata('deviceType', mibTypesCache[mib].prototype) === type);
  // if (cached) return cached;
  // const mibs = getMibsSync();
  // return _.difference(mibs, cacheMibs).find((mibName) => {
  //   const mibfile = getMibFile(mibName);
  //   const mib: IMibDevice = require(mibfile);
  //   const { types } = mib;
  //   const device = types[mib.device] as IMibDeviceType;
  //   return toInt(device.appinfo.device_type) === type;
  // });
}

function getConstructor(mib: string): DeviceConstructor {
  let constructor = mibTypesCache[mib];
  if (!constructor) {
    // eslint-disable-next-line
    function Device(this: DevicePrototype, address: Address) {
      EventEmitter.apply(this);
      this[$values] = {};
      this[$errors] = {};
      this[$dirties] = {};
      Reflect.defineProperty(this, 'address', withValue(address, false, true));
      this.$countRef = 1;
      this.$lastActivity = Date.now();
      (this as any).id = timeid() as DeviceId;
      // debug(new Error('CREATE').stack);
    }

    const prototype = new DevicePrototype(mib);
    Device.prototype = Object.create(prototype);
    (Device as any).displayName = `${mib[0].toUpperCase()}${mib.slice(1)}`;
    constructor = Device;
    mibTypesCache[mib] = constructor;
  }
  return constructor;
}

export function getMibPrototype(mib: string): Record<string, any> {
  return getConstructor(mib).prototype;
}

export interface CreateDevice {
  (address: AddressParam, mib: string, owned?: INibusConnection): IDevice;
  (address: AddressParam, type: number, version?: number, owned?: INibusConnection): IDevice;
}

export class Devices extends TypedEmitter<DevicesEvents> {
  private deviceMap: { [address: string]: IDevice[] } = {};

  get = (): IDevice[] => flatten(Object.values(this.deviceMap));

  findById(id: DeviceId): IDevice | undefined {
    return this.get().find(item => item.id === id);
  }

  find = (address: AddressParam): IDevice[] => {
    const targetAddress = new Address(address);
    return this.deviceMap[targetAddress.toString()] ?? [];
  };

  // create(address: AddressParam, mib: string): IDevice;

  // create(address: AddressParam, type: number, version?: number): IDevice;

  create: CreateDevice = (
    address: AddressParam,
    mibOrType: number | string,
    versionOrOwned?: number | INibusConnection,
    ownedParam?: INibusConnection
  ): IDevice => {
    let mib: string | undefined;
    let owned: INibusConnection | undefined;
    if (typeof mibOrType === 'number') {
      mib = findMibByType(mibOrType, versionOrOwned as number);
      if (mib === undefined) throw new Error('Unknown mib type');
      owned = ownedParam;
    } else {
      mib = String(mibOrType);
      owned = versionOrOwned as INibusConnection | undefined;
    }
    const targetAddress = new Address(address);
    // let device = deviceMap[targetAddress.toString()];
    // if (device) {
    //   console.assert(
    //     Reflect.getMetadata('mib', device) === mib,
    //     `mibs are different, expected ${mib}`,
    //   );
    //   device.addref();
    //   return device;
    // }

    const constructor = getConstructor(mib);
    const device: IDevice = Reflect.construct(constructor, [targetAddress]);
    if (owned) {
      device.connection = owned;
      if (!owned.owner) {
        owned.owner = device;
        owned.description.mib = mib;
      }
    }
    // if (!targetAddress.isEmpty) {
    const key = targetAddress.toString();
    this.deviceMap[key] = (this.deviceMap[key] ?? []).concat(device);
    device.on('release', this.onReleaseDevice);
    process.nextTick(() => this.emit('new', device));
    // }
    return device;
  };

  private onReleaseDevice = (device: IDevice): void => {
    if (!device) return;
    const key = device.address.toString();
    this.deviceMap[key] = without(this.deviceMap[key], device);
    device.off('release', this.onReleaseDevice);
    if (this.deviceMap[key].length === 0) {
      delete this.deviceMap[key];
    }
    this.emit('delete', device);
  };
}

// const devices = new Devices();
// export default devices;
