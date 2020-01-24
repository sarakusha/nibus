import { CommandModule } from 'yargs';
import { CommonOpts } from '../options';
declare type LogOpts = CommonOpts & {
    level?: string;
    pick?: ReadonlyArray<string | number>;
    omit?: ReadonlyArray<string | number>;
    begin?: boolean;
};
declare const logCommand: CommandModule<CommonOpts, LogOpts>;
export default logCommand;
//# sourceMappingURL=log.d.ts.map