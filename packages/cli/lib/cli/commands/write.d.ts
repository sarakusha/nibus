import { Arguments, CommandModule, Defined } from 'yargs';
import { IDevice } from '@nibus/core/lib/mib';
import { CommonOpts } from '../options';
declare type WriteOpts = Defined<CommonOpts, 'mac' | 'm'>;
export declare function action(device: IDevice, args: Arguments<WriteOpts>): Promise<string[]>;
declare const writeCommand: CommandModule<CommonOpts, WriteOpts>;
export default writeCommand;
//# sourceMappingURL=write.d.ts.map