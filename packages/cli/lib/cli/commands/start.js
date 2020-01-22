import pm2 from 'pm2';
import path from 'path';
import debugFactory from 'debug';
const debug = debugFactory('nibus:start');
export const startOptions = {
    name: 'nibus.service',
    script: 'service/daemon.js',
    cwd: path.resolve(__dirname, '../..'),
    max_restarts: 3,
    env: {
        DEBUG: 'nibus:*,-nibus:decoder',
        DEBUG_COLORS: '1',
    },
};
if (path.extname(__filename) === '.ts') {
    startOptions.script = 'service/dev.start.js';
    startOptions.watch = [
        'service/demon.ts',
        'ipc/Server.ts',
        'ipc/SerialTee.ts',
        'service/detector.ts',
    ];
}
const startup = (platform) => new Promise(((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    pm2.startup(platform, err => {
        clearTimeout(timeout);
        if (err) {
            reject(err);
        }
        else {
            resolve();
        }
    });
}));
const startCommand = {
    command: 'start',
    describe: 'запустить сервис NiBUS',
    builder: argv => argv
        .option('auto', {
        describe: 'автозапуск сервиса после старта стистемы для заданной ОС',
        choices: ['ubuntu', 'centos', 'redhat', 'gentoo', 'systemd', 'darwin', 'amazon'],
    }),
    handler: argc => {
        pm2.connect(err => {
            if (err) {
                console.error('не удалось подключиться к pm2', err.message);
                process.exit(2);
            }
            debug('pm2 is connected');
            pm2.delete(startOptions.name, () => pm2.start(startOptions, async (e) => {
                if (!e && argc.auto) {
                    try {
                        await startup(argc.auto);
                    }
                    catch (error) {
                        console.error('Не удалось зарегестрировать сервис', error.message);
                    }
                }
                pm2.disconnect();
                if (e) {
                    console.error('error while start nibus.service', e);
                    process.exit(2);
                }
                console.info('nibus.service запущен');
            }));
        });
    },
};
export default startCommand;
//# sourceMappingURL=start.js.map