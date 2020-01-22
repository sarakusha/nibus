import debugFactory from 'debug';
import { Tail } from 'tail';
import path from 'path';
import { homedir } from 'os';
import { PATH, Client } from '@nibus/core';
const debug = debugFactory('nibus:log');
const logCommand = {
    command: 'log',
    describe: 'задать уровень логгирования',
    builder: argv => argv
        .option('level', {
        alias: ['l', 'lev'],
        desc: 'уровень',
        choices: ['none', 'hex', 'nibus'],
    })
        .option('pick', {
        desc: 'выдавать указанные поля в логах nibus',
        array: true,
    })
        .option('omit', {
        desc: 'выдавть поля кроме указанных в логах nibus',
        array: true,
    })
        .option('begin', {
        alias: 'b',
        describe: 'вывод с начала',
        boolean: true,
    }),
    handler: ({ level, pick, omit, begin, }) => new Promise((resolve, reject) => {
        const socket = Client.connect(PATH);
        let resolved = false;
        socket.once('close', () => {
            resolved ? resolve() : reject();
        });
        socket.on('error', err => {
            debug('<error>', err);
        });
        socket.on('connect', async () => {
            try {
                await socket.send('setLogLevel', level, pick, omit);
                resolved = true;
            }
            finally {
                socket.destroy();
            }
        });
        const log = new Tail(path.resolve(homedir(), '.pm2', 'logs', 'nibus.service-error.log'), { fromBeginning: !!begin });
        process.on('SIGINT', () => log.unwatch());
        log.watch();
        log.on('line', console.info.bind(console));
    }),
};
export default logCommand;
//# sourceMappingURL=log.js.map