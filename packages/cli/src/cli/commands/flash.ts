/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-bitwise */
import { Arguments, CommandModule } from 'yargs';
import { crc16ccitt } from 'crc';
import fs from 'fs';
import _ from 'lodash';
import Progress from 'progress';
import xmlParser from 'fast-xml-parser';
import path from 'path';

import { IDevice } from '@nibus/core/lib/mib';
import makeAddressHandler from '../handlers';
import { CommonOpts, MacOptions } from '../options';
import { action as writeAction } from './write';

// const domain = 'RFLASH';
const crcPrev = 0xAA55;

type Kind = 'rbf' | 'tca' | 'tcc' | 'ttc' | 'ctrl' | 'mcu' | 'fpga';
type Domains = 'RFLASH' | 'MCU' | 'FPGA';
type Routines = 'reloadHost' | 'updateHost' | 'reloadModule' | 'updateModule';
type KindOpts = {
  offset: number;
  begin?: number;
  size?: number[];
  converter: (buffer: Buffer, size?: number, delta?: number) => Buffer;
  exec?: Routines;
  domain: Domains;
  // kind?: 'rbf' | 'tca' | 'tcc',
};
type KindMeta = Record<Kind, KindOpts>;

const ident = (buf: Buffer): Buffer => buf;

type FlashOpts = MacOptions & {
  kind?: string;
  source: string;
  src?: string;
  execute?: string;
  // hex?: boolean,
  // dec?: boolean,
};

const createHeader = (kind: string, option: number, data: Buffer): Buffer => {
  const buffer = Buffer.alloc(20);
  buffer.write(kind.padEnd(4, '\0'));
  buffer.writeUInt32LE(data.length, 4);
  buffer.writeUInt32LE(Math.round(Date.now() / 1000), 8);
  buffer.writeUInt16LE(option, 16);
  buffer.writeUInt16LE(crc16ccitt(buffer.slice(0, 18), crcPrev), 18);
  return buffer;
};

const hexToBuf = (hex: string): Buffer => Buffer.from(hex.replace(/[\s:-=]/g, ''), 'hex');
const txtConvert: KindOpts['converter'] = (buffer, size = 32768, begin = 0): Buffer => {
  const lines = buffer.toString('ascii').split(/\r?\n/g);
  const result = Buffer.alloc(size, 0xFF);
  let offset = 0;
  lines.forEach(line => {
    if (line[0] === '@') {
      offset = parseInt(line.slice(1), 16) - begin;
    } else if (line !== 'q') {
      const buf = hexToBuf(line);
      // console.log(offset, buf);
      if (offset < 0) {
        offset += buf.length;
      } else {
        offset += buf.copy(result, offset);
      }
    }
  });
  return result;
};

const decConvert = (data: Buffer): Buffer => {
  const lines = data.toString().split(/\r?\n/g);
  const raw = _.flatten(lines
    .map(line => line.trim())
    .filter(line => !!line)
    .map(line => line.split(/\s+/g).map(b => {
      const i = parseInt(b, 10);
      if (Number.isNaN(i)) console.error('Invalid Number', b);
      return i;
    })));
  if (_.some(raw, b => Number.isNaN(b))) throw new Error('Invalid number');
  return Buffer.from(_.flatten(raw.map(word => [word & 0xFF, (word >> 8) & 0xFF])));
};

const xmlConvert = (data: Buffer): Buffer => {
  const xml = data.toString();
  const valid = xmlParser.validate(xml);
  if (valid !== true) {
    throw new Error(valid.err.msg);
  }
  const { Configuration = null } = xmlParser.parse(xml);
  if (!Configuration) throw new Error('Invalid xml config');
  const buffer = Buffer.alloc(140, 0);
  let offset = 0;
  ['RedLedMeasurement', 'GreenLedMeasurement', 'BlueLedMeasurement'].forEach(name => {
    const { Xy: { X, Y }, Yb }: { Xy: { X: number; Y: number }; Yb: number } = Configuration[name];
    offset = buffer.writeFloatLE(X, offset);
    offset = buffer.writeFloatLE(Y, offset);
    offset = buffer.writeFloatLE(Yb, offset);
  });
  ['RedLedTermCompFactors', 'GreenLedTermCompFactors', 'BlueLedTermCompFactors'].forEach(name => {
    const { A, B, C }: { A: number; B: number; C: number } = Configuration[name];
    offset = buffer.writeFloatLE(A, offset);
    offset = buffer.writeFloatLE(B, offset);
    offset = buffer.writeFloatLE(C, offset);
  });
  let last = offset;
  [
    'HostBrightSetting',
    'CalibrationBright',
    'RedVertexOfTriangle.X',
    'RedVertexOfTriangle.Y',
    'GreenVertexOfTriangle.X',
    'GreenVertexOfTriangle.Y',
    'BlueVertexOfTriangle.X',
    'BlueVertexOfTriangle.Y',
    'RedVertexXBase',
    'RedVertexYBase',
    'RedVertexStep',
    'GreenVertexXBase',
    'GreenVertexYBase',
    'GreenVertexStep',
    'BlueVertexXBase',
    'BlueVertexYBase',
    'BlueVertexStep',
  ].forEach(prop => {
    const value = _.get(Configuration, prop, 0);
    offset = buffer.writeFloatLE(value, offset);
    if (value > 0) last = offset;
  });
  console.assert(offset === 140, 'Invalid buffer size');
  return buffer.slice(0, last);
};

const meta: KindMeta = {
  rbf: {
    offset: 0x60000,
    size: [368011],
    converter: ident,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  fpga: {
    offset: 0,
    size: [368011],
    converter: ident,
    exec: 'reloadHost',
    domain: 'FPGA',
  },
  tca: {
    offset: 0xC0000,
    size: [1536, 2822],
    converter: decConvert,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  tcc: {
    offset: 0xC0000,
    size: [1536, 2822],
    converter: decConvert,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  ttc: {
    offset: 0xC0000,
    converter: xmlConvert,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  ctrl: {
    offset: 0xF0000,
    begin: 0x8000,
    size: [32768],
    converter: txtConvert,
    exec: 'updateModule',
    domain: 'RFLASH',
  },
  mcu: {
    offset: 0,
    begin: 0x4400,
    size: [65536],
    converter: txtConvert,
    exec: 'updateHost',
    domain: 'MCU',
  },
};

async function action(device: IDevice, args: Arguments<FlashOpts>): Promise<void> {
  const isModule = (await writeAction(device, args)).includes('moduleSelect');
  let kind: Kind = args.kind as Kind;
  if (!kind) {
    switch (path.extname(args.source)) {
      case '.rbf':
        kind = isModule ? 'rbf' : 'fpga';
        break;
      case '.tcc':
        kind = 'tcc';
        break;
      case '.tca':
        kind = 'tca';
        break;
      case '.xml':
        kind = 'ttc';
        break;
      case '.txt':
        kind = isModule ? 'ctrl' : 'mcu';
        break;
      default:
        throw new Error('Unknown kind of source');
    }
  }
  if (!isModule && kind !== 'mcu' && kind !== 'fpga') {
    throw new Error('Conflict kind of source and destination');
  }
  const opts = meta[kind];
  process.env.NODE_NO_WARNINGS = '1';
  let buffer = opts.converter(
    await fs.promises.readFile(args.source),
    opts.size && opts.size[0],
    opts.begin,
  );
  if (opts.size && !opts.size.includes(buffer.length)) {
    throw new Error(`Invalid data length. Expected ${opts.size.join(',')} got ${buffer.length}`);
  }
  if (kind !== 'ctrl' && kind !== 'mcu') {
    const header = createHeader(kind, 0, buffer);
    buffer = Buffer.concat([header, buffer, header]);
  } else {
    const crc = Buffer.alloc(2);
    crc.writeUInt16LE(crc16ccitt(buffer, 0x55AA), 0);
    buffer = Buffer.concat([buffer, crc]);
  }
  const dest = opts.offset.toString(16).padStart(5, '0');
  const bar = new Progress(
    `  flashing [:bar] to ${dest}h :rate/bps :percent :current/:total :etas`,
    {
      total: buffer.length,
      width: 30,
    },
  );
  device.on('downloadData', ({ domain: downloadDomain, length }) => {
    if (opts.domain === downloadDomain) bar.tick(length);
  });

  await device.download(opts.domain, buffer, opts.offset);
  if (isModule) {
    device.selector = 0;
    await device.write(device.getId('selector'));
    const data = await device.upload('MODUL', 0, 6);
    // console.log('RESULT', data[3].toString(2), data);
    if (data[3] & 0b100) {
      console.error('Ошибка контрольной суммы в кадре');
    }
    if (data[3] & 0b1000) {
      console.error('Таймаут ожидания валидности страницы');
    }
    if (data[3] & 0b10000) {
      console.error('Ошибка в работе флеш памяти');
    }
  }
  if (opts.exec) {
    await device.execute(opts.exec);
  }
  // console.log('BUFFER', buffer.slice(0, 80).toString('hex'));
}

const flashCommand: CommandModule<CommonOpts, FlashOpts> = {
  command: 'flash',
  describe: 'прошивка минихоста3',
  builder: argv => argv
    .option('kind', {
      alias: 'k',
      choices: ['rbf', 'tca', 'tcc', 'ttc', 'ctrl', 'mcu', 'fpga'],
    })
    // .option('offset', {
    //   alias: 'ofs',
    //   default: 0,
    //   number: true,
    //   describe: 'смещение в домене',
    // })
    .option('source', {
      alias: 'src',
      string: true,
      describe: 'загрузить данные из файла',
    })
    // .option('execute', {
    //   alias: 'exec',
    //   string: true,
    //   describe: 'выполнить программу после записи',
    // })
    // .option('hex', {
    //   boolean: true,
    //   describe: 'использовать шестнадцатиричный формат',
    // })
    // .option('dec', {
    //   boolean: true,
    //   describe: 'использовать десятичный двубайтный формат',
    // })
    // .conflicts('hex', 'dec')
    .example(
      '$0 flash -m ::1 moduleSelect=0 --src Alpha_Ctrl_SPI_Module_C10_320_104.rbf',
      'Прошивка ПЛИС модуля 0:0 (если расширение .rbf, [-k rbf] - можно не указывать) ',
    )
    .example(
      '$0 flash -m ::1 moduleSelect=0 --src data.tcc',
      `Прошивка таблицы цветокоррекции v1 для модуля
\t(если расширение .tcc, [-k tcc] - можно не указывать)`,
    )
    .example(
      '$0 flash -m ::1 moduleSelect=0 --src config.xml',
      `Прошивка таблицы цветокоррекции v2 для модуля
\t(если расширение .xml, [-k ttc] - можно не указывать)`,
    )
    .example(
      '$0 flash -m ::1 moduleSelect=0 --src Slim_Ctrl_v5_Mcu_v1.2.txt',
      `Прошивка процессора модуля
\t(если расширение .txt, [-k ctrl] - можно не указывать)`,
    )
    .example(
      '$0 flash -m ::1 --src NataInfo_4.0.1.1.txt',
      `Прошивка процессора хоста
\t(если расширение .txt, [-k ctrl] - можно не указывать)`,
    )
    .demandOption(['mac', 'source']),
  handler: makeAddressHandler(action),
};

export default flashCommand;
