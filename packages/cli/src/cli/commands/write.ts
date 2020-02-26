/*
 * @license
 * Copyright (c) 2020. Nata-Info
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

type WriteOpts = MacOptions;

type NameIdValue = [string, number, string];

export async function action(device: IDevice, args: Arguments<WriteOpts>): Promise<string[]> {
  const vars: NameIdValue[] = args._
    .slice(1)
    .map(arg => arg.split('=', 2))
    .filter(([name, value]) => name !== '' && value !== '')
    .map(([name, value]) => [device.getName(name), device.getId(name), value] as NameIdValue);
  vars.forEach(([name, , value]) => {
    device[name] = value;
  });
  if (vars.length === 0) {
    return [];
  }
  args.quiet || console.info(`Writing to ${Reflect.getMetadata('mib', device)} [${device.address}]`);
  return device.write(...vars.map(([, id]) => id)).then(ids => {
    const names = ids.map(id => device.getName(id));
    if (!args.quiet) {
      names.forEach(name => console.info(` - ${name} = ${JSON.stringify(device[name])}`));
    }
    return names;
  });
}

const writeCommand: CommandModule<CommonOpts, WriteOpts> = {
  command: 'write',
  describe: 'запись переменных в устройство',
  builder: argv => argv
    .demandOption(['mac'])
    .example(
      '$0 write -m ::ab:cd hofs=100 vofs=300 brightness=34',
      `записать в переменные: hofs<-100, vofs<-300, brightness<-34 на устройстве с адресом ::ab:cd
      mib указывать не обязательно, если у устройства есть firmware_version`,
    ),
  handler: makeAddressHandler(action, true),
};

export default writeCommand;
