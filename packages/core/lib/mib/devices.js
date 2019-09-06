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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taWIvZGV2aWNlcy50cyJdLCJuYW1lcyI6WyJwa2dOYW1lIiwiZGVidWciLCIkdmFsdWVzIiwiU3ltYm9sIiwiJGVycm9ycyIsIiRkaXJ0aWVzIiwic2FmZU51bWJlciIsInZhbCIsIm51bSIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsIlByaXZhdGVQcm9wcyIsImRldmljZU1hcCIsIm1pYlR5cGVzQ2FjaGUiLCJNaWJQcm9wZXJ0eUFwcEluZm9WIiwidCIsImludGVyc2VjdGlvbiIsInR5cGUiLCJubXNfaWQiLCJ1bmlvbiIsInN0cmluZyIsIkludCIsImFjY2VzcyIsInBhcnRpYWwiLCJjYXRlZ29yeSIsIk1pYlByb3BlcnR5ViIsImFubm90YXRpb24iLCJhcHBpbmZvIiwiTWliRGV2aWNlQXBwSW5mb1YiLCJtaWJfdmVyc2lvbiIsImRldmljZV90eXBlIiwibG9hZGVyX3R5cGUiLCJmaXJtd2FyZSIsIm1pbl92ZXJzaW9uIiwiTWliRGV2aWNlVHlwZVYiLCJwcm9wZXJ0aWVzIiwicmVjb3JkIiwiTWliVHlwZVYiLCJiYXNlIiwiemVybyIsInVuaXRzIiwicHJlY2lzaW9uIiwicmVwcmVzZW50YXRpb24iLCJnZXQiLCJzZXQiLCJtaW5JbmNsdXNpdmUiLCJtYXhJbmNsdXNpdmUiLCJlbnVtZXJhdGlvbiIsIk1pYlN1YnJvdXRpbmVWIiwicmVzcG9uc2UiLCJTdWJyb3V0aW5lVHlwZVYiLCJpZCIsImxpdGVyYWwiLCJNaWJEZXZpY2VWIiwiZGV2aWNlIiwidHlwZXMiLCJzdWJyb3V0aW5lcyIsImdldEJhc2VUeXBlIiwic3VwZXJUeXBlIiwiZGVmaW5lTWliUHJvcGVydHkiLCJ0YXJnZXQiLCJrZXkiLCJwcm9wIiwicHJvcGVydHlLZXkiLCJSZWZsZWN0IiwiZGVmaW5lTWV0YWRhdGEiLCJzaW1wbGVUeXBlIiwiY29udmVydGVycyIsImlzUmVhZGFibGUiLCJpbmRleE9mIiwiaXNXcml0YWJsZSIsIm1pbiIsIm1heCIsIk5tc1ZhbHVlVHlwZSIsIkludDgiLCJJbnQxNiIsIkludDMyIiwiVUludDgiLCJVSW50MTYiLCJVSW50MzIiLCJwdXNoIiwiZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIiLCJwZXJjZW50Q29udmVydGVyIiwidW5kZWZpbmVkIiwiTWF0aCIsImluZm8iLCJzaXplIiwicHJlY2lzaW9uQ29udiIsImZyb20iLCJ2IiwidG8iLCJwYXJzZUludCIsIk9iamVjdCIsImVudHJpZXMiLCJtYXAiLCJjb252IiwiYSIsImIiLCJtaW5FdmFsIiwibWF4RXZhbCIsInZlcnNpb25UeXBlQ29udmVydGVyIiwiYm9vbGVhbkNvbnZlcnRlciIsIm5hbWUiLCJhdHRyaWJ1dGVzIiwiZW51bWVyYWJsZSIsImNvbnNvbGUiLCJhc3NlcnQiLCJ2YWx1ZSIsImdldEVycm9yIiwiZ2V0UmF3VmFsdWUiLCJuZXdWYWx1ZSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInNldFJhd1ZhbHVlIiwiZGVmaW5lUHJvcGVydHkiLCJnZXRNaWJGaWxlIiwibWlibmFtZSIsInBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwiRGV2aWNlUHJvdG90eXBlIiwiRXZlbnRFbWl0dGVyIiwiY29uc3RydWN0b3IiLCJtaWJmaWxlIiwibWliVmFsaWRhdGlvbiIsImRlY29kZSIsInBhcnNlIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ0b1N0cmluZyIsImlzTGVmdCIsIlBhdGhSZXBvcnRlciIsInJlcG9ydCIsIm1pYiIsImVycm9yVHlwZSIsIm1ldGFzdWJzIiwiXyIsInRyYW5zZm9ybSIsInJlc3VsdCIsInN1YiIsImRlc2NyaXB0aW9uIiwiYXJncyIsImRlc2MiLCJrZXlzIiwib3duS2V5cyIsInZhbGlkSnNOYW1lIiwiZm9yRWFjaCIsInByb3BOYW1lIiwiY29ubmVjdGlvbiIsInZhbHVlcyIsInByZXYiLCJlbWl0IiwidG9KU09OIiwianNvbiIsImdldE1ldGFkYXRhIiwiYWRkcmVzcyIsImdldElkIiwiaWRPck5hbWUiLCJpc0ludGVnZXIiLCJoYXMiLCJnZXROYW1lIiwiaW5jbHVkZXMiLCJpc0RpcnR5IiwiZXJyb3JzIiwibmV3VmFsIiwic2V0RGlydHkiLCJzZXRFcnJvciIsImVycm9yIiwiZGlydGllcyIsIm5hbWVzIiwiQWRkcmVzc1R5cGUiLCJtYWMiLCJzZXJubyIsInByZXZBZGRyZXNzIiwiQnVmZmVyIiwicGFkU3RhcnQiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJBZGRyZXNzIiwiZGV2aWNlcyIsImFkZHJlZiIsIiRjb3VudFJlZiIsInN0YWNrIiwicmVsZWFzZSIsIndpdGhvdXQiLCJkcmFpbiIsImlkcyIsImZpbHRlciIsIndyaXRlIiwiUHJvbWlzZSIsIndyaXRlQWxsIiwicmVqZWN0Iiwiam9pbiIsImludmFsaWRObXMiLCJyZXF1ZXN0cyIsInJlZHVjZSIsImFjYyIsImUiLCJtZXNzYWdlIiwiYWxsIiwiZGF0YWdyYW0iLCJzZW5kRGF0YWdyYW0iLCJ0aGVuIiwic3RhdHVzIiwiTmlidXNFcnJvciIsInJlYXNvbiIsImNvbmNhdCIsIndyaXRlVmFsdWVzIiwic291cmNlIiwic3Ryb25nIiwiVHlwZUVycm9yIiwiYXNzaWduIiwid3JpdHRlbiIsImVyciIsInJlYWRBbGwiLCIkcmVhZCIsInNvcnQiLCJyZWFkIiwiY2xlYXIiLCJmaW5hbGx5IiwiZGlzYWJsZUJhdGNoUmVhZGluZyIsImNodW5rcyIsImNodW5rIiwicHJvbWlzZSIsImRhdGFncmFtcyIsIkFycmF5IiwiaXNBcnJheSIsInVwbG9hZCIsImRvbWFpbiIsIm9mZnNldCIsInJlcVVwbG9hZCIsInBhZEVuZCIsImRvbWFpblNpemUiLCJpbml0VXBsb2FkIiwiaW5pdFN0YXQiLCJ0b3RhbCIsInJlc3QiLCJwb3MiLCJidWZzIiwidXBsb2FkU2VnbWVudCIsInVwbG9hZFN0YXR1cyIsImRhdGEiLCJkb3dubG9hZCIsImJ1ZmZlciIsIm5vVGVybSIsInJlcURvd25sb2FkIiwidGVybWluYXRlIiwidGVybVN0YXQiLCJyZXEiLCJyZXMiLCJpbml0RG93bmxvYWQiLCJjcmMiLCJjaHVua1NpemUiLCJOTVNfTUFYX0RBVEFfTEVOR1RIIiwiaSIsInNlZ21lbnREb3dubG9hZCIsImRvd25sb2FkU3RhdCIsInZlcmlmeSIsInZlcmlmeVN0YXQiLCJleGVjdXRlIiwicHJvZ3JhbSIsInN1YnJvdXRpbmUiLCJwcm9wcyIsImFyZyIsIm5vdFJlcGx5IiwiZ2V0TWliVHlwZXMiLCJjb25mIiwiY29uZmlnRGlyIiwiZXhpc3RzU3luYyIsInZhbGlkYXRlIiwiQ29uZmlnViIsIm1pYlR5cGVzIiwiZmluZE1pYkJ5VHlwZSIsInZlcnNpb24iLCJtaWJzIiwibWliVHlwZSIsImZpbmRMYXN0IiwibWluVmVyc2lvbiIsImdldENvbnN0cnVjdG9yIiwiRGV2aWNlIiwiYXBwbHkiLCJwcm90b3R5cGUiLCJjcmVhdGUiLCJkaXNwbGF5TmFtZSIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJnZXRNaWJQcm90b3R5cGUiLCJEZXZpY2VzIiwiZmxhdHRlbiIsInRhcmdldEFkZHJlc3MiLCJtaWJPclR5cGUiLCJTdHJpbmciLCJjb25zdHJ1Y3QiLCJpc0VtcHR5IiwicHJvY2VzcyIsIm5leHRUaWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFXQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7QUFnQkE7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBb0JBO0FBQ0E7QUFFQSxNQUFNQSxPQUFPLEdBQUcsZ0JBQWhCLEMsQ0FBa0M7O0FBRWxDLE1BQU1DLEtBQUssR0FBRyxvQkFBYSxlQUFiLENBQWQ7QUFFQSxNQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQyxRQUFELENBQXRCO0FBQ0EsTUFBTUMsT0FBTyxHQUFHRCxNQUFNLENBQUMsUUFBRCxDQUF0QjtBQUNBLE1BQU1FLFFBQVEsR0FBR0YsTUFBTSxDQUFDLFNBQUQsQ0FBdkI7O0FBRUEsU0FBU0csVUFBVCxDQUFvQkMsR0FBcEIs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aWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE9PTyBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG4vKiB0c2xpbnQ6ZGlzYWJsZTp2YXJpYWJsZS1uYW1lICovXG5pbXBvcnQgeyBjcmMxNmNjaXR0IH0gZnJvbSAnY3JjJztcbmltcG9ydCBkZWJ1Z0ZhY3RvcnkgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0IGZyb20gJ2lvLXRzJztcbmltcG9ydCB7IFBhdGhSZXBvcnRlciB9IGZyb20gJ2lvLXRzL2xpYi9QYXRoUmVwb3J0ZXInO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCB7IGNvbmZpZyBhcyBjb25maWdEaXIgfSBmcm9tICd4ZGctYmFzZWRpcic7XG5pbXBvcnQgQWRkcmVzcywgeyBBZGRyZXNzUGFyYW0sIEFkZHJlc3NUeXBlIH0gZnJvbSAnLi4vQWRkcmVzcyc7XG5pbXBvcnQgeyBOaWJ1c0Vycm9yIH0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7IE5NU19NQVhfREFUQV9MRU5HVEggfSBmcm9tICcuLi9uYmNvbnN0JztcbmltcG9ydCB7IE5pYnVzQ29ubmVjdGlvbiB9IGZyb20gJy4uL25pYnVzJztcbmltcG9ydCB7IGNodW5rQXJyYXkgfSBmcm9tICcuLi9uaWJ1cy9oZWxwZXInO1xuaW1wb3J0IHtcbiAgY3JlYXRlRXhlY3V0ZVByb2dyYW1JbnZvY2F0aW9uLFxuICBjcmVhdGVObXNEb3dubG9hZFNlZ21lbnQsXG4gIGNyZWF0ZU5tc0luaXRpYXRlRG93bmxvYWRTZXF1ZW5jZSxcbiAgY3JlYXRlTm1zSW5pdGlhdGVVcGxvYWRTZXF1ZW5jZSxcbiAgY3JlYXRlTm1zUmVhZCxcbiAgY3JlYXRlTm1zUmVxdWVzdERvbWFpbkRvd25sb2FkLFxuICBjcmVhdGVObXNSZXF1ZXN0RG9tYWluVXBsb2FkLFxuICBjcmVhdGVObXNUZXJtaW5hdGVEb3dubG9hZFNlcXVlbmNlLFxuICBjcmVhdGVObXNVcGxvYWRTZWdtZW50LFxuICBjcmVhdGVObXNWZXJpZnlEb21haW5DaGVja3N1bSxcbiAgY3JlYXRlTm1zV3JpdGUsXG4gIGdldE5tc1R5cGUsXG4gIFR5cGVkVmFsdWUsXG59IGZyb20gJy4uL25tcyc7XG5pbXBvcnQgTm1zRGF0YWdyYW0gZnJvbSAnLi4vbm1zL05tc0RhdGFncmFtJztcbmltcG9ydCBObXNWYWx1ZVR5cGUgZnJvbSAnLi4vbm1zL05tc1ZhbHVlVHlwZSc7XG5pbXBvcnQgeyBDb25maWcsIENvbmZpZ1YgfSBmcm9tICcuLi9zZXNzaW9uL2NvbW1vbic7XG5pbXBvcnQgdGltZWlkIGZyb20gJy4uL3RpbWVpZCc7XG5pbXBvcnQge1xuICBib29sZWFuQ29udmVydGVyLFxuICBjb252ZXJ0RnJvbSxcbiAgY29udmVydFRvLFxuICBlbnVtZXJhdGlvbkNvbnZlcnRlciwgZXZhbENvbnZlcnRlcixcbiAgZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIsXG4gIGdldEludFNpemUsXG4gIElDb252ZXJ0ZXIsXG4gIG1heEluY2x1c2l2ZUNvbnZlcnRlcixcbiAgbWluSW5jbHVzaXZlQ29udmVydGVyLFxuICBwYWNrZWQ4ZmxvYXRDb252ZXJ0ZXIsXG4gIHBlcmNlbnRDb252ZXJ0ZXIsXG4gIHByZWNpc2lvbkNvbnZlcnRlcixcbiAgcmVwcmVzZW50YXRpb25Db252ZXJ0ZXIsXG4gIHRvSW50LFxuICB1bml0Q29udmVydGVyLFxuICB2YWxpZEpzTmFtZSxcbiAgdmVyc2lvblR5cGVDb252ZXJ0ZXIsXG4gIHdpdGhWYWx1ZSxcbn0gZnJvbSAnLi9taWInO1xuLy8gaW1wb3J0IHsgZ2V0TWlic1N5bmMgfSBmcm9tICcuL21pYjJqc29uJztcbi8vIGltcG9ydCBkZXRlY3RvciBmcm9tICcuLi9zZXJ2aWNlL2RldGVjdG9yJztcblxuY29uc3QgcGtnTmFtZSA9ICdAbmF0YS9uaWJ1cy5qcyc7IC8vIHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5cbmNvbnN0IGRlYnVnID0gZGVidWdGYWN0b3J5KCduaWJ1czpkZXZpY2VzJyk7XG5cbmNvbnN0ICR2YWx1ZXMgPSBTeW1ib2woJ3ZhbHVlcycpO1xuY29uc3QgJGVycm9ycyA9IFN5bWJvbCgnZXJyb3JzJyk7XG5jb25zdCAkZGlydGllcyA9IFN5bWJvbCgnZGlydGllcycpO1xuXG5mdW5jdGlvbiBzYWZlTnVtYmVyKHZhbDogYW55KSB7XG4gIGNvbnN0IG51bSA9IHBhcnNlRmxvYXQodmFsKTtcbiAgcmV0dXJuIChOdW1iZXIuaXNOYU4obnVtKSB8fCBgJHtudW19YCAhPT0gdmFsKSA/IHZhbCA6IG51bTtcbn1cblxuZW51bSBQcml2YXRlUHJvcHMge1xuICBjb25uZWN0aW9uID0gLTEsXG59XG5cbmNvbnN0IGRldmljZU1hcDogeyBbYWRkcmVzczogc3RyaW5nXTogSURldmljZVtdIH0gPSB7fTtcblxuY29uc3QgbWliVHlwZXNDYWNoZTogeyBbbWlibmFtZTogc3RyaW5nXTogRnVuY3Rpb24gfSA9IHt9O1xuXG5jb25zdCBNaWJQcm9wZXJ0eUFwcEluZm9WID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIG5tc19pZDogdC51bmlvbihbdC5zdHJpbmcsIHQuSW50XSksXG4gICAgYWNjZXNzOiB0LnN0cmluZyxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgY2F0ZWdvcnk6IHQuc3RyaW5nLFxuICB9KSxcbl0pO1xuXG4vLyBpbnRlcmZhY2UgSU1pYlByb3BlcnR5QXBwSW5mbyBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJQcm9wZXJ0eUFwcEluZm9WPiB7fVxuXG5jb25zdCBNaWJQcm9wZXJ0eVYgPSB0LnR5cGUoe1xuICB0eXBlOiB0LnN0cmluZyxcbiAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gIGFwcGluZm86IE1pYlByb3BlcnR5QXBwSW5mb1YsXG59KTtcblxuaW50ZXJmYWNlIElNaWJQcm9wZXJ0eSBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJQcm9wZXJ0eVY+IHtcbiAgLy8gYXBwaW5mbzogSU1pYlByb3BlcnR5QXBwSW5mbztcbn1cblxuY29uc3QgTWliRGV2aWNlQXBwSW5mb1YgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgbWliX3ZlcnNpb246IHQuc3RyaW5nLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBkZXZpY2VfdHlwZTogdC5zdHJpbmcsXG4gICAgbG9hZGVyX3R5cGU6IHQuc3RyaW5nLFxuICAgIGZpcm13YXJlOiB0LnN0cmluZyxcbiAgICBtaW5fdmVyc2lvbjogdC5zdHJpbmcsXG4gIH0pLFxuXSk7XG5cbmNvbnN0IE1pYkRldmljZVR5cGVWID0gdC50eXBlKHtcbiAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gIGFwcGluZm86IE1pYkRldmljZUFwcEluZm9WLFxuICBwcm9wZXJ0aWVzOiB0LnJlY29yZCh0LnN0cmluZywgTWliUHJvcGVydHlWKSxcbn0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElNaWJEZXZpY2VUeXBlIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYkRldmljZVR5cGVWPiB7fVxuXG5jb25zdCBNaWJUeXBlViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBiYXNlOiB0LnN0cmluZyxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgYXBwaW5mbzogdC5wYXJ0aWFsKHtcbiAgICAgIHplcm86IHQuc3RyaW5nLFxuICAgICAgdW5pdHM6IHQuc3RyaW5nLFxuICAgICAgcHJlY2lzaW9uOiB0LnN0cmluZyxcbiAgICAgIHJlcHJlc2VudGF0aW9uOiB0LnN0cmluZyxcbiAgICAgIGdldDogdC5zdHJpbmcsXG4gICAgICBzZXQ6IHQuc3RyaW5nLFxuICAgIH0pLFxuICAgIG1pbkluY2x1c2l2ZTogdC5zdHJpbmcsXG4gICAgbWF4SW5jbHVzaXZlOiB0LnN0cmluZyxcbiAgICBlbnVtZXJhdGlvbjogdC5yZWNvcmQodC5zdHJpbmcsIHQudHlwZSh7IGFubm90YXRpb246IHQuc3RyaW5nIH0pKSxcbiAgfSksXG5dKTtcblxuZXhwb3J0IGludGVyZmFjZSBJTWliVHlwZSBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJUeXBlVj4ge31cblxuY29uc3QgTWliU3Vicm91dGluZVYgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gICAgYXBwaW5mbzogdC5pbnRlcnNlY3Rpb24oW1xuICAgICAgdC50eXBlKHsgbm1zX2lkOiB0LnVuaW9uKFt0LnN0cmluZywgdC5JbnRdKSB9KSxcbiAgICAgIHQucGFydGlhbCh7IHJlc3BvbnNlOiB0LnN0cmluZyB9KSxcbiAgICBdKSxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgcHJvcGVydGllczogdC5yZWNvcmQodC5zdHJpbmcsIHQudHlwZSh7XG4gICAgICB0eXBlOiB0LnN0cmluZyxcbiAgICAgIGFubm90YXRpb246IHQuc3RyaW5nLFxuICAgIH0pKSxcbiAgfSksXG5dKTtcblxuY29uc3QgU3Vicm91dGluZVR5cGVWID0gdC50eXBlKHtcbiAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gIHByb3BlcnRpZXM6IHQudHlwZSh7XG4gICAgaWQ6IHQudHlwZSh7XG4gICAgICB0eXBlOiB0LmxpdGVyYWwoJ3hzOnVuc2lnbmVkU2hvcnQnKSxcbiAgICAgIGFubm90YXRpb246IHQuc3RyaW5nLFxuICAgIH0pLFxuICB9KSxcbn0pO1xuXG5leHBvcnQgY29uc3QgTWliRGV2aWNlViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBkZXZpY2U6IHQuc3RyaW5nLFxuICAgIHR5cGVzOiB0LnJlY29yZCh0LnN0cmluZywgdC51bmlvbihbTWliRGV2aWNlVHlwZVYsIE1pYlR5cGVWLCBTdWJyb3V0aW5lVHlwZVZdKSksXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIHN1YnJvdXRpbmVzOiB0LnJlY29yZCh0LnN0cmluZywgTWliU3Vicm91dGluZVYpLFxuICB9KSxcbl0pO1xuXG5pbnRlcmZhY2UgSU1pYkRldmljZSBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJEZXZpY2VWPiB7fVxuXG50eXBlIExpc3RlbmVyPFQ+ID0gKGFyZzogVCkgPT4gdm9pZDtcbnR5cGUgQ2hhbmdlQXJnID0geyBpZDogbnVtYmVyLCBuYW1lczogc3RyaW5nW10gfTtcbmV4cG9ydCB0eXBlIENoYW5nZUxpc3RlbmVyID0gTGlzdGVuZXI8Q2hhbmdlQXJnPjtcbnR5cGUgVXBsb2FkU3RhcnRBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBkb21haW5TaXplOiBudW1iZXIsIG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIFVwbG9hZFN0YXJ0TGlzdGVuZXIgPSBMaXN0ZW5lcjxVcGxvYWRTdGFydEFyZz47XG50eXBlIFVwbG9hZERhdGFBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBkYXRhOiBCdWZmZXIsIHBvczogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBVcGxvYWREYXRhTGlzdGVuZXIgPSBMaXN0ZW5lcjxVcGxvYWREYXRhQXJnPjtcbnR5cGUgVXBsb2FkRmluaXNoQXJnID0geyBkb21haW46IHN0cmluZywgb2Zmc2V0OiBudW1iZXIsIGRhdGE6IEJ1ZmZlciB9O1xuZXhwb3J0IHR5cGUgVXBsb2FkRmluaXNoTGlzdGVuZXIgPSBMaXN0ZW5lcjxVcGxvYWRGaW5pc2hBcmc+O1xudHlwZSBEb3dubG9hZFN0YXJ0QXJnID0geyBkb21haW46IHN0cmluZywgZG9tYWluU2l6ZTogbnVtYmVyLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBEb3dubG9hZFN0YXJ0TGlzdGVuZXIgPSBMaXN0ZW5lcjxEb3dubG9hZFN0YXJ0QXJnPjtcbnR5cGUgRG93bmxvYWREYXRhQXJnID0geyBkb21haW46IHN0cmluZywgbGVuZ3RoOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIERvd25sb2FkRGF0YUxpc3RlbmVyID0gTGlzdGVuZXI8RG93bmxvYWREYXRhQXJnPjtcbnR5cGUgRG93bmxvYWRGaW5pc2hBcmcgPSB7IGRvbWFpbjogc3RyaW5nOyBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBEb3dubG9hZEZpbmlzaExpc3RlbmVyID0gTGlzdGVuZXI8RG93bmxvYWRGaW5pc2hBcmc+O1xuZXhwb3J0IHR5cGUgRGV2aWNlSWQgPSBzdHJpbmcgJiB7IF9fYnJhbmQ6ICdEZXZpY2VJZCcgfTtcblxuZXhwb3J0IGludGVyZmFjZSBJRGV2aWNlIHtcbiAgcmVhZG9ubHkgaWQ6IERldmljZUlkO1xuICByZWFkb25seSBhZGRyZXNzOiBBZGRyZXNzO1xuICBkcmFpbigpOiBQcm9taXNlPG51bWJlcltdPjtcbiAgd3JpdGUoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8bnVtYmVyW10+O1xuICByZWFkKC4uLmlkczogbnVtYmVyW10pOiBQcm9taXNlPHsgW25hbWU6IHN0cmluZ106IGFueSB9PjtcbiAgdXBsb2FkKGRvbWFpbjogc3RyaW5nLCBvZmZzZXQ/OiBudW1iZXIsIHNpemU/OiBudW1iZXIpOiBQcm9taXNlPEJ1ZmZlcj47XG4gIGRvd25sb2FkKGRvbWFpbjogc3RyaW5nLCBkYXRhOiBCdWZmZXIsIG9mZnNldD86IG51bWJlciwgbm9UZXJtPzogYm9vbGVhbik6IFByb21pc2U8dm9pZD47XG4gIGV4ZWN1dGUoXG4gICAgcHJvZ3JhbTogc3RyaW5nLFxuICAgIGFyZ3M/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxObXNEYXRhZ3JhbSB8IE5tc0RhdGFncmFtW10gfCB1bmRlZmluZWQ+O1xuICBjb25uZWN0aW9uPzogTmlidXNDb25uZWN0aW9uO1xuICByZWxlYXNlKCk6IG51bWJlcjtcbiAgZ2V0SWQoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IG51bWJlcjtcbiAgZ2V0TmFtZShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogc3RyaW5nO1xuICBnZXRSYXdWYWx1ZShpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nKTogYW55O1xuICBnZXRFcnJvcihpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nKTogYW55O1xuICBpc0RpcnR5KGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBib29sZWFuO1xuICBbbWliUHJvcGVydHk6IHN0cmluZ106IGFueTtcblxuICBvbihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyBvbihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgbGlzdGVuZXI6IENoYW5nZUxpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAndXBsb2FkRmluaXNoJywgbGlzdGVuZXI6IFVwbG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBEb3dubG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcblxuICBvbmNlKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIG9uY2UoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgbGlzdGVuZXI6IENoYW5nZUxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAndXBsb2FkRmluaXNoJywgbGlzdGVuZXI6IFVwbG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBEb3dubG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcblxuICBhZGRMaXN0ZW5lcihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyBhZGRMaXN0ZW5lcihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgbGlzdGVuZXI6IENoYW5nZUxpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAndXBsb2FkRmluaXNoJywgbGlzdGVuZXI6IFVwbG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBEb3dubG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcblxuICBvZmYoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gb2ZmKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9mZihldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgbGlzdGVuZXI6IENoYW5nZUxpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAndXBsb2FkRmluaXNoJywgbGlzdGVuZXI6IFVwbG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBEb3dubG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcblxuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyByZW1vdmVMaXN0ZW5lcihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgbGlzdGVuZXI6IENoYW5nZUxpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAndXBsb2FkRmluaXNoJywgbGlzdGVuZXI6IFVwbG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBEb3dubG9hZEZpbmlzaExpc3RlbmVyKTogdGhpcztcblxuICBlbWl0KGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnKTogYm9vbGVhbjtcbiAgLy8gZW1pdChldmVudDogJ3Nlcm5vJyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGFyZzogQ2hhbmdlQXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ3VwbG9hZFN0YXJ0JywgYXJnOiBVcGxvYWRTdGFydEFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICd1cGxvYWREYXRhJywgYXJnOiBVcGxvYWREYXRhQXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ3VwbG9hZEZpbmlzaCcsIGFyZzogVXBsb2FkRmluaXNoQXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBhcmc6IERvd25sb2FkU3RhcnRBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnZG93bmxvYWREYXRhJywgYXJnOiBEb3dubG9hZERhdGFBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBhcmc6IERvd25sb2FkRmluaXNoQXJnKTogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIElTdWJyb3V0aW5lRGVzYyB7XG4gIGlkOiBudW1iZXI7XG4gIC8vIG5hbWU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgbm90UmVwbHk/OiBib29sZWFuO1xuICBhcmdzPzogeyBuYW1lOiBzdHJpbmcsIHR5cGU6IE5tc1ZhbHVlVHlwZSwgZGVzYz86IHN0cmluZyB9W107XG59XG5cbmludGVyZmFjZSBJUHJvcGVydHlEZXNjcmlwdG9yPE93bmVyPiB7XG4gIGNvbmZpZ3VyYWJsZT86IGJvb2xlYW47XG4gIGVudW1lcmFibGU/OiBib29sZWFuO1xuICB2YWx1ZT86IGFueTtcbiAgd3JpdGFibGU/OiBib29sZWFuO1xuXG4gIGdldD8odGhpczogT3duZXIpOiBhbnk7XG5cbiAgc2V0Pyh0aGlzOiBPd25lciwgdjogYW55KTogdm9pZDtcbn1cblxuZnVuY3Rpb24gZ2V0QmFzZVR5cGUodHlwZXM6IElNaWJEZXZpY2VbJ3R5cGVzJ10sIHR5cGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBiYXNlID0gdHlwZTtcbiAgZm9yIChsZXQgc3VwZXJUeXBlOiBJTWliVHlwZSA9IHR5cGVzW2Jhc2VdIGFzIElNaWJUeXBlOyBzdXBlclR5cGUgIT0gbnVsbDtcbiAgICAgICBzdXBlclR5cGUgPSB0eXBlc1tzdXBlclR5cGUuYmFzZV0gYXMgSU1pYlR5cGUpIHtcbiAgICBiYXNlID0gc3VwZXJUeXBlLmJhc2U7XG4gIH1cbiAgcmV0dXJuIGJhc2U7XG59XG5cbmZ1bmN0aW9uIGRlZmluZU1pYlByb3BlcnR5KFxuICB0YXJnZXQ6IERldmljZVByb3RvdHlwZSxcbiAga2V5OiBzdHJpbmcsXG4gIHR5cGVzOiBJTWliRGV2aWNlWyd0eXBlcyddLFxuICBwcm9wOiBJTWliUHJvcGVydHkpOiBbbnVtYmVyLCBzdHJpbmddIHtcbiAgY29uc3QgcHJvcGVydHlLZXkgPSB2YWxpZEpzTmFtZShrZXkpO1xuICBjb25zdCB7IGFwcGluZm8gfSA9IHByb3A7XG4gIGNvbnN0IGlkID0gdG9JbnQoYXBwaW5mby5ubXNfaWQpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdpZCcsIGlkLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgY29uc3Qgc2ltcGxlVHlwZSA9IGdldEJhc2VUeXBlKHR5cGVzLCBwcm9wLnR5cGUpO1xuICBjb25zdCB0eXBlID0gdHlwZXNbcHJvcC50eXBlXSBhcyBJTWliVHlwZTtcbiAgY29uc3QgY29udmVydGVyczogSUNvbnZlcnRlcltdID0gW107XG4gIGNvbnN0IGlzUmVhZGFibGUgPSBhcHBpbmZvLmFjY2Vzcy5pbmRleE9mKCdyJykgPiAtMTtcbiAgY29uc3QgaXNXcml0YWJsZSA9IGFwcGluZm8uYWNjZXNzLmluZGV4T2YoJ3cnKSA+IC0xO1xuICBsZXQgZW51bWVyYXRpb246IElNaWJUeXBlWydlbnVtZXJhdGlvbiddIHwgdW5kZWZpbmVkO1xuICBsZXQgbWluOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIGxldCBtYXg6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgc3dpdGNoIChnZXRObXNUeXBlKHNpbXBsZVR5cGUpKSB7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuSW50ODpcbiAgICAgIG1pbiA9IC0xMjg7XG4gICAgICBtYXggPSAxMjc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5JbnQxNjpcbiAgICAgIG1pbiA9IC0zMjc2ODtcbiAgICAgIG1heCA9IDMyNzY3O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuSW50MzI6XG4gICAgICBtaW4gPSAtMjE0NzQ4MzY0ODtcbiAgICAgIG1heCA9IDIxNDc0ODM2NDc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5VSW50ODpcbiAgICAgIG1pbiA9IDA7XG4gICAgICBtYXggPSAyNTU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5VSW50MTY6XG4gICAgICBtaW4gPSAwO1xuICAgICAgbWF4ID0gNjU1MzU7XG4gICAgICBicmVhaztcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5VSW50MzI6XG4gICAgICBtaW4gPSAwO1xuICAgICAgbWF4ID0gNDI5NDk2NzI5NTtcbiAgICAgIGJyZWFrO1xuICB9XG4gIHN3aXRjaCAoc2ltcGxlVHlwZSkge1xuICAgIGNhc2UgJ3BhY2tlZDhGbG9hdCc6XG4gICAgICBjb252ZXJ0ZXJzLnB1c2gocGFja2VkOGZsb2F0Q29udmVydGVyKHR5cGUpKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2ZpeGVkUG9pbnROdW1iZXI0JzpcbiAgICAgIGNvbnZlcnRlcnMucHVzaChmaXhlZFBvaW50TnVtYmVyNENvbnZlcnRlcik7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgYnJlYWs7XG4gIH1cbiAgaWYgKGtleSA9PT0gJ2JyaWdodG5lc3MnICYmIHByb3AudHlwZSA9PT0gJ3hzOnVuc2lnbmVkQnl0ZScpIHtcbiAgICAvLyBjb25zb2xlLmxvZygndVNFIFBFUkNFTlQgMTAwPC0+MjUwJyk7XG4gICAgY29udmVydGVycy5wdXNoKHBlcmNlbnRDb252ZXJ0ZXIpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3VuaXQnLCAnJScsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbicsIDAsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21heCcsIDEwMCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgbWluID0gbWF4ID0gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKGlzV3JpdGFibGUpIHtcbiAgICBpZiAodHlwZSAhPSBudWxsKSB7XG4gICAgICBjb25zdCB7IG1pbkluY2x1c2l2ZSwgbWF4SW5jbHVzaXZlIH0gPSB0eXBlO1xuICAgICAgaWYgKG1pbkluY2x1c2l2ZSkge1xuICAgICAgICBjb25zdCB2YWwgPSBwYXJzZUZsb2F0KG1pbkluY2x1c2l2ZSk7XG4gICAgICAgIG1pbiA9IG1pbiAhPT0gdW5kZWZpbmVkID8gTWF0aC5tYXgobWluLCB2YWwpIDogdmFsO1xuICAgICAgfVxuICAgICAgaWYgKG1heEluY2x1c2l2ZSkge1xuICAgICAgICBjb25zdCB2YWwgPSBwYXJzZUZsb2F0KG1heEluY2x1c2l2ZSk7XG4gICAgICAgIG1heCA9IG1heCAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4obWF4LCB2YWwpIDogdmFsO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobWluICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1pbiA9IGNvbnZlcnRUbyhjb252ZXJ0ZXJzKShtaW4pIGFzIG51bWJlcjtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbicsIG1pbiwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIGlmIChtYXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWF4ID0gY29udmVydFRvKGNvbnZlcnRlcnMpKG1heCkgYXMgbnVtYmVyO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWF4JywgbWF4LCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGUgIT0gbnVsbCkge1xuICAgIGNvbnN0IHsgYXBwaW5mbzogaW5mbyA9IHt9IH0gPSB0eXBlO1xuICAgIGVudW1lcmF0aW9uID0gdHlwZS5lbnVtZXJhdGlvbjtcbiAgICBjb25zdCB7IHVuaXRzLCBwcmVjaXNpb24sIHJlcHJlc2VudGF0aW9uLCBnZXQsIHNldCB9ID0gaW5mbztcbiAgICBjb25zdCBzaXplID0gZ2V0SW50U2l6ZShzaW1wbGVUeXBlKTtcbiAgICBpZiAodW5pdHMpIHtcbiAgICAgIGNvbnZlcnRlcnMucHVzaCh1bml0Q29udmVydGVyKHVuaXRzKSk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCd1bml0JywgdW5pdHMsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgICBsZXQgcHJlY2lzaW9uQ29udjogSUNvbnZlcnRlciA9IHtcbiAgICAgIGZyb206IHYgPT4gdixcbiAgICAgIHRvOiB2ID0+IHYsXG4gICAgfTtcbiAgICBpZiAocHJlY2lzaW9uKSB7XG4gICAgICBwcmVjaXNpb25Db252ID0gcHJlY2lzaW9uQ29udmVydGVyKHByZWNpc2lvbik7XG4gICAgICBjb252ZXJ0ZXJzLnB1c2gocHJlY2lzaW9uQ29udik7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzdGVwJywgMSAvICgxMCAqKiBwYXJzZUludChwcmVjaXNpb24sIDEwKSksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgICBpZiAoZW51bWVyYXRpb24pIHtcbiAgICAgIGNvbnZlcnRlcnMucHVzaChlbnVtZXJhdGlvbkNvbnZlcnRlcihlbnVtZXJhdGlvbikpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZW51bScsIE9iamVjdC5lbnRyaWVzKGVudW1lcmF0aW9uKVxuICAgICAgICAubWFwKChba2V5LCB2YWxdKSA9PiBbXG4gICAgICAgICAgdmFsIS5hbm5vdGF0aW9uLFxuICAgICAgICAgIHRvSW50KGtleSksXG4gICAgICAgIF0pLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgaWYgKHJlcHJlc2VudGF0aW9uKSB7XG4gICAgICBkZWJ1ZygnUkVQUicsIHJlcHJlc2VudGF0aW9uLCBzaXplLCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIHJlcHJlc2VudGF0aW9uICYmIHNpemUgJiYgY29udmVydGVycy5wdXNoKHJlcHJlc2VudGF0aW9uQ29udmVydGVyKHJlcHJlc2VudGF0aW9uLCBzaXplKSk7XG4gICAgaWYgKGdldCAmJiBzZXQpIHtcbiAgICAgIGNvbnN0IGNvbnYgPSBldmFsQ29udmVydGVyKGdldCwgc2V0KTtcbiAgICAgIGNvbnZlcnRlcnMucHVzaChjb252KTtcbiAgICAgIGNvbnN0IFthLCBiXSA9IFtjb252LnRvKG1pbiksIGNvbnYudG8obWF4KV07XG4gICAgICBjb25zdCBtaW5FdmFsID0gcGFyc2VGbG9hdChwcmVjaXNpb25Db252LnRvKE1hdGgubWluKGEsIGIpKSBhcyBzdHJpbmcpO1xuICAgICAgY29uc3QgbWF4RXZhbCA9IHBhcnNlRmxvYXQocHJlY2lzaW9uQ29udi50byhNYXRoLm1heChhLCBiKSkgYXMgc3RyaW5nKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbicsIG1pbkV2YWwsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWF4JywgbWF4RXZhbCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICB9XG4gIGlmIChtaW4gIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnZlcnRlcnMucHVzaChtaW5JbmNsdXNpdmVDb252ZXJ0ZXIobWluKSk7XG4gIH1cbiAgaWYgKG1heCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29udmVydGVycy5wdXNoKG1heEluY2x1c2l2ZUNvbnZlcnRlcihtYXgpKTtcbiAgfVxuXG4gIGlmIChwcm9wLnR5cGUgPT09ICd2ZXJzaW9uVHlwZScpIHtcbiAgICBjb252ZXJ0ZXJzLnB1c2godmVyc2lvblR5cGVDb252ZXJ0ZXIpO1xuICB9XG4gIGlmIChzaW1wbGVUeXBlID09PSAneHM6Ym9vbGVhbicgJiYgIWVudW1lcmF0aW9uKSB7XG4gICAgY29udmVydGVycy5wdXNoKGJvb2xlYW5Db252ZXJ0ZXIpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2VudW0nLCBbWyfQlNCwJywgdHJ1ZV0sIFsn0J3QtdGCJywgZmFsc2VdXSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIH1cbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnaXNXcml0YWJsZScsIGlzV3JpdGFibGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdpc1JlYWRhYmxlJywgaXNSZWFkYWJsZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3R5cGUnLCBwcm9wLnR5cGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzaW1wbGVUeXBlJywgc2ltcGxlVHlwZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoXG4gICAgJ2Rpc3BsYXlOYW1lJyxcbiAgICBwcm9wLmFubm90YXRpb24gPyBwcm9wLmFubm90YXRpb24gOiBuYW1lLFxuICAgIHRhcmdldCxcbiAgICBwcm9wZXJ0eUtleSxcbiAgKTtcbiAgYXBwaW5mby5jYXRlZ29yeSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjYXRlZ29yeScsIGFwcGluZm8uY2F0ZWdvcnksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdubXNUeXBlJywgZ2V0Tm1zVHlwZShzaW1wbGVUeXBlKSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGNvbnN0IGF0dHJpYnV0ZXM6IElQcm9wZXJ0eURlc2NyaXB0b3I8RGV2aWNlUHJvdG90eXBlPiA9IHtcbiAgICBlbnVtZXJhYmxlOiBpc1JlYWRhYmxlLFxuICB9O1xuICBjb25zdCB0byA9IGNvbnZlcnRUbyhjb252ZXJ0ZXJzKTtcbiAgY29uc3QgZnJvbSA9IGNvbnZlcnRGcm9tKGNvbnZlcnRlcnMpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjb252ZXJ0VG8nLCB0bywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NvbnZlcnRGcm9tJywgZnJvbSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGF0dHJpYnV0ZXMuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUuYXNzZXJ0KFJlZmxlY3QuZ2V0KHRoaXMsICckY291bnRSZWYnKSA+IDAsICdEZXZpY2Ugd2FzIHJlbGVhc2VkJyk7XG4gICAgbGV0IHZhbHVlO1xuICAgIGlmICghdGhpcy5nZXRFcnJvcihpZCkpIHtcbiAgICAgIHZhbHVlID0gdG8odGhpcy5nZXRSYXdWYWx1ZShpZCkpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG4gIGlmIChpc1dyaXRhYmxlKSB7XG4gICAgYXR0cmlidXRlcy5zZXQgPSBmdW5jdGlvbiAobmV3VmFsdWU6IGFueSkge1xuICAgICAgY29uc29sZS5hc3NlcnQoUmVmbGVjdC5nZXQodGhpcywgJyRjb3VudFJlZicpID4gMCwgJ0RldmljZSB3YXMgcmVsZWFzZWQnKTtcbiAgICAgIGNvbnN0IHZhbHVlID0gZnJvbShuZXdWYWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCBOdW1iZXIuaXNOYU4odmFsdWUgYXMgbnVtYmVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkobmV3VmFsdWUpfWApO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXRSYXdWYWx1ZShpZCwgdmFsdWUpO1xuICAgIH07XG4gIH1cbiAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5S2V5LCBhdHRyaWJ1dGVzKTtcbiAgcmV0dXJuIFtpZCwgcHJvcGVydHlLZXldO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWliRmlsZShtaWJuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9taWJzLycsIGAke21pYm5hbWV9Lm1pYi5qc29uYCk7XG59XG5cbmNsYXNzIERldmljZVByb3RvdHlwZSBleHRlbmRzIEV2ZW50RW1pdHRlciBpbXBsZW1lbnRzIElEZXZpY2Uge1xuICAvLyB3aWxsIGJlIG92ZXJyaWRlIGZvciBhbiBpbnN0YW5jZVxuICAkY291bnRSZWYgPSAxO1xuXG4gIC8vIHByaXZhdGUgJGRlYm91bmNlRHJhaW4gPSBfLmRlYm91bmNlKHRoaXMuZHJhaW4sIDI1KTtcblxuICBjb25zdHJ1Y3RvcihtaWJuYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcigpO1xuICAgIGNvbnN0IG1pYmZpbGUgPSBnZXRNaWJGaWxlKG1pYm5hbWUpO1xuICAgIGNvbnN0IG1pYlZhbGlkYXRpb24gPSBNaWJEZXZpY2VWLmRlY29kZShKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtaWJmaWxlKS50b1N0cmluZygpKSk7XG4gICAgaWYgKG1pYlZhbGlkYXRpb24uaXNMZWZ0KCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtaWIgZmlsZSAke21pYmZpbGV9ICR7UGF0aFJlcG9ydGVyLnJlcG9ydChtaWJWYWxpZGF0aW9uKX1gKTtcbiAgICB9XG4gICAgY29uc3QgbWliID0gbWliVmFsaWRhdGlvbi52YWx1ZTtcbiAgICBjb25zdCB7IHR5cGVzLCBzdWJyb3V0aW5lcyB9ID0gbWliO1xuICAgIGNvbnN0IGRldmljZSA9IHR5cGVzW21pYi5kZXZpY2VdIGFzIElNaWJEZXZpY2VUeXBlO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYicsIG1pYm5hbWUsIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYmZpbGUnLCBtaWJmaWxlLCB0aGlzKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdhbm5vdGF0aW9uJywgZGV2aWNlLmFubm90YXRpb24sIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYlZlcnNpb24nLCBkZXZpY2UuYXBwaW5mby5taWJfdmVyc2lvbiwgdGhpcyk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZGV2aWNlVHlwZScsIHRvSW50KGRldmljZS5hcHBpbmZvLmRldmljZV90eXBlKSwgdGhpcyk7XG4gICAgZGV2aWNlLmFwcGluZm8ubG9hZGVyX3R5cGUgJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbG9hZGVyVHlwZScsXG4gICAgICB0b0ludChkZXZpY2UuYXBwaW5mby5sb2FkZXJfdHlwZSksIHRoaXMsXG4gICAgKTtcbiAgICBkZXZpY2UuYXBwaW5mby5maXJtd2FyZSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdmaXJtd2FyZScsXG4gICAgICBkZXZpY2UuYXBwaW5mby5maXJtd2FyZSwgdGhpcyxcbiAgICApO1xuICAgIGRldmljZS5hcHBpbmZvLm1pbl92ZXJzaW9uICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbl92ZXJzaW9uJyxcbiAgICAgIGRldmljZS5hcHBpbmZvLm1pbl92ZXJzaW9uLCB0aGlzLFxuICAgICk7XG4gICAgdHlwZXMuZXJyb3JUeXBlICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoXG4gICAgICAnZXJyb3JUeXBlJywgKHR5cGVzLmVycm9yVHlwZSBhcyBJTWliVHlwZSkuZW51bWVyYXRpb24sIHRoaXMpO1xuXG4gICAgaWYgKHN1YnJvdXRpbmVzKSB7XG4gICAgICBjb25zdCBtZXRhc3VicyA9IF8udHJhbnNmb3JtKFxuICAgICAgICBzdWJyb3V0aW5lcyxcbiAgICAgICAgKHJlc3VsdCwgc3ViLCBuYW1lKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W25hbWVdID0ge1xuICAgICAgICAgICAgaWQ6IHRvSW50KHN1Yi5hcHBpbmZvLm5tc19pZCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogc3ViLmFubm90YXRpb24sXG4gICAgICAgICAgICBhcmdzOiBzdWIucHJvcGVydGllcyAmJiBPYmplY3QuZW50cmllcyhzdWIucHJvcGVydGllcylcbiAgICAgICAgICAgICAgLm1hcCgoW25hbWUsIHByb3BdKSA9PiAoe1xuICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgdHlwZTogZ2V0Tm1zVHlwZShwcm9wLnR5cGUpLFxuICAgICAgICAgICAgICAgIGRlc2M6IHByb3AuYW5ub3RhdGlvbixcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcbiAgICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgSVN1YnJvdXRpbmVEZXNjPixcbiAgICAgICk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzdWJyb3V0aW5lcycsIG1ldGFzdWJzLCB0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBjYXRlZ29yeVxuICAgIC8vIGNvbnN0IG1pYkNhdGVnb3J5ID0gXy5maW5kKGRldGVjdG9yLmRldGVjdGlvbiEubWliQ2F0ZWdvcmllcywgeyBtaWI6IG1pYm5hbWUgfSk7XG4gICAgLy8gaWYgKG1pYkNhdGVnb3J5KSB7XG4gICAgLy8gICBjb25zdCB7IGNhdGVnb3J5LCBkaXNhYmxlQmF0Y2hSZWFkaW5nIH0gPSBtaWJDYXRlZ29yeTtcbiAgICAvLyAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NhdGVnb3J5JywgY2F0ZWdvcnksIHRoaXMpO1xuICAgIC8vICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZGlzYWJsZUJhdGNoUmVhZGluZycsICEhZGlzYWJsZUJhdGNoUmVhZGluZywgdGhpcyk7XG4gICAgLy8gfVxuXG4gICAgY29uc3Qga2V5cyA9IFJlZmxlY3Qub3duS2V5cyhkZXZpY2UucHJvcGVydGllcykgYXMgc3RyaW5nW107XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIGtleXMubWFwKHZhbGlkSnNOYW1lKSwgdGhpcyk7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogbnVtYmVyXTogc3RyaW5nW10gfSA9IHt9O1xuICAgIGtleXMuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IFtpZCwgcHJvcE5hbWVdID0gZGVmaW5lTWliUHJvcGVydHkodGhpcywga2V5LCB0eXBlcywgZGV2aWNlLnByb3BlcnRpZXNba2V5XSk7XG4gICAgICBpZiAoIW1hcFtpZF0pIHtcbiAgICAgICAgbWFwW2lkXSA9IFtwcm9wTmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXBbaWRdLnB1c2gocHJvcE5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21hcCcsIG1hcCwgdGhpcyk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGNvbm5lY3Rpb24oKTogTmlidXNDb25uZWN0aW9uIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dO1xuICB9XG5cbiAgcHVibGljIHNldCBjb25uZWN0aW9uKHZhbHVlOiBOaWJ1c0Nvbm5lY3Rpb24gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IHByZXYgPSB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dO1xuICAgIGlmIChwcmV2ID09PSB2YWx1ZSkgcmV0dXJuO1xuICAgIHZhbHVlc1tQcml2YXRlUHJvcHMuY29ubmVjdGlvbl0gPSB2YWx1ZTtcbiAgICAvKipcbiAgICAgKiBEZXZpY2UgY29ubmVjdGVkIGV2ZW50XG4gICAgICogQGV2ZW50IElEZXZpY2UjY29ubmVjdGVkXG4gICAgICogQGV2ZW50IElEZXZpY2UjZGlzY29ubmVjdGVkXG4gICAgICovXG4gICAgdGhpcy5lbWl0KHZhbHVlICE9IG51bGwgPyAnY29ubmVjdGVkJyA6ICdkaXNjb25uZWN0ZWQnKTtcbiAgICAvLyBpZiAodmFsdWUpIHtcbiAgICAvLyAgIHRoaXMuZHJhaW4oKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgLy8gfVxuICB9XG5cbiAgLy8gbm9pbnNwZWN0aW9uIEpTVW51c2VkR2xvYmFsU3ltYm9sc1xuICBwdWJsaWMgdG9KU09OKCk6IGFueSB7XG4gICAgY29uc3QganNvbjogYW55ID0ge1xuICAgICAgbWliOiBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCB0aGlzKSxcbiAgICB9O1xuICAgIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIHRoaXMpO1xuICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBpZiAodGhpc1trZXldICE9PSB1bmRlZmluZWQpIGpzb25ba2V5XSA9IHRoaXNba2V5XTtcbiAgICB9KTtcbiAgICBqc29uLmFkZHJlc3MgPSB0aGlzLmFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICByZXR1cm4ganNvbjtcbiAgfVxuXG4gIHB1YmxpYyBnZXRJZChpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogbnVtYmVyIHtcbiAgICBsZXQgaWQ6IG51bWJlcjtcbiAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgaWQgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdpZCcsIHRoaXMsIGlkT3JOYW1lKTtcbiAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKGlkKSkgcmV0dXJuIGlkO1xuICAgICAgaWQgPSB0b0ludChpZE9yTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkID0gaWRPck5hbWU7XG4gICAgfVxuICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGlmICghUmVmbGVjdC5oYXMobWFwLCBpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9wZXJ0eSAke2lkT3JOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBwdWJsaWMgZ2V0TmFtZShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBpZiAoUmVmbGVjdC5oYXMobWFwLCBpZE9yTmFtZSkpIHtcbiAgICAgIHJldHVybiBtYXBbaWRPck5hbWVdWzBdO1xuICAgIH1cbiAgICBjb25zdCBrZXlzOiBzdHJpbmdbXSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYlByb3BlcnRpZXMnLCB0aGlzKTtcbiAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJyAmJiBrZXlzLmluY2x1ZGVzKGlkT3JOYW1lKSkgcmV0dXJuIGlkT3JOYW1lO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9wZXJ0eSAke2lkT3JOYW1lfWApO1xuICB9XG5cbiAgLypcbiAgICBwdWJsaWMgdG9JZHMoaWRzT3JOYW1lczogKHN0cmluZyB8IG51bWJlcilbXSk6IG51bWJlcltdIHtcbiAgICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgICAgcmV0dXJuIGlkc09yTmFtZXMubWFwKChpZE9yTmFtZSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJylcbiAgICAgIH0pO1xuICAgIH1cbiAgKi9cbiAgcHVibGljIGdldFJhd1ZhbHVlKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnkge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICByZXR1cm4gdmFsdWVzW2lkXTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRSYXdWYWx1ZShpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nLCB2YWx1ZTogYW55LCBpc0RpcnR5ID0gdHJ1ZSkge1xuICAgIC8vIGRlYnVnKGBzZXRSYXdWYWx1ZSgke2lkT3JOYW1lfSwgJHtKU09OLnN0cmluZ2lmeShzYWZlTnVtYmVyKHZhbHVlKSl9KWApO1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcywgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgY29uc3QgbmV3VmFsID0gc2FmZU51bWJlcih2YWx1ZSk7XG4gICAgaWYgKG5ld1ZhbCAhPT0gdmFsdWVzW2lkXSB8fCBlcnJvcnNbaWRdKSB7XG4gICAgICB2YWx1ZXNbaWRdID0gbmV3VmFsO1xuICAgICAgZGVsZXRlIGVycm9yc1tpZF07XG4gICAgICB0aGlzLnNldERpcnR5KGlkLCBpc0RpcnR5KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZ2V0RXJyb3IoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskZXJyb3JzXTogZXJyb3JzIH0gPSB0aGlzO1xuICAgIHJldHVybiBlcnJvcnNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldEVycm9yKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcsIGVycm9yPzogRXJyb3IpIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgaWYgKGVycm9yICE9IG51bGwpIHtcbiAgICAgIGVycm9yc1tpZF0gPSBlcnJvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGVycm9yc1tpZF07XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGlzRGlydHkoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiAhIWRpcnRpZXNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldERpcnR5KGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIsIGlzRGlydHkgPSB0cnVlKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBudW1iZXJdOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIGlmIChpc0RpcnR5KSB7XG4gICAgICBkaXJ0aWVzW2lkXSA9IHRydWU7XG4gICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgYXV0b3NhdmVcbiAgICAgIC8vIHRoaXMud3JpdGUoaWQpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGRpcnRpZXNbaWRdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAZXZlbnQgSURldmljZSNjaGFuZ2VkXG4gICAgICogQGV2ZW50IElEZXZpY2UjY2hhbmdpbmdcbiAgICAgKi9cbiAgICBjb25zdCBuYW1lcyA9IG1hcFtpZF0gfHwgW107XG4gICAgdGhpcy5lbWl0KFxuICAgICAgaXNEaXJ0eSA/ICdjaGFuZ2luZycgOiAnY2hhbmdlZCcsXG4gICAgICB7XG4gICAgICAgIGlkLFxuICAgICAgICBuYW1lcyxcbiAgICAgIH0sXG4gICAgKTtcbiAgICBpZiAobmFtZXMuaW5jbHVkZXMoJ3Nlcm5vJykgJiYgIWlzRGlydHlcbiAgICAgICYmIHRoaXMuYWRkcmVzcy50eXBlID09PSBBZGRyZXNzVHlwZS5tYWMgJiYgdHlwZW9mIHRoaXMuc2Vybm8gPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2Vybm87XG4gICAgICBjb25zdCBwcmV2QWRkcmVzcyA9IHRoaXMuYWRkcmVzcztcbiAgICAgIGNvbnN0IGFkZHJlc3MgPSBCdWZmZXIuZnJvbSh2YWx1ZS5wYWRTdGFydCgxMiwgJzAnKS5zdWJzdHJpbmcodmFsdWUubGVuZ3RoIC0gMTIpLCAnaGV4Jyk7XG4gICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGRyZXNzJywgd2l0aFZhbHVlKG5ldyBBZGRyZXNzKGFkZHJlc3MpLCBmYWxzZSwgdHJ1ZSkpO1xuICAgICAgZGV2aWNlcy5lbWl0KCdzZXJubycsIHByZXZBZGRyZXNzLCB0aGlzLmFkZHJlc3MpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhZGRyZWYoKSB7XG4gICAgdGhpcy4kY291bnRSZWYgKz0gMTtcbiAgICBkZWJ1ZygnYWRkcmVmJywgbmV3IEVycm9yKCdhZGRyZWYnKS5zdGFjayk7XG4gICAgcmV0dXJuIHRoaXMuJGNvdW50UmVmO1xuICB9XG5cbiAgcHVibGljIHJlbGVhc2UoKSB7XG4gICAgdGhpcy4kY291bnRSZWYgLT0gMTtcbiAgICBpZiAodGhpcy4kY291bnRSZWYgPD0gMCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5hZGRyZXNzLnRvU3RyaW5nKCk7XG4gICAgICBkZXZpY2VNYXBba2V5XSA9IF8ud2l0aG91dChkZXZpY2VNYXBba2V5XSwgdGhpcyk7XG4gICAgICBpZiAoZGV2aWNlTWFwW2tleV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBkZXZpY2VNYXBba2V5XTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQGV2ZW50IERldmljZXMjZGVsZXRlXG4gICAgICAgKi9cbiAgICAgIGRldmljZXMuZW1pdCgnZGVsZXRlJywgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiRjb3VudFJlZjtcbiAgfVxuXG4gIHB1YmxpYyBkcmFpbigpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgZGVidWcoYGRyYWluIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKGRpcnRpZXMpLm1hcChOdW1iZXIpLmZpbHRlcihpZCA9PiBkaXJ0aWVzW2lkXSk7XG4gICAgcmV0dXJuIGlkcy5sZW5ndGggPiAwID8gdGhpcy53cml0ZSguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxuXG4gIHByaXZhdGUgd3JpdGVBbGwoKSB7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCBpZHMgPSBPYmplY3QuZW50cmllcyh2YWx1ZXMpXG4gICAgICAuZmlsdGVyKChbLCB2YWx1ZV0pID0+IHZhbHVlICE9IG51bGwpXG4gICAgICAubWFwKChbaWRdKSA9PiBOdW1iZXIoaWQpKVxuICAgICAgLmZpbHRlcigoaWQgPT4gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaXNXcml0YWJsZScsIHRoaXMsIG1hcFtpZF1bMF0pKSk7XG4gICAgcmV0dXJuIGlkcy5sZW5ndGggPiAwID8gdGhpcy53cml0ZSguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxuXG4gIHB1YmxpYyB3cml0ZSguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTxudW1iZXJbXT4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbiB9ID0gdGhpcztcbiAgICBpZiAoIWNvbm5lY3Rpb24pIHJldHVybiBQcm9taXNlLnJlamVjdChgJHt0aGlzLmFkZHJlc3N9IGlzIGRpc2Nvbm5lY3RlZGApO1xuICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy53cml0ZUFsbCgpO1xuICAgIH1cbiAgICBkZWJ1Zyhgd3JpdGluZyAke2lkcy5qb2luKCl9IHRvIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgaW52YWxpZE5tczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCByZXF1ZXN0cyA9IGlkcy5yZWR1Y2UoXG4gICAgICAoYWNjOiBObXNEYXRhZ3JhbVtdLCBpZCkgPT4ge1xuICAgICAgICBjb25zdCBbbmFtZV0gPSBtYXBbaWRdO1xuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICBkZWJ1ZyhgVW5rbm93biBpZDogJHtpZH0gZm9yICR7UmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgdGhpcyl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFjYy5wdXNoKGNyZWF0ZU5tc1dyaXRlKFxuICAgICAgICAgICAgICB0aGlzLmFkZHJlc3MsXG4gICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICBSZWZsZWN0LmdldE1ldGFkYXRhKCdubXNUeXBlJywgdGhpcywgbmFtZSksXG4gICAgICAgICAgICAgIHRoaXMuZ2V0UmF3VmFsdWUoaWQpLFxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igd2hpbGUgY3JlYXRlIE5NUyBkYXRhZ3JhbScsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICBpbnZhbGlkTm1zLnB1c2goLWlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sXG4gICAgICBbXSxcbiAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgIHJlcXVlc3RzXG4gICAgICAgIC5tYXAoZGF0YWdyYW0gPT4gY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oZGF0YWdyYW0pXG4gICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW07XG4gICAgICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XG4gICAgICAgICAgICAgIHRoaXMuc2V0RGlydHkoZGF0YWdyYW0uaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGFncmFtLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZXRFcnJvcihkYXRhZ3JhbS5pZCwgbmV3IE5pYnVzRXJyb3Ioc3RhdHVzISwgdGhpcykpO1xuICAgICAgICAgICAgcmV0dXJuIC1kYXRhZ3JhbS5pZDtcbiAgICAgICAgICB9LCAocmVhc29uKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEVycm9yKGRhdGFncmFtLmlkLCByZWFzb24pO1xuICAgICAgICAgICAgcmV0dXJuIC1kYXRhZ3JhbS5pZDtcbiAgICAgICAgICB9KSkpXG4gICAgICAudGhlbihpZHMgPT4gaWRzLmNvbmNhdChpbnZhbGlkTm1zKSk7XG4gIH1cblxuICBwdWJsaWMgd3JpdGVWYWx1ZXMoc291cmNlOiBvYmplY3QsIHN0cm9uZyA9IHRydWUpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKHNvdXJjZSkubWFwKG5hbWUgPT4gdGhpcy5nZXRJZChuYW1lKSk7XG4gICAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ3ZhbHVlIGlzIGVtcHR5JykpO1xuICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBzb3VyY2UpO1xuICAgICAgcmV0dXJuIHRoaXMud3JpdGUoLi4uaWRzKVxuICAgICAgICAudGhlbigod3JpdHRlbikgPT4ge1xuICAgICAgICAgIGlmICh3cml0dGVuLmxlbmd0aCA9PT0gMCB8fCAoc3Ryb25nICYmIHdyaXR0ZW4ubGVuZ3RoICE9PSBpZHMubGVuZ3RoKSkge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5nZXRFcnJvcihpZHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gd3JpdHRlbjtcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlYWRBbGwoKTogUHJvbWlzZTxhbnk+IHtcbiAgICBpZiAodGhpcy4kcmVhZCkgcmV0dXJuIHRoaXMuJHJlYWQ7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogc3RyaW5nXTogc3RyaW5nW10gfSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5lbnRyaWVzKG1hcClcbiAgICAgIC5maWx0ZXIoKFssIG5hbWVzXSkgPT4gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaXNSZWFkYWJsZScsIHRoaXMsIG5hbWVzWzBdKSlcbiAgICAgIC5tYXAoKFtpZF0pID0+IE51bWJlcihpZCkpXG4gICAgICAuc29ydCgpO1xuICAgIHRoaXMuJHJlYWQgPSBpZHMubGVuZ3RoID4gMCA/IHRoaXMucmVhZCguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgICBjb25zdCBjbGVhciA9ICgpID0+IGRlbGV0ZSB0aGlzLiRyZWFkO1xuICAgIHJldHVybiB0aGlzLiRyZWFkLmZpbmFsbHkoY2xlYXIpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlYWQoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8eyBbbmFtZTogc3RyaW5nXTogYW55IH0+IHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy5yZWFkQWxsKCk7XG4gICAgLy8gZGVidWcoYHJlYWQgJHtpZHMuam9pbigpfSBmcm9tIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgZGlzYWJsZUJhdGNoUmVhZGluZyA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2Rpc2FibGVCYXRjaFJlYWRpbmcnLCB0aGlzKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgY2h1bmtzID0gY2h1bmtBcnJheShpZHMsIGRpc2FibGVCYXRjaFJlYWRpbmcgPyAxIDogMjEpO1xuICAgIGRlYnVnKGByZWFkIFske2NodW5rcy5tYXAoY2h1bmsgPT4gYFske2NodW5rLmpvaW4oKX1dYCkuam9pbigpfV0gZnJvbSBbJHt0aGlzLmFkZHJlc3N9XWApO1xuICAgIGNvbnN0IHJlcXVlc3RzID0gY2h1bmtzLm1hcChjaHVuayA9PiBjcmVhdGVObXNSZWFkKHRoaXMuYWRkcmVzcywgLi4uY2h1bmspKTtcbiAgICByZXR1cm4gcmVxdWVzdHMucmVkdWNlKFxuICAgICAgYXN5bmMgKHByb21pc2UsIGRhdGFncmFtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oZGF0YWdyYW0pO1xuICAgICAgICBjb25zdCBkYXRhZ3JhbXM6IE5tc0RhdGFncmFtW10gPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlKVxuICAgICAgICAgID8gcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW1bXVxuICAgICAgICAgIDogW3Jlc3BvbnNlIGFzIE5tc0RhdGFncmFtXTtcbiAgICAgICAgZGF0YWdyYW1zLmZvckVhY2goKHsgaWQsIHZhbHVlLCBzdGF0dXMgfSkgPT4ge1xuICAgICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UmF3VmFsdWUoaWQsIHZhbHVlLCBmYWxzZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RXJyb3IoaWQsIG5ldyBOaWJ1c0Vycm9yKHN0YXR1cyEsIHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbmFtZXMgPSBtYXBbaWRdO1xuICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KG5hbWVzICYmIG5hbWVzLmxlbmd0aCA+IDAsIGBJbnZhbGlkIGlkICR7aWR9YCk7XG4gICAgICAgICAgbmFtZXMuZm9yRWFjaCgocHJvcE5hbWUpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdFtwcm9wTmFtZV0gPSBzdGF0dXMgPT09IDBcbiAgICAgICAgICAgICAgPyB0aGlzW3Byb3BOYW1lXVxuICAgICAgICAgICAgICA6IHsgZXJyb3I6ICh0aGlzLmdldEVycm9yKGlkKSB8fCB7fSkubWVzc2FnZSB8fCAnZXJyb3InIH07XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSxcbiAgICAgIFByb21pc2UucmVzb2x2ZSh7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBhbnkgfSksXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZChkb21haW46IHN0cmluZywgb2Zmc2V0ID0gMCwgc2l6ZT86IG51bWJlcik6IFByb21pc2U8QnVmZmVyPiB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWNvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignZGlzY29ubmVjdGVkJyk7XG4gICAgICBjb25zdCByZXFVcGxvYWQgPSBjcmVhdGVObXNSZXF1ZXN0RG9tYWluVXBsb2FkKHRoaXMuYWRkcmVzcywgZG9tYWluLnBhZEVuZCg4LCAnXFwwJykpO1xuICAgICAgY29uc3QgeyBpZCwgdmFsdWU6IGRvbWFpblNpemUsIHN0YXR1cyB9ID1cbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxVXBsb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChzdGF0dXMgIT09IDApIHtcbiAgICAgICAgLy8gZGVidWcoJzxlcnJvcj4nLCBzdGF0dXMpO1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzLCAnUmVxdWVzdCB1cGxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpbml0VXBsb2FkID0gY3JlYXRlTm1zSW5pdGlhdGVVcGxvYWRTZXF1ZW5jZSh0aGlzLmFkZHJlc3MsIGlkKTtcbiAgICAgIGNvbnN0IHsgc3RhdHVzOiBpbml0U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oaW5pdFVwbG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICBpZiAoaW5pdFN0YXQgIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoaW5pdFN0YXQhLCB0aGlzLCAnSW5pdGlhdGUgdXBsb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgICAgfVxuICAgICAgY29uc3QgdG90YWwgPSBzaXplIHx8IChkb21haW5TaXplIC0gb2Zmc2V0KTtcbiAgICAgIGxldCByZXN0ID0gdG90YWw7XG4gICAgICBsZXQgcG9zID0gb2Zmc2V0O1xuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAndXBsb2FkU3RhcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZG9tYWluLFxuICAgICAgICAgIGRvbWFpblNpemUsXG4gICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgIHNpemU6IHRvdGFsLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIGNvbnN0IGJ1ZnM6IEJ1ZmZlcltdID0gW107XG4gICAgICB3aGlsZSAocmVzdCA+IDApIHtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gTWF0aC5taW4oMjU1LCByZXN0KTtcbiAgICAgICAgY29uc3QgdXBsb2FkU2VnbWVudCA9IGNyZWF0ZU5tc1VwbG9hZFNlZ21lbnQodGhpcy5hZGRyZXNzLCBpZCwgcG9zLCBsZW5ndGgpO1xuICAgICAgICBjb25zdCB7IHN0YXR1czogdXBsb2FkU3RhdHVzLCB2YWx1ZTogcmVzdWx0IH0gPVxuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHVwbG9hZFNlZ21lbnQpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgICBpZiAodXBsb2FkU3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IodXBsb2FkU3RhdHVzISwgdGhpcywgJ1VwbG9hZCBzZWdtZW50IGVycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJ1ZnMucHVzaChyZXN1bHQuZGF0YSk7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAndXBsb2FkRGF0YScsXG4gICAgICAgICAge1xuICAgICAgICAgICAgZG9tYWluLFxuICAgICAgICAgICAgcG9zLFxuICAgICAgICAgICAgZGF0YTogcmVzdWx0LmRhdGEsXG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcbiAgICAgICAgcmVzdCAtPSByZXN1bHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIHBvcyArPSByZXN1bHQuZGF0YS5sZW5ndGg7XG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBCdWZmZXIuY29uY2F0KGJ1ZnMpO1xuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAndXBsb2FkRmluaXNoJyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgZGF0YTogcmVzdWx0LFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5lbWl0KCd1cGxvYWRFcnJvcicsIGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkb3dubG9hZChkb21haW46IHN0cmluZywgYnVmZmVyOiBCdWZmZXIsIG9mZnNldCA9IDAsIG5vVGVybSA9IGZhbHNlKSB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0ZWQnKTtcbiAgICBjb25zdCByZXFEb3dubG9hZCA9IGNyZWF0ZU5tc1JlcXVlc3REb21haW5Eb3dubG9hZCh0aGlzLmFkZHJlc3MsIGRvbWFpbi5wYWRFbmQoOCwgJ1xcMCcpKTtcbiAgICBjb25zdCB7IGlkLCB2YWx1ZTogbWF4LCBzdGF0dXMgfSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHJlcURvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAoc3RhdHVzICE9PSAwKSB7XG4gICAgICAvLyBkZWJ1ZygnPGVycm9yPicsIHN0YXR1cyk7XG4gICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzLCAnUmVxdWVzdCBkb3dubG9hZCBkb21haW4gZXJyb3InKTtcbiAgICB9XG4gICAgY29uc3QgdGVybWluYXRlID0gYXN5bmMgKGVycj86IEVycm9yKSA9PiB7XG4gICAgICBsZXQgdGVybVN0YXQgPSAwO1xuICAgICAgaWYgKCFub1Rlcm0pIHtcbiAgICAgICAgY29uc3QgcmVxID0gY3JlYXRlTm1zVGVybWluYXRlRG93bmxvYWRTZXF1ZW5jZSh0aGlzLmFkZHJlc3MsIGlkKTtcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgICAgdGVybVN0YXQgPSByZXMuc3RhdHVzITtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIGlmICh0ZXJtU3RhdCAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihcbiAgICAgICAgICB0ZXJtU3RhdCEsXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAnVGVybWluYXRlIGRvd25sb2FkIHNlcXVlbmNlIGVycm9yLCBtYXliZSBuZWVkIC0tbm8tdGVybScsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA+IG1heCAtIG9mZnNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBCdWZmZXIgdG9vIGxhcmdlLiBFeHBlY3RlZCAke21heCAtIG9mZnNldH0gYnl0ZXNgKTtcbiAgICB9XG4gICAgY29uc3QgaW5pdERvd25sb2FkID0gY3JlYXRlTm1zSW5pdGlhdGVEb3dubG9hZFNlcXVlbmNlKHRoaXMuYWRkcmVzcywgaWQpO1xuICAgIGNvbnN0IHsgc3RhdHVzOiBpbml0U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oaW5pdERvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAoaW5pdFN0YXQgIT09IDApIHtcbiAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKGluaXRTdGF0ISwgdGhpcywgJ0luaXRpYXRlIGRvd25sb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoXG4gICAgICAnZG93bmxvYWRTdGFydCcsXG4gICAgICB7XG4gICAgICAgIGRvbWFpbixcbiAgICAgICAgb2Zmc2V0LFxuICAgICAgICBkb21haW5TaXplOiBtYXgsXG4gICAgICAgIHNpemU6IGJ1ZmZlci5sZW5ndGgsXG4gICAgICB9LFxuICAgICk7XG4gICAgY29uc3QgY3JjID0gY3JjMTZjY2l0dChidWZmZXIsIDApO1xuICAgIGNvbnN0IGNodW5rU2l6ZSA9IE5NU19NQVhfREFUQV9MRU5HVEggLSA0O1xuICAgIGNvbnN0IGNodW5rcyA9IGNodW5rQXJyYXkoYnVmZmVyLCBjaHVua1NpemUpO1xuICAgIGF3YWl0IGNodW5rcy5yZWR1Y2UoYXN5bmMgKHByZXYsIGNodW5rOiBCdWZmZXIsIGkpID0+IHtcbiAgICAgIGF3YWl0IHByZXY7XG4gICAgICBjb25zdCBwb3MgPSBpICogY2h1bmtTaXplICsgb2Zmc2V0O1xuICAgICAgY29uc3Qgc2VnbWVudERvd25sb2FkID1cbiAgICAgICAgY3JlYXRlTm1zRG93bmxvYWRTZWdtZW50KHRoaXMuYWRkcmVzcywgaWQhLCBwb3MsIGNodW5rKTtcbiAgICAgIGNvbnN0IHsgc3RhdHVzOiBkb3dubG9hZFN0YXQgfSA9XG4gICAgICAgIGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHNlZ21lbnREb3dubG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICBpZiAoZG93bmxvYWRTdGF0ICE9PSAwKSB7XG4gICAgICAgIGF3YWl0IHRlcm1pbmF0ZShuZXcgTmlidXNFcnJvcihkb3dubG9hZFN0YXQhLCB0aGlzLCAnRG93bmxvYWQgc2VnbWVudCBlcnJvcicpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2Rvd25sb2FkRGF0YScsXG4gICAgICAgIHtcbiAgICAgICAgICBkb21haW4sXG4gICAgICAgICAgbGVuZ3RoOiBjaHVuay5sZW5ndGgsXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH0sIFByb21pc2UucmVzb2x2ZSgpKTtcbiAgICBjb25zdCB2ZXJpZnkgPSBjcmVhdGVObXNWZXJpZnlEb21haW5DaGVja3N1bSh0aGlzLmFkZHJlc3MsIGlkLCBvZmZzZXQsIGJ1ZmZlci5sZW5ndGgsIGNyYyk7XG4gICAgY29uc3QgeyBzdGF0dXM6IHZlcmlmeVN0YXQgfSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHZlcmlmeSkgYXMgTm1zRGF0YWdyYW07XG4gICAgaWYgKHZlcmlmeVN0YXQgIT09IDApIHtcbiAgICAgIGF3YWl0IHRlcm1pbmF0ZShuZXcgTmlidXNFcnJvcih2ZXJpZnlTdGF0ISwgdGhpcywgJ0Rvd25sb2FkIHNlZ21lbnQgZXJyb3InKSk7XG4gICAgfVxuICAgIGF3YWl0IHRlcm1pbmF0ZSgpO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICdkb3dubG9hZEZpbmlzaCcsXG4gICAgICB7XG4gICAgICAgIGRvbWFpbixcbiAgICAgICAgb2Zmc2V0LFxuICAgICAgICBzaXplOiBidWZmZXIubGVuZ3RoLFxuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgZXhlY3V0ZShwcm9ncmFtOiBzdHJpbmcsIGFyZ3M/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0ZWQnKTtcbiAgICBjb25zdCBzdWJyb3V0aW5lcyA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ3N1YnJvdXRpbmVzJywgdGhpcykgYXMgUmVjb3JkPHN0cmluZywgSVN1YnJvdXRpbmVEZXNjPjtcbiAgICBpZiAoIXN1YnJvdXRpbmVzIHx8ICFSZWZsZWN0LmhhcyhzdWJyb3V0aW5lcywgcHJvZ3JhbSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9ncmFtICR7cHJvZ3JhbX1gKTtcbiAgICB9XG4gICAgY29uc3Qgc3Vicm91dGluZSA9IHN1YnJvdXRpbmVzW3Byb2dyYW1dO1xuICAgIGNvbnN0IHByb3BzOiBUeXBlZFZhbHVlW10gPSBbXTtcbiAgICBpZiAoc3Vicm91dGluZS5hcmdzKSB7XG4gICAgICBPYmplY3QuZW50cmllcyhzdWJyb3V0aW5lLmFyZ3MpLmZvckVhY2goKFtuYW1lLCBkZXNjXSkgPT4ge1xuICAgICAgICBjb25zdCBhcmcgPSBhcmdzICYmIGFyZ3NbbmFtZV07XG4gICAgICAgIGlmICghYXJnKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGFyZyAke25hbWV9IGluIHByb2dyYW0gJHtwcm9ncmFtfWApO1xuICAgICAgICBwcm9wcy5wdXNoKFtkZXNjLnR5cGUsIGFyZ10pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcSA9IGNyZWF0ZUV4ZWN1dGVQcm9ncmFtSW52b2NhdGlvbihcbiAgICAgIHRoaXMuYWRkcmVzcyxcbiAgICAgIHN1YnJvdXRpbmUuaWQsXG4gICAgICBzdWJyb3V0aW5lLm5vdFJlcGx5LFxuICAgICAgLi4ucHJvcHMsXG4gICAgKTtcbiAgICByZXR1cm4gY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxKTtcbiAgfVxufVxuXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcbmludGVyZmFjZSBEZXZpY2VQcm90b3R5cGUge1xuICByZWFkb25seSBpZDogRGV2aWNlSWQ7XG4gIHJlYWRvbmx5IGFkZHJlc3M6IEFkZHJlc3M7XG4gIFttaWJQcm9wZXJ0eTogc3RyaW5nXTogYW55O1xuICAkY291bnRSZWY6IG51bWJlcjtcbiAgJHJlYWQ/OiBQcm9taXNlPGFueT47XG4gIFskdmFsdWVzXTogeyBbaWQ6IG51bWJlcl06IGFueSB9O1xuICBbJGVycm9yc106IHsgW2lkOiBudW1iZXJdOiBFcnJvciB9O1xuICBbJGRpcnRpZXNdOiB7IFtpZDogbnVtYmVyXTogYm9vbGVhbiB9O1xufVxuXG5leHBvcnQgY29uc3QgZ2V0TWliVHlwZXMgPSAoKTogQ29uZmlnWydtaWJUeXBlcyddID0+IHtcbiAgY29uc3QgY29uZiA9IHBhdGgucmVzb2x2ZShjb25maWdEaXIgfHwgJy90bXAnLCAnY29uZmlnc3RvcmUnLCBwa2dOYW1lKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGAke2NvbmZ9Lmpzb25gKSkgcmV0dXJuIHt9O1xuICBjb25zdCB2YWxpZGF0ZSA9IENvbmZpZ1YuZGVjb2RlKEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGAke2NvbmZ9Lmpzb25gKS50b1N0cmluZygpKSk7XG4vLyAgIGNvbnN0IHZhbGlkYXRlID0gQ29uZmlnVi5kZWNvZGUocmVxdWlyZShjb25mKSk7XG4gIGlmICh2YWxpZGF0ZS5pc0xlZnQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZmlsZSAke2NvbmZ9XG4gICR7UGF0aFJlcG9ydGVyLnJlcG9ydCh2YWxpZGF0ZSl9YCk7XG4gIH1cbiAgY29uc3QgeyBtaWJUeXBlcyB9ID0gdmFsaWRhdGUudmFsdWU7XG4gIHJldHVybiBtaWJUeXBlcztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWliQnlUeXBlKHR5cGU6IG51bWJlciwgdmVyc2lvbj86IG51bWJlcik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IG1pYlR5cGVzID0gZ2V0TWliVHlwZXMoKTtcbiAgY29uc3QgbWlicyA9IG1pYlR5cGVzIVt0eXBlXTtcbiAgaWYgKG1pYnMgJiYgbWlicy5sZW5ndGgpIHtcbiAgICBsZXQgbWliVHlwZSA9IG1pYnNbMF07XG4gICAgaWYgKHZlcnNpb24gJiYgbWlicy5sZW5ndGggPiAxKSB7XG4gICAgICBtaWJUeXBlID0gXy5maW5kTGFzdChtaWJzLCAoeyBtaW5WZXJzaW9uID0gMCB9KSA9PiBtaW5WZXJzaW9uIDw9IHZlcnNpb24pIHx8IG1pYlR5cGU7XG4gICAgfVxuICAgIHJldHVybiBtaWJUeXBlLm1pYjtcbiAgfVxuICAvLyBjb25zdCBjYWNoZU1pYnMgPSBPYmplY3Qua2V5cyhtaWJUeXBlc0NhY2hlKTtcbiAgLy8gY29uc3QgY2FjaGVkID0gY2FjaGVNaWJzLmZpbmQobWliID0+XG4gIC8vICAgUmVmbGVjdC5nZXRNZXRhZGF0YSgnZGV2aWNlVHlwZScsIG1pYlR5cGVzQ2FjaGVbbWliXS5wcm90b3R5cGUpID09PSB0eXBlKTtcbiAgLy8gaWYgKGNhY2hlZCkgcmV0dXJuIGNhY2hlZDtcbiAgLy8gY29uc3QgbWlicyA9IGdldE1pYnNTeW5jKCk7XG4gIC8vIHJldHVybiBfLmRpZmZlcmVuY2UobWlicywgY2FjaGVNaWJzKS5maW5kKChtaWJOYW1lKSA9PiB7XG4gIC8vICAgY29uc3QgbWliZmlsZSA9IGdldE1pYkZpbGUobWliTmFtZSk7XG4gIC8vICAgY29uc3QgbWliOiBJTWliRGV2aWNlID0gcmVxdWlyZShtaWJmaWxlKTtcbiAgLy8gICBjb25zdCB7IHR5cGVzIH0gPSBtaWI7XG4gIC8vICAgY29uc3QgZGV2aWNlID0gdHlwZXNbbWliLmRldmljZV0gYXMgSU1pYkRldmljZVR5cGU7XG4gIC8vICAgcmV0dXJuIHRvSW50KGRldmljZS5hcHBpbmZvLmRldmljZV90eXBlKSA9PT0gdHlwZTtcbiAgLy8gfSk7XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBEZXZpY2VzIHtcbiAgb24oZXZlbnQ6ICduZXcnIHwgJ2RlbGV0ZScsIGRldmljZUxpc3RlbmVyOiAoZGV2aWNlOiBJRGV2aWNlKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAocHJldkFkZHJlc3M6IEFkZHJlc3MsIG5ld0FkZHJlc3M6IEFkZHJlc3MpID0+IHZvaWQpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG59XG5cbmZ1bmN0aW9uIGdldENvbnN0cnVjdG9yKG1pYjogc3RyaW5nKTogRnVuY3Rpb24ge1xuICBsZXQgY29uc3RydWN0b3IgPSBtaWJUeXBlc0NhY2hlW21pYl07XG4gIGlmICghY29uc3RydWN0b3IpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcbiAgICBmdW5jdGlvbiBEZXZpY2UodGhpczogRGV2aWNlUHJvdG90eXBlLCBhZGRyZXNzOiBBZGRyZXNzKSB7XG4gICAgICBFdmVudEVtaXR0ZXIuYXBwbHkodGhpcyk7XG4gICAgICB0aGlzWyR2YWx1ZXNdID0ge307XG4gICAgICB0aGlzWyRlcnJvcnNdID0ge307XG4gICAgICB0aGlzWyRkaXJ0aWVzXSA9IHt9O1xuICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYWRkcmVzcycsIHdpdGhWYWx1ZShhZGRyZXNzLCBmYWxzZSwgdHJ1ZSkpO1xuICAgICAgdGhpcy4kY291bnRSZWYgPSAxO1xuICAgICAgKHRoaXMgYXMgYW55KS5pZCA9IHRpbWVpZCgpIGFzIERldmljZUlkO1xuICAgICAgLy8gZGVidWcobmV3IEVycm9yKCdDUkVBVEUnKS5zdGFjayk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvdG90eXBlID0gbmV3IERldmljZVByb3RvdHlwZShtaWIpO1xuICAgIERldmljZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgKERldmljZSBhcyBhbnkpLmRpc3BsYXlOYW1lID0gYCR7bWliWzBdLnRvVXBwZXJDYXNlKCl9JHttaWIuc2xpY2UoMSl9YDtcbiAgICBjb25zdHJ1Y3RvciA9IERldmljZTtcbiAgICBtaWJUeXBlc0NhY2hlW21pYl0gPSBjb25zdHJ1Y3RvcjtcbiAgfVxuICByZXR1cm4gY29uc3RydWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNaWJQcm90b3R5cGUobWliOiBzdHJpbmcpOiBPYmplY3Qge1xuICByZXR1cm4gZ2V0Q29uc3RydWN0b3IobWliKS5wcm90b3R5cGU7XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZpY2VzIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgZ2V0ID0gKCk6IElEZXZpY2VbXSA9PiBfLmZsYXR0ZW4oXy52YWx1ZXMoZGV2aWNlTWFwKSk7XG5cbiAgZmluZCA9IChhZGRyZXNzOiBBZGRyZXNzUGFyYW0pOiBJRGV2aWNlW10gfCB1bmRlZmluZWQgPT4ge1xuICAgIGNvbnN0IHRhcmdldEFkZHJlc3MgPSBuZXcgQWRkcmVzcyhhZGRyZXNzKTtcbiAgICByZXR1cm4gZGV2aWNlTWFwW3RhcmdldEFkZHJlc3MudG9TdHJpbmcoKV07XG4gIH07XG5cbiAgY3JlYXRlKGFkZHJlc3M6IEFkZHJlc3NQYXJhbSwgbWliOiBzdHJpbmcpOiBJRGV2aWNlO1xuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCB0eXBlOiBudW1iZXIsIHZlcnNpb24/OiBudW1iZXIpOiBJRGV2aWNlO1xuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCBtaWJPclR5cGU6IGFueSwgdmVyc2lvbj86IG51bWJlcik6IElEZXZpY2Uge1xuICAgIGxldCBtaWI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZW9mIG1pYk9yVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIG1pYiA9IGZpbmRNaWJCeVR5cGUobWliT3JUeXBlLCB2ZXJzaW9uKTtcbiAgICAgIGlmIChtaWIgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG1pYiB0eXBlJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWliT3JUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgbWliID0gU3RyaW5nKG1pYk9yVHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWliIG9yIHR5cGUgZXhwZWN0ZWQsIGdvdCAke21pYk9yVHlwZX1gKTtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0QWRkcmVzcyA9IG5ldyBBZGRyZXNzKGFkZHJlc3MpO1xuICAgIC8vIGxldCBkZXZpY2UgPSBkZXZpY2VNYXBbdGFyZ2V0QWRkcmVzcy50b1N0cmluZygpXTtcbiAgICAvLyBpZiAoZGV2aWNlKSB7XG4gICAgLy8gICBjb25zb2xlLmFzc2VydChcbiAgICAvLyAgICAgUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgZGV2aWNlKSA9PT0gbWliLFxuICAgIC8vICAgICBgbWlicyBhcmUgZGlmZmVyZW50LCBleHBlY3RlZCAke21pYn1gLFxuICAgIC8vICAgKTtcbiAgICAvLyAgIGRldmljZS5hZGRyZWYoKTtcbiAgICAvLyAgIHJldHVybiBkZXZpY2U7XG4gICAgLy8gfVxuXG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBnZXRDb25zdHJ1Y3RvcihtaWIpO1xuICAgIGNvbnN0IGRldmljZTogSURldmljZSA9IFJlZmxlY3QuY29uc3RydWN0KGNvbnN0cnVjdG9yLCBbdGFyZ2V0QWRkcmVzc10pO1xuICAgIGlmICghdGFyZ2V0QWRkcmVzcy5pc0VtcHR5KSB7XG4gICAgICBjb25zdCBrZXkgPSB0YXJnZXRBZGRyZXNzLnRvU3RyaW5nKCk7XG4gICAgICBkZXZpY2VNYXBba2V5XSA9IChkZXZpY2VNYXBba2V5XSB8fCBbXSkuY29uY2F0KGRldmljZSk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHRoaXMuZW1pdCgnbmV3JywgZGV2aWNlKSk7XG4gICAgfVxuICAgIHJldHVybiBkZXZpY2U7XG4gIH1cbn1cblxuY29uc3QgZGV2aWNlcyA9IG5ldyBEZXZpY2VzKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGRldmljZXM7XG4iXX0=