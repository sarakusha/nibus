/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import { SetLogLevelArgsV } from './clientEvents';

describe('client messages', () => {
  test('setLogLevel valid', () => {
    const args = ['setLogLevel', 'none'];
    expect(SetLogLevelArgsV.is(args)).toBeTruthy();
  });
  test('setLogLevel invalid', () => {
    const args = ['setLogLevel', 'none1'];
    expect(SetLogLevelArgsV.is(args)).toBeFalsy();
  });
  test('setLogLevel1', () => {
    const args = ['setLogLevel1', 'none'];
    expect(SetLogLevelArgsV.is(args)).toBeFalsy();
  });
});
