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

import debugFactory from 'debug';
import { EventFromString, PortArg } from './events';

const debug = debugFactory('nibus:IPCClient');

export interface Client {
  addListener(event: 'ports', listener: (ports: PortArg[]) => void): this;
  addListener(event: 'add', listener: (port: PortArg) => void): this;
  addListener(event: 'remove', listener: (port: PortArg) => void): this;
  on(event: 'ports', listener: (ports: PortArg[]) => void): this;
  on(event: 'add', listener: (port: PortArg) => void): this;
  on(event: 'remove', listener: (port: PortArg) => void): this;
  once(event: 'ports', listener: (ports: PortArg[]) => void): this;
  once(event: 'add', listener: (port: PortArg) => void): this;
  once(event: 'remove', listener: (port: PortArg) => void): this;
}

export default class IPCClient extends Socket implements Client {
  protected constructor(options?: SocketConstructorOpts) {
    super(options);
    this.on('data', this.parseEvents);
  }

  parseEvents = (data: Buffer): void => {
    const result = EventFromString.decode(data.toString());
    if (isLeft(result)) {
      debug('<error>:', PathReporter.report(result));
      return;
    }
    const { right: { event, args } } = result;
    this.emit(event, ...args);
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
