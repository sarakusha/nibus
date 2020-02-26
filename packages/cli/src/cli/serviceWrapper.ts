/*
 * @license
 * Copyright (c) 2020. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import { PATH } from '@nibus/core';
import { Arguments } from 'yargs';
import fs from 'fs';

export type Handler<U> = (args: Arguments<U>) => Promise<void>;

const delay = (sec: number): Promise<void> => new Promise(
  resolve => setTimeout(resolve, sec * 1000),
);

export default function serviceWrapper<U>(handler: Handler<U>): Handler<U> {
  return async (args: Arguments<U>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nibus: any;
    if (!fs.existsSync(PATH)) {
      const { default: service } = await import('../service');
      nibus = service;
      await service.start();
      await delay(1);
    }
    handler(args).finally(() => {
      nibus && nibus.stop();
    });
  };
}
