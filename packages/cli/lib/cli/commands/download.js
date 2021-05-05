"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.action = exports.convert = void 0;
const fs_1 = __importDefault(require("fs"));
const progress_1 = __importDefault(require("progress"));
const handlers_1 = __importDefault(require("../handlers"));
const write_1 = require("./write");
function readAllFromStdin() {
    const buffers = [];
    const onData = (buffer) => {
        buffers.push(buffer);
    };
    return new Promise((resolve, reject) => {
        process.stdin
            .on('data', onData)
            .once('end', () => {
            process.stdin.off('data', onData);
            process.stdin.off('error', reject);
            resolve(Buffer.concat(buffers));
        })
            .once('error', reject);
    });
}
const convert = (buffer) => {
    const lines = buffer
        .toString('ascii')
        .split(/\r?\n/g)
        .map(line => line.replace(/[\s:-=]/g, ''));
    let offset = 0;
    if (lines.length === 0)
        return [Buffer.alloc(0), 0];
    const first = lines[0];
    if (first[0] === '@') {
        offset = parseInt(first.slice(1), 16);
        lines.splice(0, 1);
    }
    const invalidLines = lines.reduce((result, line, index) => /^[0-9a-fA-F]*$/.test(line) && line.length % 2 === 0 ? result : [...result, String(index)], []);
    if (invalidLines.length > 0)
        throw new Error(`Invalid hex in lines ${invalidLines.join(',')}`);
    return [Buffer.from(lines.join('')), offset];
};
exports.convert = convert;
async function action(device, args) {
    const { domain, offset, source, hex } = args;
    await write_1.action(device, args);
    let buffer;
    let ofs = 0;
    let tick = (_size) => { };
    if (source) {
        buffer = await fs_1.default.promises.readFile(source);
        if (hex)
            [buffer, ofs] = exports.convert(buffer);
        const dest = (offset || ofs).toString(16).padStart(4, '0');
        const bar = new progress_1.default(`  downloading [:bar] to ${dest} :rate/bps :percent :current/:total :etas`, {
            total: buffer.length,
            width: 20,
        });
        tick = bar.tick.bind(bar);
    }
    else {
        buffer = await readAllFromStdin();
        if (hex) {
            [buffer, ofs] = exports.convert(buffer);
        }
    }
    device.on('downloadData', ({ domain: dataDomain, length }) => {
        if (dataDomain === domain)
            tick(length);
    });
    await device.download(domain, buffer, offset || ofs, !args.terminate);
}
exports.action = action;
const downloadCommand = {
    command: 'download',
    describe: 'загрузить домен в устройство',
    builder: argv => argv
        .option('domain', {
        default: 'CODE',
        describe: 'имя домена',
        string: true,
    })
        .option('offset', {
        alias: 'ofs',
        default: 0,
        number: true,
        describe: 'смещение в домене',
    })
        .option('source', {
        alias: 'src',
        string: true,
        describe: 'загрузить данные из файла',
    })
        .option('hex', {
        boolean: true,
        describe: 'использовать текстовый формат',
    })
        .check(({ hex, raw }) => {
        if (hex && raw)
            throw new Error('Arguments hex and raw are mutually exclusive');
        return true;
    })
        .option('execute', {
        alias: 'exec',
        string: true,
        describe: 'выполнить программу после записи',
    })
        .option('term', {
        alias: 'terminate',
        describe: 'выполнять TerminateDownloadSequence в конце',
        boolean: true,
        default: true,
    })
        .demandOption(['mac']),
    handler: handlers_1.default(action, true),
};
exports.default = downloadCommand;
//# sourceMappingURL=download.js.map