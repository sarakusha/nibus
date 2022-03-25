/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

export { default as Client } from './Client';
export type { PortArg, Host, Display, BrightnessHistory } from './events';
export * from './clientEvents';

export function getSocketPath(path: string): string {
  return `/tmp/nibus.${path.replace(/^(\/dev\/)/, '')}`;
}
