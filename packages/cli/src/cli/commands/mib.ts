/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import { CommandModule } from 'yargs';
import path from 'path';
import fs from 'fs';
import { convert } from '@nibus/core';
import { MibDeviceV } from '@nibus/mibs';
import { CommonOpts } from '../options';

type MibOpts = CommonOpts & {
  mibfile: string;
};
const mibCommand: CommandModule<CommonOpts, MibOpts> = {
  command: 'mib <mibfile>',
  describe: 'добавить mib-файл',
  builder: argv =>
    argv
      .positional('mibfile', {
        describe: 'путь к mib-файлу',
        type: 'string',
      })
      .demandOption('mibfile'),
  handler: async ({ mibfile }) => {
    const dest = path.join(require.resolve('@nibus/core'));
    const jsonPath = await convert(mibfile as string, dest);
    const validation = MibDeviceV.decode(fs.readFileSync(jsonPath));
    if (isLeft(validation)) {
      throw new Error(`Invalid mib file: ${mibfile}
      ${PathReporter.report(validation).join('\n')}`);
    }
  },
};

export default mibCommand;
