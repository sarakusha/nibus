/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Fields, LogLevel } from '@nibus/core';
import fs from 'fs';
import net, { Server, Socket } from 'net';
import { Duplex } from 'stream';
import xpipe from 'xpipe';
import debugFactory from '../debug';

const debug = debugFactory('nibus:IPCServer');
const noop = (): void => {};

// eslint-disable-next-line no-shadow
export enum Direction {
  in,
  out,
}

export type ClientEvent = `client:${string}`;

interface IPCServerEvents {
  connection: (socket: Socket) => void;
  'client:error': (socket: Socket, err: Error) => void;
  'client:setLogLevel': (
    client: Socket,
    logLevel: LogLevel | undefined,
    pickFields: Fields,
    omitFields: Fields,
  ) => void;
  'client:reloadDevices': () => void;
  raw: (data: Buffer, dir: Direction) => void;
}

interface IPCServer {
  on<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
  once<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
  off<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
  emit<U extends keyof IPCServerEvents>(event: U, ...args: Parameters<IPCServerEvents[U]>): boolean;
  emit(clientEvent: ClientEvent, socket: Socket, ...args: unknown[]): boolean;
}

class IPCServer extends Duplex {
  private readonly server: Server;

  private readonly clients: Socket[];

  private closed = false;

  private reading = false;

  constructor(port: number, raw?: boolean)

  constructor(path: string, raw?: boolean)

  constructor(pathOrPort: number | string, private readonly raw = false) {
    super();
    this.clients = [];
    // this.server = new Server();
    this.server = net
      .createServer(this.connectionHandler)
      .on('error', this.errorHandler)
      .on('close', this.close)
      .listen(typeof pathOrPort === 'string' ? xpipe.eq(pathOrPort) : {
        host: 'localhost',
        port: pathOrPort,
      }, () => {
        debug('listening on', this.server.address());
      });
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  public get path(): string {
    return (this.server.address() || '').toString();
  }

  // eslint-disable-next-line no-underscore-dangle
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.emit('raw', chunk, Direction.out);
    this.clients.forEach(client => client.write(chunk, encoding, noop));
    callback();
  }

  // eslint-disable-next-line no-underscore-dangle
  _read(_size: number): void {
    this.reading = true;
  }

  send(client: Socket, event: string, ...args: unknown[]): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error('Server is closed'));
    }
    const data = {
      event,
      args,
    };
    return new Promise(resolve => client.write(`${JSON.stringify(data)}\n`, () => resolve()));
  }

  broadcast(event: string, ...args: unknown[]): Promise<void> {
    return Promise.all(
      this.clients.map(client => this.send(client, event, ...args)),
    ).then(() => {});
  }

  close = (): void => {
    if (this.closed) return;
    const path = this.server.address();
    this.clients.forEach(client => client.destroy());
    this.clients.length = 0;
    this.server.close();
    this.raw && this.push(null);
    this.closed = true;
    debug(`${path} closed`);
  };

  private connectionHandler = (socket: Socket): void => {
    this.emit('connection', socket);
    this.clients.push(socket);
    const clientErrorHandler = (err: Error): void => {
      debug('error on client', err.message);
      this.emit('client:error', socket, err);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      removeClient();
    };
    const clientDataHandler = (data: Buffer): void => {
      if (this.reading) {
        this.reading = this.push(data);
      }
      if (this.raw) {
        this.emit('raw', data, Direction.in);
        return;
      }
      // debug('event from', socket.remoteAddress ?? socket.localAddress, data.toString());
      const {
        event,
        args,
      } = JSON.parse(data.toString());
      this.emit(`client:${event}` as ClientEvent, socket, ...args);
    };
    const removeClient = (): void => {
      const index = this.clients.findIndex(item => item === socket);
      if (index !== -1) {
        this.clients.splice(index, 1);
      }
      socket.off('error', clientErrorHandler);
      socket.off('data', clientDataHandler);
      socket.off('close', removeClient);
      socket.destroy();
      debug('destroy connection on', this.path, this.clients.length);
    };
    socket
      .once('error', clientErrorHandler)
      .on('data', clientDataHandler)
      .once('close', removeClient);
    debug('new connection on', this.path, this.clients.length);
  };

  private errorHandler = (err: Error): void => {
    const { code } = err as unknown as { code: string };
    if (code === 'EADDRINUSE') {
      const check = net.connect(xpipe.eq(this.path), () => {
        debug('Server running, giving up...');
        process.exit();
      });
      check.once('error', e => {
        const { code: errCode } = e as unknown as { code: string };
        if (errCode === 'ECONNREFUSED') {
          fs.unlinkSync(xpipe.eq(this.path));
          this.server.listen(xpipe.eq(this.path), () => {
            debug('restart', this.server.address());
          });
        }
      });
    } else {
      throw err;
    }
  };
}

export default IPCServer;
