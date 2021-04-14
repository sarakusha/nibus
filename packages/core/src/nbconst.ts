/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/** @internal */
// eslint-disable-next-line no-shadow
export enum States {
  PREAMBLE_WAITING = 0,
  HEADER_READING = 1,
  DATA_READING = 2,
}

/** @internal */
// eslint-disable-next-line no-shadow
export enum Offsets {
  DESTINATION = 1,
  SOURCE = 7,
  SERVICE = 13,
  LENGTH = 14,
  PROTOCOL = 15,
  DATA = 16,
}

/** @internal */
export const PREAMBLE = 0x7e;
/** @internal */
export const SERVICE_INFO_LENGTH = Offsets.DATA;
/** @internal */
export const MAX_DATA_LENGTH = 238;
/** @internal */
export const NMS_MAX_DATA_LENGTH = 63;
