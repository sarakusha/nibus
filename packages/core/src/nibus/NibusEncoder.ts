/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Transform, TransformCallback, TransformOptions } from 'stream';
import { Datagram } from '../common';
// import debugFactory from '../debug';

// const debug = debugFactory('nibus:encoder');

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
    chunks.forEach((datagram: Datagram) => {
      // debug('datagram send', JSON.stringify(datagram.toJSON()));
      // debugSerial(printBuffer(datagram.raw));
      this.push(datagram.raw);
    });
    callback();
  }
}
