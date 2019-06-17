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
    representation: t.string
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
    converters.push(_mib.percentConverter);
    Reflect.defineMetadata('unit', '%', target, propertyKey);
    Reflect.defineMetadata('min', 0, target, propertyKey);
    Reflect.defineMetadata('max', 100, target, propertyKey);
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
      converters.push((0, _mib.minInclusiveConverter)(min));
      Reflect.defineMetadata('min', min, target, propertyKey);
    }

    if (max !== undefined) {
      max = (0, _mib.convertTo)(converters)(max);
      converters.push((0, _mib.maxInclusiveConverter)(max));
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
      representation
    } = info;
    const size = (0, _mib.getIntSize)(simpleType);

    if (units) {
      converters.push((0, _mib.unitConverter)(units));
      Reflect.defineMetadata('unit', units, target, propertyKey);
    }

    precision && converters.push((0, _mib.precisionConverter)(precision));

    if (enumeration) {
      converters.push((0, _mib.enumerationConverter)(enumeration));
      Reflect.defineMetadata('enum', Object.entries(enumeration).map(([key, val]) => [val.annotation, (0, _mib.toInt)(key)]), target, propertyKey);
    }

    representation && size && converters.push((0, _mib.representationConverter)(representation, size));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9taWIvZGV2aWNlcy50cyJdLCJuYW1lcyI6WyJwa2dOYW1lIiwiZGVidWciLCIkdmFsdWVzIiwiU3ltYm9sIiwiJGVycm9ycyIsIiRkaXJ0aWVzIiwic2FmZU51bWJlciIsInZhbCIsIm51bSIsInBhcnNlRmxvYXQiLCJOdW1iZXIiLCJpc05hTiIsIlByaXZhdGVQcm9wcyIsImRldmljZU1hcCIsIm1pYlR5cGVzQ2FjaGUiLCJNaWJQcm9wZXJ0eUFwcEluZm9WIiwidCIsImludGVyc2VjdGlvbiIsInR5cGUiLCJubXNfaWQiLCJ1bmlvbiIsInN0cmluZyIsIkludCIsImFjY2VzcyIsInBhcnRpYWwiLCJjYXRlZ29yeSIsIk1pYlByb3BlcnR5ViIsImFubm90YXRpb24iLCJhcHBpbmZvIiwiTWliRGV2aWNlQXBwSW5mb1YiLCJtaWJfdmVyc2lvbiIsImRldmljZV90eXBlIiwibG9hZGVyX3R5cGUiLCJmaXJtd2FyZSIsIm1pbl92ZXJzaW9uIiwiTWliRGV2aWNlVHlwZVYiLCJwcm9wZXJ0aWVzIiwicmVjb3JkIiwiTWliVHlwZVYiLCJiYXNlIiwiemVybyIsInVuaXRzIiwicHJlY2lzaW9uIiwicmVwcmVzZW50YXRpb24iLCJtaW5JbmNsdXNpdmUiLCJtYXhJbmNsdXNpdmUiLCJlbnVtZXJhdGlvbiIsIk1pYlN1YnJvdXRpbmVWIiwicmVzcG9uc2UiLCJTdWJyb3V0aW5lVHlwZVYiLCJpZCIsImxpdGVyYWwiLCJNaWJEZXZpY2VWIiwiZGV2aWNlIiwidHlwZXMiLCJzdWJyb3V0aW5lcyIsImdldEJhc2VUeXBlIiwic3VwZXJUeXBlIiwiZGVmaW5lTWliUHJvcGVydHkiLCJ0YXJnZXQiLCJrZXkiLCJwcm9wIiwicHJvcGVydHlLZXkiLCJSZWZsZWN0IiwiZGVmaW5lTWV0YWRhdGEiLCJzaW1wbGVUeXBlIiwiY29udmVydGVycyIsImlzUmVhZGFibGUiLCJpbmRleE9mIiwiaXNXcml0YWJsZSIsIm1pbiIsIm1heCIsIk5tc1ZhbHVlVHlwZSIsIkludDgiLCJJbnQxNiIsIkludDMyIiwiVUludDgiLCJVSW50MTYiLCJVSW50MzIiLCJwdXNoIiwiZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIiLCJwZXJjZW50Q29udmVydGVyIiwidW5kZWZpbmVkIiwiTWF0aCIsImluZm8iLCJzaXplIiwiT2JqZWN0IiwiZW50cmllcyIsIm1hcCIsInZlcnNpb25UeXBlQ29udmVydGVyIiwiYm9vbGVhbkNvbnZlcnRlciIsIm5hbWUiLCJhdHRyaWJ1dGVzIiwiZW51bWVyYWJsZSIsInRvIiwiZnJvbSIsImdldCIsImNvbnNvbGUiLCJhc3NlcnQiLCJ2YWx1ZSIsImdldEVycm9yIiwiZ2V0UmF3VmFsdWUiLCJzZXQiLCJuZXdWYWx1ZSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInNldFJhd1ZhbHVlIiwiZGVmaW5lUHJvcGVydHkiLCJnZXRNaWJGaWxlIiwibWlibmFtZSIsInBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwiRGV2aWNlUHJvdG90eXBlIiwiRXZlbnRFbWl0dGVyIiwiY29uc3RydWN0b3IiLCJtaWJmaWxlIiwibWliVmFsaWRhdGlvbiIsImRlY29kZSIsInBhcnNlIiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJ0b1N0cmluZyIsImlzTGVmdCIsIlBhdGhSZXBvcnRlciIsInJlcG9ydCIsIm1pYiIsImVycm9yVHlwZSIsIm1ldGFzdWJzIiwiXyIsInRyYW5zZm9ybSIsInJlc3VsdCIsInN1YiIsImRlc2NyaXB0aW9uIiwiYXJncyIsImRlc2MiLCJrZXlzIiwib3duS2V5cyIsInZhbGlkSnNOYW1lIiwiZm9yRWFjaCIsInByb3BOYW1lIiwiY29ubmVjdGlvbiIsInZhbHVlcyIsInByZXYiLCJlbWl0IiwidG9KU09OIiwianNvbiIsImdldE1ldGFkYXRhIiwiYWRkcmVzcyIsImdldElkIiwiaWRPck5hbWUiLCJpc0ludGVnZXIiLCJoYXMiLCJnZXROYW1lIiwiaW5jbHVkZXMiLCJpc0RpcnR5IiwiZXJyb3JzIiwibmV3VmFsIiwic2V0RGlydHkiLCJzZXRFcnJvciIsImVycm9yIiwiZGlydGllcyIsIm5hbWVzIiwiQWRkcmVzc1R5cGUiLCJtYWMiLCJzZXJubyIsInByZXZBZGRyZXNzIiwiQnVmZmVyIiwicGFkU3RhcnQiLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJBZGRyZXNzIiwiZGV2aWNlcyIsImFkZHJlZiIsIiRjb3VudFJlZiIsInN0YWNrIiwicmVsZWFzZSIsIndpdGhvdXQiLCJkcmFpbiIsImlkcyIsImZpbHRlciIsIndyaXRlIiwiUHJvbWlzZSIsIndyaXRlQWxsIiwicmVqZWN0Iiwiam9pbiIsImludmFsaWRObXMiLCJyZXF1ZXN0cyIsInJlZHVjZSIsImFjYyIsImUiLCJtZXNzYWdlIiwiYWxsIiwiZGF0YWdyYW0iLCJzZW5kRGF0YWdyYW0iLCJ0aGVuIiwic3RhdHVzIiwiTmlidXNFcnJvciIsInJlYXNvbiIsImNvbmNhdCIsIndyaXRlVmFsdWVzIiwic291cmNlIiwic3Ryb25nIiwiVHlwZUVycm9yIiwiYXNzaWduIiwid3JpdHRlbiIsImVyciIsInJlYWRBbGwiLCIkcmVhZCIsInNvcnQiLCJyZWFkIiwiY2xlYXIiLCJmaW5hbGx5IiwiZGlzYWJsZUJhdGNoUmVhZGluZyIsImNodW5rcyIsImNodW5rIiwicHJvbWlzZSIsImRhdGFncmFtcyIsIkFycmF5IiwiaXNBcnJheSIsInVwbG9hZCIsImRvbWFpbiIsIm9mZnNldCIsInJlcVVwbG9hZCIsInBhZEVuZCIsImRvbWFpblNpemUiLCJpbml0VXBsb2FkIiwiaW5pdFN0YXQiLCJ0b3RhbCIsInJlc3QiLCJwb3MiLCJidWZzIiwidXBsb2FkU2VnbWVudCIsInVwbG9hZFN0YXR1cyIsImRhdGEiLCJkb3dubG9hZCIsImJ1ZmZlciIsIm5vVGVybSIsInJlcURvd25sb2FkIiwidGVybWluYXRlIiwidGVybVN0YXQiLCJyZXEiLCJyZXMiLCJpbml0RG93bmxvYWQiLCJjcmMiLCJjaHVua1NpemUiLCJOTVNfTUFYX0RBVEFfTEVOR1RIIiwiaSIsInNlZ21lbnREb3dubG9hZCIsImRvd25sb2FkU3RhdCIsInZlcmlmeSIsInZlcmlmeVN0YXQiLCJleGVjdXRlIiwicHJvZ3JhbSIsInN1YnJvdXRpbmUiLCJwcm9wcyIsImFyZyIsIm5vdFJlcGx5IiwiZ2V0TWliVHlwZXMiLCJjb25mIiwiY29uZmlnRGlyIiwiZXhpc3RzU3luYyIsInZhbGlkYXRlIiwiQ29uZmlnViIsIm1pYlR5cGVzIiwiZmluZE1pYkJ5VHlwZSIsInZlcnNpb24iLCJtaWJzIiwibWliVHlwZSIsImZpbmRMYXN0IiwibWluVmVyc2lvbiIsImdldENvbnN0cnVjdG9yIiwiRGV2aWNlIiwiYXBwbHkiLCJwcm90b3R5cGUiLCJjcmVhdGUiLCJkaXNwbGF5TmFtZSIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJnZXRNaWJQcm90b3R5cGUiLCJEZXZpY2VzIiwiZmxhdHRlbiIsInRhcmdldEFkZHJlc3MiLCJtaWJPclR5cGUiLCJTdHJpbmciLCJjb25zdHJ1Y3QiLCJpc0VtcHR5IiwicHJvY2VzcyIsIm5leHRUaWNrIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFXQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFDQTs7QUFFQTs7QUFDQTs7QUFnQkE7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7Ozs7O0FBb0JBO0FBQ0E7QUFFQSxNQUFNQSxPQUFPLEdBQUcsZ0JBQWhCLEMsQ0FBa0M7O0FBRWxDLE1BQU1DLEtBQUssR0FBRyxvQkFBYSxlQUFiLENBQWQ7QUFFQSxNQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQyxRQUFELENBQXRCO0FBQ0EsTUFBTUMsT0FBTyxHQUFHRCxNQUFNLENBQUMsUUFBRCxDQUF0QjtBQUNBLE1BQU1FLFFBQVEsR0FBR0YsTUFBTSxDQUFDLFNBQUQsQ0FBdkI7O0FBRUEsU0FBU0csVUFBVCxDQUFvQkMsR0FBcEIsRUFBOEI7QUFDNUIsUUFBTUMsR0FBRyxHQUFHQyxVQUFVLENBQUNGLEdBQUQsQ0FBdEI7QUFDQSxTQUFRRyxNQUFN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QUFSLENBQWtCMUssV0FBbEIsRUFBK0IsQ0FBQ3VLLGFBQUQsQ0FBL0IsQ0FBeEI7O0FBQ0EsUUFBSSxDQUFDQSxhQUFhLENBQUNJLE9BQW5CLEVBQTRCO0FBQzFCLFlBQU1uTyxHQUFHLEdBQUcrTixhQUFhLENBQUNoSyxRQUFkLEVBQVo7QUFDQTlHLE1BQUFBLFNBQVMsQ0FBQytDLEdBQUQsQ0FBVCxHQUFpQixDQUFDL0MsU0FBUyxDQUFDK0MsR0FBRCxDQUFULElBQWtCLEVBQW5CLEVBQXVCNEksTUFBdkIsQ0FBOEJuSixNQUE5QixDQUFqQjtBQUNBMk8sTUFBQUEsT0FBTyxDQUFDQyxRQUFSLENBQWlCLE1BQU0sS0FBS2hKLElBQUwsQ0FBVSxLQUFWLEVBQWlCNUYsTUFBakIsQ0FBdkI7QUFDRDs7QUFDRCxXQUFPQSxNQUFQO0FBQ0Q7O0FBdkN1Qzs7O0FBMEMxQyxNQUFNd0gsT0FBTyxHQUFHLElBQUk0RyxPQUFKLEVBQWhCO2VBRWU1RyxPIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTkuIE9PTyBOYXRhLUluZm9cbiAqIEBhdXRob3IgQW5kcmVpIFNhcmFrZWV2IDxhdnNAbmF0YS1pbmZvLnJ1PlxuICpcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIHRoZSBcIkBuYXRhXCIgcHJvamVjdC5cbiAqIEZvciB0aGUgZnVsbCBjb3B5cmlnaHQgYW5kIGxpY2Vuc2UgaW5mb3JtYXRpb24sIHBsZWFzZSB2aWV3XG4gKiB0aGUgRVVMQSBmaWxlIHRoYXQgd2FzIGRpc3RyaWJ1dGVkIHdpdGggdGhpcyBzb3VyY2UgY29kZS5cbiAqL1xuXG4vKiB0c2xpbnQ6ZGlzYWJsZTp2YXJpYWJsZS1uYW1lICovXG5pbXBvcnQgeyBjcmMxNmNjaXR0IH0gZnJvbSAnY3JjJztcbmltcG9ydCBkZWJ1Z0ZhY3RvcnkgZnJvbSAnZGVidWcnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gZnJvbSAnZXZlbnRzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0IGZyb20gJ2lvLXRzJztcbmltcG9ydCB7IFBhdGhSZXBvcnRlciB9IGZyb20gJ2lvLXRzL2xpYi9QYXRoUmVwb3J0ZXInO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICdyZWZsZWN0LW1ldGFkYXRhJztcbmltcG9ydCB7IGNvbmZpZyBhcyBjb25maWdEaXIgfSBmcm9tICd4ZGctYmFzZWRpcic7XG5pbXBvcnQgQWRkcmVzcywgeyBBZGRyZXNzUGFyYW0sIEFkZHJlc3NUeXBlIH0gZnJvbSAnLi4vQWRkcmVzcyc7XG5pbXBvcnQgeyBOaWJ1c0Vycm9yIH0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7IE5NU19NQVhfREFUQV9MRU5HVEggfSBmcm9tICcuLi9uYmNvbnN0JztcbmltcG9ydCB7IE5pYnVzQ29ubmVjdGlvbiB9IGZyb20gJy4uL25pYnVzJztcbmltcG9ydCB7IGNodW5rQXJyYXkgfSBmcm9tICcuLi9uaWJ1cy9oZWxwZXInO1xuaW1wb3J0IHtcbiAgY3JlYXRlRXhlY3V0ZVByb2dyYW1JbnZvY2F0aW9uLFxuICBjcmVhdGVObXNEb3dubG9hZFNlZ21lbnQsXG4gIGNyZWF0ZU5tc0luaXRpYXRlRG93bmxvYWRTZXF1ZW5jZSxcbiAgY3JlYXRlTm1zSW5pdGlhdGVVcGxvYWRTZXF1ZW5jZSxcbiAgY3JlYXRlTm1zUmVhZCxcbiAgY3JlYXRlTm1zUmVxdWVzdERvbWFpbkRvd25sb2FkLFxuICBjcmVhdGVObXNSZXF1ZXN0RG9tYWluVXBsb2FkLFxuICBjcmVhdGVObXNUZXJtaW5hdGVEb3dubG9hZFNlcXVlbmNlLFxuICBjcmVhdGVObXNVcGxvYWRTZWdtZW50LFxuICBjcmVhdGVObXNWZXJpZnlEb21haW5DaGVja3N1bSxcbiAgY3JlYXRlTm1zV3JpdGUsXG4gIGdldE5tc1R5cGUsXG4gIFR5cGVkVmFsdWUsXG59IGZyb20gJy4uL25tcyc7XG5pbXBvcnQgTm1zRGF0YWdyYW0gZnJvbSAnLi4vbm1zL05tc0RhdGFncmFtJztcbmltcG9ydCBObXNWYWx1ZVR5cGUgZnJvbSAnLi4vbm1zL05tc1ZhbHVlVHlwZSc7XG5pbXBvcnQgeyBDb25maWcsIENvbmZpZ1YgfSBmcm9tICcuLi9zZXNzaW9uL2NvbW1vbic7XG5pbXBvcnQgdGltZWlkIGZyb20gJy4uL3RpbWVpZCc7XG5pbXBvcnQge1xuICBib29sZWFuQ29udmVydGVyLFxuICBjb252ZXJ0RnJvbSxcbiAgY29udmVydFRvLFxuICBlbnVtZXJhdGlvbkNvbnZlcnRlcixcbiAgZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIsXG4gIGdldEludFNpemUsXG4gIElDb252ZXJ0ZXIsXG4gIG1heEluY2x1c2l2ZUNvbnZlcnRlcixcbiAgbWluSW5jbHVzaXZlQ29udmVydGVyLFxuICBwYWNrZWQ4ZmxvYXRDb252ZXJ0ZXIsXG4gIHBlcmNlbnRDb252ZXJ0ZXIsXG4gIHByZWNpc2lvbkNvbnZlcnRlcixcbiAgcmVwcmVzZW50YXRpb25Db252ZXJ0ZXIsXG4gIHRvSW50LFxuICB1bml0Q29udmVydGVyLFxuICB2YWxpZEpzTmFtZSxcbiAgdmVyc2lvblR5cGVDb252ZXJ0ZXIsXG4gIHdpdGhWYWx1ZSxcbn0gZnJvbSAnLi9taWInO1xuLy8gaW1wb3J0IHsgZ2V0TWlic1N5bmMgfSBmcm9tICcuL21pYjJqc29uJztcbi8vIGltcG9ydCBkZXRlY3RvciBmcm9tICcuLi9zZXJ2aWNlL2RldGVjdG9yJztcblxuY29uc3QgcGtnTmFtZSA9ICdAbmF0YS9uaWJ1cy5qcyc7IC8vIHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5cbmNvbnN0IGRlYnVnID0gZGVidWdGYWN0b3J5KCduaWJ1czpkZXZpY2VzJyk7XG5cbmNvbnN0ICR2YWx1ZXMgPSBTeW1ib2woJ3ZhbHVlcycpO1xuY29uc3QgJGVycm9ycyA9IFN5bWJvbCgnZXJyb3JzJyk7XG5jb25zdCAkZGlydGllcyA9IFN5bWJvbCgnZGlydGllcycpO1xuXG5mdW5jdGlvbiBzYWZlTnVtYmVyKHZhbDogYW55KSB7XG4gIGNvbnN0IG51bSA9IHBhcnNlRmxvYXQodmFsKTtcbiAgcmV0dXJuIChOdW1iZXIuaXNOYU4obnVtKSB8fCBgJHtudW19YCAhPT0gdmFsKSA/IHZhbCA6IG51bTtcbn1cblxuZW51bSBQcml2YXRlUHJvcHMge1xuICBjb25uZWN0aW9uID0gLTEsXG59XG5cbmNvbnN0IGRldmljZU1hcDogeyBbYWRkcmVzczogc3RyaW5nXTogSURldmljZVtdIH0gPSB7fTtcblxuY29uc3QgbWliVHlwZXNDYWNoZTogeyBbbWlibmFtZTogc3RyaW5nXTogRnVuY3Rpb24gfSA9IHt9O1xuXG5jb25zdCBNaWJQcm9wZXJ0eUFwcEluZm9WID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIG5tc19pZDogdC51bmlvbihbdC5zdHJpbmcsIHQuSW50XSksXG4gICAgYWNjZXNzOiB0LnN0cmluZyxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgY2F0ZWdvcnk6IHQuc3RyaW5nLFxuICB9KSxcbl0pO1xuXG4vLyBpbnRlcmZhY2UgSU1pYlByb3BlcnR5QXBwSW5mbyBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJQcm9wZXJ0eUFwcEluZm9WPiB7fVxuXG5jb25zdCBNaWJQcm9wZXJ0eVYgPSB0LnR5cGUoe1xuICB0eXBlOiB0LnN0cmluZyxcbiAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gIGFwcGluZm86IE1pYlByb3BlcnR5QXBwSW5mb1YsXG59KTtcblxuaW50ZXJmYWNlIElNaWJQcm9wZXJ0eSBleHRlbmRzIHQuVHlwZU9mPHR5cGVvZiBNaWJQcm9wZXJ0eVY+IHtcbiAgLy8gYXBwaW5mbzogSU1pYlByb3BlcnR5QXBwSW5mbztcbn1cblxuY29uc3QgTWliRGV2aWNlQXBwSW5mb1YgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgbWliX3ZlcnNpb246IHQuc3RyaW5nLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBkZXZpY2VfdHlwZTogdC5zdHJpbmcsXG4gICAgbG9hZGVyX3R5cGU6IHQuc3RyaW5nLFxuICAgIGZpcm13YXJlOiB0LnN0cmluZyxcbiAgICBtaW5fdmVyc2lvbjogdC5zdHJpbmcsXG4gIH0pLFxuXSk7XG5cbmNvbnN0IE1pYkRldmljZVR5cGVWID0gdC50eXBlKHtcbiAgYW5ub3RhdGlvbjogdC5zdHJpbmcsXG4gIGFwcGluZm86IE1pYkRldmljZUFwcEluZm9WLFxuICBwcm9wZXJ0aWVzOiB0LnJlY29yZCh0LnN0cmluZywgTWliUHJvcGVydHlWKSxcbn0pO1xuXG5leHBvcnQgaW50ZXJmYWNlIElNaWJEZXZpY2VUeXBlIGV4dGVuZHMgdC5UeXBlT2Y8dHlwZW9mIE1pYkRldmljZVR5cGVWPiB7fVxuXG5jb25zdCBNaWJUeXBlViA9IHQuaW50ZXJzZWN0aW9uKFtcbiAgdC50eXBlKHtcbiAgICBiYXNlOiB0LnN0cmluZyxcbiAgfSksXG4gIHQucGFydGlhbCh7XG4gICAgYXBwaW5mbzogdC5wYXJ0aWFsKHtcbiAgICAgIHplcm86IHQuc3RyaW5nLFxuICAgICAgdW5pdHM6IHQuc3RyaW5nLFxuICAgICAgcHJlY2lzaW9uOiB0LnN0cmluZyxcbiAgICAgIHJlcHJlc2VudGF0aW9uOiB0LnN0cmluZyxcbiAgICB9KSxcbiAgICBtaW5JbmNsdXNpdmU6IHQuc3RyaW5nLFxuICAgIG1heEluY2x1c2l2ZTogdC5zdHJpbmcsXG4gICAgZW51bWVyYXRpb246IHQucmVjb3JkKHQuc3RyaW5nLCB0LnR5cGUoeyBhbm5vdGF0aW9uOiB0LnN0cmluZyB9KSksXG4gIH0pLFxuXSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSU1pYlR5cGUgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliVHlwZVY+IHt9XG5cbmNvbnN0IE1pYlN1YnJvdXRpbmVWID0gdC5pbnRlcnNlY3Rpb24oW1xuICB0LnR5cGUoe1xuICAgIGFubm90YXRpb246IHQuc3RyaW5nLFxuICAgIGFwcGluZm86IHQuaW50ZXJzZWN0aW9uKFtcbiAgICAgIHQudHlwZSh7IG5tc19pZDogdC51bmlvbihbdC5zdHJpbmcsIHQuSW50XSkgfSksXG4gICAgICB0LnBhcnRpYWwoeyByZXNwb25zZTogdC5zdHJpbmcgfSksXG4gICAgXSksXG4gIH0pLFxuICB0LnBhcnRpYWwoe1xuICAgIHByb3BlcnRpZXM6IHQucmVjb3JkKHQuc3RyaW5nLCB0LnR5cGUoe1xuICAgICAgdHlwZTogdC5zdHJpbmcsXG4gICAgICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgICB9KSksXG4gIH0pLFxuXSk7XG5cbmNvbnN0IFN1YnJvdXRpbmVUeXBlViA9IHQudHlwZSh7XG4gIGFubm90YXRpb246IHQuc3RyaW5nLFxuICBwcm9wZXJ0aWVzOiB0LnR5cGUoe1xuICAgIGlkOiB0LnR5cGUoe1xuICAgICAgdHlwZTogdC5saXRlcmFsKCd4czp1bnNpZ25lZFNob3J0JyksXG4gICAgICBhbm5vdGF0aW9uOiB0LnN0cmluZyxcbiAgICB9KSxcbiAgfSksXG59KTtcblxuZXhwb3J0IGNvbnN0IE1pYkRldmljZVYgPSB0LmludGVyc2VjdGlvbihbXG4gIHQudHlwZSh7XG4gICAgZGV2aWNlOiB0LnN0cmluZyxcbiAgICB0eXBlczogdC5yZWNvcmQodC5zdHJpbmcsIHQudW5pb24oW01pYkRldmljZVR5cGVWLCBNaWJUeXBlViwgU3Vicm91dGluZVR5cGVWXSkpLFxuICB9KSxcbiAgdC5wYXJ0aWFsKHtcbiAgICBzdWJyb3V0aW5lczogdC5yZWNvcmQodC5zdHJpbmcsIE1pYlN1YnJvdXRpbmVWKSxcbiAgfSksXG5dKTtcblxuaW50ZXJmYWNlIElNaWJEZXZpY2UgZXh0ZW5kcyB0LlR5cGVPZjx0eXBlb2YgTWliRGV2aWNlVj4ge31cblxudHlwZSBMaXN0ZW5lcjxUPiA9IChhcmc6IFQpID0+IHZvaWQ7XG50eXBlIENoYW5nZUFyZyA9IHsgaWQ6IG51bWJlciwgbmFtZXM6IHN0cmluZ1tdIH07XG5leHBvcnQgdHlwZSBDaGFuZ2VMaXN0ZW5lciA9IExpc3RlbmVyPENoYW5nZUFyZz47XG50eXBlIFVwbG9hZFN0YXJ0QXJnID0geyBkb21haW46IHN0cmluZywgZG9tYWluU2l6ZTogbnVtYmVyLCBvZmZzZXQ6IG51bWJlciwgc2l6ZTogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBVcGxvYWRTdGFydExpc3RlbmVyID0gTGlzdGVuZXI8VXBsb2FkU3RhcnRBcmc+O1xudHlwZSBVcGxvYWREYXRhQXJnID0geyBkb21haW46IHN0cmluZywgZGF0YTogQnVmZmVyLCBwb3M6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgVXBsb2FkRGF0YUxpc3RlbmVyID0gTGlzdGVuZXI8VXBsb2FkRGF0YUFyZz47XG50eXBlIFVwbG9hZEZpbmlzaEFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIG9mZnNldDogbnVtYmVyLCBkYXRhOiBCdWZmZXIgfTtcbmV4cG9ydCB0eXBlIFVwbG9hZEZpbmlzaExpc3RlbmVyID0gTGlzdGVuZXI8VXBsb2FkRmluaXNoQXJnPjtcbnR5cGUgRG93bmxvYWRTdGFydEFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGRvbWFpblNpemU6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgRG93bmxvYWRTdGFydExpc3RlbmVyID0gTGlzdGVuZXI8RG93bmxvYWRTdGFydEFyZz47XG50eXBlIERvd25sb2FkRGF0YUFyZyA9IHsgZG9tYWluOiBzdHJpbmcsIGxlbmd0aDogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBEb3dubG9hZERhdGFMaXN0ZW5lciA9IExpc3RlbmVyPERvd25sb2FkRGF0YUFyZz47XG50eXBlIERvd25sb2FkRmluaXNoQXJnID0geyBkb21haW46IHN0cmluZzsgb2Zmc2V0OiBudW1iZXIsIHNpemU6IG51bWJlciB9O1xuZXhwb3J0IHR5cGUgRG93bmxvYWRGaW5pc2hMaXN0ZW5lciA9IExpc3RlbmVyPERvd25sb2FkRmluaXNoQXJnPjtcbmV4cG9ydCB0eXBlIERldmljZUlkID0gc3RyaW5nICYgeyBfX2JyYW5kOiAnRGV2aWNlSWQnIH07XG5cbmV4cG9ydCBpbnRlcmZhY2UgSURldmljZSB7XG4gIHJlYWRvbmx5IGlkOiBEZXZpY2VJZDtcbiAgcmVhZG9ubHkgYWRkcmVzczogQWRkcmVzcztcbiAgZHJhaW4oKTogUHJvbWlzZTxudW1iZXJbXT47XG4gIHdyaXRlKC4uLmlkczogbnVtYmVyW10pOiBQcm9taXNlPG51bWJlcltdPjtcbiAgcmVhZCguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTx7IFtuYW1lOiBzdHJpbmddOiBhbnkgfT47XG4gIHVwbG9hZChkb21haW46IHN0cmluZywgb2Zmc2V0PzogbnVtYmVyLCBzaXplPzogbnVtYmVyKTogUHJvbWlzZTxCdWZmZXI+O1xuICBkb3dubG9hZChkb21haW46IHN0cmluZywgZGF0YTogQnVmZmVyLCBvZmZzZXQ/OiBudW1iZXIsIG5vVGVybT86IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+O1xuICBleGVjdXRlKFxuICAgIHByb2dyYW06IHN0cmluZyxcbiAgICBhcmdzPzogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8Tm1zRGF0YWdyYW0gfCBObXNEYXRhZ3JhbVtdIHwgdW5kZWZpbmVkPjtcbiAgY29ubmVjdGlvbj86IE5pYnVzQ29ubmVjdGlvbjtcbiAgcmVsZWFzZSgpOiBudW1iZXI7XG4gIGdldElkKGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIpOiBudW1iZXI7XG4gIGdldE5hbWUoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IHN0cmluZztcbiAgZ2V0UmF3VmFsdWUoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueTtcbiAgZ2V0RXJyb3IoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueTtcbiAgaXNEaXJ0eShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogYm9vbGVhbjtcbiAgW21pYlByb3BlcnR5OiBzdHJpbmddOiBhbnk7XG5cbiAgb24oZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gb24oZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgb24oZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvbihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9uKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgb25jZShldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICAvLyBvbmNlKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGxpc3RlbmVyOiBVcGxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3VwbG9hZERhdGEnLCBsaXN0ZW5lcjogVXBsb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb25jZShldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgbGlzdGVuZXI6IERvd25sb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIG9uY2UoZXZlbnQ6ICdkb3dubG9hZERhdGEnLCBsaXN0ZW5lcjogRG93bmxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gYWRkTGlzdGVuZXIoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgYWRkTGlzdGVuZXIoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBhZGRMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgb2ZmKGV2ZW50OiAnY29ubmVjdGVkJyB8ICdkaXNjb25uZWN0ZWQnLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8vIG9mZihldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ3VwbG9hZFN0YXJ0JywgbGlzdGVuZXI6IFVwbG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICBvZmYoZXZlbnQ6ICd1cGxvYWREYXRhJywgbGlzdGVuZXI6IFVwbG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIG9mZihldmVudDogJ2Rvd25sb2FkU3RhcnQnLCBsaXN0ZW5lcjogRG93bmxvYWRTdGFydExpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnZG93bmxvYWREYXRhJywgbGlzdGVuZXI6IERvd25sb2FkRGF0YUxpc3RlbmVyKTogdGhpcztcbiAgb2ZmKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdjb25uZWN0ZWQnIHwgJ2Rpc2Nvbm5lY3RlZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgLy8gcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdzZXJubycsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgcmVtb3ZlTGlzdGVuZXIoZXZlbnQ6ICdjaGFuZ2luZycgfCAnY2hhbmdlZCcsIGxpc3RlbmVyOiBDaGFuZ2VMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAndXBsb2FkU3RhcnQnLCBsaXN0ZW5lcjogVXBsb2FkU3RhcnRMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAndXBsb2FkRGF0YScsIGxpc3RlbmVyOiBVcGxvYWREYXRhTGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ3VwbG9hZEZpbmlzaCcsIGxpc3RlbmVyOiBVcGxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRTdGFydCcsIGxpc3RlbmVyOiBEb3dubG9hZFN0YXJ0TGlzdGVuZXIpOiB0aGlzO1xuICByZW1vdmVMaXN0ZW5lcihldmVudDogJ2Rvd25sb2FkRGF0YScsIGxpc3RlbmVyOiBEb3dubG9hZERhdGFMaXN0ZW5lcik6IHRoaXM7XG4gIHJlbW92ZUxpc3RlbmVyKGV2ZW50OiAnZG93bmxvYWRGaW5pc2gnLCBsaXN0ZW5lcjogRG93bmxvYWRGaW5pc2hMaXN0ZW5lcik6IHRoaXM7XG5cbiAgZW1pdChldmVudDogJ2Nvbm5lY3RlZCcgfCAnZGlzY29ubmVjdGVkJyk6IGJvb2xlYW47XG4gIC8vIGVtaXQoZXZlbnQ6ICdzZXJubycpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAnY2hhbmdpbmcnIHwgJ2NoYW5nZWQnLCBhcmc6IENoYW5nZUFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICd1cGxvYWRTdGFydCcsIGFyZzogVXBsb2FkU3RhcnRBcmcpOiBib29sZWFuO1xuICBlbWl0KGV2ZW50OiAndXBsb2FkRGF0YScsIGFyZzogVXBsb2FkRGF0YUFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICd1cGxvYWRGaW5pc2gnLCBhcmc6IFVwbG9hZEZpbmlzaEFyZyk6IGJvb2xlYW47XG4gIGVtaXQoZXZlbnQ6ICdkb3dubG9hZFN0YXJ0JywgYXJnOiBEb3dubG9hZFN0YXJ0QXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2Rvd25sb2FkRGF0YScsIGFyZzogRG93bmxvYWREYXRhQXJnKTogYm9vbGVhbjtcbiAgZW1pdChldmVudDogJ2Rvd25sb2FkRmluaXNoJywgYXJnOiBEb3dubG9hZEZpbmlzaEFyZyk6IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBJU3Vicm91dGluZURlc2Mge1xuICBpZDogbnVtYmVyO1xuICAvLyBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIG5vdFJlcGx5PzogYm9vbGVhbjtcbiAgYXJncz86IHsgbmFtZTogc3RyaW5nLCB0eXBlOiBObXNWYWx1ZVR5cGUsIGRlc2M/OiBzdHJpbmcgfVtdO1xufVxuXG5pbnRlcmZhY2UgSVByb3BlcnR5RGVzY3JpcHRvcjxPd25lcj4ge1xuICBjb25maWd1cmFibGU/OiBib29sZWFuO1xuICBlbnVtZXJhYmxlPzogYm9vbGVhbjtcbiAgdmFsdWU/OiBhbnk7XG4gIHdyaXRhYmxlPzogYm9vbGVhbjtcblxuICBnZXQ/KHRoaXM6IE93bmVyKTogYW55O1xuXG4gIHNldD8odGhpczogT3duZXIsIHY6IGFueSk6IHZvaWQ7XG59XG5cbmZ1bmN0aW9uIGdldEJhc2VUeXBlKHR5cGVzOiBJTWliRGV2aWNlWyd0eXBlcyddLCB0eXBlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgYmFzZSA9IHR5cGU7XG4gIGZvciAobGV0IHN1cGVyVHlwZTogSU1pYlR5cGUgPSB0eXBlc1tiYXNlXSBhcyBJTWliVHlwZTsgc3VwZXJUeXBlICE9IG51bGw7XG4gICAgICAgc3VwZXJUeXBlID0gdHlwZXNbc3VwZXJUeXBlLmJhc2VdIGFzIElNaWJUeXBlKSB7XG4gICAgYmFzZSA9IHN1cGVyVHlwZS5iYXNlO1xuICB9XG4gIHJldHVybiBiYXNlO1xufVxuXG5mdW5jdGlvbiBkZWZpbmVNaWJQcm9wZXJ0eShcbiAgdGFyZ2V0OiBEZXZpY2VQcm90b3R5cGUsXG4gIGtleTogc3RyaW5nLFxuICB0eXBlczogSU1pYkRldmljZVsndHlwZXMnXSxcbiAgcHJvcDogSU1pYlByb3BlcnR5KTogW251bWJlciwgc3RyaW5nXSB7XG4gIGNvbnN0IHByb3BlcnR5S2V5ID0gdmFsaWRKc05hbWUoa2V5KTtcbiAgY29uc3QgeyBhcHBpbmZvIH0gPSBwcm9wO1xuICBjb25zdCBpZCA9IHRvSW50KGFwcGluZm8ubm1zX2lkKTtcbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnaWQnLCBpZCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGNvbnN0IHNpbXBsZVR5cGUgPSBnZXRCYXNlVHlwZSh0eXBlcywgcHJvcC50eXBlKTtcbiAgY29uc3QgdHlwZSA9IHR5cGVzW3Byb3AudHlwZV0gYXMgSU1pYlR5cGU7XG4gIGNvbnN0IGNvbnZlcnRlcnM6IElDb252ZXJ0ZXJbXSA9IFtdO1xuICBjb25zdCBpc1JlYWRhYmxlID0gYXBwaW5mby5hY2Nlc3MuaW5kZXhPZigncicpID4gLTE7XG4gIGNvbnN0IGlzV3JpdGFibGUgPSBhcHBpbmZvLmFjY2Vzcy5pbmRleE9mKCd3JykgPiAtMTtcbiAgbGV0IGVudW1lcmF0aW9uOiBJTWliVHlwZVsnZW51bWVyYXRpb24nXSB8IHVuZGVmaW5lZDtcbiAgbGV0IG1pbjogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICBsZXQgbWF4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHN3aXRjaCAoZ2V0Tm1zVHlwZShzaW1wbGVUeXBlKSkge1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLkludDg6XG4gICAgICBtaW4gPSAtMTI4O1xuICAgICAgbWF4ID0gMTI3O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuSW50MTY6XG4gICAgICBtaW4gPSAtMzI3Njg7XG4gICAgICBtYXggPSAzMjc2NztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgTm1zVmFsdWVUeXBlLkludDMyOlxuICAgICAgbWluID0gLTIxNDc0ODM2NDg7XG4gICAgICBtYXggPSAyMTQ3NDgzNjQ3O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuVUludDg6XG4gICAgICBtaW4gPSAwO1xuICAgICAgbWF4ID0gMjU1O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuVUludDE2OlxuICAgICAgbWluID0gMDtcbiAgICAgIG1heCA9IDY1NTM1O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBObXNWYWx1ZVR5cGUuVUludDMyOlxuICAgICAgbWluID0gMDtcbiAgICAgIG1heCA9IDQyOTQ5NjcyOTU7XG4gICAgICBicmVhaztcbiAgfVxuICBzd2l0Y2ggKHNpbXBsZVR5cGUpIHtcbiAgICBjYXNlICdwYWNrZWQ4RmxvYXQnOlxuICAgICAgY29udmVydGVycy5wdXNoKHBhY2tlZDhmbG9hdENvbnZlcnRlcih0eXBlKSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdmaXhlZFBvaW50TnVtYmVyNCc6XG4gICAgICBjb252ZXJ0ZXJzLnB1c2goZml4ZWRQb2ludE51bWJlcjRDb252ZXJ0ZXIpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGJyZWFrO1xuICB9XG4gIGlmIChrZXkgPT09ICdicmlnaHRuZXNzJyAmJiBwcm9wLnR5cGUgPT09ICd4czp1bnNpZ25lZEJ5dGUnKSB7XG4gICAgY29udmVydGVycy5wdXNoKHBlcmNlbnRDb252ZXJ0ZXIpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3VuaXQnLCAnJScsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbicsIDAsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21heCcsIDEwMCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIH0gZWxzZSBpZiAoaXNXcml0YWJsZSkge1xuICAgIGlmICh0eXBlICE9IG51bGwpIHtcbiAgICAgIGNvbnN0IHsgbWluSW5jbHVzaXZlLCBtYXhJbmNsdXNpdmUgfSA9IHR5cGU7XG4gICAgICBpZiAobWluSW5jbHVzaXZlKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQobWluSW5jbHVzaXZlKTtcbiAgICAgICAgbWluID0gbWluICE9PSB1bmRlZmluZWQgPyBNYXRoLm1heChtaW4sIHZhbCkgOiB2YWw7XG4gICAgICB9XG4gICAgICBpZiAobWF4SW5jbHVzaXZlKSB7XG4gICAgICAgIGNvbnN0IHZhbCA9IHBhcnNlRmxvYXQobWF4SW5jbHVzaXZlKTtcbiAgICAgICAgbWF4ID0gbWF4ICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbihtYXgsIHZhbCkgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChtaW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWluID0gY29udmVydFRvKGNvbnZlcnRlcnMpKG1pbikgYXMgbnVtYmVyO1xuICAgICAgY29udmVydGVycy5wdXNoKG1pbkluY2x1c2l2ZUNvbnZlcnRlcihtaW4pKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbicsIG1pbiwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICAgIGlmIChtYXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgbWF4ID0gY29udmVydFRvKGNvbnZlcnRlcnMpKG1heCkgYXMgbnVtYmVyO1xuICAgICAgY29udmVydGVycy5wdXNoKG1heEluY2x1c2l2ZUNvbnZlcnRlcihtYXgpKTtcbiAgICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21heCcsIG1heCwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gICAgfVxuICB9XG4gIGlmICh0eXBlICE9IG51bGwpIHtcbiAgICBjb25zdCB7IGFwcGluZm86IGluZm8gPSB7fSB9ID0gdHlwZTtcbiAgICBlbnVtZXJhdGlvbiA9IHR5cGUuZW51bWVyYXRpb247XG4gICAgY29uc3QgeyB1bml0cywgcHJlY2lzaW9uLCByZXByZXNlbnRhdGlvbiB9ID0gaW5mbztcbiAgICBjb25zdCBzaXplID0gZ2V0SW50U2l6ZShzaW1wbGVUeXBlKTtcbiAgICBpZiAodW5pdHMpIHtcbiAgICAgIGNvbnZlcnRlcnMucHVzaCh1bml0Q29udmVydGVyKHVuaXRzKSk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCd1bml0JywgdW5pdHMsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICAgIH1cbiAgICBwcmVjaXNpb24gJiYgY29udmVydGVycy5wdXNoKHByZWNpc2lvbkNvbnZlcnRlcihwcmVjaXNpb24pKTtcbiAgICBpZiAoZW51bWVyYXRpb24pIHtcbiAgICAgIGNvbnZlcnRlcnMucHVzaChlbnVtZXJhdGlvbkNvbnZlcnRlcihlbnVtZXJhdGlvbikpO1xuICAgICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZW51bScsIE9iamVjdC5lbnRyaWVzKGVudW1lcmF0aW9uKVxuICAgICAgICAubWFwKChba2V5LCB2YWxdKSA9PiBbXG4gICAgICAgICAgdmFsIS5hbm5vdGF0aW9uLFxuICAgICAgICAgIHRvSW50KGtleSksXG4gICAgICAgIF0pLCB0YXJnZXQsIHByb3BlcnR5S2V5KTtcbiAgICB9XG4gICAgcmVwcmVzZW50YXRpb24gJiYgc2l6ZSAmJiBjb252ZXJ0ZXJzLnB1c2gocmVwcmVzZW50YXRpb25Db252ZXJ0ZXIocmVwcmVzZW50YXRpb24sIHNpemUpKTtcbiAgfVxuXG4gIGlmIChwcm9wLnR5cGUgPT09ICd2ZXJzaW9uVHlwZScpIHtcbiAgICBjb252ZXJ0ZXJzLnB1c2godmVyc2lvblR5cGVDb252ZXJ0ZXIpO1xuICB9XG4gIGlmIChzaW1wbGVUeXBlID09PSAneHM6Ym9vbGVhbicgJiYgIWVudW1lcmF0aW9uKSB7XG4gICAgY29udmVydGVycy5wdXNoKGJvb2xlYW5Db252ZXJ0ZXIpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2VudW0nLCBbWyfQlNCwJywgdHJ1ZV0sIFsn0J3QtdGCJywgZmFsc2VdXSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIH1cbiAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnaXNXcml0YWJsZScsIGlzV3JpdGFibGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdpc1JlYWRhYmxlJywgaXNSZWFkYWJsZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ3R5cGUnLCBwcm9wLnR5cGUsIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzaW1wbGVUeXBlJywgc2ltcGxlVHlwZSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoXG4gICAgJ2Rpc3BsYXlOYW1lJyxcbiAgICBwcm9wLmFubm90YXRpb24gPyBwcm9wLmFubm90YXRpb24gOiBuYW1lLFxuICAgIHRhcmdldCxcbiAgICBwcm9wZXJ0eUtleSxcbiAgKTtcbiAgYXBwaW5mby5jYXRlZ29yeSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjYXRlZ29yeScsIGFwcGluZm8uY2F0ZWdvcnksIHRhcmdldCwgcHJvcGVydHlLZXkpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdubXNUeXBlJywgZ2V0Tm1zVHlwZShzaW1wbGVUeXBlKSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGNvbnN0IGF0dHJpYnV0ZXM6IElQcm9wZXJ0eURlc2NyaXB0b3I8RGV2aWNlUHJvdG90eXBlPiA9IHtcbiAgICBlbnVtZXJhYmxlOiBpc1JlYWRhYmxlLFxuICB9O1xuICBjb25zdCB0byA9IGNvbnZlcnRUbyhjb252ZXJ0ZXJzKTtcbiAgY29uc3QgZnJvbSA9IGNvbnZlcnRGcm9tKGNvbnZlcnRlcnMpO1xuICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdjb252ZXJ0VG8nLCB0bywgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NvbnZlcnRGcm9tJywgZnJvbSwgdGFyZ2V0LCBwcm9wZXJ0eUtleSk7XG4gIGF0dHJpYnV0ZXMuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUuYXNzZXJ0KFJlZmxlY3QuZ2V0KHRoaXMsICckY291bnRSZWYnKSA+IDAsICdEZXZpY2Ugd2FzIHJlbGVhc2VkJyk7XG4gICAgbGV0IHZhbHVlO1xuICAgIGlmICghdGhpcy5nZXRFcnJvcihpZCkpIHtcbiAgICAgIHZhbHVlID0gdG8odGhpcy5nZXRSYXdWYWx1ZShpZCkpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG4gIGlmIChpc1dyaXRhYmxlKSB7XG4gICAgYXR0cmlidXRlcy5zZXQgPSBmdW5jdGlvbiAobmV3VmFsdWU6IGFueSkge1xuICAgICAgY29uc29sZS5hc3NlcnQoUmVmbGVjdC5nZXQodGhpcywgJyRjb3VudFJlZicpID4gMCwgJ0RldmljZSB3YXMgcmVsZWFzZWQnKTtcbiAgICAgIGNvbnN0IHZhbHVlID0gZnJvbShuZXdWYWx1ZSk7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCBOdW1iZXIuaXNOYU4odmFsdWUgYXMgbnVtYmVyKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkobmV3VmFsdWUpfWApO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXRSYXdWYWx1ZShpZCwgdmFsdWUpO1xuICAgIH07XG4gIH1cbiAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5S2V5LCBhdHRyaWJ1dGVzKTtcbiAgcmV0dXJuIFtpZCwgcHJvcGVydHlLZXldO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWliRmlsZShtaWJuYW1lOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9taWJzLycsIGAke21pYm5hbWV9Lm1pYi5qc29uYCk7XG59XG5cbmNsYXNzIERldmljZVByb3RvdHlwZSBleHRlbmRzIEV2ZW50RW1pdHRlciBpbXBsZW1lbnRzIElEZXZpY2Uge1xuICAvLyB3aWxsIGJlIG92ZXJyaWRlIGZvciBhbiBpbnN0YW5jZVxuICAkY291bnRSZWYgPSAxO1xuXG4gIC8vIHByaXZhdGUgJGRlYm91bmNlRHJhaW4gPSBfLmRlYm91bmNlKHRoaXMuZHJhaW4sIDI1KTtcblxuICBjb25zdHJ1Y3RvcihtaWJuYW1lOiBzdHJpbmcpIHtcbiAgICBzdXBlcigpO1xuICAgIGNvbnN0IG1pYmZpbGUgPSBnZXRNaWJGaWxlKG1pYm5hbWUpO1xuICAgIGNvbnN0IG1pYlZhbGlkYXRpb24gPSBNaWJEZXZpY2VWLmRlY29kZShKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtaWJmaWxlKS50b1N0cmluZygpKSk7XG4gICAgaWYgKG1pYlZhbGlkYXRpb24uaXNMZWZ0KCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBtaWIgZmlsZSAke21pYmZpbGV9ICR7UGF0aFJlcG9ydGVyLnJlcG9ydChtaWJWYWxpZGF0aW9uKX1gKTtcbiAgICB9XG4gICAgY29uc3QgbWliID0gbWliVmFsaWRhdGlvbi52YWx1ZTtcbiAgICBjb25zdCB7IHR5cGVzLCBzdWJyb3V0aW5lcyB9ID0gbWliO1xuICAgIGNvbnN0IGRldmljZSA9IHR5cGVzW21pYi5kZXZpY2VdIGFzIElNaWJEZXZpY2VUeXBlO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYicsIG1pYm5hbWUsIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYmZpbGUnLCBtaWJmaWxlLCB0aGlzKTtcbiAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdhbm5vdGF0aW9uJywgZGV2aWNlLmFubm90YXRpb24sIHRoaXMpO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pYlZlcnNpb24nLCBkZXZpY2UuYXBwaW5mby5taWJfdmVyc2lvbiwgdGhpcyk7XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZGV2aWNlVHlwZScsIHRvSW50KGRldmljZS5hcHBpbmZvLmRldmljZV90eXBlKSwgdGhpcyk7XG4gICAgZGV2aWNlLmFwcGluZm8ubG9hZGVyX3R5cGUgJiYgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbG9hZGVyVHlwZScsXG4gICAgICB0b0ludChkZXZpY2UuYXBwaW5mby5sb2FkZXJfdHlwZSksIHRoaXMsXG4gICAgKTtcbiAgICBkZXZpY2UuYXBwaW5mby5maXJtd2FyZSAmJiBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdmaXJtd2FyZScsXG4gICAgICBkZXZpY2UuYXBwaW5mby5maXJtd2FyZSwgdGhpcyxcbiAgICApO1xuICAgIGRldmljZS5hcHBpbmZvLm1pbl92ZXJzaW9uICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21pbl92ZXJzaW9uJyxcbiAgICAgIGRldmljZS5hcHBpbmZvLm1pbl92ZXJzaW9uLCB0aGlzLFxuICAgICk7XG4gICAgdHlwZXMuZXJyb3JUeXBlICYmIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoXG4gICAgICAnZXJyb3JUeXBlJywgKHR5cGVzLmVycm9yVHlwZSBhcyBJTWliVHlwZSkuZW51bWVyYXRpb24sIHRoaXMpO1xuXG4gICAgaWYgKHN1YnJvdXRpbmVzKSB7XG4gICAgICBjb25zdCBtZXRhc3VicyA9IF8udHJhbnNmb3JtKFxuICAgICAgICBzdWJyb3V0aW5lcyxcbiAgICAgICAgKHJlc3VsdCwgc3ViLCBuYW1lKSA9PiB7XG4gICAgICAgICAgcmVzdWx0W25hbWVdID0ge1xuICAgICAgICAgICAgaWQ6IHRvSW50KHN1Yi5hcHBpbmZvLm5tc19pZCksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogc3ViLmFubm90YXRpb24sXG4gICAgICAgICAgICBhcmdzOiBzdWIucHJvcGVydGllcyAmJiBPYmplY3QuZW50cmllcyhzdWIucHJvcGVydGllcylcbiAgICAgICAgICAgICAgLm1hcCgoW25hbWUsIHByb3BdKSA9PiAoe1xuICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgdHlwZTogZ2V0Tm1zVHlwZShwcm9wLnR5cGUpLFxuICAgICAgICAgICAgICAgIGRlc2M6IHByb3AuYW5ub3RhdGlvbixcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcbiAgICAgICAge30gYXMgUmVjb3JkPHN0cmluZywgSVN1YnJvdXRpbmVEZXNjPixcbiAgICAgICk7XG4gICAgICBSZWZsZWN0LmRlZmluZU1ldGFkYXRhKCdzdWJyb3V0aW5lcycsIG1ldGFzdWJzLCB0aGlzKTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBjYXRlZ29yeVxuICAgIC8vIGNvbnN0IG1pYkNhdGVnb3J5ID0gXy5maW5kKGRldGVjdG9yLmRldGVjdGlvbiEubWliQ2F0ZWdvcmllcywgeyBtaWI6IG1pYm5hbWUgfSk7XG4gICAgLy8gaWYgKG1pYkNhdGVnb3J5KSB7XG4gICAgLy8gICBjb25zdCB7IGNhdGVnb3J5LCBkaXNhYmxlQmF0Y2hSZWFkaW5nIH0gPSBtaWJDYXRlZ29yeTtcbiAgICAvLyAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ2NhdGVnb3J5JywgY2F0ZWdvcnksIHRoaXMpO1xuICAgIC8vICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnZGlzYWJsZUJhdGNoUmVhZGluZycsICEhZGlzYWJsZUJhdGNoUmVhZGluZywgdGhpcyk7XG4gICAgLy8gfVxuXG4gICAgY29uc3Qga2V5cyA9IFJlZmxlY3Qub3duS2V5cyhkZXZpY2UucHJvcGVydGllcykgYXMgc3RyaW5nW107XG4gICAgUmVmbGVjdC5kZWZpbmVNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIGtleXMubWFwKHZhbGlkSnNOYW1lKSwgdGhpcyk7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogbnVtYmVyXTogc3RyaW5nW10gfSA9IHt9O1xuICAgIGtleXMuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IFtpZCwgcHJvcE5hbWVdID0gZGVmaW5lTWliUHJvcGVydHkodGhpcywga2V5LCB0eXBlcywgZGV2aWNlLnByb3BlcnRpZXNba2V5XSk7XG4gICAgICBpZiAoIW1hcFtpZF0pIHtcbiAgICAgICAgbWFwW2lkXSA9IFtwcm9wTmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXBbaWRdLnB1c2gocHJvcE5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIFJlZmxlY3QuZGVmaW5lTWV0YWRhdGEoJ21hcCcsIG1hcCwgdGhpcyk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGNvbm5lY3Rpb24oKTogTmlidXNDb25uZWN0aW9uIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dO1xuICB9XG5cbiAgcHVibGljIHNldCBjb25uZWN0aW9uKHZhbHVlOiBOaWJ1c0Nvbm5lY3Rpb24gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCB7IFskdmFsdWVzXTogdmFsdWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IHByZXYgPSB2YWx1ZXNbUHJpdmF0ZVByb3BzLmNvbm5lY3Rpb25dO1xuICAgIGlmIChwcmV2ID09PSB2YWx1ZSkgcmV0dXJuO1xuICAgIHZhbHVlc1tQcml2YXRlUHJvcHMuY29ubmVjdGlvbl0gPSB2YWx1ZTtcbiAgICAvKipcbiAgICAgKiBEZXZpY2UgY29ubmVjdGVkIGV2ZW50XG4gICAgICogQGV2ZW50IElEZXZpY2UjY29ubmVjdGVkXG4gICAgICogQGV2ZW50IElEZXZpY2UjZGlzY29ubmVjdGVkXG4gICAgICovXG4gICAgdGhpcy5lbWl0KHZhbHVlICE9IG51bGwgPyAnY29ubmVjdGVkJyA6ICdkaXNjb25uZWN0ZWQnKTtcbiAgICAvLyBpZiAodmFsdWUpIHtcbiAgICAvLyAgIHRoaXMuZHJhaW4oKS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgLy8gfVxuICB9XG5cbiAgLy8gbm9pbnNwZWN0aW9uIEpTVW51c2VkR2xvYmFsU3ltYm9sc1xuICBwdWJsaWMgdG9KU09OKCk6IGFueSB7XG4gICAgY29uc3QganNvbjogYW55ID0ge1xuICAgICAgbWliOiBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCB0aGlzKSxcbiAgICB9O1xuICAgIGNvbnN0IGtleXM6IHN0cmluZ1tdID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliUHJvcGVydGllcycsIHRoaXMpO1xuICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBpZiAodGhpc1trZXldICE9PSB1bmRlZmluZWQpIGpzb25ba2V5XSA9IHRoaXNba2V5XTtcbiAgICB9KTtcbiAgICBqc29uLmFkZHJlc3MgPSB0aGlzLmFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICByZXR1cm4ganNvbjtcbiAgfVxuXG4gIHB1YmxpYyBnZXRJZChpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogbnVtYmVyIHtcbiAgICBsZXQgaWQ6IG51bWJlcjtcbiAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJykge1xuICAgICAgaWQgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdpZCcsIHRoaXMsIGlkT3JOYW1lKTtcbiAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKGlkKSkgcmV0dXJuIGlkO1xuICAgICAgaWQgPSB0b0ludChpZE9yTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkID0gaWRPck5hbWU7XG4gICAgfVxuICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGlmICghUmVmbGVjdC5oYXMobWFwLCBpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9wZXJ0eSAke2lkT3JOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICBwdWJsaWMgZ2V0TmFtZShpZE9yTmFtZTogc3RyaW5nIHwgbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBpZiAoUmVmbGVjdC5oYXMobWFwLCBpZE9yTmFtZSkpIHtcbiAgICAgIHJldHVybiBtYXBbaWRPck5hbWVdWzBdO1xuICAgIH1cbiAgICBjb25zdCBrZXlzOiBzdHJpbmdbXSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21pYlByb3BlcnRpZXMnLCB0aGlzKTtcbiAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJyAmJiBrZXlzLmluY2x1ZGVzKGlkT3JOYW1lKSkgcmV0dXJuIGlkT3JOYW1lO1xuICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9wZXJ0eSAke2lkT3JOYW1lfWApO1xuICB9XG5cbiAgLypcbiAgICBwdWJsaWMgdG9JZHMoaWRzT3JOYW1lczogKHN0cmluZyB8IG51bWJlcilbXSk6IG51bWJlcltdIHtcbiAgICAgIGNvbnN0IG1hcCA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgICAgcmV0dXJuIGlkc09yTmFtZXMubWFwKChpZE9yTmFtZSkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGlkT3JOYW1lID09PSAnc3RyaW5nJylcbiAgICAgIH0pO1xuICAgIH1cbiAgKi9cbiAgcHVibGljIGdldFJhd1ZhbHVlKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcpOiBhbnkge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICByZXR1cm4gdmFsdWVzW2lkXTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRSYXdWYWx1ZShpZE9yTmFtZTogbnVtYmVyIHwgc3RyaW5nLCB2YWx1ZTogYW55LCBpc0RpcnR5ID0gdHJ1ZSkge1xuICAgIC8vIGRlYnVnKGBzZXRSYXdWYWx1ZSgke2lkT3JOYW1lfSwgJHtKU09OLnN0cmluZ2lmeShzYWZlTnVtYmVyKHZhbHVlKSl9KWApO1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcywgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgY29uc3QgbmV3VmFsID0gc2FmZU51bWJlcih2YWx1ZSk7XG4gICAgaWYgKG5ld1ZhbCAhPT0gdmFsdWVzW2lkXSB8fCBlcnJvcnNbaWRdKSB7XG4gICAgICB2YWx1ZXNbaWRdID0gbmV3VmFsO1xuICAgICAgZGVsZXRlIGVycm9yc1tpZF07XG4gICAgICB0aGlzLnNldERpcnR5KGlkLCBpc0RpcnR5KTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZ2V0RXJyb3IoaWRPck5hbWU6IG51bWJlciB8IHN0cmluZyk6IGFueSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCB7IFskZXJyb3JzXTogZXJyb3JzIH0gPSB0aGlzO1xuICAgIHJldHVybiBlcnJvcnNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldEVycm9yKGlkT3JOYW1lOiBudW1iZXIgfCBzdHJpbmcsIGVycm9yPzogRXJyb3IpIHtcbiAgICBjb25zdCBpZCA9IHRoaXMuZ2V0SWQoaWRPck5hbWUpO1xuICAgIGNvbnN0IHsgWyRlcnJvcnNdOiBlcnJvcnMgfSA9IHRoaXM7XG4gICAgaWYgKGVycm9yICE9IG51bGwpIHtcbiAgICAgIGVycm9yc1tpZF0gPSBlcnJvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGVycm9yc1tpZF07XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGlzRGlydHkoaWRPck5hbWU6IHN0cmluZyB8IG51bWJlcik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGlkID0gdGhpcy5nZXRJZChpZE9yTmFtZSk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIHJldHVybiAhIWRpcnRpZXNbaWRdO1xuICB9XG5cbiAgcHVibGljIHNldERpcnR5KGlkT3JOYW1lOiBzdHJpbmcgfCBudW1iZXIsIGlzRGlydHkgPSB0cnVlKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLmdldElkKGlkT3JOYW1lKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBudW1iZXJdOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIGlmIChpc0RpcnR5KSB7XG4gICAgICBkaXJ0aWVzW2lkXSA9IHRydWU7XG4gICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgYXV0b3NhdmVcbiAgICAgIC8vIHRoaXMud3JpdGUoaWQpLmNhdGNoKCgpID0+IHt9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIGRpcnRpZXNbaWRdO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBAZXZlbnQgSURldmljZSNjaGFuZ2VkXG4gICAgICogQGV2ZW50IElEZXZpY2UjY2hhbmdpbmdcbiAgICAgKi9cbiAgICBjb25zdCBuYW1lcyA9IG1hcFtpZF0gfHwgW107XG4gICAgdGhpcy5lbWl0KFxuICAgICAgaXNEaXJ0eSA/ICdjaGFuZ2luZycgOiAnY2hhbmdlZCcsXG4gICAgICB7XG4gICAgICAgIGlkLFxuICAgICAgICBuYW1lcyxcbiAgICAgIH0sXG4gICAgKTtcbiAgICBpZiAobmFtZXMuaW5jbHVkZXMoJ3Nlcm5vJykgJiYgIWlzRGlydHlcbiAgICAgICYmIHRoaXMuYWRkcmVzcy50eXBlID09PSBBZGRyZXNzVHlwZS5tYWMgJiYgdHlwZW9mIHRoaXMuc2Vybm8gPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuc2Vybm87XG4gICAgICBjb25zdCBwcmV2QWRkcmVzcyA9IHRoaXMuYWRkcmVzcztcbiAgICAgIGNvbnN0IGFkZHJlc3MgPSBCdWZmZXIuZnJvbSh2YWx1ZS5wYWRTdGFydCgxMiwgJzAnKS5zdWJzdHJpbmcodmFsdWUubGVuZ3RoIC0gMTIpLCAnaGV4Jyk7XG4gICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGRyZXNzJywgd2l0aFZhbHVlKG5ldyBBZGRyZXNzKGFkZHJlc3MpLCBmYWxzZSwgdHJ1ZSkpO1xuICAgICAgZGV2aWNlcy5lbWl0KCdzZXJubycsIHByZXZBZGRyZXNzLCB0aGlzLmFkZHJlc3MpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhZGRyZWYoKSB7XG4gICAgdGhpcy4kY291bnRSZWYgKz0gMTtcbiAgICBkZWJ1ZygnYWRkcmVmJywgbmV3IEVycm9yKCdhZGRyZWYnKS5zdGFjayk7XG4gICAgcmV0dXJuIHRoaXMuJGNvdW50UmVmO1xuICB9XG5cbiAgcHVibGljIHJlbGVhc2UoKSB7XG4gICAgdGhpcy4kY291bnRSZWYgLT0gMTtcbiAgICBpZiAodGhpcy4kY291bnRSZWYgPD0gMCkge1xuICAgICAgY29uc3Qga2V5ID0gdGhpcy5hZGRyZXNzLnRvU3RyaW5nKCk7XG4gICAgICBkZXZpY2VNYXBba2V5XSA9IF8ud2l0aG91dChkZXZpY2VNYXBba2V5XSwgdGhpcyk7XG4gICAgICBpZiAoZGV2aWNlTWFwW2tleV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlbGV0ZSBkZXZpY2VNYXBba2V5XTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQGV2ZW50IERldmljZXMjZGVsZXRlXG4gICAgICAgKi9cbiAgICAgIGRldmljZXMuZW1pdCgnZGVsZXRlJywgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiRjb3VudFJlZjtcbiAgfVxuXG4gIHB1YmxpYyBkcmFpbigpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgZGVidWcoYGRyYWluIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgeyBbJGRpcnRpZXNdOiBkaXJ0aWVzIH0gPSB0aGlzO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKGRpcnRpZXMpLm1hcChOdW1iZXIpLmZpbHRlcihpZCA9PiBkaXJ0aWVzW2lkXSk7XG4gICAgcmV0dXJuIGlkcy5sZW5ndGggPiAwID8gdGhpcy53cml0ZSguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxuXG4gIHByaXZhdGUgd3JpdGVBbGwoKSB7XG4gICAgY29uc3QgeyBbJHZhbHVlc106IHZhbHVlcyB9ID0gdGhpcztcbiAgICBjb25zdCBtYXAgPSBSZWZsZWN0LmdldE1ldGFkYXRhKCdtYXAnLCB0aGlzKTtcbiAgICBjb25zdCBpZHMgPSBPYmplY3QuZW50cmllcyh2YWx1ZXMpXG4gICAgICAuZmlsdGVyKChbLCB2YWx1ZV0pID0+IHZhbHVlICE9IG51bGwpXG4gICAgICAubWFwKChbaWRdKSA9PiBOdW1iZXIoaWQpKVxuICAgICAgLmZpbHRlcigoaWQgPT4gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaXNXcml0YWJsZScsIHRoaXMsIG1hcFtpZF1bMF0pKSk7XG4gICAgcmV0dXJuIGlkcy5sZW5ndGggPiAwID8gdGhpcy53cml0ZSguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgfVxuXG4gIHB1YmxpYyB3cml0ZSguLi5pZHM6IG51bWJlcltdKTogUHJvbWlzZTxudW1iZXJbXT4ge1xuICAgIGNvbnN0IHsgY29ubmVjdGlvbiB9ID0gdGhpcztcbiAgICBpZiAoIWNvbm5lY3Rpb24pIHJldHVybiBQcm9taXNlLnJlamVjdChgJHt0aGlzLmFkZHJlc3N9IGlzIGRpc2Nvbm5lY3RlZGApO1xuICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhpcy53cml0ZUFsbCgpO1xuICAgIH1cbiAgICBkZWJ1Zyhgd3JpdGluZyAke2lkcy5qb2luKCl9IHRvIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgbWFwID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgaW52YWxpZE5tczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCByZXF1ZXN0cyA9IGlkcy5yZWR1Y2UoXG4gICAgICAoYWNjOiBObXNEYXRhZ3JhbVtdLCBpZCkgPT4ge1xuICAgICAgICBjb25zdCBbbmFtZV0gPSBtYXBbaWRdO1xuICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICBkZWJ1ZyhgVW5rbm93biBpZDogJHtpZH0gZm9yICR7UmVmbGVjdC5nZXRNZXRhZGF0YSgnbWliJywgdGhpcyl9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFjYy5wdXNoKGNyZWF0ZU5tc1dyaXRlKFxuICAgICAgICAgICAgICB0aGlzLmFkZHJlc3MsXG4gICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICBSZWZsZWN0LmdldE1ldGFkYXRhKCdubXNUeXBlJywgdGhpcywgbmFtZSksXG4gICAgICAgICAgICAgIHRoaXMuZ2V0UmF3VmFsdWUoaWQpLFxuICAgICAgICAgICAgKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igd2hpbGUgY3JlYXRlIE5NUyBkYXRhZ3JhbScsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICBpbnZhbGlkTm1zLnB1c2goLWlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sXG4gICAgICBbXSxcbiAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChcbiAgICAgIHJlcXVlc3RzXG4gICAgICAgIC5tYXAoZGF0YWdyYW0gPT4gY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oZGF0YWdyYW0pXG4gICAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW07XG4gICAgICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XG4gICAgICAgICAgICAgIHRoaXMuc2V0RGlydHkoZGF0YWdyYW0uaWQsIGZhbHNlKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGRhdGFncmFtLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZXRFcnJvcihkYXRhZ3JhbS5pZCwgbmV3IE5pYnVzRXJyb3Ioc3RhdHVzISwgdGhpcykpO1xuICAgICAgICAgICAgcmV0dXJuIC1kYXRhZ3JhbS5pZDtcbiAgICAgICAgICB9LCAocmVhc29uKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNldEVycm9yKGRhdGFncmFtLmlkLCByZWFzb24pO1xuICAgICAgICAgICAgcmV0dXJuIC1kYXRhZ3JhbS5pZDtcbiAgICAgICAgICB9KSkpXG4gICAgICAudGhlbihpZHMgPT4gaWRzLmNvbmNhdChpbnZhbGlkTm1zKSk7XG4gIH1cblxuICBwdWJsaWMgd3JpdGVWYWx1ZXMoc291cmNlOiBvYmplY3QsIHN0cm9uZyA9IHRydWUpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGlkcyA9IE9iamVjdC5rZXlzKHNvdXJjZSkubWFwKG5hbWUgPT4gdGhpcy5nZXRJZChuYW1lKSk7XG4gICAgICBpZiAoaWRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ3ZhbHVlIGlzIGVtcHR5JykpO1xuICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLCBzb3VyY2UpO1xuICAgICAgcmV0dXJuIHRoaXMud3JpdGUoLi4uaWRzKVxuICAgICAgICAudGhlbigod3JpdHRlbikgPT4ge1xuICAgICAgICAgIGlmICh3cml0dGVuLmxlbmd0aCA9PT0gMCB8fCAoc3Ryb25nICYmIHdyaXR0ZW4ubGVuZ3RoICE9PSBpZHMubGVuZ3RoKSkge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5nZXRFcnJvcihpZHNbMF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gd3JpdHRlbjtcbiAgICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlYWRBbGwoKTogUHJvbWlzZTxhbnk+IHtcbiAgICBpZiAodGhpcy4kcmVhZCkgcmV0dXJuIHRoaXMuJHJlYWQ7XG4gICAgY29uc3QgbWFwOiB7IFtpZDogc3RyaW5nXTogc3RyaW5nW10gfSA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ21hcCcsIHRoaXMpO1xuICAgIGNvbnN0IGlkcyA9IE9iamVjdC5lbnRyaWVzKG1hcClcbiAgICAgIC5maWx0ZXIoKFssIG5hbWVzXSkgPT4gUmVmbGVjdC5nZXRNZXRhZGF0YSgnaXNSZWFkYWJsZScsIHRoaXMsIG5hbWVzWzBdKSlcbiAgICAgIC5tYXAoKFtpZF0pID0+IE51bWJlcihpZCkpXG4gICAgICAuc29ydCgpO1xuICAgIHRoaXMuJHJlYWQgPSBpZHMubGVuZ3RoID4gMCA/IHRoaXMucmVhZCguLi5pZHMpIDogUHJvbWlzZS5yZXNvbHZlKFtdKTtcbiAgICBjb25zdCBjbGVhciA9ICgpID0+IGRlbGV0ZSB0aGlzLiRyZWFkO1xuICAgIHJldHVybiB0aGlzLiRyZWFkLmZpbmFsbHkoY2xlYXIpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHJlYWQoLi4uaWRzOiBudW1iZXJbXSk6IFByb21pc2U8eyBbbmFtZTogc3RyaW5nXTogYW55IH0+IHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSByZXR1cm4gUHJvbWlzZS5yZWplY3QoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGlmIChpZHMubGVuZ3RoID09PSAwKSByZXR1cm4gdGhpcy5yZWFkQWxsKCk7XG4gICAgLy8gZGVidWcoYHJlYWQgJHtpZHMuam9pbigpfSBmcm9tIFske3RoaXMuYWRkcmVzc31dYCk7XG4gICAgY29uc3QgZGlzYWJsZUJhdGNoUmVhZGluZyA9IFJlZmxlY3QuZ2V0TWV0YWRhdGEoJ2Rpc2FibGVCYXRjaFJlYWRpbmcnLCB0aGlzKTtcbiAgICBjb25zdCBtYXA6IHsgW2lkOiBzdHJpbmddOiBzdHJpbmdbXSB9ID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnbWFwJywgdGhpcyk7XG4gICAgY29uc3QgY2h1bmtzID0gY2h1bmtBcnJheShpZHMsIGRpc2FibGVCYXRjaFJlYWRpbmcgPyAxIDogMjEpO1xuICAgIGRlYnVnKGByZWFkIFske2NodW5rcy5tYXAoY2h1bmsgPT4gYFske2NodW5rLmpvaW4oKX1dYCkuam9pbigpfV0gZnJvbSBbJHt0aGlzLmFkZHJlc3N9XWApO1xuICAgIGNvbnN0IHJlcXVlc3RzID0gY2h1bmtzLm1hcChjaHVuayA9PiBjcmVhdGVObXNSZWFkKHRoaXMuYWRkcmVzcywgLi4uY2h1bmspKTtcbiAgICByZXR1cm4gcmVxdWVzdHMucmVkdWNlKFxuICAgICAgYXN5bmMgKHByb21pc2UsIGRhdGFncmFtKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb21pc2U7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oZGF0YWdyYW0pO1xuICAgICAgICBjb25zdCBkYXRhZ3JhbXM6IE5tc0RhdGFncmFtW10gPSBBcnJheS5pc0FycmF5KHJlc3BvbnNlKVxuICAgICAgICAgID8gcmVzcG9uc2UgYXMgTm1zRGF0YWdyYW1bXVxuICAgICAgICAgIDogW3Jlc3BvbnNlIGFzIE5tc0RhdGFncmFtXTtcbiAgICAgICAgZGF0YWdyYW1zLmZvckVhY2goKHsgaWQsIHZhbHVlLCBzdGF0dXMgfSkgPT4ge1xuICAgICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0UmF3VmFsdWUoaWQsIHZhbHVlLCBmYWxzZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0RXJyb3IoaWQsIG5ldyBOaWJ1c0Vycm9yKHN0YXR1cyEsIHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbmFtZXMgPSBtYXBbaWRdO1xuICAgICAgICAgIGNvbnNvbGUuYXNzZXJ0KG5hbWVzICYmIG5hbWVzLmxlbmd0aCA+IDAsIGBJbnZhbGlkIGlkICR7aWR9YCk7XG4gICAgICAgICAgbmFtZXMuZm9yRWFjaCgocHJvcE5hbWUpID0+IHtcbiAgICAgICAgICAgIHJlc3VsdFtwcm9wTmFtZV0gPSBzdGF0dXMgPT09IDBcbiAgICAgICAgICAgICAgPyB0aGlzW3Byb3BOYW1lXVxuICAgICAgICAgICAgICA6IHsgZXJyb3I6ICh0aGlzLmdldEVycm9yKGlkKSB8fCB7fSkubWVzc2FnZSB8fCAnZXJyb3InIH07XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSxcbiAgICAgIFByb21pc2UucmVzb2x2ZSh7fSBhcyB7IFtuYW1lOiBzdHJpbmddOiBhbnkgfSksXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZChkb21haW46IHN0cmluZywgb2Zmc2V0ID0gMCwgc2l6ZT86IG51bWJlcik6IFByb21pc2U8QnVmZmVyPiB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIWNvbm5lY3Rpb24pIHRocm93IG5ldyBFcnJvcignZGlzY29ubmVjdGVkJyk7XG4gICAgICBjb25zdCByZXFVcGxvYWQgPSBjcmVhdGVObXNSZXF1ZXN0RG9tYWluVXBsb2FkKHRoaXMuYWRkcmVzcywgZG9tYWluLnBhZEVuZCg4LCAnXFwwJykpO1xuICAgICAgY29uc3QgeyBpZCwgdmFsdWU6IGRvbWFpblNpemUsIHN0YXR1cyB9ID1cbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxVXBsb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChzdGF0dXMgIT09IDApIHtcbiAgICAgICAgLy8gZGVidWcoJzxlcnJvcj4nLCBzdGF0dXMpO1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzLCAnUmVxdWVzdCB1cGxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpbml0VXBsb2FkID0gY3JlYXRlTm1zSW5pdGlhdGVVcGxvYWRTZXF1ZW5jZSh0aGlzLmFkZHJlc3MsIGlkKTtcbiAgICAgIGNvbnN0IHsgc3RhdHVzOiBpbml0U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oaW5pdFVwbG9hZCkgYXMgTm1zRGF0YWdyYW07XG4gICAgICBpZiAoaW5pdFN0YXQgIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoaW5pdFN0YXQhLCB0aGlzLCAnSW5pdGlhdGUgdXBsb2FkIGRvbWFpbiBlcnJvcicpO1xuICAgICAgfVxuICAgICAgY29uc3QgdG90YWwgPSBzaXplIHx8IChkb21haW5TaXplIC0gb2Zmc2V0KTtcbiAgICAgIGxldCByZXN0ID0gdG90YWw7XG4gICAgICBsZXQgcG9zID0gb2Zmc2V0O1xuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAndXBsb2FkU3RhcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZG9tYWluLFxuICAgICAgICAgIGRvbWFpblNpemUsXG4gICAgICAgICAgb2Zmc2V0LFxuICAgICAgICAgIHNpemU6IHRvdGFsLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIGNvbnN0IGJ1ZnM6IEJ1ZmZlcltdID0gW107XG4gICAgICB3aGlsZSAocmVzdCA+IDApIHtcbiAgICAgICAgY29uc3QgbGVuZ3RoID0gTWF0aC5taW4oMjU1LCByZXN0KTtcbiAgICAgICAgY29uc3QgdXBsb2FkU2VnbWVudCA9IGNyZWF0ZU5tc1VwbG9hZFNlZ21lbnQodGhpcy5hZGRyZXNzLCBpZCwgcG9zLCBsZW5ndGgpO1xuICAgICAgICBjb25zdCB7IHN0YXR1czogdXBsb2FkU3RhdHVzLCB2YWx1ZTogcmVzdWx0IH0gPVxuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHVwbG9hZFNlZ21lbnQpIGFzIE5tc0RhdGFncmFtO1xuICAgICAgICBpZiAodXBsb2FkU3RhdHVzICE9PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IodXBsb2FkU3RhdHVzISwgdGhpcywgJ1VwbG9hZCBzZWdtZW50IGVycm9yJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJ1ZnMucHVzaChyZXN1bHQuZGF0YSk7XG4gICAgICAgIHRoaXMuZW1pdChcbiAgICAgICAgICAndXBsb2FkRGF0YScsXG4gICAgICAgICAge1xuICAgICAgICAgICAgZG9tYWluLFxuICAgICAgICAgICAgcG9zLFxuICAgICAgICAgICAgZGF0YTogcmVzdWx0LmRhdGEsXG4gICAgICAgICAgfSxcbiAgICAgICAgKTtcbiAgICAgICAgcmVzdCAtPSByZXN1bHQuZGF0YS5sZW5ndGg7XG4gICAgICAgIHBvcyArPSByZXN1bHQuZGF0YS5sZW5ndGg7XG4gICAgICB9XG4gICAgICBjb25zdCByZXN1bHQgPSBCdWZmZXIuY29uY2F0KGJ1ZnMpO1xuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAndXBsb2FkRmluaXNoJyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBvZmZzZXQsXG4gICAgICAgICAgZGF0YTogcmVzdWx0LFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5lbWl0KCd1cGxvYWRFcnJvcicsIGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBkb3dubG9hZChkb21haW46IHN0cmluZywgYnVmZmVyOiBCdWZmZXIsIG9mZnNldCA9IDAsIG5vVGVybSA9IGZhbHNlKSB7XG4gICAgY29uc3QgeyBjb25uZWN0aW9uIH0gPSB0aGlzO1xuICAgIGlmICghY29ubmVjdGlvbikgdGhyb3cgbmV3IEVycm9yKCdkaXNjb25uZWN0ZWQnKTtcbiAgICBjb25zdCByZXFEb3dubG9hZCA9IGNyZWF0ZU5tc1JlcXVlc3REb21haW5Eb3dubG9hZCh0aGlzLmFkZHJlc3MsIGRvbWFpbi5wYWRFbmQoOCwgJ1xcMCcpKTtcbiAgICBjb25zdCB7IGlkLCB2YWx1ZTogbWF4LCBzdGF0dXMgfSA9IGF3YWl0IGNvbm5lY3Rpb24uc2VuZERhdGFncmFtKHJlcURvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAoc3RhdHVzICE9PSAwKSB7XG4gICAgICAvLyBkZWJ1ZygnPGVycm9yPicsIHN0YXR1cyk7XG4gICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihzdGF0dXMhLCB0aGlzLCAnUmVxdWVzdCBkb3dubG9hZCBkb21haW4gZXJyb3InKTtcbiAgICB9XG4gICAgY29uc3QgdGVybWluYXRlID0gYXN5bmMgKGVycj86IEVycm9yKSA9PiB7XG4gICAgICBsZXQgdGVybVN0YXQgPSAwO1xuICAgICAgaWYgKCFub1Rlcm0pIHtcbiAgICAgICAgY29uc3QgcmVxID0gY3JlYXRlTm1zVGVybWluYXRlRG93bmxvYWRTZXF1ZW5jZSh0aGlzLmFkZHJlc3MsIGlkKTtcbiAgICAgICAgY29uc3QgcmVzID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0ocmVxKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgICAgdGVybVN0YXQgPSByZXMuc3RhdHVzITtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIGlmICh0ZXJtU3RhdCAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgTmlidXNFcnJvcihcbiAgICAgICAgICB0ZXJtU3RhdCEsXG4gICAgICAgICAgdGhpcyxcbiAgICAgICAgICAnVGVybWluYXRlIGRvd25sb2FkIHNlcXVlbmNlIGVycm9yLCBtYXliZSBuZWVkIC0tbm8tdGVybScsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfTtcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA+IG1heCAtIG9mZnNldCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBCdWZmZXIgdG8gbGFyZ2UuIEV4cGVjdGVkICR7bWF4IC0gb2Zmc2V0fSBieXRlc2ApO1xuICAgIH1cbiAgICBjb25zdCBpbml0RG93bmxvYWQgPSBjcmVhdGVObXNJbml0aWF0ZURvd25sb2FkU2VxdWVuY2UodGhpcy5hZGRyZXNzLCBpZCk7XG4gICAgY29uc3QgeyBzdGF0dXM6IGluaXRTdGF0IH0gPSBhd2FpdCBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShpbml0RG93bmxvYWQpIGFzIE5tc0RhdGFncmFtO1xuICAgIGlmIChpbml0U3RhdCAhPT0gMCkge1xuICAgICAgdGhyb3cgbmV3IE5pYnVzRXJyb3IoaW5pdFN0YXQhLCB0aGlzLCAnSW5pdGlhdGUgZG93bmxvYWQgZG9tYWluIGVycm9yJyk7XG4gICAgfVxuICAgIHRoaXMuZW1pdChcbiAgICAgICdkb3dubG9hZFN0YXJ0JyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBvZmZzZXQsXG4gICAgICAgIGRvbWFpblNpemU6IG1heCxcbiAgICAgICAgc2l6ZTogYnVmZmVyLmxlbmd0aCxcbiAgICAgIH0sXG4gICAgKTtcbiAgICBjb25zdCBjcmMgPSBjcmMxNmNjaXR0KGJ1ZmZlciwgMCk7XG4gICAgY29uc3QgY2h1bmtTaXplID0gTk1TX01BWF9EQVRBX0xFTkdUSCAtIDQ7XG4gICAgY29uc3QgY2h1bmtzID0gY2h1bmtBcnJheShidWZmZXIsIGNodW5rU2l6ZSk7XG4gICAgYXdhaXQgY2h1bmtzLnJlZHVjZShhc3luYyAocHJldiwgY2h1bms6IEJ1ZmZlciwgaSkgPT4ge1xuICAgICAgYXdhaXQgcHJldjtcbiAgICAgIGNvbnN0IHBvcyA9IGkgKiBjaHVua1NpemUgKyBvZmZzZXQ7XG4gICAgICBjb25zdCBzZWdtZW50RG93bmxvYWQgPVxuICAgICAgICBjcmVhdGVObXNEb3dubG9hZFNlZ21lbnQodGhpcy5hZGRyZXNzLCBpZCEsIHBvcywgY2h1bmspO1xuICAgICAgY29uc3QgeyBzdGF0dXM6IGRvd25sb2FkU3RhdCB9ID1cbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0oc2VnbWVudERvd25sb2FkKSBhcyBObXNEYXRhZ3JhbTtcbiAgICAgIGlmIChkb3dubG9hZFN0YXQgIT09IDApIHtcbiAgICAgICAgYXdhaXQgdGVybWluYXRlKG5ldyBOaWJ1c0Vycm9yKGRvd25sb2FkU3RhdCEsIHRoaXMsICdEb3dubG9hZCBzZWdtZW50IGVycm9yJykpO1xuICAgICAgfVxuICAgICAgdGhpcy5lbWl0KFxuICAgICAgICAnZG93bmxvYWREYXRhJyxcbiAgICAgICAge1xuICAgICAgICAgIGRvbWFpbixcbiAgICAgICAgICBsZW5ndGg6IGNodW5rLmxlbmd0aCxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xuICAgIGNvbnN0IHZlcmlmeSA9IGNyZWF0ZU5tc1ZlcmlmeURvbWFpbkNoZWNrc3VtKHRoaXMuYWRkcmVzcywgaWQsIG9mZnNldCwgYnVmZmVyLmxlbmd0aCwgY3JjKTtcbiAgICBjb25zdCB7IHN0YXR1czogdmVyaWZ5U3RhdCB9ID0gYXdhaXQgY29ubmVjdGlvbi5zZW5kRGF0YWdyYW0odmVyaWZ5KSBhcyBObXNEYXRhZ3JhbTtcbiAgICBpZiAodmVyaWZ5U3RhdCAhPT0gMCkge1xuICAgICAgYXdhaXQgdGVybWluYXRlKG5ldyBOaWJ1c0Vycm9yKHZlcmlmeVN0YXQhLCB0aGlzLCAnRG93bmxvYWQgc2VnbWVudCBlcnJvcicpKTtcbiAgICB9XG4gICAgYXdhaXQgdGVybWluYXRlKCk7XG4gICAgdGhpcy5lbWl0KFxuICAgICAgJ2Rvd25sb2FkRmluaXNoJyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBvZmZzZXQsXG4gICAgICAgIHNpemU6IGJ1ZmZlci5sZW5ndGgsXG4gICAgICB9LFxuICAgICk7XG4gIH1cblxuICBhc3luYyBleGVjdXRlKHByb2dyYW06IHN0cmluZywgYXJncz86IFJlY29yZDxzdHJpbmcsIGFueT4pIHtcbiAgICBjb25zdCB7IGNvbm5lY3Rpb24gfSA9IHRoaXM7XG4gICAgaWYgKCFjb25uZWN0aW9uKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc2Nvbm5lY3RlZCcpO1xuICAgIGNvbnN0IHN1YnJvdXRpbmVzID0gUmVmbGVjdC5nZXRNZXRhZGF0YSgnc3Vicm91dGluZXMnLCB0aGlzKSBhcyBSZWNvcmQ8c3RyaW5nLCBJU3Vicm91dGluZURlc2M+O1xuICAgIGlmICghc3Vicm91dGluZXMgfHwgIVJlZmxlY3QuaGFzKHN1YnJvdXRpbmVzLCBwcm9ncmFtKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb2dyYW0gJHtwcm9ncmFtfWApO1xuICAgIH1cbiAgICBjb25zdCBzdWJyb3V0aW5lID0gc3Vicm91dGluZXNbcHJvZ3JhbV07XG4gICAgY29uc3QgcHJvcHM6IFR5cGVkVmFsdWVbXSA9IFtdO1xuICAgIGlmIChzdWJyb3V0aW5lLmFyZ3MpIHtcbiAgICAgIE9iamVjdC5lbnRyaWVzKHN1YnJvdXRpbmUuYXJncykuZm9yRWFjaCgoW25hbWUsIGRlc2NdKSA9PiB7XG4gICAgICAgIGNvbnN0IGFyZyA9IGFyZ3MgJiYgYXJnc1tuYW1lXTtcbiAgICAgICAgaWYgKCFhcmcpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJnICR7bmFtZX0gaW4gcHJvZ3JhbSAke3Byb2dyYW19YCk7XG4gICAgICAgIHByb3BzLnB1c2goW2Rlc2MudHlwZSwgYXJnXSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgY29uc3QgcmVxID0gY3JlYXRlRXhlY3V0ZVByb2dyYW1JbnZvY2F0aW9uKFxuICAgICAgdGhpcy5hZGRyZXNzLFxuICAgICAgc3Vicm91dGluZS5pZCxcbiAgICAgIHN1YnJvdXRpbmUubm90UmVwbHksXG4gICAgICAuLi5wcm9wcyxcbiAgICApO1xuICAgIHJldHVybiBjb25uZWN0aW9uLnNlbmREYXRhZ3JhbShyZXEpO1xuICB9XG59XG5cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuaW50ZXJmYWNlIERldmljZVByb3RvdHlwZSB7XG4gIHJlYWRvbmx5IGlkOiBEZXZpY2VJZDtcbiAgcmVhZG9ubHkgYWRkcmVzczogQWRkcmVzcztcbiAgW21pYlByb3BlcnR5OiBzdHJpbmddOiBhbnk7XG4gICRjb3VudFJlZjogbnVtYmVyO1xuICAkcmVhZD86IFByb21pc2U8YW55PjtcbiAgWyR2YWx1ZXNdOiB7IFtpZDogbnVtYmVyXTogYW55IH07XG4gIFskZXJyb3JzXTogeyBbaWQ6IG51bWJlcl06IEVycm9yIH07XG4gIFskZGlydGllc106IHsgW2lkOiBudW1iZXJdOiBib29sZWFuIH07XG59XG5cbmV4cG9ydCBjb25zdCBnZXRNaWJUeXBlcyA9ICgpOiBDb25maWdbJ21pYlR5cGVzJ10gPT4ge1xuICBjb25zdCBjb25mID0gcGF0aC5yZXNvbHZlKGNvbmZpZ0RpciB8fCAnL3RtcCcsICdjb25maWdzdG9yZScsIHBrZ05hbWUpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoYCR7Y29uZn0uanNvbmApKSByZXR1cm4ge307XG4gIGNvbnN0IHZhbGlkYXRlID0gQ29uZmlnVi5kZWNvZGUoSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoYCR7Y29uZn0uanNvbmApLnRvU3RyaW5nKCkpKTtcbi8vICAgY29uc3QgdmFsaWRhdGUgPSBDb25maWdWLmRlY29kZShyZXF1aXJlKGNvbmYpKTtcbiAgaWYgKHZhbGlkYXRlLmlzTGVmdCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNvbmZpZyBmaWxlICR7Y29uZn1cbiAgJHtQYXRoUmVwb3J0ZXIucmVwb3J0KHZhbGlkYXRlKX1gKTtcbiAgfVxuICBjb25zdCB7IG1pYlR5cGVzIH0gPSB2YWxpZGF0ZS52YWx1ZTtcbiAgcmV0dXJuIG1pYlR5cGVzO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNaWJCeVR5cGUodHlwZTogbnVtYmVyLCB2ZXJzaW9uPzogbnVtYmVyKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgbWliVHlwZXMgPSBnZXRNaWJUeXBlcygpO1xuICBjb25zdCBtaWJzID0gbWliVHlwZXMhW3R5cGVdO1xuICBpZiAobWlicyAmJiBtaWJzLmxlbmd0aCkge1xuICAgIGxldCBtaWJUeXBlID0gbWlic1swXTtcbiAgICBpZiAodmVyc2lvbiAmJiBtaWJzLmxlbmd0aCA+IDEpIHtcbiAgICAgIG1pYlR5cGUgPSBfLmZpbmRMYXN0KG1pYnMsICh7IG1pblZlcnNpb24gPSAwIH0pID0+IG1pblZlcnNpb24gPD0gdmVyc2lvbikgfHwgbWliVHlwZTtcbiAgICB9XG4gICAgcmV0dXJuIG1pYlR5cGUubWliO1xuICB9XG4gIC8vIGNvbnN0IGNhY2hlTWlicyA9IE9iamVjdC5rZXlzKG1pYlR5cGVzQ2FjaGUpO1xuICAvLyBjb25zdCBjYWNoZWQgPSBjYWNoZU1pYnMuZmluZChtaWIgPT5cbiAgLy8gICBSZWZsZWN0LmdldE1ldGFkYXRhKCdkZXZpY2VUeXBlJywgbWliVHlwZXNDYWNoZVttaWJdLnByb3RvdHlwZSkgPT09IHR5cGUpO1xuICAvLyBpZiAoY2FjaGVkKSByZXR1cm4gY2FjaGVkO1xuICAvLyBjb25zdCBtaWJzID0gZ2V0TWlic1N5bmMoKTtcbiAgLy8gcmV0dXJuIF8uZGlmZmVyZW5jZShtaWJzLCBjYWNoZU1pYnMpLmZpbmQoKG1pYk5hbWUpID0+IHtcbiAgLy8gICBjb25zdCBtaWJmaWxlID0gZ2V0TWliRmlsZShtaWJOYW1lKTtcbiAgLy8gICBjb25zdCBtaWI6IElNaWJEZXZpY2UgPSByZXF1aXJlKG1pYmZpbGUpO1xuICAvLyAgIGNvbnN0IHsgdHlwZXMgfSA9IG1pYjtcbiAgLy8gICBjb25zdCBkZXZpY2UgPSB0eXBlc1ttaWIuZGV2aWNlXSBhcyBJTWliRGV2aWNlVHlwZTtcbiAgLy8gICByZXR1cm4gdG9JbnQoZGV2aWNlLmFwcGluZm8uZGV2aWNlX3R5cGUpID09PSB0eXBlO1xuICAvLyB9KTtcbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIERldmljZXMge1xuICBvbihldmVudDogJ25ldycgfCAnZGVsZXRlJywgZGV2aWNlTGlzdGVuZXI6IChkZXZpY2U6IElEZXZpY2UpID0+IHZvaWQpOiB0aGlzO1xuICBvbmNlKGV2ZW50OiAnbmV3JyB8ICdkZWxldGUnLCBkZXZpY2VMaXN0ZW5lcjogKGRldmljZTogSURldmljZSkgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnbmV3JyB8ICdkZWxldGUnLCBkZXZpY2VMaXN0ZW5lcjogKGRldmljZTogSURldmljZSkgPT4gdm9pZCk6IHRoaXM7XG4gIG9uKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKHByZXZBZGRyZXNzOiBBZGRyZXNzLCBuZXdBZGRyZXNzOiBBZGRyZXNzKSA9PiB2b2lkKTogdGhpcztcbiAgb25jZShldmVudDogJ3Nlcm5vJywgbGlzdGVuZXI6IChwcmV2QWRkcmVzczogQWRkcmVzcywgbmV3QWRkcmVzczogQWRkcmVzcykgPT4gdm9pZCk6IHRoaXM7XG4gIGFkZExpc3RlbmVyKGV2ZW50OiAnc2Vybm8nLCBsaXN0ZW5lcjogKHByZXZBZGRyZXNzOiBBZGRyZXNzLCBuZXdBZGRyZXNzOiBBZGRyZXNzKSA9PiB2b2lkKTogdGhpcztcbn1cblxuZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3IobWliOiBzdHJpbmcpOiBGdW5jdGlvbiB7XG4gIGxldCBjb25zdHJ1Y3RvciA9IG1pYlR5cGVzQ2FjaGVbbWliXTtcbiAgaWYgKCFjb25zdHJ1Y3Rvcikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuICAgIGZ1bmN0aW9uIERldmljZSh0aGlzOiBEZXZpY2VQcm90b3R5cGUsIGFkZHJlc3M6IEFkZHJlc3MpIHtcbiAgICAgIEV2ZW50RW1pdHRlci5hcHBseSh0aGlzKTtcbiAgICAgIHRoaXNbJHZhbHVlc10gPSB7fTtcbiAgICAgIHRoaXNbJGVycm9yc10gPSB7fTtcbiAgICAgIHRoaXNbJGRpcnRpZXNdID0ge307XG4gICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdhZGRyZXNzJywgd2l0aFZhbHVlKGFkZHJlc3MsIGZhbHNlLCB0cnVlKSk7XG4gICAgICB0aGlzLiRjb3VudFJlZiA9IDE7XG4gICAgICAodGhpcyBhcyBhbnkpLmlkID0gdGltZWlkKCkgYXMgRGV2aWNlSWQ7XG4gICAgICAvLyBkZWJ1ZyhuZXcgRXJyb3IoJ0NSRUFURScpLnN0YWNrKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm90b3R5cGUgPSBuZXcgRGV2aWNlUHJvdG90eXBlKG1pYik7XG4gICAgRGV2aWNlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAoRGV2aWNlIGFzIGFueSkuZGlzcGxheU5hbWUgPSBgJHttaWJbMF0udG9VcHBlckNhc2UoKX0ke21pYi5zbGljZSgxKX1gO1xuICAgIGNvbnN0cnVjdG9yID0gRGV2aWNlO1xuICAgIG1pYlR5cGVzQ2FjaGVbbWliXSA9IGNvbnN0cnVjdG9yO1xuICB9XG4gIHJldHVybiBjb25zdHJ1Y3Rvcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1pYlByb3RvdHlwZShtaWI6IHN0cmluZyk6IE9iamVjdCB7XG4gIHJldHVybiBnZXRDb25zdHJ1Y3RvcihtaWIpLnByb3RvdHlwZTtcbn1cblxuZXhwb3J0IGNsYXNzIERldmljZXMgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBnZXQgPSAoKTogSURldmljZVtdID0+IF8uZmxhdHRlbihfLnZhbHVlcyhkZXZpY2VNYXApKTtcblxuICBmaW5kID0gKGFkZHJlc3M6IEFkZHJlc3NQYXJhbSk6IElEZXZpY2VbXSB8IHVuZGVmaW5lZCA9PiB7XG4gICAgY29uc3QgdGFyZ2V0QWRkcmVzcyA9IG5ldyBBZGRyZXNzKGFkZHJlc3MpO1xuICAgIHJldHVybiBkZXZpY2VNYXBbdGFyZ2V0QWRkcmVzcy50b1N0cmluZygpXTtcbiAgfTtcblxuICBjcmVhdGUoYWRkcmVzczogQWRkcmVzc1BhcmFtLCBtaWI6IHN0cmluZyk6IElEZXZpY2U7XG4gIGNyZWF0ZShhZGRyZXNzOiBBZGRyZXNzUGFyYW0sIHR5cGU6IG51bWJlciwgdmVyc2lvbj86IG51bWJlcik6IElEZXZpY2U7XG4gIGNyZWF0ZShhZGRyZXNzOiBBZGRyZXNzUGFyYW0sIG1pYk9yVHlwZTogYW55LCB2ZXJzaW9uPzogbnVtYmVyKTogSURldmljZSB7XG4gICAgbGV0IG1pYjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlb2YgbWliT3JUeXBlID09PSAnbnVtYmVyJykge1xuICAgICAgbWliID0gZmluZE1pYkJ5VHlwZShtaWJPclR5cGUsIHZlcnNpb24pO1xuICAgICAgaWYgKG1pYiA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbWliIHR5cGUnKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtaWJPclR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBtaWIgPSBTdHJpbmcobWliT3JUeXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaWIgb3IgdHlwZSBleHBlY3RlZCwgZ290ICR7bWliT3JUeXBlfWApO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRBZGRyZXNzID0gbmV3IEFkZHJlc3MoYWRkcmVzcyk7XG4gICAgLy8gbGV0IGRldmljZSA9IGRldmljZU1hcFt0YXJnZXRBZGRyZXNzLnRvU3RyaW5nKCldO1xuICAgIC8vIGlmIChkZXZpY2UpIHtcbiAgICAvLyAgIGNvbnNvbGUuYXNzZXJ0KFxuICAgIC8vICAgICBSZWZsZWN0LmdldE1ldGFkYXRhKCdtaWInLCBkZXZpY2UpID09PSBtaWIsXG4gICAgLy8gICAgIGBtaWJzIGFyZSBkaWZmZXJlbnQsIGV4cGVjdGVkICR7bWlifWAsXG4gICAgLy8gICApO1xuICAgIC8vICAgZGV2aWNlLmFkZHJlZigpO1xuICAgIC8vICAgcmV0dXJuIGRldmljZTtcbiAgICAvLyB9XG5cbiAgICBjb25zdCBjb25zdHJ1Y3RvciA9IGdldENvbnN0cnVjdG9yKG1pYik7XG4gICAgY29uc3QgZGV2aWNlOiBJRGV2aWNlID0gUmVmbGVjdC5jb25zdHJ1Y3QoY29uc3RydWN0b3IsIFt0YXJnZXRBZGRyZXNzXSk7XG4gICAgaWYgKCF0YXJnZXRBZGRyZXNzLmlzRW1wdHkpIHtcbiAgICAgIGNvbnN0IGtleSA9IHRhcmdldEFkZHJlc3MudG9TdHJpbmcoKTtcbiAgICAgIGRldmljZU1hcFtrZXldID0gKGRldmljZU1hcFtrZXldIHx8IFtdKS5jb25jYXQoZGV2aWNlKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gdGhpcy5lbWl0KCduZXcnLCBkZXZpY2UpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRldmljZTtcbiAgfVxufVxuXG5jb25zdCBkZXZpY2VzID0gbmV3IERldmljZXMoKTtcblxuZXhwb3J0IGRlZmF1bHQgZGV2aWNlcztcbiJdfQ==