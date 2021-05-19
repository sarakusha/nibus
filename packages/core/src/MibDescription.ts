/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
/* tslint:disable:variable-name */
import * as t from 'io-ts';

/**
 * Валидатор тип поиска устройства
 */
export const FindKindV = t.keyof(
  {
    sarp: null,
    version: null,
  },
  'FindKind'
);

/**
 * Тип поиска устройства 'sarp' | 'version'
 *   - 'sarp' - поддерживается поиск SARP;
 *   - 'version' - чтение с нулевого адреса версии устройства;
 */
export type FindKind = t.TypeOf<typeof FindKindV>;

/**
 * Валидатор скорости интерфейса
 */
export const NibusBaudRateV = t.union(
  [t.literal(115200), t.literal(57600), t.literal(28800)],
  'NibusBaudRate'
);

/**
 * Валидатор типа четности последовательного порта
 */
export const NibusParityV = t.keyof(
  {
    none: null,
    even: null,
    mark: null,
  },
  'NibusParity'
);

/**
 * Скорость последовательного порта
 * - 115200
 * - 57600
 * - 28800
 */
export type NibusBaudRate = t.TypeOf<typeof NibusBaudRateV>;
/**
 * Четность последовательного порта
 * - 'none'
 * - 'even'
 * - 'mark'
 */
export type NibusParity = t.TypeOf<typeof NibusParityV>;

/**
 * Валидатор типа MibDescription
 */
export const MibDescriptionV: t.Type<MibDescription> = t.recursion('MibDescriptionV', () =>
  t.partial({
    type: t.number,
    mib: t.string,
    link: t.boolean,
    baudRate: NibusBaudRateV,
    parity: NibusParityV,
    category: t.string,
    find: FindKindV,
    disableBatchReading: t.boolean,
    select: t.array(MibDescriptionV),
    win32: t.union([MibDescriptionV, t.undefined]),
    foreign: t.boolean,
  })
);

/**
 * Описание MIB-типа. Используется для определения параметров в файле detection.yml
 */
export interface MibDescription {
  /**
   * Тип
   */
  type?: number;
  /**
   * название типа
   */
  mib?: string;
  /**
   * Является передающим устройством (siolynx2)
   */
  link?: boolean;
  /**
   * Скорость соединения с последовательным портом
   */
  baudRate?: NibusBaudRate;
  /**
   * Четность последовательного порта
   */
  parity?: NibusParity;
  /**
   * Категория устройства
   */
  category?: string;
  /**
   * Тип поиска устройства
   */
  find?: FindKind;
  /**
   * Не поддерживается пакетное чтение переменных одним запросом
   */
  disableBatchReading?: boolean;
  /**
   * Для общих категорий (FTDI) выбор вариантов точных категорий
   */
  select?: MibDescription[];
  /**
   * Параметры для Win32
   */
  win32?: MibDescription;
  /**
   * Стороннее устройство
   */
  foreign?: boolean;
}
