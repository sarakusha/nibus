/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable class-methods-use-this */
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from 'debug';
import Address, { AddressParam } from '../Address';
import { BrightnessHistory } from '../ipc';
import { Devices, IDevice } from '../mib';
import MockNibusConnection from '../nibus/MockNibusConnection';
import { INibusSession, NibusSessionEvents } from './NibusSession';
import type { VersionInfo } from "../nibus/NibusConnection";

const debug = debugFactory('nibus:mock-session');

export class MockNibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
  readonly ports = 1;

  readonly devices = new Devices();

  readonly port = 9001;

  private connection = new MockNibusConnection(this, this.devices);

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

  ping(_address: AddressParam): Promise<[-1, undefined] | [number, VersionInfo]> {
    return Promise.resolve([-1, undefined]);
  }

  reloadDevices(): void {}

  setLogLevel(): void {}

  saveConfig(): void {}

  getBrightnessHistory(): Promise<BrightnessHistory[]> {
    return Promise.reject(new Error('Not implemented'));
  }

  // getSocket(): undefined {
  //   return undefined;
  // }
}

const session = new MockNibusSession();

export default session;
