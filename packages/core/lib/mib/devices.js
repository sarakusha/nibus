"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMibFile = getMibFile;
exports.findMibByType = findMibByType;
exports.getMibPrototype = getMibPrototype;
exports.default = exports.Devices = exports.getMibTypes = exports.MibDeviceV = void 0;

require("source-map-support/register");

var _crc = require("crc");

var _debug = _interopRequireDefault(require("debug"));

var _events = require("events");

var _fs = _interopRequireDefault(require("fs"));

var t = _interopRequireWildcard(require("io-ts"));

var _PathReporter = require("io-ts/lib/PathReporter");

var _lodash = _interopRequireDefault(require("lodash"));

var _path = _interopRequireDefault(require("path"));

require("reflect-metadata");

var _xdgBasedir = require("xdg-basedir");

var _Address = _interopRequireWildcard(require("../Address"));

var _errors = require("../errors");

var _nbconst = require("../nbconst");

var _helper = require("../nibus/helper");

var _nms = require("../nms");

var _NmsValueType = _interopRequireDefault(require("../nms/NmsValueType"));

var _common = require("../session/common");

var _timeid = _interopRequireDefault(require("../timeid"));

var _mib = require("./mib");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// import { getMibsSync } from './mib2json';
// import detector from '../service/detector';
const pkgName = '@nata/nibus.js'; // require('../../package.json').name;

const debug = (0, _debug.default)('nibus:devices');
const $values = Symbol('values');
const $errors = Symbol('errors');
const $dirties = Symbol('dirties');

function safeNumber(val) {
  const num = parseFloat(val);
  return Number.isNaN(num) || `${num}` !== val ? val : num;
}

var PrivateProps;

(function (PrivateProps) {
  PrivateProps[PrivateProps["connection"] = -1] = "connection";
})(PrivateProps || (PrivateProps = {}));

const deviceMap = {};
const mibTypesCache = {};
const MibPropertyAppInfoV = t.intersection([t.type({
  nms_id: t.union([t.string, t.Int]),
  access: t.string
}), t.partial({
  category: t.string
})]); // interface IMibPropertyAppInfo extends t.TypeOf<typeof MibPropertyAppInfoV> {}

const MibPropertyV = t.type({
  type: t.string,
  annotation: t.string,
  appinfo: MibPropertyAppInfoV
});
const MibDeviceAppInfoV = t.intersection([t.type({
  mib_version: t.string
}), t.partial({
  device_type: t.string,
  loader_type: t.string,
  firmware: t.string,
  min_version: t.string
})]);
const MibDeviceTypeV = t.type({
  annotation: t.string,
  appinfo: MibDeviceAppInfoV,
  properties: t.record(t.string, MibPropertyV)
});
const MibTypeV = t.intersection([t.type({
  base: t.string
}), t.partial({
  appinfo: t.partial({
    zero: t.string,
    units: t.string,
    precision: t.string,
    representation: t.string,
    get: t.string,
    set: t.string
  }),
  minInclusive: t.string,
  maxInclusive: t.string,
  enumeration: t.record(t.string, t.type({
    annotation: t.string
  }))
})]);
const MibSubroutineV = t.intersection([t.type({
  annotation: t.string,
  appinfo: t.intersection([t.type({
    nms_id: t.union([t.string, t.Int])
  }), t.partial({
    response: t.string
  })])
}), t.partial({
  properties: t.record(t.string, t.type({
    type: t.string,
    annotation: t.string
  }))
})]);
const SubroutineTypeV = t.type({
  annotation: t.string,
  properties: t.type({
    id: t.type({
      type: t.literal('xs:unsignedShort'),
      annotation: t.string
    })
  })
});
const MibDeviceV = t.intersection([t.type({
  device: t.string,
  types: t.record(t.string, t.union([MibDeviceTypeV, MibTypeV, SubroutineTypeV]))
}), t.partial({
  subroutines: t.record(t.string, MibSubroutineV)
})]);
exports.MibDeviceV = MibDeviceV;

function getBaseType(types, type) {
  let base = type;

  for (let superType = types[base]; superType != null; superType = types[superType.base]) {
    base = superType.base;
  }

  return base;
}

function defineMibProperty(target, key, types, prop) {
  const propertyKey = (0, _mib.validJsName)(key);
  const {
    appinfo
  } = prop;
  const id = (0, _mib.toInt)(appinfo.nms_id);
  Reflect.defineMetadata('id', id, target, propertyKey);
  const simpleType = getBaseType(types, prop.type);
  const type = types[prop.type];
  const converters = [];
  const isReadable = appinfo.access.indexOf('r') > -1;
  const isWritable = appinfo.access.indexOf('w') > -1;
  let enumeration;
  let min;
  let max;

  switch ((0, _nms.getNmsType)(simpleType)) {
    case _NmsValueType.default.Int8:
      min = -128;
      max = 127;
      break;

    case _NmsValueType.default.Int16:
      min = -32768;
      max = 32767;
      break;

    case _NmsValueType.default.Int32:
      min = -2147483648;
      max = 2147483647;
      break;

    case _NmsValueType.default.UInt8:
      min = 0;
      max = 255;
      break;

    case _NmsValueType.default.UInt16:
      min = 0;
      max = 65535;
      break;

    case _NmsValueType.default.UInt32:
      min = 0;
      max = 4294967295;
      break;
  }

  switch (simpleType) {
    case 'packed8Float':
      converters.push((0, _mib.packed8floatConverter)(type));
      break;

    case 'fixedPointNumber4':
      converters.push(_mib.fixedPointNumber4Converter);
      break;

    default:
      break;
  }

  if (key === 'brightness' && prop.type === 'xs:unsignedByte') {
    // console.log('uSE PERCENT 100<->250');
    converters.push(_mib.percentConverter);
    Reflect.defineMetadata('unit', '%', target, propertyKey);
    Reflect.defineMetadata('min', 0, target, propertyKey);
    Reflect.defineMetadata('max', 100, target, propertyKey);
    min = max = undefined;
  } else if (isWritable) {
    if (type != null) {
      const {
        minInclusive,
        maxInclusive
      } = type;

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
      min = (0, _mib.convertTo)(converters)(min);
      Reflect.defineMetadata('min', min, target, propertyKey);
    }

    if (max !== undefined) {
      max = (0, _mib.convertTo)(converters)(max);
      Reflect.defineMetadata('max', max, target, propertyKey);
    }
  }

  if (type != null) {
    const {
      appinfo: info = {}
    } = type;
    enumeration = type.enumeration;
    const {
      units,
      precision,
      representation,
      get,
      set
    } = info;
    const size = (0, _mib.getIntSize)(simpleType);

    if (units) {
      converters.push((0, _mib.unitConverter)(units));
      Reflect.defineMetadata('unit', units, target, propertyKey);
    }

    let precisionConv = {
      from: v => v,
      to: v => v
    };

    if (precision) {
      precisionConv = (0, _mib.precisionConverter)(precision);
      converters.push(precisionConv);
      Reflect.defineMetadata('step', 1 / 10 ** parseInt(precision, 10), target, propertyKey);
    }

    if (enumeration) {
      converters.push((0, _mib.enumerationConverter)(enumeration));
      Reflect.defineMetadata('enum', Object.entries(enumeration).map(([key, val]) => [val.annotation, (0, _mib.toInt)(key)]), target, propertyKey);
    }

    if (representation) {
      debug('REPR', representation, size, propertyKey);
    }

    representation && size && converters.push((0, _mib.representationConverter)(representation, size));

    if (get && set) {
      const conv = (0, _mib.evalConverter)(get, set);
      converters.push(conv);
      const [a, b] = [conv.to(min), conv.to(max)];
      const minEval = parseFloat(precisionConv.to(Math.min(a, b)));
      const maxEval = parseFloat(precisionConv.to(Math.max(a, b)));
      Reflect.defineMetadata('min', minEval, target, propertyKey);
      Reflect.defineMetadata('max', maxEval, target, propertyKey);
    }
  }

  if (min !== undefined) {
    converters.push((0, _mib.minInclusiveConverter)(min));
  }

  if (max !== undefined) {
    converters.push((0, _mib.maxInclusiveConverter)(max));
  }

  if (prop.type === 'versionType') {
    converters.push(_mib.versionTypeConverter);
  }

  if (simpleType === 'xs:boolean' && !enumeration) {
    converters.push(_mib.booleanConverter);
    Reflect.defineMetadata('enum', [['Да', true], ['Нет', false]], target, propertyKey);
  }

  Reflect.defineMetadata('isWritable', isWritable, target, propertyKey);
  Reflect.defineMetadata('isReadable', isReadable, target, propertyKey);
  Reflect.defineMetadata('type', prop.type, target, propertyKey);
  Reflect.defineMetadata('simpleType', simpleType, target, propertyKey);
  Reflect.defineMetadata('displayName', prop.annotation ? prop.annotation : name, target, propertyKey);
  appinfo.category && Reflect.defineMetadata('category', appinfo.category, target, propertyKey);
  Reflect.defineMetadata('nmsType', (0, _nms.getNmsType)(simpleType), target, propertyKey);
  const attributes = {
    enumerable: isReadable
  };
  const to = (0, _mib.convertTo)(converters);
  const from = (0, _mib.convertFrom)(converters);
  Reflect.defineMetadata('convertTo', to, target, propertyKey);
  Reflect.defineMetadata('convertFrom', from, target, propertyKey);

  attributes.get = function () {
    console.assert(Reflect.get(this, '$countRef') > 0, 'Device was released');
    let value;

    if (!this.getError(id)) {
      value = to(this.getRawValue(id));
    }

    return value;
  };

  if (isWritable) {
    attributes.set = function (newValue) {
      console.assert(Reflect.get(this, '$countRef') > 0, 'Device was released');
      const value = from(newValue);

      if (value === undefined || Number.isNaN(value)) {
        throw new Error(`Invalid value: ${JSON.stringify(newValue)}`);
      }

      this.setRawValue(id, value);
    };
  }

  Reflect.defineProperty(target, propertyKey, attributes);
  return [id, propertyKey];
}

function getMibFile(mibname) {
  return _path.default.resolve(__dirname, '../../mibs/', `${mibname}.mib.json`);
}

class DevicePrototype extends _events.EventEmitter {
  // will be override for an instance
  // private $debounceDrain = _.debounce(this.drain, 25);
  constructor(mibname) {
    super();

    _defineProperty(this, "$countRef", 1);

    const mibfile = getMibFile(mibname);
    const mibValidation = MibDeviceV.decode(JSON.parse(_fs.default.readFileSync(mibfile).toString()));

    if (mibValidation.isLeft()) {
      throw new Error(`Invalid mib file ${mibfile} ${_PathReporter.PathReporter.report(mibValidation)}`);
    }

    const mib = mibValidation.value;
    const {
      types,
      subroutines
    } = mib;
    const device = types[mib.device];
    Reflect.defineMetadata('mib', mibname, this);
    Reflect.defineMetadata('mibfile', mibfile, this);
    Reflect.defineMetadata('annotation', device.annotation, this);
    Reflect.defineMetadata('mibVersion', device.appinfo.mib_version, this);
    Reflect.defineMetadata('deviceType', (0, _mib.toInt)(device.appinfo.device_type), this);
    device.appinfo.loader_type && Reflect.defineMetadata('loaderType', (0, _mib.toInt)(device.appinfo.loader_type), this);
    device.appinfo.firmware && Reflect.defineMetadata('firmware', device.appinfo.firmware, this);
    device.appinfo.min_version && Reflect.defineMetadata('min_version', device.appinfo.min_version, this);
    types.errorType && Reflect.defineMetadata('errorType', types.errorType.enumeration, this);

    if (subroutines) {
      const metasubs = _lodash.default.transform(subroutines, (result, sub, name) => {
        result[name] = {
          id: (0, _mib.toInt)(sub.appinfo.nms_id),
          description: sub.annotation,
          args: sub.properties && Object.entries(sub.properties).map(([name, prop]) => ({
            name,
            type: (0, _nms.getNmsType)(prop.type),
            desc: prop.annotation
          }))
        };
        return result;
      }, {});

      Reflect.defineMetadata('subroutines', metasubs, this);
    } // TODO: category
    // const mibCategory = _.find(detector.detection!.mibCategories, { mib: mibname });
    // if (mibCategory) {
    //   const { category, disableBatchReading } = mibCategory;
    //   Reflect.defineMetadata('category', category, this);
    //   Reflect.defineMetadata('disableBatchReading', !!disableBatchReading, this);
    // }


    const keys = Reflect.ownKeys(device.properties);
    Reflect.defineMetadata('mibProperties', keys.map(_mib.validJsName), this);
    const map = {};
    keys.forEach(key => {
      const [id, propName] = defineMibProperty(this, key, types, device.properties[key]);

      if (!map[id]) {
        map[id] = [propName];
      } else {
        map[id].push(propName);
      }
    });
    Reflect.defineMetadata('map', map, this);
  }

  get connection() {
    const {
      [$values]: values
    } = this;
    return values[PrivateProps.connection];
  }

  set connection(value) {
    const {
      [$values]: values
    } = this;
    const prev = values[PrivateProps.connection];
    if (prev === value) return;
    values[PrivateProps.connection] = value;
    /**
     * Device connected event
     * @event IDevice#connected
     * @event IDevice#disconnected
     */

    this.emit(value != null ? 'connected' : 'disconnected'); // if (value) {
    //   this.drain().catch(() => {});
    // }
  } // noinspection JSUnusedGlobalSymbols


  toJSON() {
    const json = {
      mib: Reflect.getMetadata('mib', this)
    };
    const keys = Reflect.getMetadata('mibProperties', this);
    keys.forEach(key => {
      if (this[key] !== undefined) json[key] = this[key];
    });
    json.address = this.address.toString();
    return json;
  }

  getId(idOrName) {
    let id;

    if (typeof idOrName === 'string') {
      id = Reflect.getMetadata('id', this, idOrName);
      if (Number.isInteger(id)) return id;
      id = (0, _mib.toInt)(idOrName);
    } else {
      id = idOrName;
    }

    const map = Reflect.getMetadata('map', this);

    if (!Reflect.has(map, id)) {
      throw new Error(`Unknown property ${idOrName}`);
    }

    return id;
  }

  getName(idOrName) {
    const map = Reflect.getMetadata('map', this);

    if (Reflect.has(map, idOrName)) {
      return map[idOrName][0];
    }

    const keys = Reflect.getMetadata('mibProperties', this);
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


  getRawValue(idOrName) {
    const id = this.getId(idOrName);
    const {
      [$values]: values
    } = this;
    return values[id];
  }

  setRawValue(idOrName, value, isDirty = true) {
    // debug(`setRawValue(${idOrName}, ${JSON.stringify(safeNumber(value))})`);
    const id = this.getId(idOrName);
    const {
      [$values]: values,
      [$errors]: errors
    } = this;
    const newVal = safeNumber(value);

    if (newVal !== values[id] || errors[id]) {
      values[id] = newVal;
      delete errors[id];
      this.setDirty(id, isDirty);
    }
  }

  getError(idOrName) {
    const id = this.getId(idOrName);
    const {
      [$errors]: errors
    } = this;
    return errors[id];
  }

  setError(idOrName, error) {
    const id = this.getId(idOrName);
    const {
      [$errors]: errors
    } = this;

    if (error != null) {
      errors[id] = error;
    } else {
      delete errors[id];
    }
  }

  isDirty(idOrName) {
    const id = this.getId(idOrName);
    const {
      [$dirties]: dirties
    } = this;
    return !!dirties[id];
  }

  setDirty(idOrName, isDirty = true) {
    const id = this.getId(idOrName);
    const map = Reflect.getMetadata('map', this);
    const {
      [$dirties]: dirties
    } = this;

    if (isDirty) {
      dirties[id] = true; // TODO: implement autosave
      // this.write(id).catch(() => {});
    } else {
      delete dirties[id];
    }
    /**
     * @event IDevice#changed
     * @event IDevice#changing
     */


    const names = map[id] || [];
    this.emit(isDirty ? 'changing' : 'changed', {
      id,
      names
    });

    if (names.includes('serno') && !isDirty && this.address.type === _Address.AddressType.mac && typeof this.serno === 'string') {
      const value = this.serno;
      const prevAddress = this.address;
      const address = Buffer.from(value.padStart(12, '0').substring(value.length - 12), 'hex');
      Reflect.defineProperty(this, 'address', (0, _mib.withValue)(new _Address.default(address), false, true));
      devices.emit('serno', prevAddress, this.address);
    }
  }

  addref() {
    this.$countRef += 1;
    debug('addref', new Error('addref').stack);
    return this.$countRef;
  }

  release() {
    this.$countRef -= 1;

    if (this.$countRef <= 0) {
      const key = this.address.toString();
      deviceMap[key] = _lodash.default.without(deviceMap[key], this);

      if (deviceMap[key].length === 0) {
        delete deviceMap[key];
      }
      /**
       * @event Devices#delete
       */


      devices.emit('delete', this);
    }

    return this.$countRef;
  }

  drain() {
    debug(`drain [${this.address}]`);
    const {
      [$dirties]: dirties
    } = this;
    const ids = Object.keys(dirties).map(Number).filter(id => dirties[id]);
    return ids.length > 0 ? this.write(...ids) : Promise.resolve([]);
  }

  writeAll() {
    const {
      [$values]: values
    } = this;
    const map = Reflect.getMetadata('map', this);
    const ids = Object.entries(values).filter(([, value]) => value != null).map(([id]) => Number(id)).filter(id => Reflect.getMetadata('isWritable', this, map[id][0]));
    return ids.length > 0 ? this.write(...ids) : Promise.resolve([]);
  }

  write(...ids) {
    const {
      connection
    } = this;
    if (!connection) return Promise.reject(`${this.address} is disconnected`);

    if (ids.length === 0) {
      return this.writeAll();
    }

    debug(`writing ${ids.join()} to [${this.address}]`);
    const map = Reflect.getMetadata('map', this);
    const invalidNms = [];
    const requests = ids.reduce((acc, id) => {
      const [name] = map[id];

      if (!name) {
        debug(`Unknown id: ${id} for ${Reflect.getMetadata('mib', this)}`);
      } else {
        try {
          acc.push((0, _nms.createNmsWrite)(this.address, id, Reflect.getMetadata('nmsType', this, name), this.getRawValue(id)));
        } catch (e) {
          console.error('Error while create NMS datagram', e.message);
          invalidNms.push(-id);
        }
      }

      return acc;
    }, []);
    return Promise.all(requests.map(datagram => connection.sendDatagram(datagram).then(response => {
      const {
        status
      } = response;

      if (status === 0) {
        this.setDirty(datagram.id, false);
        return datagram.id;
      }

      this.setError(datagram.id, new _errors.NibusError(status, this));
      return -datagram.id;
    }, reason => {
      this.setError(datagram.id, reason);
      return -datagram.id;
    }))).then(ids => ids.concat(invalidNms));
  }

  writeValues(source, strong = true) {
    try {
      const ids = Object.keys(source).map(name => this.getId(name));
      if (ids.length === 0) return Promise.reject(new TypeError('value is empty'));
      Object.assign(this, source);
      return this.write(...ids).then(written => {
        if (written.length === 0 || strong && written.length !== ids.length) {
          throw this.getError(ids[0]);
        }

        return written;
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  readAll() {
    if (this.$read) return this.$read;
    const map = Reflect.getMetadata('map', this);
    const ids = Object.entries(map).filter(([, names]) => Reflect.getMetadata('isReadable', this, names[0])).map(([id]) => Number(id)).sort();
    this.$read = ids.length > 0 ? this.read(...ids) : Promise.resolve([]);

    const clear = () => delete this.$read;

    return this.$read.finally(clear);
  }

  async read(...ids) {
    const {
      connection
    } = this;
    if (!connection) return Promise.reject('disconnected');
    if (ids.length === 0) return this.readAll(); // debug(`read ${ids.join()} from [${this.address}]`);

    const disableBatchReading = Reflect.getMetadata('disableBatchReading', this);
    const map = Reflect.getMetadata('map', this);
    const chunks = (0, _helper.chunkArray)(ids, disableBatchReading ? 1 : 21);
    debug(`read [${chunks.map(chunk => `[${chunk.join()}]`).join()}] from [${this.address}]`);
    const requests = chunks.map(chunk => (0, _nms.createNmsRead)(this.address, ...chunk));
    return requests.reduce(async (promise, datagram) => {
      const result = await promise;
      const response = await connection.sendDatagram(datagram);
      const datagrams = Array.isArray(response) ? response : [response];
      datagrams.forEach(({
        id,
        value,
        status
      }) => {
        if (status === 0) {
          this.setRawValue(id, value, false);
        } else {
          this.setError(id, new _errors.NibusError(status, this));
        }

        const names = map[id];
        console.assert(names && names.length > 0, `Invalid id ${id}`);
        names.forEach(propName => {
          result[propName] = status === 0 ? this[propName] : {
            error: (this.getError(id) || {}).message || 'error'
          };
        });
      });
      return result;
    }, Promise.resolve({}));
  }

  async upload(domain, offset = 0, size) {
    const {
      connection
    } = this;

    try {
      if (!connection) throw new Error('disconnected');
      const reqUpload = (0, _nms.createNmsRequestDomainUpload)(this.address, domain.padEnd(8, '\0'));
      const {
        id,
        value: domainSize,
        status
      } = await connection.sendDatagram(reqUpload);

      if (status !== 0) {
        // debug('<error>', status);
        throw new _errors.NibusError(status, this, 'Request upload domain error');
      }

      const initUpload = (0, _nms.createNmsInitiateUploadSequence)(this.address, id);
      const {
        status: initStat
      } = await connection.sendDatagram(initUpload);

      if (initStat !== 0) {
        throw new _errors.NibusError(initStat, this, 'Initiate upload domain error');
      }

      const total = size || domainSize - offset;
      let rest = total;
      let pos = offset;
      this.emit('uploadStart', {
        domain,
        domainSize,
        offset,
        size: total
      });
      const bufs = [];

      while (rest > 0) {
        const length = Math.min(255, rest);
        const uploadSegment = (0, _nms.createNmsUploadSegment)(this.address, id, pos, length);
        const {
          status: uploadStatus,
          value: result
        } = await connection.sendDatagram(uploadSegment);

        if (uploadStatus !== 0) {
          throw new _errors.NibusError(uploadStatus, this, 'Upload segment error');
        }

        if (result.data.length === 0) {
          break;
        }

        bufs.push(result.data);
        this.emit('uploadData', {
          domain,
          pos,
          data: result.data
        });
        rest -= result.data.length;
        pos += result.data.length;
      }

      const result = Buffer.concat(bufs);
      this.emit('uploadFinish', {
        domain,
        offset,
        data: result
      });
      return result;
    } catch (e) {
      this.emit('uploadError', e);
      throw e;
    }
  }

  async download(domain, buffer, offset = 0, noTerm = false) {
    const {
      connection
    } = this;
    if (!connection) throw new Error('disconnected');
    const reqDownload = (0, _nms.createNmsRequestDomainDownload)(this.address, domain.padEnd(8, '\0'));
    const {
      id,
      value: max,
      status
    } = await connection.sendDatagram(reqDownload);

    if (status !== 0) {
      // debug('<error>', status);
      throw new _errors.NibusError(status, this, 'Request download domain error');
    }

    const terminate = async err => {
      let termStat = 0;

      if (!noTerm) {
        const req = (0, _nms.createNmsTerminateDownloadSequence)(this.address, id);
        const res = await connection.sendDatagram(req);
        termStat = res.status;
      }

      if (err) throw err;

      if (termStat !== 0) {
        throw new _errors.NibusError(termStat, this, 'Terminate download sequence error, maybe need --no-term');
      }
    };

    if (buffer.length > max - offset) {
      throw new Error(`Buffer too large. Expected ${max - offset} bytes`);
    }

    const initDownload = (0, _nms.createNmsInitiateDownloadSequence)(this.address, id);
    const {
      status: initStat
    } = await connection.sendDatagram(initDownload);

    if (initStat !== 0) {
      throw new _errors.NibusError(initStat, this, 'Initiate download domain error');
    }

    this.emit('downloadStart', {
      domain,
      offset,
      domainSize: max,
      size: buffer.length
    });
    const crc = (0, _crc.crc16ccitt)(buffer, 0);
    const chunkSize = _nbconst.NMS_MAX_DATA_LENGTH - 4;
    const chunks = (0, _helper.chunkArray)(buffer, chunkSize);
    await chunks.reduce(async (prev, chunk, i) => {
      await prev;
      const pos = i * chunkSize + offset;
      const segmentDownload = (0, _nms.createNmsDownloadSegment)(this.address, id, pos, chunk);
      const {
        status: downloadStat
      } = await connection.sendDatagram(segmentDownload);

      if (downloadStat !== 0) {
        await terminate(new _errors.NibusError(downloadStat, this, 'Download segment error'));
      }

      this.emit('downloadData', {
        domain,
        length: chunk.length
      });
    }, Promise.resolve());
    const verify = (0, _nms.createNmsVerifyDomainChecksum)(this.address, id, offset, buffer.length, crc);
    const {
      status: verifyStat
    } = await connection.sendDatagram(verify);

    if (verifyStat !== 0) {
      await terminate(new _errors.NibusError(verifyStat, this, 'Download segment error'));
    }

    await terminate();
    this.emit('downloadFinish', {
      domain,
      offset,
      size: buffer.length
    });
  }

  async execute(program, args) {
    const {
      connection
    } = this;
    if (!connection) throw new Error('disconnected');
    const subroutines = Reflect.getMetadata('subroutines', this);

    if (!subroutines || !Reflect.has(subroutines, program)) {
      throw new Error(`Unknown program ${program}`);
    }

    const subroutine = subroutines[program];
    const props = [];

    if (subroutine.args) {
      Object.entries(subroutine.args).forEach(([name, desc]) => {
        const arg = args && args[name];
        if (!arg) throw new Error(`Expected arg ${name} in program ${program}`);
        props.push([desc.type, arg]);
      });
    }

    const req = (0, _nms.createExecuteProgramInvocation)(this.address, subroutine.id, subroutine.notReply, ...props);
    return connection.sendDatagram(req);
  }

} // tslint:disable-next-line


const getMibTypes = () => {
  const conf = _path.default.resolve(_xdgBasedir.config || '/tmp', 'configstore', pkgName);

  if (!_fs.default.existsSync(`${conf}.json`)) return {};

  const validate = _common.ConfigV.decode(JSON.parse(_fs.default.readFileSync(`${conf}.json`).toString())); //   const validate = ConfigV.decode(require(conf));


  if (validate.isLeft()) {
    throw new Error(`Invalid config file ${conf}
  ${_PathReporter.PathReporter.report(validate)}`);
  }

  const {
    mibTypes
  } = validate.value;
  return mibTypes;
};

exports.getMibTypes = getMibTypes;

function findMibByType(type, version) {
  const mibTypes = getMibTypes();
  const mibs = mibTypes[type];

  if (mibs && mibs.length) {
    let mibType = mibs[0];

    if (version && mibs.length > 1) {
      mibType = _lodash.default.findLast(mibs, ({
        minVersion = 0
      }) => minVersion <= version) || mibType;
    }

    return mibType.mib;
  } // const cacheMibs = Object.keys(mibTypesCache);
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

function getConstructor(mib) {
  let constructor = mibTypesCache[mib];

  if (!constructor) {
    // tslint:disable-next-line
    function Device(address) {
      _events.EventEmitter.apply(this);

      this[$values] = {};
      this[$errors] = {};
      this[$dirties] = {};
      Reflect.defineProperty(this, 'address', (0, _mib.withValue)(address, false, true));
      this.$countRef = 1;
      this.id = (0, _timeid.default)(); // debug(new Error('CREATE').stack);
    }

    const prototype = new DevicePrototype(mib);
    Device.prototype = Object.create(prototype);
    Device.displayName = `${mib[0].toUpperCase()}${mib.slice(1)}`;
    constructor = Device;
    mibTypesCache[mib] = constructor;
  }

  return constructor;
}

function getMibPrototype(mib) {
  return getConstructor(mib).prototype;
}

class Devices extends _events.EventEmitter {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "get", () => _lodash.default.flatten(_lodash.default.values(deviceMap)));

    _defineProperty(this, "find", address => {
      const targetAddress = new _Address.default(address);
      return deviceMap[targetAddress.toString()];
    });
  }

  create(address, mibOrType, version) {
    let mib;

    if (typeof mibOrType === 'number') {
      mib = findMibByType(mibOrType, version);
      if (mib === undefined) throw new Error('Unknown mib type');
    } else if (typeof mibOrType === 'string') {
      mib = String(mibOrType);
    } else {
      throw new Error(`mib or type expected, got ${mibOrType}`);
    }

    const targetAddress = new _Address.default(address); // let device = deviceMap[targetAddress.toString()];
    // if (device) {
    //   console.assert(
    //     Reflect.getMetadata('mib', device) === mib,
    //     `mibs are different, expected ${mib}`,
    //   );
    //   device.addref();
    //   return device;
    // }

    const constructor = getConstructor(mib);
    const device = Reflect.construct(constructor, [targetAddress]);

    if (!targetAddress.isEmpty) {
      const key = targetAddress.toString();
      deviceMap[key] = (deviceMap[key] || []).concat(device);
      process.nextTick(() => this.emit('new', device));
    }

    return device;
  }

}

exports.Devices = Devices;
const devices = new Devices();
var _default = devices;
exports.default = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taWIvZGV2aWNlcy50cyJdLCJuYW1lcyI6WyJwa2dOYW1lIiwiZGVidWciLCIkdmFsdWVzIiwiU3ltYm9sIiwiJGVycm9ycyIsIiRkaXJ0aWVzIiwic2FmZU51bWJlciIsInZhbCIsIm51bSIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsIlByaXZhdGVQcm9wcyIsImRldmljZU1hcCIsIm1pYlR5cGVzQ2FjaGUiLCJNaWJQcm9wZXJ0eUFwcEluZm9WIiwidCIsImludGVyc2VjdGlvbiIsInR5cGUiLCJubXNfaWQiLCJ1bmlvbiIsInN0cmluZyIsIkludCIsImFjY2VzcyIsInBhcnRpYWwiLCJjYXRlZ29yeSIsIk1pYlByb3BlcnR5ViIsImFubm90YXRpb24iLCJhcHBpbmZvIiwiTWliRGV2aWNlQXBwSW5mb1YiLCJtaWJfdmVyc2lvbiIsImRldmljZV90eXBlIiwibG9hZGVyX3R5cGUiLCJmaXJtd2FyZSIsIm1pbl92ZXJzaW9uIiwiTWliRGV2aWNlVHlwZVYiLCJwcm9wZXJ0aWVzIiwicmVjb3JkIiwiTWliVHlwZVYiLCJiYXNlIiwiemVybyIsInVuaXRzIiwicHJlY2lzaW9uIiwicmVwcmVzZW50YXRpb24iLCJnZXQiLCJzZXQiLCJtaW5JbmNsdXNpdmUiLCJtYXhJbmNsdXNpdmUiLCJlbnVtZXJhdGlvbiIsIk1pYlN1YnJvdXRpbmVWIiwicmVzcG9uc2UiLCJTdWJyb3V0aW5lVHlwZVYiLCJpZCIsImxpdGVyYWwiLCJNaWJEZXZpY2VWIiwiZGV2aWNlIiwidHlwZXMiLCJzdWJyb3V0aW5lcyIsImdldEJhc2VUeXBlIiwic3VwZXJUeXBlIiwiZGVmaW5lTWliUHJvcGVydHkiLCJ0YXJnZXQiLCJrZXkiLCJwcm9wIiwicHJvcGVydHlLZXkiLCJSZWZsZWN0IiwiZGVmaW5lTWV0YWRhdGEiLCJzaW1wbGVUeXBlIiwiY29udmVydGVycyIsImlzUmVhZGFibGUiLCJpbmRleE9mIiwiaXNXcml0YWJsZSIsIm1pbiIsIm1heCIsIk5tc1ZhbHVlVHlwZSIsIkludDgiLCJJbnQxNiIsIkludDMyIiwiVUludDgiLCJVSW50MTYiLCJVSW50MzIiLCJwdXNoIiwiZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIiLCJwZXJjZW50Q29udmVydGVyIiwidW5kZWZpbmVkIiwiTWF0aCIsImluZm8iLCJzaXplIiwicHJlY2lzaW9uQ29udiIsImZyb20iLCJ2IiwidG8iLCJwYXJzZUludCIsIk9iamVjdCIsImVudHJpZXMiLCJtYXAiLCJjb252IiwiYSIsImIiLCJtaW5FdmFsIiwibWF4RXZhbCIsInZlcnNpb25UeXBlQ29udmVydGVyIiwiYm9vbGVhbkNvbnZlcnRlciIsIm5hbWUiLCJhdHRyaWJ1dGVzIiwiZW51bWVyYWJsZSIsImNvbnNvbGUiLCJhc3NlcnQiLCJ2YWx1ZSIsImdldEVycm9yIiwiZ2V0UmF3VmFsdWUiLCJuZXdWYWx1ZSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInNldFJhd1ZhbHVlIiwiZGVmaW5lUHJvcGVydHkiLCJnZXRNaWJGaWxlIiwibWlibmFtZSIsInBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwiRGV2aWNlUHJvdG90eXBlIiwiRXZlbnRFbWl0dGVyIiwiY29uc3RydWN0b3IiLCJtaWJmaWxlIiwibWliVmFsaWRhdGlvbiIsImRlY29kZSIsInBhcnNlIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ0b1N0cmluZyIsImlzTGVmdCIsIlBhdGhSZXBvcnRlciIsInJlcG9ydCIsIm1pYiIsImVycm9yVHlwZSIsIm1ldGFzdWJzIiwiXyIsInRyYW5zZm9ybSIsInJlc3VsdCIsInN1YiIsImRlc2NyaXB0aW9uIiwiYXJncyIsImRlc2MiLCJrZXlzIiwib3duS2V5cyIsInZhbGlkSnNOYW1lIiwiZm9yRWFjaCIsInByb3BOYW1lIiwiY29ubmVjdGlvbiIsInZhbHVlcyIsInByZXYiLCJlbWl0IiwidG9KU09OIiwianNvbiIsImdldE1ldGFkYXRhIiwiYWRkcmVzcyIsImdldElkIiwiaWRPck5hbWUiLCJpc0ludGVnZXIiLCJoYXMiLCJnZXROYW1lIiwiaW5jbHVkZXMiLCJpc0RpcnR5IiwiZXJyb3JzIiwibmV3VmFsIiwic2V0RGlydHkiLCJzZXRFcnJvciIsImVycm9yIiwiZGlydGllcyIsIm5hbWVzIiwiQWRkcmVzc1R5cGUiLCJtYWMiLCJzZXJubyIsInByZXZBZGRyZXNzIiwiQnVmZmVyIiwicGFkU3RhcnQiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJBZGRyZXNzIiwiZGV2aWNlcyIsImFkZHJlZiIsIiRjb3VudFJlZiIsInN0YWNrIiwicmVsZWFzZSIsIndpdGhvdXQiLCJkcmFpbiIsImlkcyIsImZpbHRlciIsIndyaXRlIiwiUHJvbWlzZSIsIndyaXRlQWxsIiwicmVqZWN0Iiwiam9pbiIsImludmFsaWRObXMiLCJyZXF1ZXN0cyIsInJlZHVjZSIsImFjYyIsImUiLCJtZXNzYWdlIiwiYWxsIiwiZGF0YWdyYW0iLCJzZW5kRGF0YWdyYW0iLCJ0aGVuIiwic3RhdHVzIiwiTmlidXNFcnJvciIsInJlYXNvbiIsImNvbmNhdCIsIndyaXRlVmFsdWVzIiwic291cmNlIiwic3Ryb25nIiwiVHlwZUVycm9yIiwiYXNzaWduIiwid3JpdHRlbiIsImVyciIsInJlYWRBbGwiLCIkcmVhZCIsInNvcnQiLCJyZWFkIiwiY2xlYXIiLCJmaW5hbGx5IiwiZGlzYWJsZUJhdGNoUmVhZGluZyIsImNodW5rcyIsImNodW5rIiwicHJvbWlzZSIsImRhdGFncmFtcyIsIkFycmF5IiwiaXNBcnJheSIsInVwbG9hZCIsImRvbWFpbiIsIm9mZnNldCIsInJlcVVwbG9hZCIsInBhZEVuZCIsImRvbWFpblNpemUiLCJpbml0VXBsb2FkIiwiaW5pdFN0YXQiLCJ0b3RhbCIsInJlc3QiLCJwb3MiLCJidWZzIiwidXBsb2FkU2VnbWVudCIsInVwbG9hZFN0YXR1cyIsImRhdGEiLCJkb3dubG9hZCIsImJ1ZmZlciIsIm5vVGVybSIsInJlcURvd25sb2FkIiwidGVybWluYXRlIiwidGVybVN0YXQiLCJyZXEiLCJyZXMiLCJpbml0RG93bmxvYWQiLCJjcmMiLCJjaHVua1NpemUiLCJOTVNfTUFYX0RBVEFfTEVOR1RIIiwiaSIsInNlZ21lbnREb3dubG9hZCIsImRvd25sb2FkU3RhdCIsInZlcmlmeSIsInZlcmlmeVN0YXQiLCJleGVjdXRlIiwicHJvZ3JhbSIsInN1YnJvdXRpbmUiLCJwcm9wcyIsImFyZyIsIm5vdFJlcGx5IiwiZ2V0TWliVHlwZXMiLCJjb25mIiwiY29uZmlnRGlyIiwiZXhpc3RzU3luYyIsInZhbGlkYXRlIiwiQ29uZmlnViIsIm1pYlR5cGVzIiwiZmluZE1pYkJ5VHlwZSIsInZlcnNpb24iLCJtaWJzIiwibWliVHlwZSIsImZpbmRMYXN0IiwibWluVmVyc2lvbiIsImdldENvbnN0cnVjdG9yIiwiRGV2aWNlIiwiYXBwbHkiLCJwcm90b3R5cGUiLCJjcmVhdGUiLCJkaXNwbGF5TmFtZSIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJnZXRNaWJQcm90b3R5cGUiLCJEZXZpY2VzIiwiZmxhdHRlbiIsInRhcmdldEFkZHJlc3MiLCJtaWJPclR5cGUiLCJTdHJpbmciLCJjb25zdHJ1Y3QiLCJpc0VtcHR5IiwicHJvY2VzcyIsIm5leHRUaWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFXQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7QUFnQkE7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7Ozs7Ozs7QUFvQkE7QUFDQTtBQUVBLE1BQU1BLE9BQU8sR0FBRyxnQkFBaEIsQyxDQUFrQzs7QUFFbEMsTUFBTUMsS0FBSyxHQUFHLG9CQUFhLGVBQWIsQ0FBZDtBQUVBLE1BQU1DLE9BQU8sR0FBR0MsTUFBTSxDQUFDLFFBQUQsQ0FBdEI7QUFDQSxNQUFNQyxPQUFPLEdBQUdELE1BQU0sQ0FBQyxRQUFELENBQXRCO0FBQ0EsTUFBTUUsUUFBUSxHQUFHRixNQUFNLENBQUMsU0FBRCxDQUF2Qjs7QUFFQSxTQUFTRyxVQUFULENBQW9CQyxHQUFw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QGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gT09PIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbi8qIHRzbGludDpkaXNhYmxlOnZhcmlhYmxlLW5hbWUgKi9cbmltcG9ydCB7IGNyYzE2Y2NpdHQgfSBmcm9tICdjcmMnO1xuaW1wb3J0IGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHQgZnJvbSAnaW8tdHMnO1xuaW1wb3J0IHsgUGF0aFJlcG9ydGVyIH0gZnJvbSAnaW8tdHMvbGliL1BhdGhSZXBvcnRlcic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuaW1wb3J0IHsgY29uZmlnIGFzIGNvbmZpZ0RpciB9IGZyb20gJ3hkZy1iYXNlZGlyJztcbmltcG9ydCBBZGRyZXNzLCB7IEFkZHJlc3NQYXJhbSwgQWRkcmVzc1R5cGUgfSBmcm9tICcuLi9BZGRyZXNzJztcbmltcG9ydCB7IE5pYnVzRXJyb3IgfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHsgTk1TX01BWF9EQVRBX0xFTkdUSCB9IGZyb20gJy4uL25iY29uc3QnO1xuaW1wb3J0IHsgTmlidXNDb25uZWN0aW9uIH0gZnJvbSAnLi4vbmlidXMnO1xuaW1wb3J0IHsgY2h1bmtBcnJheSB9IGZyb20gJy4uL25pYnVzL2hlbHBlcic7XG5pbXBvcnQge1xuICBjcmVhdGVFeGVjdXRlUHJvZ3JhbUludm9jYXRpb24sXG4gIGNyZWF0ZU5tc0Rvd25sb2FkU2VnbWVudCxcbiAgY3JlYXRlTm1zSW5pdGlhdGVEb3dubG9hZFNlcXVlbmNlLFxuICBjcmVhdGVObXNJbml0aWF0ZVVwbG9hZFNlcXVlbmNlLFxuICBjcmVhdGVObXNSZWFkLFxuICBjcmVhdGVObXNSZXF1ZXN0RG9tYWluRG93bmxvYWQsXG4gIGNyZWF0ZU5tc1JlcXVlc3REb21haW5VcGxvYWQsXG4gIGNyZWF0ZU5tc1Rlcm1pbmF0ZURvd25sb2FkU2VxdWVuY2UsXG4gIGNyZWF0ZU5tc1VwbG9hZFNlZ21lbnQsXG4gIGNyZWF0ZU5tc1ZlcmlmeURvbWFpbkNoZWNrc3VtLFxuICBjcmVhdGVObXNXcml0ZSxcbiAgZ2V0Tm1zVHlwZSxcbiAgVHlwZWRWYWx1ZSxcbn0gZnJvbSAnLi4vbm1zJztcbmltcG9ydCBObXNEYXRhZ3JhbSBmcm9tICcuLi9ubXMvTm1zRGF0YWdyYW0nO1xuaW1wb3J0IE5tc1ZhbHVlVHlwZSBmcm9tICcuLi9ubXMvTm1zVmFsdWVUeXBlJztcbmltcG9ydCB7IENvbmZpZywgQ29uZmlnViB9IGZyb20gJy4uL3Nlc3Npb24vY29tbW9uJztcbmltcG9ydCB0aW1laWQgZnJvbSAnLi4vdGltZWlkJztcbmltcG9ydCB7XG4gIGJvb2xlYW5Db252ZXJ0ZXIsXG4gIGNvbnZlcnRGcm9tLFxuICBjb252ZXJ0VG8sXG4gIGVudW1lcmF0aW9uQ29udmVydGVyLCBldmFsQ29udmVydGVyLFxuICBmaXhlZFBvaW50TnVtYmVyNENvbnZlcnRlcixcbiAgZ2V0SW50U2l6ZSxcbiAgSUNvbnZlcnRlcixcbiAgbWF4SW5jbHVzaXZlQ29udmVydGVyLFxuICBtaW5JbmNsdXNpdmVDb252ZXJ0ZXIsXG4gIHBhY2tlZDhmbG9hdENvbnZlcnRlcixcbiAgcGVyY2VudENvbnZlcnRlcixcbiAgcHJlY2lzaW9uQ29udmVydGVyLFxuICByZXByZXNlbnRhdGlvbkNvbnZlcnRlcixcbiAgdG9JbnQsXG4gIHVuaXRDb252ZXJ0ZXIsXG4gIHZhbGlkSnNOYW1lLFxuICB2ZXJzaW9uVHlwZUNvbnZlcnRlcixcbiAgd2l0aFZhbHVlLFxufSBmcm9tICcuL21pYic7XG4vLyBpbXBvcnQgeyBnZXRNaWJzU3luYyB9IGZyb20gJy4vbWliMmpzb24nO1xuLy8gaW1wb3J0IGRldGVjdG9yIGZyb20gJy4uL3NlcnZpY2UvZGV0ZWN0b3InO1xuXG5jb25zdCBwa2dOYW1lID0gJ0BuYXRhL25pYnVzLmpzJzsgLy8gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcblxuY29uc3QgZGVidWcgPSBkZWJ1Z0ZhY3RvcnkoJ25pYnVzOmRldmljZXMnKTtcblxuY29uc3QgJHZhbHVlcyA9IFN5bWJvbCgndmFsdWVzJyk7XG5jb25zdCAkZXJyb3JzID0gU3ltYm9sKCdlcnJvcnMnKTtcbmNvbnN0ICRkaXJ0aWVzID0gU3ltYm9sKCdkaXJ0aWVzJyk7XG5cbmZ1bmN0aW9uIHNhZmVOdW1iZXIodmFsOiBhbnkpIHtcbiAgY29uc3QgbnVtID0gcGFyc2VGbG9hdCh2YWwpO1xuICByZXR1cm4gKE51bWJlci5pc05hTihudW0pIHx8IGAke251bX1gICE9PSB2YWwpID8gdmFsIDogbnVtO1xufVxuXG5lbnVtIFByaXZhdGVQcm9wcyB7XG4gIGNvbm5lY3Rpb24gPSAtMSxcbn1cblxuY29uc3QgZGV2aWNlTWFwOiB7IFthZGRyZXNzOiBzdHJpbmddOiBJRGV2aWNlW10gfSA9IHt9O1xuXG5jb25zdCBtaWJUeXBlc0NhY2hlOiB7IFttaWJuYW1lOiBzdHJpbmddOiBGdW5jdGlvbiB9ID0ge307XG5cbmNvbnN0IE1pYlByb3BlcnR5QXBwSW5mb1YgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgbm1zX2lkOiB0LnVuaW9uKFt0LnN0cmluZywgdC5JbnRdKSxcbiAgICBhY2Nlc3M6IHQuc3RyaW5nLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBjYXRlZ29yeTogdC5zdHJpbmcsXG4gIH0pLFxuXSk7XG5cbi8vIGludGVyZmFjZSBJTWliUHJvcGVydHlBcHBJbmZvIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYlByb3BlcnR5QXBwSW5mb1Y+IHt9XG5cbmNvbnN0IE1pYlByb3BlcnR5ViA9IHQudHlwZSh7XG4gIHR5cGU6IHQuc3RyaW5nLFxuICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgYXBwaW5mbzogTWliUHJvcGVydHlBcHBJbmZvVixcbn0pO1xuXG5pbnRlcmZhY2UgSU1pYlByb3BlcnR5IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYlByb3BlcnR5Vj4ge1xuICAvLyBhcHBpbmZvOiBJTWliUHJvcGVydHlBcHBJbmZvO1xufVxuXG5jb25zdCBNaWJEZXZpY2VBcHBJbmZvViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBtaWJfdmVyc2lvbjogdC5zdHJpbmcsXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIGRldmljZV90eXBlOiB0LnN0cmluZyxcbiAgICBsb2FkZXJfdHlwZTogdC5zdHJpbmcsXG4gICAgZmlybXdhcmU6IHQuc3RyaW5nLFxuICAgIG1pbl92ZXJzaW9uOiB0LnN0cmluZyxcbiAgfSksXG5dKTtcblxuY29uc3QgTWliRGV2aWNlVHlwZVYgPSB0LnR5cGUoe1xuICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgYXBwaW5mbzogTWliRGV2aWNlQXBwSW5mb1YsXG4gIHByb3BlcnRpZXM6IHQucmVjb3JkKHQuc3RyaW5nLCBNaWJQcm9wZXJ0eVYpLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSU1pYkRldmljZVR5cGUgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliRGV2aWNlVHlwZVY+IHt9XG5cbmNvbnN0IE1pYlR5cGVWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGJhc2U6IHQuc3RyaW5nLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBhcHBpbmZvOiB0LnBhcnRpYWwoe1xuICAgICAgemVybzogdC5zdHJpbmcsXG4gICAgICB1bml0czogdC5zdHJpbmcsXG4gICAgICBwcmVjaXNpb246IHQuc3RyaW5nLFxuICAgICAgcmVwcmVzZW50YXRpb246IHQuc3RyaW5nLFxuICAgICAgZ2V0OiB0LnN0cmluZyxcbiAgICAgIHNldDogdC5zdHJpbmcsXG4gICAgfSksXG4gICAgbWluSW5jbHVzaXZlOiB0LnN0cmluZyxcbiAgICBtYXhJbmNsdXNpdmU6IHQuc3RyaW5nLFxuICAgIGVudW1lcmF0aW9uOiB0LnJlY29yZCh0LnN0cmluZywgdC50eXBlKHsgYW5ub3RhdGlvbjogdC5zdHJpbmcgfSkpLFxuICB9KSxcbl0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElNaWJUeXBlIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYlR5cGVWPiB7fVxuXG5jb25zdCBNaWJTdWJyb3V0aW5lViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgICBhcHBpbmZvOiB0LmludGVyc2VjdGlvbihbXG4gICAgICB0LnR5cGUoeyBubXNfaWQ6IHQudW5pb24oW3Quc3RyaW5nLCB0LkludF0pIH0pLFxuICAgICAgdC5wYXJ0aWFsKHsgcmVzcG9uc2U6IHQuc3RyaW5nIH0pLFxuICAgIF0pLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBwcm9wZXJ0aWVzOiB0LnJlY29yZCh0LnN0cmluZywgdC50eXBlKHtcbiAgICAgIHR5cGU6IHQuc3RyaW5nLFxuICAgICAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gICAgfSkpLFxuICB9KSxcbl0pO1xuXG5jb25zdCBTdWJyb3V0aW5lVHlwZVYgPSB0LnR5cGUoe1xuICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgcHJvcGVydGllczogdC50eXBlKHtcbiAgICBpZDogdC50eXBlKHtcbiAgICAgIHR5cGU6IHQubGl0ZXJhbCgneHM6dW5zaWduZWRTaG9ydCcpLFxuICAgICAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gICAgfSksXG4gIH0pLFxufSk7XG5cbmV4cG9ydCBjb25zdCBNaWJEZXZpY2VWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGRldmljZTogdC5zdHJpbmcsXG4gICAgdHlwZXM6IHQucmVjb3JkKHQuc3RyaW5nLCB0LnVuaW9uKFtNaWJEZXZpY2VUeXBlViwgTWliVHlwZVYsIFN1YnJvdXRpbmVUeXBlVl0pKSxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgc3Vicm91dGluZXM6IHQucmVjb3JkKHQuc3RyaW5nLCBNaWJTdWJyb3V0aW5lViksXG4gIH0pLFxuXSk7XG5cbmludGVyZmFjZSBJTWliRGV2aWNlIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYkRldmljZVY+IHt9XG5cbnR5cGUgTGlzdGVuZXI8VD4gPSAoYXJnOiBUKSA9PiB2b2lkO1xudHlwZSBDaGFuZ2VBcmcgPSB7IGlkOiBudW1iZXIsIG5hbWVzOiBzdHJpbmdbXSB9O1xuZXhwb3J0IHR5cGUgQ2hhbmdlTGlzdGVuZXIgPSBMaXN0ZW5lcjxDaGFuZ2VBcmc+O1xudHlwZSBVcGxvYWRTdGFydEFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGRvbWFpblNpemU6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgVXBsb2FkU3RhcnRMaXN0ZW5lciA9IExpc3RlbmVyPFVwbG9hZFN0YXJ0QXJnPjtcbnR5cGUgVXBsb2FkRGF0YUFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGRhdGE6IEJ1ZmZlciwgcG9zOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIFVwbG9hZERhdGFMaXN0ZW5lciA9IExpc3RlbmVyPFVwbG9hZERhdGFBcmc+O1xudHlwZSBVcGxvYWRGaW5pc2hBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBvZmZzZXQ6IG51bWJlciwgZGF0YTogQnVmZmVyIH07XG5leHBvcnQgdHlwZSBVcGxvYWRGaW5pc2hMaXN0ZW5lciA9IExpc3RlbmVyPFVwbG9hZEZpbmlzaEFyZz47XG50eXBlIERvd25sb2FkU3RhcnRBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBkb21haW5TaXplOiBudW1iZXIsIG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIERvd25sb2FkU3RhcnRMaXN0ZW5lciA9IExpc3RlbmVyPERvd25sb2FkU3RhcnRBcmc+O1xudHlwZSBEb3dubG9hZERhdGFBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgRG93bmxvYWREYXRhTGlzdGVuZXIgPSBMaXN0ZW5lcjxEb3dubG9hZERhdGFBcmc+O1xudHlwZSBEb3dubG9hZEZpbmlzaEFyZyA9IHsgZG9tYWluOiBzdHJpbmc7IG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIERvd25sb2FkRmluaXNoTGlzdGVuZXIgPSBMaXN0ZW5lcjxEb3dubG9hZEZpbmlzaEFyZz47XG5leHBvcnQgdHlwZSBEZXZpY2VJZCA9IHN0cmluZyAmIHsgX19icmFuZDogJ0RldmljZUlkJyB9O1xuXG5leHBvcnQgaW50ZXJmYWNlIElEZXZpY2Uge1xuICByZWFkb25seSBpZDogRGV2aWNlSWQ7XG4gIHJlYWRvbmx5IGFkZHJlc3M6IEFkZHJlc3M7XG4gIGRyYWluKCk6IFByb21pc2U8bnVtYmVyW10+O1xuICB3cml0ZSguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTxudW1iZXJbXT47XG4gIHJlYWQoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8eyBbbmFtZTogc3RyaW5nXTogYW55IH0+O1xuICB1cGxvYWQoZG9tYWluOiBzdHJpbmcsIG9mZnNldD86IG51bWJlciwgc2l6ZT86IG51bWJlcik6IFByb21pc2U8QnVmZmVyPjtcbiAgZG93bmxvYWQoZG9tYWluOiBzdHJpbmcsIGRhdGE6IEJ1ZmZlciwgb2Zmc2V0PzogbnVtYmVyLCBub1Rlcm0/OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPjtcbiAgZXhlY3V0ZShcbiAgICBwcm9ncmFtOiBzdHJpbmcsXG4gICAgYXJncz86IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPE5tc0RhdGFncmFtIHwgTm1zRGF0YWdyYW1bXSB8IHVuZGVmaW5lZD47XG4gIGNvbm5lY3Rpb24/OiBOaWJ1c0Nvbm5lY3Rpb247XG4gIHJlbGVhc2UoKTogbnVtYmVyO1xuICBnZXRJZChpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogbnVtYmVyO1xuICBnZXROYW1lKGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBzdHJpbmc7XG4gIGdldFJhd1ZhbHVlKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnk7XG4gIGdldEVycm9yKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnk7XG4gIGlzRGlydHkoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IGJvb2xlYW47XG4gIFttaWJQcm9wZXJ0eTogc3RyaW5nXTogYW55O1xuXG4gIG9uKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIG9uKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIG9uY2UoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gb25jZShldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIGFkZExpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIG9mZihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyBvZmYoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIGVtaXQoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcpOiBib29sZWFuO1xuICAvLyBlbWl0KGV2ZW50OiAnc2Vybm8nKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgYXJnOiBDaGFuZ2VBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAndXBsb2FkU3RhcnQnLCBhcmc6IFVwbG9hZFN0YXJ0QXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ3VwbG9hZERhdGEnLCBhcmc6IFVwbG9hZERhdGFBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAndXBsb2FkRmluaXNoJywgYXJnOiBVcGxvYWRGaW5pc2hBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGFyZzogRG93bmxvYWRTdGFydEFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBhcmc6IERvd25sb2FkRGF0YUFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGFyZzogRG93bmxvYWRGaW5pc2hBcmcpOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgSVN1YnJvdXRpbmVEZXNjIHtcbiAgaWQ6IG51bWJlcjtcbiAgLy8gbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBub3RSZXBseT86IGJvb2xlYW47XG4gIGFyZ3M/OiB7IG5hbWU6IHN0cmluZywgdHlwZTogTm1zVmFsdWVUeXBlLCBkZXNjPzogc3RyaW5nIH1bXTtcbn1cblxuaW50ZXJmYWNlIElQcm9wZXJ0eURlc2NyaXB0b3I8T3duZXI+IHtcbiAgY29uZmlndXJhYmxlPzogYm9vbGVhbjtcbiAgZW51bWVyYWJsZT86IGJvb2xlYW47XG4gIHZhbHVlPzogYW55O1xuICB3cml0YWJsZT86IGJvb2xlYW47XG5cbiAgZ2V0Pyh0aGlzOiBPd25lcik6IGFueTtcblxuICBzZXQ/KHRoaXM6IE93bmVyLCB2OiBhbnkpOiB2b2lkO1xufVxuXG5mdW5jdGlvbiBnZXRCYXNlVHlwZSh0eXBlczogSU1pYkRldmljZVsndHlwZXMnXSwgdHlwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IGJhc2UgPSB0eXBlO1xuICBmb3IgKGxldCBzdXBlclR5cGU6IElNaWJUeXBlID0gdHlwZXNbYmFzZV0gYXMgSU1pYlR5cGU7IHN1cGVyVHlwZSAhPSBudWxsO1xuICAgICAgIHN1cGVyVHlwZSA9IHR5cGVzW3N1cGVyVHlwZS5iYXNlXSBhcyBJTWliVHlwZSkge1xuICAgIGJhc2UgPSBzdXBlclR5cGUuYmFzZTtcbiAgfVxuICByZXR1cm4gYmFzZTtcbn1cblxuZnVuY3Rpb24gZGVmaW5lTWliUHJvcGVydHkoXG4gIHRhcmdldDogRGV2aWNlUHJvdG90eXBlLFxuICBrZXk6IHN0cmluZyxcbiAgdHlwZXM6IElNaWJEZXZpY2VbJ3R5cGVzJ10sXG4gIHByb3A6IElNaWJQcm9wZXJ0eSk6IFtudW1iZXIsIHN0cmluZ10ge1xuICBjb25zdCBwcm9wZXJ0eUtleSA9IHZhbGlkSnNOYW1lKGtleSk7XG4gIGNvbnN0IHsgYXBwaW5mbyB9ID0gcHJvcDtcbiAgY29uc3QgaWQgPSB0b0ludChhcHBpbmZvLm5tc19pZCk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2lkJywgaWQsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBjb25zdCBzaW1wbGVUeXBlID0gZ2V0QmFzZVR5cGUodHlwZXMsIHByb3AudHlwZSk7XG4gIGNvbnN0IHR5cGUgPSB0eXBlc1twcm9wLnR5cGVdIGFzIElNaWJUeXBlO1xuICBjb25zdCBjb252ZXJ0ZXJzOiBJQ29udmVydGVyW10gPSBbXTtcbiAgY29uc3QgaXNSZWFkYWJsZSA9IGFwcGluZm8uYWNjZXNzLmluZGV4T2YoJ3InKSA+IC0xO1xuICBjb25zdCBpc1dyaXRhYmxlID0gYXBwaW5mby5hY2Nlc3MuaW5kZXhPZigndycpID4gLTE7XG4gIGxldCBlbnVtZXJhdGlvbjogSU1pYlR5cGVbJ2VudW1lcmF0aW9uJ10gfCB1bmRlZmluZWQ7XG4gIGxldCBtaW46IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgbGV0IG1heDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBzd2l0Y2ggKGdldE5tc1R5cGUoc2ltcGxlVHlwZSkpIHtcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5JbnQ4OlxuICAgICAgbWluID0gLTEyODtcbiAgICAgIG1heCA9IDEyNztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLkludDE2OlxuICAgICAgbWluID0gLTMyNzY4O1xuICAgICAgbWF4ID0gMzI3Njc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5JbnQzMjpcbiAgICAgIG1pbiA9IC0yMTQ3NDgzNjQ4O1xuICAgICAgbWF4ID0gMjE0NzQ4MzY0NztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLlVJbnQ4OlxuICAgICAgbWluID0gMDtcbiAgICAgIG1heCA9IDI1NTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLlVJbnQxNjpcbiAgICAgIG1pbiA9IDA7XG4gICAgICBtYXggPSA2NTUzNTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLlVJbnQzMjpcbiAgICAgIG1pbiA9IDA7XG4gICAgICBtYXggPSA0Mjk0OTY3Mjk1O1xuICAgICAgYnJlYWs7XG4gIH1cbiAgc3dpdGNoIChzaW1wbGVUeXBlKSB7XG4gICAgY2FzZSAncGFja2VkOEZsb2F0JzpcbiAgICAgIGNvbnZlcnRlcnMucHVzaChwYWNrZWQ4ZmxvYXRDb252ZXJ0ZXIodHlwZSkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZml4ZWRQb2ludE51bWJlcjQnOlxuICAgICAgY29udmVydGVycy5wdXNoKGZpeGVkUG9pbnROdW1iZXI0Q29udmVydGVyKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuICBpZiAoa2V5ID09PSAnYnJpZ2h0bmVzcycgJiYgcHJvcC50eXBlID09PSAneHM6dW5zaWduZWRCeXRlJykge1xuICAgIC8vIGNvbnNvbGUubG9nKCd1U0UgUEVSQ0VOVCAxMDA8LT4yNTAnKTtcbiAgICBjb252ZXJ0ZXJzLnB1c2gocGVyY2VudENvbnZlcnRlcik7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgndW5pdCcsICclJywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWluJywgMCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWF4JywgMTAwLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICBtaW4gPSBtYXggPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoaXNXcml0YWJsZSkge1xuICAgIGlmICh0eXBlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHsgbWluSW5jbHVzaXZlLCBtYXhJbmNsdXNpdmUgfSA9IHR5cGU7XG4gICAgICBpZiAobWluSW5jbHVzaXZlKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQobWluSW5jbHVzaXZlKTtcbiAgICAgICAgbWluID0gbWluICE9PSB1bmRlZmluZWQgPyBNYXRoLm1heChtaW4sIHZhbCkgOiB2YWw7XG4gICAgICB9XG4gICAgICBpZiAobWF4SW5jbHVzaXZlKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQobWF4SW5jbHVzaXZlKTtcbiAgICAgICAgbWF4ID0gbWF4ICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbihtYXgsIHZhbCkgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtaW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWluID0gY29udmVydFRvKGNvbnZlcnRlcnMpKG1pbikgYXMgbnVtYmVyO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWluJywgbWluLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgaWYgKG1heCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtYXggPSBjb252ZXJ0VG8oY29udmVydGVycykobWF4KSBhcyBudW1iZXI7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtYXgnLCBtYXgsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZSAhPSBudWxsKSB7XG4gICAgY29uc3QgeyBhcHBpbmZvOiBpbmZvID0ge30gfSA9IHR5cGU7XG4gICAgZW51bWVyYXRpb24gPSB0eXBlLmVudW1lcmF0aW9uO1xuICAgIGNvbnN0IHsgdW5pdHMsIHByZWNpc2lvbiwgcmVwcmVzZW50YXRpb24sIGdldCwgc2V0IH0gPSBpbmZvO1xuICAgIGNvbnN0IHNpemUgPSBnZXRJbnRTaXplKHNpbXBsZVR5cGUpO1xuICAgIGlmICh1bml0cykge1xuICAgICAgY29udmVydGVycy5wdXNoKHVuaXRDb252ZXJ0ZXIodW5pdHMpKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3VuaXQnLCB1bml0cywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIGxldCBwcmVjaXNpb25Db252OiBJQ29udmVydGVyID0ge1xuICAgICAgZnJvbTogdiA9PiB2LFxuICAgICAgdG86IHYgPT4gdixcbiAgICB9O1xuICAgIGlmIChwcmVjaXNpb24pIHtcbiAgICAgIHByZWNpc2lvbkNvbnYgPSBwcmVjaXNpb25Db252ZXJ0ZXIocHJlY2lzaW9uKTtcbiAgICAgIGNvbnZlcnRlcnMucHVzaChwcmVjaXNpb25Db252KTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3N0ZXAnLCAxIC8gKDEwICoqIHBhcnNlSW50KHByZWNpc2lvbiwgMTApKSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIGlmIChlbnVtZXJhdGlvbikge1xuICAgICAgY29udmVydGVycy5wdXNoKGVudW1lcmF0aW9uQ29udmVydGVyKGVudW1lcmF0aW9uKSk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdlbnVtJywgT2JqZWN0LmVudHJpZXMoZW51bWVyYXRpb24pXG4gICAgICAgIC5tYXAoKFtrZXksIHZhbF0pID0+IFtcbiAgICAgICAgICB2YWwhLmFubm90YXRpb24sXG4gICAgICAgICAgdG9JbnQoa2V5KSxcbiAgICAgICAgXSksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgICBpZiAocmVwcmVzZW50YXRpb24pIHtcbiAgICAgIGRlYnVnKCdSRVBSJywgcmVwcmVzZW50YXRpb24sIHNpemUsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgcmVwcmVzZW50YXRpb24gJiYgc2l6ZSAmJiBjb252ZXJ0ZXJzLnB1c2gocmVwcmVzZW50YXRpb25Db252ZXJ0ZXIocmVwcmVzZW50YXRpb24sIHNpemUpKTtcbiAgICBpZiAoZ2V0ICYmIHNldCkge1xuICAgICAgY29uc3QgY29udiA9IGV2YWxDb252ZXJ0ZXIoZ2V0LCBzZXQpO1xuICAgICAgY29udmVydGVycy5wdXNoKGNvbnYpO1xuICAgICAgY29uc3QgW2EsIGJdID0gW2NvbnYudG8obWluKSwgY29udi50byhtYXgpXTtcbiAgICAgIGNvbnN0IG1pbkV2YWwgPSBwYXJzZUZsb2F0KHByZWNpc2lvbkNvbnYudG8oTWF0aC5taW4oYSwgYikpIGFzIHN0cmluZyk7XG4gICAgICBjb25zdCBtYXhFdmFsID0gcGFyc2VGbG9hdChwcmVjaXNpb25Db252LnRvKE1hdGgubWF4KGEsIGIpKSBhcyBzdHJpbmcpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWluJywgbWluRXZhbCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtYXgnLCBtYXhFdmFsLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gIH1cbiAgaWYgKG1pbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29udmVydGVycy5wdXNoKG1pbkluY2x1c2l2ZUNvbnZlcnRlcihtaW4pKTtcbiAgfVxuICBpZiAobWF4ICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb252ZXJ0ZXJzLnB1c2gobWF4SW5jbHVzaXZlQ29udmVydGVyKG1heCkpO1xuICB9XG5cbiAgaWYgKHByb3AudHlwZSA9PT0gJ3ZlcnNpb25UeXBlJykge1xuICAgIGNvbnZlcnRlcnMucHVzaCh2ZXJzaW9uVHlwZUNvbnZlcnRlcik7XG4gIH1cbiAgaWYgKHNpbXBsZVR5cGUgPT09ICd4czpib29sZWFuJyAmJiAhZW51bWVyYXRpb24pIHtcbiAgICBjb252ZXJ0ZXJzLnB1c2goYm9vbGVhbkNvbnZlcnRlcik7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZW51bScsIFtbJ9CU0LAnLCB0cnVlXSwgWyfQndC10YInLCBmYWxzZV1dLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgfVxuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdpc1dyaXRhYmxlJywgaXNXcml0YWJsZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2lzUmVhZGFibGUnLCBpc1JlYWRhYmxlLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgndHlwZScsIHByb3AudHlwZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3NpbXBsZVR5cGUnLCBzaW1wbGVUeXBlLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YShcbiAgICAnZGlzcGxheU5hbWUnLFxuICAgIHByb3AuYW5ub3RhdGlvbiA/IHByb3AuYW5ub3RhdGlvbiA6IG5hbWUsXG4gICAgdGFyZ2V0LFxuICAgIHByb3BlcnR5S2V5LFxuICApO1xuICBhcHBpbmZvLmNhdGVnb3J5ICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NhdGVnb3J5JywgYXBwaW5mby5jYXRlZ29yeSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ25tc1R5cGUnLCBnZXRObXNUeXBlKHNpbXBsZVR5cGUpLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgY29uc3QgYXR0cmlidXRlczogSVByb3BlcnR5RGVzY3JpcHRvcjxEZXZpY2VQcm90b3R5cGU+ID0ge1xuICAgIGVudW1lcmFibGU6IGlzUmVhZGFibGUsXG4gIH07XG4gIGNvbnN0IHRvID0gY29udmVydFRvKGNvbnZlcnRlcnMpO1xuICBjb25zdCBmcm9tID0gY29udmVydEZyb20oY29udmVydGVycyk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NvbnZlcnRUbycsIHRvLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnY29udmVydEZyb20nLCBmcm9tLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgYXR0cmlidXRlcy5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5hc3NlcnQoUmVmbGVjdC5nZXQodGhpcywgJyRjb3VudFJlZicpID4gMCwgJ0RldmljZSB3YXMgcmVsZWFzZWQnKTtcbiAgICBsZXQgdmFsdWU7XG4gICAgaWYgKCF0aGlzLmdldEVycm9yKGlkKSkge1xuICAgICAgdmFsdWUgPSB0byh0aGlzLmdldFJhd1ZhbHVlKGlkKSk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcbiAgaWYgKGlzV3JpdGFibGUpIHtcbiAgICBhdHRyaWJ1dGVzLnNldCA9IGZ1bmN0aW9uIChuZXdWYWx1ZTogYW55KSB7XG4gICAgICBjb25zb2xlLmFzc2VydChSZWZsZWN0LmdldCh0aGlzLCAnJGNvdW50UmVmJykgPiAwLCAnRGV2aWNlIHdhcyByZWxlYXNlZCcpO1xuICAgICAgY29uc3QgdmFsdWUgPSBmcm9tKG5ld1ZhbHVlKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IE51bWJlci5pc05hTih2YWx1ZSBhcyBudW1iZXIpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB2YWx1ZTogJHtKU09OLnN0cmluZ2lmeShuZXdWYWx1ZSl9YCk7XG4gICAgICB9XG4gICAgICB0aGlzLnNldFJhd1ZhbHVlKGlkLCB2YWx1ZSk7XG4gICAgfTtcbiAgfVxuICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHlLZXksIGF0dHJpYnV0ZXMpO1xuICByZXR1cm4gW2lkLCBwcm9wZXJ0eUtleV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNaWJGaWxlKG1pYm5hbWU6IHN0cmluZykge1xuICByZXR1cm4gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL21pYnMvJywgYCR7bWlibmFtZX0ubWliLmpzb25gKTtcbn1cblxuY2xhc3MgRGV2aWNlUHJvdG90eXBlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIGltcGxlbWVudHMgSURldmljZSB7XG4gIC8vIHdpbGwgYmUgb3ZlcnJpZGUgZm9yIGFuIGluc3RhbmNlXG4gICRjb3VudFJlZiA9IDE7XG5cbiAgLy8gcHJpdmF0ZSAkZGVib3VuY2VEcmFpbiA9IF8uZGVib3VuY2UodGhpcy5kcmFpbiwgMjUpO1xuXG4gIGNvbnN0cnVjdG9yKG1pYm5hbWU6IHN0cmluZykge1xuICAgIHN1cGVyKCk7XG4gICAgY29uc3QgbWliZmlsZSA9IGdldE1pYkZpbGUobWlibmFtZSk7XG4gICAgY29uc3QgbWliVmFsaWRhdGlvbiA9IE1pYkRldmljZVYuZGVjb2RlKEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1pYmZpbGUpLnRvU3RyaW5nKCkpKTtcbiAgICBpZiAobWliVmFsaWRhdGlvbi5pc0xlZnQoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIG1pYiBmaWxlICR7bWliZmlsZX0gJHtQYXRoUmVwb3J0ZXIucmVwb3J0KG1pYlZhbGlkYXRpb24pfWApO1xuICAgIH1cbiAgICBjb25zdCBtaWIgPSBtaWJWYWxpZGF0aW9uLnZhbHVlO1xuICAgIGNvbnN0IHsgdHlwZXMsIHN1YnJvdXRpbmVzIH0gPSBtaWI7XG4gICAgY29uc3QgZGV2aWNlID0gdHlwZXNbbWliLmRldmljZV0gYXMgSU1pYkRldmljZVR5cGU7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWliJywgbWlibmFtZSwgdGhpcyk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWliZmlsZScsIG1pYmZpbGUsIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2Fubm90YXRpb24nLCBkZXZpY2UuYW5ub3RhdGlvbiwgdGhpcyk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWliVmVyc2lvbicsIGRldmljZS5hcHBpbmZvLm1pYl92ZXJzaW9uLCB0aGlzKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdkZXZpY2VUeXBlJywgdG9JbnQoZGV2aWNlLmFwcGluZm8uZGV2aWNlX3R5cGUpLCB0aGlzKTtcbiAgICBkZXZpY2UuYXBwaW5mby5sb2FkZXJfdHlwZSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdsb2FkZXJUeXBlJyxcbiAgICAgIHRvSW50KGRldmljZS5hcHBpbmZvLmxvYWRlcl90eXBlKSwgdGhpcyxcbiAgICApO1xuICAgIGRldmljZS5hcHBpbmZvLmZpcm13YXJlICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2Zpcm13YXJlJyxcbiAgICAgIGRldmljZS5hcHBpbmZvLmZpcm13YXJlLCB0aGlzLFxuICAgICk7XG4gICAgZGV2aWNlLmFwcGluZm8ubWluX3ZlcnNpb24gJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWluX3ZlcnNpb24nLFxuICAgICAgZGV2aWNlLmFwcGluZm8ubWluX3ZlcnNpb24sIHRoaXMsXG4gICAgKTtcbiAgICB0eXBlcy5lcnJvclR5cGUgJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YShcbiAgICAgICdlcnJvclR5cGUnLCAodHlwZXMuZXJyb3JUeXBlIGFzIElNaWJUeXBlKS5lbnVtZXJhdGlvbiwgdGhpcyk7XG5cbiAgICBpZiAoc3Vicm91dGluZXMpIHtcbiAgICAgIGNvbnN0IG1ldGFzdWJzID0gXy50cmFuc2Zvcm0oXG4gICAgICAgIHN1YnJvdXRpbmVzLFxuICAgICAgICAocmVzdWx0LCBzdWIsIG5hbWUpID0+IHtcbiAgICAgICAgICByZXN1bHRbbmFtZV0gPSB7XG4gICAgICAgICAgICBpZDogdG9JbnQoc3ViLmFwcGluZm8ubm1zX2lkKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBzdWIuYW5ub3RhdGlvbixcbiAgICAgICAgICAgIGFyZ3M6IHN1Yi5wcm9wZXJ0aWVzICYmIE9iamVjdC5lbnRyaWVzKHN1Yi5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAubWFwKChbbmFtZSwgcHJvcF0pID0+ICh7XG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICB0eXBlOiBnZXRObXNUeXBlKHByb3AudHlwZSksXG4gICAgICAgICAgICAgICAgZGVzYzogcHJvcC5hbm5vdGF0aW9uLFxuICAgICAgICAgICAgICB9KSksXG4gICAgICAgICAgfTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9LFxuICAgICAgICB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBJU3Vicm91dGluZURlc2M+LFxuICAgICAgKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3N1YnJvdXRpbmVzJywgbWV0YXN1YnMsIHRoaXMpO1xuICAgIH1cblxuICAgIC8vIFRPRE86IGNhdGVnb3J5XG4gICAgLy8gY29uc3QgbWliQ2F0ZWdvcnkgPSBfLmZpbmQoZGV0ZWN0b3IuZGV0ZWN0aW9uIS5taWJDYXRlZ29yaWVzLCB7IG1pYjogbWlibmFtZSB9KTtcbiAgICAvLyBpZiAobWliQ2F0ZWdvcnkpIHtcbiAgICAvLyAgIGNvbnN0IHsgY2F0ZWdvcnksIGRpc2FibGVCYXRjaFJlYWRpbmcgfSA9IG1pYkNhdGVnb3J5O1xuICAgIC8vICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnY2F0ZWdvcnknLCBjYXRlZ29yeSwgdGhpcyk7XG4gICAgLy8gICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdkaXNhYmxlQmF0Y2hSZWFkaW5nJywgISFkaXNhYmxlQmF0Y2hSZWFkaW5nLCB0aGlzKTtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBrZXlzID0gUmVmbGVjdC5vd25LZXlzKGRldmljZS5wcm9wZXJ0aWVzKSBhcyBzdHJpbmdbXTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaWJQcm9wZXJ0aWVzJywga2V5cy5tYXAodmFsaWRKc05hbWUpLCB0aGlzKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBudW1iZXJdOiBzdHJpbmdbXSB9ID0ge307XG4gICAga2V5cy5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgW2lkLCBwcm9wTmFtZV0gPSBkZWZpbmVNaWJQcm9wZXJ0eSh0aGlzLCBrZXksIHR5cGVzLCBkZXZpY2UucHJvcGVydGllc1trZXldKTtcbiAgICAgIGlmICghbWFwW2lkXSkge1xuICAgICAgICBtYXBbaWRdID0gW3Byb3BOYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1hcFtpZF0ucHVzaChwcm9wTmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWFwJywgbWFwLCB0aGlzKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgY29ubmVjdGlvbigpOiBOaWJ1c0Nvbm5lY3Rpb24gfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IHsgWyR2YWx1ZXNdOiB2YWx1ZXMgfSA9IHRoaXM7XG4gICAgcmV0dXJuIHZhbHVlc1tQcml2YXRlUHJvcHMuY29ubmVjdGlvbl07XG4gIH1cblxuICBwdWJsaWMgc2V0IGNvbm5lY3Rpb24odmFsdWU6IE5pYnVzQ29ubmVjdGlvbiB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHsgWyR2YWx1ZXNdOiB2YWx1ZXMgfSA9IHRoaXM7XG4gICAgY29uc3QgcHJldiA9IHZhbHVlc1tQcml2YXRlUHJvcHMuY29ubmVjdGlvbl07XG4gICAgaWYgKHByZXYgPT09IHZhbHVlKSByZXR1cm47XG4gICAgdmFsdWVzW1ByaXZhdGVQcm9wcy5jb25uZWN0aW9uXSA9IHZhbHVlO1xuICAgIC8qKlxuICAgICAqIERldmljZSBjb25uZWN0ZWQgZXZlbnRcbiAgICAgKiBAZXZlbnQgSURldmljZSNjb25uZWN0ZWRcbiAgICAgKiBAZXZlbnQgSURldmljZSNkaXNjb25uZWN0ZWRcbiAgICAgKi9cbiAgICB0aGlzLmVtaXQodmFsdWUgIT0gbnVsbCA/ICdjb25uZWN0ZWQnIDogJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIC8vIGlmICh2YWx1ZSkge1xuICAgIC8vICAgdGhpcy5kcmFpbigpLmNhdGNoKCgpID0+IHt9KTtcbiAgICAvLyB9XG4gIH1cblxuICAvLyBub2luc3BlY3Rpb24gSlNVbnVzZWRHbG9iYWxTeW1ib2xzXG4gIHB1YmxpYyB0b0pTT04oKTogYW55IHtcbiAgICBjb25zdCBqc29uOiBhbnkgPSB7XG4gICAgICBtaWI6IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYicsIHRoaXMpLFxuICAgIH07XG4gICAgY29uc3Qga2V5czogc3RyaW5nW10gPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWJQcm9wZXJ0aWVzJywgdGhpcyk7XG4gICAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGlmICh0aGlzW2tleV0gIT09IHVuZGVmaW5lZCkganNvbltrZXldID0gdGhpc1trZXldO1xuICAgIH0pO1xuICAgIGpzb24uYWRkcmVzcyA9IHRoaXMuYWRkcmVzcy50b1N0cmluZygpO1xuICAgIHJldHVybiBqc29uO1xuICB9XG5cbiAgcHVibGljIGdldElkKGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBudW1iZXIge1xuICAgIGxldCBpZDogbnVtYmVyO1xuICAgIGlmICh0eXBlb2YgaWRPck5hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2lkJywgdGhpcywgaWRPck5hbWUpO1xuICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIoaWQpKSByZXR1cm4gaWQ7XG4gICAgICBpZCA9IHRvSW50KGlkT3JOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWQgPSBpZE9yTmFtZTtcbiAgICB9XG4gICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgaWYgKCFSZWZsZWN0LmhhcyhtYXAsIGlkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb3BlcnR5ICR7aWRPck5hbWV9YCk7XG4gICAgfVxuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIHB1YmxpYyBnZXROYW1lKGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGlmIChSZWZsZWN0LmhhcyhtYXAsIGlkT3JOYW1lKSkge1xuICAgICAgcmV0dXJuIG1hcFtpZE9yTmFtZV1bMF07XG4gICAgfVxuICAgIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIHRoaXMpO1xuICAgIGlmICh0eXBlb2YgaWRPck5hbWUgPT09ICdzdHJpbmcnICYmIGtleXMuaW5jbHVkZXMoaWRPck5hbWUpKSByZXR1cm4gaWRPck5hbWU7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb3BlcnR5ICR7aWRPck5hbWV9YCk7XG4gIH1cblxuICAvKlxuICAgIHB1YmxpYyB0b0lkcyhpZHNPck5hbWVzOiAoc3RyaW5nIHwgbnVtYmVyKVtdKTogbnVtYmVyW10ge1xuICAgICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgICByZXR1cm4gaWRzT3JOYW1lcy5tYXAoKGlkT3JOYW1lKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgaWRPck5hbWUgPT09ICdzdHJpbmcnKVxuICAgICAgfSk7XG4gICAgfVxuICAqL1xuICBwdWJsaWMgZ2V0UmF3VmFsdWUoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiB2YWx1ZXNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldFJhd1ZhbHVlKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcsIHZhbHVlOiBhbnksIGlzRGlydHkgPSB0cnVlKSB7XG4gICAgLy8gZGVidWcoYHNldFJhd1ZhbHVlKCR7aWRPck5hbWV9LCAke0pTT04uc3RyaW5naWZ5KHNhZmVOdW1iZXIodmFsdWUpKX0pYCk7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzLCBbJGVycm9yc106IGVycm9ycyB9ID0gdGhpcztcbiAgICBjb25zdCBuZXdWYWwgPSBzYWZlTnVtYmVyKHZhbHVlKTtcbiAgICBpZiAobmV3VmFsICE9PSB2YWx1ZXNbaWRdIHx8IGVycm9yc1tpZF0pIHtcbiAgICAgIHZhbHVlc1tpZF0gPSBuZXdWYWw7XG4gICAgICBkZWxldGUgZXJyb3JzW2lkXTtcbiAgICAgIHRoaXMuc2V0RGlydHkoaWQsIGlzRGlydHkpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBnZXRFcnJvcihpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nKTogYW55IHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGVycm9yc1tpZF07XG4gIH1cblxuICBwdWJsaWMgc2V0RXJyb3IoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZywgZXJyb3I/OiBFcnJvcikge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJGVycm9yc106IGVycm9ycyB9ID0gdGhpcztcbiAgICBpZiAoZXJyb3IgIT0gbnVsbCkge1xuICAgICAgZXJyb3JzW2lkXSA9IGVycm9yO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgZXJyb3JzW2lkXTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgaXNEaXJ0eShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskZGlydGllc106IGRpcnRpZXMgfSA9IHRoaXM7XG4gICAgcmV0dXJuICEhZGlydGllc1tpZF07XG4gIH1cblxuICBwdWJsaWMgc2V0RGlydHkoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlciwgaXNEaXJ0eSA9IHRydWUpIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IG1hcDogeyBbaWQ6IG51bWJlcl06IHN0cmluZ1tdIH0gPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCB7IFskZGlydGllc106IGRpcnRpZXMgfSA9IHRoaXM7XG4gICAgaWYgKGlzRGlydHkpIHtcbiAgICAgIGRpcnRpZXNbaWRdID0gdHJ1ZTtcbiAgICAgIC8vIFRPRE86IGltcGxlbWVudCBhdXRvc2F2ZVxuICAgICAgLy8gdGhpcy53cml0ZShpZCkuY2F0Y2goKCkgPT4ge30pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWxldGUgZGlydGllc1tpZF07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEBldmVudCBJRGV2aWNlI2NoYW5nZWRcbiAgICAgKiBAZXZlbnQgSURldmljZSNjaGFuZ2luZ1xuICAgICAqL1xuICAgIGNvbnN0IG5hbWVzID0gbWFwW2lkXSB8fCBbXTtcbiAgICB0aGlzLmVtaXQoXG4gICAgICBpc0RpcnR5ID8gJ2NoYW5naW5nJyA6ICdjaGFuZ2VkJyxcbiAgICAgIHtcbiAgICAgICAgaWQsXG4gICAgICAgIG5hbWVzLFxuICAgICAgfSxcbiAgICApO1xuICAgIGlmIChuYW1lcy5pbmNsdWRlcygnc2Vybm8nKSAmJiAhaXNEaXJ0eVxuICAgICAgJiYgdGhpcy5hZGRyZXNzLnR5cGUgPT09IEFkZHJlc3NUeXBlLm1hYyAmJiB0eXBlb2YgdGhpcy5zZXJubyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gdGhpcy5zZXJubztcbiAgICAgIGNvbnN0IHByZXZBZGRyZXNzID0gdGhpcy5hZGRyZXNzO1xuICAgICAgY29uc3QgYWRkcmVzcyA9IEJ1ZmZlci5mcm9tKHZhbHVlLnBhZFN0YXJ0KDEyLCAnMCcpLnN1YnN0cmluZyh2YWx1ZS5sZW5ndGggLSAxMiksICdoZXgnKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ2FkZHJlc3MnLCB3aXRoVmFsdWUobmV3IEFkZHJlc3MoYWRkcmVzcyksIGZhbHNlLCB0cnVlKSk7XG4gICAgICBkZXZpY2VzLmVtaXQoJ3Nlcm5vJywgcHJldkFkZHJlc3MsIHRoaXMuYWRkcmVzcyk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFkZHJlZigpIHtcbiAgICB0aGlzLiRjb3VudFJlZiArPSAxO1xuICAgIGRlYnVnKCdhZGRyZWYnLCBuZXcgRXJyb3IoJ2FkZHJlZicpLnN0YWNrKTtcbiAgICByZXR1cm4gdGhpcy4kY291bnRSZWY7XG4gIH1cblxuICBwdWJsaWMgcmVsZWFzZSgpIHtcbiAgICB0aGlzLiRjb3VudFJlZiAtPSAxO1xuICAgIGlmICh0aGlzLiRjb3VudFJlZiA8PSAwKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLmFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICAgIGRldmljZU1hcFtrZXldID0gXy53aXRob3V0KGRldmljZU1hcFtrZXldLCB0aGlzKTtcbiAgICAgIGlmIChkZXZpY2VNYXBba2V5XS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVsZXRlIGRldmljZU1hcFtrZXldO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBAZXZlbnQgRGV2aWNlcyNkZWxldGVcbiAgICAgICAqL1xuICAgICAgZGV2aWNlcy5lbWl0KCdkZWxldGUnLCB0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuJGNvdW50UmVmO1xuICB9XG5cbiAgcHVibGljIGRyYWluKCk6IFByb21pc2U8bnVtYmVyW10+IHtcbiAgICBkZWJ1ZyhgZHJhaW4gWyR7dGhpcy5hZGRyZXNzfV1gKTtcbiAgICBjb25zdCB7IFskZGlydGllc106IGRpcnRpZXMgfSA9IHRoaXM7XG4gICAgY29uc3QgaWRzID0gT2JqZWN0LmtleXMoZGlydGllcykubWFwKE51bWJlcikuZmlsdGVyKGlkID0+IGRpcnRpZXNbaWRdKTtcbiAgICByZXR1cm4gaWRzLmxlbmd0aCA+IDAgPyB0aGlzLndyaXRlKC4uLmlkcykgOiBQcm9taXNlLnJlc29sdmUoW10pO1xuICB9XG5cbiAgcHJpdmF0ZSB3cml0ZUFsbCgpIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5lbnRyaWVzKHZhbHVlcylcbiAgICAgIC5maWx0ZXIoKFssIHZhbHVlXSkgPT4gdmFsdWUgIT0gbnVsbClcbiAgICAgIC5tYXAoKFtpZF0pID0+IE51bWJlcihpZCkpXG4gICAgICAuZmlsdGVyKChpZCA9PiBSZWZsZWN0LmdldE1ldGFkYXRhKCdpc1dyaXRhYmxlJywgdGhpcywgbWFwW2lkXVswXSkpKTtcbiAgICByZXR1cm4gaWRzLmxlbmd0aCA+IDAgPyB0aGlzLndyaXRlKC4uLmlkcykgOiBQcm9taXNlLnJlc29sdmUoW10pO1xuICB9XG5cbiAgcHVibGljIHdyaXRlKC4uLmlkczogbnVtYmVyW10pOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgcmV0dXJuIFByb21pc2UucmVqZWN0KGAke3RoaXMuYWRkcmVzc30gaXMgZGlzY29ubmVjdGVkYCk7XG4gICAgaWYgKGlkcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGlzLndyaXRlQWxsKCk7XG4gICAgfVxuICAgIGRlYnVnKGB3cml0aW5nICR7aWRzLmpvaW4oKX0gdG8gWyR7dGhpcy5hZGRyZXNzfV1gKTtcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCBpbnZhbGlkTm1zOiBudW1iZXJbXSA9IFtdO1xuICAgIGNvbnN0IHJlcXVlc3RzID0gaWRzLnJlZHVjZShcbiAgICAgIChhY2M6IE5tc0RhdGFncmFtW10sIGlkKSA9PiB7XG4gICAgICAgIGNvbnN0IFtuYW1lXSA9IG1hcFtpZF07XG4gICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgIGRlYnVnKGBVbmtub3duIGlkOiAke2lkfSBmb3IgJHtSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCB0aGlzKX1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYWNjLnB1c2goY3JlYXRlTm1zV3JpdGUoXG4gICAgICAgICAgICAgIHRoaXMuYWRkcmVzcyxcbiAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgIFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ25tc1R5cGUnLCB0aGlzLCBuYW1lKSxcbiAgICAgICAgICAgICAgdGhpcy5nZXRSYXdWYWx1ZShpZCksXG4gICAgICAgICAgICApKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB3aGlsZSBjcmVhdGUgTk1TIGRhdGFncmFtJywgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgIGludmFsaWRObXMucHVzaCgtaWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgfSxcbiAgICAgIFtdLFxuICAgICk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgcmVxdWVzdHNcbiAgICAgICAgLm1hcChkYXRhZ3JhbSA9PiBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShkYXRhZ3JhbSlcbiAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgc3RhdHVzIH0gPSByZXNwb25zZSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5zZXREaXJ0eShkYXRhZ3JhbS5pZCwgZmFsc2UpO1xuICAgICAgICAgICAgICByZXR1cm4gZGF0YWdyYW0uaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNldEVycm9yKGRhdGFncmFtLmlkLCBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzKSk7XG4gICAgICAgICAgICByZXR1cm4gLWRhdGFncmFtLmlkO1xuICAgICAgICAgIH0sIChyZWFzb24pID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0RXJyb3IoZGF0YWdyYW0uaWQsIHJlYXNvbik7XG4gICAgICAgICAgICByZXR1cm4gLWRhdGFncmFtLmlkO1xuICAgICAgICAgIH0pKSlcbiAgICAgIC50aGVuKGlkcyA9PiBpZHMuY29uY2F0KGludmFsaWRObXMpKTtcbiAgfVxuXG4gIHB1YmxpYyB3cml0ZVZhbHVlcyhzb3VyY2U6IG9iamVjdCwgc3Ryb25nID0gdHJ1ZSk6IFByb21pc2U8bnVtYmVyW10+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgaWRzID0gT2JqZWN0LmtleXMoc291cmNlKS5tYXAobmFtZSA9PiB0aGlzLmdldElkKG5hbWUpKTtcbiAgICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcigndmFsdWUgaXMgZW1wdHknKSk7XG4gICAgICBPYmplY3QuYXNzaWduKHRoaXMsIHNvdXJjZSk7XG4gICAgICByZXR1cm4gdGhpcy53cml0ZSguLi5pZHMpXG4gICAgICAgIC50aGVuKCh3cml0dGVuKSA9PiB7XG4gICAgICAgICAgaWYgKHdyaXR0ZW4ubGVuZ3RoID09PSAwIHx8IChzdHJvbmcgJiYgd3JpdHRlbi5sZW5ndGggIT09IGlkcy5sZW5ndGgpKSB7XG4gICAgICAgICAgICB0aHJvdyB0aGlzLmdldEVycm9yKGlkc1swXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB3cml0dGVuO1xuICAgICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVhZEFsbCgpOiBQcm9taXNlPGFueT4ge1xuICAgIGlmICh0aGlzLiRyZWFkKSByZXR1cm4gdGhpcy4kcmVhZDtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgaWRzID0gT2JqZWN0LmVudHJpZXMobWFwKVxuICAgICAgLmZpbHRlcigoWywgbmFtZXNdKSA9PiBSZWZsZWN0LmdldE1ldGFkYXRhKCdpc1JlYWRhYmxlJywgdGhpcywgbmFtZXNbMF0pKVxuICAgICAgLm1hcCgoW2lkXSkgPT4gTnVtYmVyKGlkKSlcbiAgICAgIC5zb3J0KCk7XG4gICAgdGhpcy4kcmVhZCA9IGlkcy5sZW5ndGggPiAwID8gdGhpcy5yZWFkKC4uLmlkcykgOiBQcm9taXNlLnJlc29sdmUoW10pO1xuICAgIGNvbnN0IGNsZWFyID0gKCkgPT4gZGVsZXRlIHRoaXMuJHJlYWQ7XG4gICAgcmV0dXJuIHRoaXMuJHJlYWQuZmluYWxseShjbGVhcik7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVhZCguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTx7IFtuYW1lOiBzdHJpbmddOiBhbnkgfT4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbiB9ID0gdGhpcztcbiAgICBpZiAoIWNvbm5lY3Rpb24pIHJldHVybiBQcm9taXNlLnJlamVjdCgnZGlzY29ubmVjdGVkJyk7XG4gICAgaWYgKGlkcy5sZW5ndGggPT09IDApIHJldHVybiB0aGlzLnJlYWRBbGwoKTtcbiAgICAvLyBkZWJ1ZyhgcmVhZCAke2lkcy5qb2luKCl9IGZyb20gWyR7dGhpcy5hZGRyZXNzfV1gKTtcbiAgICBjb25zdCBkaXNhYmxlQmF0Y2hSZWFkaW5nID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnZGlzYWJsZUJhdGNoUmVhZGluZycsIHRoaXMpO1xuICAgIGNvbnN0IG1hcDogeyBbaWQ6IHN0cmluZ106IHN0cmluZ1tdIH0gPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCBjaHVua3MgPSBjaHVua0FycmF5KGlkcywgZGlzYWJsZUJhdGNoUmVhZGluZyA/IDEgOiAyMSk7XG4gICAgZGVidWcoYHJlYWQgWyR7Y2h1bmtzLm1hcChjaHVuayA9PiBgWyR7Y2h1bmsuam9pbigpfV1gKS5qb2luKCl9XSBmcm9tIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgcmVxdWVzdHMgPSBjaHVua3MubWFwKGNodW5rID0+IGNyZWF0ZU5tc1JlYWQodGhpcy5hZGRyZXNzLCAuLi5jaHVuaykpO1xuICAgIHJldHVybiByZXF1ZXN0cy5yZWR1Y2UoXG4gICAgICBhc3luYyAocHJvbWlzZSwgZGF0YWdyYW0pID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShkYXRhZ3JhbSk7XG4gICAgICAgIGNvbnN0IGRhdGFncmFtczogTm1zRGF0YWdyYW1bXSA9IEFycmF5LmlzQXJyYXkocmVzcG9uc2UpXG4gICAgICAgICAgPyByZXNwb25zZSBhcyBObXNEYXRhZ3JhbVtdXG4gICAgICAgICAgOiBbcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW1dO1xuICAgICAgICBkYXRhZ3JhbXMuZm9yRWFjaCgoeyBpZCwgdmFsdWUsIHN0YXR1cyB9KSA9PiB7XG4gICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5zZXRSYXdWYWx1ZShpZCwgdmFsdWUsIGZhbHNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXRFcnJvcihpZCwgbmV3IE5pYnVzRXJyb3Ioc3RhdHVzISwgdGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBuYW1lcyA9IG1hcFtpZF07XG4gICAgICAgICAgY29uc29sZS5hc3NlcnQobmFtZXMgJiYgbmFtZXMubGVuZ3RoID4gMCwgYEludmFsaWQgaWQgJHtpZH1gKTtcbiAgICAgICAgICBuYW1lcy5mb3JFYWNoKChwcm9wTmFtZSkgPT4ge1xuICAgICAgICAgICAgcmVzdWx0W3Byb3BOYW1lXSA9IHN0YXR1cyA9PT0gMFxuICAgICAgICAgICAgICA/IHRoaXNbcHJvcE5hbWVdXG4gICAgICAgICAgICAgIDogeyBlcnJvcjogKHRoaXMuZ2V0RXJyb3IoaWQpIHx8IHt9KS5tZXNzYWdlIHx8ICdlcnJvcicgfTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9LFxuICAgICAgUHJvbWlzZS5yZXNvbHZlKHt9IGFzIHsgW25hbWU6IHN0cmluZ106IGFueSB9KSxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkKGRvbWFpbjogc3RyaW5nLCBvZmZzZXQgPSAwLCBzaXplPzogbnVtYmVyKTogUHJvbWlzZTxCdWZmZXI+IHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0ZWQnKTtcbiAgICAgIGNvbnN0IHJlcVVwbG9hZCA9IGNyZWF0ZU5tc1JlcXVlc3REb21haW5VcGxvYWQodGhpcy5hZGRyZXNzLCBkb21haW4ucGFkRW5kKDgsICdcXDAnKSk7XG4gICAgICBjb25zdCB7IGlkLCB2YWx1ZTogZG9tYWluU2l6ZSwgc3RhdHVzIH0gPVxuICAgICAgICBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShyZXFVcGxvYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgaWYgKHN0YXR1cyAhPT0gMCkge1xuICAgICAgICAvLyBkZWJ1ZygnPGVycm9yPicsIHN0YXR1cyk7XG4gICAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKHN0YXR1cyEsIHRoaXMsICdSZXF1ZXN0IHVwbG9hZCBkb21haW4gZXJyb3InKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGluaXRVcGxvYWQgPSBjcmVhdGVObXNJbml0aWF0ZVVwbG9hZFNlcXVlbmNlKHRoaXMuYWRkcmVzcywgaWQpO1xuICAgICAgY29uc3QgeyBzdGF0dXM6IGluaXRTdGF0IH0gPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShpbml0VXBsb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChpbml0U3RhdCAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihpbml0U3RhdCEsIHRoaXMsICdJbml0aWF0ZSB1cGxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgICB9XG4gICAgICBjb25zdCB0b3RhbCA9IHNpemUgfHwgKGRvbWFpblNpemUgLSBvZmZzZXQpO1xuICAgICAgbGV0IHJlc3QgPSB0b3RhbDtcbiAgICAgIGxldCBwb3MgPSBvZmZzZXQ7XG4gICAgICB0aGlzLmVtaXQoXG4gICAgICAgICd1cGxvYWRTdGFydCcsXG4gICAgICAgIHtcbiAgICAgICAgICBkb21haW4sXG4gICAgICAgICAgZG9tYWluU2l6ZSxcbiAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgc2l6ZTogdG90YWwsXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgICAgY29uc3QgYnVmczogQnVmZmVyW10gPSBbXTtcbiAgICAgIHdoaWxlIChyZXN0ID4gMCkge1xuICAgICAgICBjb25zdCBsZW5ndGggPSBNYXRoLm1pbigyNTUsIHJlc3QpO1xuICAgICAgICBjb25zdCB1cGxvYWRTZWdtZW50ID0gY3JlYXRlTm1zVXBsb2FkU2VnbWVudCh0aGlzLmFkZHJlc3MsIGlkLCBwb3MsIGxlbmd0aCk7XG4gICAgICAgIGNvbnN0IHsgc3RhdHVzOiB1cGxvYWRTdGF0dXMsIHZhbHVlOiByZXN1bHQgfSA9XG4gICAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0odXBsb2FkU2VnbWVudCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICAgIGlmICh1cGxvYWRTdGF0dXMgIT09IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcih1cGxvYWRTdGF0dXMhLCB0aGlzLCAnVXBsb2FkIHNlZ21lbnQgZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0LmRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgYnVmcy5wdXNoKHJlc3VsdC5kYXRhKTtcbiAgICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAgICd1cGxvYWREYXRhJyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBkb21haW4sXG4gICAgICAgICAgICBwb3MsXG4gICAgICAgICAgICBkYXRhOiByZXN1bHQuZGF0YSxcbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgICAgICByZXN0IC09IHJlc3VsdC5kYXRhLmxlbmd0aDtcbiAgICAgICAgcG9zICs9IHJlc3VsdC5kYXRhLmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlc3VsdCA9IEJ1ZmZlci5jb25jYXQoYnVmcyk7XG4gICAgICB0aGlzLmVtaXQoXG4gICAgICAgICd1cGxvYWRGaW5pc2gnLFxuICAgICAgICB7XG4gICAgICAgICAgZG9tYWluLFxuICAgICAgICAgIG9mZnNldCxcbiAgICAgICAgICBkYXRhOiByZXN1bHQsXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLmVtaXQoJ3VwbG9hZEVycm9yJywgZSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRvd25sb2FkKGRvbWFpbjogc3RyaW5nLCBidWZmZXI6IEJ1ZmZlciwgb2Zmc2V0ID0gMCwgbm9UZXJtID0gZmFsc2UpIHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGNvbnN0IHJlcURvd25sb2FkID0gY3JlYXRlTm1zUmVxdWVzdERvbWFpbkRvd25sb2FkKHRoaXMuYWRkcmVzcywgZG9tYWluLnBhZEVuZCg4LCAnXFwwJykpO1xuICAgIGNvbnN0IHsgaWQsIHZhbHVlOiBtYXgsIHN0YXR1cyB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxRG93bmxvYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgIGlmIChzdGF0dXMgIT09IDApIHtcbiAgICAgIC8vIGRlYnVnKCc8ZXJyb3I+Jywgc3RhdHVzKTtcbiAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKHN0YXR1cyEsIHRoaXMsICdSZXF1ZXN0IGRvd25sb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgIH1cbiAgICBjb25zdCB0ZXJtaW5hdGUgPSBhc3luYyAoZXJyPzogRXJyb3IpID0+IHtcbiAgICAgIGxldCB0ZXJtU3RhdCA9IDA7XG4gICAgICBpZiAoIW5vVGVybSkge1xuICAgICAgICBjb25zdCByZXEgPSBjcmVhdGVObXNUZXJtaW5hdGVEb3dubG9hZFNlcXVlbmNlKHRoaXMuYWRkcmVzcywgaWQpO1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShyZXEpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgICB0ZXJtU3RhdCA9IHJlcy5zdGF0dXMhO1xuICAgICAgfVxuICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgaWYgKHRlcm1TdGF0ICE9PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKFxuICAgICAgICAgIHRlcm1TdGF0ISxcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgICdUZXJtaW5hdGUgZG93bmxvYWQgc2VxdWVuY2UgZXJyb3IsIG1heWJlIG5lZWQgLS1uby10ZXJtJyxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlmIChidWZmZXIubGVuZ3RoID4gbWF4IC0gb2Zmc2V0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEJ1ZmZlciB0b28gbGFyZ2UuIEV4cGVjdGVkICR7bWF4IC0gb2Zmc2V0fSBieXRlc2ApO1xuICAgIH1cbiAgICBjb25zdCBpbml0RG93bmxvYWQgPSBjcmVhdGVObXNJbml0aWF0ZURvd25sb2FkU2VxdWVuY2UodGhpcy5hZGRyZXNzLCBpZCk7XG4gICAgY29uc3QgeyBzdGF0dXM6IGluaXRTdGF0IH0gPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShpbml0RG93bmxvYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgIGlmIChpbml0U3RhdCAhPT0gMCkge1xuICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoaW5pdFN0YXQhLCB0aGlzLCAnSW5pdGlhdGUgZG93bmxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgfVxuICAgIHRoaXMuZW1pdChcbiAgICAgICdkb3dubG9hZFN0YXJ0JyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBvZmZzZXQsXG4gICAgICAgIGRvbWFpblNpemU6IG1heCxcbiAgICAgICAgc2l6ZTogYnVmZmVyLmxlbmd0aCxcbiAgICAgIH0sXG4gICAgKTtcbiAgICBjb25zdCBjcmMgPSBjcmMxNmNjaXR0KGJ1ZmZlciwgMCk7XG4gICAgY29uc3QgY2h1bmtTaXplID0gTk1TX01BWF9EQVRBX0xFTkdUSCAtIDQ7XG4gICAgY29uc3QgY2h1bmtzID0gY2h1bmtBcnJheShidWZmZXIsIGNodW5rU2l6ZSk7XG4gICAgYXdhaXQgY2h1bmtzLnJlZHVjZShhc3luYyAocHJldiwgY2h1bms6IEJ1ZmZlciwgaSkgPT4ge1xuICAgICAgYXdhaXQgcHJldjtcbiAgICAgIGNvbnN0IHBvcyA9IGkgKiBjaHVua1NpemUgKyBvZmZzZXQ7XG4gICAgICBjb25zdCBzZWdtZW50RG93bmxvYWQgPVxuICAgICAgICBjcmVhdGVObXNEb3dubG9hZFNlZ21lbnQodGhpcy5hZGRyZXNzLCBpZCEsIHBvcywgY2h1bmspO1xuICAgICAgY29uc3QgeyBzdGF0dXM6IGRvd25sb2FkU3RhdCB9ID1cbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oc2VnbWVudERvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChkb3dubG9hZFN0YXQgIT09IDApIHtcbiAgICAgICAgYXdhaXQgdGVybWluYXRlKG5ldyBOaWJ1c0Vycm9yKGRvd25sb2FkU3RhdCEsIHRoaXMsICdEb3dubG9hZCBzZWdtZW50IGVycm9yJykpO1xuICAgICAgfVxuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAnZG93bmxvYWREYXRhJyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBsZW5ndGg6IGNodW5rLmxlbmd0aCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xuICAgIGNvbnN0IHZlcmlmeSA9IGNyZWF0ZU5tc1ZlcmlmeURvbWFpbkNoZWNrc3VtKHRoaXMuYWRkcmVzcywgaWQsIG9mZnNldCwgYnVmZmVyLmxlbmd0aCwgY3JjKTtcbiAgICBjb25zdCB7IHN0YXR1czogdmVyaWZ5U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0odmVyaWZ5KSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAodmVyaWZ5U3RhdCAhPT0gMCkge1xuICAgICAgYXdhaXQgdGVybWluYXRlKG5ldyBOaWJ1c0Vycm9yKHZlcmlmeVN0YXQhLCB0aGlzLCAnRG93bmxvYWQgc2VnbWVudCBlcnJvcicpKTtcbiAgICB9XG4gICAgYXdhaXQgdGVybWluYXRlKCk7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgJ2Rvd25sb2FkRmluaXNoJyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBvZmZzZXQsXG4gICAgICAgIHNpemU6IGJ1ZmZlci5sZW5ndGgsXG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBhc3luYyBleGVjdXRlKHByb2dyYW06IHN0cmluZywgYXJncz86IFJlY29yZDxzdHJpbmcsIGFueT4pIHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGNvbnN0IHN1YnJvdXRpbmVzID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnc3Vicm91dGluZXMnLCB0aGlzKSBhcyBSZWNvcmQ8c3RyaW5nLCBJU3Vicm91dGluZURlc2M+O1xuICAgIGlmICghc3Vicm91dGluZXMgfHwgIVJlZmxlY3QuaGFzKHN1YnJvdXRpbmVzLCBwcm9ncmFtKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb2dyYW0gJHtwcm9ncmFtfWApO1xuICAgIH1cbiAgICBjb25zdCBzdWJyb3V0aW5lID0gc3Vicm91dGluZXNbcHJvZ3JhbV07XG4gICAgY29uc3QgcHJvcHM6IFR5cGVkVmFsdWVbXSA9IFtdO1xuICAgIGlmIChzdWJyb3V0aW5lLmFyZ3MpIHtcbiAgICAgIE9iamVjdC5lbnRyaWVzKHN1YnJvdXRpbmUuYXJncykuZm9yRWFjaCgoW25hbWUsIGRlc2NdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyZyA9IGFyZ3MgJiYgYXJnc1tuYW1lXTtcbiAgICAgICAgaWYgKCFhcmcpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJnICR7bmFtZX0gaW4gcHJvZ3JhbSAke3Byb2dyYW19YCk7XG4gICAgICAgIHByb3BzLnB1c2goW2Rlc2MudHlwZSwgYXJnXSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVxID0gY3JlYXRlRXhlY3V0ZVByb2dyYW1JbnZvY2F0aW9uKFxuICAgICAgdGhpcy5hZGRyZXNzLFxuICAgICAgc3Vicm91dGluZS5pZCxcbiAgICAgIHN1YnJvdXRpbmUubm90UmVwbHksXG4gICAgICAuLi5wcm9wcyxcbiAgICApO1xuICAgIHJldHVybiBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShyZXEpO1xuICB9XG59XG5cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuaW50ZXJmYWNlIERldmljZVByb3RvdHlwZSB7XG4gIHJlYWRvbmx5IGlkOiBEZXZpY2VJZDtcbiAgcmVhZG9ubHkgYWRkcmVzczogQWRkcmVzcztcbiAgW21pYlByb3BlcnR5OiBzdHJpbmddOiBhbnk7XG4gICRjb3VudFJlZjogbnVtYmVyO1xuICAkcmVhZD86IFByb21pc2U8YW55PjtcbiAgWyR2YWx1ZXNdOiB7IFtpZDogbnVtYmVyXTogYW55IH07XG4gIFskZXJyb3JzXTogeyBbaWQ6IG51bWJlcl06IEVycm9yIH07XG4gIFskZGlydGllc106IHsgW2lkOiBudW1iZXJdOiBib29sZWFuIH07XG59XG5cbmV4cG9ydCBjb25zdCBnZXRNaWJUeXBlcyA9ICgpOiBDb25maWdbJ21pYlR5cGVzJ10gPT4ge1xuICBjb25zdCBjb25mID0gcGF0aC5yZXNvbHZlKGNvbmZpZ0RpciB8fCAnL3RtcCcsICdjb25maWdzdG9yZScsIHBrZ05hbWUpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoYCR7Y29uZn0uanNvbmApKSByZXR1cm4ge307XG4gIGNvbnN0IHZhbGlkYXRlID0gQ29uZmlnVi5kZWNvZGUoSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoYCR7Y29uZn0uanNvbmApLnRvU3RyaW5nKCkpKTtcbi8vICAgY29uc3QgdmFsaWRhdGUgPSBDb25maWdWLmRlY29kZShyZXF1aXJlKGNvbmYpKTtcbiAgaWYgKHZhbGlkYXRlLmlzTGVmdCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmaWxlICR7Y29uZn1cbiAgJHtQYXRoUmVwb3J0ZXIucmVwb3J0KHZhbGlkYXRlKX1gKTtcbiAgfVxuICBjb25zdCB7IG1pYlR5cGVzIH0gPSB2YWxpZGF0ZS52YWx1ZTtcbiAgcmV0dXJuIG1pYlR5cGVzO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNaWJCeVR5cGUodHlwZTogbnVtYmVyLCB2ZXJzaW9uPzogbnVtYmVyKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgbWliVHlwZXMgPSBnZXRNaWJUeXBlcygpO1xuICBjb25zdCBtaWJzID0gbWliVHlwZXMhW3R5cGVdO1xuICBpZiAobWlicyAmJiBtaWJzLmxlbmd0aCkge1xuICAgIGxldCBtaWJUeXBlID0gbWlic1swXTtcbiAgICBpZiAodmVyc2lvbiAmJiBtaWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgIG1pYlR5cGUgPSBfLmZpbmRMYXN0KG1pYnMsICh7IG1pblZlcnNpb24gPSAwIH0pID0+IG1pblZlcnNpb24gPD0gdmVyc2lvbikgfHwgbWliVHlwZTtcbiAgICB9XG4gICAgcmV0dXJuIG1pYlR5cGUubWliO1xuICB9XG4gIC8vIGNvbnN0IGNhY2hlTWlicyA9IE9iamVjdC5rZXlzKG1pYlR5cGVzQ2FjaGUpO1xuICAvLyBjb25zdCBjYWNoZWQgPSBjYWNoZU1pYnMuZmluZChtaWIgPT5cbiAgLy8gICBSZWZsZWN0LmdldE1ldGFkYXRhKCdkZXZpY2VUeXBlJywgbWliVHlwZXNDYWNoZVttaWJdLnByb3RvdHlwZSkgPT09IHR5cGUpO1xuICAvLyBpZiAoY2FjaGVkKSByZXR1cm4gY2FjaGVkO1xuICAvLyBjb25zdCBtaWJzID0gZ2V0TWlic1N5bmMoKTtcbiAgLy8gcmV0dXJuIF8uZGlmZmVyZW5jZShtaWJzLCBjYWNoZU1pYnMpLmZpbmQoKG1pYk5hbWUpID0+IHtcbiAgLy8gICBjb25zdCBtaWJmaWxlID0gZ2V0TWliRmlsZShtaWJOYW1lKTtcbiAgLy8gICBjb25zdCBtaWI6IElNaWJEZXZpY2UgPSByZXF1aXJlKG1pYmZpbGUpO1xuICAvLyAgIGNvbnN0IHsgdHlwZXMgfSA9IG1pYjtcbiAgLy8gICBjb25zdCBkZXZpY2UgPSB0eXBlc1ttaWIuZGV2aWNlXSBhcyBJTWliRGV2aWNlVHlwZTtcbiAgLy8gICByZXR1cm4gdG9JbnQoZGV2aWNlLmFwcGluZm8uZGV2aWNlX3R5cGUpID09PSB0eXBlO1xuICAvLyB9KTtcbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIERldmljZXMge1xuICBvbihldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnbmV3JyB8ICdkZWxldGUnLCBkZXZpY2VMaXN0ZW5lcjogKGRldmljZTogSURldmljZSkgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnbmV3JyB8ICdkZWxldGUnLCBkZXZpY2VMaXN0ZW5lcjogKGRldmljZTogSURldmljZSkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKHByZXZBZGRyZXNzOiBBZGRyZXNzLCBuZXdBZGRyZXNzOiBBZGRyZXNzKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKHByZXZBZGRyZXNzOiBBZGRyZXNzLCBuZXdBZGRyZXNzOiBBZGRyZXNzKSA9PiB2b2lkKTogdGhpcztcbn1cblxuZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3IobWliOiBzdHJpbmcpOiBGdW5jdGlvbiB7XG4gIGxldCBjb25zdHJ1Y3RvciA9IG1pYlR5cGVzQ2FjaGVbbWliXTtcbiAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuICAgIGZ1bmN0aW9uIERldmljZSh0aGlzOiBEZXZpY2VQcm90b3R5cGUsIGFkZHJlc3M6IEFkZHJlc3MpIHtcbiAgICAgIEV2ZW50RW1pdHRlci5hcHBseSh0aGlzKTtcbiAgICAgIHRoaXNbJHZhbHVlc10gPSB7fTtcbiAgICAgIHRoaXNbJGVycm9yc10gPSB7fTtcbiAgICAgIHRoaXNbJGRpcnRpZXNdID0ge307XG4gICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGRyZXNzJywgd2l0aFZhbHVlKGFkZHJlc3MsIGZhbHNlLCB0cnVlKSk7XG4gICAgICB0aGlzLiRjb3VudFJlZiA9IDE7XG4gICAgICAodGhpcyBhcyBhbnkpLmlkID0gdGltZWlkKCkgYXMgRGV2aWNlSWQ7XG4gICAgICAvLyBkZWJ1ZyhuZXcgRXJyb3IoJ0NSRUFURScpLnN0YWNrKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm90b3R5cGUgPSBuZXcgRGV2aWNlUHJvdG90eXBlKG1pYik7XG4gICAgRGV2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAoRGV2aWNlIGFzIGFueSkuZGlzcGxheU5hbWUgPSBgJHttaWJbMF0udG9VcHBlckNhc2UoKX0ke21pYi5zbGljZSgxKX1gO1xuICAgIGNvbnN0cnVjdG9yID0gRGV2aWNlO1xuICAgIG1pYlR5cGVzQ2FjaGVbbWliXSA9IGNvbnN0cnVjdG9yO1xuICB9XG4gIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1pYlByb3RvdHlwZShtaWI6IHN0cmluZyk6IE9iamVjdCB7XG4gIHJldHVybiBnZXRDb25zdHJ1Y3RvcihtaWIpLnByb3RvdHlwZTtcbn1cblxuZXhwb3J0IGNsYXNzIERldmljZXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBnZXQgPSAoKTogSURldmljZVtdID0+IF8uZmxhdHRlbihfLnZhbHVlcyhkZXZpY2VNYXApKTtcblxuICBmaW5kID0gKGFkZHJlc3M6IEFkZHJlc3NQYXJhbSk6IElEZXZpY2VbXSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgY29uc3QgdGFyZ2V0QWRkcmVzcyA9IG5ldyBBZGRyZXNzKGFkZHJlc3MpO1xuICAgIHJldHVybiBkZXZpY2VNYXBbdGFyZ2V0QWRkcmVzcy50b1N0cmluZygpXTtcbiAgfTtcblxuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCBtaWI6IHN0cmluZyk6IElEZXZpY2U7XG4gIGNyZWF0ZShhZGRyZXNzOiBBZGRyZXNzUGFyYW0sIHR5cGU6IG51bWJlciwgdmVyc2lvbj86IG51bWJlcik6IElEZXZpY2U7XG4gIGNyZWF0ZShhZGRyZXNzOiBBZGRyZXNzUGFyYW0sIG1pYk9yVHlwZTogYW55LCB2ZXJzaW9uPzogbnVtYmVyKTogSURldmljZSB7XG4gICAgbGV0IG1pYjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlb2YgbWliT3JUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgbWliID0gZmluZE1pYkJ5VHlwZShtaWJPclR5cGUsIHZlcnNpb24pO1xuICAgICAgaWYgKG1pYiA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbWliIHR5cGUnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtaWJPclR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBtaWIgPSBTdHJpbmcobWliT3JUeXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaWIgb3IgdHlwZSBleHBlY3RlZCwgZ290ICR7bWliT3JUeXBlfWApO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRBZGRyZXNzID0gbmV3IEFkZHJlc3MoYWRkcmVzcyk7XG4gICAgLy8gbGV0IGRldmljZSA9IGRldmljZU1hcFt0YXJnZXRBZGRyZXNzLnRvU3RyaW5nKCldO1xuICAgIC8vIGlmIChkZXZpY2UpIHtcbiAgICAvLyAgIGNvbnNvbGUuYXNzZXJ0KFxuICAgIC8vICAgICBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCBkZXZpY2UpID09PSBtaWIsXG4gICAgLy8gICAgIGBtaWJzIGFyZSBkaWZmZXJlbnQsIGV4cGVjdGVkICR7bWlifWAsXG4gICAgLy8gICApO1xuICAgIC8vICAgZGV2aWNlLmFkZHJlZigpO1xuICAgIC8vICAgcmV0dXJuIGRldmljZTtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGdldENvbnN0cnVjdG9yKG1pYik7XG4gICAgY29uc3QgZGV2aWNlOiBJRGV2aWNlID0gUmVmbGVjdC5jb25zdHJ1Y3QoY29uc3RydWN0b3IsIFt0YXJnZXRBZGRyZXNzXSk7XG4gICAgaWYgKCF0YXJnZXRBZGRyZXNzLmlzRW1wdHkpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRhcmdldEFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICAgIGRldmljZU1hcFtrZXldID0gKGRldmljZU1hcFtrZXldIHx8IFtdKS5jb25jYXQoZGV2aWNlKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gdGhpcy5lbWl0KCduZXcnLCBkZXZpY2UpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRldmljZTtcbiAgfVxufVxuXG5jb25zdCBkZXZpY2VzID0gbmV3IERldmljZXMoKTtcblxuZXhwb3J0IGRlZmF1bHQgZGV2aWNlcztcbiJdfQ==