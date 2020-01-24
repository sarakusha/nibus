/*
 * @license
 * Copyright (c) 2019. OOO Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nata" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import _ from 'lodash';

/**
 * Длина буфера для хранения адреса
 */
export const MAC_LENGTH = 6;

/**
 * Строка адреса содержит шестнадцатиричные цифры или префикс 0x
 * @param str - адрес
 */
const isHex = (str: string): boolean => /^(?:0X[0-9A-F]+)|(?:[0-9]*[A-F]+)/i.test(str);
/**
 * Декодирование 16-ричной строки
 * @param str - 16-ричная строка
 */
const parseHex = (str: string): number => parseInt(str, 16);
/**
 * Выравнивание строки нулями слева до ширины 2 символа
 * @param val - байт
 */
const padHex = (val: number): string => val.toString(16).padStart(2, '0');

/**
 * Тип адреса
 *
 * @remarks
 * broadcast = FF:FF:FF:FF:FF:FF
 * empty = 00:00:00:00:00:00
 */
export enum AddressType {
  broadcast = 'broadcast',
  empty = 'empty',
  mac = 0,
  net = 1,
  group = 2,
}

const isEmpty = (array: number[] | Uint8Array): boolean => _.every(array, b => b === 0);
const isBroadcast = (array: number[] | Uint8Array): boolean => _.every(array, b => b === 255);

/**
 * Представление адреса
 * @remarks
 * используется в конструкторе
 */
export type AddressParam = string | Buffer | number[] | Uint8Array | Address;

/**
 * Представляет обертку для адреса
 */
export default class Address {
  /**
   * Пустой адрес
   */
  public static readonly empty = new Address();

  /**
   * Широковещательный адрес
   */
  public static broadcast = new Address('broadcast');

  private static autocount = 1;

  /**
   * Тип адреса
   */
  public readonly type: AddressType;

  /**
   * Идентификатор домена
   *
   * @remarks
   * для типа адреса 1, 2
   * Диапазон 0..FFFF
   */
  public readonly domain?: number;

  /**
   * Идентификатор группы
   *
   * @remarks
   * для типа адреса 2
   * Диавпазон 0..FF
   */
  public readonly group?: number;

  /**
   * Идентификатор подсети
   *
   * @remarks
   * для типа адреса 1
   * Диапазон 0..FF
   */
  public readonly subnet?: number;

  /**
   * Идентификатор устройства
   *
   * @remarks
   * для типа адреса 1
   * Диапазон 0..FFFF
   * FFFF - все устройства подсети
   */
  public readonly device?: number;

  /**
   * Физический адрес
   *
   * @remarks
   * для типа адреса 0
   */
  public readonly mac?: Buffer;

  /**
   * Бинарный буфер содержащий адрес
   */
  public readonly raw = Buffer.alloc(MAC_LENGTH);

  /**
   * Конструктор создания или копирования
   * @param address - представление адреса
   */
  constructor(address: AddressParam = '') {
    let pos = 0;
    if (typeof address === 'string') {
      switch (address) {
        case '':
          this.type = AddressType.empty;
          break;
        case 'broadcast':
          this.type = AddressType.broadcast;
          this.raw.fill(255);
          break;
        case 'auto': {
          this.raw.fill(0xFE, 0, 2);
          this.raw.writeUInt32BE(Address.autocount, 2);
          this.type = AddressType.mac;
          Address.autocount += 1;
          break;
        }
        default:
          if (!/^[0-9A-FX.:]+$/i.test(address)) {
            throw new Error(`Invalid address: ${address}`);
          }
          if (address.indexOf('.') !== -1) {
            const parts = address.split('.', 4);
            const radix = _.some(parts, isHex) ? 16 : 10;
            switch (parts.length) {
              case 2: {
                const [domain, group] = parts;
                this.domain = parseInt(domain, radix);
                this.group = parseInt(group, radix);
                this.type = AddressType.group;
                pos = this.raw.writeUInt16LE(this.domain || 0, 0);
                this.raw.writeUInt8(this.group || 0, pos);
                break;
              }
              case 3: {
                const [domain, subnet, device] = parts;
                this.domain = parseInt(domain, radix);
                this.subnet = parseInt(subnet, radix);
                this.device = parseInt(device, radix);
                this.type = AddressType.net;
                pos = this.raw.writeUInt16LE(this.domain || 0, 0);
                pos = this.raw.writeUInt8(this.subnet || 0, pos);
                this.raw.writeUInt16LE(this.device || 0, pos);
                break;
              }
              default:
                throw new Error('Invalid address');
            }
          } else {
            // MAC
            const [left, right, rest] = address.split('::', 3);
            if (rest) {
              throw new Error(`Invalid address: ${address}`);
            }
            const lefts = left ? left.split(':') : [];
            const rights = right ? right.split(':') : [];
            let len = lefts.length + rights.length;
            if (len > MAC_LENGTH) {
              throw new Error(`Invalid address: ${address}`);
            }
            const mac = lefts.map(parseHex);
            while (len < MAC_LENGTH) {
              mac.push(0);
              len += 1;
            }
            mac.push(...rights.map(parseHex));
            if (_.some(mac, byte => byte < 0 || byte > 255)) {
              throw new Error('Invalid address');
            }
            this.mac = Buffer.from(mac);
            this.raw = this.mac;
            if (isEmpty(mac)) {
              this.type = AddressType.empty;
            } else if (isBroadcast(mac)) {
              this.type = AddressType.broadcast;
            } else {
              this.type = AddressType.mac;
            }
          }
      }
    } else if ((Array.isArray(address) || Buffer.isBuffer(address) || address instanceof Uint8Array)
      && address.length === MAC_LENGTH) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.mac = Buffer.from(address as any);
      this.raw = this.mac;
      if (isEmpty(address)) {
        this.type = AddressType.empty;
      } else if (isBroadcast(address)) {
        this.type = AddressType.broadcast;
      } else {
        this.type = AddressType.mac;
      }
    } else if (address instanceof Address) {
      this.raw = Buffer.from(address.raw);
      this.type = address.type;
      if (address.mac) {
        this.mac = this.raw;
      }
      this.domain = address.domain;
      this.group = address.group;
      this.subnet = address.subnet;
      this.device = address.device;
    } else {
      throw new Error(`Invalid address ${address.toString()} (${typeof address})`);
    }
    const value = this.raw;
    Object.defineProperty(this, 'raw', {
      value,
      enumerable: false,
    });
    Object.freeze(this);
  }

  /**
   * Данный адрес является пустым
   */
  get isEmpty(): boolean {
    return this.type === AddressType.empty;
  }

  /**
   * Данный адрес является широковещательным
   */
  get isBroadcast(): boolean {
    return this.type === AddressType.broadcast;
  }

  /**
   * Тип адреса
   */
  get rawType(): 0 | 1 | 2 {
    switch (this.type) {
      case AddressType.empty:
      case AddressType.broadcast:
        return AddressType.mac;
      default:
        console.assert(this.type >= 0 && this.type <= 2);
        return this.type;
    }
  }

  /**
   * Конверировать представление адреса в тип [[Address]]
   * @param address - представление адреса
   */
  public static toAddress(address?: AddressParam | null): Address | null | undefined {
    if (address == null) {
      return address;
    }
    return address instanceof Address ? address! : new Address(address);
  }

  /**
   * Считать адрес из буфера
   * @param type - Тип адреса
   * @param buffer - Буфер
   * @param offset - смещение
   */
  public static read(type: AddressType, buffer: Buffer, offset = 0): Address {
    if (buffer.length - offset < MAC_LENGTH) {
      throw new Error('Invalid buffer length');
    }
    switch (type) {
      case AddressType.mac: {
        const mac = buffer.slice(offset, offset + MAC_LENGTH);
        return new Address(mac);
      }
      case AddressType.net: {
        const net = [
          buffer.readUInt16LE(offset),
          buffer.readUInt8(offset + 2),
          buffer.readUInt16LE(offset + 3),
        ];
        return new Address(net.join('.'));
      }
      case AddressType.group: {
        const group = [
          buffer.readUInt16LE(offset),
          buffer.readUInt8(offset + 2),
        ];
        return new Address(group.join('.'));
      }
      default:
        throw new Error(`Invalid address type ${type}`);
    }
  }

  /**
   * Получить строковое преодставление адреса
   */
  public toString(): string {
    switch (this.type) {
      case AddressType.empty:
        return '::0';
      case AddressType.broadcast:
        return 'FF:FF:FF:FF:FF:FF';
      case AddressType.group:
        return `${this.domain}.${this.group}`;
      case AddressType.net:
        return `${this.domain}.${this.subnet}.${this.device}`;
      case AddressType.mac: {
        const mac = this.mac ? [...this.mac] : [];
        const first = mac.findIndex(b => b > 0);
        const str = [...mac.slice(first)]
          .map(padHex)
          .join(':')
          .toUpperCase();
        return first > 0 ? `::${str}` : str;
      }
      default:
        throw new Error('Invalid address type');
    }
  }

  /**
   * Сравнение адереса со значением
   * @param other - значение
   */
  public equals(other?: AddressParam | null): boolean {
    if (other == null) {
      return false;
    }
    return Address.toAddress(other)!.toString() === this.toString();
  }
}
