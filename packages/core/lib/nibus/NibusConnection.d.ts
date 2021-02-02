import { TypedEmitter } from 'tiny-typed-emitter';
import { AddressParam } from '../Address';
import { NmsDatagram } from '../nms';
import { SarpDatagram } from '../sarp';
import { MibDescription } from '../MibDescription';
import { BootloaderFunction, LikeArray, SlipDatagram } from '../slip';
import NibusDatagram from './NibusDatagram';
import type { IDevice } from '../mib';
export declare const MINIHOST_TYPE = 43974;
export interface NibusEvents {
    sarp: (datagram: SarpDatagram) => void;
    nms: (datagram: NmsDatagram) => void;
    close: () => void;
    chunk: (offset: number) => void;
}
export interface INibusConnection {
    on<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
    once<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
    off<U extends keyof NibusEvents>(event: U, listener: NibusEvents[U]): this;
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    ping(address: AddressParam): Promise<number>;
    findByType(type: number): Promise<SarpDatagram>;
    getVersion(address: AddressParam): Promise<[number?, number?]>;
    close(): void;
    readonly path: string;
    description: MibDescription;
    slipStart(force?: boolean): Promise<boolean>;
    slipFinish(): void;
    execBootloader(fn: BootloaderFunction, data?: LikeArray): Promise<SlipDatagram>;
    owner?: IDevice;
}
export default class NibusConnection extends TypedEmitter<NibusEvents> implements INibusConnection {
    readonly path: string;
    description: MibDescription;
    owner?: IDevice;
    private readonly socket;
    private readonly encoder;
    private readonly decoder;
    private ready;
    private closed;
    private readonly waited;
    private finishSlip;
    constructor(path: string, description: MibDescription);
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    ping(address: AddressParam): Promise<number>;
    findByType(type?: number): Promise<SarpDatagram>;
    getVersion(address: AddressParam): Promise<[number?, number?]>;
    close: () => void;
    private stopWaiting;
    private onDatagram;
    execBootloader(fn: BootloaderFunction, data?: LikeArray): Promise<SlipDatagram>;
    slipStart(force?: boolean): Promise<boolean>;
    slipFinish(): void;
}
//# sourceMappingURL=NibusConnection.d.ts.map