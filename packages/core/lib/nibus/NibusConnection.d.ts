/// <reference types="node" />
import { EventEmitter } from 'events';
import { AddressParam } from '../Address';
import { NmsDatagram } from '../nms';
import { SarpDatagram } from '../sarp';
import { MibDescription } from '../MibDescription';
import NibusDatagram from './NibusDatagram';
export declare const MINIHOST_TYPE = 43974;
declare type SarpListener = (datagram: SarpDatagram) => void;
declare type NmsListener = (datagram: NmsDatagram) => void;
export interface INibusConnection {
    on(event: 'sarp', listener: SarpListener): this;
    on(event: 'nms', listener: NmsListener): this;
    once(event: 'sarp', listener: SarpListener): this;
    once(event: 'nms', listener: NmsListener): this;
    addListener(event: 'sarp', listener: SarpListener): this;
    addListener(event: 'nms', listener: NmsListener): this;
    off(event: 'sarp', listener: SarpListener): this;
    off(event: 'nms', listener: NmsListener): this;
    removeListener(event: 'sarp', listener: SarpListener): this;
    removeListener(event: 'nms', listener: NmsListener): this;
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    ping(address: AddressParam): Promise<number>;
    findByType(type: number): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    getVersion(address: AddressParam): Promise<[number?, number?]>;
    close(): void;
    readonly path: string;
    description: MibDescription;
}
declare class NibusConnection extends EventEmitter implements INibusConnection {
    readonly path: string;
    readonly description: MibDescription;
    private readonly socket;
    private readonly encoder;
    private readonly decoder;
    private ready;
    private closed;
    private readonly waited;
    constructor(path: string, description: MibDescription);
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    ping(address: AddressParam): Promise<number>;
    findByType(type?: number): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    getVersion(address: AddressParam): Promise<[number?, number?]>;
    close: () => void;
    private stopWaiting;
    private onDatagram;
}
export default NibusConnection;
//# sourceMappingURL=NibusConnection.d.ts.map