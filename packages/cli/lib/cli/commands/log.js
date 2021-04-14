"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tail_1 = require("tail");
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const core_1 = require("@nibus/core");
const debug_1 = __importDefault(require("../../debug"));
const serviceWrapper_1 = __importDefault(require("../serviceWrapper"));
const debug = debug_1.default('nibus:log');
const logCommand = {
    command: 'log',
    describe: 'задать уровень логирования',
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
        desc: 'выдавать поля кроме указанных в логах nibus',
        array: true,
    })
        .option('begin', {
        alias: 'b',
        describe: 'вывод с начала',
        boolean: true,
    }),
    handler: serviceWrapper_1.default(({ level, begin }) => new Promise((resolve, reject) => {
        const socket = core_1.Client.connect({ port: +(process.env.NIBUS_PORT ?? 9001) });
        let resolved = false;
        socket.once('close', () => {
            resolved ? resolve() : reject();
        });
        socket.on('error', err => {
            debug('<error>', err);
        });
        socket.on('connect', async () => {
            try {
                await socket.send('setLogLevel', (level ?? 'none'));
                resolved = true;
            }
            finally {
                socket.destroy();
            }
        });
        const log = new tail_1.Tail(path_1.default.resolve(os_1.homedir(), '.pm2', 'logs', 'nibus.service-error.log'), {
            fromBeginning: !!begin,
        });
        process.on('SIGINT', () => log.unwatch());
        log.watch();
        log.on('line', console.info.bind(console));
    })),
};
exports.default = logCommand;
//# sourceMappingURL=log.js.map