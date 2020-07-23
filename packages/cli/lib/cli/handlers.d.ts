import { Arguments, Defined } from 'yargs';
import { IDevice } from '@nibus/core';
import { CommonOpts } from './options';
import { Handler } from './serviceWrapper';
interface ActionFunc<O> {
    (device: IDevice, args: Arguments<O>): Promise<unknown>;
}
export default function makeAddressHandler<O extends Defined<CommonOpts, 'mac'>>(action: ActionFunc<O>, breakout?: boolean): Handler<O>;
export {};
//# sourceMappingURL=handlers.d.ts.map