/// <reference types="node" />
import { EventEmitter } from 'events';
import { AddressParam } from '../Address';
import { IDevice } from '../mib';
import { INibusConnection } from '../nibus';
import type { INibusSession } from './NibusSession';
export default class MockNibusSession extends EventEmitter implements INibusSession {
    readonly ports = 1;
    private connection;
    private isStarted;
    start(): Promise<number>;
    connectDevice(device: IDevice, connection: INibusConnection): void;
    close(): void;
    pingDevice(_device: IDevice): Promise<number>;
    ping(_address: AddressParam): Promise<number>;
}
//# sourceMappingURL=MockNibusSession.d.ts.map