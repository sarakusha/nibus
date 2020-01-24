/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* tslint:disable:variable-name */
import * as t from 'io-ts';
// import { NibusBaudRate, NibusBaudRateV } from '../nibus';

export type HexOrNumber = string | number;
/** @internal */
export const CategoryV = t.union([
  t.keyof({
    siolynx: null,
    minihost: null,
    fancontrol: null,
    c22: null,
    relay: null,
    ftdi: null,
    sensor: null,
    // undefined: null,
  }),
  t.undefined,
]);
/**
 * Кутегория устройства
 * - siolynx
 * - minihost
 * - fancontrol
 * - c22
 * - relay
 * - ftdi
 * - sensor
 * - undefined
 */
export type Category = t.TypeOf<typeof CategoryV>;
/** @internal */
export const KnownPortV = t.intersection([
  t.type({
    path: t.string,
    productId: t.number,
    vendorId: t.number,
  }),
  t.partial({
    manufacturer: t.string,
    serialNumber: t.string,
    pnpId: t.string,
    locationId: t.string,
    deviceAddress: t.number,
    device: t.string,
    category: CategoryV,
  }),
]);

export interface IKnownPort extends t.TypeOf<typeof KnownPortV> {
}
