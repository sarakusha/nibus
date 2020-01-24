/// <reference types="node" />
import { EventEmitter } from 'events';
import { IKnownPort, MibDescription } from '@nibus/core';
import { Direction } from './Server';
export interface SerialLogger {
    (data: Buffer, dir: Direction): void;
}
export default class SerialTee extends EventEmitter {
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
//# sourceMappingURL=SerialTee.d.ts.map