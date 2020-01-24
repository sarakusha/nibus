import { CommandModule } from 'yargs';
import { CommonOpts, MacOptions } from '../options';
declare type FlashOpts = MacOptions & {
    kind?: string;
    source: string;
    src?: string;
    execute?: string;
};
declare const flashCommand: CommandModule<CommonOpts, FlashOpts>;
export default flashCommand;
//# sourceMappingURL=flash.d.ts.map