/// <reference types="node" />
import { IKnownPort, MibDescription } from '@nibus/core';
import { Socket } from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
export declare enum Direction {
    in = 0,
    out = 1
}
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
    private readonly connections;
    private closed;
    private logger;
    constructor(portInfo: IKnownPort, description: MibDescription);
    get path(): string;
    close: () => void;
    setLogger(logger: SerialLogger | null): void;
    toJSON(): {
        portInfo: IKnownPort;
        description: MibDescription;
    };
    broadcast: (data: Buffer) => void;
    send: (data: Buffer) => void;
    private releaseSocket;
    addConnection(socket: Socket): void;
}
export {};
//# sourceMappingURL=SerialTee.d.ts.map