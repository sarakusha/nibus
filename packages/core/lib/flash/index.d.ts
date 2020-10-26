/// <reference types="node" />
import { EventEmitter } from 'events';
import { IDevice } from '../mib';
export declare const FlashKinds: readonly ["fpga", "mcu", "rbf", "ttc", "ctrl", "tca", "tcc"];
export declare type Kind = typeof FlashKinds[number];
export declare type Ext = 'rbf' | 'tcc' | 'tca' | 'xml' | 'txt';
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
export interface Flasher extends EventEmitter {
    on(event: 'start', listener: FlasherStartListener): this;
    on(event: 'tick', listener: Listener<number>): this;
    on(event: 'module', listener: FlasherModuleListener): this;
    on(event: 'finish', listener: FlasherFinishListener): this;
    once(event: 'start', listener: FlasherStartListener): this;
    once(event: 'tick', listener: Listener<number>): this;
    once(event: 'module', listener: FlasherModuleListener): this;
    once(event: 'finish', listener: FlasherFinishListener): this;
    off(event: 'start', listener: FlasherStartListener): this;
    off(event: 'tick', listener: Listener<number>): this;
    off(event: 'module', listener: FlasherModuleListener): this;
    off(event: 'finish', listener: FlasherFinishListener): this;
    emit(event: 'start', opts: FlasherStart): boolean;
    emit(event: 'tick', length: number): this;
    emit(event: 'module', opts: FlasherModule): boolean;
    emit(event: 'finish'): boolean;
}
export declare class Flasher extends EventEmitter {
    readonly device: IDevice;
    constructor(device: IDevice);
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
//# sourceMappingURL=index.d.ts.map