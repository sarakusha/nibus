import { TypedEmitter } from 'tiny-typed-emitter';
import { IDevice } from '../mib';
export declare const FlashKinds: readonly ["fpga", "mcu", "rbf", "ttc", "ctrl", "tca", "tcc"];
export declare type Kind = typeof FlashKinds[number];
export declare type Ext = 'rbf' | 'tcc' | 'tca' | 'xml' | 'hex' | 'txt';
export declare const KindMap: Record<Kind, readonly [ext: Ext, isModule: boolean, legacy: boolean]>;
declare type Listener<T> = (arg: T) => void;
export declare type FlasherStart = {
    total: number;
    offset: number;
};
export declare type FlasherModule = {
    moduleSelect: number;
    x: number;
    y: number;
    msg?: string;
};
export declare type FlasherStartListener = Listener<FlasherStart>;
export declare type FlasherModuleListener = Listener<FlasherModule>;
export declare type FlasherFinishListener = Listener<void>;
export interface FlasherEvents {
    error: (e: Error) => void;
    start: FlasherStartListener;
    tick: Listener<{
        length?: number;
        offset?: number;
    }>;
    module: FlasherModuleListener;
    finish: FlasherFinishListener;
}
export declare class Flasher extends TypedEmitter<FlasherEvents> {
    readonly device: IDevice;
    constructor(deviceId: string);
    flashAtmega(hexSource: string): {
        total: number;
        offset: number;
    };
    flash(kind: Kind, source: string, moduleSelect?: number): {
        total: number;
        offset: number;
    };
    flash(source: string, moduleSelect?: number): {
        total: number;
        offset: number;
    };
}
export {};
//# sourceMappingURL=Flasher.d.ts.map