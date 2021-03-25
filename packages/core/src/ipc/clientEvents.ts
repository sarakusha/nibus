/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import * as t from 'io-ts';
import { LogLevelV } from '../common';

export const ClientMessagesV = t.keyof({
  setLogLevel: null,
  reloadDevices: null,
  config: null,
  ping: null,
});

export type ClientMessages = t.TypeOf<typeof ClientMessagesV>;

const argsType0 = <M extends ClientMessages>(name: M): t.TupleC<[t.LiteralC<M>]> =>
  t.tuple([t.literal(name)]);
const argsType1 = <M extends ClientMessages, A extends t.Mixed>(
  name: M,
  a: A
): t.TupleC<[t.LiteralC<M>, A]> => t.tuple([t.literal(name), a]);

export const SetLogLevelArgsV = argsType1('setLogLevel', LogLevelV);

export interface SetLogLevelArgs extends t.TypeOf<typeof SetLogLevelArgsV> {}

export const ReloadDevicesArgsV = argsType0('reloadDevices');

export interface ReloadDevicesArgs extends t.TypeOf<typeof ReloadDevicesArgsV> {}

export const ConfigArgsV = argsType1('config', t.UnknownRecord);

export interface ConfigArgs extends t.TypeOf<typeof ConfigArgsV> {}

export const PingArgsV = argsType0('ping');

export interface PingArgs extends t.TypeOf<typeof PingArgsV> {}

export const ClientEventsArgsV = t.union([
  SetLogLevelArgsV,
  ReloadDevicesArgsV,
  ConfigArgsV,
  PingArgsV,
]);
export type ClientEventsArgs = SetLogLevelArgs | ReloadDevicesArgs | ConfigArgs | PingArgs;

// function test(...args: SetLogLevelArgs) {
//   const [event, ...vars] = args;
// }
//
// test('setLogLevel1', 'none1');
