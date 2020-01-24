import * as t from 'io-ts';
export declare const FindKindV: t.KeyofC<{
    sarp: null;
    version: null;
}>;
export declare type FindKind = t.TypeOf<typeof FindKindV>;
export declare const NibusBaudRateV: t.UnionC<[t.LiteralC<115200>, t.LiteralC<57600>, t.LiteralC<28800>]>;
export declare const NibusParityV: t.KeyofC<{
    none: null;
    even: null;
    mark: null;
}>;
export declare type NibusBaudRate = t.TypeOf<typeof NibusBaudRateV>;
export declare type NibusParity = t.TypeOf<typeof NibusParityV>;
export declare const MibDescriptionV: t.Type<MibDescription>;
export interface MibDescription {
    type?: number;
    mib?: string;
    link?: boolean;
    baudRate?: NibusBaudRate;
    parity?: NibusParity;
    category?: string;
    find?: FindKind;
    disableBatchReading?: boolean;
    select?: MibDescription[];
    win32?: MibDescription;
}
//# sourceMappingURL=MibDescription.d.ts.map