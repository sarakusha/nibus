import { TypedEmitter } from 'tiny-typed-emitter';
import { AddressParam } from '../Address';
import type { Devices } from '../mib';
import { MibDescription } from '../MibDescription';
import { NmsDatagram } from '../nms';
import { SarpDatagram } from '../sarp';
import { SlipDatagram } from '../slip';
import { NibusEvents, INibusConnection } from './NibusConnection';
import NibusDatagram from './NibusDatagram';
export default class MockNibusConnection extends TypedEmitter<NibusEvents> implements INibusConnection {
    readonly devices: Devices;
    description: MibDescription;
    readonly path = "mock-serial";
    constructor(devices: Devices);
    close(): void;
    findByType(_type: number): Promise<SarpDatagram>;
    getVersion(_address: AddressParam): Promise<[number, number]>;
    ping(_address: AddressParam): Promise<number>;
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    nmsReadResponse(nmsDatagram: NmsDatagram): Promise<NmsDatagram[]>;
    slipStart(): Promise<boolean>;
    slipFinish(): void;
    execBootloader(): Promise<SlipDatagram>;
    static pingImpl(): Promise<number>;
}
//# sourceMappingURL=MockNibusConnection.d.ts.map