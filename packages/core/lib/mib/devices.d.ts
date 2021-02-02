/// <reference types="node" />
import { TypedEmitter } from 'tiny-typed-emitter';
import Address, { AddressParam } from '../Address';
import { INibusConnection } from '../nibus';
import NmsDatagram from '../nms/NmsDatagram';
import { Config } from '../common';
declare type Listener<T> = (arg: T) => void;
declare type ChangeArg = {
    id: number;
    names: string[];
};
declare type ChangeListener = Listener<ChangeArg>;
declare type UploadStartArg = {
    domain: string;
    domainSize: number;
    offset: number;
    size: number;
};
declare type UploadStartListener = Listener<UploadStartArg>;
declare type UploadDataArg = {
    domain: string;
    data: Buffer;
    pos: number;
};
export declare type UploadDataListener = Listener<UploadDataArg>;
declare type UploadFinishArg = {
    domain: string;
    offset: number;
    data: Buffer;
};
declare type UploadFinishListener = Listener<UploadFinishArg>;
declare type DownloadStartArg = {
    domain: string;
    domainSize: number;
    offset: number;
    size: number;
};
declare type DownloadStartListener = Listener<DownloadStartArg>;
declare type DownloadDataArg = {
    domain: string;
    length: number;
};
export declare type DownloadDataListener = Listener<DownloadDataArg>;
declare type DownloadFinishArg = {
    domain: string;
    offset: number;
    size: number;
};
declare type DownloadFinishListener = Listener<DownloadFinishArg>;
export declare type DeviceId = string & {
    __brand: 'DeviceId';
};
interface IDeviceEvents {
    connected: () => void;
    disconnected: () => void;
    changing: ChangeListener;
    changed: ChangeListener;
    uploadStart: UploadStartListener;
    uploadData: UploadDataListener;
    uploadFinish: UploadFinishListener;
    downloadStart: DownloadStartListener;
    downloadData: DownloadDataListener;
    downloadFinish: DownloadFinishListener;
    uploadError: (e: Error) => void;
    release: (device: IDevice) => void;
}
export interface IDevice {
    readonly id: DeviceId;
    readonly address: Address;
    connection?: INibusConnection;
    drain(): Promise<number[]>;
    write(...ids: number[]): Promise<number[]>;
    read(...ids: number[]): Promise<{
        [name: string]: any;
    }>;
    upload(domain: string, offset?: number, size?: number): Promise<Buffer>;
    download(domain: string, data: Buffer, offset?: number, noTerm?: boolean): Promise<void>;
    execute(program: string, args?: Record<string, any>): Promise<NmsDatagram | NmsDatagram[] | undefined>;
    release(): number;
    getId(idOrName: string | number): number;
    getName(idOrName: string | number): string;
    getRawValue(idOrName: number | string): any;
    getError(idOrName: number | string): any;
    isDirty(idOrName: string | number): boolean;
    [mibProperty: string]: any;
    on<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
    once<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
    off<U extends keyof IDeviceEvents>(event: U, listener: IDeviceEvents[U]): this;
}
interface DevicesEvents {
    serno: (prevAddress: Address, newAddress: Address) => void;
    new: (device: IDevice) => void;
    delete: (device: IDevice) => void;
}
export declare function getMibFile(mibname: string): string;
export declare const getMibTypes: () => Config['mibTypes'];
export declare function findMibByType(type: number, version?: number): string | undefined;
export declare function getMibPrototype(mib: string): Record<string, any>;
export interface CreateDevice {
    (address: AddressParam, mib: string, owned?: INibusConnection): IDevice;
    (address: AddressParam, type: number, version?: number, owned?: INibusConnection): IDevice;
}
export declare class Devices extends TypedEmitter<DevicesEvents> {
    private deviceMap;
    get: () => IDevice[];
    findById(id: string): IDevice | undefined;
    find: (address: AddressParam) => IDevice[];
    create: CreateDevice;
    private onReleaseDevice;
}
export {};
//# sourceMappingURL=devices.d.ts.map