/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Socket, SocketConstructorOpts } from 'net';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
// import xpipe from 'xpipe';
import { LogLevel, MSG_DELIMITER } from '../common';

import debugFactory from '../debug';
import { ClientEventsArgs } from './clientEvents';
import { Display, EventFromString, Host, PortArg } from './events';

const debug = debugFactory('nibus:IPCClient');

const PING_TIMEOUT = 500;

interface ServerEvents {
  ports: (ports: PortArg[]) => void;
  add: (port: PortArg) => void;
  remove: (port: PortArg) => void;
  logLevel: (level: LogLevel) => void;
  config: (config: Record<string, unknown>) => void;
  host: (host: Host) => void;
  log: (line: string) => void;
  online: (isOnline: boolean) => void;
  displays: (value: Display[]) => void;
  health: (health: Record<string, unknown>) => void;
}

export interface Client {
  on<U extends keyof ServerEvents>(event: U, listener: ServerEvents[U]): this;
  once<U extends keyof ServerEvents>(event: U, listener: ServerEvents[U]): this;
  off<U extends keyof ServerEvents>(event: U, listener: ServerEvents[U]): this;
  emit<U extends keyof ServerEvents>(event: U, ...args: Parameters<ServerEvents[U]>): boolean;
}

type RemoteServer = {
  host?: string;
  port: number;
};

export default class IPCClient extends Socket implements Client {
  timeoutTimer = 0;

  private online = false;

  private tail = '';

  protected constructor(readonly host = 'localhost', options?: SocketConstructorOpts) {
    super(options);
    this.on('data', this.parseEvents);
  }

  get isOnline(): boolean {
    return this.online;
  }

  static connect(remoteServer: RemoteServer, connectionListener?: () => void): IPCClient {
    const client = new IPCClient();
    client.connect(remoteServer.port, remoteServer.host ?? 'localhost', () => {
      client.setNoDelay();
      if (remoteServer.host) {
        const pingTimer = setInterval(() => {
          client.send('ping').catch(() => {});
          window.clearTimeout(client.timeoutTimer);
          client.timeoutTimer = window.setTimeout(() => {
            client.setOnline(false);
          }, PING_TIMEOUT);
        }, PING_TIMEOUT * 2);
        client.on('end', () => {
          clearInterval(pingTimer);
        });
      } else {
        client.setOnline(true);
      }
      client.write('NIBUS');
      connectionListener && connectionListener();
    });
    client.once('error', error => {
      debug(`<error> ${error.message}`);
    });
    return client;
  }

  setOnline(value: boolean): void {
    if (this.online !== value) {
      this.online = value;
      this.emit('online', value);
    }
  }

  parseEvents = (data: Buffer): void => {
    // console.log('CLIENT');
    // console.log(data.toString());
    const chunks = data.toString().split(MSG_DELIMITER);
    chunks[0] = this.tail + chunks[0];
    [this.tail] = chunks.splice(-1, 1);
    chunks
      .filter(line => line && line.trim().length > 0)
      .forEach(line => {
        const result = EventFromString.decode(line);
        if (isLeft(result)) {
          debug(`Unknown event: ${PathReporter.report(result)}`);
          console.info(`Unknown event: ${line}`);
          return;
        }
        const {
          right: { event, args },
        } = result;
        if (event === 'pong') {
          clearTimeout(this.timeoutTimer);
          this.setOnline(true);
        } else this.emit(event, ...args);
      });
  };

  send(...[event, ...args]: ClientEventsArgs): Promise<void> {
    const data = {
      event,
      args,
    };
    return new Promise(resolve => {
      this.write(`${JSON.stringify(data)}${MSG_DELIMITER}`, () => resolve());
    });
  }
}
