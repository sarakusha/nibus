import { CommandModule } from 'yargs';
import { CommonOpts, MacOptions } from '../options';
declare type ExecuteOpts = MacOptions & {
    program: string;
};
declare const executeCommand: CommandModule<CommonOpts, ExecuteOpts>;
export default executeCommand;
//# sourceMappingURL=execute.d.ts.map