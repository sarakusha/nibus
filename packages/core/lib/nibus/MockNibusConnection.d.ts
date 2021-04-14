import { TypedEmitter } from 'tiny-typed-emitter';
import { AddressParam } from '../Address';
import type { Devices } from '../mib';
import { MibDescription } from '../MibDescription';
import { NmsDatagram } from '../nms';
import type { SarpDatagram } from '../sarp';
import type { INibusSession } from '../session';
import { SlipDatagram } from '../slip';
import { NibusEvents, INibusConnection, VersionInfo } from './NibusConnection';
import NibusDatagram from './NibusDatagram';
export default class MockNibusConnection extends TypedEmitter<NibusEvents> implements INibusConnection {
    readonly session: INibusSession;
    readonly devices: Devices;
    description: MibDescription;
    readonly path = "mock-serial";
    private closed;
    constructor(session: INibusSession, devices: Devices);
    close(): void;
    findByType(_type: number): Promise<SarpDatagram>;
    getVersion(address: AddressParam): Promise<VersionInfo>;
    ping(address: AddressParam): Promise<[number, VersionInfo]>;
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    get isClosed(): boolean;
    nmsReadResponse(nmsDatagram: NmsDatagram): Promise<NmsDatagram[]>;
    slipStart(): Promise<boolean>;
    slipFinish(): void;
    execBootloader(): Promise<SlipDatagram>;
    static pingImpl(): Promise<number>;
}
//# sourceMappingURL=MockNibusConnection.d.ts.map