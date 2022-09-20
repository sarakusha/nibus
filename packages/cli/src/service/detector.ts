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
import { Either, getOrElse } from 'fp-ts/Either';
import find from 'lodash/find';
import filter from 'lodash/filter';
import findIndex from 'lodash/findIndex';
import debounce from 'lodash/debounce';
import { SerialPort } from 'serialport';
import { PortInfo } from '@serialport/bindings-cpp';
import usbDetection from 'usb-detection';
import { Category, CategoryV, IKnownPort, asyncSerialMap, notEmpty, toStack } from '@nibus/core';
import loadDetection, { Detection, detectionPath } from '@nibus/detection';

import debugFactory from 'debug';

function safeGet<E, A>(e: Either<E, A>): A | undefined {
  return getOrElse<E, A | undefined>(() => undefined)(e);
}

export const isElectron = {}.hasOwnProperty.call(process.versions, 'electron');

const debug = debugFactory('nibus:detector');
debug(`Detection file: ${detectionPath}`);
let knownPorts: Promise<IKnownPort[]> = Promise.resolve([]);

interface DetectorEvents {
  add: (port: IKnownPort) => void;
  remove: (port: IKnownPort) => void;
  plug: (port: IKnownPort) => void;
  unplug: (port: IKnownPort) => void;
}

let detection = loadDetection();

function reloadDevices(lastAdded?: usbDetection.IDevice): void {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  knownPorts = knownPorts.then(ports => reloadDevicesAsync(ports, lastAdded));
}

const reload = debounce(reloadDevices, 2000);

const detectionChanged = (): void => {
  debug(`detection file ${detectionPath} was changed, reloading devices...`);
  detection = undefined;
  reloadDevices();
};

interface IDetector extends NodeJS.EventEmitter {
  start: () => void;
  stop: () => void;
  restart: () => void;
  getPorts: () => Promise<IKnownPort[]>;
  getDetection: () => Detection | undefined;
  reload: () => void;
  on<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
  once<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
  off<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
  emit<U extends keyof DetectorEvents>(event: U, ...args: Parameters<DetectorEvents[U]>): boolean;
}

const detector = new EventEmitter() as IDetector;
detector.start = () => {
  usbDetection.startMonitoring();
  loadDetection.onChanged = detectionChanged;
  reloadDevices();
  // Должна быть debounce с задержкой, иначе Serial.list не определит
  usbDetection.on('add', reload);
  // Удаление без задержки!
  usbDetection.on('remove', reloadDevices);
};

detector.stop = () => {
  loadDetection.onChanged = undefined;
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

detector.getDetection = (): Detection | undefined => detection;

detector.reload = reloadDevices;

const getId = (id?: string | number): number | undefined =>
  typeof id === 'string' ? parseInt(id, 16) : id;

function equals(port: PortInfo, device: usbDetection.IDevice): boolean {
  return (
    getId(port.productId) === device.productId &&
    getId(port.vendorId) === device.vendorId &&
    port.serialNumber === device.serialNumber
  );
}

async function detectDevice(port: PortInfo, lastAdded?: usbDetection.IDevice): Promise<IKnownPort> {
  let detected: usbDetection.IDevice | undefined;
  if (lastAdded && equals(port, lastAdded)) {
    detected = lastAdded;
  } else {
    let list = await usbDetection.find(getId(port.vendorId)!, getId(port.productId)!, () => {});
    const { serialNumber, manufacturer } = port;
    list = filter(list, {
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
    find(detection.knownDevices, item =>
      Boolean(
        (!item.device || (port.device && port.device.startsWith(item.device))) &&
          (!item.serialNumber ||
            (port.serialNumber && port.serialNumber.startsWith(item.serialNumber))) &&
          (!item.manufacturer || port.manufacturer === item.manufacturer) &&
          getId(item.vid) === port.vendorId &&
          getId(item.pid) === port.productId
      )
    );
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
    const list: PortInfo[] = await SerialPort.list();
    const externalPorts = list.filter(port => !!port.productId);
    debug(`externalPorts: ${JSON.stringify(externalPorts)}`);

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
        debug(`unknown device %o was plugged: ${port}`);
      }
    };

    const ports = await asyncSerialMap(externalPorts, async (portInfo: PortInfo) => {
      const index = findIndex(prevPorts, { path: portInfo.path });
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
