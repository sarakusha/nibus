"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crc_1 = require("crc");
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const progress_1 = __importDefault(require("progress"));
const fast_xml_parser_1 = __importDefault(require("fast-xml-parser"));
const path_1 = __importDefault(require("path"));
const handlers_1 = __importDefault(require("../handlers"));
const write_1 = require("./write");
const crcPrev = 0xAA55;
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
    const result = Buffer.alloc(size, 0xFF);
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
    return Buffer.from(lodash_1.default.flatten(raw.map(word => [word & 0xFF, (word >> 8) & 0xFF])));
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
        const { Xy: { X, Y }, Yb } = Configuration[name];
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
        offset: 0xC0000,
        size: [1536, 2822],
        converter: decConvert,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    tcc: {
        offset: 0xC0000,
        size: [1536, 2822],
        converter: decConvert,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    ttc: {
        offset: 0xC0000,
        converter: xmlConvert,
        exec: 'reloadModule',
        domain: 'RFLASH',
    },
    ctrl: {
        offset: 0xF0000,
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
function action(device, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const isModule = (yield write_1.action(device, args)).includes('moduleSelect');
        let kind = args.kind;
        if (!kind) {
            switch (path_1.default.extname(args.source)) {
                case '.rbf':
                    kind = isModule ? 'rbf' : 'fpga';
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
                    kind = isModule ? 'ctrl' : 'mcu';
                    break;
                default:
                    throw new Error('Unknown kind of source');
            }
        }
        if (!isModule && kind !== 'mcu' && kind !== 'fpga') {
            throw new Error('Conflict kind of source and destination');
        }
        const opts = meta[kind];
        process.env.NODE_NO_WARNINGS = '1';
        let buffer = opts.converter(yield fs_1.default.promises.readFile(args.source), opts.size && opts.size[0], opts.begin);
        if (opts.size && !opts.size.includes(buffer.length)) {
            throw new Error(`Invalid data length. Expected ${opts.size.join(',')} got ${buffer.length}`);
        }
        if (kind !== 'ctrl' && kind !== 'mcu') {
            const header = createHeader(kind, 0, buffer);
            buffer = Buffer.concat([header, buffer, header]);
        }
        else {
            const crc = Buffer.alloc(2);
            crc.writeUInt16LE(crc_1.crc16ccitt(buffer, 0x55AA), 0);
            buffer = Buffer.concat([buffer, crc]);
        }
        const dest = opts.offset.toString(16).padStart(5, '0');
        const bar = new progress_1.default(`  flashing [:bar] to ${dest}h :rate/bps :percent :current/:total :etas`, {
            total: buffer.length,
            width: 30,
        });
        device.on('downloadData', ({ domain: downloadDomain, length }) => {
            if (opts.domain === downloadDomain)
                bar.tick(length);
        });
        yield device.download(opts.domain, buffer, opts.offset);
        if (isModule) {
            device.selector = 0;
            yield device.write(device.getId('selector'));
            const data = yield device.upload('MODUL', 0, 6);
            if (data[3] & 0b100) {
                console.error('Ошибка контрольной суммы в кадре');
            }
            if (data[3] & 0b1000) {
                console.error('Таймаут ожидания валидности страницы');
            }
            if (data[3] & 0b10000) {
                console.error('Ошибка в работе флеш памяти');
            }
        }
        if (opts.exec) {
            yield device.execute(opts.exec);
        }
    });
}
const flashCommand = {
    command: 'flash',
    describe: 'прошивка минихоста3',
    builder: argv => argv
        .option('kind', {
        alias: 'k',
        choices: ['rbf', 'tca', 'tcc', 'ttc', 'ctrl', 'mcu', 'fpga'],
    })
        .option('source', {
        alias: 'src',
        string: true,
        describe: 'загрузить данные из файла',
    })
        .example('$0 flash -m ::1 moduleSelect=0 --src Alpha_Ctrl_SPI_Module_C10_320_104.rbf', 'Прошивка ПЛИС модуля 0:0 (если расширение .rbf, [-k rbf] - можно не указывать) ')
        .example('$0 flash -m ::1 moduleSelect=0 --src data.tcc', `Прошивка таблицы цветокоррекции v1 для модуля
\t(если расширение .tcc, [-k tcc] - можно не указывать)`)
        .example('$0 flash -m ::1 moduleSelect=0 --src config.xml', `Прошивка таблицы цветокоррекции v2 для модуля
\t(если расширение .xml, [-k ttc] - можно не указывать)`)
        .example('$0 flash -m ::1 moduleSelect=0 --src Slim_Ctrl_v5_Mcu_v1.2.txt', `Прошивка процессора модуля
\t(если расширение .txt, [-k ctrl] - можно не указывать)`)
        .example('$0 flash -m ::1 --src NataInfo_4.0.1.1.txt', `Прошивка процессора хоста
\t(если расширение .txt, [-k ctrl] - можно не указывать)`)
        .demandOption(['mac', 'source']),
    handler: handlers_1.default(action),
};
exports.default = flashCommand;
//# sourceMappingURL=flash.js.map