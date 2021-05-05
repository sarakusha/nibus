import { TypedEmitter } from 'tiny-typed-emitter';
import Address, { AddressParam } from '../Address';
import { LogLevel } from '../common';
import { Client, Host, Display } from '../ipc';
import { BrightnessHistory } from '../ipc/events';
import { Devices, IDevice, DeviceId } from '../mib';
import { INibusConnection } from '../nibus';
import { VersionInfo } from '../nibus/NibusConnection';
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
    config: (config: Record<string, unknown>) => void;
    host: (host: Host) => void;
    log: (line: string) => void;
    online: (isOnline: boolean) => void;
    displays: (value: Display[]) => void;
}
export interface INibusSession {
    on<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
    once<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
    off<U extends keyof NibusSessionEvents>(event: U, listener: NibusSessionEvents[U]): this;
    readonly ports: number;
    start(port?: number, host?: string): Promise<number>;
    close(): void;
    pingDevice(device: IDevice): Promise<number>;
    ping(address: AddressParam): Promise<[-1, undefined] | [number, VersionInfo]>;
    reloadDevices(): void;
    setLogLevel(logLevel: LogLevel): void;
    saveConfig(config: Record<string, unknown>): void;
    getBrightnessHistory(dt?: number): Promise<BrightnessHistory[]>;
    readonly devices: Devices;
    readonly host?: string;
    readonly port: number;
    getSocket(): Client | undefined;
}
export declare class NibusSession extends TypedEmitter<NibusSessionEvents> implements INibusSession {
    readonly port: number;
    readonly host?: string | undefined;
    private readonly connections;
    private readonly nmsListeners;
    private isStarted;
    private socket?;
    readonly devices: Devices;
    constructor(port: number, host?: string | undefined);
    get ports(): number;
    getSocket(): Client | undefined;
    start(): Promise<number>;
    private connectDevice;
    close(): void;
    pingDevice(device: IDevice): Promise<number>;
    ping(address: AddressParam): Promise<[-1, undefined] | [number, VersionInfo]>;
    reloadDevices(): void;
    setLogLevel(logLevel: LogLevel): void;
    saveConfig(config: Record<string, unknown>): void;
    getBrightnessHistory(dt?: number): Promise<BrightnessHistory[]>;
    private reloadHandler;
    private addHandler;
    private closeConnection;
    private removeHandler;
    private find;
}
export declare const getNibusSession: (port?: number, host?: string | undefined) => INibusSession;
export declare const getDefaultSession: () => INibusSession;
export declare const getSessions: () => INibusSession[];
export declare const findDeviceById: (id: DeviceId) => IDevice | undefined;
export declare const setDefaultSession: (port: number, host?: string | undefined) => INibusSession;
//# sourceMappingURL=NibusSession.d.ts.map