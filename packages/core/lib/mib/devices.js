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
    console.log('uSE PERCENT 100<->250');
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
      throw new Error(`Buffer to large. Expected ${max - offset} bytes`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taWIvZGV2aWNlcy50cyJdLCJuYW1lcyI6WyJwa2dOYW1lIiwiZGVidWciLCIkdmFsdWVzIiwiU3ltYm9sIiwiJGVycm9ycyIsIiRkaXJ0aWVzIiwic2FmZU51bWJlciIsInZhbCIsIm51bSIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsIlByaXZhdGVQcm9wcyIsImRldmljZU1hcCIsIm1pYlR5cGVzQ2FjaGUiLCJNaWJQcm9wZXJ0eUFwcEluZm9WIiwidCIsImludGVyc2VjdGlvbiIsInR5cGUiLCJubXNfaWQiLCJ1bmlvbiIsInN0cmluZyIsIkludCIsImFjY2VzcyIsInBhcnRpYWwiLCJjYXRlZ29yeSIsIk1pYlByb3BlcnR5ViIsImFubm90YXRpb24iLCJhcHBpbmZvIiwiTWliRGV2aWNlQXBwSW5mb1YiLCJtaWJfdmVyc2lvbiIsImRldmljZV90eXBlIiwibG9hZGVyX3R5cGUiLCJmaXJtd2FyZSIsIm1pbl92ZXJzaW9uIiwiTWliRGV2aWNlVHlwZVYiLCJwcm9wZXJ0aWVzIiwicmVjb3JkIiwiTWliVHlwZVYiLCJiYXNlIiwiemVybyIsInVuaXRzIiwicHJlY2lzaW9uIiwicmVwcmVzZW50YXRpb24iLCJnZXQiLCJzZXQiLCJtaW5JbmNsdXNpdmUiLCJtYXhJbmNsdXNpdmUiLCJlbnVtZXJhdGlvbiIsIk1pYlN1YnJvdXRpbmVWIiwicmVzcG9uc2UiLCJTdWJyb3V0aW5lVHlwZVYiLCJpZCIsImxpdGVyYWwiLCJNaWJEZXZpY2VWIiwiZGV2aWNlIiwidHlwZXMiLCJzdWJyb3V0aW5lcyIsImdldEJhc2VUeXBlIiwic3VwZXJUeXBlIiwiZGVmaW5lTWliUHJvcGVydHkiLCJ0YXJnZXQiLCJrZXkiLCJwcm9wIiwicHJvcGVydHlLZXkiLCJSZWZsZWN0IiwiZGVmaW5lTWV0YWRhdGEiLCJzaW1wbGVUeXBlIiwiY29udmVydGVycyIsImlzUmVhZGFibGUiLCJpbmRleE9mIiwiaXNXcml0YWJsZSIsIm1pbiIsIm1heCIsIk5tc1ZhbHVlVHlwZSIsIkludDgiLCJJbnQxNiIsIkludDMyIiwiVUludDgiLCJVSW50MTYiLCJVSW50MzIiLCJwdXNoIiwiZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIiLCJjb25zb2xlIiwibG9nIiwicGVyY2VudENvbnZlcnRlciIsInVuZGVmaW5lZCIsIk1hdGgiLCJpbmZvIiwic2l6ZSIsInByZWNpc2lvbkNvbnYiLCJmcm9tIiwidiIsInRvIiwicGFyc2VJbnQiLCJPYmplY3QiLCJlbnRyaWVzIiwibWFwIiwiY29udiIsImEiLCJiIiwibWluRXZhbCIsIm1heEV2YWwiLCJ2ZXJzaW9uVHlwZUNvbnZlcnRlciIsImJvb2xlYW5Db252ZXJ0ZXIiLCJuYW1lIiwiYXR0cmlidXRlcyIsImVudW1lcmFibGUiLCJhc3NlcnQiLCJ2YWx1ZSIsImdldEVycm9yIiwiZ2V0UmF3VmFsdWUiLCJuZXdWYWx1ZSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInNldFJhd1ZhbHVlIiwiZGVmaW5lUHJvcGVydHkiLCJnZXRNaWJGaWxlIiwibWlibmFtZSIsInBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwiRGV2aWNlUHJvdG90eXBlIiwiRXZlbnRFbWl0dGVyIiwiY29uc3RydWN0b3IiLCJtaWJmaWxlIiwibWliVmFsaWRhdGlvbiIsImRlY29kZSIsInBhcnNlIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ0b1N0cmluZyIsImlzTGVmdCIsIlBhdGhSZXBvcnRlciIsInJlcG9ydCIsIm1pYiIsImVycm9yVHlwZSIsIm1ldGFzdWJzIiwiXyIsInRyYW5zZm9ybSIsInJlc3VsdCIsInN1YiIsImRlc2NyaXB0aW9uIiwiYXJncyIsImRlc2MiLCJrZXlzIiwib3duS2V5cyIsInZhbGlkSnNOYW1lIiwiZm9yRWFjaCIsInByb3BOYW1lIiwiY29ubmVjdGlvbiIsInZhbHVlcyIsInByZXYiLCJlbWl0IiwidG9KU09OIiwianNvbiIsImdldE1ldGFkYXRhIiwiYWRkcmVzcyIsImdldElkIiwiaWRPck5hbWUiLCJpc0ludGVnZXIiLCJoYXMiLCJnZXROYW1lIiwiaW5jbHVkZXMiLCJpc0RpcnR5IiwiZXJyb3JzIiwibmV3VmFsIiwic2V0RGlydHkiLCJzZXRFcnJvciIsImVycm9yIiwiZGlydGllcyIsIm5hbWVzIiwiQWRkcmVzc1R5cGUiLCJtYWMiLCJzZXJubyIsInByZXZBZGRyZXNzIiwiQnVmZmVyIiwicGFkU3RhcnQiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJBZGRyZXNzIiwiZGV2aWNlcyIsImFkZHJlZiIsIiRjb3VudFJlZiIsInN0YWNrIiwicmVsZWFzZSIsIndpdGhvdXQiLCJkcmFpbiIsImlkcyIsImZpbHRlciIsIndyaXRlIiwiUHJvbWlzZSIsIndyaXRlQWxsIiwicmVqZWN0Iiwiam9pbiIsImludmFsaWRObXMiLCJyZXF1ZXN0cyIsInJlZHVjZSIsImFjYyIsImUiLCJtZXNzYWdlIiwiYWxsIiwiZGF0YWdyYW0iLCJzZW5kRGF0YWdyYW0iLCJ0aGVuIiwic3RhdHVzIiwiTmlidXNFcnJvciIsInJlYXNvbiIsImNvbmNhdCIsIndyaXRlVmFsdWVzIiwic291cmNlIiwic3Ryb25nIiwiVHlwZUVycm9yIiwiYXNzaWduIiwid3JpdHRlbiIsImVyciIsInJlYWRBbGwiLCIkcmVhZCIsInNvcnQiLCJyZWFkIiwiY2xlYXIiLCJmaW5hbGx5IiwiZGlzYWJsZUJhdGNoUmVhZGluZyIsImNodW5rcyIsImNodW5rIiwicHJvbWlzZSIsImRhdGFncmFtcyIsIkFycmF5IiwiaXNBcnJheSIsInVwbG9hZCIsImRvbWFpbiIsIm9mZnNldCIsInJlcVVwbG9hZCIsInBhZEVuZCIsImRvbWFpblNpemUiLCJpbml0VXBsb2FkIiwiaW5pdFN0YXQiLCJ0b3RhbCIsInJlc3QiLCJwb3MiLCJidWZzIiwidXBsb2FkU2VnbWVudCIsInVwbG9hZFN0YXR1cyIsImRhdGEiLCJkb3dubG9hZCIsImJ1ZmZlciIsIm5vVGVybSIsInJlcURvd25sb2FkIiwidGVybWluYXRlIiwidGVybVN0YXQiLCJyZXEiLCJyZXMiLCJpbml0RG93bmxvYWQiLCJjcmMiLCJjaHVua1NpemUiLCJOTVNfTUFYX0RBVEFfTEVOR1RIIiwiaSIsInNlZ21lbnREb3dubG9hZCIsImRvd25sb2FkU3RhdCIsInZlcmlmeSIsInZlcmlmeVN0YXQiLCJleGVjdXRlIiwicHJvZ3JhbSIsInN1YnJvdXRpbmUiLCJwcm9wcyIsImFyZyIsIm5vdFJlcGx5IiwiZ2V0TWliVHlwZXMiLCJjb25mIiwiY29uZmlnRGlyIiwiZXhpc3RzU3luYyIsInZhbGlkYXRlIiwiQ29uZmlnViIsIm1pYlR5cGVzIiwiZmluZE1pYkJ5VHlwZSIsInZlcnNpb24iLCJtaWJzIiwibWliVHlwZSIsImZpbmRMYXN0IiwibWluVmVyc2lvbiIsImdldENvbnN0cnVjdG9yIiwiRGV2aWNlIiwiYXBwbHkiLCJwcm90b3R5cGUiLCJjcmVhdGUiLCJkaXNwbGF5TmFtZSIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJnZXRNaWJQcm90b3R5cGUiLCJEZXZpY2VzIiwiZmxhdHRlbiIsInRhcmdldEFkZHJlc3MiLCJtaWJPclR5cGUiLCJTdHJpbmciLCJjb25zdHJ1Y3QiLCJpc0VtcHR5IiwicHJvY2VzcyIsIm5leHRUaWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFXQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7QUFnQkE7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBb0JBO0FBQ0E7QUFFQSxNQUFNQSxPQUFPLEdBQUcsZ0JBQWhCLEMsQ0FBa0M7O0FBRWxDLE1BQU1DLEtBQUssR0FBRyxvQkFBYSxlQUFiLENBQWQ7QUFFQSxNQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQyxRQUFELENBQXRCO0FBQ0EsTUFBTUMsT0FBTyxHQUFHRCxNQUFNLENBQUMsUUFBRCxDQUF0QjtBQUNBLE1BQU1FLFFBQVEsR0FBR0YsTUFBTSxDQUFDLFNBQUQsQ0FBdkI7O0FBRUEsU0FBU0csVUFBVCxDQUFvQkMs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QixNQUFNLElBQUkyQixLQUFKLENBQVUsa0JBQVYsQ0FBTjtBQUN4QixLQUhELE1BR08sSUFBSSxPQUFPb0wsU0FBUCxLQUFxQixRQUF6QixFQUFtQztBQUN4QzdKLE1BQUFBLEdBQUcsR0FBRzhKLE1BQU0sQ0FBQ0QsU0FBRCxDQUFaO0FBQ0QsS0FGTSxNQUVBO0FBQ0wsWUFBTSxJQUFJcEwsS0FBSixDQUFXLDZCQUE0Qm9MLFNBQVUsRUFBakQsQ0FBTjtBQUNEOztBQUNELFVBQU1ELGFBQWEsR0FBRyxJQUFJL0csZ0JBQUosQ0FBWXZCLE9BQVosQ0FBdEIsQ0FWdUUsQ0FXdkU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFVBQU1qQyxXQUFXLEdBQUc0SixjQUFjLENBQUNqSixHQUFELENBQWxDO0FBQ0EsVUFBTWpGLE1BQWUsR0FBR1UsT0FBTyxDQUFDc08sU0FBUixDQUFrQjFLLFdBQWxCLEVBQStCLENBQUN1SyxhQUFELENBQS9CLENBQXhCOztBQUNBLFFBQUksQ0FBQ0EsYUFBYSxDQUFDSSxPQUFuQixFQUE0QjtBQUMxQixZQUFNMU8sR0FBRyxHQUFHc08sYUFBYSxDQUFDaEssUUFBZCxFQUFaO0FBQ0F2SCxNQUFBQSxTQUFTLENBQUNpRCxHQUFELENBQVQsR0FBaUIsQ0FBQ2pELFNBQVMsQ0FBQ2lELEdBQUQsQ0FBVCxJQUFrQixFQUFuQixFQUF1Qm1KLE1BQXZCLENBQThCMUosTUFBOUIsQ0FBakI7QUFDQWtQLE1BQUFBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQixNQUFNLEtBQUtoSixJQUFMLENBQVUsS0FBVixFQUFpQm5HLE1BQWpCLENBQXZCO0FBQ0Q7O0FBQ0QsV0FBT0EsTUFBUDtBQUNEOztBQXZDdUM7OztBQTBDMUMsTUFBTStILE9BQU8sR0FBRyxJQUFJNEcsT0FBSixFQUFoQjtlQUVlNUcsTyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IChjKSAyMDE5LiBPT08gTmF0YS1JbmZvXG4gKiBAYXV0aG9yIEFuZHJlaSBTYXJha2VldiA8YXZzQG5hdGEtaW5mby5ydT5cbiAqXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiB0aGUgXCJAbmF0YVwiIHByb2plY3QuXG4gKiBGb3IgdGhlIGZ1bGwgY29weXJpZ2h0IGFuZCBsaWNlbnNlIGluZm9ybWF0aW9uLCBwbGVhc2Ugdmlld1xuICogdGhlIEVVTEEgZmlsZSB0aGF0IHdhcyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgc291cmNlIGNvZGUuXG4gKi9cblxuLyogdHNsaW50OmRpc2FibGU6dmFyaWFibGUtbmFtZSAqL1xuaW1wb3J0IHsgY3JjMTZjY2l0dCB9IGZyb20gJ2NyYyc7XG5pbXBvcnQgZGVidWdGYWN0b3J5IGZyb20gJ2RlYnVnJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgdCBmcm9tICdpby10cyc7XG5pbXBvcnQgeyBQYXRoUmVwb3J0ZXIgfSBmcm9tICdpby10cy9saWIvUGF0aFJlcG9ydGVyJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAncmVmbGVjdC1tZXRhZGF0YSc7XG5pbXBvcnQgeyBjb25maWcgYXMgY29uZmlnRGlyIH0gZnJvbSAneGRnLWJhc2VkaXInO1xuaW1wb3J0IEFkZHJlc3MsIHsgQWRkcmVzc1BhcmFtLCBBZGRyZXNzVHlwZSB9IGZyb20gJy4uL0FkZHJlc3MnO1xuaW1wb3J0IHsgTmlidXNFcnJvciB9IGZyb20gJy4uL2Vycm9ycyc7XG5pbXBvcnQgeyBOTVNfTUFYX0RBVEFfTEVOR1RIIH0gZnJvbSAnLi4vbmJjb25zdCc7XG5pbXBvcnQgeyBOaWJ1c0Nvbm5lY3Rpb24gfSBmcm9tICcuLi9uaWJ1cyc7XG5pbXBvcnQgeyBjaHVua0FycmF5IH0gZnJvbSAnLi4vbmlidXMvaGVscGVyJztcbmltcG9ydCB7XG4gIGNyZWF0ZUV4ZWN1dGVQcm9ncmFtSW52b2NhdGlvbixcbiAgY3JlYXRlTm1zRG93bmxvYWRTZWdtZW50LFxuICBjcmVhdGVObXNJbml0aWF0ZURvd25sb2FkU2VxdWVuY2UsXG4gIGNyZWF0ZU5tc0luaXRpYXRlVXBsb2FkU2VxdWVuY2UsXG4gIGNyZWF0ZU5tc1JlYWQsXG4gIGNyZWF0ZU5tc1JlcXVlc3REb21haW5Eb3dubG9hZCxcbiAgY3JlYXRlTm1zUmVxdWVzdERvbWFpblVwbG9hZCxcbiAgY3JlYXRlTm1zVGVybWluYXRlRG93bmxvYWRTZXF1ZW5jZSxcbiAgY3JlYXRlTm1zVXBsb2FkU2VnbWVudCxcbiAgY3JlYXRlTm1zVmVyaWZ5RG9tYWluQ2hlY2tzdW0sXG4gIGNyZWF0ZU5tc1dyaXRlLFxuICBnZXRObXNUeXBlLFxuICBUeXBlZFZhbHVlLFxufSBmcm9tICcuLi9ubXMnO1xuaW1wb3J0IE5tc0RhdGFncmFtIGZyb20gJy4uL25tcy9ObXNEYXRhZ3JhbSc7XG5pbXBvcnQgTm1zVmFsdWVUeXBlIGZyb20gJy4uL25tcy9ObXNWYWx1ZVR5cGUnO1xuaW1wb3J0IHsgQ29uZmlnLCBDb25maWdWIH0gZnJvbSAnLi4vc2Vzc2lvbi9jb21tb24nO1xuaW1wb3J0IHRpbWVpZCBmcm9tICcuLi90aW1laWQnO1xuaW1wb3J0IHtcbiAgYm9vbGVhbkNvbnZlcnRlcixcbiAgY29udmVydEZyb20sXG4gIGNvbnZlcnRUbyxcbiAgZW51bWVyYXRpb25Db252ZXJ0ZXIsIGV2YWxDb252ZXJ0ZXIsXG4gIGZpeGVkUG9pbnROdW1iZXI0Q29udmVydGVyLFxuICBnZXRJbnRTaXplLFxuICBJQ29udmVydGVyLFxuICBtYXhJbmNsdXNpdmVDb252ZXJ0ZXIsXG4gIG1pbkluY2x1c2l2ZUNvbnZlcnRlcixcbiAgcGFja2VkOGZsb2F0Q29udmVydGVyLFxuICBwZXJjZW50Q29udmVydGVyLFxuICBwcmVjaXNpb25Db252ZXJ0ZXIsXG4gIHJlcHJlc2VudGF0aW9uQ29udmVydGVyLFxuICB0b0ludCxcbiAgdW5pdENvbnZlcnRlcixcbiAgdmFsaWRKc05hbWUsXG4gIHZlcnNpb25UeXBlQ29udmVydGVyLFxuICB3aXRoVmFsdWUsXG59IGZyb20gJy4vbWliJztcbi8vIGltcG9ydCB7IGdldE1pYnNTeW5jIH0gZnJvbSAnLi9taWIyanNvbic7XG4vLyBpbXBvcnQgZGV0ZWN0b3IgZnJvbSAnLi4vc2VydmljZS9kZXRlY3Rvcic7XG5cbmNvbnN0IHBrZ05hbWUgPSAnQG5hdGEvbmlidXMuanMnOyAvLyByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuXG5jb25zdCBkZWJ1ZyA9IGRlYnVnRmFjdG9yeSgnbmlidXM6ZGV2aWNlcycpO1xuXG5jb25zdCAkdmFsdWVzID0gU3ltYm9sKCd2YWx1ZXMnKTtcbmNvbnN0ICRlcnJvcnMgPSBTeW1ib2woJ2Vycm9ycycpO1xuY29uc3QgJGRpcnRpZXMgPSBTeW1ib2woJ2RpcnRpZXMnKTtcblxuZnVuY3Rpb24gc2FmZU51bWJlcih2YWw6IGFueSkge1xuICBjb25zdCBudW0gPSBwYXJzZUZsb2F0KHZhbCk7XG4gIHJldHVybiAoTnVtYmVyLmlzTmFOKG51bSkgfHwgYCR7bnVtfWAgIT09IHZhbCkgPyB2YWwgOiBudW07XG59XG5cbmVudW0gUHJpdmF0ZVByb3BzIHtcbiAgY29ubmVjdGlvbiA9IC0xLFxufVxuXG5jb25zdCBkZXZpY2VNYXA6IHsgW2FkZHJlc3M6IHN0cmluZ106IElEZXZpY2VbXSB9ID0ge307XG5cbmNvbnN0IG1pYlR5cGVzQ2FjaGU6IHsgW21pYm5hbWU6IHN0cmluZ106IEZ1bmN0aW9uIH0gPSB7fTtcblxuY29uc3QgTWliUHJvcGVydHlBcHBJbmZvViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBubXNfaWQ6IHQudW5pb24oW3Quc3RyaW5nLCB0LkludF0pLFxuICAgIGFjY2VzczogdC5zdHJpbmcsXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIGNhdGVnb3J5OiB0LnN0cmluZyxcbiAgfSksXG5dKTtcblxuLy8gaW50ZXJmYWNlIElNaWJQcm9wZXJ0eUFwcEluZm8gZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliUHJvcGVydHlBcHBJbmZvVj4ge31cblxuY29uc3QgTWliUHJvcGVydHlWID0gdC50eXBlKHtcbiAgdHlwZTogdC5zdHJpbmcsXG4gIGFubm90YXRpb246IHQuc3RyaW5nLFxuICBhcHBpbmZvOiBNaWJQcm9wZXJ0eUFwcEluZm9WLFxufSk7XG5cbmludGVyZmFjZSBJTWliUHJvcGVydHkgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliUHJvcGVydHlWPiB7XG4gIC8vIGFwcGluZm86IElNaWJQcm9wZXJ0eUFwcEluZm87XG59XG5cbmNvbnN0IE1pYkRldmljZUFwcEluZm9WID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIG1pYl92ZXJzaW9uOiB0LnN0cmluZyxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgZGV2aWNlX3R5cGU6IHQuc3RyaW5nLFxuICAgIGxvYWRlcl90eXBlOiB0LnN0cmluZyxcbiAgICBmaXJtd2FyZTogdC5zdHJpbmcsXG4gICAgbWluX3ZlcnNpb246IHQuc3RyaW5nLFxuICB9KSxcbl0pO1xuXG5jb25zdCBNaWJEZXZpY2VUeXBlViA9IHQudHlwZSh7XG4gIGFubm90YXRpb246IHQuc3RyaW5nLFxuICBhcHBpbmZvOiBNaWJEZXZpY2VBcHBJbmZvVixcbiAgcHJvcGVydGllczogdC5yZWNvcmQodC5zdHJpbmcsIE1pYlByb3BlcnR5ViksXG59KTtcblxuZXhwb3J0IGludGVyZmFjZSBJTWliRGV2aWNlVHlwZSBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJEZXZpY2VUeXBlVj4ge31cblxuY29uc3QgTWliVHlwZVYgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgYmFzZTogdC5zdHJpbmcsXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIGFwcGluZm86IHQucGFydGlhbCh7XG4gICAgICB6ZXJvOiB0LnN0cmluZyxcbiAgICAgIHVuaXRzOiB0LnN0cmluZyxcbiAgICAgIHByZWNpc2lvbjogdC5zdHJpbmcsXG4gICAgICByZXByZXNlbnRhdGlvbjogdC5zdHJpbmcsXG4gICAgICBnZXQ6IHQuc3RyaW5nLFxuICAgICAgc2V0OiB0LnN0cmluZyxcbiAgICB9KSxcbiAgICBtaW5JbmNsdXNpdmU6IHQuc3RyaW5nLFxuICAgIG1heEluY2x1c2l2ZTogdC5zdHJpbmcsXG4gICAgZW51bWVyYXRpb246IHQucmVjb3JkKHQuc3RyaW5nLCB0LnR5cGUoeyBhbm5vdGF0aW9uOiB0LnN0cmluZyB9KSksXG4gIH0pLFxuXSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSU1pYlR5cGUgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliVHlwZVY+IHt9XG5cbmNvbnN0IE1pYlN1YnJvdXRpbmVWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGFubm90YXRpb246IHQuc3RyaW5nLFxuICAgIGFwcGluZm86IHQuaW50ZXJzZWN0aW9uKFtcbiAgICAgIHQudHlwZSh7IG5tc19pZDogdC51bmlvbihbdC5zdHJpbmcsIHQuSW50XSkgfSksXG4gICAgICB0LnBhcnRpYWwoeyByZXNwb25zZTogdC5zdHJpbmcgfSksXG4gICAgXSksXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIHByb3BlcnRpZXM6IHQucmVjb3JkKHQuc3RyaW5nLCB0LnR5cGUoe1xuICAgICAgdHlwZTogdC5zdHJpbmcsXG4gICAgICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgICB9KSksXG4gIH0pLFxuXSk7XG5cbmNvbnN0IFN1YnJvdXRpbmVUeXBlViA9IHQudHlwZSh7XG4gIGFubm90YXRpb246IHQuc3RyaW5nLFxuICBwcm9wZXJ0aWVzOiB0LnR5cGUoe1xuICAgIGlkOiB0LnR5cGUoe1xuICAgICAgdHlwZTogdC5saXRlcmFsKCd4czp1bnNpZ25lZFNob3J0JyksXG4gICAgICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgICB9KSxcbiAgfSksXG59KTtcblxuZXhwb3J0IGNvbnN0IE1pYkRldmljZVYgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgZGV2aWNlOiB0LnN0cmluZyxcbiAgICB0eXBlczogdC5yZWNvcmQodC5zdHJpbmcsIHQudW5pb24oW01pYkRldmljZVR5cGVWLCBNaWJUeXBlViwgU3Vicm91dGluZVR5cGVWXSkpLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBzdWJyb3V0aW5lczogdC5yZWNvcmQodC5zdHJpbmcsIE1pYlN1YnJvdXRpbmVWKSxcbiAgfSksXG5dKTtcblxuaW50ZXJmYWNlIElNaWJEZXZpY2UgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliRGV2aWNlVj4ge31cblxudHlwZSBMaXN0ZW5lcjxUPiA9IChhcmc6IFQpID0+IHZvaWQ7XG50eXBlIENoYW5nZUFyZyA9IHsgaWQ6IG51bWJlciwgbmFtZXM6IHN0cmluZ1tdIH07XG5leHBvcnQgdHlwZSBDaGFuZ2VMaXN0ZW5lciA9IExpc3RlbmVyPENoYW5nZUFyZz47XG50eXBlIFVwbG9hZFN0YXJ0QXJnID0geyBkb21haW46IHN0cmluZywgZG9tYWluU2l6ZTogbnVtYmVyLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBVcGxvYWRTdGFydExpc3RlbmVyID0gTGlzdGVuZXI8VXBsb2FkU3RhcnRBcmc+O1xudHlwZSBVcGxvYWREYXRhQXJnID0geyBkb21haW46IHN0cmluZywgZGF0YTogQnVmZmVyLCBwb3M6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgVXBsb2FkRGF0YUxpc3RlbmVyID0gTGlzdGVuZXI8VXBsb2FkRGF0YUFyZz47XG50eXBlIFVwbG9hZEZpbmlzaEFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIG9mZnNldDogbnVtYmVyLCBkYXRhOiBCdWZmZXIgfTtcbmV4cG9ydCB0eXBlIFVwbG9hZEZpbmlzaExpc3RlbmVyID0gTGlzdGVuZXI8VXBsb2FkRmluaXNoQXJnPjtcbnR5cGUgRG93bmxvYWRTdGFydEFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGRvbWFpblNpemU6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgRG93bmxvYWRTdGFydExpc3RlbmVyID0gTGlzdGVuZXI8RG93bmxvYWRTdGFydEFyZz47XG50eXBlIERvd25sb2FkRGF0YUFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBEb3dubG9hZERhdGFMaXN0ZW5lciA9IExpc3RlbmVyPERvd25sb2FkRGF0YUFyZz47XG50eXBlIERvd25sb2FkRmluaXNoQXJnID0geyBkb21haW46IHN0cmluZzsgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgRG93bmxvYWRGaW5pc2hMaXN0ZW5lciA9IExpc3RlbmVyPERvd25sb2FkRmluaXNoQXJnPjtcbmV4cG9ydCB0eXBlIERldmljZUlkID0gc3RyaW5nICYgeyBfX2JyYW5kOiAnRGV2aWNlSWQnIH07XG5cbmV4cG9ydCBpbnRlcmZhY2UgSURldmljZSB7XG4gIHJlYWRvbmx5IGlkOiBEZXZpY2VJZDtcbiAgcmVhZG9ubHkgYWRkcmVzczogQWRkcmVzcztcbiAgZHJhaW4oKTogUHJvbWlzZTxudW1iZXJbXT47XG4gIHdyaXRlKC4uLmlkczogbnVtYmVyW10pOiBQcm9taXNlPG51bWJlcltdPjtcbiAgcmVhZCguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTx7IFtuYW1lOiBzdHJpbmddOiBhbnkgfT47XG4gIHVwbG9hZChkb21haW46IHN0cmluZywgb2Zmc2V0PzogbnVtYmVyLCBzaXplPzogbnVtYmVyKTogUHJvbWlzZTxCdWZmZXI+O1xuICBkb3dubG9hZChkb21haW46IHN0cmluZywgZGF0YTogQnVmZmVyLCBvZmZzZXQ/OiBudW1iZXIsIG5vVGVybT86IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+O1xuICBleGVjdXRlKFxuICAgIHByb2dyYW06IHN0cmluZyxcbiAgICBhcmdzPzogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8Tm1zRGF0YWdyYW0gfCBObXNEYXRhZ3JhbVtdIHwgdW5kZWZpbmVkPjtcbiAgY29ubmVjdGlvbj86IE5pYnVzQ29ubmVjdGlvbjtcbiAgcmVsZWFzZSgpOiBudW1iZXI7XG4gIGdldElkKGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBudW1iZXI7XG4gIGdldE5hbWUoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IHN0cmluZztcbiAgZ2V0UmF3VmFsdWUoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueTtcbiAgZ2V0RXJyb3IoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueTtcbiAgaXNEaXJ0eShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogYm9vbGVhbjtcbiAgW21pYlByb3BlcnR5OiBzdHJpbmddOiBhbnk7XG5cbiAgb24oZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gb24oZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgb24oZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgb25jZShldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyBvbmNlKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gYWRkTGlzdGVuZXIoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgb2ZmKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIG9mZihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgZW1pdChldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJyk6IGJvb2xlYW47XG4gIC8vIGVtaXQoZXZlbnQ6ICdzZXJubycpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBhcmc6IENoYW5nZUFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGFyZzogVXBsb2FkU3RhcnRBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAndXBsb2FkRGF0YScsIGFyZzogVXBsb2FkRGF0YUFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBhcmc6IFVwbG9hZEZpbmlzaEFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgYXJnOiBEb3dubG9hZFN0YXJ0QXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2Rvd25sb2FkRGF0YScsIGFyZzogRG93bmxvYWREYXRhQXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2Rvd25sb2FkRmluaXNoJywgYXJnOiBEb3dubG9hZEZpbmlzaEFyZyk6IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBJU3Vicm91dGluZURlc2Mge1xuICBpZDogbnVtYmVyO1xuICAvLyBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIG5vdFJlcGx5PzogYm9vbGVhbjtcbiAgYXJncz86IHsgbmFtZTogc3RyaW5nLCB0eXBlOiBObXNWYWx1ZVR5cGUsIGRlc2M/OiBzdHJpbmcgfVtdO1xufVxuXG5pbnRlcmZhY2UgSVByb3BlcnR5RGVzY3JpcHRvcjxPd25lcj4ge1xuICBjb25maWd1cmFibGU/OiBib29sZWFuO1xuICBlbnVtZXJhYmxlPzogYm9vbGVhbjtcbiAgdmFsdWU/OiBhbnk7XG4gIHdyaXRhYmxlPzogYm9vbGVhbjtcblxuICBnZXQ/KHRoaXM6IE93bmVyKTogYW55O1xuXG4gIHNldD8odGhpczogT3duZXIsIHY6IGFueSk6IHZvaWQ7XG59XG5cbmZ1bmN0aW9uIGdldEJhc2VUeXBlKHR5cGVzOiBJTWliRGV2aWNlWyd0eXBlcyddLCB0eXBlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgYmFzZSA9IHR5cGU7XG4gIGZvciAobGV0IHN1cGVyVHlwZTogSU1pYlR5cGUgPSB0eXBlc1tiYXNlXSBhcyBJTWliVHlwZTsgc3VwZXJUeXBlICE9IG51bGw7XG4gICAgICAgc3VwZXJUeXBlID0gdHlwZXNbc3VwZXJUeXBlLmJhc2VdIGFzIElNaWJUeXBlKSB7XG4gICAgYmFzZSA9IHN1cGVyVHlwZS5iYXNlO1xuICB9XG4gIHJldHVybiBiYXNlO1xufVxuXG5mdW5jdGlvbiBkZWZpbmVNaWJQcm9wZXJ0eShcbiAgdGFyZ2V0OiBEZXZpY2VQcm90b3R5cGUsXG4gIGtleTogc3RyaW5nLFxuICB0eXBlczogSU1pYkRldmljZVsndHlwZXMnXSxcbiAgcHJvcDogSU1pYlByb3BlcnR5KTogW251bWJlciwgc3RyaW5nXSB7XG4gIGNvbnN0IHByb3BlcnR5S2V5ID0gdmFsaWRKc05hbWUoa2V5KTtcbiAgY29uc3QgeyBhcHBpbmZvIH0gPSBwcm9wO1xuICBjb25zdCBpZCA9IHRvSW50KGFwcGluZm8ubm1zX2lkKTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnaWQnLCBpZCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGNvbnN0IHNpbXBsZVR5cGUgPSBnZXRCYXNlVHlwZSh0eXBlcywgcHJvcC50eXBlKTtcbiAgY29uc3QgdHlwZSA9IHR5cGVzW3Byb3AudHlwZV0gYXMgSU1pYlR5cGU7XG4gIGNvbnN0IGNvbnZlcnRlcnM6IElDb252ZXJ0ZXJbXSA9IFtdO1xuICBjb25zdCBpc1JlYWRhYmxlID0gYXBwaW5mby5hY2Nlc3MuaW5kZXhPZigncicpID4gLTE7XG4gIGNvbnN0IGlzV3JpdGFibGUgPSBhcHBpbmZvLmFjY2Vzcy5pbmRleE9mKCd3JykgPiAtMTtcbiAgbGV0IGVudW1lcmF0aW9uOiBJTWliVHlwZVsnZW51bWVyYXRpb24nXSB8IHVuZGVmaW5lZDtcbiAgbGV0IG1pbjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBsZXQgbWF4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHN3aXRjaCAoZ2V0Tm1zVHlwZShzaW1wbGVUeXBlKSkge1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLkludDg6XG4gICAgICBtaW4gPSAtMTI4O1xuICAgICAgbWF4ID0gMTI3O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuSW50MTY6XG4gICAgICBtaW4gPSAtMzI3Njg7XG4gICAgICBtYXggPSAzMjc2NztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLkludDMyOlxuICAgICAgbWluID0gLTIxNDc0ODM2NDg7XG4gICAgICBtYXggPSAyMTQ3NDgzNjQ3O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuVUludDg6XG4gICAgICBtaW4gPSAwO1xuICAgICAgbWF4ID0gMjU1O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuVUludDE2OlxuICAgICAgbWluID0gMDtcbiAgICAgIG1heCA9IDY1NTM1O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuVUludDMyOlxuICAgICAgbWluID0gMDtcbiAgICAgIG1heCA9IDQyOTQ5NjcyOTU7XG4gICAgICBicmVhaztcbiAgfVxuICBzd2l0Y2ggKHNpbXBsZVR5cGUpIHtcbiAgICBjYXNlICdwYWNrZWQ4RmxvYXQnOlxuICAgICAgY29udmVydGVycy5wdXNoKHBhY2tlZDhmbG9hdENvbnZlcnRlcih0eXBlKSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdmaXhlZFBvaW50TnVtYmVyNCc6XG4gICAgICBjb252ZXJ0ZXJzLnB1c2goZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrO1xuICB9XG4gIGlmIChrZXkgPT09ICdicmlnaHRuZXNzJyAmJiBwcm9wLnR5cGUgPT09ICd4czp1bnNpZ25lZEJ5dGUnKSB7XG4gICAgY29uc29sZS5sb2coJ3VTRSBQRVJDRU5UIDEwMDwtPjI1MCcpO1xuICAgIGNvbnZlcnRlcnMucHVzaChwZXJjZW50Q29udmVydGVyKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCd1bml0JywgJyUnLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaW4nLCAwLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtYXgnLCAxMDAsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIG1pbiA9IG1heCA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChpc1dyaXRhYmxlKSB7XG4gICAgaWYgKHR5cGUgIT0gbnVsbCkge1xuICAgICAgY29uc3QgeyBtaW5JbmNsdXNpdmUsIG1heEluY2x1c2l2ZSB9ID0gdHlwZTtcbiAgICAgIGlmIChtaW5JbmNsdXNpdmUpIHtcbiAgICAgICAgY29uc3QgdmFsID0gcGFyc2VGbG9hdChtaW5JbmNsdXNpdmUpO1xuICAgICAgICBtaW4gPSBtaW4gIT09IHVuZGVmaW5lZCA/IE1hdGgubWF4KG1pbiwgdmFsKSA6IHZhbDtcbiAgICAgIH1cbiAgICAgIGlmIChtYXhJbmNsdXNpdmUpIHtcbiAgICAgICAgY29uc3QgdmFsID0gcGFyc2VGbG9hdChtYXhJbmNsdXNpdmUpO1xuICAgICAgICBtYXggPSBtYXggIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKG1heCwgdmFsKSA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1pbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtaW4gPSBjb252ZXJ0VG8oY29udmVydGVycykobWluKSBhcyBudW1iZXI7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaW4nLCBtaW4sIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgICBpZiAobWF4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIG1heCA9IGNvbnZlcnRUbyhjb252ZXJ0ZXJzKShtYXgpIGFzIG51bWJlcjtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21heCcsIG1heCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICB9XG4gIGlmICh0eXBlICE9IG51bGwpIHtcbiAgICBjb25zdCB7IGFwcGluZm86IGluZm8gPSB7fSB9ID0gdHlwZTtcbiAgICBlbnVtZXJhdGlvbiA9IHR5cGUuZW51bWVyYXRpb247XG4gICAgY29uc3QgeyB1bml0cywgcHJlY2lzaW9uLCByZXByZXNlbnRhdGlvbiwgZ2V0LCBzZXQgfSA9IGluZm87XG4gICAgY29uc3Qgc2l6ZSA9IGdldEludFNpemUoc2ltcGxlVHlwZSk7XG4gICAgaWYgKHVuaXRzKSB7XG4gICAgICBjb252ZXJ0ZXJzLnB1c2godW5pdENvbnZlcnRlcih1bml0cykpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgndW5pdCcsIHVuaXRzLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgbGV0IHByZWNpc2lvbkNvbnY6IElDb252ZXJ0ZXIgPSB7XG4gICAgICBmcm9tOiB2ID0+IHYsXG4gICAgICB0bzogdiA9PiB2LFxuICAgIH07XG4gICAgaWYgKHByZWNpc2lvbikge1xuICAgICAgcHJlY2lzaW9uQ29udiA9IHByZWNpc2lvbkNvbnZlcnRlcihwcmVjaXNpb24pO1xuICAgICAgY29udmVydGVycy5wdXNoKHByZWNpc2lvbkNvbnYpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnc3RlcCcsIDEgLyAoMTAgKiogcGFyc2VJbnQocHJlY2lzaW9uLCAxMCkpLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgaWYgKGVudW1lcmF0aW9uKSB7XG4gICAgICBjb252ZXJ0ZXJzLnB1c2goZW51bWVyYXRpb25Db252ZXJ0ZXIoZW51bWVyYXRpb24pKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2VudW0nLCBPYmplY3QuZW50cmllcyhlbnVtZXJhdGlvbilcbiAgICAgICAgLm1hcCgoW2tleSwgdmFsXSkgPT4gW1xuICAgICAgICAgIHZhbCEuYW5ub3RhdGlvbixcbiAgICAgICAgICB0b0ludChrZXkpLFxuICAgICAgICBdKSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIHJlcHJlc2VudGF0aW9uICYmIHNpemUgJiYgY29udmVydGVycy5wdXNoKHJlcHJlc2VudGF0aW9uQ29udmVydGVyKHJlcHJlc2VudGF0aW9uLCBzaXplKSk7XG4gICAgaWYgKGdldCAmJiBzZXQpIHtcbiAgICAgIGNvbnN0IGNvbnYgPSBldmFsQ29udmVydGVyKGdldCwgc2V0KTtcbiAgICAgIGNvbnZlcnRlcnMucHVzaChjb252KTtcbiAgICAgIGNvbnN0IFthLCBiXSA9IFtjb252LnRvKG1pbiksIGNvbnYudG8obWF4KV07XG4gICAgICBjb25zdCBtaW5FdmFsID0gcGFyc2VGbG9hdChwcmVjaXNpb25Db252LnRvKE1hdGgubWluKGEsIGIpKSBhcyBzdHJpbmcpO1xuICAgICAgY29uc3QgbWF4RXZhbCA9IHBhcnNlRmxvYXQocHJlY2lzaW9uQ29udi50byhNYXRoLm1heChhLCBiKSkgYXMgc3RyaW5nKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbicsIG1pbkV2YWwsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWF4JywgbWF4RXZhbCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICB9XG4gIGlmIChtaW4gIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnZlcnRlcnMucHVzaChtaW5JbmNsdXNpdmVDb252ZXJ0ZXIobWluKSk7XG4gIH1cbiAgaWYgKG1heCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29udmVydGVycy5wdXNoKG1heEluY2x1c2l2ZUNvbnZlcnRlcihtYXgpKTtcbiAgfVxuXG4gIGlmIChwcm9wLnR5cGUgPT09ICd2ZXJzaW9uVHlwZScpIHtcbiAgICBjb252ZXJ0ZXJzLnB1c2godmVyc2lvblR5cGVDb252ZXJ0ZXIpO1xuICB9XG4gIGlmIChzaW1wbGVUeXBlID09PSAneHM6Ym9vbGVhbicgJiYgIWVudW1lcmF0aW9uKSB7XG4gICAgY29udmVydGVycy5wdXNoKGJvb2xlYW5Db252ZXJ0ZXIpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2VudW0nLCBbWyfQlNCwJywgdHJ1ZV0sIFsn0J3QtdGCJywgZmFsc2VdXSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIH1cbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnaXNXcml0YWJsZScsIGlzV3JpdGFibGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdpc1JlYWRhYmxlJywgaXNSZWFkYWJsZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3R5cGUnLCBwcm9wLnR5cGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzaW1wbGVUeXBlJywgc2ltcGxlVHlwZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoXG4gICAgJ2Rpc3BsYXlOYW1lJyxcbiAgICBwcm9wLmFubm90YXRpb24gPyBwcm9wLmFubm90YXRpb24gOiBuYW1lLFxuICAgIHRhcmdldCxcbiAgICBwcm9wZXJ0eUtleSxcbiAgKTtcbiAgYXBwaW5mby5jYXRlZ29yeSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjYXRlZ29yeScsIGFwcGluZm8uY2F0ZWdvcnksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdubXNUeXBlJywgZ2V0Tm1zVHlwZShzaW1wbGVUeXBlKSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGNvbnN0IGF0dHJpYnV0ZXM6IElQcm9wZXJ0eURlc2NyaXB0b3I8RGV2aWNlUHJvdG90eXBlPiA9IHtcbiAgICBlbnVtZXJhYmxlOiBpc1JlYWRhYmxlLFxuICB9O1xuICBjb25zdCB0byA9IGNvbnZlcnRUbyhjb252ZXJ0ZXJzKTtcbiAgY29uc3QgZnJvbSA9IGNvbnZlcnRGcm9tKGNvbnZlcnRlcnMpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjb252ZXJ0VG8nLCB0bywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NvbnZlcnRGcm9tJywgZnJvbSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGF0dHJpYnV0ZXMuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUuYXNzZXJ0KFJlZmxlY3QuZ2V0KHRoaXMsICckY291bnRSZWYnKSA+IDAsICdEZXZpY2Ugd2FzIHJlbGVhc2VkJyk7XG4gICAgbGV0IHZhbHVlO1xuICAgIGlmICghdGhpcy5nZXRFcnJvcihpZCkpIHtcbiAgICAgIHZhbHVlID0gdG8odGhpcy5nZXRSYXdWYWx1ZShpZCkpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG4gIGlmIChpc1dyaXRhYmxlKSB7XG4gICAgYXR0cmlidXRlcy5zZXQgPSBmdW5jdGlvbiAobmV3VmFsdWU6IGFueSkge1xuICAgICAgY29uc29sZS5hc3NlcnQoUmVmbGVjdC5nZXQodGhpcywgJyRjb3VudFJlZicpID4gMCwgJ0RldmljZSB3YXMgcmVsZWFzZWQnKTtcbiAgICAgIGNvbnN0IHZhbHVlID0gZnJvbShuZXdWYWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCBOdW1iZXIuaXNOYU4odmFsdWUgYXMgbnVtYmVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkobmV3VmFsdWUpfWApO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXRSYXdWYWx1ZShpZCwgdmFsdWUpO1xuICAgIH07XG4gIH1cbiAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5S2V5LCBhdHRyaWJ1dGVzKTtcbiAgcmV0dXJuIFtpZCwgcHJvcGVydHlLZXldO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWliRmlsZShtaWJuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9taWJzLycsIGAke21pYm5hbWV9Lm1pYi5qc29uYCk7XG59XG5cbmNsYXNzIERldmljZVByb3RvdHlwZSBleHRlbmRzIEV2ZW50RW1pdHRlciBpbXBsZW1lbnRzIElEZXZpY2Uge1xuICAvLyB3aWxsIGJlIG92ZXJyaWRlIGZvciBhbiBpbnN0YW5jZVxuICAkY291bnRSZWYgPSAxO1xuXG4gIC8vIHByaXZhdGUgJGRlYm91bmNlRHJhaW4gPSBfLmRlYm91bmNlKHRoaXMuZHJhaW4sIDI1KTtcblxuICBjb25zdHJ1Y3RvcihtaWJuYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcigpO1xuICAgIGNvbnN0IG1pYmZpbGUgPSBnZXRNaWJGaWxlKG1pYm5hbWUpO1xuICAgIGNvbnN0IG1pYlZhbGlkYXRpb24gPSBNaWJEZXZpY2VWLmRlY29kZShKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtaWJmaWxlKS50b1N0cmluZygpKSk7XG4gICAgaWYgKG1pYlZhbGlkYXRpb24uaXNMZWZ0KCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtaWIgZmlsZSAke21pYmZpbGV9ICR7UGF0aFJlcG9ydGVyLnJlcG9ydChtaWJWYWxpZGF0aW9uKX1gKTtcbiAgICB9XG4gICAgY29uc3QgbWliID0gbWliVmFsaWRhdGlvbi52YWx1ZTtcbiAgICBjb25zdCB7IHR5cGVzLCBzdWJyb3V0aW5lcyB9ID0gbWliO1xuICAgIGNvbnN0IGRldmljZSA9IHR5cGVzW21pYi5kZXZpY2VdIGFzIElNaWJEZXZpY2VUeXBlO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYicsIG1pYm5hbWUsIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYmZpbGUnLCBtaWJmaWxlLCB0aGlzKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdhbm5vdGF0aW9uJywgZGV2aWNlLmFubm90YXRpb24sIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYlZlcnNpb24nLCBkZXZpY2UuYXBwaW5mby5taWJfdmVyc2lvbiwgdGhpcyk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZGV2aWNlVHlwZScsIHRvSW50KGRldmljZS5hcHBpbmZvLmRldmljZV90eXBlKSwgdGhpcyk7XG4gICAgZGV2aWNlLmFwcGluZm8ubG9hZGVyX3R5cGUgJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbG9hZGVyVHlwZScsXG4gICAgICB0b0ludChkZXZpY2UuYXBwaW5mby5sb2FkZXJfdHlwZSksIHRoaXMsXG4gICAgKTtcbiAgICBkZXZpY2UuYXBwaW5mby5maXJtd2FyZSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdmaXJtd2FyZScsXG4gICAgICBkZXZpY2UuYXBwaW5mby5maXJtd2FyZSwgdGhpcyxcbiAgICApO1xuICAgIGRldmljZS5hcHBpbmZvLm1pbl92ZXJzaW9uICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbl92ZXJzaW9uJyxcbiAgICAgIGRldmljZS5hcHBpbmZvLm1pbl92ZXJzaW9uLCB0aGlzLFxuICAgICk7XG4gICAgdHlwZXMuZXJyb3JUeXBlICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoXG4gICAgICAnZXJyb3JUeXBlJywgKHR5cGVzLmVycm9yVHlwZSBhcyBJTWliVHlwZSkuZW51bWVyYXRpb24sIHRoaXMpO1xuXG4gICAgaWYgKHN1YnJvdXRpbmVzKSB7XG4gICAgICBjb25zdCBtZXRhc3VicyA9IF8udHJhbnNmb3JtKFxuICAgICAgICBzdWJyb3V0aW5lcyxcbiAgICAgICAgKHJlc3VsdCwgc3ViLCBuYW1lKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W25hbWVdID0ge1xuICAgICAgICAgICAgaWQ6IHRvSW50KHN1Yi5hcHBpbmZvLm5tc19pZCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogc3ViLmFubm90YXRpb24sXG4gICAgICAgICAgICBhcmdzOiBzdWIucHJvcGVydGllcyAmJiBPYmplY3QuZW50cmllcyhzdWIucHJvcGVydGllcylcbiAgICAgICAgICAgICAgLm1hcCgoW25hbWUsIHByb3BdKSA9PiAoe1xuICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgdHlwZTogZ2V0Tm1zVHlwZShwcm9wLnR5cGUpLFxuICAgICAgICAgICAgICAgIGRlc2M6IHByb3AuYW5ub3RhdGlvbixcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcbiAgICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgSVN1YnJvdXRpbmVEZXNjPixcbiAgICAgICk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzdWJyb3V0aW5lcycsIG1ldGFzdWJzLCB0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBjYXRlZ29yeVxuICAgIC8vIGNvbnN0IG1pYkNhdGVnb3J5ID0gXy5maW5kKGRldGVjdG9yLmRldGVjdGlvbiEubWliQ2F0ZWdvcmllcywgeyBtaWI6IG1pYm5hbWUgfSk7XG4gICAgLy8gaWYgKG1pYkNhdGVnb3J5KSB7XG4gICAgLy8gICBjb25zdCB7IGNhdGVnb3J5LCBkaXNhYmxlQmF0Y2hSZWFkaW5nIH0gPSBtaWJDYXRlZ29yeTtcbiAgICAvLyAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NhdGVnb3J5JywgY2F0ZWdvcnksIHRoaXMpO1xuICAgIC8vICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZGlzYWJsZUJhdGNoUmVhZGluZycsICEhZGlzYWJsZUJhdGNoUmVhZGluZywgdGhpcyk7XG4gICAgLy8gfVxuXG4gICAgY29uc3Qga2V5cyA9IFJlZmxlY3Qub3duS2V5cyhkZXZpY2UucHJvcGVydGllcykgYXMgc3RyaW5nW107XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIGtleXMubWFwKHZhbGlkSnNOYW1lKSwgdGhpcyk7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogbnVtYmVyXTogc3RyaW5nW10gfSA9IHt9O1xuICAgIGtleXMuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IFtpZCwgcHJvcE5hbWVdID0gZGVmaW5lTWliUHJvcGVydHkodGhpcywga2V5LCB0eXBlcywgZGV2aWNlLnByb3BlcnRpZXNba2V5XSk7XG4gICAgICBpZiAoIW1hcFtpZF0pIHtcbiAgICAgICAgbWFwW2lkXSA9IFtwcm9wTmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXBbaWRdLnB1c2gocHJvcE5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21hcCcsIG1hcCwgdGhpcyk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGNvbm5lY3Rpb24oKTogTmlidXNDb25uZWN0aW9uIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dO1xuICB9XG5cbiAgcHVibGljIHNldCBjb25uZWN0aW9uKHZhbHVlOiBOaWJ1c0Nvbm5lY3Rpb24gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IHByZXYgPSB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dO1xuICAgIGlmIChwcmV2ID09PSB2YWx1ZSkgcmV0dXJuO1xuICAgIHZhbHVlc1tQcml2YXRlUHJvcHMuY29ubmVjdGlvbl0gPSB2YWx1ZTtcbiAgICAvKipcbiAgICAgKiBEZXZpY2UgY29ubmVjdGVkIGV2ZW50XG4gICAgICogQGV2ZW50IElEZXZpY2UjY29ubmVjdGVkXG4gICAgICogQGV2ZW50IElEZXZpY2UjZGlzY29ubmVjdGVkXG4gICAgICovXG4gICAgdGhpcy5lbWl0KHZhbHVlICE9IG51bGwgPyAnY29ubmVjdGVkJyA6ICdkaXNjb25uZWN0ZWQnKTtcbiAgICAvLyBpZiAodmFsdWUpIHtcbiAgICAvLyAgIHRoaXMuZHJhaW4oKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgLy8gfVxuICB9XG5cbiAgLy8gbm9pbnNwZWN0aW9uIEpTVW51c2VkR2xvYmFsU3ltYm9sc1xuICBwdWJsaWMgdG9KU09OKCk6IGFueSB7XG4gICAgY29uc3QganNvbjogYW55ID0ge1xuICAgICAgbWliOiBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCB0aGlzKSxcbiAgICB9O1xuICAgIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIHRoaXMpO1xuICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBpZiAodGhpc1trZXldICE9PSB1bmRlZmluZWQpIGpzb25ba2V5XSA9IHRoaXNba2V5XTtcbiAgICB9KTtcbiAgICBqc29uLmFkZHJlc3MgPSB0aGlzLmFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICByZXR1cm4ganNvbjtcbiAgfVxuXG4gIHB1YmxpYyBnZXRJZChpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogbnVtYmVyIHtcbiAgICBsZXQgaWQ6IG51bWJlcjtcbiAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgaWQgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdpZCcsIHRoaXMsIGlkT3JOYW1lKTtcbiAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKGlkKSkgcmV0dXJuIGlkO1xuICAgICAgaWQgPSB0b0ludChpZE9yTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkID0gaWRPck5hbWU7XG4gICAgfVxuICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGlmICghUmVmbGVjdC5oYXMobWFwLCBpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9wZXJ0eSAke2lkT3JOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBwdWJsaWMgZ2V0TmFtZShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBpZiAoUmVmbGVjdC5oYXMobWFwLCBpZE9yTmFtZSkpIHtcbiAgICAgIHJldHVybiBtYXBbaWRPck5hbWVdWzBdO1xuICAgIH1cbiAgICBjb25zdCBrZXlzOiBzdHJpbmdbXSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYlByb3BlcnRpZXMnLCB0aGlzKTtcbiAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJyAmJiBrZXlzLmluY2x1ZGVzKGlkT3JOYW1lKSkgcmV0dXJuIGlkT3JOYW1lO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9wZXJ0eSAke2lkT3JOYW1lfWApO1xuICB9XG5cbiAgLypcbiAgICBwdWJsaWMgdG9JZHMoaWRzT3JOYW1lczogKHN0cmluZyB8IG51bWJlcilbXSk6IG51bWJlcltdIHtcbiAgICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgICAgcmV0dXJuIGlkc09yTmFtZXMubWFwKChpZE9yTmFtZSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJylcbiAgICAgIH0pO1xuICAgIH1cbiAgKi9cbiAgcHVibGljIGdldFJhd1ZhbHVlKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnkge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICByZXR1cm4gdmFsdWVzW2lkXTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRSYXdWYWx1ZShpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nLCB2YWx1ZTogYW55LCBpc0RpcnR5ID0gdHJ1ZSkge1xuICAgIC8vIGRlYnVnKGBzZXRSYXdWYWx1ZSgke2lkT3JOYW1lfSwgJHtKU09OLnN0cmluZ2lmeShzYWZlTnVtYmVyKHZhbHVlKSl9KWApO1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcywgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgY29uc3QgbmV3VmFsID0gc2FmZU51bWJlcih2YWx1ZSk7XG4gICAgaWYgKG5ld1ZhbCAhPT0gdmFsdWVzW2lkXSB8fCBlcnJvcnNbaWRdKSB7XG4gICAgICB2YWx1ZXNbaWRdID0gbmV3VmFsO1xuICAgICAgZGVsZXRlIGVycm9yc1tpZF07XG4gICAgICB0aGlzLnNldERpcnR5KGlkLCBpc0RpcnR5KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZ2V0RXJyb3IoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskZXJyb3JzXTogZXJyb3JzIH0gPSB0aGlzO1xuICAgIHJldHVybiBlcnJvcnNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldEVycm9yKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcsIGVycm9yPzogRXJyb3IpIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgaWYgKGVycm9yICE9IG51bGwpIHtcbiAgICAgIGVycm9yc1tpZF0gPSBlcnJvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGVycm9yc1tpZF07XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGlzRGlydHkoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiAhIWRpcnRpZXNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldERpcnR5KGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIsIGlzRGlydHkgPSB0cnVlKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBudW1iZXJdOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIGlmIChpc0RpcnR5KSB7XG4gICAgICBkaXJ0aWVzW2lkXSA9IHRydWU7XG4gICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgYXV0b3NhdmVcbiAgICAgIC8vIHRoaXMud3JpdGUoaWQpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGRpcnRpZXNbaWRdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAZXZlbnQgSURldmljZSNjaGFuZ2VkXG4gICAgICogQGV2ZW50IElEZXZpY2UjY2hhbmdpbmdcbiAgICAgKi9cbiAgICBjb25zdCBuYW1lcyA9IG1hcFtpZF0gfHwgW107XG4gICAgdGhpcy5lbWl0KFxuICAgICAgaXNEaXJ0eSA/ICdjaGFuZ2luZycgOiAnY2hhbmdlZCcsXG4gICAgICB7XG4gICAgICAgIGlkLFxuICAgICAgICBuYW1lcyxcbiAgICAgIH0sXG4gICAgKTtcbiAgICBpZiAobmFtZXMuaW5jbHVkZXMoJ3Nlcm5vJykgJiYgIWlzRGlydHlcbiAgICAgICYmIHRoaXMuYWRkcmVzcy50eXBlID09PSBBZGRyZXNzVHlwZS5tYWMgJiYgdHlwZW9mIHRoaXMuc2Vybm8gPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2Vybm87XG4gICAgICBjb25zdCBwcmV2QWRkcmVzcyA9IHRoaXMuYWRkcmVzcztcbiAgICAgIGNvbnN0IGFkZHJlc3MgPSBCdWZmZXIuZnJvbSh2YWx1ZS5wYWRTdGFydCgxMiwgJzAnKS5zdWJzdHJpbmcodmFsdWUubGVuZ3RoIC0gMTIpLCAnaGV4Jyk7XG4gICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGRyZXNzJywgd2l0aFZhbHVlKG5ldyBBZGRyZXNzKGFkZHJlc3MpLCBmYWxzZSwgdHJ1ZSkpO1xuICAgICAgZGV2aWNlcy5lbWl0KCdzZXJubycsIHByZXZBZGRyZXNzLCB0aGlzLmFkZHJlc3MpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhZGRyZWYoKSB7XG4gICAgdGhpcy4kY291bnRSZWYgKz0gMTtcbiAgICBkZWJ1ZygnYWRkcmVmJywgbmV3IEVycm9yKCdhZGRyZWYnKS5zdGFjayk7XG4gICAgcmV0dXJuIHRoaXMuJGNvdW50UmVmO1xuICB9XG5cbiAgcHVibGljIHJlbGVhc2UoKSB7XG4gICAgdGhpcy4kY291bnRSZWYgLT0gMTtcbiAgICBpZiAodGhpcy4kY291bnRSZWYgPD0gMCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5hZGRyZXNzLnRvU3RyaW5nKCk7XG4gICAgICBkZXZpY2VNYXBba2V5XSA9IF8ud2l0aG91dChkZXZpY2VNYXBba2V5XSwgdGhpcyk7XG4gICAgICBpZiAoZGV2aWNlTWFwW2tleV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBkZXZpY2VNYXBba2V5XTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQGV2ZW50IERldmljZXMjZGVsZXRlXG4gICAgICAgKi9cbiAgICAgIGRldmljZXMuZW1pdCgnZGVsZXRlJywgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiRjb3VudFJlZjtcbiAgfVxuXG4gIHB1YmxpYyBkcmFpbigpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgZGVidWcoYGRyYWluIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKGRpcnRpZXMpLm1hcChOdW1iZXIpLmZpbHRlcihpZCA9PiBkaXJ0aWVzW2lkXSk7XG4gICAgcmV0dXJuIGlkcy5sZW5ndGggPiAwID8gdGhpcy53cml0ZSguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxuXG4gIHByaXZhdGUgd3JpdGVBbGwoKSB7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCBpZHMgPSBPYmplY3QuZW50cmllcyh2YWx1ZXMpXG4gICAgICAuZmlsdGVyKChbLCB2YWx1ZV0pID0+IHZhbHVlICE9IG51bGwpXG4gICAgICAubWFwKChbaWRdKSA9PiBOdW1iZXIoaWQpKVxuICAgICAgLmZpbHRlcigoaWQgPT4gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaXNXcml0YWJsZScsIHRoaXMsIG1hcFtpZF1bMF0pKSk7XG4gICAgcmV0dXJuIGlkcy5sZW5ndGggPiAwID8gdGhpcy53cml0ZSguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxuXG4gIHB1YmxpYyB3cml0ZSguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTxudW1iZXJbXT4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbiB9ID0gdGhpcztcbiAgICBpZiAoIWNvbm5lY3Rpb24pIHJldHVybiBQcm9taXNlLnJlamVjdChgJHt0aGlzLmFkZHJlc3N9IGlzIGRpc2Nvbm5lY3RlZGApO1xuICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy53cml0ZUFsbCgpO1xuICAgIH1cbiAgICBkZWJ1Zyhgd3JpdGluZyAke2lkcy5qb2luKCl9IHRvIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgaW52YWxpZE5tczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCByZXF1ZXN0cyA9IGlkcy5yZWR1Y2UoXG4gICAgICAoYWNjOiBObXNEYXRhZ3JhbVtdLCBpZCkgPT4ge1xuICAgICAgICBjb25zdCBbbmFtZV0gPSBtYXBbaWRdO1xuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICBkZWJ1ZyhgVW5rbm93biBpZDogJHtpZH0gZm9yICR7UmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgdGhpcyl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFjYy5wdXNoKGNyZWF0ZU5tc1dyaXRlKFxuICAgICAgICAgICAgICB0aGlzLmFkZHJlc3MsXG4gICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICBSZWZsZWN0LmdldE1ldGFkYXRhKCdubXNUeXBlJywgdGhpcywgbmFtZSksXG4gICAgICAgICAgICAgIHRoaXMuZ2V0UmF3VmFsdWUoaWQpLFxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igd2hpbGUgY3JlYXRlIE5NUyBkYXRhZ3JhbScsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICBpbnZhbGlkTm1zLnB1c2goLWlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sXG4gICAgICBbXSxcbiAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgIHJlcXVlc3RzXG4gICAgICAgIC5tYXAoZGF0YWdyYW0gPT4gY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oZGF0YWdyYW0pXG4gICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW07XG4gICAgICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XG4gICAgICAgICAgICAgIHRoaXMuc2V0RGlydHkoZGF0YWdyYW0uaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGFncmFtLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZXRFcnJvcihkYXRhZ3JhbS5pZCwgbmV3IE5pYnVzRXJyb3Ioc3RhdHVzISwgdGhpcykpO1xuICAgICAgICAgICAgcmV0dXJuIC1kYXRhZ3JhbS5pZDtcbiAgICAgICAgICB9LCAocmVhc29uKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEVycm9yKGRhdGFncmFtLmlkLCByZWFzb24pO1xuICAgICAgICAgICAgcmV0dXJuIC1kYXRhZ3JhbS5pZDtcbiAgICAgICAgICB9KSkpXG4gICAgICAudGhlbihpZHMgPT4gaWRzLmNvbmNhdChpbnZhbGlkTm1zKSk7XG4gIH1cblxuICBwdWJsaWMgd3JpdGVWYWx1ZXMoc291cmNlOiBvYmplY3QsIHN0cm9uZyA9IHRydWUpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKHNvdXJjZSkubWFwKG5hbWUgPT4gdGhpcy5nZXRJZChuYW1lKSk7XG4gICAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ3ZhbHVlIGlzIGVtcHR5JykpO1xuICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBzb3VyY2UpO1xuICAgICAgcmV0dXJuIHRoaXMud3JpdGUoLi4uaWRzKVxuICAgICAgICAudGhlbigod3JpdHRlbikgPT4ge1xuICAgICAgICAgIGlmICh3cml0dGVuLmxlbmd0aCA9PT0gMCB8fCAoc3Ryb25nICYmIHdyaXR0ZW4ubGVuZ3RoICE9PSBpZHMubGVuZ3RoKSkge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5nZXRFcnJvcihpZHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gd3JpdHRlbjtcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlYWRBbGwoKTogUHJvbWlzZTxhbnk+IHtcbiAgICBpZiAodGhpcy4kcmVhZCkgcmV0dXJuIHRoaXMuJHJlYWQ7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogc3RyaW5nXTogc3RyaW5nW10gfSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5lbnRyaWVzKG1hcClcbiAgICAgIC5maWx0ZXIoKFssIG5hbWVzXSkgPT4gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaXNSZWFkYWJsZScsIHRoaXMsIG5hbWVzWzBdKSlcbiAgICAgIC5tYXAoKFtpZF0pID0+IE51bWJlcihpZCkpXG4gICAgICAuc29ydCgpO1xuICAgIHRoaXMuJHJlYWQgPSBpZHMubGVuZ3RoID4gMCA/IHRoaXMucmVhZCguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgICBjb25zdCBjbGVhciA9ICgpID0+IGRlbGV0ZSB0aGlzLiRyZWFkO1xuICAgIHJldHVybiB0aGlzLiRyZWFkLmZpbmFsbHkoY2xlYXIpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlYWQoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8eyBbbmFtZTogc3RyaW5nXTogYW55IH0+IHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy5yZWFkQWxsKCk7XG4gICAgLy8gZGVidWcoYHJlYWQgJHtpZHMuam9pbigpfSBmcm9tIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgZGlzYWJsZUJhdGNoUmVhZGluZyA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2Rpc2FibGVCYXRjaFJlYWRpbmcnLCB0aGlzKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgY2h1bmtzID0gY2h1bmtBcnJheShpZHMsIGRpc2FibGVCYXRjaFJlYWRpbmcgPyAxIDogMjEpO1xuICAgIGRlYnVnKGByZWFkIFske2NodW5rcy5tYXAoY2h1bmsgPT4gYFske2NodW5rLmpvaW4oKX1dYCkuam9pbigpfV0gZnJvbSBbJHt0aGlzLmFkZHJlc3N9XWApO1xuICAgIGNvbnN0IHJlcXVlc3RzID0gY2h1bmtzLm1hcChjaHVuayA9PiBjcmVhdGVObXNSZWFkKHRoaXMuYWRkcmVzcywgLi4uY2h1bmspKTtcbiAgICByZXR1cm4gcmVxdWVzdHMucmVkdWNlKFxuICAgICAgYXN5bmMgKHByb21pc2UsIGRhdGFncmFtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oZGF0YWdyYW0pO1xuICAgICAgICBjb25zdCBkYXRhZ3JhbXM6IE5tc0RhdGFncmFtW10gPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlKVxuICAgICAgICAgID8gcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW1bXVxuICAgICAgICAgIDogW3Jlc3BvbnNlIGFzIE5tc0RhdGFncmFtXTtcbiAgICAgICAgZGF0YWdyYW1zLmZvckVhY2goKHsgaWQsIHZhbHVlLCBzdGF0dXMgfSkgPT4ge1xuICAgICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UmF3VmFsdWUoaWQsIHZhbHVlLCBmYWxzZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RXJyb3IoaWQsIG5ldyBOaWJ1c0Vycm9yKHN0YXR1cyEsIHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbmFtZXMgPSBtYXBbaWRdO1xuICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KG5hbWVzICYmIG5hbWVzLmxlbmd0aCA+IDAsIGBJbnZhbGlkIGlkICR7aWR9YCk7XG4gICAgICAgICAgbmFtZXMuZm9yRWFjaCgocHJvcE5hbWUpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdFtwcm9wTmFtZV0gPSBzdGF0dXMgPT09IDBcbiAgICAgICAgICAgICAgPyB0aGlzW3Byb3BOYW1lXVxuICAgICAgICAgICAgICA6IHsgZXJyb3I6ICh0aGlzLmdldEVycm9yKGlkKSB8fCB7fSkubWVzc2FnZSB8fCAnZXJyb3InIH07XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSxcbiAgICAgIFByb21pc2UucmVzb2x2ZSh7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBhbnkgfSksXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZChkb21haW46IHN0cmluZywgb2Zmc2V0ID0gMCwgc2l6ZT86IG51bWJlcik6IFByb21pc2U8QnVmZmVyPiB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWNvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignZGlzY29ubmVjdGVkJyk7XG4gICAgICBjb25zdCByZXFVcGxvYWQgPSBjcmVhdGVObXNSZXF1ZXN0RG9tYWluVXBsb2FkKHRoaXMuYWRkcmVzcywgZG9tYWluLnBhZEVuZCg4LCAnXFwwJykpO1xuICAgICAgY29uc3QgeyBpZCwgdmFsdWU6IGRvbWFpblNpemUsIHN0YXR1cyB9ID1cbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxVXBsb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChzdGF0dXMgIT09IDApIHtcbiAgICAgICAgLy8gZGVidWcoJzxlcnJvcj4nLCBzdGF0dXMpO1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzLCAnUmVxdWVzdCB1cGxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpbml0VXBsb2FkID0gY3JlYXRlTm1zSW5pdGlhdGVVcGxvYWRTZXF1ZW5jZSh0aGlzLmFkZHJlc3MsIGlkKTtcbiAgICAgIGNvbnN0IHsgc3RhdHVzOiBpbml0U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oaW5pdFVwbG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICBpZiAoaW5pdFN0YXQgIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoaW5pdFN0YXQhLCB0aGlzLCAnSW5pdGlhdGUgdXBsb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgICAgfVxuICAgICAgY29uc3QgdG90YWwgPSBzaXplIHx8IChkb21haW5TaXplIC0gb2Zmc2V0KTtcbiAgICAgIGxldCByZXN0ID0gdG90YWw7XG4gICAgICBsZXQgcG9zID0gb2Zmc2V0O1xuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAndXBsb2FkU3RhcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZG9tYWluLFxuICAgICAgICAgIGRvbWFpblNpemUsXG4gICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgIHNpemU6IHRvdGFsLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIGNvbnN0IGJ1ZnM6IEJ1ZmZlcltdID0gW107XG4gICAgICB3aGlsZSAocmVzdCA+IDApIHtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gTWF0aC5taW4oMjU1LCByZXN0KTtcbiAgICAgICAgY29uc3QgdXBsb2FkU2VnbWVudCA9IGNyZWF0ZU5tc1VwbG9hZFNlZ21lbnQodGhpcy5hZGRyZXNzLCBpZCwgcG9zLCBsZW5ndGgpO1xuICAgICAgICBjb25zdCB7IHN0YXR1czogdXBsb2FkU3RhdHVzLCB2YWx1ZTogcmVzdWx0IH0gPVxuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHVwbG9hZFNlZ21lbnQpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgICBpZiAodXBsb2FkU3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IodXBsb2FkU3RhdHVzISwgdGhpcywgJ1VwbG9hZCBzZWdtZW50IGVycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJ1ZnMucHVzaChyZXN1bHQuZGF0YSk7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAndXBsb2FkRGF0YScsXG4gICAgICAgICAge1xuICAgICAgICAgICAgZG9tYWluLFxuICAgICAgICAgICAgcG9zLFxuICAgICAgICAgICAgZGF0YTogcmVzdWx0LmRhdGEsXG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcbiAgICAgICAgcmVzdCAtPSByZXN1bHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIHBvcyArPSByZXN1bHQuZGF0YS5sZW5ndGg7XG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBCdWZmZXIuY29uY2F0KGJ1ZnMpO1xuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAndXBsb2FkRmluaXNoJyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgZGF0YTogcmVzdWx0LFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5lbWl0KCd1cGxvYWRFcnJvcicsIGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkb3dubG9hZChkb21haW46IHN0cmluZywgYnVmZmVyOiBCdWZmZXIsIG9mZnNldCA9IDAsIG5vVGVybSA9IGZhbHNlKSB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0ZWQnKTtcbiAgICBjb25zdCByZXFEb3dubG9hZCA9IGNyZWF0ZU5tc1JlcXVlc3REb21haW5Eb3dubG9hZCh0aGlzLmFkZHJlc3MsIGRvbWFpbi5wYWRFbmQoOCwgJ1xcMCcpKTtcbiAgICBjb25zdCB7IGlkLCB2YWx1ZTogbWF4LCBzdGF0dXMgfSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHJlcURvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAoc3RhdHVzICE9PSAwKSB7XG4gICAgICAvLyBkZWJ1ZygnPGVycm9yPicsIHN0YXR1cyk7XG4gICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzLCAnUmVxdWVzdCBkb3dubG9hZCBkb21haW4gZXJyb3InKTtcbiAgICB9XG4gICAgY29uc3QgdGVybWluYXRlID0gYXN5bmMgKGVycj86IEVycm9yKSA9PiB7XG4gICAgICBsZXQgdGVybVN0YXQgPSAwO1xuICAgICAgaWYgKCFub1Rlcm0pIHtcbiAgICAgICAgY29uc3QgcmVxID0gY3JlYXRlTm1zVGVybWluYXRlRG93bmxvYWRTZXF1ZW5jZSh0aGlzLmFkZHJlc3MsIGlkKTtcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgICAgdGVybVN0YXQgPSByZXMuc3RhdHVzITtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIGlmICh0ZXJtU3RhdCAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihcbiAgICAgICAgICB0ZXJtU3RhdCEsXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAnVGVybWluYXRlIGRvd25sb2FkIHNlcXVlbmNlIGVycm9yLCBtYXliZSBuZWVkIC0tbm8tdGVybScsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA+IG1heCAtIG9mZnNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBCdWZmZXIgdG8gbGFyZ2UuIEV4cGVjdGVkICR7bWF4IC0gb2Zmc2V0fSBieXRlc2ApO1xuICAgIH1cbiAgICBjb25zdCBpbml0RG93bmxvYWQgPSBjcmVhdGVObXNJbml0aWF0ZURvd25sb2FkU2VxdWVuY2UodGhpcy5hZGRyZXNzLCBpZCk7XG4gICAgY29uc3QgeyBzdGF0dXM6IGluaXRTdGF0IH0gPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShpbml0RG93bmxvYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgIGlmIChpbml0U3RhdCAhPT0gMCkge1xuICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoaW5pdFN0YXQhLCB0aGlzLCAnSW5pdGlhdGUgZG93bmxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgfVxuICAgIHRoaXMuZW1pdChcbiAgICAgICdkb3dubG9hZFN0YXJ0JyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBvZmZzZXQsXG4gICAgICAgIGRvbWFpblNpemU6IG1heCxcbiAgICAgICAgc2l6ZTogYnVmZmVyLmxlbmd0aCxcbiAgICAgIH0sXG4gICAgKTtcbiAgICBjb25zdCBjcmMgPSBjcmMxNmNjaXR0KGJ1ZmZlciwgMCk7XG4gICAgY29uc3QgY2h1bmtTaXplID0gTk1TX01BWF9EQVRBX0xFTkdUSCAtIDQ7XG4gICAgY29uc3QgY2h1bmtzID0gY2h1bmtBcnJheShidWZmZXIsIGNodW5rU2l6ZSk7XG4gICAgYXdhaXQgY2h1bmtzLnJlZHVjZShhc3luYyAocHJldiwgY2h1bms6IEJ1ZmZlciwgaSkgPT4ge1xuICAgICAgYXdhaXQgcHJldjtcbiAgICAgIGNvbnN0IHBvcyA9IGkgKiBjaHVua1NpemUgKyBvZmZzZXQ7XG4gICAgICBjb25zdCBzZWdtZW50RG93bmxvYWQgPVxuICAgICAgICBjcmVhdGVObXNEb3dubG9hZFNlZ21lbnQodGhpcy5hZGRyZXNzLCBpZCEsIHBvcywgY2h1bmspO1xuICAgICAgY29uc3QgeyBzdGF0dXM6IGRvd25sb2FkU3RhdCB9ID1cbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oc2VnbWVudERvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChkb3dubG9hZFN0YXQgIT09IDApIHtcbiAgICAgICAgYXdhaXQgdGVybWluYXRlKG5ldyBOaWJ1c0Vycm9yKGRvd25sb2FkU3RhdCEsIHRoaXMsICdEb3dubG9hZCBzZWdtZW50IGVycm9yJykpO1xuICAgICAgfVxuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAnZG93bmxvYWREYXRhJyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBsZW5ndGg6IGNodW5rLmxlbmd0aCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xuICAgIGNvbnN0IHZlcmlmeSA9IGNyZWF0ZU5tc1ZlcmlmeURvbWFpbkNoZWNrc3VtKHRoaXMuYWRkcmVzcywgaWQsIG9mZnNldCwgYnVmZmVyLmxlbmd0aCwgY3JjKTtcbiAgICBjb25zdCB7IHN0YXR1czogdmVyaWZ5U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0odmVyaWZ5KSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAodmVyaWZ5U3RhdCAhPT0gMCkge1xuICAgICAgYXdhaXQgdGVybWluYXRlKG5ldyBOaWJ1c0Vycm9yKHZlcmlmeVN0YXQhLCB0aGlzLCAnRG93bmxvYWQgc2VnbWVudCBlcnJvcicpKTtcbiAgICB9XG4gICAgYXdhaXQgdGVybWluYXRlKCk7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgJ2Rvd25sb2FkRmluaXNoJyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBvZmZzZXQsXG4gICAgICAgIHNpemU6IGJ1ZmZlci5sZW5ndGgsXG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBhc3luYyBleGVjdXRlKHByb2dyYW06IHN0cmluZywgYXJncz86IFJlY29yZDxzdHJpbmcsIGFueT4pIHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGNvbnN0IHN1YnJvdXRpbmVzID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnc3Vicm91dGluZXMnLCB0aGlzKSBhcyBSZWNvcmQ8c3RyaW5nLCBJU3Vicm91dGluZURlc2M+O1xuICAgIGlmICghc3Vicm91dGluZXMgfHwgIVJlZmxlY3QuaGFzKHN1YnJvdXRpbmVzLCBwcm9ncmFtKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb2dyYW0gJHtwcm9ncmFtfWApO1xuICAgIH1cbiAgICBjb25zdCBzdWJyb3V0aW5lID0gc3Vicm91dGluZXNbcHJvZ3JhbV07XG4gICAgY29uc3QgcHJvcHM6IFR5cGVkVmFsdWVbXSA9IFtdO1xuICAgIGlmIChzdWJyb3V0aW5lLmFyZ3MpIHtcbiAgICAgIE9iamVjdC5lbnRyaWVzKHN1YnJvdXRpbmUuYXJncykuZm9yRWFjaCgoW25hbWUsIGRlc2NdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyZyA9IGFyZ3MgJiYgYXJnc1tuYW1lXTtcbiAgICAgICAgaWYgKCFhcmcpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJnICR7bmFtZX0gaW4gcHJvZ3JhbSAke3Byb2dyYW19YCk7XG4gICAgICAgIHByb3BzLnB1c2goW2Rlc2MudHlwZSwgYXJnXSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVxID0gY3JlYXRlRXhlY3V0ZVByb2dyYW1JbnZvY2F0aW9uKFxuICAgICAgdGhpcy5hZGRyZXNzLFxuICAgICAgc3Vicm91dGluZS5pZCxcbiAgICAgIHN1YnJvdXRpbmUubm90UmVwbHksXG4gICAgICAuLi5wcm9wcyxcbiAgICApO1xuICAgIHJldHVybiBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShyZXEpO1xuICB9XG59XG5cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuaW50ZXJmYWNlIERldmljZVByb3RvdHlwZSB7XG4gIHJlYWRvbmx5IGlkOiBEZXZpY2VJZDtcbiAgcmVhZG9ubHkgYWRkcmVzczogQWRkcmVzcztcbiAgW21pYlByb3BlcnR5OiBzdHJpbmddOiBhbnk7XG4gICRjb3VudFJlZjogbnVtYmVyO1xuICAkcmVhZD86IFByb21pc2U8YW55PjtcbiAgWyR2YWx1ZXNdOiB7IFtpZDogbnVtYmVyXTogYW55IH07XG4gIFskZXJyb3JzXTogeyBbaWQ6IG51bWJlcl06IEVycm9yIH07XG4gIFskZGlydGllc106IHsgW2lkOiBudW1iZXJdOiBib29sZWFuIH07XG59XG5cbmV4cG9ydCBjb25zdCBnZXRNaWJUeXBlcyA9ICgpOiBDb25maWdbJ21pYlR5cGVzJ10gPT4ge1xuICBjb25zdCBjb25mID0gcGF0aC5yZXNvbHZlKGNvbmZpZ0RpciB8fCAnL3RtcCcsICdjb25maWdzdG9yZScsIHBrZ05hbWUpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoYCR7Y29uZn0uanNvbmApKSByZXR1cm4ge307XG4gIGNvbnN0IHZhbGlkYXRlID0gQ29uZmlnVi5kZWNvZGUoSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoYCR7Y29uZn0uanNvbmApLnRvU3RyaW5nKCkpKTtcbi8vICAgY29uc3QgdmFsaWRhdGUgPSBDb25maWdWLmRlY29kZShyZXF1aXJlKGNvbmYpKTtcbiAgaWYgKHZhbGlkYXRlLmlzTGVmdCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmaWxlICR7Y29uZn1cbiAgJHtQYXRoUmVwb3J0ZXIucmVwb3J0KHZhbGlkYXRlKX1gKTtcbiAgfVxuICBjb25zdCB7IG1pYlR5cGVzIH0gPSB2YWxpZGF0ZS52YWx1ZTtcbiAgcmV0dXJuIG1pYlR5cGVzO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNaWJCeVR5cGUodHlwZTogbnVtYmVyLCB2ZXJzaW9uPzogbnVtYmVyKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgbWliVHlwZXMgPSBnZXRNaWJUeXBlcygpO1xuICBjb25zdCBtaWJzID0gbWliVHlwZXMhW3R5cGVdO1xuICBpZiAobWlicyAmJiBtaWJzLmxlbmd0aCkge1xuICAgIGxldCBtaWJUeXBlID0gbWlic1swXTtcbiAgICBpZiAodmVyc2lvbiAmJiBtaWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgIG1pYlR5cGUgPSBfLmZpbmRMYXN0KG1pYnMsICh7IG1pblZlcnNpb24gPSAwIH0pID0+IG1pblZlcnNpb24gPD0gdmVyc2lvbikgfHwgbWliVHlwZTtcbiAgICB9XG4gICAgcmV0dXJuIG1pYlR5cGUubWliO1xuICB9XG4gIC8vIGNvbnN0IGNhY2hlTWlicyA9IE9iamVjdC5rZXlzKG1pYlR5cGVzQ2FjaGUpO1xuICAvLyBjb25zdCBjYWNoZWQgPSBjYWNoZU1pYnMuZmluZChtaWIgPT5cbiAgLy8gICBSZWZsZWN0LmdldE1ldGFkYXRhKCdkZXZpY2VUeXBlJywgbWliVHlwZXNDYWNoZVttaWJdLnByb3RvdHlwZSkgPT09IHR5cGUpO1xuICAvLyBpZiAoY2FjaGVkKSByZXR1cm4gY2FjaGVkO1xuICAvLyBjb25zdCBtaWJzID0gZ2V0TWlic1N5bmMoKTtcbiAgLy8gcmV0dXJuIF8uZGlmZmVyZW5jZShtaWJzLCBjYWNoZU1pYnMpLmZpbmQoKG1pYk5hbWUpID0+IHtcbiAgLy8gICBjb25zdCBtaWJmaWxlID0gZ2V0TWliRmlsZShtaWJOYW1lKTtcbiAgLy8gICBjb25zdCBtaWI6IElNaWJEZXZpY2UgPSByZXF1aXJlKG1pYmZpbGUpO1xuICAvLyAgIGNvbnN0IHsgdHlwZXMgfSA9IG1pYjtcbiAgLy8gICBjb25zdCBkZXZpY2UgPSB0eXBlc1ttaWIuZGV2aWNlXSBhcyBJTWliRGV2aWNlVHlwZTtcbiAgLy8gICByZXR1cm4gdG9JbnQoZGV2aWNlLmFwcGluZm8uZGV2aWNlX3R5cGUpID09PSB0eXBlO1xuICAvLyB9KTtcbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIERldmljZXMge1xuICBvbihldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnbmV3JyB8ICdkZWxldGUnLCBkZXZpY2VMaXN0ZW5lcjogKGRldmljZTogSURldmljZSkgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnbmV3JyB8ICdkZWxldGUnLCBkZXZpY2VMaXN0ZW5lcjogKGRldmljZTogSURldmljZSkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKHByZXZBZGRyZXNzOiBBZGRyZXNzLCBuZXdBZGRyZXNzOiBBZGRyZXNzKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKHByZXZBZGRyZXNzOiBBZGRyZXNzLCBuZXdBZGRyZXNzOiBBZGRyZXNzKSA9PiB2b2lkKTogdGhpcztcbn1cblxuZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3IobWliOiBzdHJpbmcpOiBGdW5jdGlvbiB7XG4gIGxldCBjb25zdHJ1Y3RvciA9IG1pYlR5cGVzQ2FjaGVbbWliXTtcbiAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuICAgIGZ1bmN0aW9uIERldmljZSh0aGlzOiBEZXZpY2VQcm90b3R5cGUsIGFkZHJlc3M6IEFkZHJlc3MpIHtcbiAgICAgIEV2ZW50RW1pdHRlci5hcHBseSh0aGlzKTtcbiAgICAgIHRoaXNbJHZhbHVlc10gPSB7fTtcbiAgICAgIHRoaXNbJGVycm9yc10gPSB7fTtcbiAgICAgIHRoaXNbJGRpcnRpZXNdID0ge307XG4gICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGRyZXNzJywgd2l0aFZhbHVlKGFkZHJlc3MsIGZhbHNlLCB0cnVlKSk7XG4gICAgICB0aGlzLiRjb3VudFJlZiA9IDE7XG4gICAgICAodGhpcyBhcyBhbnkpLmlkID0gdGltZWlkKCkgYXMgRGV2aWNlSWQ7XG4gICAgICAvLyBkZWJ1ZyhuZXcgRXJyb3IoJ0NSRUFURScpLnN0YWNrKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm90b3R5cGUgPSBuZXcgRGV2aWNlUHJvdG90eXBlKG1pYik7XG4gICAgRGV2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAoRGV2aWNlIGFzIGFueSkuZGlzcGxheU5hbWUgPSBgJHttaWJbMF0udG9VcHBlckNhc2UoKX0ke21pYi5zbGljZSgxKX1gO1xuICAgIGNvbnN0cnVjdG9yID0gRGV2aWNlO1xuICAgIG1pYlR5cGVzQ2FjaGVbbWliXSA9IGNvbnN0cnVjdG9yO1xuICB9XG4gIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1pYlByb3RvdHlwZShtaWI6IHN0cmluZyk6IE9iamVjdCB7XG4gIHJldHVybiBnZXRDb25zdHJ1Y3RvcihtaWIpLnByb3RvdHlwZTtcbn1cblxuZXhwb3J0IGNsYXNzIERldmljZXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBnZXQgPSAoKTogSURldmljZVtdID0+IF8uZmxhdHRlbihfLnZhbHVlcyhkZXZpY2VNYXApKTtcblxuICBmaW5kID0gKGFkZHJlc3M6IEFkZHJlc3NQYXJhbSk6IElEZXZpY2VbXSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgY29uc3QgdGFyZ2V0QWRkcmVzcyA9IG5ldyBBZGRyZXNzKGFkZHJlc3MpO1xuICAgIHJldHVybiBkZXZpY2VNYXBbdGFyZ2V0QWRkcmVzcy50b1N0cmluZygpXTtcbiAgfTtcblxuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCBtaWI6IHN0cmluZyk6IElEZXZpY2U7XG4gIGNyZWF0ZShhZGRyZXNzOiBBZGRyZXNzUGFyYW0sIHR5cGU6IG51bWJlciwgdmVyc2lvbj86IG51bWJlcik6IElEZXZpY2U7XG4gIGNyZWF0ZShhZGRyZXNzOiBBZGRyZXNzUGFyYW0sIG1pYk9yVHlwZTogYW55LCB2ZXJzaW9uPzogbnVtYmVyKTogSURldmljZSB7XG4gICAgbGV0IG1pYjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlb2YgbWliT3JUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgbWliID0gZmluZE1pYkJ5VHlwZShtaWJPclR5cGUsIHZlcnNpb24pO1xuICAgICAgaWYgKG1pYiA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbWliIHR5cGUnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtaWJPclR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBtaWIgPSBTdHJpbmcobWliT3JUeXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaWIgb3IgdHlwZSBleHBlY3RlZCwgZ290ICR7bWliT3JUeXBlfWApO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRBZGRyZXNzID0gbmV3IEFkZHJlc3MoYWRkcmVzcyk7XG4gICAgLy8gbGV0IGRldmljZSA9IGRldmljZU1hcFt0YXJnZXRBZGRyZXNzLnRvU3RyaW5nKCldO1xuICAgIC8vIGlmIChkZXZpY2UpIHtcbiAgICAvLyAgIGNvbnNvbGUuYXNzZXJ0KFxuICAgIC8vICAgICBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCBkZXZpY2UpID09PSBtaWIsXG4gICAgLy8gICAgIGBtaWJzIGFyZSBkaWZmZXJlbnQsIGV4cGVjdGVkICR7bWlifWAsXG4gICAgLy8gICApO1xuICAgIC8vICAgZGV2aWNlLmFkZHJlZigpO1xuICAgIC8vICAgcmV0dXJuIGRldmljZTtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGdldENvbnN0cnVjdG9yKG1pYik7XG4gICAgY29uc3QgZGV2aWNlOiBJRGV2aWNlID0gUmVmbGVjdC5jb25zdHJ1Y3QoY29uc3RydWN0b3IsIFt0YXJnZXRBZGRyZXNzXSk7XG4gICAgaWYgKCF0YXJnZXRBZGRyZXNzLmlzRW1wdHkpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRhcmdldEFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICAgIGRldmljZU1hcFtrZXldID0gKGRldmljZU1hcFtrZXldIHx8IFtdKS5jb25jYXQoZGV2aWNlKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gdGhpcy5lbWl0KCduZXcnLCBkZXZpY2UpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRldmljZTtcbiAgfVxufVxuXG5jb25zdCBkZXZpY2VzID0gbmV3IERldmljZXMoKTtcblxuZXhwb3J0IGRlZmF1bHQgZGV2aWNlcztcbiJdfQ==