/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import * as t from 'io-ts';

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
    novastar: null,
  }),
  t.undefined,
]);
/**
 * Категория устройства
 * - siolynx
 * - minihost
 * - fancontrol
 * - c22
 * - relay
 * - ftdi
 * - sensor
 * - novastar
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
    manufacturer: t.union([t.string, t.null]),
    serialNumber: t.union([t.string, t.null]),
    pnpId: t.union([t.string, t.null]),
    locationId: t.union([t.string, t.null]),
    deviceAddress: t.union([t.number, t.null]),
    device: t.union([t.string, t.null]),
    category: CategoryV,
  }),
]);

export interface IKnownPort extends t.TypeOf<typeof KnownPortV> {}
