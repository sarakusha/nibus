/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { ClientEventsArgs, ClientEventsArgsV, LogLevel, MSG_DELIMITER } from '@nibus/core';
import { isRight } from 'fp-ts/lib/Either';
import net, { Server, Socket } from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import debugFactory from 'debug';
import type SerialTee from './SerialTee';
// import { Direction } from './SerialTee';

const debug = debugFactory('nibus:IPCServer');

interface IPCServerEvents {
  connection: (socket: Socket) => void;
  'client:error': (socket: Socket, err: Error) => void;
  'client:setLogLevel': (
    client: Socket,
    logLevel: LogLevel | undefined
    // pickFields: Fields,
    // omitFields: Fields,
  ) => void;
  'client:reloadDevices': (socket: Socket) => void;
  'client:config': (socket: Socket, config: Record<string, unknown>) => void;
  'client:getBrightnessHistory': (socket: Socket, dt?: number) => void;
  // 'client:ping': (socket: Socket) => void;
  raw: (data: Buffer /*, dir: Direction*/) => void;
}

/*
interface IPCServer {
  on<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
  once<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
  off<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
  emit<U extends keyof IPCServerEvents>(event: U, ...args: Parameters<IPCServerEvents[U]>): boolean;
  emit(clientEvent: ClientEvent, socket: Socket, ...args: unknown[]): boolean;
}
*/

class IPCServer extends TypedEmitter<IPCServerEvents> /* extends Duplex */ {
  ports: Record<string, SerialTee> = {};

  private readonly clients: Socket[];

  private readonly server: Server;

  private closed = false;

  private tail = '';

  // private reading = false;

  constructor() {
    super();
    this.clients = [];
    this.server = net
      .createServer(this.connectionHandler)
      // .on('error', this.errorHandler)
      .on('close', this.close);
    // .listen({ port, host }, () => {
    //   debug('listening on %o', this.server.address());
    // });
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  public get path(): string {
    return JSON.stringify(this.server.address());
  }

  listen(port: number, host?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(
        {
          port,
          host,
        },
        () => {
          debug('listening on %o', this.server.address());
          this.server.off('error', reject);
          resolve();
        }
      );
    });
  }

  // eslint-disable-next-line no-underscore-dangle
  /*
    _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
      this.emit('raw', chunk, Direction.out);
      this.clients.forEach(client => client.write(chunk, encoding, noop));
      callback();
    }

    // eslint-disable-next-line no-underscore-dangle
    _read(_size: number): void {
      this.reading = true;
    }
  */

  send(client: Socket, event: string, ...args: unknown[]): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error('Server closed'));
    }
    if (client.destroyed) {
      return Promise.resolve();
    }
    const data = {
      event,
      args,
    };
    return new Promise(resolve => {
      try {
        client.write(`${JSON.stringify(data)}${MSG_DELIMITER}`, () => resolve());
      } catch (err) {
        debug(`error while send ${JSON.stringify(data)}`);
        resolve();
      }
    });
  }

  broadcast(event: string, ...args: unknown[]): Promise<void> {
    return Promise.all(this.clients.map(client => this.send(client, event, ...args))).then(
      () => {}
    );
  }

  close = (): void => {
    if (this.closed) return;
    this.closed = true;
    const path = this.server.address();
    this.clients.forEach(client => client.destroy());
    this.clients.length = 0;
    this.server.close();
    // Хак, нужен чтобы успеть закрыть все соединения, иначе не успевает их закрыть и выходит
    // setTimeout(() => Object.values(this.ports).forEach(serial => serial.close()), 0);
    Object.values(this.ports).forEach(serial => serial.close());
    // this.raw && this.push(null);
    debug(`${JSON.stringify(path)} closed`);
  };

  private connectionHandler = (socket: Socket): void => {
    const addClient = (): void => {
      this.clients.push(socket);
      this.emit('connection', socket);
      debug(`${socket.remoteAddress} connected`);
    };
    let waitingPreamble = true;
    const clientErrorHandler = (err: Error): void => {
      debug('error on client %s', err.message);
      this.emit('client:error', socket, err);
    };
    const clientDataHandler = (data: Buffer): void => {
      if (waitingPreamble) {
        waitingPreamble = false;
        const preamble = data.toString();
        if (preamble === 'NIBUS') addClient();
        else {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          removeClient();
          const serial = this.ports[preamble];
          if (serial) {
            serial.addConnection(socket);
          }
        }
        return;
      }
      // if (this.reading) {
      //   this.reading = this.push(data);
      // }
      // if (this.raw) {
      //   this.emit('raw', data, Direction.in);
      //   return;
      // }
      // console.log('SERVER');
      // console.log(data.toString())
      const chunks = data.toString().split(MSG_DELIMITER);
      chunks[0] = this.tail + chunks[0];
      [this.tail] = chunks.splice(-1, 1);
      chunks
        .filter(line => line && line.trim().length > 0)
        .forEach(line => {
          try {
            const { event, args } = JSON.parse(line);
            const res = ClientEventsArgsV.decode([event, ...args].filter(item => !!item));
            if (isRight(res)) {
              const [name, ...opts]: ClientEventsArgs = res.right;
              if (name === 'ping') {
                this.send(socket, 'pong').catch(console.error);
              } else {
                this.emit(`client:${name}`, ...([socket, ...opts] as never));
              }
            }
          } catch (err) {
            debug(`error while parse ${line}`);
          }
        });
    };
    const removeClient = (): void => {
      const index = this.clients.findIndex(item => item === socket);
      if (index !== -1) {
        this.clients.splice(index, 1);
        debug(`${socket.remoteAddress} disconnected`);
      }
      socket.off('error', clientErrorHandler);
      socket.off('data', clientDataHandler);
      socket.off('end', removeClient);
      // socket.destroy();
    };
    socket
      .once('error', clientErrorHandler)
      .on('data', clientDataHandler)
      .once('end', removeClient);
  };

  /*
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
  */
}

export default IPCServer;
