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
exports.action = void 0;
const progress_1 = __importDefault(require("progress"));
const core_1 = require("@nibus/core");
const handlers_1 = __importDefault(require("../handlers"));
const write_1 = require("./write");
function action(device, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const isModule = (yield write_1.action(device, args)).includes('moduleSelect');
        const flasher = new core_1.Flasher(device.id);
        const { total, offset } = flasher.flash(args.source, isModule ? device.moduleSelect : undefined);
        const dest = offset.toString(16).padStart(5, '0');
        const bar = new progress_1.default(`  flashing [:bar] to ${dest}h :rate/bps :percent :current/:total :etas`, {
            total,
            width: 30,
        });
        flasher.on('tick', length => bar.tick(length));
        flasher.on('module', ({ x, y, msg }) => {
            if (!msg)
                console.info(`Модуль ${x},${y}: Ok`);
            else
                console.error(msg);
        });
        return new Promise(resolve => flasher.once('finish', resolve));
    });
}
exports.action = action;
const flashCommand = {
    command: 'flash',
    describe: 'прошивка минихоста3',
    builder: argv => argv
        .option('kind', {
        alias: 'k',
        choices: ['rbf', 'tca', 'tcc', 'ttc', 'ctrl', 'mcu', 'fpga'],
    })
        .option('source', {
        alias: 'src',
        string: true,
        describe: 'загрузить данные из файла',
    })
        .example('$0 flash -m ::1 moduleSelect=0 --src Alpha_Ctrl_SPI_Module_C10_320_104.rbf', 'Прошивка ПЛИС модуля 0:0 (если расширение .rbf, [-k rbf] - можно не указывать) ')
        .example('$0 flash -m ::1 moduleSelect=0 --src data.tcc', `Прошивка таблицы цветокоррекции v1 для модуля
\t(если расширение .tcc, [-k tcc] - можно не указывать)`)
        .example('$0 flash -m ::1 moduleSelect=0 --src config.xml', `Прошивка таблицы цветокоррекции v2 для модуля
\t(если расширение .xml, [-k ttc] - можно не указывать)`)
        .example('$0 flash -m ::1 moduleSelect=0 --src Slim_Ctrl_v5_Mcu_v1.2.txt', `Прошивка процессора модуля
\t(если расширение .txt, [-k ctrl] - можно не указывать)`)
        .example('$0 flash -m ::1 --src NataInfo_4.0.1.1.txt', `Прошивка процессора хоста
\t(если расширение .txt, [-k ctrl] - можно не указывать)`)
        .demandOption(['mac', 'source']),
    handler: handlers_1.default(action),
};
exports.default = flashCommand;
//# sourceMappingURL=flash.js.map