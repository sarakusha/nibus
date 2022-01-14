/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

const usbDetect = require('usb-detection');

usbDetect.on('add', device => {
  console.info('changed', device);
});

usbDetect.startMonitoring();
process.on('SIGINT', () => {
  usbDetect.stopMonitoring();
  console.info('stop');
});
