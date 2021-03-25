/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { IKnownPort, MibDescription } from '@nibus/core';
import { Socket } from 'net';
import SerialPort, { OpenOptions } from 'serialport';
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from '../debug';

const debug = debugFactory('nibus:serial-tee');
const portOptions: OpenOptions = {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
};

// eslint-disable-next-line no-shadow
export enum Direction {
  in,
  out,
}

export interface SerialLogger {
  (data: Buffer, dir: Direction): void;
}

interface SerialTeeEvents {
  close: (path: string) => void;
}

export default class SerialTee extends TypedEmitter<SerialTeeEvents> {
  private readonly serial: SerialPort;

  private readonly connections: Socket[] = [];

  private closed = false;

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
      err => {
        if (err) {
          debug(`error while open serial port: ${err.message}`);
          process.platform === 'linux' &&
            debug(
              `WARNING! You would add user '${process.env.USER}' to the dialout group: "sudo usermode -aG dialout ${process.env.USER}"`
            );
          this.close();
        }
      }
    );
    this.serial.on('close', this.close);
    this.serial.on('error', this.close);
    this.serial.on('data', this.broadcast);
    debug(`create serial tee on ${path} baud: ${this.serial.baudRate} (${description.category})`);
  }

  public get path(): string {
    return this.portInfo.path;
  }

  public close = (): void => {
    if (this.closed) return;
    const { serial } = this;
    if (serial.isOpen) {
      debug('close serial', serial.path);
      serial.close();
    }
    const connections = this.connections.slice();
    this.connections.length = 0;
    connections.forEach(socket => this.releaseSocket(socket));
    this.closed = true;
    this.emit('close', this.portInfo.path);
  };

  public setLogger(logger: SerialLogger | null): void {
    // if (this.logger) {
    //   this.server.off('raw', this.logger);
    // }
    this.logger = logger;
    // if (this.logger) {
    //   this.server.on('raw', this.logger);
    // }
  }

  toJSON(): { portInfo: IKnownPort; description: MibDescription } {
    const { portInfo, description } = this;
    return {
      portInfo,
      description,
    };
  }

  broadcast = (data: Buffer): void => {
    const { logger, closed, connections } = this;
    if (closed) return;
    connections.forEach(socket => socket.write(data));
    logger && logger(data, Direction.out);
  };

  send = (data: Buffer): void => {
    const { logger, closed, serial } = this;
    if (closed) return;
    serial.write(data);
    logger && logger(data, Direction.in);
  };

  private releaseSocket(socket: Socket): void {
    socket.off('data', this.send);
    socket.destroyed || socket.destroy();
    const index = this.connections.findIndex(item => item === socket);
    if (index !== -1) this.connections.splice(index, 1);
  }

  addConnection(socket: Socket): void {
    const { closed, connections } = this;
    if (closed) return;
    connections.push(socket);
    socket.on('data', this.send);
    socket.once('close', () => this.releaseSocket(socket));
  }
}
