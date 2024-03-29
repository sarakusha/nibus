/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import Address from '../Address';
import SarpDatagram, { ISarpOptions } from './SarpDatagram';
import SarpQueryType from './SarpQueryType';

export { SarpQueryType };
export { SarpDatagram };
export type { ISarpOptions };

export function createSarp(
  queryType: SarpQueryType,
  queryParam: Buffer | Uint8Array | number[] = Buffer.alloc(5)
): SarpDatagram {
  const param: Buffer = Buffer.isBuffer(queryParam)
    ? queryParam
    : Array.isArray(queryParam)
    ? Buffer.from(queryParam as number[])
    : Buffer.from(queryParam.buffer);
  return new SarpDatagram({
    queryType,
    destination: Address.broadcast,
    queryParam: param,
  });
}
