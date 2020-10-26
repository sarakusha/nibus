/* eslint-disable max-classes-per-file */
/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { isLeft } from 'fp-ts/lib/Either';
/* eslint-disable max-classes-per-file,no-bitwise */
import { PathReporter } from 'io-ts/lib/PathReporter';
import _ from 'lodash';
import { Socket, connect } from 'net';
import xpipe from 'xpipe';
import { EventEmitter } from 'events';
import debugFactory from 'debug';
import { AddressParam } from '../Address';
import { TimeoutError } from '../errors';
import { getSocketPath } from '../ipc';
// import { devices } from '../mib';
import { createNmsRead, NmsDatagram } from '../nms';
import NmsServiceType from '../nms/NmsServiceType';
import { createSarp, SarpQueryType, SarpDatagram } from '../sarp';
import { MibDescriptionV, MibDescription } from '../MibDescription';
import NibusDatagram from './NibusDatagram';
import NibusEncoder from './NibusEncoder';
import NibusDecoder from './NibusDecoder';
import config from './config';

export const MINIHOST_TYPE = 0xabc6;
// const FIRMWARE_VERSION_ID = 0x85;
const VERSION_ID = 2;

const debug = debugFactory('nibus:connection');
// let NIBUS_TIMEOUT = 1000;
//
// export const setNibusTimeout = (timeout: number): void => {
//   NIBUS_TIMEOUT = timeout;
// };
//
// export const getNibusTimeout = (): number => NIBUS_TIMEOUT;

class WaitedNmsDatagram {
  readonly resolve: (datagram: NmsDatagram) => void;

  constructor(
    public readonly req: NmsDatagram,
    resolve: (datagram: NmsDatagram | NmsDatagram[]) => void,
    reject: (reason: Error) => void,
    callback: (self: WaitedNmsDatagram) => void
  ) {
    let timer: NodeJS.Timer;
    let counter: number =
      req.service !== NmsServiceType.Read ? 1 : Math.floor(req.nms.length / 3) + 1;
    const datagrams: NmsDatagram[] = [];
    const timeout = (): void => {
      callback(this);
      if (datagrams.length === 0) {
        reject(
          new TimeoutError(
            `Timeout error on ${req.destination} while ${NmsServiceType[req.service]}`
          )
        );
      } else {
        resolve(datagrams);
      }
    };
    const restart = (step = 1): boolean => {
      counter -= step;
      clearTimeout(timer);
      if (counter > 0) {
        timer = setTimeout(timeout, req.timeout || config.timeout);
      } else if (counter === 0) {
        callback(this);
      }
      return counter === 0;
    };
    restart(0);
    this.resolve = (datagram: NmsDatagram) => {
      datagrams.push(datagram);
      if (restart()) {
        resolve(datagrams.length > 1 ? datagrams : datagram);
      }
    };
  }
}

type SarpListener = (datagram: SarpDatagram) => void;
type NmsListener = (datagram: NmsDatagram) => void;

export interface INibusConnection {
  on(event: 'sarp', listener: SarpListener): this;
  on(event: 'nms', listener: NmsListener): this;
  once(event: 'sarp', listener: SarpListener): this;
  once(event: 'nms', listener: NmsListener): this;
  addListener(event: 'sarp', listener: SarpListener): this;
  addListener(event: 'nms', listener: NmsListener): this;
  off(event: 'sarp', listener: SarpListener): this;
  off(event: 'nms', listener: NmsListener): this;
  removeListener(event: 'sarp', listener: SarpListener): this;
  removeListener(event: 'nms', listener: NmsListener): this;
  sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
  ping(address: AddressParam): Promise<number>;
  findByType(type: number): Promise<NmsDatagram | NmsDatagram[] | undefined>;
  getVersion(address: AddressParam): Promise<[number?, number?]>;
  close(): void;
  readonly path: string;
  description: MibDescription;
}

class NibusConnection extends EventEmitter implements INibusConnection {
  public readonly description: MibDescription;

  private readonly socket: Socket;

  private readonly encoder = new NibusEncoder();

  private readonly decoder = new NibusDecoder();

  private ready = Promise.resolve();

  private closed = false;

  private readonly waited: WaitedNmsDatagram[] = [];

  constructor(public readonly path: string, description: MibDescription) {
    super();
    const validate = MibDescriptionV.decode(description);
    if (isLeft(validate)) {
      const msg = PathReporter.report(validate).join('\n');
      debug('<error>', msg);
      throw new TypeError(msg);
    }
    this.description = validate.right;
    this.socket = connect(xpipe.eq(getSocketPath(path)));
    this.socket.pipe(this.decoder);
    this.encoder.pipe(this.socket);
    this.decoder.on('data', this.onDatagram);
    this.socket.once('close', this.close);
    debug(`new connection on ${path} (${description.category})`);
  }

  public sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    // debug('write datagram from ', datagram.source.toString());
    const { encoder, stopWaiting, waited, closed } = this;
    return new Promise((resolve, reject) => {
      this.ready = this.ready.finally(async () => {
        if (closed) return reject(new Error('Closed'));
        if (!encoder.write(datagram)) {
          await new Promise(cb => encoder.once('drain', cb));
        }
        if (!(datagram instanceof NmsDatagram) || datagram.notReply) {
          return resolve(undefined);
        }
        return waited.push(new WaitedNmsDatagram(datagram, resolve, reject, stopWaiting));
      });
    });
  }

  public ping(address: AddressParam): Promise<number> {
    debug(`ping [${address.toString()}] ${this.path}`);
    const now = Date.now();
    return this.sendDatagram(createNmsRead(address, VERSION_ID))
      .then(datagram => Number(Reflect.getOwnMetadata('timeStamp', datagram!)) - now)
      .catch(() => -1);
  }

  public findByType(
    type: number = MINIHOST_TYPE
  ): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    debug(`findByType ${type} on ${this.path} (${this.description.category})`);
    const sarp = createSarp(SarpQueryType.ByType, [0, 0, 0, (type >> 8) & 0xff, type & 0xff]);
    return this.sendDatagram(sarp);
  }

  public async getVersion(address: AddressParam): Promise<[number?, number?]> {
    const nmsRead = createNmsRead(address, VERSION_ID);
    try {
      const { value, status } = (await this.sendDatagram(nmsRead)) as NmsDatagram;
      if (status !== 0) {
        debug('<error>', status);
        return [];
      }
      const version = (value as number) & 0xffff;
      const type = (value as number) >>> 16;
      return [version, type];
    } catch (err) {
      debug('<error>', err.message || err);
      return [];
    }
  }

  public close = (): void => {
    if (this.closed) return;
    const { path, description } = this;
    debug(`close connection on ${path} (${description.category})`);
    this.closed = true;
    this.encoder.end();
    this.decoder.removeAllListeners('data');
    this.socket.destroy();
    this.emit('close');
  };

  private stopWaiting = (waited: WaitedNmsDatagram): void => {
    _.remove(this.waited, waited);
  };

  private onDatagram = (datagram: NibusDatagram): void => {
    let showLog = true;
    if (datagram instanceof NmsDatagram) {
      if (datagram.isResponse) {
        const resp = this.waited.find(item => datagram.isResponseFor(item.req));
        if (resp) {
          resp.resolve(datagram);
          showLog = false;
        }
      }
      this.emit('nms', datagram);
    } else if (datagram instanceof SarpDatagram) {
      this.emit('sarp', datagram);
      showLog = false;
    }
    showLog && debug('datagram received', JSON.stringify(datagram.toJSON()));
  };
}

export default NibusConnection;
