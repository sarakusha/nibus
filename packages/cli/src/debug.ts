/* eslint-disable import/first */
/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import debugFactory, { Debugger } from 'debug/src/node';
import log from 'electron-log';

log.transports.file.level = 'info';
log.transports.file.fileName = process.env.NIBUS_LOG || 'nibus-cli.log';
log.transports.console.level = false;

export const isElectron = {}.hasOwnProperty.call(process.versions, 'electron');

type WrappedDebugger = Debugger & {
  useColors: true;
};

export default (namespace: string): Debugger => {
  const debug = debugFactory(namespace);
  if (isElectron) {
    debug.log = log.log.bind(log);
    debug.enabled = true;
    (debug as WrappedDebugger).useColors = true;
  }
  return debug;
};
