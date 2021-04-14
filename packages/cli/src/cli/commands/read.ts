/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Arguments, CommandModule, Defined } from 'yargs';

import { IDevice } from '@nibus/core';
import makeAddressHandler from '../handlers';
import { CommonOpts } from '../options';

type ReadOpts = Defined<CommonOpts, 'id' | 'mac'>;

export async function action(device: IDevice, args: Arguments<ReadOpts>): Promise<void> {
  const idOrName = args.id[0];
  if (idOrName) {
    const id = device.getId(idOrName);
    const value = Object.values(await device.read(id))[0];
    if (value.error) throw new Error(value.error);
    args.quiet || console.info(JSON.stringify(args.raw ? device.getRawValue(id) : value));
  }
}

const readCommand: CommandModule<CommonOpts, ReadOpts> = {
  command: 'read',
  describe: 'прочитать значение переменной',
  builder: argv =>
    argv.demandOption(['id', 'mac']).check(checkArgv => {
      if (Array.isArray(checkArgv.id) && checkArgv.id.length !== 1) {
        throw new Error('Только одна переменная id за раз');
      }
      return true;
    }),
  handler: makeAddressHandler(action, true),
};

export default readCommand;
