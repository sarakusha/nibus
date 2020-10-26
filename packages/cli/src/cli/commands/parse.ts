/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NibusDatagram, NibusDecoder } from '@nibus/core';
// import { printBuffer } from '@nibus/core';
// import Configstore from 'configstore';
import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';

// const { Writable } = require('stream');
import { CommandModule } from 'yargs';
import { CommonOpts } from '../options';

/*
const pkgName = '@nata/nibus.js'; // = require('../../package.json');
const conf = new Configstore(
  pkgName,
  {
    logLevel: 'none',
    omit: ['priority'],
  },
);
*/

const hexTransform = new Transform({
  transform(
    chunk: any,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    const data = chunk.toString().replace(/-/g, '').replace(/\n/g, '');
    const buffer = Buffer.from(data, 'hex');
    callback(null, buffer);
  },
});

const makeNibusDecoder = (pick?: string[], omit?: string[]): NibusDecoder => {
  const decoder = new NibusDecoder();
  decoder.on('data', (datagram: NibusDatagram) => {
    console.info(
      datagram.toString({
        pick,
        omit,
      })
    );
  });
  return decoder;
};

type ParseOptions = CommonOpts & {
  pick?: string[];
  omit?: string[];
  // level: string,
  input: string;
  hex?: boolean;
};

const parseCommand: CommandModule<CommonOpts, ParseOptions> = {
  command: 'parse',
  describe: 'Разбор пакетов',
  builder: argv =>
    argv
      // .option('level', {
      //   alias: 'l',
      //   desc: 'уровень',
      //   choices: ['hex', 'nibus'],
      //   default: 'nibus',
      //   required: true,
      // })
      .option('pick', {
        desc: 'выдавать указанные поля в логах nibus',
        string: true,
        array: true,
      })
      .option('omit', {
        desc: 'выдавть поля кроме указанных в логах nibus',
        string: true,
        array: true,
      })
      .option('input', {
        alias: 'i',
        string: true,
        desc: 'входной файл с данными',
        required: true,
      })
      .option('hex', {
        boolean: true,
        desc: 'входной файл в формате hex',
      }),
  handler: ({ _level, pick, omit, input, hex }) =>
    new Promise<void>((resolve, reject) => {
      const inputPath = path.resolve(process.cwd(), input);
      // console.log('PARSE', inputPath);
      if (!fs.existsSync(inputPath)) {
        reject(Error(`File ${inputPath} not found`));
        return;
      }
      const stream = fs.createReadStream(inputPath);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      // if (level === 'nibus') {
      const decoder = makeNibusDecoder(pick, omit);
      if (hex) {
        stream.pipe(hexTransform).pipe(decoder);
      } else {
        stream.pipe(decoder);
      }
      // } else {
      //   const logger = new Writable({
      //     write: (chunk: any, encoding: string, callback: Function) => {
      //       console.log('write');
      //       console.info(printBuffer(chunk as Buffer));
      //       callback();
      //     },
      //   });
      //   stream.pipe(logger);
      // }
      // console.log('END');
    }),
};

export default parseCommand;
