/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
/* eslint-disable max-classes-per-file */

import Address from './Address';
import { ProtoType } from './common';

/**
 * Ошибка mib
 */
export class MibError extends Error {}

/**
 * Извлечь описание ошибки из прототипа
 * @param errcode - код ошибки
 * @param prototype - прототип
 */
const getErrMsg = (errcode: number, prototype: ProtoType): string | undefined => {
  const errEnum = Reflect.getMetadata('errorType', prototype);
  return (errEnum && errEnum[errcode]?.annotation) ?? `NiBUS error ${errcode}`;
};

/**
 * Ошибка NiBUS
 */
export class NibusError extends Error {
  /**
   * Конструктор
   * @param errcode - код ощибки
   * @param prototype - прототип
   * @param msg - дополнительное сообщение
   */
  constructor(public errcode: number, prototype: ProtoType, msg?: string) {
    super(`${msg ? `${msg}: ` : ''}${getErrMsg(errcode, prototype)} (${errcode})`);
  }
}

/**
 * Ошибка по таймауту
 */
export class TimeoutError extends Error {
  /**
   * Коструктор
   * @param address - адрес устройства
   */
  constructor(address: Address);

  /**
   * Конструктор
   * @param msg - сообщение
   */
  constructor(msg?: string);

  constructor(param: unknown) {
    const defaultMsg = 'Timeout error';
    const msg = param instanceof Address ? `${defaultMsg} on ${param}` : param ?? defaultMsg;
    super(msg as string);
  }
}
