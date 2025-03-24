/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import debugFactory from 'debug';

import root from './json';

const debug = debugFactory('nibus:mibs');

debug(`root: ${root}`);

const MibPropertyAppInfoV = t.intersection([
  t.type({
    nms_id: t.union([t.string, t.Int]),
    access: t.string,
  }),
  t.partial({
    category: t.string,
    rank: t.string,
    zero: t.string,
    units: t.string,
    precision: t.string,
    representation: t.string,
    get: t.string,
    set: t.string,
  }),
]);
const MibPropertyV = t.type({
  type: t.string,
  annotation: t.string,
  appinfo: MibPropertyAppInfoV,
});

export type IMibProperty = t.TypeOf<typeof MibPropertyV> ;

const MibDeviceAppInfoV = t.intersection([
  t.type({
    mib_version: t.string,
  }),
  t.partial({
    device_type: t.string,
    loader_type: t.string,
    firmware: t.string,
    min_version: t.string,
    disable_batch_reading: t.string,
  }),
]);
const MibDeviceTypeV = t.type({
  annotation: t.string,
  appinfo: MibDeviceAppInfoV,
  properties: t.record(t.string, MibPropertyV),
});

export type IMibDeviceType = t.TypeOf<typeof MibDeviceTypeV>;

const MibTypeV = t.intersection([
  t.type({
    base: t.string,
  }),
  t.partial({
    appinfo: t.partial({
      zero: t.string,
      units: t.string,
      precision: t.string,
      representation: t.string,
      get: t.string,
      set: t.string,
    }),
    minInclusive: t.string,
    maxInclusive: t.string,
    enumeration: t.record(t.string, t.type({ annotation: t.string })),
  }),
]);

export type IMibType = t.TypeOf<typeof MibTypeV>;

const MibSubroutineV = t.intersection([
  t.type({
    annotation: t.string,
    appinfo: t.intersection([
      t.type({ nms_id: t.union([t.string, t.Int]) }),
      t.partial({ response: t.string }),
    ]),
  }),
  t.partial({
    properties: t.record(
      t.string,
      t.type({
        type: t.string,
        annotation: t.string,
      })
    ),
  }),
]);

const SubroutineTypeV = t.type({
  annotation: t.string,
  properties: t.type({
    id: t.type({
      type: t.literal('xs:unsignedShort'),
      annotation: t.string,
    }),
  }),
});

export const MibDeviceV = t.intersection([
  t.type({
    device: t.string,
    types: t.record(t.string, t.union([MibDeviceTypeV, MibTypeV, SubroutineTypeV])),
  }),
  t.partial({
    subroutines: t.record(t.string, MibSubroutineV),
  }),
]);

export type MibSubroutines = t.TypeOf<typeof MibSubroutineV>;

export type IMibDevice = t.TypeOf<typeof MibDeviceV>;

const decodeMib = (name: string): IMibDevice => {
  const mibPath = `${root}/${name}.mib.json`;
  const mibValidation = MibDeviceV.decode(
    JSON.parse(fs.readFileSync(mibPath).toString())
  );
  if (isLeft(mibValidation)) {
    throw new Error(`Invalid mib file ${name} ${PathReporter.report(mibValidation).join('\n')}`);
  }
  return mibValidation.right;
};

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

const mibs = Object.fromEntries(
  fs
    .readdirSync(root)
    .filter(file => file.endsWith('.mib.json'))
    .map(file => path.basename(file, '.mib.json'))
    .map(mibname => {
      try {
        const mib = decodeMib(mibname);
        return [mibname, mib];
      } catch (err) {
        console.error(`Invalid mib ${mibname}: ${(err as Error).message}`);
        return undefined;
      }
    })
    .filter(notEmpty)
) as Record<string, IMibDevice>;

export const getMibNames = (): string[] => Object.keys(mibs);

export const getMib = (name: string): IMibDevice | undefined => mibs[name];
