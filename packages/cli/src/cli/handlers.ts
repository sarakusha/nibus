/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { Arguments, Defined } from 'yargs';
import { getDefaultSession, IDevice, Address, config, INibusConnection } from '@nibus/core';

import { CommonOpts } from './options';
import serviceWrapper, { Handler } from './serviceWrapper';

// export type NibusCounter = (handler: (count: number) => number) => void;

interface ActionFunc<O> {
  (device: IDevice, args: Arguments<O>): Promise<unknown>;
}
const session = getDefaultSession();
const { devices } = session;

export default function makeAddressHandler<O extends Defined<CommonOpts, 'mac'>>(
  action: ActionFunc<O>,
  breakout = false
): Handler<O> {
  return serviceWrapper(async (args: Arguments<O>) => {
    // На Windows сложнее метод определения и занимает больше времени
    let count = (await session.start()) * (process.platform === 'win32' ? 3 : 1);
    return new Promise(resolve => {
      let timeout: NodeJS.Timeout;
      let hasFound = false;
      const close = (err?: string): void => {
        clearTimeout(timeout);
        session.close();
        if (err || !hasFound) {
          console.error(err || 'Устройство не найдено');
        }
        resolve();
      };
      const mac = new Address(args.mac);
      if (args.timeout && args.timeout !== config.timeout * 1000) {
        config.timeout = args.timeout * 1000;
      }

      const perform = async (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection: INibusConnection,
        mibOrType: number | string,
        version?: number
      ): Promise<void> => {
        clearTimeout(timeout);
        const device =
          typeof mibOrType === 'string'
            ? devices.create(mac, mibOrType)
            : devices.create(mac, mibOrType, version);
        device.connection = connection;
        await action(device, args);
        hasFound = true;
      };

      const wait = (): void => {
        count -= 1;
        if (count > 0) {
          timeout = setTimeout(wait, config.timeout);
        } else {
          close();
        }
      };

      session.on('found', async ({ address, connection }) => {
        try {
          if (address.equals(mac) && connection.description.mib) {
            if (!args.mib || args.mib === connection.description.mib) {
              await perform(connection, connection.description.mib);
              if (breakout) {
                close();
                return;
              }
              wait();
            }
          }
          if ((address.equals(mac) && connection.description.type) || connection.description.link) {
            count += 1;
            const [version, type] = await connection.getVersion(mac);
            if (type) {
              await perform(connection, type, version);
              if (breakout) {
                close();
                return;
              }
              wait();
            }
          }
        } catch (e) {
          close(e.message || e);
        }
        count -= 1;
        if (count === 0) {
          clearTimeout(timeout);
          process.nextTick(close);
        }
      });

      timeout = setTimeout(wait, config.timeout);
    });
  });
}
