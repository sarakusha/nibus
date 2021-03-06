/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Arrayable = any[] | Buffer | string;

export function chunkArray<T extends Arrayable>(array: T, len: number): T[] {
  const ret: T[] = [];
  const size = Math.ceil(array.length / len);
  ret.length = size;
  let offset;

  for (let i = 0; i < size; i += 1) {
    offset = i * len;
    ret[i] = array.slice(offset, offset + len) as T;
  }

  return ret;
}

export function printBuffer(buffer: Buffer): string {
  return chunkArray(chunkArray(buffer.toString('hex'), 2), 16)
    .map(chunk => chunk.join('-'))
    .join('=');
}

// function make_chunks(array: any[], size: number): any[][] {
//   if (size <= 0) throw new Error('Invalid chunk size');
//   const result = [];
//   for (let i = 0; i < array.length; i += size) {
//     result.push(array.slice(i, i + size));
//   }
//   return result;
// }
