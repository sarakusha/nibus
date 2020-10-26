/* eslint-disable class-methods-use-this */
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
import Address, { AddressParam } from '../Address';
import { IDevice } from '../mib';
import { INibusConnection } from '../nibus';
import MockNibusConnection from '../nibus/MockNibusConnection';
import type { INibusSession } from './NibusSession';

const debug = debugFactory('nibus:mock-session');

export default class MockNibusSession extends EventEmitter implements INibusSession {
  readonly ports = 1;

  private connection = new MockNibusConnection();

  private isStarted = false;

  start(): Promise<number> {
    this.isStarted = true;
    setTimeout(() => {
      this.emit('add', this.connection);
      this.emit('found', {
        connection: this.connection,
        category: 'minihost',
        address: new Address('::DE:AD'),
      });
    }, 500);
    return Promise.resolve(1);
  }

  connectDevice(device: IDevice, connection: INibusConnection): void {
    if (device.connection === connection) return;
    device.connection = connection;
    const event = connection ? 'connected' : 'disconnected';
    process.nextTick(() => this.emit(event, device));
    // device.emit('connected');
    debug(`mib-device [${device.address}] was ${event}`);
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
}
