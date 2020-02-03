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
const tail_1 = require("tail");
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const core_1 = require("@nibus/core");
const debug_1 = __importDefault(require("../../debug"));
const debug = debug_1.default('nibus:log');
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
        const socket = core_1.Client.connect(core_1.PATH);
        let resolved = false;
        socket.once('close', () => {
            resolved ? resolve() : reject();
        });
        socket.on('error', err => {
            debug('<error>', err);
        });
        socket.on('connect', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield socket.send('setLogLevel', level, pick, omit);
                resolved = true;
            }
            finally {
                socket.destroy();
            }
        }));
        const log = new tail_1.Tail(path_1.default.resolve(os_1.homedir(), '.pm2', 'logs', 'nibus.service-error.log'), { fromBeginning: !!begin });
        process.on('SIGINT', () => log.unwatch());
        log.watch();
        log.on('line', console.info.bind(console));
    }),
};
exports.default = logCommand;
//# sourceMappingURL=log.js.map