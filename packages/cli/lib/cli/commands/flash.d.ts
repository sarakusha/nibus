import { WriteOptions } from 'electron-log';
import { Arguments, CommandModule } from 'yargs';
import { IDevice } from '@nibus/core';
import { CommonOpts, MacOptions } from '../options';
export declare type FlashOpts = MacOptions & {
    kind?: string;
    source: string;
};
export declare function action(device: IDevice, args: Arguments<FlashOpts & WriteOptions>): Promise<void>;
declare const flashCommand: CommandModule<CommonOpts, FlashOpts>;
export default flashCommand;
//# sourceMappingURL=flash.d.ts.map