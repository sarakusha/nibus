"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
const lodash_1 = __importDefault(require("lodash"));
const core_1 = require("@nibus/core");
const serviceWrapper_1 = __importDefault(require("../serviceWrapper"));
const session = core_1.getDefaultSession();
const delay = (timeout) => new Promise(resolve => setTimeout(resolve, timeout * 1000));
exports.delay = delay;
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
    handler: serviceWrapper_1.default(async ({ count = -1, timeout = 1, mac, quiet, raw }) => {
        await session.start();
        const stat = [];
        let transmitted = 0;
        process.on('exit', () => {
            const loss = 100 - round((stat.length / transmitted) * 100);
            const min = lodash_1.default.min(stat);
            const max = lodash_1.default.max(stat);
            const avg = round(lodash_1.default.mean(stat));
            quiet ||
                raw ||
                console.info(`
${transmitted} пакет(ов) отправлено, ${stat.length} пакет(ов) получено, ${loss}% пакетов потеряно
min/avg/max = ${min || '-'}/${Number.isNaN(avg) ? '-' : avg}/${max || '-'}`);
        });
        let exit = false;
        process.on('SIGINT', () => {
            exit = true;
        });
        while (count - transmitted !== 0 && !exit) {
            const [ping] = await session.ping(mac);
            if (ping !== -1)
                stat.push(ping);
            transmitted += 1;
            quiet || raw || console.info(`${mac} ${ping !== -1 ? `${ping} ms` : '*'}`);
            if (count - transmitted === 0)
                break;
            await exports.delay(timeout);
        }
        session.close();
        if (raw)
            console.info(stat.length);
        if (stat.length === 0)
            throw new core_1.TimeoutError();
    }),
};
exports.default = pingCommand;
//# sourceMappingURL=ping.js.map