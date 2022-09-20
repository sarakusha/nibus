/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { CommandModule } from 'yargs';
import _ from 'lodash';
import { TimeoutError, getDefaultSession } from '@nibus/core';
import { CommonOpts, MacOptions } from '../options';
import serviceWrapper from '../serviceWrapper';

type PingOpts = MacOptions & {
  count?: number;
  timeout?: number;
};

const session = getDefaultSession();

export const delay = (timeout: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, timeout * 1000);
  });
const round = (val: number): number => Math.round(val * 10) / 10;

const pingCommand: CommandModule<CommonOpts, PingOpts> = {
  command: 'ping',
  describe: 'пропинговать устройство',
  builder: argv =>
    argv
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
  handler: serviceWrapper(
    async ({ count = -1, timeout = 1, mac, quiet, raw }): Promise<void> => {
      await session.start();
      const stat: number[] = [];
      let transmitted = 0;
      process.on('exit', () => {
        const loss = 100 - round((stat.length / transmitted) * 100);
        const min = _.min(stat);
        const max = _.max(stat);
        const avg = round(_.mean(stat));
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
        // eslint-disable-next-line no-await-in-loop
        const [ping] = await session.ping(mac);
        if (ping !== -1) stat.push(ping);
        transmitted += 1;
        quiet || raw || console.info(`${mac} ${ping !== -1 ? `${ping} ms` : '*'}`);
        if (count - transmitted === 0) break;
        // eslint-disable-next-line no-await-in-loop
        await delay(timeout);
      }
      session.close();
      if (raw) console.info(stat.length);
      if (stat.length === 0) throw new TimeoutError();
    }
  ),
};

export default pingCommand;
