/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import * as Buffer from 'buffer';

type Result = {
  data: Buffer;
  startSegmentAddress: null | number;
  startLinearAddress: null | number;
};

// eslint-disable-next-line import/prefer-default-export
export function parse(data: string | Buffer, bufferSize?: number): Result;
