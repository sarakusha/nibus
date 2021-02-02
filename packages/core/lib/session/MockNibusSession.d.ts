import { TypedEmitter } from 'tiny-typed-emitter';
import { AddressParam } from '../Address';
import { Devices, IDevice } from '../mib';
import { NibusSessionEvents, INibusSession } from './NibusSession';
export default class MockNibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
    readonly ports = 1;
    readonly devices: Devices;
    private connection;
    private isStarted;
    start(): Promise<number>;
    connectDevice(device: IDevice): void;
    close(): void;
    pingDevice(_device: IDevice): Promise<number>;
    ping(_address: AddressParam): Promise<number>;
    reloadDevices(): void;
    setLogLevel(): void;
}
//# sourceMappingURL=MockNibusSession.d.ts.map