/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Transform, TransformCallback, TransformOptions } from 'stream';
import debugFactory from 'debug';
import { printBuffer } from '../common';
import { config } from '../config';

import NibusDatagram from './NibusDatagram';

const debug = debugFactory('nibus:encoder');

export default class NibusEncoder extends Transform {
  constructor(options?: TransformOptions) {
    super({
      ...options,
      writableObjectMode: true,
    });
  }

  // eslint-disable-next-line
  public _transform(chunk: any, _encoding: string, callback: TransformCallback): void {
    const chunks = Array.isArray(chunk) ? chunk : [chunk];
    const logLevel = config().get('logLevel');
    chunks.forEach((datagram: NibusDatagram) => {
      if (logLevel === 'nibus') {
        debug(datagram.toString({
          pick: config().get('pick'),
          omit: config().get('omit'),
        }));
      } else if (logLevel === 'hex') {
        debug(printBuffer(datagram.raw));
      }
      this.push(datagram.raw);
    });
    callback();
  }
}
