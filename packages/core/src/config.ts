/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import Conf, { Schema } from 'conf';
import debugFactory from 'debug';

import { Config, logLevels } from './common';

const debug = debugFactory('nibus');

export const schema: Schema<Config> = {
  logLevel: {
    enum: [...Object.keys(logLevels)],
    default: 'none',
  },
  omit: {
    type: 'array',
    items: { type: 'string' },
    default: ['priority', 'timeStamp'],
  },
  pick: {
    type: 'array',
    items: { type: 'string' },
    default: [],
  },
  timeout: {
    type: 'integer',
    default: 1000,
  },
  attempts: {
    type: 'integer',
    default: 3,
  },
};

let current: NibusConfig | undefined;

type NibusConfig = Pick<Conf<Config>, 'get' | 'set' | 'has' | 'path'>;

export function config(newValue?: NibusConfig): NibusConfig {
  if (newValue !== undefined) {
    current = newValue;
    debug(`Config: ${JSON.stringify(current)}`);
  }
  if (!current) {
    const value = new Conf<Config>({
      schema,
      clearInvalidConfig: true,
      projectName: 'nibus',
    });
    debug(`Config: ${value.path}`);
    current = value;
  }
  return current;
}
