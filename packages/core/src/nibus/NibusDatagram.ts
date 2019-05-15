/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import 'reflect-metadata';
import { crc16ccitt } from 'crc';
import _ from 'lodash';
import Address, { AddressParam } from '../Address';
import { MAX_DATA_LENGTH, Offsets, PREAMBLE } from '../nbconst';
import { printBuffer } from './helper';

// import {timeStamp} from '../utils';

export interface INibusCommon {
  destination: AddressParam;
  priority?: number;
  source?: AddressParam;
}

export enum Protocol {
  NMS = 1,
  SARP = 2,
}

export interface INibusOptions extends INibusCommon {
  protocol: Protocol;
  data: Buffer;
}

const leadZero = (value: number) => `0${value}`.slice(-2);

export interface INibusDatagramJSON {
  priority: number;
  protocol: string;
  destination: string;
  source: string;
  timeStamp: string;
  data?: Buffer;
}

// @timeStamp
export default class NibusDatagram implements INibusOptions {
  public static defaultSource: AddressParam = Address.empty;
  public readonly priority: number;
  public readonly protocol: number;
  public readonly destination: Address;
  public readonly source: Address;
  public readonly data: Buffer;

  // @noenum
  public readonly raw: Buffer;

  // @noenum
  // public readonly timeStamp: number;

  constructor(frameOrOptions: Buffer | INibusOptions) {
    if (Buffer.isBuffer(frameOrOptions)) {
      const frame: Buffer = Buffer.from(frameOrOptions);
      console.assert(
        Offsets.DATA < frame.length && frame.length < 256,
        'Invalid datagram',
      );
      this.raw = frame;
    } else {
      const options = {
        priority: 0,
        source: NibusDatagram.defaultSource,
        ...frameOrOptions,
      };
      // console.log('OPTIONS', options, frameOrOptions);
      console.assert(options.data.length <= MAX_DATA_LENGTH);
      const destination = Address.toAddress(options.destination)!;
      const source = Address.toAddress(options.source)!;
      const frame = [
        PREAMBLE,
        ...destination.raw,
        ...source.raw,
        0xC0 | (options.priority & 3) << 4 | (destination.rawType & 3) << 2 | (source.rawType & 3),
        options.data.length + 1,
        options.protocol,
        ...options.data,
      ];
      const crc = crc16ccitt(Buffer.from(frame.slice(1)), 0);
      frame.push(crc >> 8, crc & 255);
      this.raw = Buffer.from(frame);
    }
    const serviceByte = this.raw[Offsets.SERVICE];
    const destAddressType = (serviceByte >> 2) & 3;
    const srcAddressType = serviceByte & 3;

    this.priority = (serviceByte >> 4) & 3;
    this.protocol = this.raw[Offsets.PROTOCOL];
    this.destination = Address.read(destAddressType, this.raw, Offsets.DESTINATION);
    this.source = Address.read(srcAddressType, this.raw, Offsets.SOURCE);
    // Реальная длина данных на 1 меньше чем указано в LENGTH!
    this.data = this.raw.slice(Offsets.DATA, (Offsets.DATA + this.raw[Offsets.LENGTH]) - 1);
    Reflect.defineMetadata('timeStamp', Date.now(), this);
    process.nextTick(() => Object.freeze(this));
  }

  public toJSON(): INibusDatagramJSON {
    const ts = new Date(Reflect.getMetadata('timeStamp', this));
    return {
      priority: this.priority,
      protocol: Protocol[this.protocol],
      source: this.source.toString(),
      destination: this.destination.toString(),
      timeStamp: `${leadZero(ts.getHours())}:${leadZero(ts.getMinutes())}:\
${leadZero(ts.getSeconds())}.${ts.getMilliseconds()}`,
      data: Buffer.from(this.data),
    };
  }

  toString(opts?: { pick?: string[], omit?: string[] }) {
    let self: any = replaceBuffers(this.toJSON());
    if (opts) {
      if (opts.pick) {
        self = _.pick(self, opts.pick);
      }
      if (opts.omit) {
        self = _.omit(self, opts.omit);
      }
    }
    return JSON.stringify(self);
  }
}

const replaceBuffers = (obj: any) => {
  Object.entries(obj).forEach(([name, value]) => {
    if (Buffer.isBuffer(value)) {
      obj[name] = printBuffer(value);
    } else if (_.isPlainObject(value)) {
      obj[name] = replaceBuffers(value);
    }
  });
  return obj;
}