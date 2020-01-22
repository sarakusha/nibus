/// <reference types="node" />
import { Arguments, CommandModule } from 'yargs';
import { IDevice } from '@nibus/core';
import { CommonOpts, MacOptions } from '../options';
declare type DownloadOpts = MacOptions & {
    domain: string;
    offset: number;
    source?: string;
    src?: string;
    hex?: boolean;
    execute?: string;
    terminate?: boolean;
};
export declare const convert: (buffer: Buffer) => [Buffer, number];
export declare function action(device: IDevice, args: Arguments<DownloadOpts>): Promise<void>;
declare const downloadCommand: CommandModule<CommonOpts, DownloadOpts>;
export default downloadCommand;
//# sourceMappingURL=download.d.ts.map