import _ from 'lodash';
import session, { TimeoutError } from '@nibus/core';
const delay = (timeout) => new Promise(resolve => setTimeout(resolve, timeout * 1000));
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
    handler: async ({ count = -1, timeout = 1, mac, quiet, raw, }) => {
        await session.start();
        const stat = [];
        let transmitted = 0;
        process.on('exit', () => {
            const loss = 100 - round((stat.length / transmitted) * 100);
            const min = _.min(stat);
            const max = _.max(stat);
            const avg = round(_.mean(stat));
            quiet || raw || console.info(`
${transmitted} пакет(ов) отправлено, ${stat.length} пакет(ов) получено, ${loss}% пакетов потеряно
min/avg/max = ${min || '-'}/${Number.isNaN(avg) ? '-' : avg}/${max || '-'}`);
        });
        let exit = false;
        process.on('SIGINT', () => {
            exit = true;
        });
        while (count - transmitted !== 0 && !exit) {
            const ping = await session.ping(mac);
            if (ping !== -1)
                stat.push(ping);
            transmitted += 1;
            quiet || raw || console.info(`${mac} ${ping !== -1 ? `${ping} ms` : '*'}`);
            if (count - transmitted === 0)
                break;
            await delay(timeout);
        }
        session.close();
        if (raw)
            console.info(stat.length);
        if (stat.length === 0)
            throw new TimeoutError();
    },
};
export default pingCommand;
//# sourceMappingURL=ping.js.map