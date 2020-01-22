import { CommandModule } from 'yargs';
import { CommonOpts, MacOptions } from '../options';
declare type PingOpts = MacOptions & {
    count?: number;
    timeout?: number;
};
declare const pingCommand: CommandModule<CommonOpts, PingOpts>;
export default pingCommand;
//# sourceMappingURL=ping.d.ts.map