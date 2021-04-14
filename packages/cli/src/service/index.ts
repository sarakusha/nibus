/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
/* eslint-disable no-bitwise */
import {
  Config,
  Fields,
  getMibFile,
  getMibs,
  IKnownPort,
  IMibDeviceType,
  LogLevel,
  MibDeviceV,
  NibusDatagram,
  NibusDecoder,
  printBuffer,
  toInt,
} from '@nibus/core';
import Configstore from 'configstore';
import { isLeft } from 'fp-ts/lib/Either';
import fs from 'fs';
import _ from 'lodash';
import { Socket } from 'net';
import os from 'os';
import { createInterface } from 'readline';
import Bonjour from 'bonjour-hap';

import debugFactory from '../debug';
import { SerialTee, Server, Direction, SerialLogger } from '../ipc';

import detector from './detector';

// eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
const { version } = require('../../package.json');

const bonjour = Bonjour();
const pkgName = '@nata/nibus.js'; // = require('../../package.json');
const conf = new Configstore(pkgName, {
  logLevel: 'none',
  omit: ['priority'],
});

// debugFactory.enable('nibus:detector,nibus.service');
const debug = debugFactory('nibus:service');
const debugIn = debugFactory('nibus:<<<');
const debugOut = debugFactory('nibus:>>>');

debug(`config path: ${conf.path}`);

const noop = (): void => {};

if (process.platform === 'win32') {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
}

const minVersionToInt = (str?: string): number => {
  if (!str) return 0;
  const [high, low] = str.split('.', 2);
  return (toInt(high) << 8) + toInt(low);
};

async function updateMibTypes(): Promise<void> {
  const mibs = await getMibs();
  conf.set('mibs', mibs);
  const mibTypes: Config['mibTypes'] = {};
  mibs.forEach(mib => {
    const mibfile = getMibFile(mib);
    const validation = MibDeviceV.decode(JSON.parse(fs.readFileSync(mibfile).toString()));
    if (isLeft(validation)) {
      debug(`<error>: Invalid mib file ${mibfile}`);
    } else {
      const { types } = validation.right;
      const device = types[validation.right.device] as IMibDeviceType;
      const type = toInt(device.appinfo.device_type);
      const minVersion = minVersionToInt(device.appinfo.min_version);
      const currentMibs = mibTypes[type] || [];
      currentMibs.push({
        mib,
        minVersion,
      });
      mibTypes[type] = _.sortBy(currentMibs, 'minVersion');
    }
  });
  conf.set('mibTypes', mibTypes);
}

updateMibTypes().catch(e => debug(`<error> ${e.message}`));

// const direction = (dir: Direction) => dir === Direction.in ? '<<<' : '>>>';
const decoderIn = new NibusDecoder();
decoderIn.on('data', (datagram: NibusDatagram) => {
  debugIn(
    datagram.toString({
      pick: conf.get('pick') as Fields,
      omit: conf.get('omit') as Fields,
    })
  );
});
const decoderOut = new NibusDecoder();
decoderOut.on('data', (datagram: NibusDatagram) => {
  debugOut(
    datagram.toString({
      pick: conf.get('pick') as Fields,
      omit: conf.get('omit') as Fields,
    })
  );
});

const loggers = {
  none: null,
  hex: (data: Buffer, dir: Direction) => {
    switch (dir) {
      case Direction.in:
        debugIn(printBuffer(data));
        break;
      case Direction.out:
        debugOut(printBuffer(data));
        break;
      default:
        console.warn('invalid direction', dir);
        break;
    }
  },
  nibus: (data: Buffer, dir: Direction) => {
    switch (dir) {
      case Direction.in:
        decoderIn.write(data);
        break;
      case Direction.out:
        decoderOut.write(data);
        break;
      default:
        console.warn('invalid direction', dir);
        break;
    }
  },
};

export class NibusService {
  readonly port = +(process.env.NIBUS_PORT ?? 9001);

  public readonly server: Server;

  private isStarted = false;

  private ad?: Bonjour.Service;

  constructor() {
    this.server = new Server();
    this.server.on('connection', this.connectionHandler);
    this.server.on('client:setLogLevel', this.logLevelHandler);
    this.server.on('client:reloadDevices', this.reload);
  }

  get path(): string {
    return this.server.path;
  }

  updateLogger(connection?: SerialTee): void {
    const logger: SerialLogger | null = loggers[conf.get('logLevel') as LogLevel];
    const connections = connection ? [connection] : Object.values(this.server.ports);
    connections.forEach(con => con.setLogger(logger));
  }

  public async start(): Promise<void> {
    if (this.isStarted) return;
    await this.server.listen(this.port, process.env.NIBUS_HOST);
    this.isStarted = true;
    this.ad = bonjour.publish({
      name: os.hostname().replace(/\.local\.?$/, ''),
      type: 'nibus',
      port: this.port,
      txt: { version },
    });
    const detection = detector.getDetection();
    if (detection == null) throw new Error('detection is N/A');
    detector.on('add', this.addHandler);
    detector.on('remove', this.removeHandler);

    detector.start();
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
    debug('started');
    await detector.getPorts();
  }

  public stop(): void {
    if (!this.isStarted) return;
    if (this.ad) {
      this.ad.stop();
      this.ad = undefined;
    }
    // Нельзя сразу уничтожать иначе не отправится event:down
    // bonjour.unpublishAll();
    // bonjour.destroy();
    this.server.close();
    // const connections = this.connections.splice(0, this.connections.length);
    // if (connections.length) {
    //   // Хак, нужен чтобы успеть закрыть все соединения, иначе не успевает их закрыть и выходит
    //   setTimeout(() => {
    //     connections.forEach(connection => connection.close());
    //   }, 0);
    // }
    detector.removeListener('add', this.addHandler);
    detector.removeListener('remove', this.removeHandler);
    detector.stop();
    this.server.close();
    this.isStarted = false;
    debug('stopped');
  }

  // eslint-disable-next-line class-methods-use-this
  reload(): void {
    detector.reload();
  }

  private logLevelHandler = (
    client: Socket,
    logLevel: LogLevel | undefined
    // pickFields: Fields,
    // omitFields: Fields
  ): void => {
    debug(`setLogLevel: ${logLevel}`);
    if (logLevel) {
      conf.set('logLevel', logLevel);
      this.server
        .broadcast('logLevel', logLevel)
        .catch(e => debug(`error while broadcast: ${e.message}`));
    }
    // pickFields && conf.set('pick', pickFields);
    // omitFields && conf.set('omit', omitFields);
    this.updateLogger();
  };

  private connectionHandler = (socket: Socket): void => {
    const { server } = this;
    server
      .send(
        socket,
        'ports',
        Object.values(server.ports).map(port => port.toJSON())
      )
      .catch(err => debug(`<error> while send 'ports': ${err.message}`));
    server
      .send(socket, 'host', {
        name: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        version: os.version(),
      })
      .catch(err => debug(`<error> while send 'host': ${err.message}`));
    debug(`logLevel`, conf.get('logLevel'));
    server
      .send(socket, 'logLevel', conf.get('logLevel'))
      .catch(e => debug(`error while send logLevel ${e.message}`));
  };

  private addHandler = (portInfo: IKnownPort): void => {
    const { category } = portInfo;
    const mibCategory = detector.getDetection()!.mibCategories[category!];
    if (mibCategory) {
      const serial = new SerialTee(portInfo, mibCategory);
      serial.on('close', (path: string) => this.removeHandler({ path }));
      this.server.ports[serial.path] = serial;
      this.server.broadcast('add', serial.toJSON()).catch(noop);
      this.updateLogger(serial);
      // this.find(connection);
    }
  };

  private removeHandler = ({ path }: { path: string }): void => {
    const serial = this.server.ports[path];
    if (serial) {
      delete this.server.ports[path];
      serial.close();
      this.server.broadcast('remove', serial.toJSON()).catch(noop);
    }
  };
}

const service = new NibusService();

export { detectionPath } from './detector';

export default service;
