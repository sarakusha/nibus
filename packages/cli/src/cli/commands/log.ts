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
import { Tail } from 'tail';
import path from 'path';
import { homedir } from 'os';
import { Client, LogLevel } from '@nibus/core';
import { CommonOpts } from '../options';
import debugFactory from 'debug';
import serviceWrapper from '../serviceWrapper';

const debug = debugFactory('nibus:log');
type LogOpts = CommonOpts & {
  level?: string; // 'none' | 'hex' | 'nibus';
  pick?: ReadonlyArray<string | number>;
  omit?: ReadonlyArray<string | number>;
  begin?: boolean;
};

const logCommand: CommandModule<CommonOpts, LogOpts> = {
  command: 'log',
  describe: 'задать уровень логирования',
  builder: argv =>
    argv
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
  handler: serviceWrapper(
    ({ level, /* pick, omit,*/ begin }) =>
      new Promise((resolve, reject) => {
        const socket = Client.connect({ port: +(process.env.NIBUS_PORT ?? 9001) });
        let resolved = false;
        socket.once('close', () => {
          resolved ? resolve() : reject();
        });
        socket.on('error', err => {
          debug('<error>', err);
        });
        socket.on('connect', async () => {
          try {
            await socket.send('setLogLevel', (level ?? 'none') as LogLevel /* pick, omit*/);
            resolved = true;
          } finally {
            socket.destroy();
          }
        });
        const log = new Tail(path.resolve(homedir(), '.pm2', 'logs', 'nibus.service-error.log'), {
          fromBeginning: !!begin,
        });
        process.on('SIGINT', () => log.unwatch());
        log.watch();
        log.on('line', console.info.bind(console));
      })
  ),
};

export default logCommand;
