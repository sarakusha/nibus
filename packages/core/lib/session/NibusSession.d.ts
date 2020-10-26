/// <reference types="node" />
import { EventEmitter } from 'events';
import Address, { AddressParam } from '../Address';
import { IDevice } from '../mib';
import { INibusConnection } from '../nibus';
import { Category } from './KnownPorts';
export declare const delay: (seconds: number) => Promise<void>;
export declare type FoundListener = (arg: {
    connection: INibusConnection;
    category: Category;
    address: Address;
}) => void;
export declare type ConnectionListener = (connection: INibusConnection) => void;
export declare type DeviceListener = (device: IDevice) => void;
export interface INibusSession extends EventEmitter {
    on(event: 'start' | 'close', listener: () => void): this;
    on(event: 'found', listener: FoundListener): this;
    on(event: 'add' | 'remove', listener: ConnectionListener): this;
    on(event: 'connected' | 'disconnected', listener: DeviceListener): this;
    on(event: 'pureConnection', listener: (connection: INibusConnection) => void): this;
    once(event: 'start' | 'close', listener: () => void): this;
    once(event: 'found', listener: FoundListener): this;
    once(event: 'add' | 'remove', listener: ConnectionListener): this;
    once(event: 'connected' | 'disconnected', listener: DeviceListener): this;
    once(event: 'pureConnection', listener: (connection: INibusConnection) => void): this;
    off(event: 'start' | 'close', listener: () => void): this;
    off(event: 'found', listener: FoundListener): this;
    off(event: 'add' | 'remove', listener: ConnectionListener): this;
    off(event: 'connected' | 'disconnected', listener: DeviceListener): this;
    off(event: 'pureConnection', listener: (connection: INibusConnection) => void): this;
    removeListener(event: 'start' | 'close', listener: () => void): this;
    removeListener(event: 'found', listener: FoundListener): this;
    removeListener(event: 'add' | 'remove', listener: ConnectionListener): this;
    removeListener(event: 'connected' | 'disconnected', listener: DeviceListener): this;
    removeListener(event: 'pureConnection', listener: (connection: INibusConnection) => void): this;
    readonly ports: number;
    start(): Promise<number>;
    connectDevice(device: IDevice, connection: INibusConnection): void;
    close(): void;
    pingDevice(device: IDevice): Promise<number>;
    ping(address: AddressParam): Promise<number>;
}
export declare class NibusSession extends EventEmitter implements INibusSession {
    private readonly connections;
    private isStarted;
    private socket?;
    get ports(): number;
    start(): Promise<number>;
    connectDevice(device: IDevice, connection: INibusConnection): void;
    close(): void;
    pingDevice(device: IDevice): Promise<number>;
    ping(address: AddressParam): Promise<number>;
    private reloadHandler;
    private addHandler;
    private closeConnection;
    private removeHandler;
    private find;
}
//# sourceMappingURL=NibusSession.d.ts.map