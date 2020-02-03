/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import SerialPort, { OpenOptions } from 'serialport';
import { EventEmitter } from 'events';
import { getSocketPath, IKnownPort, MibDescription } from '@nibus/core';
import debugFactory from '../debug';
import Server, { Direction } from './Server';


const debug = debugFactory('nibus:serial-tee');
const portOptions: OpenOptions = {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
};

export interface SerialLogger {
  (data: Buffer, dir: Direction): void;
}

// declare module serialport {
//   interface SerialPort {
//     write(
//       data: string | Uint8Array | Buffer,
//       callback?: (error: any, bytesWritten: number) => void): boolean;
//     write(
//       buffer: string | Uint8Array | Buffer,
//       encoding?: 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'base64' | 'binary' | 'hex',
//       callback?: (error: any, bytesWritten: number) => void): boolean;
//     test: () => void;
//   }
// }

export default class SerialTee extends EventEmitter {
  private readonly serial: SerialPort;

  private closed = false;

  private readonly server: Server;

  private logger: SerialLogger | null = null;

  constructor(public readonly portInfo: IKnownPort, public readonly description: MibDescription) {
    super();
    const { path } = portInfo;
    const win32 = (process.platform === 'win32' && description.win32) || {};
    this.serial = new SerialPort(
      path,
      {
        ...portOptions,
        baudRate: description.baudRate || 115200,
        parity: win32.parity || description.parity || portOptions.parity,
      },
    );
    this.serial.on('close', this.close);
    this.server = new Server(getSocketPath(path), true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.server.pipe(this.serial as any);
    this.serial.pipe(this.server);
    debug(`new connection on ${path} baud: ${this.serial.baudRate} (${description.category})`);
  }

  public get path(): string {
    return this.server.path;
  }

  public close = (): void => {
    if (this.closed) return;
    const { serial, server } = this;
    if (serial.isOpen) {
      debug('close serial', serial.path);
      serial.close();
    }
    server.close();
    this.closed = true;
    this.emit('close', this.portInfo.path);
  };

  public setLogger(logger: SerialLogger | null): void {
    if (this.logger) {
      this.server.off('raw', this.logger);
    }
    this.logger = logger;
    if (this.logger) {
      this.server.on('raw', this.logger);
    }
  }

  toJSON(): { portInfo: IKnownPort; description: MibDescription } {
    const { portInfo, description } = this;
    return {
      portInfo,
      description,
    };
  }
}
