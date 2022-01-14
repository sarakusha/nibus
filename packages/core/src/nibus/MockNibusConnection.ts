/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable class-methods-use-this,no-bitwise */
import { TypedEmitter } from 'tiny-typed-emitter';
import { chunkArray, tuplify } from '../common';
import debugFactory from '../debug';
import Address, { AddressParam } from '../Address';
import type { Devices } from '../mib';

import { MibDescription } from '../MibDescription';
import { getNmsType, NmsDatagram } from '../nms';
import { getSizeOf } from '../nms/nms';
import NmsServiceType from '../nms/NmsServiceType';
import type { SarpDatagram } from '../sarp';
import type { INibusSession } from '../session';
import { SlipDatagram } from '../slip';
import { NibusEvents, INibusConnection, VersionInfo } from './NibusConnection';
import NibusDatagram, { Protocol } from './NibusDatagram';

const debug = debugFactory('nibus:mock-connection');

export default class MockNibusConnection
  extends TypedEmitter<NibusEvents>
  implements INibusConnection {
  description: MibDescription;

  readonly path = 'mock-serial';

  private closed = false;

  constructor(public readonly session: INibusSession, readonly devices: Devices) {
    super();
    this.description = {
      type: 0xabc6,
      find: 'sarp',
      category: 'minihost',
      mib: 'minihost3',
    };
  }

  get isClosed(): boolean {
    return this.closed;
  }

  static pingImpl(): Promise<number> {
    return Promise.resolve(Math.round(Math.random() * 100));
  }

  close(): void {
    const { path, description } = this;
    debug(`close connection on ${path} (${description.category})`);
    this.closed = true;
    this.emit('close');
  }

  findByType(_type: number): Promise<SarpDatagram> {
    throw new TypeError('NotImpl');
    // debug(`findByType ${type} on ${this.path} (${this.description.category})`);
    // return Promise.resolve(undefined);
  }

  getVersion(address: AddressParam): Promise<VersionInfo> {
    return Promise.resolve({
      version: 3,
      type: 2,
      source: new Address(address),
      timestamp: 0,
      connection: this,
    });
  }

  async ping(address: AddressParam): Promise<[number, VersionInfo]> {
    return tuplify(await MockNibusConnection.pingImpl(), await this.getVersion(address));
  }

  sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    if (datagram.protocol === Protocol.NMS) {
      const nmsDatagram = datagram as NmsDatagram;
      switch (nmsDatagram.service) {
        case NmsServiceType.Read:
          return this.nmsReadResponse(nmsDatagram);
        case NmsServiceType.Write:
          return new Promise(resolve => {
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
            );
          });
        default:
          throw new TypeError(`NotImpl ${NmsServiceType[nmsDatagram.service]}`);
      }
    }
    return Promise.resolve(undefined);
  }

  nmsReadResponse(nmsDatagram: NmsDatagram): Promise<NmsDatagram[]> {
    const { id, nms, source, destination } = nmsDatagram;
    const [device] = this.devices.find(destination) ?? [];
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

  slipStart(): Promise<boolean> {
    return Promise.resolve(false);
  }

  slipFinish(): void {}

  execBootloader(): Promise<SlipDatagram> {
    return Promise.resolve(new SlipDatagram(Buffer.alloc(0)));
  }
}
