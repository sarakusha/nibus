/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-bitwise */
import { crc16ccitt } from 'crc';
import fs from 'fs';
import { parse } from 'intel-hex';
import _ from 'lodash';
import { XMLParser } from 'fast-xml-parser';
import path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import { delay, toError, toMessage } from '../common';

import { IDevice, DownloadDataListener } from '../mib';
import { getDefaultSession } from '../session';
// import session from '../session';
import { BootloaderFunction, CHUNK_SIZE, encode, FLASH_SIZE, uint32ToBytes } from '../slip';

const crcPrev = 0xaa55;

export const FlashKinds = ['fpga', 'mcu', 'rbf', 'ttc', 'ctrl', 'tca', 'tcc'] as const;
export type Kind = typeof FlashKinds[number];
type Domains = 'RFLASH' | 'MCU' | 'FPGA';
type Routines = 'reloadHost' | 'updateHost' | 'reloadModule' | 'updateModule';
type KindOpts = {
  offset: number;
  begin?: number;
  size?: number[];
  converter: (buffer: Buffer, size?: number, delta?: number) => Buffer;
  exec?: Routines;
  domain: Domains;
};
type KindMeta = Record<Kind, KindOpts>;
export type Ext = 'rbf' | 'tcc' | 'tca' | 'xml' | 'hex' | 'txt';

export const KindMap: Record<Kind, readonly [ext: Ext, isModule: boolean, legacy: boolean]> = {
  fpga: ['rbf', false, false],
  mcu: ['hex', false, false],
  rbf: ['rbf', true, false],
  ctrl: ['txt', true, false],
  ttc: ['xml', true, false],
  tcc: ['tcc', true, true],
  tca: ['tca', true, true],
} as const;

const ident = (buf: Buffer): Buffer => buf;

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
  const result = Buffer.alloc(size, 0xff);
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
  const raw = _.flatten(
    lines
      .map(line => line.trim())
      .filter(line => !!line)
      .map(line =>
        line.split(/\s+/g).map(b => {
          const i = parseInt(b, 10);
          if (Number.isNaN(i)) console.error('Invalid Number', b);
          return i;
        })
      )
  );
  if (_.some(raw, b => Number.isNaN(b))) throw new Error('Invalid number');
  return Buffer.from(_.flatten(raw.map(word => [word & 0xff, (word >> 8) & 0xff])));
};

const xmlParser = new XMLParser();

const xmlConvert = (data: Buffer): Buffer => {
  const xml = data.toString();
  const { Configuration = null } = xmlParser.parse(xml, true);
  if (!Configuration) throw new Error('Invalid xml config');
  const buffer = Buffer.alloc(140, 0);
  let offset = 0;
  ['RedLedMeasurement', 'GreenLedMeasurement', 'BlueLedMeasurement'].forEach(name => {
    const {
      Xy: { X, Y },
      Yb,
    }: { Xy: { X: number; Y: number }; Yb: number } = Configuration[name];
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
    offset: 0xc0000,
    size: [1536, 2822],
    converter: decConvert,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  tcc: {
    offset: 0xc0000,
    size: [1536, 2822],
    converter: decConvert,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  ttc: {
    offset: 0xc0000,
    converter: xmlConvert,
    exec: 'reloadModule',
    domain: 'RFLASH',
  },
  ctrl: {
    offset: 0xf0000,
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

const parseModuleSelect = (value?: number): string =>
  value !== undefined ? `(${value >>> 8}, ${value & 0xff})` : 'Unknown';

type Listener<T> = (arg: T) => void;
export type FlasherStart = {
  /**
   * buffer length
   */
  total: number;
  /**
   * destination address
   */
  offset: number;
};

const echo = 'TestString';

export type FlasherModule = {
  moduleSelect: number;
  x: number;
  y: number;
  msg?: string;
};

export type FlasherStartListener = Listener<FlasherStart>;
export type FlasherModuleListener = Listener<FlasherModule>;
export type FlasherFinishListener = Listener<void>;

export interface FlasherEvents {
  error: (e: Error) => void;
  start: FlasherStartListener;
  tick: Listener<{ length?: number; offset?: number }>;
  module: FlasherModuleListener;
  finish: FlasherFinishListener;
}

// export type ModuleSelect = { x: number; y: number };
// export declare interface Flasher {
//   on<U extends keyof FlasherEvents>(event: U, listener: FlasherEvents[U]): this;
//   once<U extends keyof FlasherEvents>(event: U, listener: FlasherEvents[U]): this;
//   off<U extends keyof FlasherEvents>(event: U, listener: FlasherEvents[U]): this;
//   emit<U extends keyof FlasherEvents>(event: U, ...args: Parameters<FlasherEvents[U]>): boolean;
// }

export class Flasher extends TypedEmitter<FlasherEvents> {
  readonly device: IDevice;

  constructor(deviceId: string) {
    super();
    const device = getDefaultSession()
      .devices.get()
      .find(({ id }) => deviceId === id);
    if (!device) throw new Error(`Unknown device ${deviceId}`);
    this.device = device;
  }

  flashAtmega(hexSource: string): { total: number; offset: number } {
    const buffer = fs.readFileSync(hexSource);
    let { data } = parse(buffer, FLASH_SIZE);
    if (data.length < FLASH_SIZE) {
      const tmp = Buffer.alloc(FLASH_SIZE);
      data.copy(tmp);
      tmp.fill(0xff, data.length);
      data = tmp;
    }
    const crc = crc16ccitt(data.slice(0, FLASH_SIZE - 2), 0);
    data.writeUInt16LE(crc, FLASH_SIZE - 2);
    const descSize = data.readUInt16LE(0x54);
    const [processor, firmware] = data
      .slice(0x56, 0x56 + descSize)
      .toString()
      .split('\0');
    if (processor !== 'ATMEGA32A') {
      throw new Error(`Firmware: invalid processor type`);
    }
    if (firmware !== 'NataHostV3') {
      throw new Error(`Firmware: invalid firmware description`);
    }
    const { connection } = this.device;
    if (!connection) throw new Error('device not connected');
    const onChunk = (offset: number): void => {
      this.emit('tick', { offset });
    };
    connection
      .slipStart(this.device.address.isEmpty)
      .then(async isStarted => {
        if (!isStarted) {
          return this.emit('error', new Error("This device doesn't support bootloader"));
        }
        try {
          this.emit('start', { total: data.length, offset: 0 });
          const echoResp = await connection.execBootloader(
            BootloaderFunction.ECHO,
            Buffer.from(echo)
          );
          if (!echoResp.arg || Buffer.from(echoResp.arg).toString() !== echo) {
            return this.emit('error', new Error('Echo test failed'));
          }
          const version = await connection.execBootloader(BootloaderFunction.VERSION);
          if (!version?.arg || Buffer.from(version.arg).toString() !== 'Atmega32\0') {
            return this.emit('error', new Error('Invalid version'));
          }
          connection.on('chunk', onChunk);
          await connection.execBootloader(BootloaderFunction.WRITE, data);
          connection.off('chunk', onChunk);
          for (let offset = 0, end = 0; offset < data.length; offset = end) {
            [, end] = encode(data, offset, CHUNK_SIZE);
            // eslint-disable-next-line no-await-in-loop
            const chunk = await connection.execBootloader(BootloaderFunction.READ, [
              ...uint32ToBytes(offset),
              end - offset,
            ]);
            if (!chunk?.arg || Buffer.from(chunk.arg).compare(data.slice(offset, end)) !== 0) {
              return this.emit('error', new Error('Write verification error'));
            }
            this.emit('tick', { offset });
          }
          await delay(100);
          await connection.execBootloader(BootloaderFunction.EXECUTE, [0]);
          return this.emit('finish');
        } catch (e) {
          const err = toError(e);
          console.error(err.message);
          return this.emit('error', err);
        }
      })
      .finally(() => {
        connection.slipFinish();
        connection.off('chunk', onChunk);
      });
    console.assert(data.length === FLASH_SIZE, 'Invalid data length');
    return {
      total: data.length,
      offset: 0,
    };
  }

  async resetModule(moduleSelect: number): Promise<void> {
    const { device } = this;
    device.selector = 0;
    device.moduleSelect = moduleSelect;
    await device.drain();
    await this.device.execute('reloadModule');
  }

  flash(kind: Kind, source: string, moduleSelect?: number): { total: number; offset: number };

  flash(source: string, moduleSelect?: number): { total: number; offset: number };

  flash(arg1: unknown, arg2: unknown, arg3?: unknown): { total: number; offset: number } {
    let kind: Kind | undefined;
    let source: string;
    let moduleSelect: number | undefined;
    if (typeof arg1 === 'string' && FlashKinds.includes(arg1 as Kind)) {
      kind = arg1 as Kind;
      source = arg2 as string;
      if (typeof arg3 === 'number') moduleSelect = arg3;
    } else {
      source = arg1 as string;
      if (typeof arg2 === 'number') moduleSelect = arg2;
    }
    if (kind === 'mcu' && moduleSelect === undefined) {
      return this.flashAtmega(source);
    }
    if (moduleSelect !== undefined) {
      const x = moduleSelect >>> 8;
      const y = moduleSelect && 0xff;
      if (x < 0 || (x >= 24 && x !== 0xff) || y < 0 || y > 255)
        throw new TypeError('Invalid moduleSelect');
    }
    if (kind === undefined) {
      switch (path.extname(source).toLowerCase()) {
        case '.rbf':
          kind = moduleSelect ? 'rbf' : 'fpga';
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
          kind = moduleSelect ? 'ctrl' : 'mcu';
          break;
        default:
          throw new Error('Unknown kind of source');
      }
    }
    if (moduleSelect === undefined && kind !== 'mcu' && kind !== 'fpga') {
      throw new TypeError('Conflict kind of source and destination');
    }
    const opts = meta[kind];
    let buffer = opts.converter(fs.readFileSync(source), opts.size?.[0], opts.begin);
    if (opts.size && !opts.size.includes(buffer.length)) {
      throw new Error(`Invalid data length. Expected ${opts.size.join(',')} got ${buffer.length}`);
    }
    if (kind !== 'ctrl' && kind !== 'mcu') {
      const header = createHeader(kind, 0, buffer);
      buffer = Buffer.concat([header, buffer, header]);
    } else {
      const crc = Buffer.alloc(2);
      crc.writeUInt16LE(crc16ccitt(buffer, 0x55aa), 0);
      buffer = Buffer.concat([buffer, crc]);
    }
    const info: FlasherStart = { total: buffer.length, offset: opts.offset };
    this.emit('start', info);
    const action = async (): Promise<void> => {
      const { device } = this;
      const downloadListener: DownloadDataListener = ({ domain: downloadDomain, length }) => {
        if (opts.domain === downloadDomain) this.emit('tick', { length });
      };
      device.on('downloadData', downloadListener);
      try {
        await device.download(opts.domain, buffer, opts.offset);
      } finally {
        device.off('downloadData', downloadListener);
      }

      if (moduleSelect !== undefined) {
        device.selector = 0;
        device.moduleSelect = moduleSelect;
        await device.drain();
        const checkModul = async (): Promise<boolean> => {
          const { moduleSelect: current } = device;
          const xy = parseModuleSelect(current);
          const moduleOpts = { moduleSelect: current, x: current << 8, y: current & 0xff };
          try {
            const data = await device.upload('MODUL', 0, 6);
            // console.log('RESULT', data[3].toString(2), data);
            let msg: string | undefined;
            if (data[3] & 0b100) {
              msg = `Модуль ${xy}: Ошибка контрольной суммы в кадре`;
            }
            if (data[3] & 0b1000) {
              msg = `Модуль ${xy}: Таймаут ожидания валидности страницы`;
            }
            if (data[3] & 0b10000) {
              msg = `Модуль ${xy}: Ошибка в работе флэш памяти`;
            }
            this.emit('module', { ...moduleOpts, msg });
            return true;
          } catch (err) {
            this.emit('module', {
              ...moduleOpts,
              msg: `Ошибка проверки ${xy}: ${toMessage(err)}`,
            });
            return false;
          }
        };
        if (device.moduleSelect !== 0xffff) {
          await checkModul();
        } else {
          // const idModuleSelect = device.getId('moduleSelect');
          let y = 0;
          for (let x = 0; x < 24; x += 1) {
            for (y = 0; y < 256; y += 1) {
              try {
                device.moduleSelect = (x << 8) + y;
                // eslint-disable-next-line no-await-in-loop
                await device.drain();
                // eslint-disable-next-line no-await-in-loop
                const res = await checkModul();
                if (!res) break;
              } catch (err) {
                // console.error('Ошибка при проверке диапазона модулей', err.message ?? err);
                this.emit('module', {
                  moduleSelect: device.moduleSelect,
                  x,
                  y,
                  msg: toMessage(err),
                });
                break;
              }
            }
            if (y === 0) {
              const msg = `Столб ${x} не ответил`;
              // console.log(msg);
              this.emit('module', { moduleSelect: (x << 8) | 0xff, x, y: 0xff, msg });
            }
          }
          device.moduleSelect = 0xffff;
          await device.drain();
        }
      }
      if (opts.exec) {
        await device.execute(opts.exec);
      }
    };
    action().finally(() => {
      this.emit('finish');
    });
    return info;
  }
}
