/// <reference types="node" />
import Address, { AddressParam } from '../Address';
export interface INibusCommon {
    destination: AddressParam;
    priority?: number;
    source?: AddressParam;
}
export declare enum Protocol {
    NMS = 1,
    SARP = 2
}
export interface INibusOptions extends INibusCommon {
    protocol: Protocol;
    data: Buffer;
}
export interface INibusDatagramJSON {
    priority: number;
    protocol: string;
    destination: string;
    source: string;
    timeStamp: string;
    data?: Buffer;
}
export default class NibusDatagram implements INibusOptions {
    static defaultSource: AddressParam;
    readonly priority: number;
    readonly protocol: Protocol;
    readonly destination: Address;
    readonly source: Address;
    readonly data: Buffer;
    readonly raw: Buffer;
    constructor(frameOrOptions: Buffer | INibusOptions);
    toJSON(): INibusDatagramJSON;
    toString(opts?: {
        pick?: string[];
        omit?: string[];
    }): string;
}
//# sourceMappingURL=NibusDatagram.d.ts.map