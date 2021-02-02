/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable class-methods-use-this */
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from '../debug';
import Address, { AddressParam } from '../Address';
import { Devices, IDevice } from '../mib';
// import { INibusConnection } from '../nibus';
import MockNibusConnection from '../nibus/MockNibusConnection';
import { NibusSessionEvents, INibusSession } from './NibusSession';

const debug = debugFactory('nibus:mock-session');

export default class MockNibusSession
  extends TypedEmitter<NibusSessionEvents>
  implements INibusSession {
  readonly ports = 1;

  readonly devices = new Devices();

  private connection = new MockNibusConnection(this.devices);

  private isStarted = false;

  start(): Promise<number> {
    this.isStarted = true;
    setTimeout(() => {
      this.emit('add', this.connection);
      // const device = this.devices.create('::DE:AD', 'minihost3');
      // this.connectDevice(device);
      this.emit('found', {
        connection: this.connection,
        category: 'minihost',
        address: new Address('::DE:AD'),
      });
    }, 500);
    return Promise.resolve(1);
  }

  connectDevice(device: IDevice): void {
    if (device.connection === this.connection) return;
    device.connection = this.connection;
    process.nextTick(() => this.emit('connected', device));
    // device.emit('connected');
    debug(`mib-device [${device.address}] was connected`);
  }

  close(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    debug('close');
    this.emit('close');
  }

  pingDevice(_device: IDevice): Promise<number> {
    return MockNibusConnection.pingImpl();
  }

  ping(_address: AddressParam): Promise<number> {
    return MockNibusConnection.pingImpl();
  }

  reloadDevices(): void {}

  setLogLevel(): void {}
}
