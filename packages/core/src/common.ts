/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* tslint:disable:variable-name */
import * as t from 'io-ts';
import _ from 'lodash';
import { printBuffer } from './nibus/helper';

/**
 * Путь к сокету для обмена данными IPC
 */
export const PATH = '/tmp/nibus.service.sock';

export const LogLevelV = t.keyof({
  none: null,
  hex: null,
  nibus: null,
});

/** @internal */
const MibTypeV = t.array(
  t.intersection([t.type({ mib: t.string }), t.partial({ minVersion: t.number })])
);

/** @internal */
export const ConfigV = t.partial({
  logLevel: LogLevelV,
  omit: t.union([t.array(t.string), t.null]),
  pick: t.union([t.array(t.string), t.null]),
  mibs: t.array(t.string),
  mibTypes: t.record(t.string, MibTypeV),
});

// type MibType = t.TypeOf<typeof MibTypeV>;
/**
 * Конфигурация сервиса NiBUS
 */
export type Config = t.TypeOf<typeof ConfigV>;

export type Fields = string[] | undefined;
export type LogLevel = t.TypeOf<typeof LogLevelV>;
export type ObjectType = Record<string, unknown>;
export type ProtoType = ObjectType;
export const noop = (): void => {};

export interface Datagram {
  raw: Buffer;
  toJSON(): unknown;
  toString(): string;
}
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
// eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
export const replaceBuffers = (obj: any): any =>
  Object.entries(obj).reduce(
    (result, [name, value]) => ({
      ...result,
      [name]: Buffer.isBuffer(value)
        ? printBuffer(value)
        : _.isPlainObject(value)
        ? replaceBuffers(value)
        : value,
    }),
    {}
  );

export function promiseArray<T, R>(
  array: ReadonlyArray<T>,
  action: (item: T, index: number, arr: ReadonlyArray<T>) => Promise<R | R[]>
): Promise<R[]> {
  return array.reduce<Promise<R[]>>(
    (acc, item, index) =>
      acc.then(async items => {
        const result = await action(item, index, array);
        return Array.isArray(result) ? [...items, ...result] : [...items, result];
      }),
    Promise.resolve<R[]>([])
  );
}
