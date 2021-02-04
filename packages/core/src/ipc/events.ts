/* eslint-disable max-classes-per-file */
/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { parseJSON, toError, isLeft } from 'fp-ts/lib/Either';
/* tslint:disable:variable-name */
/* eslint-disable max-classes-per-file */
import * as t from 'io-ts';
import { LogLevelV } from '../common';
import { MibDescription, MibDescriptionV } from '../MibDescription';
import { IKnownPort, KnownPortV } from '../session/KnownPorts';

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

export const PortsEventV = eventType('ports', t.array(PortArgV));

export interface PortsEvent extends t.TypeOf<typeof PortsEventV> {}

export const PortAddedEventV = eventType('add', PortArgV);

export interface PortAddedEvent extends t.TypeOf<typeof PortAddedEventV> {}

export const PortRemovedEventV = eventType('remove', PortArgV);

export interface PortRemovedEvent extends t.TypeOf<typeof PortRemovedEventV> {}

export const LogLevelEventV = eventType('logLevel', LogLevelV);

export interface LogLevelEvent extends t.TypeOf<typeof LogLevelEventV> {}

export const EventV = t.union([PortsEventV, PortAddedEventV, PortRemovedEventV, LogLevelEventV]);

export type Event = PortsEvent | PortAddedEvent | PortRemovedEvent | LogLevelEvent;

class FromStringType<A> extends t.Type<A, string> {
  constructor(name: string, type: t.Mixed) {
    super(
      name,
      type.is,
      (m, c) => {
        const sv = t.string.validate(m, c);
        if (isLeft(sv)) return sv;
        const jv = parseJSON(sv.right, e => [
          {
            value: sv.right,
            context: c,
            message: toError(e).message,
          },
        ]);
        if (isLeft(jv)) return jv;
        return type.validate(jv.right, c);
      },
      JSON.stringify
    );
  }
}

export class EventFromStringType extends FromStringType<Event> {
  constructor() {
    super('EventFromString', EventV);
  }
}

export const EventFromString = new EventFromStringType();
