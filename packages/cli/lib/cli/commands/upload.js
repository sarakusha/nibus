import fs from 'fs';
import path from 'path';
import Progress from 'progress';
import { EOL } from 'os';
import { printBuffer } from '@nibus/core';
import makeAddressHandler from '../handlers';
import { action as writeAction } from './write';
export async function action(device, args) {
    const { domain, offset, size, out, force, hex, } = args;
    const writeArgs = out
        ? {
            ...args,
            quiet: true,
        }
        : args;
    await writeAction(device, writeArgs);
    let close = () => { };
    let write;
    let tick = (_size) => { };
    if (out) {
        if (!force && fs.existsSync(out)) {
            throw new Error(`File ${path.resolve(out)} already exists`);
        }
        const ws = fs.createWriteStream(out, {
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
            write(`${printBuffer(data)}${EOL}`);
        }
        else {
            write(data);
        }
    };
    device.once('uploadStart', ({ domainSize }) => {
        const total = size || (domainSize - offset);
        if (out) {
            const bar = new Progress(`  uploading [:bar] ${total <= 50 ? '' : ':rate/bps :percent '}:current/:total :etas`, {
                total: total,
                width: 20,
            });
            tick = bar.tick.bind(bar);
        }
        if (hex && offset > 0) {
            write(`@${offset.toString(16).padStart(4, '0')}${EOL}`);
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
    handler: makeAddressHandler(action, true),
};
export default uploadCommand;
//# sourceMappingURL=upload.js.map