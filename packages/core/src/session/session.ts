/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

// import { container, predicateAwareClassFactory } from 'tsyringe';

import MockNibusSession from './MockNibusSession';
import { INibusSession, NibusSession } from './NibusSession';

const session: INibusSession = !process.env.MOCKED_NIBUS
  ? new NibusSession()
  : new MockNibusSession();

/*
devices.on('new', (device: IDevice) => {
  if (!device.connection) {
    session.pingDevice(device).catch(noop);
  }
});

devices.on('delete', (device: IDevice) => {
  if (device.connection) {
    device.connection = undefined;
    session.emit('disconnected', device);
    // device.emit('disconnected');
  }
});
*/

/*
session.on('found', ({ address, connection }) => {
  console.assert(
    address.type === AddressType.mac || address.type === 'empty',
    'mac-address expected'
  );
  const devs = session.devices.find(address);
  if (devs && devs.length === 1) {
    session.connectDevice(devs[0], connection);
  }
});
*/

process.on('SIGINT', () => session.close());
process.on('SIGTERM', () => session.close());

export default session;
