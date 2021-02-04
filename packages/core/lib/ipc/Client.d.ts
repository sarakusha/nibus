/// <reference types="node" />
import { Socket, SocketConstructorOpts } from 'net';
import { LogLevel } from '../common';
import { PortArg } from './events';
interface ClientEvents {
    ports: (ports: PortArg[]) => void;
    add: (port: PortArg) => void;
    remove: (port: PortArg) => void;
    logLevel: (level: LogLevel) => void;
}
export interface Client {
    on<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
    once<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
    off<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
    emit<U extends keyof ClientEvents>(event: U, ...args: Parameters<ClientEvents[U]>): boolean;
}
export default class IPCClient extends Socket implements Client {
    protected constructor(options?: SocketConstructorOpts);
    parseEvents: (data: Buffer) => void;
    send(event: string, ...args: unknown[]): Promise<void>;
    static connect(path: string, connectionListener?: () => void): IPCClient;
}
export {};
//# sourceMappingURL=Client.d.ts.map