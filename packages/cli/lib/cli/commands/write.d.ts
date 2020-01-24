import { Arguments, CommandModule } from 'yargs';
import { IDevice } from '@nibus/core/lib/mib';
import { CommonOpts, MacOptions } from '../options';
declare type WriteOpts = MacOptions;
export declare function action(device: IDevice, args: Arguments<WriteOpts>): Promise<string[]>;
declare const writeCommand: CommandModule<CommonOpts, WriteOpts>;
export default writeCommand;
//# sourceMappingURL=write.d.ts.map