/* eslint-disable class-methods-use-this,no-bitwise */
/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import debugFactory from 'debug';
import { EventEmitter } from 'events';
import { AddressParam } from '../Address';
import devices from '../mib/devices';

import { MibDescription } from '../MibDescription';
import { getNmsType, NmsDatagram } from '../nms';
import { getSizeOf } from '../nms/nms';
import NmsServiceType from '../nms/NmsServiceType';
import { chunkArray } from './helper';
import { INibusConnection } from './NibusConnection';
import NibusDatagram, { Protocol } from './NibusDatagram';

const debug = debugFactory('nibus:mock-connection');

export default class MockNibusConnection extends EventEmitter implements INibusConnection {
  description: MibDescription;

  readonly path = 'mock-serial';

  constructor() {
    super();
    this.description = { type: 0xabc6, find: 'sarp', category: 'minihost', mib: 'minihost3' };
  }

  close(): void {
    const { path, description } = this;
    debug(`close connection on ${path} (${description.category})`);
    this.emit('close');
  }

  findByType(_type: number): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    throw new TypeError('NotImpl');
    // debug(`findByType ${type} on ${this.path} (${this.description.category})`);
    // return Promise.resolve(undefined);
  }

  getVersion(_address: AddressParam): Promise<[number, number]> {
    return Promise.resolve([3, 2]);
  }

  ping(_address: AddressParam): Promise<number> {
    return MockNibusConnection.pingImpl();
  }

  sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    if (datagram.protocol === Protocol.NMS) {
      const nmsDatagram = datagram as NmsDatagram;
      switch (nmsDatagram.service) {
        case NmsServiceType.Read:
          return this.nmsReadResponse(nmsDatagram);
        case NmsServiceType.Write:
          return new Promise(resolve =>
            process.nextTick(() =>
              resolve(
                new NmsDatagram({
                  id: nmsDatagram.id,
                  isResponse: true,
                  nms: Buffer.from([0]),
                  destination: nmsDatagram.source,
                  service: NmsServiceType.Write,
                })
              )
            )
          );
        default:
          throw new TypeError(`NotImpl ${NmsServiceType[nmsDatagram.service]}`);
      }
    }
    return Promise.resolve(undefined);
  }

  nmsReadResponse(nmsDatagram: NmsDatagram): Promise<NmsDatagram[]> {
    const { id, nms, source, destination } = nmsDatagram;
    const [device] = devices.find(destination) ?? [];
    if (!device) throw new Error(`Unknown device ${destination}`);
    const ids = [id];
    if (nms) {
      ids.push(...chunkArray(nms, 3).map(([hi, low]) => ((hi & 0b111) << 8) | low));
    }
    return new Promise(resolve => {
      process.nextTick(() => {
        resolve(
          ids.filter(Boolean).map(varId => {
            const name = device.getName(varId);
            const type = getNmsType(Reflect.getMetadata('simpleType', device, name));
            const size = getSizeOf(type);
            const buffer = Buffer.alloc(2 + size);
            buffer[1] = type;
            if (name === 'serno') {
              buffer.writeUInt16LE(0xdead, 2);
            }
            return new NmsDatagram({
              id: varId,
              service: NmsServiceType.Read,
              isResponse: true,
              destination: source,
              nms: buffer,
            });
          })
        );
      });
    });
  }

  static pingImpl(): Promise<number> {
    return Promise.resolve(Math.round(Math.random() * 100));
  }
}
