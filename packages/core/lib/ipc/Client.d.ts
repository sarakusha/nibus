/// <reference types="node" />
import { Socket, SocketConstructorOpts } from 'net';
import { PortArg } from './events';
export interface Client {
    addListener(event: 'ports', listener: (ports: PortArg[]) => void): this;
    addListener(event: 'add', listener: (port: PortArg) => void): this;
    addListener(event: 'remove', listener: (port: PortArg) => void): this;
    on(event: 'ports', listener: (ports: PortArg[]) => void): this;
    on(event: 'add', listener: (port: PortArg) => void): this;
    on(event: 'remove', listener: (port: PortArg) => void): this;
    once(event: 'ports', listener: (ports: PortArg[]) => void): this;
    once(event: 'add', listener: (port: PortArg) => void): this;
    once(event: 'remove', listener: (port: PortArg) => void): this;
}
export default class IPCClient extends Socket implements Client {
    protected constructor(options?: SocketConstructorOpts);
    parseEvents: (data: Buffer) => void;
    send(event: string, ...args: unknown[]): Promise<void>;
    static connect(path: string, connectionListener?: () => void): IPCClient;
}
//# sourceMappingURL=Client.d.ts.map