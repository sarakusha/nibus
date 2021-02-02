/* eslint-disable max-classes-per-file,no-plusplus,no-bitwise,no-await-in-loop */
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
import { PathReporter } from 'io-ts/lib/PathReporter';
import _ from 'lodash';
import { Socket, connect } from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import xpipe from 'xpipe';
import debugFactory from '../debug';
import Address, { AddressParam } from '../Address';
import { TimeoutError } from '../errors';
import { getSocketPath } from '../ipc';
import { createExecuteProgramInvocation, createNmsRead, NmsDatagram } from '../nms';
import NmsServiceType from '../nms/NmsServiceType';
import { createSarp, SarpQueryType, SarpDatagram } from '../sarp';
import { MibDescriptionV, MibDescription } from '../MibDescription';
import { BootloaderFunction, LikeArray, slipChunks, SlipDatagram } from '../slip';
import NibusDatagram from './NibusDatagram';
import NibusEncoder from './NibusEncoder';
import NibusDecoder from './NibusDecoder';
import config from './config';
import { Datagram, delay } from '../common';
import type { IDevice } from '../mib';

export const MINIHOST_TYPE = 0xabc6;
// const FIRMWARE_VERSION_ID = 0x85;
const VERSION_ID = 2;

const debug = debugFactory('nibus:connection');

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
        timer = global.setTimeout(timeout, req.timeout || config.timeout);
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

export interface NibusEvents {
  sarp: (datagram: SarpDatagram) => void;
  nms: (datagram: NmsDatagram) => void;
  close: () => void;
  chunk: (offset: number) => void;
}

export interface INibusConnection {
  on<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
  once<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
  off<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
  sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
  ping(address: AddressParam): Promise<number>;
  findByType(type: number): Promise<SarpDatagram>;
  getVersion(address: AddressParam): Promise<[number?, number?]>;
  close(): void;
  readonly path: string;
  description: MibDescription;
  slipStart(force?: boolean): Promise<boolean>;
  slipFinish(): void;
  execBootloader(fn: BootloaderFunction, data?: LikeArray): Promise<SlipDatagram>;
  owner?: IDevice;
}

const empty = Buffer.alloc(0);

export default class NibusConnection extends TypedEmitter<NibusEvents> implements INibusConnection {
  public description: MibDescription;

  public owner?: IDevice;

  private readonly socket: Socket;

  private readonly encoder = new NibusEncoder();

  private readonly decoder = new NibusDecoder();

  private ready = Promise.resolve();

  private closed = false;

  private readonly waited: WaitedNmsDatagram[] = [];

  private finishSlip: (() => void) | undefined;

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

  public findByType(type: number = MINIHOST_TYPE): Promise<SarpDatagram> {
    debug(`findByType ${type} on ${this.path} (${this.description.category})`);
    const sarp = createSarp(SarpQueryType.ByType, [0, 0, 0, (type >> 8) & 0xff, type & 0xff]);
    let sarpHandler: NibusEvents['sarp'] = () => {};
    return new Promise<SarpDatagram>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new TimeoutError('Device not respond')),
        config.timeout
      );
      sarpHandler = sarpDatagram => {
        clearTimeout(timeout);
        resolve(sarpDatagram);
      };
      this.once('sarp', sarpHandler);
      return this.sendDatagram(sarp);
    }).finally(() => this.off('sarp', sarpHandler));
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

  private onDatagram = (datagram: Datagram): void => {
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

  async execBootloader(fn: BootloaderFunction, data?: LikeArray): Promise<SlipDatagram> {
    const { finishSlip, encoder, decoder } = this;
    if (!finishSlip) throw new Error('SLIP mode required');
    const chunks = slipChunks(fn, data);
    const wait = (): Promise<SlipDatagram> => {
      let onData = (__: SlipDatagram): void => {};
      return new Promise<SlipDatagram>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new TimeoutError(`execBootloader timeout ${fn}`));
        }, 2000);
        onData = (datagram: Datagram): void => {
          if (datagram instanceof SlipDatagram) {
            clearTimeout(timer);
            resolve(datagram);
          }
        };
        decoder.on('data', onData);
      }).finally(() => decoder.off('data', onData));
    };

    let response = new SlipDatagram(empty);
    // eslint-disable-next-line no-restricted-syntax
    for (const [chunk, offset] of chunks) {
      this.emit('chunk', offset);
      const datagram = new SlipDatagram(chunk);
      encoder.write(datagram);
      response = await wait();
      if (response.errorCode !== undefined) {
        chunks.throw(new Error(`error ${response.errorCode}`));
        break;
      }
      // await delay(50);
    }
    return response;
  }

  slipStart(force = false): Promise<boolean> {
    if (this.finishSlip) return Promise.resolve(true);
    return new Promise<boolean>(resolve => {
      this.ready.finally(async () => {
        if (this.description.mib !== 'minihost3') return resolve(false);
        if (!force) {
          const readResp = await this.sendDatagram(createNmsRead(Address.empty, 0x3a8));
          if (!readResp || Array.isArray(readResp) || readResp.value !== true)
            return resolve(false);
          await this.sendDatagram(createExecuteProgramInvocation(Address.empty, 12));
        }
        // Блокируем ready пока не вызовем slipFinish
        this.ready = new Promise<void>(finishSlip => {
          this.finishSlip = finishSlip;
          this.decoder.setSlipMode(true);
        });
        force || (await delay(1000));
        return resolve(true);
      });
    });
  }

  slipFinish(): void {
    if (this.finishSlip) {
      this.decoder.setSlipMode(false);
      this.finishSlip();
      this.finishSlip = undefined;
    }
  }
}

// export default NibusConnection;
