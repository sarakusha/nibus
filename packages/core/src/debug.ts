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

export const isElectron = {}.hasOwnProperty.call(process.versions, 'electron');

type WrappedDebugger = Debugger & {
  useColors: true;
};

export default (namespace: string): Debugger => {
  const debug = debugFactory(namespace);
  if (isElectron) {
    import('electron-log').then(({ default: log }) => {
      log.transports.file.level = 'info';
      log.transports.file.fileName = process.env.NIBUS_LOG || 'nibus-core.log';
      log.transports.console.level = false;
      debug.log = log.log.bind(log);
    });
    (debug as WrappedDebugger).useColors = true;
    debug.enabled = true;
  }
  return debug;
};
