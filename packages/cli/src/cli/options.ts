/*
 * @license
 * Copyright (c) 2021. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

export interface CommonOpts {
  // m: string | undefined;
  mac: string | undefined;
  raw: boolean;
  id: ReadonlyArray<string | number> | undefined;
  // name: ReadonlyArray<string> | undefined;
  mib: string | undefined;
  compact: boolean;
  quiet: boolean;
  // q: boolean;
  // fw: boolean;
  timeout: number;
}

// type Omit<T, K> = { [key in Exclude<keyof T, K>]: T[key] };

export type MakeRequired<T, K extends keyof T> = Omit<T, K> &
  {
    [P in K]-?: Exclude<T[P], undefined>;
  };

export type MacOptions = MakeRequired<CommonOpts, 'mac'>;
