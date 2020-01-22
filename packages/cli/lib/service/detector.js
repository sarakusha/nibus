import debugFactory from 'debug';
import { EventEmitter } from 'events';
import { getOrElse, isLeft } from 'fp-ts/lib/Either';
import fs from 'fs';
import { PathReporter } from 'io-ts/lib/PathReporter';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import SerialPort from 'serialport';
import usbDetection from 'usb-detection';
import { CategoryV, KnownPortV, } from '@nibus/core';
function getOrUndefined(e) {
    return getOrElse(() => undefined)(e);
}
const debug = debugFactory('nibus:detector');
const detectionPath = path.resolve(__dirname, '../../detection.yml');
let knownPorts = Promise.resolve([]);
const loadDetection = () => {
    try {
        const data = fs.readFileSync(detectionPath, 'utf8');
        const result = yaml.safeLoad(data);
        Object.keys(result.mibCategories).forEach(category => {
            const desc = result.mibCategories[category];
            desc.category = category;
            if (Array.isArray(desc.select)) {
                desc.select = desc.select
                    .map(cat => result.mibCategories[cat] || cat);
            }
        });
        return result;
    }
    catch (err) {
        debug(`Error: failed to read file ${detectionPath} (${err.message})`);
        return undefined;
    }
};
let detection = loadDetection();
function reloadDevices(lastAdded) {
    knownPorts = knownPorts.then(ports => reloadDevicesAsync(ports, lastAdded));
}
const reload = _.debounce(reloadDevices, 2000);
const detectionListener = (curr, prev) => {
    if (curr.mtime !== prev.mtime) {
        debug('detection file was changed, reloading devices...');
        detection = undefined;
        reloadDevices();
    }
};
const detector = new EventEmitter();
detector.start = () => {
    usbDetection.startMonitoring();
    debug(`start watching the detector file ${detectionPath}`);
    fs.watchFile(detectionPath, { persistent: false }, detectionListener);
    reloadDevices();
    usbDetection.on('add', reload);
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
detector.getDetection = () => detection;
const getId = (id) => (typeof id === 'string'
    ? parseInt(id, 16)
    : id);
function equals(port, device) {
    return getId(port.productId) === device.productId
        && getId(port.vendorId) === device.vendorId
        && port.serialNumber === device.serialNumber;
}
async function detectDevice(port, lastAdded) {
    let detected;
    if (lastAdded && equals(port, lastAdded)) {
        detected = lastAdded;
    }
    else {
        let list = await usbDetection.find(getId(port.vendorId), getId(port.productId), () => { });
        const { serialNumber, manufacturer } = port;
        list = _.filter(list, {
            serialNumber,
            manufacturer,
        });
        if (list.length === 0) {
            debug(`Unknown device ${JSON.stringify(port)}`);
        }
        else if (list.length > 1) {
            debug(`can't identify device ${JSON.stringify(port)}`);
        }
        else {
            [detected] = list;
        }
    }
    if (detected !== undefined) {
        const { productId, vendorId, deviceName: device, deviceAddress, } = detected;
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
        productId: getId(port.productId),
        vendorId: getId(port.vendorId),
    };
}
const matchCategory = (port) => {
    const match = detection && _.find(detection.knownDevices, item => (!item.device || (port.device && port.device.startsWith(item.device)))
        && (!item.serialNumber
            || (port.serialNumber && port.serialNumber.startsWith(item.serialNumber)))
        && (!item.manufacturer || (port.manufacturer === item.manufacturer))
        && (getId(item.vid) === port.vendorId) && (getId(item.pid) === port.productId));
    if (!match && process.platform === 'win32'
        && (port.productId === 0x6001 || port.productId === 0x6015)
        && port.vendorId === 0x0403) {
        return 'ftdi';
    }
    return match && getOrUndefined(CategoryV.decode(match.category));
};
async function reloadDevicesAsync(prevPorts, lastAdded) {
    const ports = [];
    try {
        if (detection == null) {
            detection = loadDetection();
        }
        const list = await SerialPort.list();
        const externalPorts = list.filter(port => !!port.productId);
        await externalPorts.reduce(async (promise, port) => {
            const nextPorts = await promise;
            const prev = _.findIndex(prevPorts, { comName: port.comName });
            let device;
            if (prev !== -1) {
                [device] = prevPorts.splice(prev, 1);
                const category = matchCategory(device);
                if (category !== device.category) {
                    debug(`device's category was changed ${device.category} to ${category}`);
                    device.category && detector.emit('remove', device);
                    device.category = getOrUndefined(CategoryV.decode(category));
                    device.category && detector.emit('add', device);
                }
            }
            else {
                device = await detectDevice(port, lastAdded);
                device.category = matchCategory(device);
                detector.emit('plug', device);
                if (device.category) {
                    debug(`new device ${device.device || device.vendorId}/\
${device.category} was plugged to ${device.comName}`);
                    detector.emit('add', device);
                }
                else {
                    debug('unknown device %o was plugged', device);
                }
            }
            const validation = KnownPortV.decode(device);
            if (isLeft(validation)) {
                debug('<error>', PathReporter.report(validation).join('\n'));
            }
            else {
                nextPorts.push(validation.right);
            }
            return nextPorts;
        }, Promise.resolve(ports));
        prevPorts.forEach(port => {
            detector.emit('unplug', port);
            debug(`device ${port.device || port.vendorId}/\
${port.category || port.productId} was unplugged from ${port.comName}`);
            port.category && detector.emit('remove', port);
        });
        return ports;
    }
    catch (err) {
        debug(`Error: reload devices was failed (${err.message || err})`);
        return ports;
    }
}
export default detector;
//# sourceMappingURL=detector.js.map