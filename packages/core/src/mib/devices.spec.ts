/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import 'reflect-metadata';
import { getMibNames } from '@nibus/mibs';
import session from '../session/MockNibusSession';

const { devices } = session;

describe('Device', () => {
  test('one mib - one prototype', () => {
    const device1 = devices.create('::34:56', 'mcdvi');
    const device2 = devices.create('::11:22', 'mcdvi');
    const device3 = devices.create('::66:77', 'siolynx');
    expect(Reflect.getPrototypeOf(device1)).toBe(Reflect.getPrototypeOf(device2));
    expect(Reflect.getPrototypeOf(device1)).not.toBe(Reflect.getPrototypeOf(device3));
    // console.log('json', JSON.stringify(device2));
  });
  test('has version property', () => {
    const device = devices.create('auto', 'siolynx');
    expect(device.getId('2')).toBe(device.getId('version'));
    expect(device.getId('cdata')).toBe(271);
    expect(device.getId(271)).toBe(271);
    expect(device.getId('10f')).toBe(271);
  });
  test('different properties', () => {
    const device1 = devices.create('::34:56', 'mcdvi');
    const device2 = devices.create('::11:22', 'mcdvi');
    device1.brightness = 100;
    device2.brightness = 50;
    expect(device1).toHaveProperty('brightness', 100);
    expect(device1.getRawValue('brightness')).toBe(255);
    expect(device1.isDirty('brightness')).toBe(true);
    expect(device1.isDirty('version')).toBe(false);
    expect(device2).toHaveProperty('brightness', 50);
  });
  /** Разные порты, но одинаковые адреса **/
  // test('equal devices', () => {
  //   const address = 'FF:FE:12:34:56:78';
  //   const device1 = devices.create(address, 'mcdvi');
  //   const device2 = devices.create(address, 'mcdvi');
  //   device1.brightness = 56;
  //   expect(device2).toHaveProperty('brightness', 56);
  //   expect(device1).toBe(device2);
  // });
  // test('countRef', () => {
  //   const address = 'FF:FE:00:34:56:78';
  //   const count = Object.keys(devices.get()).length;
  //   const device1 = devices.create(address, 'mcdvi');
  //   const device2 = devices.create(address, 'mcdvi');
  //   expect(devices.get().length).toBe(count + 1);
  //   device2.release();
  //   expect(devices.get().length).toBe(count + 1);
  //   device1.release();
  //   expect(devices.get().length).toBe(count);
  // });
  test('mibs', async () => {
    const mibs = getMibNames();
    expect(mibs.length).toBeGreaterThanOrEqual(43);
  });
});
