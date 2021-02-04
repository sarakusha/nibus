/// <reference types="node" />
import * as t from 'io-ts';
export declare const PATH = "/tmp/nibus.service.sock";
export declare const LogLevelV: t.KeyofC<{
    none: null;
    hex: null;
    nibus: null;
}>;
export declare const ConfigV: t.PartialC<{
    logLevel: t.KeyofC<{
        none: null;
        hex: null;
        nibus: null;
    }>;
    omit: t.UnionC<[t.ArrayC<t.StringC>, t.NullC]>;
    pick: t.UnionC<[t.ArrayC<t.StringC>, t.NullC]>;
    mibs: t.ArrayC<t.StringC>;
    mibTypes: t.RecordC<t.StringC, t.ArrayC<t.IntersectionC<[t.TypeC<{
        mib: t.StringC;
    }>, t.PartialC<{
        minVersion: t.NumberC;
    }>]>>>;
}>;
export declare type Config = t.TypeOf<typeof ConfigV>;
export declare type Fields = string[] | undefined;
export declare type LogLevel = t.TypeOf<typeof LogLevelV>;
export declare type ObjectType = Record<string, unknown>;
export declare type ProtoType = ObjectType;
export declare const noop: () => void;
export interface Datagram {
    raw: Buffer;
    toJSON(): unknown;
    toString(): string;
}
export declare const delay: (ms: number) => Promise<void>;
export declare const replaceBuffers: (obj: any) => any;
export declare function promiseArray<T, R>(array: ReadonlyArray<T>, action: (item: T, index: number, arr: ReadonlyArray<T>) => Promise<R | R[]>): Promise<R[]>;
//# sourceMappingURL=common.d.ts.map