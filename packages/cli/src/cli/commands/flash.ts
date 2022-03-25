/*
 * @license
 * Copyright (c) 2022. Nata-Info
 * @author Andrei Sarakeev <avs@nata-info.ru>
 *
 * This file is part of the "@nibus" project.
 * For the full copyright and license information, please view
 * the EULA file that was distributed with this source code.
 */

// import { WriteOptions } from 'electron-log';
/* eslint-disable no-bitwise */
import { Arguments, CommandModule } from 'yargs';
import Progress from 'progress';

import { Flasher, IDevice } from '@nibus/core';
import makeAddressHandler from '../handlers';
import { CommonOpts, MacOptions } from '../options';
import { action as writeAction } from './write';

export type FlashOpts = MacOptions & {
  kind?: string;
  source: string;
};

export async function action(device: IDevice, args: Arguments<FlashOpts>): Promise<void> {
  const isModule = (await writeAction(device, args)).includes('moduleSelect');
  const flasher = new Flasher(device.id);
  const { total, offset } = flasher.flash(args.source, isModule ? device.moduleSelect : undefined);
  const dest = offset.toString(16).padStart(5, '0');
  const bar = new Progress(
    `  flashing [:bar] to ${dest}h :rate/bps :percent :current/:total :etas`,
    {
      total,
      width: 30,
    }
  );
  flasher.on('tick', length => bar.tick(length));
  flasher.on('module', ({ x, y, msg }) => {
    if (!msg) console.info(`Модуль ${x},${y}: Ok`);
    else console.error(msg);
  });
  return new Promise(resolve => {
    flasher.once('finish', resolve);
  });
  /*
  if (isModule) {
    device.selector = 0;
    await device.write(device.getId('selector'));
    const checkModul = async (): Promise<boolean> => {
      const xy = parseModuleSelect(device.moduleSelect);
      try {
        const data = await device.upload('MODUL', 0, 6);
        // console.log('RESULT', data[3].toString(2), data);
        let msg: string | undefined;
        if (data[3] & 0b100) {
          msg = `Модуль ${xy}: Ошибка контрольной суммы в кадре`;
        }
        if (data[3] & 0b1000) {
          msg = `Модуль ${xy}: Таймаут ожидания валидности страницы`;
        }
        if (data[3] & 0b10000) {
          msg = `Модуль ${xy}: Ошибка в работе флеш памяти`;
        }
        if (msg) {
          console.error(msg);
        } else {
          console.log(`Модуль ${xy}: Ok`);
        }
        progressCallback(device.moduleSelect, msg);
        return true;
      } catch (err) {
        // console.error('Ошибка проверки MODUL', err.message || err);
        return false;
      }
    };
    if (device.moduleSelect !== 0xffff) {
      await checkModul();
    } else {
      const idModuleSelect = device.getId('moduleSelect');
      let y = 0;
      for (let x = 0; x < 24; x += 1) {
        for (y = 0; y < 256; y += 1) {
          try {
            device.moduleSelect = (x << 8) + y;
            // eslint-disable-next-line no-await-in-loop
            await device.write(idModuleSelect);
            // eslint-disable-next-line no-await-in-loop
            const res = await checkModul();
            if (!res) break;
          } catch (err) {
            console.error('Ошибка при проверке диапазона модулей', err.message ?? err);
            progressCallback(device.moduleSelect, err.message ?? err);
            break;
          }
        }
        if (y === 0) {
          const msg = `Столб ${x} не ответил`;
          console.log(msg);
          progressCallback((x << 8) | 0xff, msg);
        }
      }
      device.moduleSelect = 0xffff;
      await device.write(idModuleSelect);
    }
  }
  if (opts.exec) {
    await device.execute(opts.exec);
  }
  finishCallback();
*/
  // console.log('BUFFER', buffer.slice(0, 80).toString('hex'));
}

const flashCommand: CommandModule<CommonOpts, FlashOpts> = {
  command: 'flash',
  describe: 'прошивка минихоста3',
  builder: argv =>
    argv
      .option('kind', {
        alias: 'k',
        choices: ['rbf', 'tca', 'tcc', 'ttc', 'ctrl', 'mcu', 'fpga'],
      })
      // .option('offset', {
      //   alias: 'ofs',
      //   default: 0,
      //   number: true,
      //   describe: 'смещение в домене',
      // })
      .option('source', {
        alias: 'src',
        string: true,
        describe: 'загрузить данные из файла',
      })
      // .option('execute', {
      //   alias: 'exec',
      //   string: true,
      //   describe: 'выполнить программу после записи',
      // })
      // .option('hex', {
      //   boolean: true,
      //   describe: 'использовать шестнадцатиричный формат',
      // })
      // .option('dec', {
      //   boolean: true,
      //   describe: 'использовать десятичный двубайтный формат',
      // })
      // .conflicts('hex', 'dec')
      .example(
        '$0 flash -m ::1 moduleSelect=0 --src Alpha_Ctrl_SPI_Module_C10_320_104.rbf',
        'Прошивка ПЛИС модуля 0:0 (если расширение .rbf, [-k rbf] - можно не указывать) '
      )
      .example(
        '$0 flash -m ::1 moduleSelect=0 --src data.tcc',
        `Прошивка таблицы цветокоррекции v1 для модуля
\t(если расширение .tcc, [-k tcc] - можно не указывать)`
      )
      .example(
        '$0 flash -m ::1 moduleSelect=0 --src config.xml',
        `Прошивка таблицы цветокоррекции v2 для модуля
\t(если расширение .xml, [-k ttc] - можно не указывать)`
      )
      .example(
        '$0 flash -m ::1 moduleSelect=0 --src Slim_Ctrl_v5_Mcu_v1.2.txt',
        `Прошивка процессора модуля
\t(если расширение .txt, [-k ctrl] - можно не указывать)`
      )
      .example(
        '$0 flash -m ::1 --src NataInfo_4.0.1.1.txt',
        `Прошивка процессора хоста
\t(если расширение .txt, [-k ctrl] - можно не указывать)`
      )
      .demandOption(['mac', 'source']),
  handler: makeAddressHandler(action),
};

export default flashCommand;
