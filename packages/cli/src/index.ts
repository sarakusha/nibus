#!/usr/bin/env node
/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import yargs from 'yargs';
import { getMibsSync } from '@nibus/core';
import dump from './cli/commands/dump';
import list from './cli/commands/list';
import ping from './cli/commands/ping';
import read from './cli/commands/read';
import start from './cli/commands/start';
import stop from './cli/commands/stop';
import write from './cli/commands/write';
import upload from './cli/commands/upload';
import download from './cli/commands/download';
import log from './cli/commands/log';
import mib from './cli/commands/mib';
import flash from './cli/commands/flash';
import execute from './cli/commands/execute';
import parse from './cli/commands/parse';

// eslint-disable-next-line  @typescript-eslint/no-unused-vars
const { argv } = yargs
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
    choices: getMibsSync(),
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
  // .option('fw', {
  //   desc: 'использовать firmware_version для определения типа устройства',
  //   boolean: true,
  //   default: true,
  // })
  .option('timeout', {
    desc: 'таймаут в секундах',
    number: true,
    default: 1,
  })
  .command(start)
  .command(stop)
  .command(ping)
  .command(dump)
  .command(list)
  .command(read)
  .command(write)
  .command(upload)
  .command(download)
  .command(log)
  .command(mib)
  .command(flash)
  .command(execute)
  .command(parse)
  .locale('ru')
  .completion('completion')
  .showHelpOnFail(false)
  // .strict()
  .help()
  .wrap(Math.min(yargs.terminalWidth(), 100))
  .epilogue(`(c) Nata-Info, ${new Date().getFullYear()}`);
