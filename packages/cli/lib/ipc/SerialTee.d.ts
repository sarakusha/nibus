/// <reference types="node" />
import { IKnownPort, MibDescription } from '@nibus/core';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Direction } from './Server';
export interface SerialLogger {
    (data: Buffer, dir: Direction): void;
}
interface SerialTeeEvents {
    close: (path: string) => void;
}
export default class SerialTee extends TypedEmitter<SerialTeeEvents> {
    readonly portInfo: IKnownPort;
    readonly description: MibDescription;
    private readonly serial;
    private closed;
    private readonly server;
    private logger;
    constructor(portInfo: IKnownPort, description: MibDescription);
    get path(): string;
    close: () => void;
    setLogger(logger: SerialLogger | null): void;
    toJSON(): {
        portInfo: IKnownPort;
        description: MibDescription;
    };
}
export {};
//# sourceMappingURL=SerialTee.d.ts.map