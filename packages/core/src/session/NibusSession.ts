/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-param-reassign */
import fs from 'fs';
import _ from 'lodash';
import { TypedEmitter } from 'tiny-typed-emitter';
import Address, { AddressParam } from '../Address';
import { delay, LogLevel, noop, asyncSerialMap, tuplify } from '../common';
import debugFactory from '../debug';
import { Client, Host, PortArg, Display } from '../ipc';
import { BrightnessHistory } from '../ipc/events';
import { Devices, getMibFile, IDevice, IMibDeviceType, toInt, DeviceId } from '../mib';

import { INibusConnection, NibusConnection } from '../nibus';
import { NibusEvents, VersionInfo } from '../nibus/NibusConnection';
import { NmsDatagram, NmsServiceType } from '../nms';
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
  logLevel: (level: LogLevel) => void;
  informationReport: (connection: INibusConnection, info: NmsDatagram) => void;
  config: (config: Record<string, unknown>) => void;
  host: (host: Host) => void;
  log: (line: string) => void;
  online: (isOnline: boolean) => void;
  displays: (value: Display[]) => void;
  foreign: (port: PortArg) => void;
}
// noinspection JSUnusedLocalSymbols
export interface INibusSession {
  on<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
  once<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
  off<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;

  readonly ports: number;
  start(port?: number, host?: string): Promise<number>;
  // connectDevice(device: IDevice, connection: INibusConnection): void;
  close(): void;
  pingDevice(device: IDevice): Promise<number>;
  ping(address: AddressParam): Promise<[-1, undefined] | [number, VersionInfo]>;
  reloadDevices(): void;
  setLogLevel(logLevel: LogLevel): void;
  saveConfig(config: Record<string, unknown>): void;
  getBrightnessHistory(dt?: number): Promise<BrightnessHistory[]>;
  readonly devices: Devices;
  readonly host?: string;
  readonly port: number;
  // getSocket(): Client | undefined;
}

export class NibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
  private readonly connections: INibusConnection[] = [];

  private readonly nmsListeners = new Map<INibusConnection, NibusEvents['nms']>();

  private isStarted = false;

  private socket?: Client; // = Client.connect(PATH);

  public readonly devices = new Devices();

  constructor(readonly port: number, readonly host?: string) {
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

  // getSocket(): Client | undefined {
  //   return this.socket;
  // }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.isStarted) {
        resolve(this.connections.length);
        return;
      }
      const { port, host } = this;
      // this.isStarted = true;
      this.socket = Client.connect({ port, host });
      // let connected = false;
      this.socket.on('online', value => this.emit('online', value));
      this.socket.on('displays', value => this.emit('displays', value));
      this.socket.once('connect', () => {
        this.isStarted = true;
      });
      this.socket.once('error', error => {
        console.error('error while start nibus.service', error.message);
        if (this.isStarted) this.close();
        else reject(error);
      });
      this.socket.on('ports', this.reloadHandler);
      this.socket.on('add', this.addHandler);
      this.socket.on('remove', this.removeHandler);
      this.socket.once('ports', ports => {
        // console.log({ ports });
        resolve(ports.length);
        this.emit('start');
      });
      this.socket.once('close', () => this.isStarted && this.close());
      this.socket.on('logLevel', level => {
        this.emit('logLevel', level);
      });
      this.socket.on('config', config => {
        this.emit('config', config);
      });
      this.socket.on('host', hostOpts => this.emit('host', hostOpts));
      this.socket.on('log', line => this.emit('log', line));
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
    if (this.socket) {
      this.socket.destroy();
      // this.socket.removeAllListeners();
    }
  }

  //
  async pingDevice(device: IDevice): Promise<number> {
    const { connections } = this;
    const deviceType = Reflect.getMetadata('deviceType', device);
    if (device.connection && connections.includes(device.connection)) {
      const [timeout, info] = await device.connection.ping(device.address);
      if (timeout !== -1) {
        const { type } = info!;
        if (deviceType === type) return timeout;
      }

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
        item
          .ping(device.address)
          .then(([t, info]) => tuplify(info?.type === deviceType ? t : -1, item))
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

  async ping(address: AddressParam): Promise<[-1, undefined] | [number, VersionInfo]> {
    const { connections } = this;
    const addr = new Address(address);
    if (connections.length === 0) return Promise.resolve([-1, undefined]);
    return Promise.race(connections.map(connection => connection.ping(addr)));
  }

  reloadDevices(): void {
    this.socket && this.socket.send('reloadDevices');
  }

  setLogLevel(logLevel: LogLevel): void {
    this.socket && this.socket.send('setLogLevel', logLevel);
  }

  saveConfig(config: Record<string, unknown>): void {
    this.socket && this.socket.send('config', config);
  }

  getBrightnessHistory(dt = Date.now()): Promise<BrightnessHistory[]> {
    return new Promise<BrightnessHistory[]>((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }
      let timer = 0;
      const handler = (history: BrightnessHistory[]): void => {
        window.clearTimeout(timer);
        resolve(history);
      };
      timer = window.setTimeout(() => {
        this.socket?.off('brightnessHistory', handler);
        reject(new Error('Timeout'));
      }, 1000);
      this.socket.once('brightnessHistory', handler);
      this.socket.send('getBrightnessHistory', dt);
    });
  }

  private reloadHandler = (ports: PortArg[]): void => {
    // console.log('reloadHandler', ports);
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

  private addHandler = async (newPort: PortArg): Promise<void> => {
    const {
      portInfo: { path },
      description,
    } = newPort;
    if (description.foreign) {
      this.emit('foreign', newPort);
      return;
    }
    try {
      const { port, host } = this;
      const connection = new NibusConnection(this, path, description, port, host);
      const nmsListener: NibusEvents['nms'] = nms => {
        if (nms.service === NmsServiceType.InformationReport) {
          this.emit('informationReport', connection, nms);
        }
      };
      this.nmsListeners.set(connection, nmsListener);
      connection.on('nms', nmsListener);
      this.connections.push(connection);
      this.emit('add', connection);
      await delay(2000);
      this.find(connection);
      // TODO: Может быть несколько устройств с одинаковым адресом или отличающимся типом!
      this.devices
        .get()
        .filter(device => device.connection == null)
        .reduce(async (promise, device) => {
          await promise;
          debug('start ping');
          const [time] = await connection.ping(device.address);
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
      debug(`error while new connection ${e.message}`);
    }
  };

  private closeConnection(connection: INibusConnection): void {
    connection.close();
    const nmsListener = this.nmsListeners.get(connection);
    nmsListener && connection.off('nms', nmsListener);
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
    const tryFind = (): void => {
      if (connection.isClosed) return;
      asyncSerialMap(descriptions, async desc => {
        // debug(`find ${JSON.stringify(connection.description)} ${baseCategory}`);
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
              // debug(`category was changed: ${connection.description.category} => ${category}`);
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
              debug(`SARP error: ${e.message}, ${JSON.stringify(connection.description)}`);
              if (!connection.isClosed) setTimeout(() => tryFind(), 5000);
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
            try {
              const { type, source: address } = (await connection.getVersion(Address.empty)) ?? {};
              // debug(
              //   `find version - type:${type}, address: ${address}, desc: ${JSON.stringify(desc)}`
              // );
              if (desc.type === type && address) {
                // const datagram = await connection.sendDatagram(createNmsRead(Address.empty, 2));
                // if (!datagram || Array.isArray(datagram)) return;
                // debug(`category was changed: ${connection.description.category} => ${category}`);
                connection.description = desc;
                // const address = new Address(datagram.source.mac);
                this.emit('found', {
                  connection,
                  category: category as Category,
                  address,
                });
                debug(`device ${category}[${address}] was found on ${connection.path}`);
              }
            } catch (err) {
              this.emit('pureConnection', connection);
            }
            break;
          default:
            this.emit('pureConnection', connection);
            break;
        }
      }).catch(e => debug(`error while find ${e.message}`));
    };
    tryFind();
  }
}

const sessions = new Map<string, INibusSession>();

const getKey = (port: number, host?: string): string => `${host ?? ''}:${port}`;

let defaultSession: INibusSession | undefined;

export const getNibusSession = (
  port = +(process.env.NIBUS_PORT ?? 9001),
  host?: string
): INibusSession => {
  const key = getKey(port, host);
  if (!sessions.has(key)) {
    const session = new NibusSession(port, host);
    session.once('close', () => {
      sessions.has(key) && sessions.delete(key);
    });
    sessions.set(key, session);
    if (!defaultSession) defaultSession = session;
  }

  return sessions.get(key)!;
};

const release = (): void => {
  const values = [...sessions.values()];
  sessions.clear();
  values.forEach(session => session.close());
  defaultSession = undefined;
};

export const getDefaultSession = (): INibusSession => {
  if (!defaultSession) {
    defaultSession = getNibusSession();
  }
  return defaultSession;
};

export const getSessions = (): INibusSession[] => [...sessions.values()];

export const findDeviceById = (id: DeviceId): IDevice | undefined => {
  // debug(`SESSIONS ${JSON.stringify([...sessions.values()])}`);
  const values = [...sessions.values()];
  for (let i = 0; i < values.length; i += 1) {
    const device = values[i].devices.findById(id);
    if (device) return device;
  }
  return undefined;
};

export const setDefaultSession = (port: number, host?: string): INibusSession => {
  defaultSession = getNibusSession(port, host);
  return defaultSession;
};

process.on('SIGINT', release);
process.on('SIGTERM', release);

// export default getDefaultSession;
