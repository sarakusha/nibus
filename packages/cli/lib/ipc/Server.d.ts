/// <reference types="node" />
import { Fields, LogLevel } from '@nibus/core';
import { Socket } from 'net';
import { Duplex } from 'stream';
export declare enum Direction {
    in = 0,
    out = 1
}
export declare type ClientEvent = `client:${string}`;
interface IPCServerEvents {
    connection: (socket: Socket) => void;
    'client:error': (socket: Socket, err: Error) => void;
    'client:setLogLevel': (client: Socket, logLevel: LogLevel | undefined, pickFields: Fields, omitFields: Fields) => void;
    'client:reloadDevices': () => void;
    raw: (data: Buffer, dir: Direction) => void;
}
interface IPCServer {
    on<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
    once<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
    off<U extends keyof IPCServerEvents>(event: U, listener: IPCServerEvents[U]): this;
    emit<U extends keyof IPCServerEvents>(event: U, ...args: Parameters<IPCServerEvents[U]>): boolean;
    emit(clientEvent: ClientEvent, socket: Socket, ...args: unknown[]): boolean;
}
declare class IPCServer extends Duplex {
    private readonly raw;
    private readonly server;
    private readonly clients;
    private closed;
    private reading;
    constructor(path: string, raw?: boolean);
    get path(): string;
    _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
    _read(_size: number): void;
    send(client: Socket, event: string, ...args: unknown[]): Promise<void>;
    broadcast(event: string, ...args: unknown[]): Promise<void>;
    close: () => void;
    private connectionHandler;
    private errorHandler;
}
export default IPCServer;
//# sourceMappingURL=Server.d.ts.map