import { CommandModule } from 'yargs';
import { CommonOpts } from '../options';
declare type MibOpts = CommonOpts & {
    mibfile: string;
};
declare const mibCommand: CommandModule<CommonOpts, MibOpts>;
export default mibCommand;
//# sourceMappingURL=mib.d.ts.map