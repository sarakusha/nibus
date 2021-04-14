import { TypedEmitter } from 'tiny-typed-emitter';
import { AddressParam } from '../Address';
import { BrightnessHistory } from '../ipc/events';
import { Devices, IDevice } from '../mib';
import { VersionInfo } from '../nibus/NibusConnection';
import { NibusSessionEvents, INibusSession } from './NibusSession';
export declare class MockNibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
    readonly ports = 1;
    readonly devices: Devices;
    readonly port = 9001;
    private connection;
    private isStarted;
    start(): Promise<number>;
    connectDevice(device: IDevice): void;
    close(): void;
    pingDevice(_device: IDevice): Promise<number>;
    ping(_address: AddressParam): Promise<[-1, undefined] | [number, VersionInfo]>;
    reloadDevices(): void;
    setLogLevel(): void;
    saveConfig(): void;
    getBrightnessHistory(): Promise<BrightnessHistory[]>;
}
declare const session: MockNibusSession;
export default session;
//# sourceMappingURL=MockNibusSession.d.ts.map