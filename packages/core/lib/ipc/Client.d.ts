/// <reference types="node" />
import { Socket, SocketConstructorOpts } from 'net';
import { LogLevel } from '../common';
import { ClientEventsArgs } from './clientEvents';
import { Display, Host, PortArg } from './events';
interface ClientEvents {
    ports: (ports: PortArg[]) => void;
    add: (port: PortArg) => void;
    remove: (port: PortArg) => void;
    logLevel: (level: LogLevel) => void;
    config: (config: Record<string, unknown>) => void;
    host: (host: Host) => void;
    log: (line: string) => void;
    online: (isOnline: boolean) => void;
    displays: (value: Display[]) => void;
}
export interface Client {
    on<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
    once<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
    off<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this;
    emit<U extends keyof ClientEvents>(event: U, ...args: Parameters<ClientEvents[U]>): boolean;
}
declare type RemoteServer = {
    host?: string;
    port: number;
};
export default class IPCClient extends Socket implements Client {
    readonly host: string;
    timeoutTimer: number;
    private online;
    private tail;
    protected constructor(host?: string, options?: SocketConstructorOpts);
    get isOnline(): boolean;
    setOnline(value: boolean): void;
    parseEvents: (data: Buffer) => void;
    send(...[event, ...args]: ClientEventsArgs): Promise<void>;
    static connect(remoteServer: RemoteServer, connectionListener?: () => void): IPCClient;
}
export {};
//# sourceMappingURL=Client.d.ts.map