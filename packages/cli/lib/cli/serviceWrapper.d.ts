import { Arguments } from 'yargs';
export declare type Handler<U> = (args: Arguments<U>) => Promise<void>;
export default function serviceWrapper<U>(handler: Handler<U>): Handler<U>;
//# sourceMappingURL=serviceWrapper.d.ts.map