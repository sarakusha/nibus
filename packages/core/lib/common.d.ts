/// <reference types="node" />
import * as t from 'io-ts';
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
declare type Arrayable = any[] | Buffer | string;
export declare function chunkArray<T extends Arrayable>(array: T, len: number): T[];
export declare function printBuffer(buffer: Buffer): string;
declare type FilterFlags<Base, Condition> = {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
};
declare type ExcludeFlags<Base, Condition> = {
    [Key in keyof Base]: Base[Key] extends Condition ? never : Key;
};
declare type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
declare type ExcludeNames<Base, Condition> = ExcludeFlags<Base, Condition>[keyof Base];
export declare type SubType<Base, Condition> = Pick<Base, AllowedNames<Base, Condition>>;
export declare type ReplaceType<Base, Condition, Type> = Pick<Base, ExcludeNames<Base, Condition>> & Record<AllowedNames<Base, Condition>, Type>;
export declare const replaceBuffers: <T extends object>(obj: T) => ReplaceType<T, Buffer, string>;
export declare function promiseArray<T, R>(array: ReadonlyArray<T>, action: (item: T, index: number, arr: ReadonlyArray<T>) => Promise<R | R[]>): Promise<R[]>;
export declare const MSG_DELIMITER = "\n";
export {};
//# sourceMappingURL=common.d.ts.map