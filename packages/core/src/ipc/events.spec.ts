/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { isRight } from 'fp-ts/lib/Either';
import {
  EventFromString,
  PortsEventV,
  PortsEvent,
  PortAddedEventV,
  PortAddedEvent,
  PortRemovedEventV,
  PortRemovedEvent,
  EventV,
} from './events';

const portsEvent: PortsEvent = {
  event: 'ports',
  args: [
    [
      {
        portInfo: {
          path: 'com1',
          productId: 1,
          vendorId: 2,
        },
        description: { mib: 'test' },
      },
      {
        portInfo: {
          path: 'com2',
          productId: 1,
          vendorId: 2,
        },
        description: { mib: 'test' },
      },
    ],
  ],
};

const addEvent: PortAddedEvent = {
  event: 'add',
  args: [
    {
      portInfo: {
        path: 'com3',
        productId: 1,
        vendorId: 2,
      },
      description: { mib: 'test' },
    },
  ],
};

const removeEvent: PortRemovedEvent = {
  event: 'remove',
  args: [
    {
      portInfo: {
        path: 'com3',
        productId: 1,
        vendorId: 2,
      },
      description: { mib: 'test' },
    },
  ],
};

const testEvent = {
  event: 'test',
  args: [
    {
      a: 1,
      b: 2,
    },
  ],
};

const events = [portsEvent, addEvent, removeEvent];

describe('event tests', () => {
  test('PortsEvent', () => {
    expect(PortsEventV.is(portsEvent)).toBeTruthy();
    expect(PortAddedEventV.is(portsEvent)).toBeFalsy();
    expect(PortRemovedEventV.is(portsEvent)).toBeFalsy();
  });
  test('PortAddedEvent', () => {
    expect(PortsEventV.is(addEvent)).toBeFalsy();
    expect(PortAddedEventV.is(addEvent)).toBeTruthy();
    expect(PortRemovedEventV.is(addEvent)).toBeFalsy();
  });
  test('PortRemovedEvent', () => {
    expect(PortsEventV.is(removeEvent)).toBeFalsy();
    expect(PortAddedEventV.is(removeEvent)).toBeFalsy();
    expect(PortRemovedEventV.is(removeEvent)).toBeTruthy();
  });
  test('Event', () => {
    expect(EventV.is(portsEvent)).toBeTruthy();
    expect(EventV.is(addEvent)).toBeTruthy();
    expect(EventV.is(removeEvent)).toBeTruthy();
  });
  test('invalid event', () => {
    expect(PortsEventV.is(testEvent)).toBeFalsy();
    expect(PortAddedEventV.is(testEvent)).toBeFalsy();
    expect(PortRemovedEventV.is(testEvent)).toBeFalsy();
    expect(EventV.is(testEvent)).toBeFalsy();
  });
  test('stringify', () => {
    events.forEach(event => {
      expect(EventFromString.encode(event)).toBe(JSON.stringify(event));
    });
  });

  test('parse', () => {
    events.forEach(event => {
      const validate = EventFromString.decode(JSON.stringify(event));
      expect(isRight(validate));
      expect(isRight(validate) && validate.right).toEqual(event);
    });
  });
});
