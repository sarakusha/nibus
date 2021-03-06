"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.delay = void 0;
const lodash_1 = __importDefault(require("lodash"));
const core_1 = __importStar(require("@nibus/core"));
const serviceWrapper_1 = __importDefault(require("../serviceWrapper"));
exports.delay = (timeout) => new Promise(resolve => setTimeout(resolve, timeout * 1000));
const round = (val) => Math.round(val * 10) / 10;
const pingCommand = {
    command: 'ping',
    describe: 'пропинговать устройство',
    builder: argv => argv
        .option('count', {
        alias: 'c',
        describe: 'остановиться после отправки указанного количества ответов',
        number: true,
    })
        .option('timeout', {
        alias: 't',
        describe: 'задать таймаут в секундах',
        default: 1,
        number: true,
    })
        .demandOption(['mac']),
    handler: serviceWrapper_1.default(({ count = -1, timeout = 1, mac, quiet, raw, }) => __awaiter(void 0, void 0, void 0, function* () {
        yield core_1.default.start();
        const stat = [];
        let transmitted = 0;
        process.on('exit', () => {
            const loss = 100 - round((stat.length / transmitted) * 100);
            const min = lodash_1.default.min(stat);
            const max = lodash_1.default.max(stat);
            const avg = round(lodash_1.default.mean(stat));
            quiet || raw || console.info(`
${transmitted} пакет(ов) отправлено, ${stat.length} пакет(ов) получено, ${loss}% пакетов потеряно
min/avg/max = ${min || '-'}/${Number.isNaN(avg) ? '-' : avg}/${max || '-'}`);
        });
        let exit = false;
        process.on('SIGINT', () => {
            exit = true;
        });
        while (count - transmitted !== 0 && !exit) {
            const ping = yield core_1.default.ping(mac);
            if (ping !== -1)
                stat.push(ping);
            transmitted += 1;
            quiet || raw || console.info(`${mac} ${ping !== -1 ? `${ping} ms` : '*'}`);
            if (count - transmitted === 0)
                break;
            yield exports.delay(timeout);
        }
        core_1.default.close();
        if (raw)
            console.info(stat.length);
        if (stat.length === 0)
            throw new core_1.TimeoutError();
    })),
};
exports.default = pingCommand;
//# sourceMappingURL=ping.js.map