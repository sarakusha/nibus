/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { EventEmitter } from 'events';
import { Either, getOrElse } from 'fp-ts/lib/Either';
import fs, { Stats } from 'fs';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import SerialPort from 'serialport';
import usbDetection from 'usb-detection';
import {
  MibDescription,
  Category,
  CategoryV,
  HexOrNumber,
  IKnownPort,
  asyncSerialMap,
  notEmpty,
  toStack,
} from '@nibus/core';

import debugFactory from 'debug';

function safeGet<E, A>(e: Either<E, A>): A | undefined {
  return getOrElse<E, A | undefined>(() => undefined)(e);
}

export const isElectron = {}.hasOwnProperty.call(process.versions, 'electron');

const debug = debugFactory('nibus:detector');
export const detectionPath =
  isElectron && process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '..', 'extraResources', 'detection.yml')
    : path.resolve(__dirname, '..', '..', 'assets', 'detection.yml');
debug('Detection file', detectionPath);
let knownPorts: Promise<IKnownPort[]> = Promise.resolve([]);

interface DetectorEvents {
  add: (port: IKnownPort) => void;
  remove: (port: IKnownPort) => void;
  plug: (port: IKnownPort) => void;
  unplug: (port: IKnownPort) => void;
}

interface IDetectorItem {
  device: string;
  vid: HexOrNumber;
  pid: HexOrNumber;
  manufacturer?: string;
  serialNumber?: string;
  category: Category;
}

interface IDetection {
  mibCategories: {
    [category: string]: MibDescription;
  };
  knownDevices: IDetectorItem[];
}

const getRawDetection = (): IDetection => {
  const data = fs.readFileSync(detectionPath, 'utf8');
  return yaml.load(data) as IDetection;
};

const loadDetection = (): IDetection | undefined => {
  const result = getRawDetection();
  Object.keys(result.mibCategories).forEach(category => {
    const desc = result.mibCategories[category];
    desc.category = category;
    if (Array.isArray(desc.select)) {
      desc.select = ((desc.select as unknown) as string[]).map(
        cat => result.mibCategories[cat] || cat
      );
    }
  });
  return result;
};

let detection = loadDetection();

function reloadDevices(lastAdded?: usbDetection.IDevice): void {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  knownPorts = knownPorts.then(ports => reloadDevicesAsync(ports, lastAdded));
}

const reload = _.debounce(reloadDevices, 2000);

const detectionListener = (curr: Stats, prev: Stats): void => {
  if (curr.mtime !== prev.mtime) {
    debug(`detection file ${detectionPath} was changed, reloading devices...`);
    detection = undefined;
    reloadDevices();
  }
};

interface IDetector extends NodeJS.EventEmitter {
  start: () => void;
  stop: () => void;
  restart: () => void;
  getPorts: () => Promise<IKnownPort[]>;
  getDetection: () => IDetection | undefined;
  reload: () => void;
  on<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
  once<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
  off<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
  emit<U extends keyof DetectorEvents>(event: U, ...args: Parameters<DetectorEvents[U]>): boolean;
}

const detector = new EventEmitter() as IDetector;
detector.start = () => {
  usbDetection.startMonitoring();
  // debug(`start watching the detector file ${detectionPath}`);
  fs.watchFile(detectionPath, { persistent: false }, detectionListener);
  // detection = loadDetection();
  reloadDevices();
  // Должна быть debounce с задержкой, иначе Serial.list не определит
  usbDetection.on('add', reload);
  // Удаление без задержки!
  usbDetection.on('remove', reloadDevices);
};

detector.stop = () => {
  fs.unwatchFile(detectionPath, detectionListener);
  usbDetection && usbDetection.stopMonitoring();
};

detector.restart = () => {
  if (!usbDetection) {
    detector.start();
    return;
  }
  usbDetection.stopMonitoring();
  process.nextTick(() => usbDetection.startMonitoring());
};

detector.getPorts = () => knownPorts;

detector.getDetection = (): IDetection | undefined => detection;

detector.reload = reloadDevices;

const getId = (id?: HexOrNumber): number | undefined =>
  typeof id === 'string' ? parseInt(id, 16) : id;

function equals(port: SerialPort.PortInfo, device: usbDetection.IDevice): boolean {
  return (
    getId(port.productId) === device.productId &&
    getId(port.vendorId) === device.vendorId &&
    port.serialNumber === device.serialNumber
  );
}

async function detectDevice(
  port: SerialPort.PortInfo,
  lastAdded?: usbDetection.IDevice
): Promise<IKnownPort> {
  let detected: usbDetection.IDevice | undefined;
  if (lastAdded && equals(port, lastAdded)) {
    detected = lastAdded;
  } else {
    let list = await usbDetection.find(getId(port.vendorId)!, getId(port.productId)!, () => {});
    const { serialNumber, manufacturer } = port;
    list = _.filter(list, {
      serialNumber,
      manufacturer,
    });
    if (list.length === 0) {
      debug(`Unknown device ${JSON.stringify(port)}`);
    } else if (list.length > 1) {
      debug(`can't identify device ${JSON.stringify(port)}`);
    } else {
      [detected] = list;
    }
  }
  if (detected !== undefined) {
    const { productId, vendorId, deviceName: device, deviceAddress } = detected;
    return {
      ...port,
      productId,
      vendorId,
      device,
      deviceAddress,
    };
  }
  return {
    ...port,
    productId: getId(port.productId)!,
    vendorId: getId(port.vendorId)!,
  };
}

const matchCategory = (port: IKnownPort): Category => {
  const match =
    detection &&
    (_.find(
      detection!.knownDevices,
      item =>
        (!item.device || (port.device && port.device.startsWith(item.device))) &&
        (!item.serialNumber ||
          (port.serialNumber && port.serialNumber.startsWith(item.serialNumber))) &&
        (!item.manufacturer || port.manufacturer === item.manufacturer) &&
        getId(item.vid) === port.vendorId &&
        getId(item.pid) === port.productId
    ) as IDetectorItem);
  if (
    !match &&
    process.platform === 'win32' &&
    (port.productId === 0x6001 || port.productId === 0x6015) &&
    port.vendorId === 0x0403
  ) {
    return 'ftdi';
  }
  return match && safeGet(CategoryV.decode(match.category));
};

async function reloadDevicesAsync(
  prevPorts: IKnownPort[],
  lastAdded?: usbDetection.IDevice
): Promise<IKnownPort[]> {
  try {
    if (detection == null) {
      detection = loadDetection();
    }
    const list: SerialPort.PortInfo[] = await SerialPort.list();
    const externalPorts = list.filter(port => !!port.productId);
    debug('externalPorts', JSON.stringify(externalPorts));

    const checkCategory = (port: IKnownPort): void => {
      const category = matchCategory(port);
      if (category !== port.category) {
        debug(`device's category was changed ${port.category} to ${category}`);
        port.category && detector.emit('remove', port);
        port.category = safeGet(CategoryV.decode(category));
        port.category && detector.emit('add', port);
      }
    };

    const detectCategory = (port: IKnownPort): void => {
      port.category = matchCategory(port);
      detector.emit('plug', port);
      if (port.category) {
        debug(
          `new device ${port.device || port.vendorId}/${port.category} was plugged to ${port.path}`
        );
        detector.emit('add', port);
      } else {
        debug('unknown device %o was plugged', port);
      }
    };

    const ports = await asyncSerialMap(externalPorts, async portInfo => {
      const index = _.findIndex(prevPorts, { path: portInfo.path });
      let port: IKnownPort;
      if (index !== -1) {
        [port] = prevPorts.splice(index, 1);
        checkCategory(port);
      } else {
        port = await detectDevice(portInfo, lastAdded);
        detectCategory(port);
      }
      return port.category && port;
    });
    return ports.filter(notEmpty);
  } catch (err) {
    debug(`Error: reload devices was failed (${toStack(err)})`);
    return [];
  }
}

export default detector;
