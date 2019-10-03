import { CommandModule } from 'yargs';
import { CommonOpts } from '../options';
declare type ParseOptions = CommonOpts & {
    pick?: string[];
    omit?: string[];
    input: string;
};
declare const parseCommand: CommandModule<CommonOpts, ParseOptions>;
export default parseCommand;
//# sourceMappingURL=parse.d.ts.map