/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import debugFactory, { Debugger } from 'debug';
import log from 'electron-log';


log.transports.file.level = 'info';
log.transports.file.fileName = 'nibus-cli.log';
log.transports.console.level = false;

export const isElectron = {}.hasOwnProperty.call(process.versions, 'electron');

export default (namespace: string): Debugger => {
  const debug = debugFactory(namespace);
  if (isElectron || true) {
    debug.log = log.log.bind(log);
  }
  return debug;
};
