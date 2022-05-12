/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-underscore-dangle */
import { crc16ccitt } from 'crc';
import { Transform, TransformCallback, TransformOptions } from 'stream';
import debugFactory from 'debug';

import { MAX_DATA_LENGTH, Offsets, PREAMBLE, SERVICE_INFO_LENGTH } from '../nbconst';
import { NmsDatagram } from '../nms';
import { SarpDatagram } from '../sarp';
import { END, SlipDatagram, trySlipDecode } from '../slip';
import NibusDatagram from './NibusDatagram';
import { printBuffer } from '../common';
import { config } from '../config';

const debug = debugFactory('nibus:decoder');

const crcNibus = (buf: Buffer): boolean => crc16ccitt(buf, 0) === 0;

const empty = Buffer.alloc(0);

const createDatagram = (raw: Buffer): NibusDatagram | undefined => {
  if (crcNibus(raw.slice(1))) {
    if (NmsDatagram.isNmsFrame(raw)) return new NmsDatagram(raw);
    if (SarpDatagram.isSarpFrame(raw)) return new SarpDatagram(raw);

    return new NibusDatagram(raw);
  }
  return undefined;
};

export default class NibusDecoder extends Transform {
  private buf = empty;

  private slipMode = false;

  constructor(options?: TransformOptions) {
    super({
      ...options,
      readableObjectMode: true,
    });
  }

  setSlipMode(value: boolean): void {
    this.slipMode = value;
  }

  public _transform(chunk: unknown, _: BufferEncoding, callback: TransformCallback): void {
    if (Buffer.isBuffer(chunk)) {
      const data = Buffer.concat([this.buf, chunk]);
      if (data.length > 0) {
        this.buf = this.recognize(data);
      }
    }
    callback();
  }

  public _flush(callback: TransformCallback): void {
    this.buf = empty;
    callback();
  }

  private recognize(data: Buffer): Buffer {
    const logLevel = config().get('logLevel');
    if (logLevel === 'hex') {
      debug(printBuffer(data));
    }
    if (this.slipMode) {
      // Для SLIP актуален только последний ответ. Ищем один раз начиная с конца
      const pos = data.lastIndexOf(END);
      if (pos !== -1) {
        const raw = data.slice(pos);
        const slip = trySlipDecode(raw);
        if (slip) {
          const datagram = new SlipDatagram(Buffer.from(raw), slip);
          if (logLevel === 'nibus') debug(datagram.toString());
          this.push(datagram);
        } else {
          return raw;
        }
      }
      return empty;
    }
    for (let offset = 0; ; ) {
      const start = data.indexOf(PREAMBLE, offset);
      if (start === -1) return empty;
      const frame = data.slice(start);
      if (frame.length < Offsets.LENGTH + 1) return frame;
      const length = frame.readUInt8(Offsets.LENGTH);
      if (length - 1 <= MAX_DATA_LENGTH) {
        const total = length + SERVICE_INFO_LENGTH + 2 - 1;
        if (frame.length < total) return frame;
        const raw = frame.slice(0, total);
        const datagram = createDatagram(raw);
        if (datagram) {
          this.push(datagram);
          offset = start + total;
          if (logLevel === 'nibus') {
            debug(
              datagram.toString({
                pick: config().get('pick'),
                omit: config().get('omit'),
              })
            );
          }
        }
      }
      if (offset <= start) {
        offset = start + 1;
      }
    }
  }
}
