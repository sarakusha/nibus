/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import loadDetection from './index';

describe('detection', () => {
  it('decode', () => {
    expect(() => console.log(loadDetection())).not.toThrow();
  });
});
