import { StartOptions } from 'pm2';
import { CommandModule } from 'yargs';
import { CommonOpts } from '../options';
export declare const startOptions: StartOptions;
declare type StartOpts = CommonOpts;
declare const startCommand: CommandModule<CommonOpts, StartOpts>;
export default startCommand;
//# sourceMappingURL=start.d.ts.map