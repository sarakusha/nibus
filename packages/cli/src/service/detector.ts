/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

/* tslint:disable:variable-name */
import { EventEmitter } from 'events';
import { Either, getOrElse, isLeft } from 'fp-ts/lib/Either';
import fs, { Stats } from 'fs';
import { PathReporter } from 'io-ts/lib/PathReporter';
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
  KnownPortV,
} from '@nibus/core';

import debugFactory, { isElectron } from '../debug';

function getOrUndefined<E, A>(e: Either<E, A>): A | undefined {
  return getOrElse<E, A | undefined>(() => undefined)(e);
}

// let usbDetection: typeof UsbDetection;
const debug = debugFactory('nibus:detector');
export const detectionPath =
  isElectron && process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, '..', 'extraResources', 'detection.yml')
    : path.resolve(__dirname, '..', '..', 'assets', 'detection.yml');
debug('Detection file', detectionPath);
let knownPorts: Promise<IKnownPort[]> = Promise.resolve([]);

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
  // try {
  const data = fs.readFileSync(detectionPath, 'utf8');
  return yaml.safeLoad(data) as IDetection;
  /*
  } catch (err) {
    debug(`Warning: failed to read file ${detectionPath} (${err.message})`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return staticDetection as any;
  }
*/
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
}

const detector = new EventEmitter() as IDetector;
detector.start = () => {
  usbDetection.startMonitoring();
  debug(`start watching the detector file ${detectionPath}`);
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
  return match && getOrUndefined(CategoryV.decode(match.category));
};

async function reloadDevicesAsync(
  prevPorts: IKnownPort[],
  lastAdded?: usbDetection.IDevice
): Promise<IKnownPort[]> {
  const ports: IKnownPort[] = [];
  try {
    if (detection == null) {
      detection = loadDetection();
    }
    const list: SerialPort.PortInfo[] = await SerialPort.list();
    const externalPorts = list.filter(port => !!port.productId);
    debug('externalPorts', externalPorts);
    // const prevPorts = knownPorts.splice(0);

    await externalPorts.reduce(async (promise, port) => {
      const nextPorts = await promise;
      const prev = _.findIndex(prevPorts, { path: port.path });
      let device: IKnownPort;
      if (prev !== -1) {
        [device] = prevPorts.splice(prev, 1);
        const category = matchCategory(device);
        if (category !== device.category) {
          debug(`device's category was changed ${device.category} to ${category}`);
          device.category && detector.emit('remove', device);
          device.category = getOrUndefined(CategoryV.decode(category));
          device.category && detector.emit('add', device);
        }
      } else {
        device = await detectDevice(port, lastAdded);
        device.category = matchCategory(device);
        detector.emit('plug', device);
        // console.log('PORT', JSON.stringify(port));
        if (device.category) {
          debug(`new device ${device.device || device.vendorId}/\
${device.category} was plugged to ${device.path}`);
          detector.emit('add', device);
        } else {
          debug('unknown device %o was plugged', device);
        }
      }
      const validation = KnownPortV.decode(device);
      if (isLeft(validation)) {
        debug('<error>', PathReporter.report(validation).join('\n'));
      } else {
        nextPorts.push(validation.right);
      }
      return nextPorts;
    }, Promise.resolve(ports));
    prevPorts.forEach(port => {
      detector.emit('unplug', port);
      debug(`device ${port.device || port.vendorId}/\
${port.category || port.productId} was unplugged from ${port.path}`);
      port.category && detector.emit('remove', port);
    });
    return ports;
  } catch (err) {
    debug(`Error: reload devices was failed (${err.stack || err})`);
    return ports;
  }
}

export default detector;
