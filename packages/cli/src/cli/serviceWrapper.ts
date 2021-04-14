/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */
import { Arguments } from 'yargs';
import type { NibusService } from '../service';

export type Handler<U> = (args: Arguments<U>) => Promise<void>;

const delay = (sec: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, sec * 1000));

export default function serviceWrapper<U>(handler: Handler<U>): Handler<U> {
  return async (args: Arguments<U>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nibus: NibusService | undefined;
    try {
      const { default: service } = await import('../service');
      nibus = service;
      await service.start();
      await delay(1);
    } catch (err) {
      const { code } = (err as unknown) as { code: string };
      if (code !== 'EADDRINUSE') throw err;
    }
    handler(args)
      .catch(err => console.error(err.message))
      .finally(() => {
        nibus && nibus.stop();
        process.nextTick(() => process.exit(0));
      });
  };
}
