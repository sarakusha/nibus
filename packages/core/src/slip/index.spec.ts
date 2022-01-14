/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import { trySlipDecode } from './index';

describe('slip', () => {
  test('decode', () => {
    const res = trySlipDecode([0xc0, 5, 0, 0x41]);
    expect(res).toEqual({
      fn: 5,
    });
  });
});
