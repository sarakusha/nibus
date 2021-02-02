/* eslint-disable no-param-reassign */
/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import fs from 'fs';
import _ from 'lodash';
// import { Socket } from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from '../debug';
import Address, { AddressParam } from '../Address';
import { delay, LogLevel, noop, PATH, promiseArray } from '../common';
import { Client, PortArg } from '../ipc';
import { Devices, getMibFile, IDevice, IMibDeviceType, toInt } from '../mib';

import { INibusConnection, NibusConnection } from '../nibus';
import { createNmsRead } from '../nms';
import { Category } from './KnownPorts';

const debug = debugFactory('nibus:session');

export type FoundListener = (arg: {
  connection: INibusConnection;
  category: Category;
  address: Address;
}) => void;

export type ConnectionListener = (connection: INibusConnection) => void;
export type DeviceListener = (device: IDevice) => void;

export interface NibusSessionEvents {
  start: () => void;
  close: () => void;
  found: FoundListener;
  add: ConnectionListener;
  remove: ConnectionListener;
  connected: DeviceListener;
  disconnected: DeviceListener;
  pureConnection: (connection: INibusConnection) => void;
}
// noinspection JSUnusedLocalSymbols
export interface INibusSession {
  on<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
  once<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
  off<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;

  readonly ports: number;
  start(): Promise<number>;
  // connectDevice(device: IDevice, connection: INibusConnection): void;
  close(): void;
  pingDevice(device: IDevice): Promise<number>;
  ping(address: AddressParam): Promise<number>;
  reloadDevices(): void;
  setLogLevel(logLevel: LogLevel): void;
  readonly devices: Devices;
}

export class NibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
  private readonly connections: INibusConnection[] = [];

  private isStarted = false;

  private socket?: Client; // = Client.connect(PATH);

  public readonly devices = new Devices();

  constructor() {
    super();
    this.devices.on('new', device => {
      if (!device.connection) {
        this.pingDevice(device).catch();
      }
    });
    this.devices.on('delete', device => {
      if (device.connection) {
        device.connection = undefined;
        this.emit('disconnected', device);
      }
    });
  }

  get ports(): number {
    return this.connections.length;
  }

  //
  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.isStarted) {
        resolve(this.connections.length);
        return;
      }
      this.isStarted = true;
      this.socket = Client.connect(PATH);
      this.socket.once('error', error => {
        console.error('error while start nibus.service', error.message);
        this.close();
        reject(error);
      });
      this.socket.on('ports', this.reloadHandler);
      this.socket.on('add', this.addHandler);
      this.socket.on('remove', this.removeHandler);
      this.socket.once('ports', ports => {
        resolve(ports.length);
        this.emit('start');
      });
      this.socket.once('close', () => this.close());
    });
  }

  private connectDevice(device: IDevice, connection: INibusConnection): void {
    if (device.connection === connection) return;
    device.connection = connection;
    const event = connection ? 'connected' : 'disconnected';
    process.nextTick(() => this.emit(event, device));
    // device.emit('connected');
    debug(`mib-device [${device.address}] was ${event}`);
  }

  public close(): void {
    if (!this.isStarted) return;
    this.isStarted = false;
    debug('close');
    this.emit('close');
    this.connections
      .splice(0, this.connections.length)
      .forEach(connection => this.closeConnection(connection));
    this.socket && this.socket.destroy();
  }

  //
  async pingDevice(device: IDevice): Promise<number> {
    const { connections } = this;
    if (device.connection && connections.includes(device.connection)) {
      const timeout = await device.connection.ping(device.address);
      if (timeout !== -1) return timeout;
      device.connection = undefined;
      this.emit('disconnected', device);
      // device.emit('disconnected');
    }

    const mib = Reflect.getMetadata('mib', device);
    const occupied: INibusConnection[] = this.devices
      .get()
      .map(item => item.connection!)
      .filter(connection => connection != null && !connection.description.link);
    const acceptable = _.difference(connections, occupied).filter(
      ({ description }) => description.link || description.mib === mib
    );
    if (acceptable.length === 0) return -1;

    const [timeout, connection] = await Promise.race(
      acceptable.map(item =>
        item.ping(device.address).then(t => [t, item] as [number, INibusConnection])
      )
    );
    if (timeout === -1) {
      // ping(acceptables[0], device.address);
      return -1;
    }

    this.connectDevice(device, connection);
    return timeout;
  }

  // public async start(watch = true) {
  //   if (this.isStarted) return;
  //   const { detection } = detector;
  //   if (detection == null) throw new Error('detection is N/A');
  //   detector.on('add', this.addHandler);
  //   detector.on('remove', this.removeHandler);
  //   await detector.getPorts();
  //
  //   if (watch) detector.start();
  //   this.isStarted = true;
  //   process.once('SIGINT', () => this.stop());
  //   process.once('SIGTERM', () => this.stop());
  //   /**
  //    * @event NibusService#start
  //    */
  //   this.emit('start');
  //   debug('started');
  // }

  async ping(address: AddressParam): Promise<number> {
    const { connections } = this;
    const addr = new Address(address);
    if (connections.length === 0) return Promise.resolve(-1);
    return Promise.race(connections.map(connection => connection.ping(addr)));
  }

  reloadDevices(): void {
    this.socket && this.socket.send('reloadDevices');
  }

  setLogLevel(logLevel: LogLevel): void {
    this.socket && this.socket.send('setLogLevel', logLevel);
  }

  private reloadHandler = (ports: PortArg[]): void => {
    const prev = this.connections.splice(0, this.connections.length);
    ports.forEach(port => {
      const {
        portInfo: { path },
      } = port;
      const index = _.findIndex(prev, { path });
      if (index !== -1) {
        this.connections.push(prev.splice(index, 1)[0]);
      } else {
        this.addHandler(port).catch(noop);
      }
    });
    prev.forEach(connection => this.closeConnection(connection));
  };

  private addHandler = async ({ portInfo: { path }, description }: PortArg): Promise<void> => {
    try {
      debug('add');
      const connection = new NibusConnection(path, description);
      this.connections.push(connection);
      this.emit('add', connection);
      if (process.platform === 'win32') await delay(2000);
      this.find(connection);
      // TODO: Может быть несколько устройств с одинаковым адресом или отличающимся типом!
      this.devices
        .get()
        .filter(device => device.connection == null)
        .reduce(async (promise, device) => {
          await promise;
          debug('start ping');
          const time = await connection.ping(device.address);
          debug(`ping ${time}`);
          if (time !== -1) {
            device.connection = connection;
            this.emit('connected', device);
            debug(`mib-device ${device.address} was connected`);
          }
        }, Promise.resolve())
        .catch(noop);
    } catch (e) {
      console.error(e);
      debug(e);
    }
  };

  private closeConnection(connection: INibusConnection): void {
    connection.close();
    this.devices
      .get()
      .filter(device => device.connection === connection)
      .forEach(device => {
        // eslint-disable-next-line no-param-reassign
        device.connection = undefined;
        this.emit('disconnected', device);
        debug(`mib-device ${connection.path}#${device.address} was disconnected`);
      });
    this.emit('remove', connection);
  }

  private removeHandler = ({ portInfo: { path: port } }: PortArg): void => {
    const index = this.connections.findIndex(({ path }) => port === path);
    if (index !== -1) {
      const [connection] = this.connections.splice(index, 1);
      this.closeConnection(connection);
    }
  };

  private find(connection: INibusConnection): void {
    const { description } = connection;
    const descriptions = Array.isArray(description.select) ? description.select : [description];
    const baseCategory = Array.isArray(description.select) ? description.category : null;
    promiseArray(descriptions, async desc => {
      debug(`%o ${baseCategory}`, connection.description);
      if (baseCategory && connection.description.category !== baseCategory) return;
      const { category } = desc;
      switch (desc.find) {
        case 'sarp': {
          let { type } = desc;
          if (type === undefined) {
            const mib = JSON.parse(fs.readFileSync(getMibFile(desc.mib!)).toString());
            const { types } = mib;
            const device = types[mib.device] as IMibDeviceType;
            type = toInt(device.appinfo.device_type);
          }
          try {
            const sarpDatagram = await connection.findByType(type);
            debug(`category was changed: ${connection.description.category} => ${category}`);
            // eslint-disable-next-line no-param-reassign
            connection.description = desc;
            const address = new Address(sarpDatagram.mac);
            debug(`device ${category}[${address}] was found on ${connection.path}`);
            this.emit('found', {
              connection,
              category: category as Category,
              address,
            });
            const devs = this.devices
              .find(address)
              .filter(dev => Reflect.getMetadata('deviceType', dev) === type);
            if (devs?.length === 1) {
              this.connectDevice(devs[0], connection);
            }
          } catch (e) {
            debug('SARP: %s, %o', e.message, connection.description);
            // if (category === 'minihost' && !connection.description?.mib) {
            //   debug(`inactive device ${category} was found on ${connection.path}`);
            //   connection.description.mib = 'minihost3';
            //   this.emit('found', {
            //     connection,
            //     category: 'minihost',
            //     address: Address.empty,
            //   });
            // }
          }
          break;
        }
        case 'version':
          connection.sendDatagram(createNmsRead(Address.empty, 2)).then(
            datagram => {
              if (!datagram || Array.isArray(datagram)) return;
              debug(`category was changed: ${connection.description.category} => ${category}`);
              connection.description = desc;
              const address = new Address(datagram.source.mac);
              this.emit('found', {
                connection,
                category: category as Category,
                address,
              });
              debug(`device ${category}[${address}] was found on ${connection.path}`);
            },
            () => {
              this.emit('pureConnection', connection);
            }
          );
          break;
        default:
          this.emit('pureConnection', connection);
          break;
      }
    }).catch(e => debug(`error while find ${e.message}`));
  }
}
