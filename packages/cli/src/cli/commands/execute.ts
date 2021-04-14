/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Arguments, CommandModule } from 'yargs';

import { IDevice } from '@nibus/core';
import makeAddressHandler from '../handlers';
import { CommonOpts, MacOptions } from '../options';

type ExecuteOpts = MacOptions & {
  program: string;
};

type NameValue = [string, string];

async function action(device: IDevice, args: Arguments<ExecuteOpts>): Promise<void> {
  const vars: NameValue[] = args._.slice(1)
    .map(arg => String(arg).split('=', 2) as NameValue)
    .filter(([name, value]) => name !== '' && value !== '');

  const opts = vars.reduce((res, [name, value]) => {
    res[name] = value;
    return res;
  }, {} as Record<string, string>);

  await device.execute(args.program, opts);
}

const executeCommand: CommandModule<CommonOpts, ExecuteOpts> = {
  command: 'execute <program>',
  describe: 'выполнить подпрограмму',
  builder: argv =>
    argv
      .positional('program', {
        describe: 'название подпрограммы',
        type: 'string',
      })
      .example(
        '$0 execute signal duration=30 source=1 -m 45:33',
        'выполнить программу signal с параметрами duration и source'
      )
      .demandOption(['mac', 'program']),
  handler: makeAddressHandler(action, true),
};

export default executeCommand;
