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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taWIvZGV2aWNlcy50cyJdLCJuYW1lcyI6WyJwa2dOYW1lIiwiZGVidWciLCIkdmFsdWVzIiwiU3ltYm9sIiwiJGVycm9ycyIsIiRkaXJ0aWVzIiwic2FmZU51bWJlciIsInZhbCIsIm51bSIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsIlByaXZhdGVQcm9wcyIsImRldmljZU1hcCIsIm1pYlR5cGVzQ2FjaGUiLCJNaWJQcm9wZXJ0eUFwcEluZm9WIiwidCIsImludGVyc2VjdGlvbiIsInR5cGUiLCJubXNfaWQiLCJ1bmlvbiIsInN0cmluZyIsIkludCIsImFjY2VzcyIsInBhcnRpYWwiLCJjYXRlZ29yeSIsIk1pYlByb3BlcnR5ViIsImFubm90YXRpb24iLCJhcHBpbmZvIiwiTWliRGV2aWNlQXBwSW5mb1YiLCJtaWJfdmVyc2lvbiIsImRldmljZV90eXBlIiwibG9hZGVyX3R5cGUiLCJmaXJtd2FyZSIsIm1pbl92ZXJzaW9uIiwiTWliRGV2aWNlVHlwZVYiLCJwcm9wZXJ0aWVzIiwicmVjb3JkIiwiTWliVHlwZVYiLCJiYXNlIiwiemVybyIsInVuaXRzIiwicHJlY2lzaW9uIiwicmVwcmVzZW50YXRpb24iLCJnZXQiLCJzZXQiLCJtaW5JbmNsdXNpdmUiLCJtYXhJbmNsdXNpdmUiLCJlbnVtZXJhdGlvbiIsIk1pYlN1YnJvdXRpbmVWIiwicmVzcG9uc2UiLCJTdWJyb3V0aW5lVHlwZVYiLCJpZCIsImxpdGVyYWwiLCJNaWJEZXZpY2VWIiwiZGV2aWNlIiwidHlwZXMiLCJzdWJyb3V0aW5lcyIsImdldEJhc2VUeXBlIiwic3VwZXJUeXBlIiwiZGVmaW5lTWliUHJvcGVydHkiLCJ0YXJnZXQiLCJrZXkiLCJwcm9wIiwicHJvcGVydHlLZXkiLCJSZWZsZWN0IiwiZGVmaW5lTWV0YWRhdGEiLCJzaW1wbGVUeXBlIiwiY29udmVydGVycyIsImlzUmVhZGFibGUiLCJpbmRleE9mIiwiaXNXcml0YWJsZSIsIm1pbiIsIm1heCIsIk5tc1ZhbHVlVHlwZSIsIkludDgiLCJJbnQxNiIsIkludDMyIiwiVUludDgiLCJVSW50MTYiLCJVSW50MzIiLCJwdXNoIiwiZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIiLCJwZXJjZW50Q29udmVydGVyIiwidW5kZWZpbmVkIiwiTWF0aCIsImluZm8iLCJzaXplIiwicHJlY2lzaW9uQ29udiIsImZyb20iLCJ2IiwidG8iLCJwYXJzZUludCIsIk9iamVjdCIsImVudHJpZXMiLCJtYXAiLCJjb252IiwiYSIsImIiLCJtaW5FdmFsIiwibWF4RXZhbCIsInZlcnNpb25UeXBlQ29udmVydGVyIiwiYm9vbGVhbkNvbnZlcnRlciIsIm5hbWUiLCJhdHRyaWJ1dGVzIiwiZW51bWVyYWJsZSIsImNvbnNvbGUiLCJhc3NlcnQiLCJ2YWx1ZSIsImdldEVycm9yIiwiZ2V0UmF3VmFsdWUiLCJuZXdWYWx1ZSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInNldFJhd1ZhbHVlIiwiZGVmaW5lUHJvcGVydHkiLCJnZXRNaWJGaWxlIiwibWlibmFtZSIsInBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwiRGV2aWNlUHJvdG90eXBlIiwiRXZlbnRFbWl0dGVyIiwiY29uc3RydWN0b3IiLCJtaWJmaWxlIiwibWliVmFsaWRhdGlvbiIsImRlY29kZSIsInBhcnNlIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ0b1N0cmluZyIsImlzTGVmdCIsIlBhdGhSZXBvcnRlciIsInJlcG9ydCIsIm1pYiIsImVycm9yVHlwZSIsIm1ldGFzdWJzIiwiXyIsInRyYW5zZm9ybSIsInJlc3VsdCIsInN1YiIsImRlc2NyaXB0aW9uIiwiYXJncyIsImRlc2MiLCJrZXlzIiwib3duS2V5cyIsInZhbGlkSnNOYW1lIiwiZm9yRWFjaCIsInByb3BOYW1lIiwiY29ubmVjdGlvbiIsInZhbHVlcyIsInByZXYiLCJlbWl0IiwidG9KU09OIiwianNvbiIsImdldE1ldGFkYXRhIiwiYWRkcmVzcyIsImdldElkIiwiaWRPck5hbWUiLCJpc0ludGVnZXIiLCJoYXMiLCJnZXROYW1lIiwiaW5jbHVkZXMiLCJpc0RpcnR5IiwiZXJyb3JzIiwibmV3VmFsIiwic2V0RGlydHkiLCJzZXRFcnJvciIsImVycm9yIiwiZGlydGllcyIsIm5hbWVzIiwiQWRkcmVzc1R5cGUiLCJtYWMiLCJzZXJubyIsInByZXZBZGRyZXNzIiwiQnVmZmVyIiwicGFkU3RhcnQiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJBZGRyZXNzIiwiZGV2aWNlcyIsImFkZHJlZiIsIiRjb3VudFJlZiIsInN0YWNrIiwicmVsZWFzZSIsIndpdGhvdXQiLCJkcmFpbiIsImlkcyIsImZpbHRlciIsIndyaXRlIiwiUHJvbWlzZSIsIndyaXRlQWxsIiwicmVqZWN0Iiwiam9pbiIsImludmFsaWRObXMiLCJyZXF1ZXN0cyIsInJlZHVjZSIsImFjYyIsImUiLCJtZXNzYWdlIiwiYWxsIiwiZGF0YWdyYW0iLCJzZW5kRGF0YWdyYW0iLCJ0aGVuIiwic3RhdHVzIiwiTmlidXNFcnJvciIsInJlYXNvbiIsImNvbmNhdCIsIndyaXRlVmFsdWVzIiwic291cmNlIiwic3Ryb25nIiwiVHlwZUVycm9yIiwiYXNzaWduIiwid3JpdHRlbiIsImVyciIsInJlYWRBbGwiLCIkcmVhZCIsInNvcnQiLCJyZWFkIiwiY2xlYXIiLCJmaW5hbGx5IiwiZGlzYWJsZUJhdGNoUmVhZGluZyIsImNodW5rcyIsImNodW5rIiwicHJvbWlzZSIsImRhdGFncmFtcyIsIkFycmF5IiwiaXNBcnJheSIsInVwbG9hZCIsImRvbWFpbiIsIm9mZnNldCIsInJlcVVwbG9hZCIsInBhZEVuZCIsImRvbWFpblNpemUiLCJpbml0VXBsb2FkIiwiaW5pdFN0YXQiLCJ0b3RhbCIsInJlc3QiLCJwb3MiLCJidWZzIiwidXBsb2FkU2VnbWVudCIsInVwbG9hZFN0YXR1cyIsImRhdGEiLCJkb3dubG9hZCIsImJ1ZmZlciIsIm5vVGVybSIsInJlcURvd25sb2FkIiwidGVybWluYXRlIiwidGVybVN0YXQiLCJyZXEiLCJyZXMiLCJpbml0RG93bmxvYWQiLCJjcmMiLCJjaHVua1NpemUiLCJOTVNfTUFYX0RBVEFfTEVOR1RIIiwiaSIsInNlZ21lbnREb3dubG9hZCIsImRvd25sb2FkU3RhdCIsInZlcmlmeSIsInZlcmlmeVN0YXQiLCJleGVjdXRlIiwicHJvZ3JhbSIsInN1YnJvdXRpbmUiLCJwcm9wcyIsImFyZyIsIm5vdFJlcGx5IiwiZ2V0TWliVHlwZXMiLCJjb25mIiwiY29uZmlnRGlyIiwiZXhpc3RzU3luYyIsInZhbGlkYXRlIiwiQ29uZmlnViIsIm1pYlR5cGVzIiwiZmluZE1pYkJ5VHlwZSIsInZlcnNpb24iLCJtaWJzIiwibWliVHlwZSIsImZpbmRMYXN0IiwibWluVmVyc2lvbiIsImdldENvbnN0cnVjdG9yIiwiRGV2aWNlIiwiYXBwbHkiLCJwcm90b3R5cGUiLCJjcmVhdGUiLCJkaXNwbGF5TmFtZSIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJnZXRNaWJQcm90b3R5cGUiLCJEZXZpY2VzIiwiZmxhdHRlbiIsInRhcmdldEFkZHJlc3MiLCJtaWJPclR5cGUiLCJTdHJpbmciLCJjb25zdHJ1Y3QiLCJpc0VtcHR5IiwicHJvY2VzcyIsIm5leHRUaWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFXQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7QUFnQkE7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBb0JBO0FBQ0E7QUFFQSxNQUFNQSxPQUFPLEdBQUcsZ0JBQWhCLEMsQ0FBa0M7O0FBRWxDLE1BQU1DLEtBQUssR0FBRyxvQkFBYSxlQUFiLENBQWQ7QUFFQSxNQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQyxRQUFELENBQXRCO0FBQ0EsTUFBTUMsT0FBTyxHQUFHRCxNQUFNLENBQUMsUUFBRCxDQUF0QjtBQUNBLE1BQU1FLFFBQVEsR0FBR0YsTUFBTSxDQUFDLFNBQUQsQ0FBdkI7O0FBRUEsU0FBU0csVUFBVCxDQUFvQkMsR0FBcEIs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QUdPLElBQUksT0FBT29MLFNBQVAsS0FBcUIsUUFBekIsRUFBbUM7QUFDeEM3SixNQUFBQSxHQUFHLEdBQUc4SixNQUFNLENBQUNELFNBQUQsQ0FBWjtBQUNELEtBRk0sTUFFQTtBQUNMLFlBQU0sSUFBSXBMLEtBQUosQ0FBVyw2QkFBNEJvTCxTQUFVLEVBQWpELENBQU47QUFDRDs7QUFDRCxVQUFNRCxhQUFhLEdBQUcsSUFBSS9HLGdCQUFKLENBQVl2QixPQUFaLENBQXRCLENBVnVFLENBV3ZFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxVQUFNakMsV0FBVyxHQUFHNEosY0FBYyxDQUFDakosR0FBRCxDQUFsQztBQUNBLFVBQU1oRixNQUFlLEdBQUdVLE9BQU8sQ0FBQ3FPLFNBQVIsQ0FBa0IxSyxXQUFsQixFQUErQixDQUFDdUssYUFBRCxDQUEvQixDQUF4Qjs7QUFDQSxRQUFJLENBQUNBLGFBQWEsQ0FBQ0ksT0FBbkIsRUFBNEI7QUFDMUIsWUFBTXpPLEdBQUcsR0FBR3FPLGFBQWEsQ0FBQ2hLLFFBQWQsRUFBWjtBQUNBdEgsTUFBQUEsU0FBUyxDQUFDaUQsR0FBRCxDQUFULEdBQWlCLENBQUNqRCxTQUFTLENBQUNpRCxHQUFELENBQVQsSUFBa0IsRUFBbkIsRUFBdUJrSixNQUF2QixDQUE4QnpKLE1BQTlCLENBQWpCO0FBQ0FpUCxNQUFBQSxPQUFPLENBQUNDLFFBQVIsQ0FBaUIsTUFBTSxLQUFLaEosSUFBTCxDQUFVLEtBQVYsRUFBaUJsRyxNQUFqQixDQUF2QjtBQUNEOztBQUNELFdBQU9BLE1BQVA7QUFDRDs7QUF2Q3VDOzs7QUEwQzFDLE1BQU04SCxPQUFPLEdBQUcsSUFBSTRHLE9BQUosRUFBaEI7ZUFFZTVHLE8iLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAoYykgMjAxOS4gT09PIE5hdGEtSW5mb1xuICogQGF1dGhvciBBbmRyZWkgU2FyYWtlZXYgPGF2c0BuYXRhLWluZm8ucnU+XG4gKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgdGhlIFwiQG5hdGFcIiBwcm9qZWN0LlxuICogRm9yIHRoZSBmdWxsIGNvcHlyaWdodCBhbmQgbGljZW5zZSBpbmZvcm1hdGlvbiwgcGxlYXNlIHZpZXdcbiAqIHRoZSBFVUxBIGZpbGUgdGhhdCB3YXMgZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHNvdXJjZSBjb2RlLlxuICovXG5cbi8qIHRzbGludDpkaXNhYmxlOnZhcmlhYmxlLW5hbWUgKi9cbmltcG9ydCB7IGNyYzE2Y2NpdHQgfSBmcm9tICdjcmMnO1xuaW1wb3J0IGRlYnVnRmFjdG9yeSBmcm9tICdkZWJ1Zyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHQgZnJvbSAnaW8tdHMnO1xuaW1wb3J0IHsgUGF0aFJlcG9ydGVyIH0gZnJvbSAnaW8tdHMvbGliL1BhdGhSZXBvcnRlcic7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgJ3JlZmxlY3QtbWV0YWRhdGEnO1xuaW1wb3J0IHsgY29uZmlnIGFzIGNvbmZpZ0RpciB9IGZyb20gJ3hkZy1iYXNlZGlyJztcbmltcG9ydCBBZGRyZXNzLCB7IEFkZHJlc3NQYXJhbSwgQWRkcmVzc1R5cGUgfSBmcm9tICcuLi9BZGRyZXNzJztcbmltcG9ydCB7IE5pYnVzRXJyb3IgfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHsgTk1TX01BWF9EQVRBX0xFTkdUSCB9IGZyb20gJy4uL25iY29uc3QnO1xuaW1wb3J0IHsgTmlidXNDb25uZWN0aW9uIH0gZnJvbSAnLi4vbmlidXMnO1xuaW1wb3J0IHsgY2h1bmtBcnJheSB9IGZyb20gJy4uL25pYnVzL2hlbHBlcic7XG5pbXBvcnQge1xuICBjcmVhdGVFeGVjdXRlUHJvZ3JhbUludm9jYXRpb24sXG4gIGNyZWF0ZU5tc0Rvd25sb2FkU2VnbWVudCxcbiAgY3JlYXRlTm1zSW5pdGlhdGVEb3dubG9hZFNlcXVlbmNlLFxuICBjcmVhdGVObXNJbml0aWF0ZVVwbG9hZFNlcXVlbmNlLFxuICBjcmVhdGVObXNSZWFkLFxuICBjcmVhdGVObXNSZXF1ZXN0RG9tYWluRG93bmxvYWQsXG4gIGNyZWF0ZU5tc1JlcXVlc3REb21haW5VcGxvYWQsXG4gIGNyZWF0ZU5tc1Rlcm1pbmF0ZURvd25sb2FkU2VxdWVuY2UsXG4gIGNyZWF0ZU5tc1VwbG9hZFNlZ21lbnQsXG4gIGNyZWF0ZU5tc1ZlcmlmeURvbWFpbkNoZWNrc3VtLFxuICBjcmVhdGVObXNXcml0ZSxcbiAgZ2V0Tm1zVHlwZSxcbiAgVHlwZWRWYWx1ZSxcbn0gZnJvbSAnLi4vbm1zJztcbmltcG9ydCBObXNEYXRhZ3JhbSBmcm9tICcuLi9ubXMvTm1zRGF0YWdyYW0nO1xuaW1wb3J0IE5tc1ZhbHVlVHlwZSBmcm9tICcuLi9ubXMvTm1zVmFsdWVUeXBlJztcbmltcG9ydCB7IENvbmZpZywgQ29uZmlnViB9IGZyb20gJy4uL3Nlc3Npb24vY29tbW9uJztcbmltcG9ydCB0aW1laWQgZnJvbSAnLi4vdGltZWlkJztcbmltcG9ydCB7XG4gIGJvb2xlYW5Db252ZXJ0ZXIsXG4gIGNvbnZlcnRGcm9tLFxuICBjb252ZXJ0VG8sXG4gIGVudW1lcmF0aW9uQ29udmVydGVyLCBldmFsQ29udmVydGVyLFxuICBmaXhlZFBvaW50TnVtYmVyNENvbnZlcnRlcixcbiAgZ2V0SW50U2l6ZSxcbiAgSUNvbnZlcnRlcixcbiAgbWF4SW5jbHVzaXZlQ29udmVydGVyLFxuICBtaW5JbmNsdXNpdmVDb252ZXJ0ZXIsXG4gIHBhY2tlZDhmbG9hdENvbnZlcnRlcixcbiAgcGVyY2VudENvbnZlcnRlcixcbiAgcHJlY2lzaW9uQ29udmVydGVyLFxuICByZXByZXNlbnRhdGlvbkNvbnZlcnRlcixcbiAgdG9JbnQsXG4gIHVuaXRDb252ZXJ0ZXIsXG4gIHZhbGlkSnNOYW1lLFxuICB2ZXJzaW9uVHlwZUNvbnZlcnRlcixcbiAgd2l0aFZhbHVlLFxufSBmcm9tICcuL21pYic7XG4vLyBpbXBvcnQgeyBnZXRNaWJzU3luYyB9IGZyb20gJy4vbWliMmpzb24nO1xuLy8gaW1wb3J0IGRldGVjdG9yIGZyb20gJy4uL3NlcnZpY2UvZGV0ZWN0b3InO1xuXG5jb25zdCBwa2dOYW1lID0gJ0BuYXRhL25pYnVzLmpzJzsgLy8gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcblxuY29uc3QgZGVidWcgPSBkZWJ1Z0ZhY3RvcnkoJ25pYnVzOmRldmljZXMnKTtcblxuY29uc3QgJHZhbHVlcyA9IFN5bWJvbCgndmFsdWVzJyk7XG5jb25zdCAkZXJyb3JzID0gU3ltYm9sKCdlcnJvcnMnKTtcbmNvbnN0ICRkaXJ0aWVzID0gU3ltYm9sKCdkaXJ0aWVzJyk7XG5cbmZ1bmN0aW9uIHNhZmVOdW1iZXIodmFsOiBhbnkpIHtcbiAgY29uc3QgbnVtID0gcGFyc2VGbG9hdCh2YWwpO1xuICByZXR1cm4gKE51bWJlci5pc05hTihudW0pIHx8IGAke251bX1gICE9PSB2YWwpID8gdmFsIDogbnVtO1xufVxuXG5lbnVtIFByaXZhdGVQcm9wcyB7XG4gIGNvbm5lY3Rpb24gPSAtMSxcbn1cblxuY29uc3QgZGV2aWNlTWFwOiB7IFthZGRyZXNzOiBzdHJpbmddOiBJRGV2aWNlW10gfSA9IHt9O1xuXG5jb25zdCBtaWJUeXBlc0NhY2hlOiB7IFttaWJuYW1lOiBzdHJpbmddOiBGdW5jdGlvbiB9ID0ge307XG5cbmNvbnN0IE1pYlByb3BlcnR5QXBwSW5mb1YgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgbm1zX2lkOiB0LnVuaW9uKFt0LnN0cmluZywgdC5JbnRdKSxcbiAgICBhY2Nlc3M6IHQuc3RyaW5nLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBjYXRlZ29yeTogdC5zdHJpbmcsXG4gIH0pLFxuXSk7XG5cbi8vIGludGVyZmFjZSBJTWliUHJvcGVydHlBcHBJbmZvIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYlByb3BlcnR5QXBwSW5mb1Y+IHt9XG5cbmNvbnN0IE1pYlByb3BlcnR5ViA9IHQudHlwZSh7XG4gIHR5cGU6IHQuc3RyaW5nLFxuICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgYXBwaW5mbzogTWliUHJvcGVydHlBcHBJbmZvVixcbn0pO1xuXG5pbnRlcmZhY2UgSU1pYlByb3BlcnR5IGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYlByb3BlcnR5Vj4ge1xuICAvLyBhcHBpbmZvOiBJTWliUHJvcGVydHlBcHBJbmZvO1xufVxuXG5jb25zdCBNaWJEZXZpY2VBcHBJbmZvViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBtaWJfdmVyc2lvbjogdC5zdHJpbmcsXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIGRldmljZV90eXBlOiB0LnN0cmluZyxcbiAgICBsb2FkZXJfdHlwZTogdC5zdHJpbmcsXG4gICAgZmlybXdhcmU6IHQuc3RyaW5nLFxuICAgIG1pbl92ZXJzaW9uOiB0LnN0cmluZyxcbiAgfSksXG5dKTtcblxuY29uc3QgTWliRGV2aWNlVHlwZVYgPSB0LnR5cGUoe1xuICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgYXBwaW5mbzogTWliRGV2aWNlQXBwSW5mb1YsXG4gIHByb3BlcnRpZXM6IHQucmVjb3JkKHQuc3RyaW5nLCBNaWJQcm9wZXJ0eVYpLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSU1pYkRldmljZVR5cGUgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliRGV2aWNlVHlwZVY+IHt9XG5cbmNvbnN0IE1pYlR5cGVWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGJhc2U6IHQuc3RyaW5nLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBhcHBpbmZvOiB0LnBhcnRpYWwoe1xuICAgICAgemVybzogdC5zdHJpbmcsXG4gICAgICB1bml0czogdC5zdHJpbmcsXG4gICAgICBwcmVjaXNpb246IHQuc3RyaW5nLFxuICAgICAgcmVwcmVzZW50YXRpb246IHQuc3RyaW5nLFxuICAgICAgZ2V0OiB0LnN0cmluZyxcbiAgICAgIHNldDogdC5zdHJpbmcsXG4gICAgfSksXG4gICAgbWluSW5jbHVzaXZlOiB0LnN0cmluZyxcbiAgICBtYXhJbmNsdXNpdmU6IHQuc3RyaW5nLFxuICAgIGVudW1lcmF0aW9uOiB0LnJlY29yZCh0LnN0cmluZywgdC50eXBlKHsgYW5ub3RhdGlvbjogdC5zdHJpbmcgfSkpLFxuICB9KSxcbl0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElNaWJUeXBlIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYlR5cGVWPiB7fVxuXG5jb25zdCBNaWJTdWJyb3V0aW5lViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgICBhcHBpbmZvOiB0LmludGVyc2VjdGlvbihbXG4gICAgICB0LnR5cGUoeyBubXNfaWQ6IHQudW5pb24oW3Quc3RyaW5nLCB0LkludF0pIH0pLFxuICAgICAgdC5wYXJ0aWFsKHsgcmVzcG9uc2U6IHQuc3RyaW5nIH0pLFxuICAgIF0pLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBwcm9wZXJ0aWVzOiB0LnJlY29yZCh0LnN0cmluZywgdC50eXBlKHtcbiAgICAgIHR5cGU6IHQuc3RyaW5nLFxuICAgICAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gICAgfSkpLFxuICB9KSxcbl0pO1xuXG5jb25zdCBTdWJyb3V0aW5lVHlwZVYgPSB0LnR5cGUoe1xuICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgcHJvcGVydGllczogdC50eXBlKHtcbiAgICBpZDogdC50eXBlKHtcbiAgICAgIHR5cGU6IHQubGl0ZXJhbCgneHM6dW5zaWduZWRTaG9ydCcpLFxuICAgICAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gICAgfSksXG4gIH0pLFxufSk7XG5cbmV4cG9ydCBjb25zdCBNaWJEZXZpY2VWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGRldmljZTogdC5zdHJpbmcsXG4gICAgdHlwZXM6IHQucmVjb3JkKHQuc3RyaW5nLCB0LnVuaW9uKFtNaWJEZXZpY2VUeXBlViwgTWliVHlwZVYsIFN1YnJvdXRpbmVUeXBlVl0pKSxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgc3Vicm91dGluZXM6IHQucmVjb3JkKHQuc3RyaW5nLCBNaWJTdWJyb3V0aW5lViksXG4gIH0pLFxuXSk7XG5cbmludGVyZmFjZSBJTWliRGV2aWNlIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYkRldmljZVY+IHt9XG5cbnR5cGUgTGlzdGVuZXI8VD4gPSAoYXJnOiBUKSA9PiB2b2lkO1xudHlwZSBDaGFuZ2VBcmcgPSB7IGlkOiBudW1iZXIsIG5hbWVzOiBzdHJpbmdbXSB9O1xuZXhwb3J0IHR5cGUgQ2hhbmdlTGlzdGVuZXIgPSBMaXN0ZW5lcjxDaGFuZ2VBcmc+O1xudHlwZSBVcGxvYWRTdGFydEFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGRvbWFpblNpemU6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgVXBsb2FkU3RhcnRMaXN0ZW5lciA9IExpc3RlbmVyPFVwbG9hZFN0YXJ0QXJnPjtcbnR5cGUgVXBsb2FkRGF0YUFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGRhdGE6IEJ1ZmZlciwgcG9zOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIFVwbG9hZERhdGFMaXN0ZW5lciA9IExpc3RlbmVyPFVwbG9hZERhdGFBcmc+O1xudHlwZSBVcGxvYWRGaW5pc2hBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBvZmZzZXQ6IG51bWJlciwgZGF0YTogQnVmZmVyIH07XG5leHBvcnQgdHlwZSBVcGxvYWRGaW5pc2hMaXN0ZW5lciA9IExpc3RlbmVyPFVwbG9hZEZpbmlzaEFyZz47XG50eXBlIERvd25sb2FkU3RhcnRBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBkb21haW5TaXplOiBudW1iZXIsIG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIERvd25sb2FkU3RhcnRMaXN0ZW5lciA9IExpc3RlbmVyPERvd25sb2FkU3RhcnRBcmc+O1xudHlwZSBEb3dubG9hZERhdGFBcmcgPSB7IGRvbWFpbjogc3RyaW5nLCBsZW5ndGg6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgRG93bmxvYWREYXRhTGlzdGVuZXIgPSBMaXN0ZW5lcjxEb3dubG9hZERhdGFBcmc+O1xudHlwZSBEb3dubG9hZEZpbmlzaEFyZyA9IHsgZG9tYWluOiBzdHJpbmc7IG9mZnNldDogbnVtYmVyLCBzaXplOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIERvd25sb2FkRmluaXNoTGlzdGVuZXIgPSBMaXN0ZW5lcjxEb3dubG9hZEZpbmlzaEFyZz47XG5leHBvcnQgdHlwZSBEZXZpY2VJZCA9IHN0cmluZyAmIHsgX19icmFuZDogJ0RldmljZUlkJyB9O1xuXG5leHBvcnQgaW50ZXJmYWNlIElEZXZpY2Uge1xuICByZWFkb25seSBpZDogRGV2aWNlSWQ7XG4gIHJlYWRvbmx5IGFkZHJlc3M6IEFkZHJlc3M7XG4gIGRyYWluKCk6IFByb21pc2U8bnVtYmVyW10+O1xuICB3cml0ZSguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTxudW1iZXJbXT47XG4gIHJlYWQoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8eyBbbmFtZTogc3RyaW5nXTogYW55IH0+O1xuICB1cGxvYWQoZG9tYWluOiBzdHJpbmcsIG9mZnNldD86IG51bWJlciwgc2l6ZT86IG51bWJlcik6IFByb21pc2U8QnVmZmVyPjtcbiAgZG93bmxvYWQoZG9tYWluOiBzdHJpbmcsIGRhdGE6IEJ1ZmZlciwgb2Zmc2V0PzogbnVtYmVyLCBub1Rlcm0/OiBib29sZWFuKTogUHJvbWlzZTx2b2lkPjtcbiAgZXhlY3V0ZShcbiAgICBwcm9ncmFtOiBzdHJpbmcsXG4gICAgYXJncz86IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPE5tc0RhdGFncmFtIHwgTm1zRGF0YWdyYW1bXSB8IHVuZGVmaW5lZD47XG4gIGNvbm5lY3Rpb24/OiBOaWJ1c0Nvbm5lY3Rpb247XG4gIHJlbGVhc2UoKTogbnVtYmVyO1xuICBnZXRJZChpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogbnVtYmVyO1xuICBnZXROYW1lKGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBzdHJpbmc7XG4gIGdldFJhd1ZhbHVlKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnk7XG4gIGdldEVycm9yKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnk7XG4gIGlzRGlydHkoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IGJvb2xlYW47XG4gIFttaWJQcm9wZXJ0eTogc3RyaW5nXTogYW55O1xuXG4gIG9uKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIG9uKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb24oZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIG9uY2UoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gb25jZShldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIGFkZExpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIG9mZihldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyBvZmYoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBsaXN0ZW5lcjogQ2hhbmdlTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogVXBsb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRmluaXNoJywgbGlzdGVuZXI6IERvd25sb2FkRmluaXNoTGlzdGVuZXIpOiB0aGlzO1xuXG4gIGVtaXQoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcpOiBib29sZWFuO1xuICAvLyBlbWl0KGV2ZW50OiAnc2Vybm8nKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2NoYW5naW5nJyB8ICdjaGFuZ2VkJywgYXJnOiBDaGFuZ2VBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAndXBsb2FkU3RhcnQnLCBhcmc6IFVwbG9hZFN0YXJ0QXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ3VwbG9hZERhdGEnLCBhcmc6IFVwbG9hZERhdGFBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAndXBsb2FkRmluaXNoJywgYXJnOiBVcGxvYWRGaW5pc2hBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGFyZzogRG93bmxvYWRTdGFydEFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBhcmc6IERvd25sb2FkRGF0YUFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdkb3dubG9hZEZpbmlzaCcsIGFyZzogRG93bmxvYWRGaW5pc2hBcmcpOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgSVN1YnJvdXRpbmVEZXNjIHtcbiAgaWQ6IG51bWJlcjtcbiAgLy8gbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBub3RSZXBseT86IGJvb2xlYW47XG4gIGFyZ3M/OiB7IG5hbWU6IHN0cmluZywgdHlwZTogTm1zVmFsdWVUeXBlLCBkZXNjPzogc3RyaW5nIH1bXTtcbn1cblxuaW50ZXJmYWNlIElQcm9wZXJ0eURlc2NyaXB0b3I8T3duZXI+IHtcbiAgY29uZmlndXJhYmxlPzogYm9vbGVhbjtcbiAgZW51bWVyYWJsZT86IGJvb2xlYW47XG4gIHZhbHVlPzogYW55O1xuICB3cml0YWJsZT86IGJvb2xlYW47XG5cbiAgZ2V0Pyh0aGlzOiBPd25lcik6IGFueTtcblxuICBzZXQ/KHRoaXM6IE93bmVyLCB2OiBhbnkpOiB2b2lkO1xufVxuXG5mdW5jdGlvbiBnZXRCYXNlVHlwZSh0eXBlczogSU1pYkRldmljZVsndHlwZXMnXSwgdHlwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IGJhc2UgPSB0eXBlO1xuICBmb3IgKGxldCBzdXBlclR5cGU6IElNaWJUeXBlID0gdHlwZXNbYmFzZV0gYXMgSU1pYlR5cGU7IHN1cGVyVHlwZSAhPSBudWxsO1xuICAgICAgIHN1cGVyVHlwZSA9IHR5cGVzW3N1cGVyVHlwZS5iYXNlXSBhcyBJTWliVHlwZSkge1xuICAgIGJhc2UgPSBzdXBlclR5cGUuYmFzZTtcbiAgfVxuICByZXR1cm4gYmFzZTtcbn1cblxuZnVuY3Rpb24gZGVmaW5lTWliUHJvcGVydHkoXG4gIHRhcmdldDogRGV2aWNlUHJvdG90eXBlLFxuICBrZXk6IHN0cmluZyxcbiAgdHlwZXM6IElNaWJEZXZpY2VbJ3R5cGVzJ10sXG4gIHByb3A6IElNaWJQcm9wZXJ0eSk6IFtudW1iZXIsIHN0cmluZ10ge1xuICBjb25zdCBwcm9wZXJ0eUtleSA9IHZhbGlkSnNOYW1lKGtleSk7XG4gIGNvbnN0IHsgYXBwaW5mbyB9ID0gcHJvcDtcbiAgY29uc3QgaWQgPSB0b0ludChhcHBpbmZvLm5tc19pZCk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2lkJywgaWQsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBjb25zdCBzaW1wbGVUeXBlID0gZ2V0QmFzZVR5cGUodHlwZXMsIHByb3AudHlwZSk7XG4gIGNvbnN0IHR5cGUgPSB0eXBlc1twcm9wLnR5cGVdIGFzIElNaWJUeXBlO1xuICBjb25zdCBjb252ZXJ0ZXJzOiBJQ29udmVydGVyW10gPSBbXTtcbiAgY29uc3QgaXNSZWFkYWJsZSA9IGFwcGluZm8uYWNjZXNzLmluZGV4T2YoJ3InKSA+IC0xO1xuICBjb25zdCBpc1dyaXRhYmxlID0gYXBwaW5mby5hY2Nlc3MuaW5kZXhPZigndycpID4gLTE7XG4gIGxldCBlbnVtZXJhdGlvbjogSU1pYlR5cGVbJ2VudW1lcmF0aW9uJ10gfCB1bmRlZmluZWQ7XG4gIGxldCBtaW46IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgbGV0IG1heDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBzd2l0Y2ggKGdldE5tc1R5cGUoc2ltcGxlVHlwZSkpIHtcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5JbnQ4OlxuICAgICAgbWluID0gLTEyODtcbiAgICAgIG1heCA9IDEyNztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLkludDE2OlxuICAgICAgbWluID0gLTMyNzY4O1xuICAgICAgbWF4ID0gMzI3Njc7XG4gICAgICBicmVhaztcbiAgICBjYXNlIE5tc1ZhbHVlVHlwZS5JbnQzMjpcbiAgICAgIG1pbiA9IC0yMTQ3NDgzNjQ4O1xuICAgICAgbWF4ID0gMjE0NzQ4MzY0NztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLlVJbnQ4OlxuICAgICAgbWluID0gMDtcbiAgICAgIG1heCA9IDI1NTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLlVJbnQxNjpcbiAgICAgIG1pbiA9IDA7XG4gICAgICBtYXggPSA2NTUzNTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLlVJbnQzMjpcbiAgICAgIG1pbiA9IDA7XG4gICAgICBtYXggPSA0Mjk0OTY3Mjk1O1xuICAgICAgYnJlYWs7XG4gIH1cbiAgc3dpdGNoIChzaW1wbGVUeXBlKSB7XG4gICAgY2FzZSAncGFja2VkOEZsb2F0JzpcbiAgICAgIGNvbnZlcnRlcnMucHVzaChwYWNrZWQ4ZmxvYXRDb252ZXJ0ZXIodHlwZSkpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnZml4ZWRQb2ludE51bWJlcjQnOlxuICAgICAgY29udmVydGVycy5wdXNoKGZpeGVkUG9pbnROdW1iZXI0Q29udmVydGVyKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuICBpZiAoa2V5ID09PSAnYnJpZ2h0bmVzcycgJiYgcHJvcC50eXBlID09PSAneHM6dW5zaWduZWRCeXRlJykge1xuICAgIC8vIGNvbnNvbGUubG9nKCd1U0UgUEVSQ0VOVCAxMDA8LT4yNTAnKTtcbiAgICBjb252ZXJ0ZXJzLnB1c2gocGVyY2VudENvbnZlcnRlcik7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgndW5pdCcsICclJywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWluJywgMCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWF4JywgMTAwLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICBtaW4gPSBtYXggPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAoaXNXcml0YWJsZSkge1xuICAgIGlmICh0eXBlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHsgbWluSW5jbHVzaXZlLCBtYXhJbmNsdXNpdmUgfSA9IHR5cGU7XG4gICAgICBpZiAobWluSW5jbHVzaXZlKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQobWluSW5jbHVzaXZlKTtcbiAgICAgICAgbWluID0gbWluICE9PSB1bmRlZmluZWQgPyBNYXRoLm1heChtaW4sIHZhbCkgOiB2YWw7XG4gICAgICB9XG4gICAgICBpZiAobWF4SW5jbHVzaXZlKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQobWF4SW5jbHVzaXZlKTtcbiAgICAgICAgbWF4ID0gbWF4ICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbihtYXgsIHZhbCkgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtaW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWluID0gY29udmVydFRvKGNvbnZlcnRlcnMpKG1pbikgYXMgbnVtYmVyO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWluJywgbWluLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgaWYgKG1heCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBtYXggPSBjb252ZXJ0VG8oY29udmVydGVycykobWF4KSBhcyBudW1iZXI7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtYXgnLCBtYXgsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgfVxuICBpZiAodHlwZSAhPSBudWxsKSB7XG4gICAgY29uc3QgeyBhcHBpbmZvOiBpbmZvID0ge30gfSA9IHR5cGU7XG4gICAgZW51bWVyYXRpb24gPSB0eXBlLmVudW1lcmF0aW9uO1xuICAgIGNvbnN0IHsgdW5pdHMsIHByZWNpc2lvbiwgcmVwcmVzZW50YXRpb24sIGdldCwgc2V0IH0gPSBpbmZvO1xuICAgIGNvbnN0IHNpemUgPSBnZXRJbnRTaXplKHNpbXBsZVR5cGUpO1xuICAgIGlmICh1bml0cykge1xuICAgICAgY29udmVydGVycy5wdXNoKHVuaXRDb252ZXJ0ZXIodW5pdHMpKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3VuaXQnLCB1bml0cywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIGxldCBwcmVjaXNpb25Db252OiBJQ29udmVydGVyID0ge1xuICAgICAgZnJvbTogdiA9PiB2LFxuICAgICAgdG86IHYgPT4gdixcbiAgICB9O1xuICAgIGlmIChwcmVjaXNpb24pIHtcbiAgICAgIHByZWNpc2lvbkNvbnYgPSBwcmVjaXNpb25Db252ZXJ0ZXIocHJlY2lzaW9uKTtcbiAgICAgIGNvbnZlcnRlcnMucHVzaChwcmVjaXNpb25Db252KTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3N0ZXAnLCAxIC8gKDEwICoqIHBhcnNlSW50KHByZWNpc2lvbiwgMTApKSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIGlmIChlbnVtZXJhdGlvbikge1xuICAgICAgY29udmVydGVycy5wdXNoKGVudW1lcmF0aW9uQ29udmVydGVyKGVudW1lcmF0aW9uKSk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdlbnVtJywgT2JqZWN0LmVudHJpZXMoZW51bWVyYXRpb24pXG4gICAgICAgIC5tYXAoKFtrZXksIHZhbF0pID0+IFtcbiAgICAgICAgICB2YWwhLmFubm90YXRpb24sXG4gICAgICAgICAgdG9JbnQoa2V5KSxcbiAgICAgICAgXSksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgICByZXByZXNlbnRhdGlvbiAmJiBzaXplICYmIGNvbnZlcnRlcnMucHVzaChyZXByZXNlbnRhdGlvbkNvbnZlcnRlcihyZXByZXNlbnRhdGlvbiwgc2l6ZSkpO1xuICAgIGlmIChnZXQgJiYgc2V0KSB7XG4gICAgICBjb25zdCBjb252ID0gZXZhbENvbnZlcnRlcihnZXQsIHNldCk7XG4gICAgICBjb252ZXJ0ZXJzLnB1c2goY29udik7XG4gICAgICBjb25zdCBbYSwgYl0gPSBbY29udi50byhtaW4pLCBjb252LnRvKG1heCldO1xuICAgICAgY29uc3QgbWluRXZhbCA9IHBhcnNlRmxvYXQocHJlY2lzaW9uQ29udi50byhNYXRoLm1pbihhLCBiKSkgYXMgc3RyaW5nKTtcbiAgICAgIGNvbnN0IG1heEV2YWwgPSBwYXJzZUZsb2F0KHByZWNpc2lvbkNvbnYudG8oTWF0aC5tYXgoYSwgYikpIGFzIHN0cmluZyk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaW4nLCBtaW5FdmFsLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21heCcsIG1heEV2YWwsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgfVxuICBpZiAobWluICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb252ZXJ0ZXJzLnB1c2gobWluSW5jbHVzaXZlQ29udmVydGVyKG1pbikpO1xuICB9XG4gIGlmIChtYXggIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnZlcnRlcnMucHVzaChtYXhJbmNsdXNpdmVDb252ZXJ0ZXIobWF4KSk7XG4gIH1cblxuICBpZiAocHJvcC50eXBlID09PSAndmVyc2lvblR5cGUnKSB7XG4gICAgY29udmVydGVycy5wdXNoKHZlcnNpb25UeXBlQ29udmVydGVyKTtcbiAgfVxuICBpZiAoc2ltcGxlVHlwZSA9PT0gJ3hzOmJvb2xlYW4nICYmICFlbnVtZXJhdGlvbikge1xuICAgIGNvbnZlcnRlcnMucHVzaChib29sZWFuQ29udmVydGVyKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdlbnVtJywgW1sn0JTQsCcsIHRydWVdLCBbJ9Cd0LXRgicsIGZhbHNlXV0sIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICB9XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2lzV3JpdGFibGUnLCBpc1dyaXRhYmxlLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnaXNSZWFkYWJsZScsIGlzUmVhZGFibGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCd0eXBlJywgcHJvcC50eXBlLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnc2ltcGxlVHlwZScsIHNpbXBsZVR5cGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKFxuICAgICdkaXNwbGF5TmFtZScsXG4gICAgcHJvcC5hbm5vdGF0aW9uID8gcHJvcC5hbm5vdGF0aW9uIDogbmFtZSxcbiAgICB0YXJnZXQsXG4gICAgcHJvcGVydHlLZXksXG4gICk7XG4gIGFwcGluZm8uY2F0ZWdvcnkgJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnY2F0ZWdvcnknLCBhcHBpbmZvLmNhdGVnb3J5LCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbm1zVHlwZScsIGdldE5tc1R5cGUoc2ltcGxlVHlwZSksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBjb25zdCBhdHRyaWJ1dGVzOiBJUHJvcGVydHlEZXNjcmlwdG9yPERldmljZVByb3RvdHlwZT4gPSB7XG4gICAgZW51bWVyYWJsZTogaXNSZWFkYWJsZSxcbiAgfTtcbiAgY29uc3QgdG8gPSBjb252ZXJ0VG8oY29udmVydGVycyk7XG4gIGNvbnN0IGZyb20gPSBjb252ZXJ0RnJvbShjb252ZXJ0ZXJzKTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnY29udmVydFRvJywgdG8sIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjb252ZXJ0RnJvbScsIGZyb20sIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBhdHRyaWJ1dGVzLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLmFzc2VydChSZWZsZWN0LmdldCh0aGlzLCAnJGNvdW50UmVmJykgPiAwLCAnRGV2aWNlIHdhcyByZWxlYXNlZCcpO1xuICAgIGxldCB2YWx1ZTtcbiAgICBpZiAoIXRoaXMuZ2V0RXJyb3IoaWQpKSB7XG4gICAgICB2YWx1ZSA9IHRvKHRoaXMuZ2V0UmF3VmFsdWUoaWQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuICBpZiAoaXNXcml0YWJsZSkge1xuICAgIGF0dHJpYnV0ZXMuc2V0ID0gZnVuY3Rpb24gKG5ld1ZhbHVlOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuYXNzZXJ0KFJlZmxlY3QuZ2V0KHRoaXMsICckY291bnRSZWYnKSA+IDAsICdEZXZpY2Ugd2FzIHJlbGVhc2VkJyk7XG4gICAgICBjb25zdCB2YWx1ZSA9IGZyb20obmV3VmFsdWUpO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgTnVtYmVyLmlzTmFOKHZhbHVlIGFzIG51bWJlcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHZhbHVlOiAke0pTT04uc3RyaW5naWZ5KG5ld1ZhbHVlKX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0UmF3VmFsdWUoaWQsIHZhbHVlKTtcbiAgICB9O1xuICB9XG4gIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eUtleSwgYXR0cmlidXRlcyk7XG4gIHJldHVybiBbaWQsIHByb3BlcnR5S2V5XTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1pYkZpbGUobWlibmFtZTogc3RyaW5nKSB7XG4gIHJldHVybiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbWlicy8nLCBgJHttaWJuYW1lfS5taWIuanNvbmApO1xufVxuXG5jbGFzcyBEZXZpY2VQcm90b3R5cGUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIgaW1wbGVtZW50cyBJRGV2aWNlIHtcbiAgLy8gd2lsbCBiZSBvdmVycmlkZSBmb3IgYW4gaW5zdGFuY2VcbiAgJGNvdW50UmVmID0gMTtcblxuICAvLyBwcml2YXRlICRkZWJvdW5jZURyYWluID0gXy5kZWJvdW5jZSh0aGlzLmRyYWluLCAyNSk7XG5cbiAgY29uc3RydWN0b3IobWlibmFtZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoKTtcbiAgICBjb25zdCBtaWJmaWxlID0gZ2V0TWliRmlsZShtaWJuYW1lKTtcbiAgICBjb25zdCBtaWJWYWxpZGF0aW9uID0gTWliRGV2aWNlVi5kZWNvZGUoSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobWliZmlsZSkudG9TdHJpbmcoKSkpO1xuICAgIGlmIChtaWJWYWxpZGF0aW9uLmlzTGVmdCgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgbWliIGZpbGUgJHttaWJmaWxlfSAke1BhdGhSZXBvcnRlci5yZXBvcnQobWliVmFsaWRhdGlvbil9YCk7XG4gICAgfVxuICAgIGNvbnN0IG1pYiA9IG1pYlZhbGlkYXRpb24udmFsdWU7XG4gICAgY29uc3QgeyB0eXBlcywgc3Vicm91dGluZXMgfSA9IG1pYjtcbiAgICBjb25zdCBkZXZpY2UgPSB0eXBlc1ttaWIuZGV2aWNlXSBhcyBJTWliRGV2aWNlVHlwZTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaWInLCBtaWJuYW1lLCB0aGlzKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaWJmaWxlJywgbWliZmlsZSwgdGhpcyk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnYW5ub3RhdGlvbicsIGRldmljZS5hbm5vdGF0aW9uLCB0aGlzKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaWJWZXJzaW9uJywgZGV2aWNlLmFwcGluZm8ubWliX3ZlcnNpb24sIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2RldmljZVR5cGUnLCB0b0ludChkZXZpY2UuYXBwaW5mby5kZXZpY2VfdHlwZSksIHRoaXMpO1xuICAgIGRldmljZS5hcHBpbmZvLmxvYWRlcl90eXBlICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2xvYWRlclR5cGUnLFxuICAgICAgdG9JbnQoZGV2aWNlLmFwcGluZm8ubG9hZGVyX3R5cGUpLCB0aGlzLFxuICAgICk7XG4gICAgZGV2aWNlLmFwcGluZm8uZmlybXdhcmUgJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZmlybXdhcmUnLFxuICAgICAgZGV2aWNlLmFwcGluZm8uZmlybXdhcmUsIHRoaXMsXG4gICAgKTtcbiAgICBkZXZpY2UuYXBwaW5mby5taW5fdmVyc2lvbiAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtaW5fdmVyc2lvbicsXG4gICAgICBkZXZpY2UuYXBwaW5mby5taW5fdmVyc2lvbiwgdGhpcyxcbiAgICApO1xuICAgIHR5cGVzLmVycm9yVHlwZSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKFxuICAgICAgJ2Vycm9yVHlwZScsICh0eXBlcy5lcnJvclR5cGUgYXMgSU1pYlR5cGUpLmVudW1lcmF0aW9uLCB0aGlzKTtcblxuICAgIGlmIChzdWJyb3V0aW5lcykge1xuICAgICAgY29uc3QgbWV0YXN1YnMgPSBfLnRyYW5zZm9ybShcbiAgICAgICAgc3Vicm91dGluZXMsXG4gICAgICAgIChyZXN1bHQsIHN1YiwgbmFtZSkgPT4ge1xuICAgICAgICAgIHJlc3VsdFtuYW1lXSA9IHtcbiAgICAgICAgICAgIGlkOiB0b0ludChzdWIuYXBwaW5mby5ubXNfaWQpLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IHN1Yi5hbm5vdGF0aW9uLFxuICAgICAgICAgICAgYXJnczogc3ViLnByb3BlcnRpZXMgJiYgT2JqZWN0LmVudHJpZXMoc3ViLnByb3BlcnRpZXMpXG4gICAgICAgICAgICAgIC5tYXAoKFtuYW1lLCBwcm9wXSkgPT4gKHtcbiAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgIHR5cGU6IGdldE5tc1R5cGUocHJvcC50eXBlKSxcbiAgICAgICAgICAgICAgICBkZXNjOiBwcm9wLmFubm90YXRpb24sXG4gICAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0sXG4gICAgICAgIHt9IGFzIFJlY29yZDxzdHJpbmcsIElTdWJyb3V0aW5lRGVzYz4sXG4gICAgICApO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnc3Vicm91dGluZXMnLCBtZXRhc3VicywgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gVE9ETzogY2F0ZWdvcnlcbiAgICAvLyBjb25zdCBtaWJDYXRlZ29yeSA9IF8uZmluZChkZXRlY3Rvci5kZXRlY3Rpb24hLm1pYkNhdGVnb3JpZXMsIHsgbWliOiBtaWJuYW1lIH0pO1xuICAgIC8vIGlmIChtaWJDYXRlZ29yeSkge1xuICAgIC8vICAgY29uc3QgeyBjYXRlZ29yeSwgZGlzYWJsZUJhdGNoUmVhZGluZyB9ID0gbWliQ2F0ZWdvcnk7XG4gICAgLy8gICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjYXRlZ29yeScsIGNhdGVnb3J5LCB0aGlzKTtcbiAgICAvLyAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2Rpc2FibGVCYXRjaFJlYWRpbmcnLCAhIWRpc2FibGVCYXRjaFJlYWRpbmcsIHRoaXMpO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IGtleXMgPSBSZWZsZWN0Lm93bktleXMoZGV2aWNlLnByb3BlcnRpZXMpIGFzIHN0cmluZ1tdO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYlByb3BlcnRpZXMnLCBrZXlzLm1hcCh2YWxpZEpzTmFtZSksIHRoaXMpO1xuICAgIGNvbnN0IG1hcDogeyBbaWQ6IG51bWJlcl06IHN0cmluZ1tdIH0gPSB7fTtcbiAgICBrZXlzLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBbaWQsIHByb3BOYW1lXSA9IGRlZmluZU1pYlByb3BlcnR5KHRoaXMsIGtleSwgdHlwZXMsIGRldmljZS5wcm9wZXJ0aWVzW2tleV0pO1xuICAgICAgaWYgKCFtYXBbaWRdKSB7XG4gICAgICAgIG1hcFtpZF0gPSBbcHJvcE5hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWFwW2lkXS5wdXNoKHByb3BOYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdtYXAnLCBtYXAsIHRoaXMpO1xuICB9XG5cbiAgcHVibGljIGdldCBjb25uZWN0aW9uKCk6IE5pYnVzQ29ubmVjdGlvbiB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICByZXR1cm4gdmFsdWVzW1ByaXZhdGVQcm9wcy5jb25uZWN0aW9uXTtcbiAgfVxuXG4gIHB1YmxpYyBzZXQgY29ubmVjdGlvbih2YWx1ZTogTmlidXNDb25uZWN0aW9uIHwgdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICBjb25zdCBwcmV2ID0gdmFsdWVzW1ByaXZhdGVQcm9wcy5jb25uZWN0aW9uXTtcbiAgICBpZiAocHJldiA9PT0gdmFsdWUpIHJldHVybjtcbiAgICB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dID0gdmFsdWU7XG4gICAgLyoqXG4gICAgICogRGV2aWNlIGNvbm5lY3RlZCBldmVudFxuICAgICAqIEBldmVudCBJRGV2aWNlI2Nvbm5lY3RlZFxuICAgICAqIEBldmVudCBJRGV2aWNlI2Rpc2Nvbm5lY3RlZFxuICAgICAqL1xuICAgIHRoaXMuZW1pdCh2YWx1ZSAhPSBudWxsID8gJ2Nvbm5lY3RlZCcgOiAnZGlzY29ubmVjdGVkJyk7XG4gICAgLy8gaWYgKHZhbHVlKSB7XG4gICAgLy8gICB0aGlzLmRyYWluKCkuY2F0Y2goKCkgPT4ge30pO1xuICAgIC8vIH1cbiAgfVxuXG4gIC8vIG5vaW5zcGVjdGlvbiBKU1VudXNlZEdsb2JhbFN5bWJvbHNcbiAgcHVibGljIHRvSlNPTigpOiBhbnkge1xuICAgIGNvbnN0IGpzb246IGFueSA9IHtcbiAgICAgIG1pYjogUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgdGhpcyksXG4gICAgfTtcbiAgICBjb25zdCBrZXlzOiBzdHJpbmdbXSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYlByb3BlcnRpZXMnLCB0aGlzKTtcbiAgICBrZXlzLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgaWYgKHRoaXNba2V5XSAhPT0gdW5kZWZpbmVkKSBqc29uW2tleV0gPSB0aGlzW2tleV07XG4gICAgfSk7XG4gICAganNvbi5hZGRyZXNzID0gdGhpcy5hZGRyZXNzLnRvU3RyaW5nKCk7XG4gICAgcmV0dXJuIGpzb247XG4gIH1cblxuICBwdWJsaWMgZ2V0SWQoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IG51bWJlciB7XG4gICAgbGV0IGlkOiBudW1iZXI7XG4gICAgaWYgKHR5cGVvZiBpZE9yTmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlkID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaWQnLCB0aGlzLCBpZE9yTmFtZSk7XG4gICAgICBpZiAoTnVtYmVyLmlzSW50ZWdlcihpZCkpIHJldHVybiBpZDtcbiAgICAgIGlkID0gdG9JbnQoaWRPck5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZCA9IGlkT3JOYW1lO1xuICAgIH1cbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBpZiAoIVJlZmxlY3QuaGFzKG1hcCwgaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvcGVydHkgJHtpZE9yTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgcHVibGljIGdldE5hbWUoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgaWYgKFJlZmxlY3QuaGFzKG1hcCwgaWRPck5hbWUpKSB7XG4gICAgICByZXR1cm4gbWFwW2lkT3JOYW1lXVswXTtcbiAgICB9XG4gICAgY29uc3Qga2V5czogc3RyaW5nW10gPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWJQcm9wZXJ0aWVzJywgdGhpcyk7XG4gICAgaWYgKHR5cGVvZiBpZE9yTmFtZSA9PT0gJ3N0cmluZycgJiYga2V5cy5pbmNsdWRlcyhpZE9yTmFtZSkpIHJldHVybiBpZE9yTmFtZTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvcGVydHkgJHtpZE9yTmFtZX1gKTtcbiAgfVxuXG4gIC8qXG4gICAgcHVibGljIHRvSWRzKGlkc09yTmFtZXM6IChzdHJpbmcgfCBudW1iZXIpW10pOiBudW1iZXJbXSB7XG4gICAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICAgIHJldHVybiBpZHNPck5hbWVzLm1hcCgoaWRPck5hbWUpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBpZE9yTmFtZSA9PT0gJ3N0cmluZycpXG4gICAgICB9KTtcbiAgICB9XG4gICovXG4gIHB1YmxpYyBnZXRSYXdWYWx1ZShpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nKTogYW55IHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyR2YWx1ZXNdOiB2YWx1ZXMgfSA9IHRoaXM7XG4gICAgcmV0dXJuIHZhbHVlc1tpZF07XG4gIH1cblxuICBwdWJsaWMgc2V0UmF3VmFsdWUoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZywgdmFsdWU6IGFueSwgaXNEaXJ0eSA9IHRydWUpIHtcbiAgICAvLyBkZWJ1Zyhgc2V0UmF3VmFsdWUoJHtpZE9yTmFtZX0sICR7SlNPTi5zdHJpbmdpZnkoc2FmZU51bWJlcih2YWx1ZSkpfSlgKTtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyR2YWx1ZXNdOiB2YWx1ZXMsIFskZXJyb3JzXTogZXJyb3JzIH0gPSB0aGlzO1xuICAgIGNvbnN0IG5ld1ZhbCA9IHNhZmVOdW1iZXIodmFsdWUpO1xuICAgIGlmIChuZXdWYWwgIT09IHZhbHVlc1tpZF0gfHwgZXJyb3JzW2lkXSkge1xuICAgICAgdmFsdWVzW2lkXSA9IG5ld1ZhbDtcbiAgICAgIGRlbGV0ZSBlcnJvcnNbaWRdO1xuICAgICAgdGhpcy5zZXREaXJ0eShpZCwgaXNEaXJ0eSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGdldEVycm9yKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnkge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJGVycm9yc106IGVycm9ycyB9ID0gdGhpcztcbiAgICByZXR1cm4gZXJyb3JzW2lkXTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRFcnJvcihpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nLCBlcnJvcj86IEVycm9yKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskZXJyb3JzXTogZXJyb3JzIH0gPSB0aGlzO1xuICAgIGlmIChlcnJvciAhPSBudWxsKSB7XG4gICAgICBlcnJvcnNbaWRdID0gZXJyb3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBlcnJvcnNbaWRdO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBpc0RpcnR5KGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBib29sZWFuIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyRkaXJ0aWVzXTogZGlydGllcyB9ID0gdGhpcztcbiAgICByZXR1cm4gISFkaXJ0aWVzW2lkXTtcbiAgfVxuXG4gIHB1YmxpYyBzZXREaXJ0eShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyLCBpc0RpcnR5ID0gdHJ1ZSkge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogbnVtYmVyXTogc3RyaW5nW10gfSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IHsgWyRkaXJ0aWVzXTogZGlydGllcyB9ID0gdGhpcztcbiAgICBpZiAoaXNEaXJ0eSkge1xuICAgICAgZGlydGllc1tpZF0gPSB0cnVlO1xuICAgICAgLy8gVE9ETzogaW1wbGVtZW50IGF1dG9zYXZlXG4gICAgICAvLyB0aGlzLndyaXRlKGlkKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBkaXJ0aWVzW2lkXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQGV2ZW50IElEZXZpY2UjY2hhbmdlZFxuICAgICAqIEBldmVudCBJRGV2aWNlI2NoYW5naW5nXG4gICAgICovXG4gICAgY29uc3QgbmFtZXMgPSBtYXBbaWRdIHx8IFtdO1xuICAgIHRoaXMuZW1pdChcbiAgICAgIGlzRGlydHkgPyAnY2hhbmdpbmcnIDogJ2NoYW5nZWQnLFxuICAgICAge1xuICAgICAgICBpZCxcbiAgICAgICAgbmFtZXMsXG4gICAgICB9LFxuICAgICk7XG4gICAgaWYgKG5hbWVzLmluY2x1ZGVzKCdzZXJubycpICYmICFpc0RpcnR5XG4gICAgICAmJiB0aGlzLmFkZHJlc3MudHlwZSA9PT0gQWRkcmVzc1R5cGUubWFjICYmIHR5cGVvZiB0aGlzLnNlcm5vID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgdmFsdWUgPSB0aGlzLnNlcm5vO1xuICAgICAgY29uc3QgcHJldkFkZHJlc3MgPSB0aGlzLmFkZHJlc3M7XG4gICAgICBjb25zdCBhZGRyZXNzID0gQnVmZmVyLmZyb20odmFsdWUucGFkU3RhcnQoMTIsICcwJykuc3Vic3RyaW5nKHZhbHVlLmxlbmd0aCAtIDEyKSwgJ2hleCcpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYWRkcmVzcycsIHdpdGhWYWx1ZShuZXcgQWRkcmVzcyhhZGRyZXNzKSwgZmFsc2UsIHRydWUpKTtcbiAgICAgIGRldmljZXMuZW1pdCgnc2Vybm8nLCBwcmV2QWRkcmVzcywgdGhpcy5hZGRyZXNzKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYWRkcmVmKCkge1xuICAgIHRoaXMuJGNvdW50UmVmICs9IDE7XG4gICAgZGVidWcoJ2FkZHJlZicsIG5ldyBFcnJvcignYWRkcmVmJykuc3RhY2spO1xuICAgIHJldHVybiB0aGlzLiRjb3VudFJlZjtcbiAgfVxuXG4gIHB1YmxpYyByZWxlYXNlKCkge1xuICAgIHRoaXMuJGNvdW50UmVmIC09IDE7XG4gICAgaWYgKHRoaXMuJGNvdW50UmVmIDw9IDApIHtcbiAgICAgIGNvbnN0IGtleSA9IHRoaXMuYWRkcmVzcy50b1N0cmluZygpO1xuICAgICAgZGV2aWNlTWFwW2tleV0gPSBfLndpdGhvdXQoZGV2aWNlTWFwW2tleV0sIHRoaXMpO1xuICAgICAgaWYgKGRldmljZU1hcFtrZXldLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWxldGUgZGV2aWNlTWFwW2tleV07XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEBldmVudCBEZXZpY2VzI2RlbGV0ZVxuICAgICAgICovXG4gICAgICBkZXZpY2VzLmVtaXQoJ2RlbGV0ZScsIHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4kY291bnRSZWY7XG4gIH1cblxuICBwdWJsaWMgZHJhaW4oKTogUHJvbWlzZTxudW1iZXJbXT4ge1xuICAgIGRlYnVnKGBkcmFpbiBbJHt0aGlzLmFkZHJlc3N9XWApO1xuICAgIGNvbnN0IHsgWyRkaXJ0aWVzXTogZGlydGllcyB9ID0gdGhpcztcbiAgICBjb25zdCBpZHMgPSBPYmplY3Qua2V5cyhkaXJ0aWVzKS5tYXAoTnVtYmVyKS5maWx0ZXIoaWQgPT4gZGlydGllc1tpZF0pO1xuICAgIHJldHVybiBpZHMubGVuZ3RoID4gMCA/IHRoaXMud3JpdGUoLi4uaWRzKSA6IFByb21pc2UucmVzb2x2ZShbXSk7XG4gIH1cblxuICBwcml2YXRlIHdyaXRlQWxsKCkge1xuICAgIGNvbnN0IHsgWyR2YWx1ZXNdOiB2YWx1ZXMgfSA9IHRoaXM7XG4gICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgaWRzID0gT2JqZWN0LmVudHJpZXModmFsdWVzKVxuICAgICAgLmZpbHRlcigoWywgdmFsdWVdKSA9PiB2YWx1ZSAhPSBudWxsKVxuICAgICAgLm1hcCgoW2lkXSkgPT4gTnVtYmVyKGlkKSlcbiAgICAgIC5maWx0ZXIoKGlkID0+IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2lzV3JpdGFibGUnLCB0aGlzLCBtYXBbaWRdWzBdKSkpO1xuICAgIHJldHVybiBpZHMubGVuZ3RoID4gMCA/IHRoaXMud3JpdGUoLi4uaWRzKSA6IFByb21pc2UucmVzb2x2ZShbXSk7XG4gIH1cblxuICBwdWJsaWMgd3JpdGUoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8bnVtYmVyW10+IHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoYCR7dGhpcy5hZGRyZXNzfSBpcyBkaXNjb25uZWN0ZWRgKTtcbiAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoaXMud3JpdGVBbGwoKTtcbiAgICB9XG4gICAgZGVidWcoYHdyaXRpbmcgJHtpZHMuam9pbigpfSB0byBbJHt0aGlzLmFkZHJlc3N9XWApO1xuICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IGludmFsaWRObXM6IG51bWJlcltdID0gW107XG4gICAgY29uc3QgcmVxdWVzdHMgPSBpZHMucmVkdWNlKFxuICAgICAgKGFjYzogTm1zRGF0YWdyYW1bXSwgaWQpID0+IHtcbiAgICAgICAgY29uc3QgW25hbWVdID0gbWFwW2lkXTtcbiAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgZGVidWcoYFVua25vd24gaWQ6ICR7aWR9IGZvciAke1JlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYicsIHRoaXMpfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhY2MucHVzaChjcmVhdGVObXNXcml0ZShcbiAgICAgICAgICAgICAgdGhpcy5hZGRyZXNzLFxuICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgUmVmbGVjdC5nZXRNZXRhZGF0YSgnbm1zVHlwZScsIHRoaXMsIG5hbWUpLFxuICAgICAgICAgICAgICB0aGlzLmdldFJhd1ZhbHVlKGlkKSxcbiAgICAgICAgICAgICkpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHdoaWxlIGNyZWF0ZSBOTVMgZGF0YWdyYW0nLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgaW52YWxpZE5tcy5wdXNoKC1pZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LFxuICAgICAgW10sXG4gICAgKTtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoXG4gICAgICByZXF1ZXN0c1xuICAgICAgICAubWFwKGRhdGFncmFtID0+IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKGRhdGFncmFtKVxuICAgICAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBzdGF0dXMgfSA9IHJlc3BvbnNlIGFzIE5tc0RhdGFncmFtO1xuICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gMCkge1xuICAgICAgICAgICAgICB0aGlzLnNldERpcnR5KGRhdGFncmFtLmlkLCBmYWxzZSk7XG4gICAgICAgICAgICAgIHJldHVybiBkYXRhZ3JhbS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0RXJyb3IoZGF0YWdyYW0uaWQsIG5ldyBOaWJ1c0Vycm9yKHN0YXR1cyEsIHRoaXMpKTtcbiAgICAgICAgICAgIHJldHVybiAtZGF0YWdyYW0uaWQ7XG4gICAgICAgICAgfSwgKHJlYXNvbikgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXRFcnJvcihkYXRhZ3JhbS5pZCwgcmVhc29uKTtcbiAgICAgICAgICAgIHJldHVybiAtZGF0YWdyYW0uaWQ7XG4gICAgICAgICAgfSkpKVxuICAgICAgLnRoZW4oaWRzID0+IGlkcy5jb25jYXQoaW52YWxpZE5tcykpO1xuICB9XG5cbiAgcHVibGljIHdyaXRlVmFsdWVzKHNvdXJjZTogb2JqZWN0LCBzdHJvbmcgPSB0cnVlKTogUHJvbWlzZTxudW1iZXJbXT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBpZHMgPSBPYmplY3Qua2V5cyhzb3VyY2UpLm1hcChuYW1lID0+IHRoaXMuZ2V0SWQobmFtZSkpO1xuICAgICAgaWYgKGlkcy5sZW5ndGggPT09IDApIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCd2YWx1ZSBpcyBlbXB0eScpKTtcbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcywgc291cmNlKTtcbiAgICAgIHJldHVybiB0aGlzLndyaXRlKC4uLmlkcylcbiAgICAgICAgLnRoZW4oKHdyaXR0ZW4pID0+IHtcbiAgICAgICAgICBpZiAod3JpdHRlbi5sZW5ndGggPT09IDAgfHwgKHN0cm9uZyAmJiB3cml0dGVuLmxlbmd0aCAhPT0gaWRzLmxlbmd0aCkpIHtcbiAgICAgICAgICAgIHRocm93IHRoaXMuZ2V0RXJyb3IoaWRzWzBdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHdyaXR0ZW47XG4gICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWFkQWxsKCk6IFByb21pc2U8YW55PiB7XG4gICAgaWYgKHRoaXMuJHJlYWQpIHJldHVybiB0aGlzLiRyZWFkO1xuICAgIGNvbnN0IG1hcDogeyBbaWQ6IHN0cmluZ106IHN0cmluZ1tdIH0gPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCBpZHMgPSBPYmplY3QuZW50cmllcyhtYXApXG4gICAgICAuZmlsdGVyKChbLCBuYW1lc10pID0+IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2lzUmVhZGFibGUnLCB0aGlzLCBuYW1lc1swXSkpXG4gICAgICAubWFwKChbaWRdKSA9PiBOdW1iZXIoaWQpKVxuICAgICAgLnNvcnQoKTtcbiAgICB0aGlzLiRyZWFkID0gaWRzLmxlbmd0aCA+IDAgPyB0aGlzLnJlYWQoLi4uaWRzKSA6IFByb21pc2UucmVzb2x2ZShbXSk7XG4gICAgY29uc3QgY2xlYXIgPSAoKSA9PiBkZWxldGUgdGhpcy4kcmVhZDtcbiAgICByZXR1cm4gdGhpcy4kcmVhZC5maW5hbGx5KGNsZWFyKTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyByZWFkKC4uLmlkczogbnVtYmVyW10pOiBQcm9taXNlPHsgW25hbWU6IHN0cmluZ106IGFueSB9PiB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgcmV0dXJuIFByb21pc2UucmVqZWN0KCdkaXNjb25uZWN0ZWQnKTtcbiAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRoaXMucmVhZEFsbCgpO1xuICAgIC8vIGRlYnVnKGByZWFkICR7aWRzLmpvaW4oKX0gZnJvbSBbJHt0aGlzLmFkZHJlc3N9XWApO1xuICAgIGNvbnN0IGRpc2FibGVCYXRjaFJlYWRpbmcgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdkaXNhYmxlQmF0Y2hSZWFkaW5nJywgdGhpcyk7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogc3RyaW5nXTogc3RyaW5nW10gfSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IGNodW5rcyA9IGNodW5rQXJyYXkoaWRzLCBkaXNhYmxlQmF0Y2hSZWFkaW5nID8gMSA6IDIxKTtcbiAgICBkZWJ1ZyhgcmVhZCBbJHtjaHVua3MubWFwKGNodW5rID0+IGBbJHtjaHVuay5qb2luKCl9XWApLmpvaW4oKX1dIGZyb20gWyR7dGhpcy5hZGRyZXNzfV1gKTtcbiAgICBjb25zdCByZXF1ZXN0cyA9IGNodW5rcy5tYXAoY2h1bmsgPT4gY3JlYXRlTm1zUmVhZCh0aGlzLmFkZHJlc3MsIC4uLmNodW5rKSk7XG4gICAgcmV0dXJuIHJlcXVlc3RzLnJlZHVjZShcbiAgICAgIGFzeW5jIChwcm9taXNlLCBkYXRhZ3JhbSkgPT4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm9taXNlO1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKGRhdGFncmFtKTtcbiAgICAgICAgY29uc3QgZGF0YWdyYW1zOiBObXNEYXRhZ3JhbVtdID0gQXJyYXkuaXNBcnJheShyZXNwb25zZSlcbiAgICAgICAgICA/IHJlc3BvbnNlIGFzIE5tc0RhdGFncmFtW11cbiAgICAgICAgICA6IFtyZXNwb25zZSBhcyBObXNEYXRhZ3JhbV07XG4gICAgICAgIGRhdGFncmFtcy5mb3JFYWNoKCh7IGlkLCB2YWx1ZSwgc3RhdHVzIH0pID0+IHtcbiAgICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnNldFJhd1ZhbHVlKGlkLCB2YWx1ZSwgZmFsc2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldEVycm9yKGlkLCBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG5hbWVzID0gbWFwW2lkXTtcbiAgICAgICAgICBjb25zb2xlLmFzc2VydChuYW1lcyAmJiBuYW1lcy5sZW5ndGggPiAwLCBgSW52YWxpZCBpZCAke2lkfWApO1xuICAgICAgICAgIG5hbWVzLmZvckVhY2goKHByb3BOYW1lKSA9PiB7XG4gICAgICAgICAgICByZXN1bHRbcHJvcE5hbWVdID0gc3RhdHVzID09PSAwXG4gICAgICAgICAgICAgID8gdGhpc1twcm9wTmFtZV1cbiAgICAgICAgICAgICAgOiB7IGVycm9yOiAodGhpcy5nZXRFcnJvcihpZCkgfHwge30pLm1lc3NhZ2UgfHwgJ2Vycm9yJyB9O1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG4gICAgICBQcm9taXNlLnJlc29sdmUoe30gYXMgeyBbbmFtZTogc3RyaW5nXTogYW55IH0pLFxuICAgICk7XG4gIH1cblxuICBhc3luYyB1cGxvYWQoZG9tYWluOiBzdHJpbmcsIG9mZnNldCA9IDAsIHNpemU/OiBudW1iZXIpOiBQcm9taXNlPEJ1ZmZlcj4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbiB9ID0gdGhpcztcbiAgICB0cnkge1xuICAgICAgaWYgKCFjb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgICAgY29uc3QgcmVxVXBsb2FkID0gY3JlYXRlTm1zUmVxdWVzdERvbWFpblVwbG9hZCh0aGlzLmFkZHJlc3MsIGRvbWFpbi5wYWRFbmQoOCwgJ1xcMCcpKTtcbiAgICAgIGNvbnN0IHsgaWQsIHZhbHVlOiBkb21haW5TaXplLCBzdGF0dXMgfSA9XG4gICAgICAgIGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHJlcVVwbG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICBpZiAoc3RhdHVzICE9PSAwKSB7XG4gICAgICAgIC8vIGRlYnVnKCc8ZXJyb3I+Jywgc3RhdHVzKTtcbiAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3Ioc3RhdHVzISwgdGhpcywgJ1JlcXVlc3QgdXBsb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgICAgfVxuICAgICAgY29uc3QgaW5pdFVwbG9hZCA9IGNyZWF0ZU5tc0luaXRpYXRlVXBsb2FkU2VxdWVuY2UodGhpcy5hZGRyZXNzLCBpZCk7XG4gICAgICBjb25zdCB7IHN0YXR1czogaW5pdFN0YXQgfSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKGluaXRVcGxvYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgaWYgKGluaXRTdGF0ICE9PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKGluaXRTdGF0ISwgdGhpcywgJ0luaXRpYXRlIHVwbG9hZCBkb21haW4gZXJyb3InKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRvdGFsID0gc2l6ZSB8fCAoZG9tYWluU2l6ZSAtIG9mZnNldCk7XG4gICAgICBsZXQgcmVzdCA9IHRvdGFsO1xuICAgICAgbGV0IHBvcyA9IG9mZnNldDtcbiAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3VwbG9hZFN0YXJ0JyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBkb21haW5TaXplLFxuICAgICAgICAgIG9mZnNldCxcbiAgICAgICAgICBzaXplOiB0b3RhbCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgICBjb25zdCBidWZzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgd2hpbGUgKHJlc3QgPiAwKSB7XG4gICAgICAgIGNvbnN0IGxlbmd0aCA9IE1hdGgubWluKDI1NSwgcmVzdCk7XG4gICAgICAgIGNvbnN0IHVwbG9hZFNlZ21lbnQgPSBjcmVhdGVObXNVcGxvYWRTZWdtZW50KHRoaXMuYWRkcmVzcywgaWQsIHBvcywgbGVuZ3RoKTtcbiAgICAgICAgY29uc3QgeyBzdGF0dXM6IHVwbG9hZFN0YXR1cywgdmFsdWU6IHJlc3VsdCB9ID1cbiAgICAgICAgICBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbSh1cGxvYWRTZWdtZW50KSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgICAgaWYgKHVwbG9hZFN0YXR1cyAhPT0gMCkge1xuICAgICAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKHVwbG9hZFN0YXR1cyEsIHRoaXMsICdVcGxvYWQgc2VnbWVudCBlcnJvcicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBidWZzLnB1c2gocmVzdWx0LmRhdGEpO1xuICAgICAgICB0aGlzLmVtaXQoXG4gICAgICAgICAgJ3VwbG9hZERhdGEnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICAgIHBvcyxcbiAgICAgICAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLFxuICAgICAgICAgIH0sXG4gICAgICAgICk7XG4gICAgICAgIHJlc3QgLT0gcmVzdWx0LmRhdGEubGVuZ3RoO1xuICAgICAgICBwb3MgKz0gcmVzdWx0LmRhdGEubGVuZ3RoO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVzdWx0ID0gQnVmZmVyLmNvbmNhdChidWZzKTtcbiAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ3VwbG9hZEZpbmlzaCcsXG4gICAgICAgIHtcbiAgICAgICAgICBkb21haW4sXG4gICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgIGRhdGE6IHJlc3VsdCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuZW1pdCgndXBsb2FkRXJyb3InLCBlKTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZG93bmxvYWQoZG9tYWluOiBzdHJpbmcsIGJ1ZmZlcjogQnVmZmVyLCBvZmZzZXQgPSAwLCBub1Rlcm0gPSBmYWxzZSkge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbiB9ID0gdGhpcztcbiAgICBpZiAoIWNvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignZGlzY29ubmVjdGVkJyk7XG4gICAgY29uc3QgcmVxRG93bmxvYWQgPSBjcmVhdGVObXNSZXF1ZXN0RG9tYWluRG93bmxvYWQodGhpcy5hZGRyZXNzLCBkb21haW4ucGFkRW5kKDgsICdcXDAnKSk7XG4gICAgY29uc3QgeyBpZCwgdmFsdWU6IG1heCwgc3RhdHVzIH0gPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShyZXFEb3dubG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgaWYgKHN0YXR1cyAhPT0gMCkge1xuICAgICAgLy8gZGVidWcoJzxlcnJvcj4nLCBzdGF0dXMpO1xuICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3Ioc3RhdHVzISwgdGhpcywgJ1JlcXVlc3QgZG93bmxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgfVxuICAgIGNvbnN0IHRlcm1pbmF0ZSA9IGFzeW5jIChlcnI/OiBFcnJvcikgPT4ge1xuICAgICAgbGV0IHRlcm1TdGF0ID0gMDtcbiAgICAgIGlmICghbm9UZXJtKSB7XG4gICAgICAgIGNvbnN0IHJlcSA9IGNyZWF0ZU5tc1Rlcm1pbmF0ZURvd25sb2FkU2VxdWVuY2UodGhpcy5hZGRyZXNzLCBpZCk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHJlcSkgYXMgTm1zRGF0YWdyYW07XG4gICAgICAgIHRlcm1TdGF0ID0gcmVzLnN0YXR1cyE7XG4gICAgICB9XG4gICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICBpZiAodGVybVN0YXQgIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoXG4gICAgICAgICAgdGVybVN0YXQhLFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgJ1Rlcm1pbmF0ZSBkb3dubG9hZCBzZXF1ZW5jZSBlcnJvciwgbWF5YmUgbmVlZCAtLW5vLXRlcm0nLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKGJ1ZmZlci5sZW5ndGggPiBtYXggLSBvZmZzZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQnVmZmVyIHRvIGxhcmdlLiBFeHBlY3RlZCAke21heCAtIG9mZnNldH0gYnl0ZXNgKTtcbiAgICB9XG4gICAgY29uc3QgaW5pdERvd25sb2FkID0gY3JlYXRlTm1zSW5pdGlhdGVEb3dubG9hZFNlcXVlbmNlKHRoaXMuYWRkcmVzcywgaWQpO1xuICAgIGNvbnN0IHsgc3RhdHVzOiBpbml0U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oaW5pdERvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAoaW5pdFN0YXQgIT09IDApIHtcbiAgICAgIHRocm93IG5ldyBOaWJ1c0Vycm9yKGluaXRTdGF0ISwgdGhpcywgJ0luaXRpYXRlIGRvd25sb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgIH1cbiAgICB0aGlzLmVtaXQoXG4gICAgICAnZG93bmxvYWRTdGFydCcsXG4gICAgICB7XG4gICAgICAgIGRvbWFpbixcbiAgICAgICAgb2Zmc2V0LFxuICAgICAgICBkb21haW5TaXplOiBtYXgsXG4gICAgICAgIHNpemU6IGJ1ZmZlci5sZW5ndGgsXG4gICAgICB9LFxuICAgICk7XG4gICAgY29uc3QgY3JjID0gY3JjMTZjY2l0dChidWZmZXIsIDApO1xuICAgIGNvbnN0IGNodW5rU2l6ZSA9IE5NU19NQVhfREFUQV9MRU5HVEggLSA0O1xuICAgIGNvbnN0IGNodW5rcyA9IGNodW5rQXJyYXkoYnVmZmVyLCBjaHVua1NpemUpO1xuICAgIGF3YWl0IGNodW5rcy5yZWR1Y2UoYXN5bmMgKHByZXYsIGNodW5rOiBCdWZmZXIsIGkpID0+IHtcbiAgICAgIGF3YWl0IHByZXY7XG4gICAgICBjb25zdCBwb3MgPSBpICogY2h1bmtTaXplICsgb2Zmc2V0O1xuICAgICAgY29uc3Qgc2VnbWVudERvd25sb2FkID1cbiAgICAgICAgY3JlYXRlTm1zRG93bmxvYWRTZWdtZW50KHRoaXMuYWRkcmVzcywgaWQhLCBwb3MsIGNodW5rKTtcbiAgICAgIGNvbnN0IHsgc3RhdHVzOiBkb3dubG9hZFN0YXQgfSA9XG4gICAgICAgIGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHNlZ21lbnREb3dubG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICBpZiAoZG93bmxvYWRTdGF0ICE9PSAwKSB7XG4gICAgICAgIGF3YWl0IHRlcm1pbmF0ZShuZXcgTmlidXNFcnJvcihkb3dubG9hZFN0YXQhLCB0aGlzLCAnRG93bmxvYWQgc2VnbWVudCBlcnJvcicpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgJ2Rvd25sb2FkRGF0YScsXG4gICAgICAgIHtcbiAgICAgICAgICBkb21haW4sXG4gICAgICAgICAgbGVuZ3RoOiBjaHVuay5sZW5ndGgsXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH0sIFByb21pc2UucmVzb2x2ZSgpKTtcbiAgICBjb25zdCB2ZXJpZnkgPSBjcmVhdGVObXNWZXJpZnlEb21haW5DaGVja3N1bSh0aGlzLmFkZHJlc3MsIGlkLCBvZmZzZXQsIGJ1ZmZlci5sZW5ndGgsIGNyYyk7XG4gICAgY29uc3QgeyBzdGF0dXM6IHZlcmlmeVN0YXQgfSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHZlcmlmeSkgYXMgTm1zRGF0YWdyYW07XG4gICAgaWYgKHZlcmlmeVN0YXQgIT09IDApIHtcbiAgICAgIGF3YWl0IHRlcm1pbmF0ZShuZXcgTmlidXNFcnJvcih2ZXJpZnlTdGF0ISwgdGhpcywgJ0Rvd25sb2FkIHNlZ21lbnQgZXJyb3InKSk7XG4gICAgfVxuICAgIGF3YWl0IHRlcm1pbmF0ZSgpO1xuICAgIHRoaXMuZW1pdChcbiAgICAgICdkb3dubG9hZEZpbmlzaCcsXG4gICAgICB7XG4gICAgICAgIGRvbWFpbixcbiAgICAgICAgb2Zmc2V0LFxuICAgICAgICBzaXplOiBidWZmZXIubGVuZ3RoLFxuICAgICAgfSxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgZXhlY3V0ZShwcm9ncmFtOiBzdHJpbmcsIGFyZ3M/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0ZWQnKTtcbiAgICBjb25zdCBzdWJyb3V0aW5lcyA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ3N1YnJvdXRpbmVzJywgdGhpcykgYXMgUmVjb3JkPHN0cmluZywgSVN1YnJvdXRpbmVEZXNjPjtcbiAgICBpZiAoIXN1YnJvdXRpbmVzIHx8ICFSZWZsZWN0LmhhcyhzdWJyb3V0aW5lcywgcHJvZ3JhbSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9ncmFtICR7cHJvZ3JhbX1gKTtcbiAgICB9XG4gICAgY29uc3Qgc3Vicm91dGluZSA9IHN1YnJvdXRpbmVzW3Byb2dyYW1dO1xuICAgIGNvbnN0IHByb3BzOiBUeXBlZFZhbHVlW10gPSBbXTtcbiAgICBpZiAoc3Vicm91dGluZS5hcmdzKSB7XG4gICAgICBPYmplY3QuZW50cmllcyhzdWJyb3V0aW5lLmFyZ3MpLmZvckVhY2goKFtuYW1lLCBkZXNjXSkgPT4ge1xuICAgICAgICBjb25zdCBhcmcgPSBhcmdzICYmIGFyZ3NbbmFtZV07XG4gICAgICAgIGlmICghYXJnKSB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGFyZyAke25hbWV9IGluIHByb2dyYW0gJHtwcm9ncmFtfWApO1xuICAgICAgICBwcm9wcy5wdXNoKFtkZXNjLnR5cGUsIGFyZ10pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcSA9IGNyZWF0ZUV4ZWN1dGVQcm9ncmFtSW52b2NhdGlvbihcbiAgICAgIHRoaXMuYWRkcmVzcyxcbiAgICAgIHN1YnJvdXRpbmUuaWQsXG4gICAgICBzdWJyb3V0aW5lLm5vdFJlcGx5LFxuICAgICAgLi4ucHJvcHMsXG4gICAgKTtcbiAgICByZXR1cm4gY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxKTtcbiAgfVxufVxuXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcbmludGVyZmFjZSBEZXZpY2VQcm90b3R5cGUge1xuICByZWFkb25seSBpZDogRGV2aWNlSWQ7XG4gIHJlYWRvbmx5IGFkZHJlc3M6IEFkZHJlc3M7XG4gIFttaWJQcm9wZXJ0eTogc3RyaW5nXTogYW55O1xuICAkY291bnRSZWY6IG51bWJlcjtcbiAgJHJlYWQ/OiBQcm9taXNlPGFueT47XG4gIFskdmFsdWVzXTogeyBbaWQ6IG51bWJlcl06IGFueSB9O1xuICBbJGVycm9yc106IHsgW2lkOiBudW1iZXJdOiBFcnJvciB9O1xuICBbJGRpcnRpZXNdOiB7IFtpZDogbnVtYmVyXTogYm9vbGVhbiB9O1xufVxuXG5leHBvcnQgY29uc3QgZ2V0TWliVHlwZXMgPSAoKTogQ29uZmlnWydtaWJUeXBlcyddID0+IHtcbiAgY29uc3QgY29uZiA9IHBhdGgucmVzb2x2ZShjb25maWdEaXIgfHwgJy90bXAnLCAnY29uZmlnc3RvcmUnLCBwa2dOYW1lKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGAke2NvbmZ9Lmpzb25gKSkgcmV0dXJuIHt9O1xuICBjb25zdCB2YWxpZGF0ZSA9IENvbmZpZ1YuZGVjb2RlKEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGAke2NvbmZ9Lmpzb25gKS50b1N0cmluZygpKSk7XG4vLyAgIGNvbnN0IHZhbGlkYXRlID0gQ29uZmlnVi5kZWNvZGUocmVxdWlyZShjb25mKSk7XG4gIGlmICh2YWxpZGF0ZS5pc0xlZnQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb25maWcgZmlsZSAke2NvbmZ9XG4gICR7UGF0aFJlcG9ydGVyLnJlcG9ydCh2YWxpZGF0ZSl9YCk7XG4gIH1cbiAgY29uc3QgeyBtaWJUeXBlcyB9ID0gdmFsaWRhdGUudmFsdWU7XG4gIHJldHVybiBtaWJUeXBlcztcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWliQnlUeXBlKHR5cGU6IG51bWJlciwgdmVyc2lvbj86IG51bWJlcik6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IG1pYlR5cGVzID0gZ2V0TWliVHlwZXMoKTtcbiAgY29uc3QgbWlicyA9IG1pYlR5cGVzIVt0eXBlXTtcbiAgaWYgKG1pYnMgJiYgbWlicy5sZW5ndGgpIHtcbiAgICBsZXQgbWliVHlwZSA9IG1pYnNbMF07XG4gICAgaWYgKHZlcnNpb24gJiYgbWlicy5sZW5ndGggPiAxKSB7XG4gICAgICBtaWJUeXBlID0gXy5maW5kTGFzdChtaWJzLCAoeyBtaW5WZXJzaW9uID0gMCB9KSA9PiBtaW5WZXJzaW9uIDw9IHZlcnNpb24pIHx8IG1pYlR5cGU7XG4gICAgfVxuICAgIHJldHVybiBtaWJUeXBlLm1pYjtcbiAgfVxuICAvLyBjb25zdCBjYWNoZU1pYnMgPSBPYmplY3Qua2V5cyhtaWJUeXBlc0NhY2hlKTtcbiAgLy8gY29uc3QgY2FjaGVkID0gY2FjaGVNaWJzLmZpbmQobWliID0+XG4gIC8vICAgUmVmbGVjdC5nZXRNZXRhZGF0YSgnZGV2aWNlVHlwZScsIG1pYlR5cGVzQ2FjaGVbbWliXS5wcm90b3R5cGUpID09PSB0eXBlKTtcbiAgLy8gaWYgKGNhY2hlZCkgcmV0dXJuIGNhY2hlZDtcbiAgLy8gY29uc3QgbWlicyA9IGdldE1pYnNTeW5jKCk7XG4gIC8vIHJldHVybiBfLmRpZmZlcmVuY2UobWlicywgY2FjaGVNaWJzKS5maW5kKChtaWJOYW1lKSA9PiB7XG4gIC8vICAgY29uc3QgbWliZmlsZSA9IGdldE1pYkZpbGUobWliTmFtZSk7XG4gIC8vICAgY29uc3QgbWliOiBJTWliRGV2aWNlID0gcmVxdWlyZShtaWJmaWxlKTtcbiAgLy8gICBjb25zdCB7IHR5cGVzIH0gPSBtaWI7XG4gIC8vICAgY29uc3QgZGV2aWNlID0gdHlwZXNbbWliLmRldmljZV0gYXMgSU1pYkRldmljZVR5cGU7XG4gIC8vICAgcmV0dXJuIHRvSW50KGRldmljZS5hcHBpbmZvLmRldmljZV90eXBlKSA9PT0gdHlwZTtcbiAgLy8gfSk7XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBEZXZpY2VzIHtcbiAgb24oZXZlbnQ6ICduZXcnIHwgJ2RlbGV0ZScsIGRldmljZUxpc3RlbmVyOiAoZGV2aWNlOiBJRGV2aWNlKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBvbihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAocHJldkFkZHJlc3M6IEFkZHJlc3MsIG5ld0FkZHJlc3M6IEFkZHJlc3MpID0+IHZvaWQpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG59XG5cbmZ1bmN0aW9uIGdldENvbnN0cnVjdG9yKG1pYjogc3RyaW5nKTogRnVuY3Rpb24ge1xuICBsZXQgY29uc3RydWN0b3IgPSBtaWJUeXBlc0NhY2hlW21pYl07XG4gIGlmICghY29uc3RydWN0b3IpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcbiAgICBmdW5jdGlvbiBEZXZpY2UodGhpczogRGV2aWNlUHJvdG90eXBlLCBhZGRyZXNzOiBBZGRyZXNzKSB7XG4gICAgICBFdmVudEVtaXR0ZXIuYXBwbHkodGhpcyk7XG4gICAgICB0aGlzWyR2YWx1ZXNdID0ge307XG4gICAgICB0aGlzWyRlcnJvcnNdID0ge307XG4gICAgICB0aGlzWyRkaXJ0aWVzXSA9IHt9O1xuICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnYWRkcmVzcycsIHdpdGhWYWx1ZShhZGRyZXNzLCBmYWxzZSwgdHJ1ZSkpO1xuICAgICAgdGhpcy4kY291bnRSZWYgPSAxO1xuICAgICAgKHRoaXMgYXMgYW55KS5pZCA9IHRpbWVpZCgpIGFzIERldmljZUlkO1xuICAgICAgLy8gZGVidWcobmV3IEVycm9yKCdDUkVBVEUnKS5zdGFjayk7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvdG90eXBlID0gbmV3IERldmljZVByb3RvdHlwZShtaWIpO1xuICAgIERldmljZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHByb3RvdHlwZSk7XG4gICAgKERldmljZSBhcyBhbnkpLmRpc3BsYXlOYW1lID0gYCR7bWliWzBdLnRvVXBwZXJDYXNlKCl9JHttaWIuc2xpY2UoMSl9YDtcbiAgICBjb25zdHJ1Y3RvciA9IERldmljZTtcbiAgICBtaWJUeXBlc0NhY2hlW21pYl0gPSBjb25zdHJ1Y3RvcjtcbiAgfVxuICByZXR1cm4gY29uc3RydWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNaWJQcm90b3R5cGUobWliOiBzdHJpbmcpOiBPYmplY3Qge1xuICByZXR1cm4gZ2V0Q29uc3RydWN0b3IobWliKS5wcm90b3R5cGU7XG59XG5cbmV4cG9ydCBjbGFzcyBEZXZpY2VzIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgZ2V0ID0gKCk6IElEZXZpY2VbXSA9PiBfLmZsYXR0ZW4oXy52YWx1ZXMoZGV2aWNlTWFwKSk7XG5cbiAgZmluZCA9IChhZGRyZXNzOiBBZGRyZXNzUGFyYW0pOiBJRGV2aWNlW10gfCB1bmRlZmluZWQgPT4ge1xuICAgIGNvbnN0IHRhcmdldEFkZHJlc3MgPSBuZXcgQWRkcmVzcyhhZGRyZXNzKTtcbiAgICByZXR1cm4gZGV2aWNlTWFwW3RhcmdldEFkZHJlc3MudG9TdHJpbmcoKV07XG4gIH07XG5cbiAgY3JlYXRlKGFkZHJlc3M6IEFkZHJlc3NQYXJhbSwgbWliOiBzdHJpbmcpOiBJRGV2aWNlO1xuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCB0eXBlOiBudW1iZXIsIHZlcnNpb24/OiBudW1iZXIpOiBJRGV2aWNlO1xuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCBtaWJPclR5cGU6IGFueSwgdmVyc2lvbj86IG51bWJlcik6IElEZXZpY2Uge1xuICAgIGxldCBtaWI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZW9mIG1pYk9yVHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIG1pYiA9IGZpbmRNaWJCeVR5cGUobWliT3JUeXBlLCB2ZXJzaW9uKTtcbiAgICAgIGlmIChtaWIgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG1pYiB0eXBlJyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWliT3JUeXBlID09PSAnc3RyaW5nJykge1xuICAgICAgbWliID0gU3RyaW5nKG1pYk9yVHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWliIG9yIHR5cGUgZXhwZWN0ZWQsIGdvdCAke21pYk9yVHlwZX1gKTtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0QWRkcmVzcyA9IG5ldyBBZGRyZXNzKGFkZHJlc3MpO1xuICAgIC8vIGxldCBkZXZpY2UgPSBkZXZpY2VNYXBbdGFyZ2V0QWRkcmVzcy50b1N0cmluZygpXTtcbiAgICAvLyBpZiAoZGV2aWNlKSB7XG4gICAgLy8gICBjb25zb2xlLmFzc2VydChcbiAgICAvLyAgICAgUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgZGV2aWNlKSA9PT0gbWliLFxuICAgIC8vICAgICBgbWlicyBhcmUgZGlmZmVyZW50LCBleHBlY3RlZCAke21pYn1gLFxuICAgIC8vICAgKTtcbiAgICAvLyAgIGRldmljZS5hZGRyZWYoKTtcbiAgICAvLyAgIHJldHVybiBkZXZpY2U7XG4gICAgLy8gfVxuXG4gICAgY29uc3QgY29uc3RydWN0b3IgPSBnZXRDb25zdHJ1Y3RvcihtaWIpO1xuICAgIGNvbnN0IGRldmljZTogSURldmljZSA9IFJlZmxlY3QuY29uc3RydWN0KGNvbnN0cnVjdG9yLCBbdGFyZ2V0QWRkcmVzc10pO1xuICAgIGlmICghdGFyZ2V0QWRkcmVzcy5pc0VtcHR5KSB7XG4gICAgICBjb25zdCBrZXkgPSB0YXJnZXRBZGRyZXNzLnRvU3RyaW5nKCk7XG4gICAgICBkZXZpY2VNYXBba2V5XSA9IChkZXZpY2VNYXBba2V5XSB8fCBbXSkuY29uY2F0KGRldmljZSk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHRoaXMuZW1pdCgnbmV3JywgZGV2aWNlKSk7XG4gICAgfVxuICAgIHJldHVybiBkZXZpY2U7XG4gIH1cbn1cblxuY29uc3QgZGV2aWNlcyA9IG5ldyBEZXZpY2VzKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGRldmljZXM7XG4iXX0=