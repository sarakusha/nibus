"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.action = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const progress_1 = __importDefault(require("progress"));
const os_1 = require("os");
const core_1 = require("@nibus/core");
const handlers_1 = __importDefault(require("../handlers"));
const write_1 = require("./write");
async function action(device, args) {
    const { domain, offset, size, out, force, hex } = args;
    const writeArgs = out
        ? {
            ...args,
            quiet: true,
        }
        : args;
    await write_1.action(device, writeArgs);
    let close = () => { };
    let write;
    let tick = (_size) => { };
    if (out) {
        if (!force && fs_1.default.existsSync(out)) {
            throw new Error(`File ${path_1.default.resolve(out)} already exists`);
        }
        const ws = fs_1.default.createWriteStream(out, {
            encoding: hex ? 'utf8' : 'binary',
        });
        write = data => ws.write(data, err => err && console.error(err.message));
        close = ws.close.bind(ws);
    }
    else {
        write = data => process.stdout.write(data, err => err && console.error(err.message));
    }
    const dataHandler = ({ data }) => {
        tick(data.length);
        if (hex) {
            write(`${core_1.printBuffer(data)}${os_1.EOL}`);
        }
        else {
            write(data);
        }
    };
    device.once('uploadStart', ({ domainSize }) => {
        const total = size || domainSize - offset;
        if (out) {
            const bar = new progress_1.default(`  uploading [:bar] ${total <= 50 ? '' : ':rate/bps :percent '}:current/:total :etas`, {
                total: total,
                width: 20,
            });
            tick = bar.tick.bind(bar);
        }
        if (hex && offset > 0) {
            write(`@${offset.toString(16).padStart(4, '0')}${os_1.EOL}`);
        }
    });
    device.on('uploadData', dataHandler);
    try {
        await device.upload(domain, offset, size);
    }
    finally {
        device.off('uploadData', dataHandler);
        close();
    }
}
exports.action = action;
const uploadCommand = {
    command: 'upload',
    describe: 'выгрузить домен из устройства',
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
        .option('size', {
        alias: 'length',
        number: true,
        describe: 'требуемое количество байт',
    })
        .option('out', {
        alias: 'o',
        string: true,
        describe: 'сохранить в файл',
    })
        .option('hex', {
        boolean: true,
        describe: 'использовать текстовый формат',
    })
        .option('f', {
        alias: 'force',
        boolean: true,
        describe: 'перезаписать существующий файл',
    })
        .demandOption(['mac', 'domain']),
    handler: handlers_1.default(action, true),
};
exports.default = uploadCommand;
//# sourceMappingURL=upload.js.map