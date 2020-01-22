/// <reference types="node" />
export declare const MAC_LENGTH = 6;
export declare enum AddressType {
    broadcast = "broadcast",
    empty = "empty",
    mac = 0,
    net = 1,
    group = 2
}
export declare type AddressParam = string | Buffer | number[] | Uint8Array | Address;
export default class Address {
    static readonly empty: Address;
    static broadcast: Address;
    private static autocount;
    readonly type: AddressType;
    readonly domain?: number;
    readonly group?: number;
    readonly subnet?: number;
    readonly device?: number;
    readonly mac?: Buffer;
    readonly raw: Buffer;
    constructor(address?: AddressParam);
    get isEmpty(): boolean;
    get isBroadcast(): boolean;
    get rawType(): 0 | 1 | 2;
    static toAddress(address?: AddressParam | null): Address | null | undefined;
    static read(type: AddressType, buffer: Buffer, offset?: number): Address;
    toString(): string;
    equals(other?: AddressParam | null): boolean;
}
//# sourceMappingURL=Address.d.ts.map