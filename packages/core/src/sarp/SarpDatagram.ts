/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-bitwise */
import Address from '../Address';
import { Offsets } from '../nbconst';
import NibusDatagram, { INibusCommon, INibusOptions } from '../nibus/NibusDatagram';
import SarpQueryType from './SarpQueryType';

export interface ISarpOptions extends INibusCommon {
  isResponse?: boolean;
  queryType: SarpQueryType;
  queryParam: Buffer;
  mac?: Buffer;
}

export default class SarpDatagram extends NibusDatagram implements ISarpOptions {
  public static isSarpFrame(frame: Buffer): boolean {
    return (
      Buffer.isBuffer(frame) &&
      frame.length === Offsets.DATA + 12 + 2 &&
      frame[Offsets.PROTOCOL] === 2 &&
      frame[Offsets.LENGTH] === 13
    );
  }

  public readonly isResponse: boolean;

  public readonly queryType: SarpQueryType;

  public readonly queryParam: Buffer;

  public readonly mac: Buffer;

  constructor(frameOrOptions: ISarpOptions | Buffer) {
    if (Buffer.isBuffer(frameOrOptions)) {
      super(frameOrOptions);
    } else {
      const options = {
        isResponse: false,
        mac: Address.empty.raw,
        ...frameOrOptions,
      };
      if (options.queryParam.length !== 5) {
        throw new Error('Invalid query param');
      }
      if (options.mac.length !== 6) {
        throw new Error('Invalid mac param');
      }
      const nibusData = [
        (options.isResponse ? 0x80 : 0) | options.queryType,
        ...options.queryParam,
        ...options.mac,
      ];

      const nibusOptions: INibusOptions = {
        data: Buffer.from(nibusData),
        protocol: 2,
        ...options,
      };
      super(nibusOptions);
    }
    const { data } = this;
    console.assert(data.length === 12, 'Unexpected sarp length');
    this.isResponse = (data[0] & 0x80) !== 0;
    this.queryType = data[0] & 0x0f;
    this.queryParam = data.slice(1, 6);
    this.mac = data.slice(6);
    Object.freeze(this);
  }

  get deviceType(): number | undefined {
    return this.isResponse ? this.queryParam.readUInt16BE(3) : undefined;
  }
}
