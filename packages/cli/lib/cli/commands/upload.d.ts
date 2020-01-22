import { Arguments, CommandModule } from 'yargs';
import { IDevice } from '@nibus/core';
import { CommonOpts, MacOptions } from '../options';
declare type UploadOpts = MacOptions & {
    domain: string;
    offset: number;
    size?: number;
    o?: string;
    out?: string;
    hex?: boolean;
    f?: boolean;
    force?: boolean;
};
export declare function action(device: IDevice, args: Arguments<UploadOpts>): Promise<void>;
declare const uploadCommand: CommandModule<CommonOpts, UploadOpts>;
export default uploadCommand;
//# sourceMappingURL=upload.d.ts.map