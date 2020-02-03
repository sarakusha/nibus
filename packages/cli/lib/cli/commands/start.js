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
const pm2_1 = __importDefault(require("pm2"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("../../debug"));
const debug = debug_1.default('nibus:start');
exports.startOptions = {
    name: 'nibus.service',
    script: 'service/daemon.js',
    cwd: path_1.default.resolve(__dirname, '../..'),
    max_restarts: 3,
    env: {
        DEBUG: 'nibus:*,nibus-serial:*',
        DEBUG_COLORS: '1',
    },
};
if (path_1.default.extname(__filename) === '.ts') {
    exports.startOptions.script = 'service/dev.start.js';
    exports.startOptions.watch = [
        'service/demon.ts',
        'ipc/Server.ts',
        'ipc/SerialTee.ts',
        'service/detector.ts',
    ];
}
const startup = (platform) => new Promise(((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    pm2_1.default.startup(platform, err => {
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
        pm2_1.default.connect(err => {
            if (err) {
                console.error('не удалось подключиться к pm2', err.message);
                process.exit(2);
            }
            debug('pm2 is connected');
            pm2_1.default.delete(exports.startOptions.name, () => pm2_1.default.start(exports.startOptions, (e) => __awaiter(void 0, void 0, void 0, function* () {
                if (!e && argc.auto) {
                    try {
                        yield startup(argc.auto);
                    }
                    catch (error) {
                        console.error('Не удалось зарегестрировать сервис', error.message);
                    }
                }
                pm2_1.default.disconnect();
                if (e) {
                    console.error('error while start nibus.service', e);
                    process.exit(2);
                }
                console.info(`nibus.service запущен. modules: ${process.versions.modules}, node: ${process.versions.node}`);
            })));
        });
    },
};
exports.default = startCommand;
//# sourceMappingURL=start.js.map