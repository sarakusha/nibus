/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* eslint-disable max-classes-per-file,no-plusplus,no-bitwise,no-await-in-loop */
import 'reflect-metadata';
import debugFactory from 'debug';
import { isLeft } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/PathReporter';
import remove from 'lodash/remove';
import debounce from 'lodash/debounce';
import { Socket, connect } from 'net';
import pump from 'pump';
import { TypedEmitter } from 'tiny-typed-emitter';
import Address, { AddressParam } from '../Address';
import { Datagram, MINIHOST_TYPE, VERSION_ID, delay } from '../common';
import Deferred from '../Deferred';
import { TimeoutError } from '../errors';
import type { IDevice } from '../mib';
import { type MibDescription, MibDescriptionV } from '../MibDescription';
import { NmsDatagram, createExecuteProgramInvocation, createNmsRead } from '../nms';
import NmsServiceType from '../nms/NmsServiceType';
import { SarpDatagram, SarpQueryType, createSarp } from '../sarp';
import type { INibusSession } from '../session';
import { BootloaderFunction, LikeArray, SlipDatagram, slipChunks } from '../slip';
import NibusDatagram from './NibusDatagram';
import NibusDecoder from './NibusDecoder';
import NibusEncoder from './NibusEncoder';
import { config } from '../config';

const debug = debugFactory('nibus:connection');

export const IDLE_TIMEOUT = 5000;

class WaitedNmsDatagram {
  readonly resolve: (datagram: NmsDatagram) => void;

  constructor(
    public readonly req: NmsDatagram,
    resolve: (datagram: NmsDatagram | NmsDatagram[]) => void,
    reject: (reason: Error) => void,
    callback: (self: WaitedNmsDatagram) => void,
  ) {
    let timer: NodeJS.Timeout;
    let counter: number =
      req.service !== NmsServiceType.Read ? 1 : Math.floor(req.nms.length / 3) + 1;
    const datagrams: NmsDatagram[] = [];
    const timeout = (): void => {
      callback(this);
      if (datagrams.length === 0) {
        reject(
          new TimeoutError(
            `Timeout error on ${req.destination} while ${NmsServiceType[req.service]}`,
          ),
        );
      } else {
        resolve(datagrams);
      }
    };
    const restart = (step = 1): boolean => {
      counter -= step;
      global.clearTimeout(timer);
      if (counter > 0) {
        timer = global.setTimeout(timeout, req.timeout || config().get('timeout') || 1000);
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
  idle: (lastActivity: number) => void;
}

export interface INibusConnection {
  on<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
  once<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
  off<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
  sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
  ping(address: AddressParam): Promise<readonly [-1, undefined] | readonly [number, VersionInfo]>;
  findByType(type: number): Promise<SarpDatagram>;
  getVersion(address: AddressParam): Promise<VersionInfo | undefined>;
  close(): void;
  readonly isClosed: boolean;
  readonly path: string;
  description: MibDescription;
  slipStart(force?: boolean): Promise<boolean>;
  slipFinish(): void;
  execBootloader(fn: BootloaderFunction, data?: LikeArray): Promise<SlipDatagram>;
  owner?: IDevice;
  readonly session: INibusSession;
  readonly lastActivity: number;
}

export type VersionInfo = {
  version: number;
  type: number;
  source: Address;
  timestamp: number;
  connection: INibusConnection;
};

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

  #lastActivity = 0;

  constructor(
    public readonly session: INibusSession,
    public readonly path: string,
    description: MibDescription,
    readonly port: number,
    readonly host?: string,
  ) {
    super();
    const validate = MibDescriptionV.decode(description);
    if (isLeft(validate)) {
      const msg = PathReporter.report(validate).join('\n');
      debug(`<error> ${msg}`);
      throw new TypeError(msg);
    }
    this.description = validate.right;
    // this.socket = connect(xpipe.eq(getSocketPath(path)));
    this.socket = connect(port, host, () => {
      this.socket.write(path);
      setTimeout(() => {
        // pump(pump(this.encoder, this.socket), this.decoder, () => this.close());
        pump(this.encoder, this.socket, this.decoder, () => this.close());
        // this.socket.pipe(this.decoder);
        // this.encoder.pipe(this.socket);
      }, 100);
    });
    this.decoder.on('data', this.onDatagram);
    // this.encoder.on('data', datagram => debug('datagram send',
    // JSON.stringify(datagram.toJSON())));
    this.socket.once('close', this.close);
    debug(`new connection on ${path} (${description.category})`);
  }

  get isClosed(): boolean {
    return this.closed;
  }

  private startIdle = debounce(() => this.emit('idle', this.#lastActivity), IDLE_TIMEOUT);

  public sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined> {
    this.#lastActivity = Date.now();
    this.startIdle();
    // debug('write datagram from ', datagram.source.toString());
    const {
      encoder,
      stopWaiting,
      waited,
      closed,
    } = this;
    const deferred = new Deferred<NmsDatagram | NmsDatagram[] | undefined>();
    // return new Promise((resolve, reject) => {
    this.ready = this.ready.finally().then(async () => {
      if (closed) { deferred.reject(new Error('Closed')); return; }
      if (!encoder.write(datagram)) {
        await new Promise(cb => {
          encoder.once('drain', cb);
        });
      }
      if (!(datagram instanceof NmsDatagram) || datagram.notReply) {
        deferred.resolve(undefined);
        return;
      }
      waited.push(new WaitedNmsDatagram(
        datagram,
        deferred.resolve,
        deferred.reject,
        stopWaiting,
      ));
      await deferred.promise.catch(() => { });
      // await delay(100);
    }).catch(() => { });
    return deferred.promise;
    // });
  }

  public ping(address: AddressParam): Promise<readonly [-1, undefined] | readonly [number, VersionInfo]> {
    // debug(`ping [${address.toString()}] ${this.path}`);
    const now = Date.now();
    return this.getVersion(address)
      .then(response =>
        response
          ? [response.timestamp - now, response] as const
          : ([-1, undefined] as const),
      )
      .catch(() => [-1, undefined] as const);
  }

  public findByType(type: number = MINIHOST_TYPE): Promise<SarpDatagram> {
    debug(`findByType ${type} on ${this.path} (${this.description.category})`);
    const sarp = createSarp(SarpQueryType.ByType, [0, 0, 0, (type >> 8) & 0xff, type & 0xff]);
    let sarpHandler: NibusEvents['sarp'] = () => { };
    return new Promise<SarpDatagram>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new TimeoutError('Device didn\'t respond')),
        config().get('timeout') || 1000,
      );
      sarpHandler = sarpDatagram => {
        clearTimeout(timeout);
        resolve(sarpDatagram);
      };
      this.once('sarp', sarpHandler);
      this.sendDatagram(sarp).catch(reject);
    }).finally(() => this.off('sarp', sarpHandler));
  }

  public async getVersion(address: AddressParam): Promise<VersionInfo | undefined> {
    const nmsRead = createNmsRead(address, VERSION_ID);
    try {
      const datagram = (await this.sendDatagram(nmsRead)) as NmsDatagram;
      const {
        value,
        status,
        source,
      } = datagram;
      const timestamp = Number(Reflect.getOwnMetadata('timeStamp', datagram));
      if (status !== 0) {
        debug(`<error> ${status}`);
        return undefined;
      }
      const version = (value as number) & 0xffff;
      const type = (value as number) >>> 16;
      return {
        version,
        type,
        source,
        timestamp,
        connection: this,
      };
    } catch (err) {
      // debug(`<error> ${err.message || err}`);
      console.error(err);
      return undefined;
    }
  }

  public close = (): void => {
    if (this.closed) return;
    const {
      path,
      description,
    } = this;
    debug(`close connection on ${path} (${description.category})`);
    this.closed = true;
    this.encoder.end();
    this.decoder.removeAllListeners('data');
    this.socket.destroy();
    this.startIdle.cancel();
    this.emit('close');
  };

  private stopWaiting = (waited: WaitedNmsDatagram): void => {
    remove(this.waited, waited);
  };

  private onDatagram = (datagram: Datagram): void => {
    // let showLog = true;
    if (datagram instanceof NmsDatagram) {
      if (datagram.isResponse) {
        const resp = this.waited.find(item => datagram.isResponseFor(item.req));
        if (resp) {
          resp.resolve(datagram);
          // showLog = false;
        }
      }
      this.emit('nms', datagram);
    } else if (datagram instanceof SarpDatagram) {
      this.emit('sarp', datagram);
      // showLog = false;
    }
    // showLog && debug('datagram received', JSON.stringify(datagram.toJSON()));
  };

  async execBootloader(fn: BootloaderFunction, data?: LikeArray): Promise<SlipDatagram> {
    const {
      finishSlip,
      encoder,
      decoder,
    } = this;
    if (!finishSlip) throw new Error('SLIP mode required');
    const chunks = slipChunks(fn, data);
    const wait = (): Promise<SlipDatagram> => {
      let onData = (__: SlipDatagram): void => { };
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
        if (!force) (await delay(1000));
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

  get lastActivity(): number {
    return this.#lastActivity;
  }
}

// export default NibusConnection;
