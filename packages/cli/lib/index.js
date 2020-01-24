#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const mib_1 = require("@nibus/core/lib/mib");
const dump_1 = __importDefault(require("./cli/commands/dump"));
const list_1 = __importDefault(require("./cli/commands/list"));
const ping_1 = __importDefault(require("./cli/commands/ping"));
const read_1 = __importDefault(require("./cli/commands/read"));
const start_1 = __importDefault(require("./cli/commands/start"));
const stop_1 = __importDefault(require("./cli/commands/stop"));
const write_1 = __importDefault(require("./cli/commands/write"));
const upload_1 = __importDefault(require("./cli/commands/upload"));
const download_1 = __importDefault(require("./cli/commands/download"));
const log_1 = __importDefault(require("./cli/commands/log"));
const mib_2 = __importDefault(require("./cli/commands/mib"));
const flash_1 = __importDefault(require("./cli/commands/flash"));
const execute_1 = __importDefault(require("./cli/commands/execute"));
const parse_1 = __importDefault(require("./cli/commands/parse"));
const { argv } = yargs_1.default
    .option('mac', {
    alias: 'm',
    desc: 'Адрес устройства',
    type: 'string',
})
    .option('raw', {
    boolean: true,
    default: false,
    desc: 'Сырые данные',
})
    .option('id', {
    alias: 'name',
    description: 'имя или id переменной',
    array: true,
})
    .option('mib', {
    desc: 'mib-файл',
    choices: mib_1.getMibsSync(),
    string: true,
})
    .option('compact', {
    desc: 'компактная таблица для вывода',
    boolean: true,
    default: true,
})
    .option('quiet', {
    desc: 'тихий режим',
    boolean: true,
    default: false,
    alias: 'q',
})
    .option('timeout', {
    desc: 'тймаут в секундах',
    number: true,
    default: 1,
})
    .command(start_1.default)
    .command(stop_1.default)
    .command(ping_1.default)
    .command(dump_1.default)
    .command(list_1.default)
    .command(read_1.default)
    .command(write_1.default)
    .command(upload_1.default)
    .command(download_1.default)
    .command(log_1.default)
    .command(mib_2.default)
    .command(flash_1.default)
    .command(execute_1.default)
    .command(parse_1.default)
    .locale('ru')
    .completion('completion')
    .showHelpOnFail(false)
    .strict()
    .help()
    .wrap(Math.min(yargs_1.default.terminalWidth(), 100))
    .epilogue(`(c) Nata-Info, ${new Date().getFullYear()}`);
//# sourceMappingURL=index.js.map