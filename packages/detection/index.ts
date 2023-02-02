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
import * as yaml from 'js-yaml';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import { MibDescriptionV } from '@nibus/core/MibDescription';
import { CategoryV } from '@nibus/core/session/KnownPorts';

import detectionPath from './assets';

export { detectionPath };

const DetectorItemV = t.intersection([
  t.type({
    vid: t.number,
    pid: t.number,
    category: CategoryV,
  }),
  t.partial({
    device: t.string,
    manufacturer: t.string,
    serialNumber: t.string,
  }),
]);

const DetectionV = t.type({
  mibCategories: t.record(t.string, MibDescriptionV),
  knownDevices: t.array(DetectorItemV),
});

export type Detection = t.TypeOf<typeof DetectionV>;

const getRawDetection = (): Detection => {
  const data = fs.readFileSync(detectionPath, 'utf8');
  return yaml.load(data) as Detection;
};

type Loader = {
  (): Detection | undefined;
  onChanged?: () => void;
};

export const loadDetection: Loader = () => {
  const raw = getRawDetection();
  Object.keys(raw.mibCategories).forEach(category => {
    const desc = raw.mibCategories[category];
    desc.category = category;
    if (Array.isArray(desc.select)) {
      desc.select = (desc.select as unknown as string[]).map(cat => raw.mibCategories[cat]);
    }
  });
  const validate = DetectionV.decode(raw);
  if (isLeft(validate)) {
    throw new TypeError(
      `Invalid detection file: ${detectionPath}. ${PathReporter.report(validate)}\n${JSON.stringify(
        raw
      )}`
    );
  }
  return validate.right;
};

fs.watchFile(detectionPath, { persistent: false }, (cur, prev) => {
  if (cur.mtime !== prev.mtime) loadDetection.onChanged?.();
});

export default loadDetection;
