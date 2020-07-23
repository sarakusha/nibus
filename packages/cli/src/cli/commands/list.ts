/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

import { CommandModule } from 'yargs';
import _ from 'lodash';
// @ts-ignore
import Table from 'table-layout';
import { PATH, Client, PortArg } from '@nibus/core';
import { CommonOpts } from '../options';
import serviceWrapper from '../serviceWrapper';

type ListOpts = CommonOpts;
const listCommand: CommandModule<CommonOpts, ListOpts> = {
  command: 'list',
  describe: 'Показать список доступных устройств',
  builder: {},
  handler: serviceWrapper(() => new Promise((resolve, reject) => {
    const socket = Client.connect(PATH);
    let resolved = false;
    let error: Error;
    socket.once('close', () => {
      resolved ? resolve() : reject(error && error.message);
    });
    socket.on('ports', (ports: PortArg[]) => {
      // debug('ports', ports);
      const rows = _.sortBy(ports, [_.property('description.category')])
        .map(({
          portInfo: {
            manufacturer, category, device, path,
          },
        }) => ({
          manufacturer,
          category,
          device,
          path,
        }));
      const table = new Table(rows, {
        maxWidth: 80,
      });
      console.info(table.toString());
      resolved = true;
      socket.destroy();
    });
    socket.on('error', err => {
      // @ts-ignore
      if (err?.code === 'ENOENT') {
        error = new Error('Сервис не запущен');
      } else {
        error = err;
      }
    });
  })),

// const rows = _.sortBy<IKnownPort>(ports, [_.property('manufacturer'),
// _.property('category')]) .map(({ manufacturer, category, device, comName }) => ({
// manufacturer, category, device, comName, })); const table = new Table(rows, { maxWidth: 80
// }); console.info(table.toString());
};

export default listCommand;
