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
import debugFactory from 'debug';
import { printBuffer, toMessage } from '../common';
import Address from '../Address';
import { NMS_MAX_DATA_LENGTH, Offsets, PREAMBLE } from '../nbconst';
import NibusDatagram, {
  INibusCommon,
  INibusDatagramJSON,
  INibusOptions,
  Protocol,
} from '../nibus/NibusDatagram';
import { decodeValue, getSizeOf } from './nms';
import NmsServiceType from './NmsServiceType';
import NmsValueType from './NmsValueType';

const debug = debugFactory('nibus:nms');

export interface INmsOptions extends INibusCommon {
  id: number;
  service: NmsServiceType;
  nms?: Buffer;
  isResponse?: boolean;
  notReply?: boolean;
  status?: number;
  timeout?: number;
}

const emptyBuffer = Buffer.alloc(0);

export interface INmsDatagramJSON extends INibusDatagramJSON {
  protocol: string;
  data?: never;
  id: number;
  service: string;
  nms?: Buffer;
  isResponse?: boolean;
  notReply?: boolean;
  value?: string;
  valueType?: string;
  status?: number;
}

export default class NmsDatagram extends NibusDatagram implements INmsOptions {
  public static isNmsFrame(frame: Buffer): boolean {
    return (
      frame[0] === PREAMBLE &&
      frame.length > 15 &&
      frame[Offsets.PROTOCOL] === 1 &&
      frame[Offsets.LENGTH] > 3
    );
  }

  public readonly protocol: Protocol.NMS;

  public readonly isResponse: boolean;

  public readonly notReply: boolean;

  public readonly service: NmsServiceType;

  public readonly id: number;

  public readonly nms: Buffer;

  public readonly timeout?: number;

  constructor(frameOrOptions: Buffer | INmsOptions) {
    if (Buffer.isBuffer(frameOrOptions)) {
      super(frameOrOptions);
    } else {
      const options = {
        source: new Address('auto'),
        isResponse: false,
        notReply: false,
        nms: emptyBuffer,
        ...frameOrOptions,
      };
      console.assert(options.nms.length <= NMS_MAX_DATA_LENGTH);
      // fix: NMS batch read
      const nmsLength = options.service !== NmsServiceType.Read ? options.nms.length & 0x3f : 0;
      const nibusData = [
        ((options.service & 0x1f) << 3) | (options.isResponse ? 4 : 0) | ((options.id >> 8) & 3),
        options.id & 0xff,
        (options.notReply ? 0x80 : 0) | nmsLength,
        ...options.nms,
      ];
      const nibusOptions: INibusOptions = {
        data: Buffer.from(nibusData),
        protocol: Protocol.NMS,
        ...options,
      };
      super(nibusOptions);
      if (frameOrOptions.timeout !== undefined) {
        this.timeout = frameOrOptions.timeout;
      }
    }
    this.protocol = Protocol.NMS;
    const { data } = this;
    this.id = ((data[0] & 3) << 8) | data[1];
    this.service = data[0] >> 3;
    this.isResponse = !!(data[0] & 4);
    this.notReply = !!(data[2] & 0x80);
    // fix: NMS batch read
    const nmsLength = this.service !== NmsServiceType.Read ? data[2] & 0x3f : data.length - 3;
    this.nms = this.data.slice(3, 3 + nmsLength);
  }

  get valueType(): number | undefined {
    const { nms, service } = this;
    switch (service) {
      case NmsServiceType.Read:
        if (nms.length > 2) {
          return this.nms[1];
        }
        break;
      case NmsServiceType.InformationReport:
        return this.nms[0];
      case NmsServiceType.UploadSegment:
        return NmsValueType.UInt32;
      case NmsServiceType.RequestDomainUpload:
        return NmsValueType.UInt32;
      case NmsServiceType.RequestDomainDownload:
        return NmsValueType.UInt32;
      default:
        break;
    }
    return undefined;
  }

  get status(): number | undefined {
    if (this.nms.length === 0 || !this.isResponse) {
      return undefined;
    }
    return this.nms.readInt8(0);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get value(): any {
    const { valueType, nms, service, isResponse, status } = this;
    if (valueType === undefined || (isResponse && status !== 0)) {
      return undefined;
    }
    const { length } = nms;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeDecode = (index: number, type = valueType): any => {
      try {
        return length < index + getSizeOf(type) ? undefined : decodeValue(type, nms, index);
      } catch (e) {
        // const v = nms.slice(index);
        debug(`${toMessage(e)}, id: ${this.id}, buffer: ${printBuffer(this.raw)}`);
        return 0;
      }
    };
    switch (service) {
      case NmsServiceType.Read:
        return safeDecode(2);
      case NmsServiceType.InformationReport:
        return safeDecode(1);
      case NmsServiceType.RequestDomainUpload:
        return safeDecode(1);
      case NmsServiceType.UploadSegment:
        return {
          data: nms.slice(5),
          offset: safeDecode(1),
        };
      case NmsServiceType.RequestDomainDownload:
        return safeDecode(1);
      default:
        return undefined;
    }
  }

  public isResponseFor(req: NmsDatagram): boolean {
    const { isResponse, service, destination } = this;
    return isResponse && service === req.service && destination.equals(req.source);
    // && (source.equals(req.destination) || (id === req.id && req.destination.isEmpty));
  }

  public toJSON(): INmsDatagramJSON {
    const { data: _, ...props } = super.toJSON();
    const result: INmsDatagramJSON = {
      ...props,
      id: this.id,
      service: NmsServiceType[this.service],
      data: undefined,
    };
    if (this.isResponse || this.service === NmsServiceType.InformationReport) {
      if (this.valueType !== undefined) {
        // result.value = JSON.stringify(this.value);
        result.value = this.value;
        result.valueType = NmsValueType[this.valueType];
      }
      result.status = this.status;
    } else {
      result.notReply = this.notReply;
      result.nms = Buffer.from(this.nms);
    }
    return result;
  }
}
