import { NibusDecoder } from '@nibus/core/lib/nibus';
import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
const hexTransform = new Transform({
    transform(chunk, encoding, callback) {
        const data = chunk.toString().replace(/-/g, '').replace(/\n/g, '');
        const buffer = Buffer.from(data, 'hex');
        callback(null, buffer);
    },
});
const makeNibusDecoder = (pick, omit) => {
    const decoder = new NibusDecoder();
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
        const inputPath = path.resolve(process.cwd(), input);
        if (!fs.existsSync(inputPath)) {
            reject(Error(`File ${inputPath} not found`));
            return;
        }
        const stream = fs.createReadStream(inputPath);
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
export default parseCommand;
//# sourceMappingURL=parse.js.map