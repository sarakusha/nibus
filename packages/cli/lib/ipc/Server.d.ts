/// <reference types="node" />
import { LogLevel } from '@nibus/core';
import { Socket } from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import type SerialTee from './SerialTee';
import { Direction } from './SerialTee';
interface IPCServerEvents {
    connection: (socket: Socket) => void;
    'client:error': (socket: Socket, err: Error) => void;
    'client:setLogLevel': (client: Socket, logLevel: LogLevel | undefined) => void;
    'client:reloadDevices': (socket: Socket) => void;
    'client:config': (socket: Socket, config: Record<string, unknown>) => void;
    raw: (data: Buffer, dir: Direction) => void;
}
declare class IPCServer extends TypedEmitter<IPCServerEvents> {
    ports: Record<string, SerialTee>;
    private readonly clients;
    private readonly server;
    private closed;
    private tail;
    constructor();
    get path(): string;
    listen(port: number, host?: string): Promise<void>;
    send(client: Socket, event: string, ...args: unknown[]): Promise<void>;
    broadcast(event: string, ...args: unknown[]): Promise<void>;
    close: () => void;
    private connectionHandler;
}
export default IPCServer;
//# sourceMappingURL=Server.d.ts.map