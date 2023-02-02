/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { asyncSerialMap, Category, CategoryV, IKnownPort, notEmpty, toStack } from '@nibus/core';
import { Detection, detectionPath, loadDetection } from '@nibus/detection';
import { PortInfo } from '@serialport/bindings-cpp';

import debugFactory from 'debug';
import { EventEmitter } from 'events';
import { Either, getOrElse } from 'fp-ts/Either';
import debounce from 'lodash/debounce';
import filter from 'lodash/filter';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import { SerialPort } from 'serialport';
import type { Device } from 'usb';
import { usb } from 'usb';

// useUsbDkBackend();

type ExtraDevice = Device & {
  serialNumber?: string;
  product?: string;
  manufacturer?: string;
};

function safeGet<E, A>(e: Either<E, A>): A | undefined {
  return getOrElse<E, A | undefined>(() => undefined)(e);
}

const isWin32 = process.platform === 'win32';

const debug = debugFactory('nibus:detector');
debug(`Detection file: ${detectionPath},${require.resolve('serialport')}`);
let knownPorts: Promise<IKnownPort[]> = Promise.resolve([]);

interface DetectorEvents {
  add: (port: IKnownPort) => void;
  remove: (port: IKnownPort) => void;
  plug: (port: IKnownPort) => void;
  unplug: (port: IKnownPort) => void;
}

let detection = loadDetection();

function reloadDevices(lastAdded?: ExtraDevice): void {
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

const detachHandler = (device: ExtraDevice): void => {
  delete device.serialNumber;
  delete device.product;
  delete device.manufacturer;
  reloadDevices();
};

detector.start = () => {
  loadDetection.onChanged = detectionChanged;
  reloadDevices();
  // Должна быть debounce с задержкой, иначе Serial.list не определит
  usb.on('attach', reload);
  usb.on('detach', detachHandler);
};

detector.stop = () => {
  loadDetection.onChanged = undefined;
  usb.off('attach', reload);
  usb.off('detach', detachHandler);
};

detector.restart = () => {
  reloadDevices();
};

detector.getPorts = () => knownPorts;

detector.getDetection = (): Detection | undefined => detection;

detector.reload = reloadDevices;

const getId = (id?: string | number): number | undefined =>
  typeof id === 'string' ? parseInt(id, 16) : id;

const upgrade = async (device: ExtraDevice): Promise<ExtraDevice> => {
  if (isWin32 || device.serialNumber != null || device.product != null || device.manufacturer != null) return device;
  device.open();
  const {
    iSerialNumber,
    iProduct,
    iManufacturer,
  } = device.deviceDescriptor;
  const [serialNumber, product, manufacturer] = await Promise.all(
    [iSerialNumber, iProduct, iManufacturer].map(i => new Promise<string | undefined>(resolve => {
      i
        ? device.getStringDescriptor(i, (err, value) => resolve(value))
        : resolve(undefined);
    })),
  );
  device.close();
  device.serialNumber = serialNumber;
  device.product = product;
  device.manufacturer = manufacturer;
  return device;
};

async function equals(port: PortInfo, device: Device): Promise<boolean> {
  if (
    getId(port.productId) !== device.deviceDescriptor.idProduct ||
    getId(port.vendorId) !== device.deviceDescriptor.idVendor
  ) return false;
  const { serialNumber } = await upgrade(device);
  return serialNumber === port.serialNumber;
}

async function detectDevice(port: PortInfo, lastAdded?: Device): Promise<IKnownPort> {
  let detected: ExtraDevice | undefined;
  const {
    serialNumber,
    manufacturer,
  } = port;
  const productId = getId(port.productId)!;
  const vendorId = getId(port.vendorId)!;
  if (lastAdded && await equals(port, lastAdded)) {
    detected = lastAdded;
  } else {
    let list = await Promise.all(filter(
      usb.getDeviceList(),
      {
        deviceDescriptor: {
          idProduct: productId,
          idVendor: vendorId,
        },
      },
    ).map(upgrade));
    // debug(`list: ${list.map(({
    //   deviceDescriptor,
    //   product,
    //   serialNumber,
    //   manufacturer,
    // }) => JSON.stringify({
    //   deviceDescriptor,
    //   product,
    //   serialNumber,
    //   manufacturer,
    // })).join(', ')}`);
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
    const {
      deviceDescriptor: {
        idProduct: productId,
        idVendor: vendorId,
      },
      product: device,
    } = detected;
    return {
      ...port,
      productId,
      vendorId,
      device,
      // deviceAddress,
    };
  }
  return {
    ...port,
    productId,
    vendorId,
  };
}

const matchCategory = (port: IKnownPort): Category => {
  const match =
    detection &&
    find(detection.knownDevices, item =>
      Boolean(
        (!item.device || (port.device && port.device.startsWith(item.device))) &&
        (!item.serialNumber || (port.serialNumber && port.serialNumber.startsWith(item.serialNumber))) &&
        (!item.manufacturer || port.manufacturer === item.manufacturer) &&
        item.vid === port.vendorId && item.pid === port.productId,
      ),
    );
  if (
    !match &&
    (port.productId === 0x6001 || port.productId === 0x6015) &&
    port.vendorId === 0x0403
  ) {
    return 'ftdi';
  }
  return match && safeGet(CategoryV.decode(match.category));
};

async function reloadDevicesAsync(
  prevPorts: IKnownPort[],
  lastAdded?: ExtraDevice): Promise<IKnownPort[]> {
  try {
    if (detection == null) {
      detection = loadDetection();
    }
    if (lastAdded) await upgrade(lastAdded);
    const list: PortInfo[] = await SerialPort.list();
    const externalPorts = list.filter(port => !!port.productId);
    debug(`externalPorts: ${JSON.stringify(externalPorts)}`);

    const checkCategory = (port: IKnownPort): void => {
      const category = matchCategory(port);
      if (category !== port.category) {
        debug(`device's category was changed ${port.category} to ${category}`);
        port.category && detector.emit('remove', port);
        port.category = safeGet(CategoryV.decode(category));
        port.category && setTimeout(() => detector.emit('add', port), 0);
      }
    };

    const detectCategory = (port: IKnownPort): void => {
      port.category = matchCategory(port);
      detector.emit('plug', port);
      if (port.category) {
        debug(
          `new device ${port.device || port.vendorId}/${port.category} was plugged to ${port.path}`,
        );
        detector.emit('add', port);
      } else {
        debug(`unknown device ${JSON.stringify(port)} was plugged`);
      }
    };

    const ports = await asyncSerialMap(externalPorts, async (portInfo: PortInfo) => {
      const index = findIndex(prevPorts, { path: portInfo.path });
      let port: IKnownPort;
      if (index !== -1) {
        [port] = prevPorts.splice(index, 1);
        checkCategory(port);
      } else {
        port = isWin32 ? {
          ...portInfo,
          productId: getId(portInfo.productId)!,
          vendorId: getId(portInfo.vendorId)!,
        } : await detectDevice(portInfo, lastAdded);
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
