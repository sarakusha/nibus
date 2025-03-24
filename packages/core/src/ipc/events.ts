/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable max-classes-per-file */
import { isLeft, isRight, toError } from 'fp-ts/Either';
import { parse } from 'fp-ts/Json';
/* tslint:disable:variable-name */
/* eslint-disable max-classes-per-file */
import * as t from 'io-ts';
import { logLevels } from '../common';
import { MibDescription, MibDescriptionV } from '../MibDescription';
import { IKnownPort, KnownPortV } from '../session/KnownPorts';

export const LogLevelV = t.keyof(logLevels);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const eventType = <A extends t.Mixed, B extends t.Mixed>(name: string, a: A, b?: B) =>
  t.type({
    event: t.literal(name),
    args: b ? t.tuple([a, b]) : t.tuple([a]),
  });

export const PortArgV = t.type({
  portInfo: KnownPortV,
  description: MibDescriptionV,
});

export interface PortArg extends t.TypeOf<typeof PortArgV> {
  portInfo: IKnownPort;
  description: MibDescription;
}

export const HostV =
  t.type({
    name: t.string,
    platform: t.string,
    arch: t.string,
    version: t.string,
    token: t.union([t.string, t.undefined]),
  });

export type Host = t.TypeOf<typeof HostV>

export const PortsEventV = eventType('ports', t.array(PortArgV));

export type PortsEvent = t.TypeOf<typeof PortsEventV>

export const PortAddedEventV = eventType('add', PortArgV);

export type PortAddedEvent = t.TypeOf<typeof PortAddedEventV>

export const PortRemovedEventV = eventType('remove', PortArgV);

export type PortRemovedEvent = t.TypeOf<typeof PortRemovedEventV>

export const LogLevelEventV = eventType('logLevel', LogLevelV);

export type LogLevelEvent = t.TypeOf<typeof LogLevelEventV>

export const ConfigEventV = eventType('config', t.UnknownRecord);

export type ConfigEvent = t.TypeOf<typeof ConfigEventV>

export const HostEventV = eventType('host', HostV);

export type HostEvent = t.TypeOf<typeof HostEventV>

export const LogLineEventV = eventType('log', t.string);

export type LogLineEvent = t.TypeOf<typeof LogLineEventV>

export const PongEventV = eventType('pong', t.void);

export type PongEvent = t.TypeOf<typeof PongEventV>

export const RectV = t.type({
  x: t.number,
  y: t.number,
  width: t.number,
  height: t.number,
});

export type Rect = t.TypeOf<typeof RectV>

export const DisplayV = t.intersection([
  t.type({
    id: t.number,
    bounds: RectV,
    workArea: RectV,
    displayFrequency: t.number,
    internal: t.boolean,
  }),
  t.partial({
    primary: t.boolean,
  }),
]);

export type Display = t.TypeOf<typeof DisplayV>

export const DisplaysEventV = eventType('displays', t.array(DisplayV));

export type DisplaysEvent = t.TypeOf<typeof DisplaysEventV>

export const BrightnessHistoryV = t.intersection([
  t.type({
    timestamp: t.number,
    brightness: t.number,
  }),
  t.partial({
    actual: t.number,
  }),
]);

export type BrightnessHistory = t.TypeOf<typeof BrightnessHistoryV>

export const BrightnessHistoryEventV = eventType('brightnessHistory', t.array(BrightnessHistoryV));

export type BrightnessHistoryEvent = t.TypeOf<typeof BrightnessHistoryEventV>

export const HealthEventV = eventType('health', t.UnknownRecord);

export type HealthEvent = t.TypeOf<typeof HealthEventV>

export const EventV = t.union([
  PortsEventV,
  PortAddedEventV,
  PortRemovedEventV,
  LogLevelEventV,
  ConfigEventV,
  HostEventV,
  LogLineEventV,
  PongEventV,
  DisplaysEventV,
  BrightnessHistoryEventV,
  HealthEventV,
]);

export type Event =
  | PortsEvent
  | PortAddedEvent
  | PortRemovedEvent
  | LogLevelEvent
  | ConfigEvent
  | HostEvent
  | LogLineEvent
  | PongEvent
  | DisplaysEvent
  | BrightnessHistoryEvent
  | HealthEvent;

class FromStringType<A> extends t.Type<A, string> {
  constructor(name: string, type: t.Mixed) {
    super(
      name,
      type.is,
      (m, c) => {
        const sv = t.string.validate(m, c);
        if (isLeft(sv)) return sv;
        const jv = parse(sv.right);
        // if (isLeft(jv)) return jv;
        return type.validate(
          isRight(jv)
            ? jv.right
            : [
              {
                value: sv.right,
                context: c,
                message: toError(jv.left).message,
              },
            ],
          c,
        );
      },
      JSON.stringify,
    );
  }
}

export class EventFromStringType extends FromStringType<Event> {
  constructor() {
    super('EventFromString', EventV);
  }
}

export const EventFromString = new EventFromStringType();
