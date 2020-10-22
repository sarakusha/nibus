"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Devices = exports.getMibPrototype = exports.findMibByType = exports.getMibTypes = exports.getMibFile = void 0;
const crc_1 = require("crc");
const debug_1 = __importDefault(require("debug"));
const events_1 = require("events");
const Either_1 = require("fp-ts/lib/Either");
const fs_1 = __importDefault(require("fs"));
const PathReporter_1 = require("io-ts/lib/PathReporter");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
require("reflect-metadata");
const xdg_basedir_1 = require("xdg-basedir");
const Address_1 = __importStar(require("../Address"));
const errors_1 = require("../errors");
const nbconst_1 = require("../nbconst");
const helper_1 = require("../nibus/helper");
const nms_1 = require("../nms");
const NmsValueType_1 = __importDefault(require("../nms/NmsValueType"));
const common_1 = require("../session/common");
const timeid_1 = __importDefault(require("../timeid"));
const mib_1 = require("./mib");
const pkgName = '@nata/nibus.js';
const debug = debug_1.default('nibus:devices');
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
function getBaseType(types, type) {
    let base = type;
    for (let superType = types[base]; superType != null; superType = types[superType.base]) {
        base = superType.base;
    }
    return base;
}
function defineMibProperty(target, key, types, prop) {
    var _a;
    const propertyKey = mib_1.validJsName(key);
    const { appinfo } = prop;
    const id = mib_1.toInt(appinfo.nms_id);
    Reflect.defineMetadata('id', id, target, propertyKey);
    const simpleType = getBaseType(types, prop.type);
    const type = types[prop.type];
    const converters = [];
    const isReadable = appinfo.access.indexOf('r') > -1;
    const isWritable = appinfo.access.indexOf('w') > -1;
    let enumeration;
    let min;
    let max;
    switch (nms_1.getNmsType(simpleType)) {
        case NmsValueType_1.default.Int8:
            min = -128;
            max = 127;
            break;
        case NmsValueType_1.default.Int16:
            min = -32768;
            max = 32767;
            break;
        case NmsValueType_1.default.Int32:
            min = -2147483648;
            max = 2147483647;
            break;
        case NmsValueType_1.default.UInt8:
            min = 0;
            max = 255;
            break;
        case NmsValueType_1.default.UInt16:
            min = 0;
            max = 65535;
            break;
        case NmsValueType_1.default.UInt32:
            min = 0;
            max = 4294967295;
            break;
        default:
            break;
    }
    switch (simpleType) {
        case 'packed8Float':
            converters.push(mib_1.packed8floatConverter(type));
            break;
        case 'fixedPointNumber4':
            converters.push(mib_1.fixedPointNumber4Converter);
            break;
        default:
            break;
    }
    if (key === 'brightness' && prop.type === 'xs:unsignedByte') {
        converters.push(mib_1.percentConverter);
        Reflect.defineMetadata('unit', '%', target, propertyKey);
        Reflect.defineMetadata('min', 0, target, propertyKey);
        Reflect.defineMetadata('max', 100, target, propertyKey);
        min = undefined;
        max = undefined;
    }
    else if (isWritable) {
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
            min = mib_1.convertTo(converters)(min);
            Reflect.defineMetadata('min', min, target, propertyKey);
        }
        if (max !== undefined) {
            max = mib_1.convertTo(converters)(max);
            Reflect.defineMetadata('max', max, target, propertyKey);
        }
    }
    const info = (_a = type === null || type === void 0 ? void 0 : type.appinfo) !== null && _a !== void 0 ? _a : appinfo;
    if (info != null) {
        enumeration = type === null || type === void 0 ? void 0 : type.enumeration;
        const { units, precision, representation, get, set } = info;
        const size = mib_1.getIntSize(simpleType);
        if (units) {
            converters.push(mib_1.unitConverter(units));
            Reflect.defineMetadata('unit', units, target, propertyKey);
        }
        let precisionConv = {
            from: v => v,
            to: v => v,
        };
        if (precision) {
            precisionConv = mib_1.precisionConverter(precision);
            converters.push(precisionConv);
            Reflect.defineMetadata('step', 1 / 10 ** parseInt(precision, 10), target, propertyKey);
        }
        if (enumeration) {
            converters.push(mib_1.enumerationConverter(enumeration));
            Reflect.defineMetadata('enum', Object.entries(enumeration).map(([enumKey, val]) => [val.annotation, mib_1.toInt(enumKey)]), target, propertyKey);
        }
        representation && size && converters.push(mib_1.representationConverter(representation, size));
        if (get && set) {
            const conv = mib_1.evalConverter(get, set);
            converters.push(conv);
            const [a, b] = [Number(conv.to(min)), Number(conv.to(max))];
            const minEval = parseFloat(precisionConv.to(Math.min(a, b)));
            const maxEval = parseFloat(precisionConv.to(Math.max(a, b)));
            Reflect.defineMetadata('min', minEval, target, propertyKey);
            Reflect.defineMetadata('max', maxEval, target, propertyKey);
        }
    }
    if (min !== undefined) {
        converters.push(mib_1.minInclusiveConverter(min));
    }
    if (max !== undefined) {
        converters.push(mib_1.maxInclusiveConverter(max));
    }
    if (prop.type === 'versionType') {
        converters.push(mib_1.versionTypeConverter);
    }
    if (simpleType === 'xs:boolean' && !enumeration) {
        converters.push(mib_1.booleanConverter);
        Reflect.defineMetadata('enum', [
            ['Да', true],
            ['Нет', false],
        ], target, propertyKey);
    }
    Reflect.defineMetadata('isWritable', isWritable, target, propertyKey);
    Reflect.defineMetadata('isReadable', isReadable, target, propertyKey);
    Reflect.defineMetadata('type', prop.type, target, propertyKey);
    Reflect.defineMetadata('simpleType', simpleType, target, propertyKey);
    Reflect.defineMetadata('displayName', prop.annotation ? prop.annotation : key, target, propertyKey);
    appinfo.category && Reflect.defineMetadata('category', appinfo.category, target, propertyKey);
    appinfo.rank && Reflect.defineMetadata('rank', appinfo.rank, target, propertyKey);
    Reflect.defineMetadata('nmsType', nms_1.getNmsType(simpleType), target, propertyKey);
    const attributes = {
        enumerable: isReadable,
    };
    const to = mib_1.convertTo(converters);
    const from = mib_1.convertFrom(converters);
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
        attributes.set = function set(newValue) {
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
    return path_1.default.resolve(__dirname, '../../mibs/', `${mibname}.mib.json`);
}
exports.getMibFile = getMibFile;
class DevicePrototype extends events_1.EventEmitter {
    constructor(mibname) {
        super();
        this.$countRef = 1;
        const mibfile = getMibFile(mibname);
        const mibValidation = mib_1.MibDeviceV.decode(JSON.parse(fs_1.default.readFileSync(mibfile).toString()));
        if (Either_1.isLeft(mibValidation)) {
            throw new Error(`Invalid mib file ${mibfile} ${PathReporter_1.PathReporter.report(mibValidation).join('\n')}`);
        }
        const mib = mibValidation.right;
        const { types, subroutines } = mib;
        const device = types[mib.device];
        Reflect.defineMetadata('mib', mibname, this);
        Reflect.defineMetadata('mibfile', mibfile, this);
        Reflect.defineMetadata('annotation', device.annotation, this);
        Reflect.defineMetadata('mibVersion', device.appinfo.mib_version, this);
        Reflect.defineMetadata('deviceType', mib_1.toInt(device.appinfo.device_type), this);
        device.appinfo.loader_type &&
            Reflect.defineMetadata('loaderType', mib_1.toInt(device.appinfo.loader_type), this);
        device.appinfo.firmware && Reflect.defineMetadata('firmware', device.appinfo.firmware, this);
        device.appinfo.min_version &&
            Reflect.defineMetadata('min_version', device.appinfo.min_version, this);
        types.errorType &&
            Reflect.defineMetadata('errorType', types.errorType.enumeration, this);
        if (subroutines) {
            const metasubs = lodash_1.default.transform(subroutines, (result, sub, name) => {
                result[name] = {
                    id: mib_1.toInt(sub.appinfo.nms_id),
                    description: sub.annotation,
                    args: sub.properties &&
                        Object.entries(sub.properties).map(([propName, prop]) => ({
                            name: propName,
                            type: nms_1.getNmsType(prop.type),
                            desc: prop.annotation,
                        })),
                };
            }, {});
            Reflect.defineMetadata('subroutines', metasubs, this);
        }
        const keys = Reflect.ownKeys(device.properties);
        Reflect.defineMetadata('mibProperties', keys.map(mib_1.validJsName), this);
        const map = {};
        keys.forEach((key) => {
            const [id, propName] = defineMibProperty(this, key, types, device.properties[key]);
            if (!map[id]) {
                map[id] = [propName];
            }
            else {
                map[id].push(propName);
            }
        });
        Reflect.defineMetadata('map', map, this);
    }
    get connection() {
        const { [$values]: values } = this;
        return values[PrivateProps.connection];
    }
    set connection(value) {
        const { [$values]: values } = this;
        const prev = values[PrivateProps.connection];
        if (prev === value)
            return;
        values[PrivateProps.connection] = value;
        this.emit(value != null ? 'connected' : 'disconnected');
    }
    toJSON() {
        const json = {
            mib: Reflect.getMetadata('mib', this),
        };
        const keys = Reflect.getMetadata('mibProperties', this);
        keys.forEach(key => {
            if (this[key] !== undefined)
                json[key] = this[key];
        });
        json.address = this.address.toString();
        return json;
    }
    getId(idOrName) {
        let id;
        if (typeof idOrName === 'string') {
            id = Reflect.getMetadata('id', this, idOrName);
            if (Number.isInteger(id))
                return id;
            id = mib_1.toInt(idOrName);
        }
        else {
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
        if (typeof idOrName === 'string' && keys.includes(idOrName))
            return idOrName;
        throw new Error(`Unknown property ${idOrName}`);
    }
    getRawValue(idOrName) {
        const id = this.getId(idOrName);
        const { [$values]: values } = this;
        return values[id];
    }
    setRawValue(idOrName, value, isDirty = true) {
        const id = this.getId(idOrName);
        const { [$values]: values, [$errors]: errors } = this;
        const newVal = safeNumber(value);
        if (newVal !== values[id] || errors[id]) {
            values[id] = newVal;
            delete errors[id];
            this.setDirty(id, isDirty);
        }
    }
    getError(idOrName) {
        const id = this.getId(idOrName);
        const { [$errors]: errors } = this;
        return errors[id];
    }
    setError(idOrName, error) {
        const id = this.getId(idOrName);
        const { [$errors]: errors } = this;
        if (error != null) {
            errors[id] = error;
        }
        else {
            delete errors[id];
        }
    }
    isDirty(idOrName) {
        const id = this.getId(idOrName);
        const { [$dirties]: dirties } = this;
        return !!dirties[id];
    }
    setDirty(idOrName, isDirty = true) {
        const id = this.getId(idOrName);
        const map = Reflect.getMetadata('map', this);
        const { [$dirties]: dirties } = this;
        if (isDirty) {
            dirties[id] = true;
        }
        else {
            delete dirties[id];
        }
        const names = map[id] || [];
        this.emit(isDirty ? 'changing' : 'changed', {
            id,
            names,
        });
        if (names.includes('serno') &&
            !isDirty &&
            this.address.type === Address_1.AddressType.mac &&
            typeof this.serno === 'string') {
            const value = this.serno;
            const prevAddress = this.address;
            const address = Buffer.from(value.padStart(12, '0').substring(value.length - 12), 'hex');
            Reflect.defineProperty(this, 'address', mib_1.withValue(new Address_1.default(address), false, true));
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
            deviceMap[key] = lodash_1.default.without(deviceMap[key], this);
            if (deviceMap[key].length === 0) {
                delete deviceMap[key];
            }
            devices.emit('delete', this);
        }
        return this.$countRef;
    }
    drain() {
        debug(`drain [${this.address}]`);
        const { [$dirties]: dirties } = this;
        const ids = Object.keys(dirties)
            .map(Number)
            .filter(id => dirties[id]);
        return ids.length > 0 ? this.write(...ids) : Promise.resolve([]);
    }
    write(...ids) {
        const { connection } = this;
        if (!connection)
            return Promise.reject(new Error(`${this.address} is disconnected`));
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
            }
            else {
                try {
                    acc.push(nms_1.createNmsWrite(this.address, id, Reflect.getMetadata('nmsType', this, name), this.getRawValue(id)));
                }
                catch (e) {
                    console.error('Error while create NMS datagram', e.message);
                    invalidNms.push(-id);
                }
            }
            return acc;
        }, []);
        return Promise.all(requests.map(datagram => connection.sendDatagram(datagram).then(response => {
            const { status } = response;
            if (status === 0) {
                this.setDirty(datagram.id, false);
                return datagram.id;
            }
            this.setError(datagram.id, new errors_1.NibusError(status, this));
            return -datagram.id;
        }, reason => {
            this.setError(datagram.id, reason);
            return -datagram.id;
        }))).then(idss => idss.concat(invalidNms));
    }
    writeValues(source, strong = true) {
        try {
            const ids = Object.keys(source).map(name => this.getId(name));
            if (ids.length === 0)
                return Promise.reject(new TypeError('value is empty'));
            Object.assign(this, source);
            return this.write(...ids).then(written => {
                if (written.length === 0 || (strong && written.length !== ids.length)) {
                    throw this.getError(ids[0]);
                }
                return written;
            });
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    async read(...ids) {
        const { connection } = this;
        if (!connection)
            return Promise.reject(new Error('disconnected'));
        if (ids.length === 0)
            return this.readAll();
        const disableBatchReading = Reflect.getMetadata('disableBatchReading', this);
        const map = Reflect.getMetadata('map', this);
        const chunks = helper_1.chunkArray(ids, disableBatchReading ? 1 : 21);
        debug(`read [${chunks.map(chunk => `[${chunk.join()}]`).join()}] from [${this.address}]`);
        const requests = chunks.map(chunk => [
            nms_1.createNmsRead(this.address, ...chunk),
            chunk,
        ]);
        const parseResult = (id, status, value) => {
            if (status === 0) {
                this.setRawValue(id, value, false);
            }
            else {
                this.setError(id, typeof status === 'number' ? new errors_1.NibusError(status, this) : status);
            }
            const result = {};
            const names = map[id];
            console.assert(names && names.length > 0, `Invalid id ${id}`);
            names.forEach(propName => {
                result[propName] =
                    status === 0 ? this[propName] : { error: (this.getError(id) || {}).message || 'error' };
            });
            return result;
        };
        return requests.reduce(async (promise, [datagram, chunkIds]) => {
            const result = await promise;
            try {
                const response = await connection.sendDatagram(datagram);
                const datagrams = Array.isArray(response)
                    ? response
                    : [response];
                datagrams.forEach(({ id, value, status }) => Object.assign(result, parseResult(id, status, value)));
            }
            catch (e) {
                chunkIds.forEach(id => Object.assign(result, parseResult(id, e)));
            }
            return result;
        }, Promise.resolve({}));
    }
    async upload(domain, offset = 0, size) {
        const { connection } = this;
        try {
            if (!connection)
                throw new Error('disconnected');
            const reqUpload = nms_1.createNmsRequestDomainUpload(this.address, domain.padEnd(8, '\0'));
            const { id, value: domainSize, status } = (await connection.sendDatagram(reqUpload));
            if (status !== 0) {
                throw new errors_1.NibusError(status, this, 'Request upload domain error');
            }
            const initUpload = nms_1.createNmsInitiateUploadSequence(this.address, id);
            const { status: initStat } = (await connection.sendDatagram(initUpload));
            if (initStat !== 0) {
                throw new errors_1.NibusError(initStat, this, 'Initiate upload domain error');
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
            const bufs = [];
            while (rest > 0) {
                const length = Math.min(255, rest);
                const uploadSegment = nms_1.createNmsUploadSegment(this.address, id, pos, length);
                const { status: uploadStatus, value: result, } = (await connection.sendDatagram(uploadSegment));
                if (uploadStatus !== 0) {
                    throw new errors_1.NibusError(uploadStatus, this, 'Upload segment error');
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
        }
        catch (e) {
            this.emit('uploadError', e);
            throw e;
        }
    }
    async download(domain, buffer, offset = 0, noTerm = false) {
        const { connection } = this;
        if (!connection)
            throw new Error('disconnected');
        const reqDownload = nms_1.createNmsRequestDomainDownload(this.address, domain.padEnd(8, '\0'));
        const { id, value: max, status } = (await connection.sendDatagram(reqDownload));
        if (status !== 0) {
            throw new errors_1.NibusError(status, this, `Request download domain "${domain}" error`);
        }
        const terminate = async (err) => {
            let termStat = 0;
            if (!noTerm) {
                const req = nms_1.createNmsTerminateDownloadSequence(this.address, id);
                const res = (await connection.sendDatagram(req));
                termStat = res.status;
            }
            if (err)
                throw err;
            if (termStat !== 0) {
                throw new errors_1.NibusError(termStat, this, 'Terminate download sequence error, maybe need --no-term');
            }
        };
        if (buffer.length > max - offset) {
            throw new Error(`Buffer too large. Expected ${max - offset} bytes`);
        }
        const initDownload = nms_1.createNmsInitiateDownloadSequence(this.address, id);
        const { status: initStat } = (await connection.sendDatagram(initDownload));
        if (initStat !== 0) {
            throw new errors_1.NibusError(initStat, this, 'Initiate download domain error');
        }
        this.emit('downloadStart', {
            domain,
            offset,
            domainSize: max,
            size: buffer.length,
        });
        const crc = crc_1.crc16ccitt(buffer, 0);
        const chunkSize = nbconst_1.NMS_MAX_DATA_LENGTH - 4;
        const chunks = helper_1.chunkArray(buffer, chunkSize);
        await chunks.reduce(async (prev, chunk, i) => {
            await prev;
            const pos = i * chunkSize + offset;
            const segmentDownload = nms_1.createNmsDownloadSegment(this.address, id, pos, chunk);
            const { status: downloadStat } = (await connection.sendDatagram(segmentDownload));
            if (downloadStat !== 0) {
                await terminate(new errors_1.NibusError(downloadStat, this, 'Download segment error'));
            }
            this.emit('downloadData', {
                domain,
                length: chunk.length,
            });
        }, Promise.resolve());
        const verify = nms_1.createNmsVerifyDomainChecksum(this.address, id, offset, buffer.length, crc);
        const { status: verifyStat } = (await connection.sendDatagram(verify));
        if (verifyStat !== 0) {
            await terminate(new errors_1.NibusError(verifyStat, this, 'Download segment error'));
        }
        await terminate();
        this.emit('downloadFinish', {
            domain,
            offset,
            size: buffer.length,
        });
    }
    async execute(program, args) {
        const { connection } = this;
        if (!connection)
            throw new Error('disconnected');
        const subroutines = Reflect.getMetadata('subroutines', this);
        if (!subroutines || !Reflect.has(subroutines, program)) {
            console.warn('subroutines', subroutines);
            throw new Error(`Unknown program ${program}`);
        }
        const subroutine = subroutines[program];
        const props = [];
        if (subroutine.args) {
            Object.entries(subroutine.args).forEach(([name, desc]) => {
                const arg = args && args[name];
                if (!arg)
                    throw new Error(`Expected arg ${name} in program ${program}`);
                props.push([desc.type, arg]);
            });
        }
        const req = nms_1.createExecuteProgramInvocation(this.address, subroutine.id, subroutine.notReply, ...props);
        return connection.sendDatagram(req);
    }
    writeAll() {
        const { [$values]: values } = this;
        const map = Reflect.getMetadata('map', this);
        const ids = Object.entries(values)
            .filter(([, value]) => value != null)
            .map(([id]) => Number(id))
            .filter(id => Reflect.getMetadata('isWritable', this, map[id][0]));
        return ids.length > 0 ? this.write(...ids) : Promise.resolve([]);
    }
    readAll() {
        if (this.$read)
            return this.$read;
        const map = Reflect.getMetadata('map', this);
        const ids = Object.entries(map)
            .filter(([, names]) => Reflect.getMetadata('isReadable', this, names[0]))
            .map(([id]) => Number(id))
            .sort();
        this.$read = ids.length > 0 ? this.read(...ids) : Promise.resolve([]);
        const clear = () => {
            delete this.$read;
        };
        return this.$read.finally(clear);
    }
}
exports.getMibTypes = () => {
    const conf = path_1.default.resolve(xdg_basedir_1.config || '/tmp', 'configstore', pkgName);
    if (!fs_1.default.existsSync(`${conf}.json`))
        return {};
    const validate = common_1.ConfigV.decode(JSON.parse(fs_1.default.readFileSync(`${conf}.json`).toString()));
    if (Either_1.isLeft(validate)) {
        throw new Error(`Invalid config file ${conf}
  ${PathReporter_1.PathReporter.report(validate).join('\n')}`);
    }
    const { mibTypes } = validate.right;
    return mibTypes;
};
function findMibByType(type, version) {
    const mibTypes = exports.getMibTypes();
    const mibs = mibTypes[type];
    if (mibs && mibs.length) {
        let mibType = mibs[0];
        if (version && mibs.length > 1) {
            mibType = lodash_1.default.findLast(mibs, ({ minVersion = 0 }) => minVersion <= version) || mibType;
        }
        return mibType.mib;
    }
    return undefined;
}
exports.findMibByType = findMibByType;
function getConstructor(mib) {
    let constructor = mibTypesCache[mib];
    if (!constructor) {
        function Device(address) {
            events_1.EventEmitter.apply(this);
            this[$values] = {};
            this[$errors] = {};
            this[$dirties] = {};
            Reflect.defineProperty(this, 'address', mib_1.withValue(address, false, true));
            this.$countRef = 1;
            this.id = timeid_1.default();
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
exports.getMibPrototype = getMibPrototype;
class Devices extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.get = () => lodash_1.default.flatten(lodash_1.default.values(deviceMap));
        this.find = (address) => {
            const targetAddress = new Address_1.default(address);
            return deviceMap[targetAddress.toString()];
        };
        this.create = (address, mibOrType, version) => {
            let mib;
            if (typeof mibOrType === 'number') {
                mib = findMibByType(mibOrType, version);
                if (mib === undefined)
                    throw new Error('Unknown mib type');
            }
            else if (typeof mibOrType === 'string') {
                mib = String(mibOrType);
            }
            else {
                throw new Error(`mib or type expected, got ${mibOrType}`);
            }
            const targetAddress = new Address_1.default(address);
            const constructor = getConstructor(mib);
            const device = Reflect.construct(constructor, [targetAddress]);
            if (!targetAddress.isEmpty) {
                const key = targetAddress.toString();
                deviceMap[key] = (deviceMap[key] || []).concat(device);
                process.nextTick(() => this.emit('new', device));
            }
            return device;
        };
    }
}
exports.Devices = Devices;
const devices = new Devices();
exports.default = devices;
//# sourceMappingURL=devices.js.map