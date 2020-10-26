/// <reference types="node" />
import { EventEmitter } from 'events';
import { AddressParam } from '../Address';
import { MibDescription } from '../MibDescription';
import { NmsDatagram } from '../nms';
import { INibusConnection } from './NibusConnection';
import NibusDatagram from './NibusDatagram';
export default class MockNibusConnection extends EventEmitter implements INibusConnection {
    description: MibDescription;
    readonly path = "mock-serial";
    constructor();
    close(): void;
    findByType(_type: number): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    getVersion(_address: AddressParam): Promise<[number, number]>;
    ping(_address: AddressParam): Promise<number>;
    sendDatagram(datagram: NibusDatagram): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    nmsReadResponse(nmsDatagram: NmsDatagram): Promise<NmsDatagram[]>;
    static pingImpl(): Promise<number>;
}
//# sourceMappingURL=MockNibusConnection.d.ts.map