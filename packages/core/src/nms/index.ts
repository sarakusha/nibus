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
import _ from 'lodash';
import { AddressParam } from '../Address';
import { NMS_MAX_DATA_LENGTH } from '../nbconst';
import config from '../nibus/config';
import { encodeValue, getNmsType, getSizeOf, writeValue } from './nms';
import NmsDatagram from './NmsDatagram';
import NmsServiceType from './NmsServiceType';
import NmsValueType from './NmsValueType';

export { NmsServiceType };
export { NmsValueType };
export { NmsDatagram };
export { getNmsType };

export function createNmsRead(destination: AddressParam, ...ids: number[]): NmsDatagram {
  if (ids.length > 21) {
    throw new Error('To many properties (21)');
  }
  const [id, ...rest] = ids;
  const nms = _.flatten(
    rest.map(next => [(NmsServiceType.Read << 3) | (next >> 8), next & 0xff, 0])
  );
  return new NmsDatagram({
    destination,
    id,
    notReply: false,
    nms: Buffer.from(nms),
    service: NmsServiceType.Read,
  });
}

export function createNmsWrite(
  destination: AddressParam,
  id: number,
  type: NmsValueType,
  value: unknown,
  notReply = false
): NmsDatagram {
  const nms = encodeValue(type, value);
  return new NmsDatagram({
    destination,
    id,
    notReply,
    nms,
    service: NmsServiceType.Write,
  });
}

export function createNmsInitiateUploadSequence(
  destination: AddressParam,
  id: number
): NmsDatagram {
  return new NmsDatagram({
    destination,
    id,
    service: NmsServiceType.InitiateUploadSequence,
  });
}

export function createNmsRequestDomainUpload(
  destination: AddressParam,
  domain: string
): NmsDatagram {
  if (domain.length !== 8) {
    throw new Error('domain must be string of 8 characters');
  }
  return new NmsDatagram({
    destination,
    id: 0,
    nms: Buffer.from(domain, 'ascii'),
    service: NmsServiceType.RequestDomainUpload,
  });
}

export function createNmsUploadSegment(
  destination: AddressParam,
  id: number,
  offset: number,
  length: number
): NmsDatagram {
  if (offset < 0) {
    throw new Error('Invalid offset');
  }
  if (length < 0 || length > 255) {
    throw new Error('Invalid length');
  }
  const nms = Buffer.alloc(5);
  nms.writeUInt32LE(offset, 0);
  nms.writeUInt8(length, 4);
  return new NmsDatagram({
    destination,
    id,
    nms,
    service: NmsServiceType.UploadSegment,
  });
}

export function createNmsRequestDomainDownload(
  destination: AddressParam,
  domain: string
): NmsDatagram {
  if (domain.length !== 8) {
    throw new Error('domain must be string of 8 characters');
  }
  return new NmsDatagram({
    destination,
    id: 0,
    nms: Buffer.from(domain, 'ascii'),
    service: NmsServiceType.RequestDomainDownload,
  });
}

export function createNmsInitiateDownloadSequence(
  destination: AddressParam,
  id: number
): NmsDatagram {
  return new NmsDatagram({
    destination,
    id,
    service: NmsServiceType.InitiateDownloadSequence,
    timeout: 5 * config.timeout,
  });
}

export function createNmsDownloadSegment(
  destination: AddressParam,
  id: number,
  offset: number,
  data: Buffer,
  notReply = false
): NmsDatagram {
  if (offset < 0) {
    throw new Error('Invalid offset');
  }
  const max = NMS_MAX_DATA_LENGTH - 4;
  if (data.length > max) {
    throw new Error(`Too big data. No more than ${max} bytes at a time`);
  }
  const ofs = Buffer.alloc(4, 0, 'binary');
  ofs.writeUInt32LE(offset, 0);

  return new NmsDatagram({
    destination,
    id,
    notReply,
    nms: Buffer.concat([ofs, data]),
    service: NmsServiceType.DownloadSegment,
  });
}

export function createNmsTerminateDownloadSequence(
  destination: AddressParam,
  id: number
): NmsDatagram {
  return new NmsDatagram({
    destination,
    id,
    service: NmsServiceType.TerminateDownloadSequence,
    timeout: config.timeout * 10,
  });
}

export function createNmsVerifyDomainChecksum(
  destination: AddressParam,
  id: number,
  offset: number,
  size: number,
  crc: number
): NmsDatagram {
  if (offset < 0) {
    throw new Error('Invalid offset');
  }
  if (size < 0) {
    throw new Error('Invalid size');
  }
  const nms = Buffer.alloc(10, 0, 'binary');
  nms.writeUInt32LE(offset, 0);
  nms.writeUInt32LE(size, 4);
  nms.writeUInt16LE(crc, 8);
  return new NmsDatagram({
    destination,
    id,
    nms,
    service: NmsServiceType.VerifyDomainChecksum,
    timeout: config.timeout * 10,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedValue = [NmsValueType, any];

export function createExecuteProgramInvocation(
  destination: AddressParam,
  id: number,
  notReply = false,
  ...args: TypedValue[]
): NmsDatagram {
  let nms = Buffer.alloc(0);
  if (args.length > 0) {
    const size = args.reduce((len, [type, value]) => len + getSizeOf(type, value), 1);
    nms = Buffer.alloc(size);
    let pos = nms.writeUInt8(args.length, 0);
    args.forEach(([type, value]) => {
      pos = writeValue(type, value, nms!, pos);
    });
  }
  return new NmsDatagram({
    destination,
    id,
    nms,
    notReply,
    service: NmsServiceType.ExecuteProgramInvocation,
    timeout: config.timeout * 3,
  });
}
