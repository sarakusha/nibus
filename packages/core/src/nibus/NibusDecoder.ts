/* eslint-disable no-underscore-dangle */
/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { crc16ccitt } from 'crc';
import { Transform, TransformCallback, TransformOptions } from 'stream';
import { MAX_DATA_LENGTH, Offsets, PREAMBLE, SERVICE_INFO_LENGTH } from '../nbconst';
import { NmsDatagram } from '../nms';
import { SarpDatagram } from '../sarp';
import { END, SlipDatagram, trySlipDecode } from '../slip';
import NibusDatagram from './NibusDatagram';
// import { printBuffer } from '../common';
// import debugFactory from '../debug';

// const debug = debugFactory('nibus:decoder');
// const debugSerial = debugFactory('nibus-serial:decoder');

const crcNibus = (buf: Buffer): boolean => crc16ccitt(buf, 0) === 0;

const empty = Buffer.alloc(0);

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
    if (this.slipMode) {
      // Для SLIP актуален только последний ответ. Ищем один раз начиная с конца
      const pos = data.lastIndexOf(END);
      if (pos !== -1) {
        const raw = data.slice(pos);
        const slip = trySlipDecode(raw);
        if (slip) {
          this.push(new SlipDatagram(Buffer.from(raw), slip));
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
        const datagram = frame.slice(0, total);
        if (crcNibus(datagram.slice(1))) {
          if (NmsDatagram.isNmsFrame(datagram)) {
            this.push(new NmsDatagram(datagram));
          } else if (SarpDatagram.isSarpFrame(datagram)) {
            this.push(new SarpDatagram(datagram));
          } else {
            this.push(new NibusDatagram(datagram));
          }
          offset = start + total;
        }
      }
      if (offset <= start) {
        offset = start + 1;
      }
    }
  }
}
