import { TypedEmitter } from 'tiny-typed-emitter';
import Address, { AddressParam } from '../Address';
import { LogLevel } from '../common';
import { Devices, IDevice } from '../mib';
import { INibusConnection } from '../nibus';
import { NmsDatagram } from '../nms';
import { Category } from './KnownPorts';
export declare type FoundListener = (arg: {
    connection: INibusConnection;
    category: Category;
    address: Address;
}) => void;
export declare type ConnectionListener = (connection: INibusConnection) => void;
export declare type DeviceListener = (device: IDevice) => void;
export interface NibusSessionEvents {
    start: () => void;
    close: () => void;
    found: FoundListener;
    add: ConnectionListener;
    remove: ConnectionListener;
    connected: DeviceListener;
    disconnected: DeviceListener;
    pureConnection: (connection: INibusConnection) => void;
    logLevel: (level: LogLevel) => void;
    informationReport: (connection: INibusConnection, info: NmsDatagram) => void;
}
export interface INibusSession {
    on<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
    once<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
    off<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
    readonly ports: number;
    start(): Promise<number>;
    close(): void;
    pingDevice(device: IDevice): Promise<number>;
    ping(address: AddressParam): Promise<number>;
    reloadDevices(): void;
    setLogLevel(logLevel: LogLevel): void;
    readonly devices: Devices;
}
export declare class NibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
    private readonly connections;
    private readonly nmsListeners;
    private isStarted;
    private socket?;
    readonly devices: Devices;
    constructor();
    get ports(): number;
    start(): Promise<number>;
    private connectDevice;
    close(): void;
    pingDevice(device: IDevice): Promise<number>;
    ping(address: AddressParam): Promise<number>;
    reloadDevices(): void;
    setLogLevel(logLevel: LogLevel): void;
    private reloadHandler;
    private addHandler;
    private closeConnection;
    private removeHandler;
    private find;
}
//# sourceMappingURL=NibusSession.d.ts.map