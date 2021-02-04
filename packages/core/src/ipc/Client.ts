/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Socket, SocketConstructorOpts } from 'net';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import xpipe from 'xpipe';
import { LogLevel } from '../common';

import debugFactory from '../debug';
import { EventFromString, PortArg } from './events';

const debug = debugFactory('nibus:IPCClient');

interface ClientEvents {
  ports: (ports: PortArg[]) => void;
  add: (port: PortArg) => void;
  remove: (port: PortArg) => void;
  logLevel: (level: LogLevel) => void;
}

export interface Client {
  on<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
  once<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
  off<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
  emit<U extends keyof ClientEvents>(event: U, ...args: Parameters<ClientEvents[U]>): boolean;
}

export default class IPCClient extends Socket implements Client {
  protected constructor(options?: SocketConstructorOpts) {
    super(options);
    this.on('data', this.parseEvents);
  }

  parseEvents = (data: Buffer): void => {
    data
      .toString()
      .split('\n')
      .filter(line => line && line.trim().length > 0)
      .forEach(line => {
        const result = EventFromString.decode(line);
        if (isLeft(result)) {
          debug(`Unknown event: ${PathReporter.report(result)}`);
          return;
        }
        const {
          right: { event, args },
        } = result;
        this.emit(event, ...args);
      });
  };

  send(event: string, ...args: unknown[]): Promise<void> {
    const data = {
      event,
      args,
    };
    return new Promise(resolve => this.write(JSON.stringify(data), () => resolve()));
  }

  static connect(path: string, connectionListener?: () => void): IPCClient {
    const client = new IPCClient();
    return client.connect(xpipe.eq(path), connectionListener);
  }
}
