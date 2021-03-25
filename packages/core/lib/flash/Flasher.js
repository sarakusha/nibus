"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flasher = exports.KindMap = exports.FlashKinds = void 0;
const crc_1 = require("crc");
const fs_1 = __importDefault(require("fs"));
const intel_hex_1 = require("intel-hex");
const lodash_1 = __importDefault(require("lodash"));
const fast_xml_parser_1 = __importDefault(require("fast-xml-parser"));
const path_1 = __importDefault(require("path"));
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const common_1 = require("../common");
const session_1 = require("../session");
const slip_1 = require("../slip");
const crcPrev = 0xaa55;
exports.FlashKinds = ['fpga', 'mcu', 'rbf', 'ttc', 'ctrl', 'tca', 'tcc'];
exports.KindMap = {
    fpga: ['rbf', false, false],
    mcu: ['hex', false, false],
    rbf: ['rbf', true, false],
    ctrl: ['txt', true, false],
    ttc: ['xml', true, false],
    tcc: ['tcc', true, true],
    tca: ['tca', true, true],
};
const ident = (buf) => buf;
const createHeader = (kind, option, data) => {
    const buffer = Buffer.alloc(20);
    buffer.write(kind.padEnd(4, '\0'));
    buffer.writeUInt32LE(data.length, 4);
    buffer.writeUInt32LE(Math.round(Date.now() / 1000), 8);
    buffer.writeUInt16LE(option, 16);
    buffer.writeUInt16LE(crc_1.crc16ccitt(buffer.slice(0, 18), crcPrev), 18);
    return buffer;
};
const hexToBuf = (hex) => Buffer.from(hex.replace(/[\s:-=]/g, ''), 'hex');
const txtConvert = (buffer, size = 32768, begin = 0) => {
    const lines = buffer.toString('ascii').split(/\r?\n/g);
    const result = Buffer.alloc(size, 0xff);
    let offset = 0;
    lines.forEach(line => {
        if (line[0] === '@') {
            offset = parseInt(line.slice(1), 16) - begin;
        }
        else if (line !== 'q') {
            const buf = hexToBuf(line);
            if (offset < 0) {
                offset += buf.length;
            }
            else {
                offset += buf.copy(result, offset);
            }
        }
    });
    return result;
};
const decConvert = (data) => {
    const lines = data.toString().split(/\r?\n/g);
    const raw = lodash_1.default.flatten(lines
        .map(line => line.trim())
        .filter(line => !!line)
        .map(line => line.split(/\s+/g).map(b => {
        const i = parseInt(b, 10);
        if (Number.isNaN(i))
            console.error('Invalid Number', b);
        return i;
    })));
    if (lodash_1.default.some(raw, b => Number.isNaN(b)))
        throw new Error('Invalid number');
    return Buffer.from(lodash_1.default.flatten(raw.map(word => [word & 0xff, (word >> 8) & 0xff])));
};
const xmlConvert = (data) => {
    const xml = data.toString();
    const valid = fast_xml_parser_1.default.validate(xml);
    if (valid !== true) {
        throw new Error(valid.err.msg);
    }
    const { Configuration = null } = fast_xml_parser_1.default.parse(xml);
    if (!Configuration)
        throw new Error('Invalid xml config');
    const buffer = Buffer.alloc(140, 0);
    let offset = 0;
    ['RedLedMeasurement', 'GreenLedMeasurement', 'BlueLedMeasurement'].forEach(name => {
        const { Xy: { X, Y }, Yb, } = Configuration[name];
        offset = buffer.writeFloatLE(X, offset);
        offset = buffer.writeFloatLE(Y, offset);
        offset = buffer.writeFloatLE(Yb, offset);
    });
    ['RedLedTermCompFactors', 'GreenLedTermCompFactors', 'BlueLedTermCompFactors'].forEach(name => {
        const { A, B, C } = Configuration[name];
        offset = buffer.writeFloatLE(A, offset);
        offset = buffer.writeFloatLE(B, offset);
        offset = buffer.writeFloatLE(C, offset);
    });
    let last = offset;
    [
        'HostBrightSetting',
        'CalibrationBright',
        'RedVertexOfTriangle.X',
        'RedVertexOfTriangle.Y',
        'GreenVertexOfTriangle.X',
        'GreenVertexOfTriangle.Y',
        'BlueVertexOfTriangle.X',
        'BlueVertexOfTriangle.Y',
        'RedVertexXBase',
        'RedVertexYBase',
        'RedVertexStep',
        'GreenVertexXBase',
        'GreenVertexYBase',
        'GreenVertexStep',
        'BlueVertexXBase',
        'BlueVertexYBase',
        'BlueVertexStep',
    ].forEach(prop => {
        const value = lodash_1.default.get(Configuration, prop, 0);
        offset = buffer.writeFloatLE(value, offset);
        if (value > 0)
            last = offset;
    });
    console.assert(offset === 140, 'Invalid buffer size');
    return buffer.slice(0, last);
};
const meta = {
    rbf: {
        offset: 0x60000,
        size: [368011],
        converter: ident,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    fpga: {
        offset: 0,
        size: [368011],
        converter: ident,
        exec: 'reloadHost',
        domain: 'FPGA',
    },
    tca: {
        offset: 0xc0000,
        size: [1536, 2822],
        converter: decConvert,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    tcc: {
        offset: 0xc0000,
        size: [1536, 2822],
        converter: decConvert,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    ttc: {
        offset: 0xc0000,
        converter: xmlConvert,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    ctrl: {
        offset: 0xf0000,
        begin: 0x8000,
        size: [32768],
        converter: txtConvert,
        exec: 'updateModule',
        domain: 'RFLASH',
    },
    mcu: {
        offset: 0,
        begin: 0x4400,
        size: [65536],
        converter: txtConvert,
        exec: 'updateHost',
        domain: 'MCU',
    },
};
const parseModuleSelect = (value) => value !== undefined ? `(${value >>> 8}, ${value & 0xff})` : 'Unknown';
const echo = 'TestString';
class Flasher extends tiny_typed_emitter_1.TypedEmitter {
    constructor(deviceId) {
        super();
        const device = session_1.getDefaultSession()
            .devices.get()
            .find(({ id }) => deviceId === id);
        if (!device)
            throw new Error(`Unknown device ${deviceId}`);
        this.device = device;
    }
    flashAtmega(hexSource) {
        const buffer = fs_1.default.readFileSync(hexSource);
        let { data } = intel_hex_1.parse(buffer, slip_1.FLASH_SIZE);
        if (data.length < slip_1.FLASH_SIZE) {
            const tmp = Buffer.alloc(slip_1.FLASH_SIZE);
            data.copy(tmp);
            tmp.fill(0xff, data.length);
            data = tmp;
        }
        const crc = crc_1.crc16ccitt(data.slice(0, slip_1.FLASH_SIZE - 2), 0);
        data.writeUInt16LE(crc, slip_1.FLASH_SIZE - 2);
        const descSize = data.readUInt16LE(0x54);
        const [processor, firmware] = data
            .slice(0x56, 0x56 + descSize)
            .toString()
            .split('\0');
        if (processor !== 'ATMEGA32A') {
            throw new Error(`Firmware: invalid processor type`);
        }
        if (firmware !== 'NataHostV3') {
            throw new Error(`Firmware: invalid firmware description`);
        }
        const { connection } = this.device;
        if (!connection)
            throw new Error('device not connected');
        const onChunk = (offset) => {
            this.emit('tick', { offset });
        };
        connection
            .slipStart(this.device.address.isEmpty)
            .then(async (isStarted) => {
            if (!isStarted) {
                return this.emit('error', new Error("This device doesn't support bootloader"));
            }
            try {
                this.emit('start', { total: data.length, offset: 0 });
                const echoResp = await connection.execBootloader(0, Buffer.from(echo));
                if (!echoResp.arg || Buffer.from(echoResp.arg).toString() !== echo) {
                    return this.emit('error', new Error('Echo test failed'));
                }
                const version = await connection.execBootloader(1);
                if (!(version === null || version === void 0 ? void 0 : version.arg) || Buffer.from(version.arg).toString() !== 'Atmega32\0') {
                    return this.emit('error', new Error('Invalid version'));
                }
                connection.on('chunk', onChunk);
                await connection.execBootloader(19, data);
                connection.off('chunk', onChunk);
                for (let offset = 0, end = 0; offset < data.length; offset = end) {
                    [, end] = slip_1.encode(data, offset, slip_1.CHUNK_SIZE);
                    const chunk = await connection.execBootloader(4, [
                        ...slip_1.uint32ToBytes(offset),
                        end - offset,
                    ]);
                    if (!(chunk === null || chunk === void 0 ? void 0 : chunk.arg) || Buffer.from(chunk.arg).compare(data.slice(offset, end)) !== 0) {
                        return this.emit('error', new Error('Write verification error'));
                    }
                    this.emit('tick', { offset });
                }
                await common_1.delay(100);
                await connection.execBootloader(5, [0]);
                return this.emit('finish');
            }
            catch (e) {
                console.error(e.message);
                return this.emit('error', e);
            }
        })
            .finally(() => {
            connection.slipFinish();
            connection.off('chunk', onChunk);
        });
        console.assert(data.length === slip_1.FLASH_SIZE, 'Invalid data length');
        return {
            total: data.length,
            offset: 0,
        };
    }
    flash(arg1, arg2, arg3) {
        var _a;
        let kind;
        let source;
        let moduleSelect;
        if (typeof arg1 === 'string' && exports.FlashKinds.includes(arg1)) {
            kind = arg1;
            source = arg2;
            if (typeof arg3 === 'number')
                moduleSelect = arg3;
        }
        else {
            source = arg1;
            if (typeof arg2 === 'number')
                moduleSelect = arg2;
        }
        if (kind === 'mcu' && moduleSelect === undefined) {
            return this.flashAtmega(source);
        }
        if (moduleSelect !== undefined) {
            const x = moduleSelect >>> 8;
            const y = moduleSelect && 0xff;
            if (x < 0 || (x >= 24 && x !== 0xff) || y < 0 || y > 255)
                throw new TypeError('Invalid moduleSelect');
        }
        if (kind === undefined) {
            switch (path_1.default.extname(source).toLowerCase()) {
                case '.rbf':
                    kind = moduleSelect ? 'rbf' : 'fpga';
                    break;
                case '.tcc':
                    kind = 'tcc';
                    break;
                case '.tca':
                    kind = 'tca';
                    break;
                case '.xml':
                    kind = 'ttc';
                    break;
                case '.txt':
                    kind = moduleSelect ? 'ctrl' : 'mcu';
                    break;
                default:
                    throw new Error('Unknown kind of source');
            }
        }
        if (moduleSelect === undefined && kind !== 'mcu' && kind !== 'fpga') {
            throw new TypeError('Conflict kind of source and destination');
        }
        const opts = meta[kind];
        let buffer = opts.converter(fs_1.default.readFileSync(source), (_a = opts.size) === null || _a === void 0 ? void 0 : _a[0], opts.begin);
        if (opts.size && !opts.size.includes(buffer.length)) {
            throw new Error(`Invalid data length. Expected ${opts.size.join(',')} got ${buffer.length}`);
        }
        if (kind !== 'ctrl' && kind !== 'mcu') {
            const header = createHeader(kind, 0, buffer);
            buffer = Buffer.concat([header, buffer, header]);
        }
        else {
            const crc = Buffer.alloc(2);
            crc.writeUInt16LE(crc_1.crc16ccitt(buffer, 0x55aa), 0);
            buffer = Buffer.concat([buffer, crc]);
        }
        const info = { total: buffer.length, offset: opts.offset };
        this.emit('start', info);
        const action = async () => {
            var _a;
            const { device } = this;
            const downloadListener = ({ domain: downloadDomain, length }) => {
                if (opts.domain === downloadDomain)
                    this.emit('tick', { length });
            };
            device.on('downloadData', downloadListener);
            try {
                await device.download(opts.domain, buffer, opts.offset);
            }
            finally {
                device.off('downloadData', downloadListener);
            }
            if (moduleSelect !== undefined) {
                device.selector = 0;
                device.moduleSelect = moduleSelect;
                await device.drain();
                const checkModul = async () => {
                    const { moduleSelect: current } = device;
                    const xy = parseModuleSelect(current);
                    const moduleOpts = { moduleSelect: current, x: current << 8, y: current & 0xff };
                    try {
                        const data = await device.upload('MODUL', 0, 6);
                        let msg;
                        if (data[3] & 0b100) {
                            msg = `Модуль ${xy}: Ошибка контрольной суммы в кадре`;
                        }
                        if (data[3] & 0b1000) {
                            msg = `Модуль ${xy}: Таймаут ожидания валидности страницы`;
                        }
                        if (data[3] & 0b10000) {
                            msg = `Модуль ${xy}: Ошибка в работе флеш памяти`;
                        }
                        this.emit('module', Object.assign(Object.assign({}, moduleOpts), { msg }));
                        return true;
                    }
                    catch (err) {
                        this.emit('module', Object.assign(Object.assign({}, moduleOpts), { msg: `Ошибка проверки ${xy}: ${err.message || err}` }));
                        return false;
                    }
                };
                if (device.moduleSelect !== 0xffff) {
                    await checkModul();
                }
                else {
                    let y = 0;
                    for (let x = 0; x < 24; x += 1) {
                        for (y = 0; y < 256; y += 1) {
                            try {
                                device.moduleSelect = (x << 8) + y;
                                await device.drain();
                                const res = await checkModul();
                                if (!res)
                                    break;
                            }
                            catch (err) {
                                this.emit('module', {
                                    moduleSelect: device.moduleSelect,
                                    x,
                                    y,
                                    msg: (_a = err.message) !== null && _a !== void 0 ? _a : err,
                                });
                                break;
                            }
                        }
                        if (y === 0) {
                            const msg = `Столб ${x} не ответил`;
                            this.emit('module', { moduleSelect: (x << 8) | 0xff, x, y: 0xff, msg });
                        }
                    }
                    device.moduleSelect = 0xffff;
                    await device.drain();
                }
            }
            if (opts.exec) {
                await device.execute(opts.exec);
            }
        };
        action().finally(() => {
            this.emit('finish');
        });
        return info;
    }
}
exports.Flasher = Flasher;
//# sourceMappingURL=Flasher.js.map