/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-bitwise,no-plusplus */
import { crc81wire } from 'crc';
import { Datagram, replaceBuffers } from '../common';

// eslint-disable-next-line no-shadow
export const enum BootloaderFunction {
  ECHO = 0,
  VERSION = 1,
  READ = 4,
  EXECUTE = 5,
  WRITE = 19,
}

export const FLASH_SIZE = 28 * 1024;

export const CHUNK_SIZE = 228;
export const END = 0xc0;
const ESC = 0xdb;
const ESC_END = 0xdc;
const ESC_ESC = 0xdd;
const CRC_PREV = 0xde;
const CRC_END = crc81wire(Buffer.from([END]), CRC_PREV);

/*
function crc8(b: number, crcInitial: number): number {
  const i = b ^ crcInitial;
  let crc = 0;
  if (i & 0x01) crc ^= 0x5e;
  if (i & 0x02) crc ^= 0xbc;
  if (i & 0x04) crc ^= 0x61;
  if (i & 0x08) crc ^= 0xc2;
  if (i & 0x10) crc ^= 0x9d;
  if (i & 0x20) crc ^= 0x23;
  if (i & 0x40) crc ^= 0x46;
  if (i & 0x80) crc ^= 0x8c;
  return crc;
}
*/

type EncodedChunk = [data: ReadonlyArray<number>, end: number];

export type LikeArray = Buffer | Uint8Array | ReadonlyArray<number>;
export const encode = (
  data: LikeArray,
  offset = 0,
  maxSize = Number.MAX_SAFE_INTEGER
): EncodedChunk => {
  const chunk: number[] = [];
  let pos = offset;
  while (chunk.length < maxSize && pos < data.length) {
    let val = data[pos++];
    if (val === END) {
      chunk.push(ESC);
      val = ESC_END;
    } else if (val === ESC) {
      chunk.push(ESC);
      val = ESC_ESC;
    }
    chunk.push(val);
  }
  return [chunk, pos];
};

const decode = (data: LikeArray): number[] => {
  if (data.length > 255) throw new Error('data too long');
  let escape = false;
  const result: number[] = [];
  for (let i = 0; i < data.length; i += 1) {
    let val = data[i];
    if (escape) {
      if (val === ESC_ESC) val = ESC;
      else if (val === ESC_END) val = END;
      escape = false;
    } else {
      if (val === ESC) {
        escape = true;
      }
      if (val === END) throw new Error('Invalid byte sequence');
    }
    if (!escape) result.push(val);
  }
  return result;
};

type SlipResponse = {
  fn: BootloaderFunction;
  errorCode?: number;
  arg?: number[];
};

export const trySlipDecode = (data: LikeArray): SlipResponse | undefined => {
  if (data.length < 4 || data.length > 255 || data[0] !== END) return undefined;
  try {
    const payload = decode(data.slice(1));
    const [crc] = payload.splice(-1, 1);
    if (crc81wire(Buffer.from([END, ...payload]), CRC_PREV) !== crc) return undefined;
    const [fn, length, ...rest] = payload;
    if (length !== rest.length) return undefined;
    const hasError = fn & 0x80;
    let errorCode = 0;
    if (hasError && length > 0) [errorCode] = rest.splice(0, 1);
    if (
      ![
        BootloaderFunction.ECHO,
        BootloaderFunction.VERSION,
        BootloaderFunction.READ,
        BootloaderFunction.EXECUTE,
        BootloaderFunction.WRITE,
      ].includes(fn & 0x7f)
    )
      return undefined;
    return {
      fn,
      errorCode: hasError ? errorCode : undefined,
      arg: rest.length > 0 ? rest : undefined,
    };
  } catch (e) {
    console.error('error while trying decode SLIP', e.message);
    return undefined;
  }
};

export const uint32ToBytes = (value: number): number[] => [
  value & 0xff,
  (value >>> 8) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 24) & 0xff,
];

type ChunkInfo = [chunk: Buffer, offset: number];

export function* slipChunks(
  fn: BootloaderFunction,
  data: LikeArray = []
): Generator<ChunkInfo, void, boolean | undefined> {
  let cancel: boolean | undefined = false;
  let offset = 0;
  const hasAddress = fn === BootloaderFunction.WRITE;
  do {
    const [, end] = encode(data, offset, CHUNK_SIZE);
    const length = end - offset + (hasAddress ? 4 : 0);
    const frame = [fn, length];
    hasAddress && frame.push(...uint32ToBytes(offset));
    frame.push(...data.slice(offset, end));
    const crc = crc81wire(Buffer.from(frame), CRC_END);
    const [encoded] = encode([...frame, crc]);
    if (fn !== BootloaderFunction.WRITE && end !== data.length) throw new Error('too long buffer');
    cancel = yield [Buffer.from([END, ...encoded]), offset];
    offset = end;
  } while (!cancel && offset < data.length);
}

export class SlipDatagram implements Datagram {
  readonly fn?: BootloaderFunction;

  readonly errorCode?: number;

  readonly arg?: number[];

  constructor(readonly raw: Buffer, resp?: SlipResponse) {
    if (resp) {
      this.fn = resp.fn;
      this.errorCode = resp.errorCode;
      this.arg = resp.arg;
    }
  }

  toJSON(): Partial<SlipResponse> {
    return { fn: this.fn, errorCode: this.errorCode, arg: this.arg };
  }

  toString(): string {
    const self = replaceBuffers(this.toJSON());
    return JSON.stringify(self);
  }
}
