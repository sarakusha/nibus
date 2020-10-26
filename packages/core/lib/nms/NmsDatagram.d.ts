/// <reference types="node" />
import NibusDatagram, { INibusCommon, INibusDatagramJSON, Protocol } from '../nibus/NibusDatagram';
import NmsServiceType from './NmsServiceType';
export interface INmsOptions extends INibusCommon {
    id: number;
    service: NmsServiceType;
    nms?: Buffer;
    isResponse?: boolean;
    notReply?: boolean;
    status?: number;
    timeout?: number;
}
export interface INmsDatagramJSON extends INibusDatagramJSON {
    protocol: string;
    data?: never;
    id: number;
    service: string;
    nms?: Buffer;
    isResponse?: boolean;
    notReply?: boolean;
    value?: string;
    valueType?: string;
    status?: number;
}
export default class NmsDatagram extends NibusDatagram implements INmsOptions {
    static isNmsFrame(frame: Buffer): boolean;
    readonly protocol: Protocol.NMS;
    readonly isResponse: boolean;
    readonly notReply: boolean;
    readonly service: NmsServiceType;
    readonly id: number;
    readonly nms: Buffer;
    readonly timeout?: number;
    constructor(frameOrOptions: Buffer | INmsOptions);
    get valueType(): number | undefined;
    get status(): number | undefined;
    get value(): any;
    isResponseFor(req: NmsDatagram): boolean;
    toJSON(): INmsDatagramJSON;
}
//# sourceMappingURL=NmsDatagram.d.ts.map