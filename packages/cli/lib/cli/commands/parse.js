"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nibus_1 = require("@nibus/core/lib/nibus");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const hexTransform = new stream_1.Transform({
    transform(chunk, encoding, callback) {
        const data = chunk.toString().replace(/-/g, '').replace(/\n/g, '');
        const buffer = Buffer.from(data, 'hex');
        callback(null, buffer);
    },
});
const makeNibusDecoder = (pick, omit) => {
    const decoder = new nibus_1.NibusDecoder();
    decoder.on('data', (datagram) => {
        console.info(datagram.toString({
            pick,
            omit,
        }));
    });
    return decoder;
};
const parseCommand = {
    command: 'parse',
    describe: 'Разбор пакетов',
    builder: argv => argv
        .option('pick', {
        desc: 'выдавать указанные поля в логах nibus',
        string: true,
        array: true,
    })
        .option('omit', {
        desc: 'выдавть поля кроме указанных в логах nibus',
        string: true,
        array: true,
    })
        .option('input', {
        alias: 'i',
        string: true,
        desc: 'входной файл с данными',
        required: true,
    })
        .option('hex', {
        boolean: true,
        desc: 'входной файл в формате hex',
    }),
    handler: (({ _level, pick, omit, input, hex, }) => new Promise((resolve, reject) => {
        const inputPath = path_1.default.resolve(process.cwd(), input);
        if (!fs_1.default.existsSync(inputPath)) {
            reject(Error(`File ${inputPath} not found`));
            return;
        }
        const stream = fs_1.default.createReadStream(inputPath);
        stream.on('finish', () => resolve());
        stream.on('error', reject);
        const decoder = makeNibusDecoder(pick, omit);
        if (hex) {
            stream.pipe(hexTransform).pipe(decoder);
        }
        else {
            stream.pipe(decoder);
        }
    })),
};
exports.default = parseCommand;
//# sourceMappingURL=parse.js.map