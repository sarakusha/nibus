/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
/* eslint-disable no-bitwise */
import { IKnownPort, LogLevel } from '@nibus/core';
// eslint-disable-next-line import/no-unresolved
import { config } from '@nibus/core/config';
import { Socket } from 'net';
import os from 'os';
import { createInterface } from 'readline';
import { type CiaoService, getResponder } from '@homebridge/ciao';

// import { command as execaCommand, ExecaReturnValue } from 'execa';

import debugFactory from 'debug';
import { SerialTee, Server } from '../ipc';

import detector from './detector';

// eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
const version = process.env.npm_package_version ?? 'N/A';

const responder = getResponder();
const debug = debugFactory('nibus:service');
// const debugIn = debugFactory('nibus:<<<');
// const debugOut = debugFactory('nibus:>>>');

const noop = (): void => {};

/*
const UsbDk = 'UsbDk Runtime Libraries';
const started = new Date().toISOString();

let firstCheck = true;
let checkRequired = process.platform === 'win32';
let ready = Promise.resolve();

const checkResult =(verifier: (stdout: string) => boolean) => (result: ExecaReturnValue) => {
  if (result.failed) throw new Error(result.stderr);
  else return verifier(result.stdout);
}

const checkUsbImpl = async (): Promise<void> => {
  if (!checkRequired) return;
  let result: boolean;
  if (firstCheck) {
    firstCheck = false;
    result = await execaCommand(
      `Get-WmiObject -Class Win32_Product | Where Name -eq '${UsbDk}' | Select -ExpandProperty Version`,
      {
        shell: 'powershell.exe',
        windowsHide: true,
      },
    ).then(checkResult(stdout => /\d+\.\d+\.\d+/.test(stdout)));
  } else {
    result = await execaCommand(
      `Get-WinEvent -ProviderName msiinstaller | Where-Object {$_.id -eq 1033 -and $_.timecreated -ge ${started} -and $_.message -like '*${UsbDk}*'} | Select -ExpandProperty Message`,
      {
        shell: 'powershell.exe',
        windowsHide: true,
      },
    ).then(checkResult(stdout => !!stdout));
  }
  if (result) {
    checkRequired = false;
  }
  if (!result) throw new Error(`Install the latest USB driver: https://github.com/daynix/UsbDk/releases/latest`);
};

const checkUsb = (): Promise<void> => {
  ready = ready.finally().then(checkUsbImpl);
  return ready;
};
*/

if (process.platform === 'win32') {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
  // checkUsb().catch(noop);
}

// const direction = (dir: Direction) => dir === Direction.in ? '<<<' : '>>>';
/*
const decoderIn = new NibusDecoder();
decoderIn.on('data', (datagram: NibusDatagram) => {
  debugIn(
    datagram.toString({
      pick: config().get('pick') as Fields,
      omit: config().get('omit') as Fields,
    })
  );
});
const decoderOut = new NibusDecoder();
decoderOut.on('data', (datagram: NibusDatagram) => {
  debugOut(
    datagram.toString({
      pick: config().get('pick') as Fields,
      omit: config().get('omit') as Fields,
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
*/

export class NibusService {
  readonly port = +(process.env.NIBUS_PORT ?? 9001);

  public readonly server: Server;

  private isStarted = false;

  private readonly ciaoService: CiaoService;

  private token?: string;

  constructor() {
    this.server = new Server();
    this.server.on('connection', this.connectionHandler);
    this.server.on('client:setLogLevel', this.logLevelHandler);
    this.server.on('client:reloadDevices', this.reload);
    this.ciaoService = responder.createService({
      name: 'nibus',
      // hostname: `nibus.local`,
      type: 'nibus',
      port: this.port,
      txt: {
        version,
        original: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        osVersion: os.version(),
      },
    });
    this.ciaoService.on('name-change', () => {});
  }

  get path(): string {
    return this.server.path;
  }

  /*
    updateLogger(connection?: SerialTee): void {
      const logger: SerialLogger | null = loggers[config().get('logLevel') as LogLevel];
      const connections = connection ? [connection] : Object.values(this.server.ports);
      connections.forEach(con => con.setLogger(logger));
    }
  */

  public async start(token?: string): Promise<void> {
    if (this.isStarted) return;
    // await checkUsb();
    this.token = token;
    await this.server.listen(this.port, process.env.NIBUS_HOST);
    this.isStarted = true;
    this.ciaoService.advertise().then(() => debug('service is published'));
    const detection = detector.getDetection();
    if (detection == null) throw new Error('detection is N/A');
    detector.on('add', this.addHandler);
    detector.on('remove', this.removeHandler);

    detector.start();
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
    debug('started');
    // console.log('nibus started');
    await detector.getPorts();
  }

  public stop(): void {
    if (!this.isStarted) return;
    this.ciaoService.end();
    responder.shutdown();
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
    const prev = config().get('logLevel');
    if (prev !== logLevel) debug(`setLogLevel: ${logLevel}/${prev}`);
    if (logLevel) {
      config().set('logLevel', logLevel);
      this.server
        .broadcast('logLevel', logLevel)
        .catch(e => debug(`error while broadcast: ${e.message}`));
    }
    // pickFields && config.set('pick', pickFields);
    // omitFields && config.set('omit', omitFields);
    // this.updateLogger();
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
        token: this.token,
      })
      .catch(err => debug(`<error> while send 'host': ${err.message}`));
    debug(`logLevel: ${config().get('logLevel')}`);
    server
      .send(socket, 'logLevel', config().get('logLevel'))
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
      // this.updateLogger(serial);
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

export default service;
