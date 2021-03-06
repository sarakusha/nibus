/// <reference types="node" />
import { EventEmitter } from 'events';
import Address, { AddressParam } from '../Address';
import { INibusConnection } from '../nibus';
import NmsDatagram from '../nms/NmsDatagram';
import { Config } from '../session/common';
declare type Listener<T> = (arg: T) => void;
declare type ChangeArg = {
    id: number;
    names: string[];
};
export declare type ChangeListener = Listener<ChangeArg>;
declare type UploadStartArg = {
    domain: string;
    domainSize: number;
    offset: number;
    size: number;
};
export declare type UploadStartListener = Listener<UploadStartArg>;
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
export declare type UploadFinishListener = Listener<UploadFinishArg>;
declare type DownloadStartArg = {
    domain: string;
    domainSize: number;
    offset: number;
    size: number;
};
export declare type DownloadStartListener = Listener<DownloadStartArg>;
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
export declare type DownloadFinishListener = Listener<DownloadFinishArg>;
export declare type DeviceId = string & {
    __brand: 'DeviceId';
};
interface IDeviceEvents extends EventEmitter {
    on(event: 'connected' | 'disconnected', listener: () => void): this;
    on(event: 'changing' | 'changed', listener: ChangeListener): this;
    on(event: 'uploadStart', listener: UploadStartListener): this;
    on(event: 'uploadData', listener: UploadDataListener): this;
    on(event: 'uploadFinish', listener: UploadFinishListener): this;
    on(event: 'downloadStart', listener: DownloadStartListener): this;
    on(event: 'downloadData', listener: DownloadDataListener): this;
    on(event: 'downloadFinish', listener: DownloadFinishListener): this;
    once(event: 'connected' | 'disconnected', listener: () => void): this;
    once(event: 'changing' | 'changed', listener: ChangeListener): this;
    once(event: 'uploadStart', listener: UploadStartListener): this;
    once(event: 'uploadData', listener: UploadDataListener): this;
    once(event: 'uploadFinish', listener: UploadFinishListener): this;
    once(event: 'downloadStart', listener: DownloadStartListener): this;
    once(event: 'downloadData', listener: DownloadDataListener): this;
    once(event: 'downloadFinish', listener: DownloadFinishListener): this;
    addListener(event: 'connected' | 'disconnected', listener: () => void): this;
    addListener(event: 'changing' | 'changed', listener: ChangeListener): this;
    addListener(event: 'uploadStart', listener: UploadStartListener): this;
    addListener(event: 'uploadData', listener: UploadDataListener): this;
    addListener(event: 'uploadFinish', listener: UploadFinishListener): this;
    addListener(event: 'downloadStart', listener: DownloadStartListener): this;
    addListener(event: 'downloadData', listener: DownloadDataListener): this;
    addListener(event: 'downloadFinish', listener: DownloadFinishListener): this;
    off(event: 'connected' | 'disconnected', listener: () => void): this;
    off(event: 'changing' | 'changed', listener: ChangeListener): this;
    off(event: 'uploadStart', listener: UploadStartListener): this;
    off(event: 'uploadData', listener: UploadDataListener): this;
    off(event: 'uploadFinish', listener: UploadFinishListener): this;
    off(event: 'downloadStart', listener: DownloadStartListener): this;
    off(event: 'downloadData', listener: DownloadDataListener): this;
    off(event: 'downloadFinish', listener: DownloadFinishListener): this;
    removeListener(event: 'connected' | 'disconnected', listener: () => void): this;
    removeListener(event: 'changing' | 'changed', listener: ChangeListener): this;
    removeListener(event: 'uploadStart', listener: UploadStartListener): this;
    removeListener(event: 'uploadData', listener: UploadDataListener): this;
    removeListener(event: 'uploadFinish', listener: UploadFinishListener): this;
    removeListener(event: 'downloadStart', listener: DownloadStartListener): this;
    removeListener(event: 'downloadData', listener: DownloadDataListener): this;
    removeListener(event: 'downloadFinish', listener: DownloadFinishListener): this;
    emit(event: 'connected' | 'disconnected'): boolean;
    emit(event: 'changing' | 'changed', arg: ChangeArg): boolean;
    emit(event: 'uploadStart', arg: UploadStartArg): boolean;
    emit(event: 'uploadData', arg: UploadDataArg): boolean;
    emit(event: 'uploadFinish', arg: UploadFinishArg): boolean;
    emit(event: 'downloadStart', arg: DownloadStartArg): boolean;
    emit(event: 'downloadData', arg: DownloadDataArg): boolean;
    emit(event: 'downloadFinish', arg: DownloadFinishArg): boolean;
}
export interface IDevice extends IDeviceEvents {
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
}
export declare function getMibFile(mibname: string): string;
export declare const getMibTypes: () => Config['mibTypes'];
export declare function findMibByType(type: number, version?: number): string | undefined;
export declare interface Devices {
    on(event: 'new' | 'delete', deviceListener: (device: IDevice) => void): this;
    on(event: 'serno', listener: (prevAddress: Address, newAddress: Address) => void): this;
    once(event: 'new' | 'delete', deviceListener: (device: IDevice) => void): this;
    once(event: 'serno', listener: (prevAddress: Address, newAddress: Address) => void): this;
    addListener(event: 'new' | 'delete', deviceListener: (device: IDevice) => void): this;
    addListener(event: 'serno', listener: (prevAddress: Address, newAddress: Address) => void): this;
}
export declare function getMibPrototype(mib: string): Record<string, any>;
export interface CreateDevice {
    (address: AddressParam, mib: string): IDevice;
    (address: AddressParam, type: number, version?: number): IDevice;
}
export declare class Devices extends EventEmitter {
    get: () => IDevice[];
    find: (address: AddressParam) => IDevice[] | undefined;
    create: CreateDevice;
}
declare const devices: Devices;
export default devices;
//# sourceMappingURL=devices.d.ts.map