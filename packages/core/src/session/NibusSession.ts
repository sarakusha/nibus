/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable no-param-reassign */
import 'reflect-metadata';

import _ from 'lodash';
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from 'debug';
import { type IMibDeviceType, getMib } from '@nibus/mibs';
import Address, { AddressParam } from '../Address';
import { LogLevel, delay, noop, toMessage } from '../common';
import type { BrightnessHistory, Display, Host, PortArg } from '../ipc';
import { DeviceId, Devices, IDevice, toInt } from '../mib';
import { INibusConnection, NibusConnection } from '../nibus';
import type { NibusEvents, VersionInfo } from '../nibus/NibusConnection';
import { NmsDatagram, NmsServiceType } from '../nms';
import { Category } from './KnownPorts';
import { IPCClient as Client } from '../ipc/Client';

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
  health: (health: Record<string, unknown>) => void;
}

// noinspection JSUnusedLocalSymbols
export interface INibusSession {
  on<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
  once<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
  off<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;

  readonly ports: number;
  start(port?: number, host?: string): Promise<number>;
  close(): void;
  ping(address: AddressParam): Promise<readonly [-1, undefined] | readonly [number, VersionInfo]>;
  reloadDevices(): void;
  setLogLevel(logLevel: LogLevel): void;
  saveConfig(config: Record<string, unknown>): void;
  getBrightnessHistory(dt?: number): Promise<BrightnessHistory[]>;
  readonly devices: Devices;
  readonly host?: string;
  readonly port: number;
}

export class NibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
  private readonly connections: INibusConnection[] = [];

  private readonly nmsListeners = new Map<INibusConnection, NibusEvents['nms']>();

  private isStarted = false;

  private socket?: Client;

  public readonly devices = new Devices();

  constructor(
    readonly port: number,
    readonly host?: string
  ) {
    super();
    this.devices.on('new', device => {
      const connectHandler = (): void => {
        this.emit('connected', device);
      };
      const disconnectHandler = (): void => {
        this.emit('disconnected', device);
      };
      device.on('disconnected', disconnectHandler);
      device.on('connected', connectHandler);
      device.once('release', () => {
        device.off('connected', connectHandler);
        device.off('disconnected', disconnectHandler);
      });
    });
    this.devices.on('delete', device => {
      if (device.connection) {
        device.connection = undefined;
      }
    });
  }

  get ports(): number {
    return this.connections.length;
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.isStarted) {
        resolve(this.connections.length);
        return;
      }
      const { port, host } = this;
      this.socket = Client.connect({
        port,
        host,
      });
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
      this.socket.on('health', health => this.emit('health', health));
    });
  }

  private connectDevice(device: IDevice, connection: INibusConnection): void {
    if (device.connection === connection) return;
    device.connection = connection;
    const event = connection ? 'connected' : 'disconnected';
    process.nextTick(() => this.emit(event, device));
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
    }
  }

  async ping(
    address: AddressParam
  ): Promise<readonly [-1, undefined] | readonly [number, VersionInfo]> {
    const { connections } = this;
    const addr = new Address(address);
    if (connections.length === 0) return Promise.resolve([-1, undefined]);
    return Promise.race(connections.map(connection => connection.ping(addr)));
  }

  reloadDevices(): void {
    this.socket?.send('reloadDevices');
  }

  setLogLevel(logLevel: LogLevel): void {
    this.socket?.send('setLogLevel', logLevel);
  }

  saveConfig(config: Record<string, unknown>): void {
    this.socket?.send('config', config);
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
      const message = toMessage(e);
      console.error((e as Error).stack);
      debug(`error while new connection: ${message}`);
    }
  };

  private closeConnection(connection: INibusConnection): void {
    connection.close();
    const nmsListener = this.nmsListeners.get(connection);
    if (nmsListener) connection.off('nms', nmsListener);
    this.devices
      .get()
      .filter(device => device.connection === connection)
      .forEach(device => {
        // eslint-disable-next-line no-param-reassign
        device.connection = undefined;
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
      descriptions
        .reduce<Promise<boolean>>(async (acc, desc) => {
          // debug(`find ${JSON.stringify(connection.description)} ${baseCategory}`);
          const prev = await acc;
          if (prev) return prev;
          if (baseCategory && connection.description.category !== baseCategory) return false;
          const { category } = desc;
          switch (desc.find) {
            case 'sarp': {
              let { type } = desc;
              if (type === undefined) {
                if (!desc.mib) throw new Error('Unknown mib');
                const mib = getMib(desc.mib);
                if (!mib) throw new Error(`Unknown mib: ${desc.mib}`);
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
                return true;
              } catch (e) {
                debug(`SARP error: ${toMessage(e)}, ${JSON.stringify(connection.description)}`);
                if (!connection.isClosed && descriptions.length === 1)
                  setTimeout(() => tryFind(), 5000);
              }
              return false;
            }
            case 'version':
              try {
                const { type, source: address } =
                  (await connection.getVersion(Address.empty)) ?? {};
                if (desc.type === type && address) {
                  connection.description = desc;
                  this.emit('found', {
                    connection,
                    category: category as Category,
                    address,
                  });
                  debug(`device ${category}[${address}] was found on ${connection.path}`);
                  return true;
                }
              } catch (err) {
                console.error(err);
                this.emit('pureConnection', connection);
              }
              return false;
            default:
              this.emit('pureConnection', connection);
              return true;
          }
        }, Promise.resolve(false))
        .catch(e => debug(`error while find ${e.message}`));
    };
    tryFind();
  }
}

const sessions = new Map<string, INibusSession>();

const getKey = (port: number, host?: string): string => `${host ?? ''}:${port}`;

let defaultSession: INibusSession | undefined;

export const getNibusSession = (
  port = +(process.env.NIBUS_PORT ?? 9001),
  host: string | undefined = undefined
): INibusSession => {
  const key = getKey(port, host);
  if (!sessions.has(key)) {
    const session = new NibusSession(port, host);
    session.once('close', () => {
      if (sessions.has(key)) sessions.delete(key);
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
