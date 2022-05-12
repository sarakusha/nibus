/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import isPlainObject from 'lodash/isPlainObject';

export type Fields = string[] | undefined;
export type ObjectType = Record<string, unknown>;
export type ProtoType = ObjectType;
export const noop = (): void => {};

export interface Datagram {
  raw: Buffer;
  toJSON(): unknown;
  toString(): string;
}

export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArrayLike = any[] | Buffer | string;

export function chunkArray<T extends ArrayLike>(array: T, len: number): T[] {
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

// const x: ReplaceType<{ a: string | undefined, b: boolean | undefined }, string | undefined,
// number | undefined> = { a: 1, b: 1 }

// eslint-disable-next-line @typescript-eslint/ban-types
export const replaceBuffers = <T extends object>(obj: T): ReplaceType<T, Buffer, string> =>
  Object.entries(obj).reduce(
    (result, [name, value]) => ({
      ...result,
      [name]: Buffer.isBuffer(value)
        ? printBuffer(value)
        : isPlainObject(value)
        ? replaceBuffers(value as ObjectType)
        : value,
    }),
    {}
  ) as ReplaceType<T, Buffer, string>;

export function asyncSerialMap<T, R>(
  array: ReadonlyArray<T>,
  action: (item: T, index: number, res: ReadonlyArray<R>) => Promise<R | R[]>
): Promise<R[]> {
  return array.reduce<Promise<R[]>>(
    (acc, item, index) =>
      acc.then(async items => {
        const result = await action(item, index, items);
        return Array.isArray(result) ? [...items, ...result] : [...items, result];
      }),
    Promise.resolve<R[]>([])
  );
}

export function tuplify<T extends unknown[]>(...args: T): T {
  return args;
}

export const MSG_DELIMITER = '\n';

const removeBraces = (str: string): string => str.replace(/^"(.*)"$/, '$1');

const toString = (e: unknown): string => removeBraces(JSON.stringify(e));

export const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(toString(e)));

export const toMessage = (e: unknown): string => toError(e).message;

export const toStack = (e: unknown): string =>
  e instanceof Error ? e.stack || e.message : toString(e);
export const MINIHOST_TYPE = 0xabc6;
export const MCDVI_TYPE = 0x1b;
// const FIRMWARE_VERSION_ID = 0x85;
export const VERSION_ID = 2;
export const logLevels = {
  none: null,
  hex: null,
  nibus: null,
} as const;
export type LogLevel = keyof typeof logLevels;
/**
 * Конфигурация сервиса NiBUS
 */
export type Config = {
  logLevel: LogLevel;
  omit: string[];
  pick: string[];
  // mibTypes?: Record<string, number | undefined>;
  timeout: number;
  attempts: number;
};
