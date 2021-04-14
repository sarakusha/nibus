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

/**
 * Путь к сокету для обмена данными IPC
 */
// export const PATH = '/tmp/nibus.service.sock';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Arrayable = any[] | Buffer | string;

export function chunkArray<T extends Arrayable>(array: T, len: number): T[] {
  const ret: T[] = [];
  const size = Math.ceil(array.length / len);
  ret.length = size;
  let offset;

  for (let i = 0; i < size; i += 1) {
    offset = i * len;
    ret[i] = array.slice(offset, offset + len) as T;
  }

  return ret;
}

export function printBuffer(buffer: Buffer): string {
  return chunkArray(chunkArray(buffer.toString('hex'), 2), 16)
    .map(chunk => chunk.join('-'))
    .join('=');
}

type FilterFlags<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
};

type ExcludeFlags<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? never : Key;
};

type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];

type ExcludeNames<Base, Condition> = ExcludeFlags<Base, Condition>[keyof Base];

export type SubType<Base, Condition> = Pick<Base, AllowedNames<Base, Condition>>;

export type ReplaceType<Base, Condition, Type> = Pick<Base, ExcludeNames<Base, Condition>> &
  Record<AllowedNames<Base, Condition>, Type>;

// const x: ReplaceType<{ a: string | undefined, b: boolean | undefined }, string | undefined, number | undefined> = { a: 1, b: 1 }

// eslint-disable-next-line @typescript-eslint/ban-types
export const replaceBuffers = <T extends object>(obj: T): ReplaceType<T, Buffer, string> =>
  Object.entries(obj).reduce(
    (result, [name, value]) => ({
      ...result,
      [name]: Buffer.isBuffer(value)
        ? printBuffer(value)
        : _.isPlainObject(value)
        ? replaceBuffers(value as ObjectType)
        : value,
    }),
    {}
  ) as ReplaceType<T, Buffer, string>;

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

export function tuplify<T extends unknown[]>(...args: T): T {
  return args;
}

export const MSG_DELIMITER = '\n';
