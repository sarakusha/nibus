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
import { LogLevelV } from './events';

export const ClientMessagesV = t.keyof({
  setLogLevel: null,
  reloadDevices: null,
  config: null,
  ping: null,
  getBrightnessHistory: null,
});

export type ClientMessages = t.TypeOf<typeof ClientMessagesV>;

const argsType0 = <M extends ClientMessages>(name: M): t.TupleC<[t.LiteralC<M>]> =>
  t.tuple([t.literal(name)]);
const argsType1 = <M extends ClientMessages, A extends t.Mixed>(
  name: M,
  a: A
): t.TupleC<[t.LiteralC<M>, A]> => t.tuple([t.literal(name), a]);

export const SetLogLevelArgsV = argsType1('setLogLevel', LogLevelV);

export type SetLogLevelArgs = t.TypeOf<typeof SetLogLevelArgsV>

export const ReloadDevicesArgsV = argsType0('reloadDevices');

export type ReloadDevicesArgs = t.TypeOf<typeof ReloadDevicesArgsV>

export const ConfigArgsV = argsType1('config', t.UnknownRecord);

export type ConfigArgs = t.TypeOf<typeof ConfigArgsV>

export const PingArgsV = argsType0('ping');

export type PingArgs = t.TypeOf<typeof PingArgsV>

export const GetBrightnessHistoryV = argsType1('getBrightnessHistory', t.number);

export type GetBrightnessHistory = t.TypeOf<typeof GetBrightnessHistoryV>

export const ClientEventsArgsV = t.union([
  SetLogLevelArgsV,
  ReloadDevicesArgsV,
  ConfigArgsV,
  PingArgsV,
  GetBrightnessHistoryV,
]);
export type ClientEventsArgs =
  | SetLogLevelArgs
  | ReloadDevicesArgs
  | ConfigArgs
  | PingArgs
  | GetBrightnessHistory;

// function test(...args: SetLogLevelArgs) {
//   const [event, ...vars] = args;
// }
//
// test('setLogLevel1', 'none1');
