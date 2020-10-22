import * as t from 'io-ts';
export declare function validJsName(name: string): string;
export declare const withValue: (value: unknown, writable?: boolean, configurable?: boolean) => PropertyDescriptor;
export declare const toInt: (value?: string | boolean | number) => number;
declare type ResultType = string | number | boolean | undefined;
declare type PresentType = string | number | boolean | undefined;
export interface IConverter {
    from: (value: PresentType) => ResultType;
    to: (value: ResultType) => PresentType;
}
export declare function unitConverter(unit: string): IConverter;
export declare function precisionConverter(precision: string): IConverter;
declare const MibPropertyV: t.TypeC<{
    type: t.StringC;
    annotation: t.StringC;
    appinfo: t.IntersectionC<[t.TypeC<{
        nms_id: t.UnionC<[t.StringC, t.BrandC<t.NumberC, t.IntBrand>]>;
        access: t.StringC;
    }>, t.PartialC<{
        category: t.StringC;
        rank: t.StringC;
        zero: t.StringC;
        units: t.StringC;
        precision: t.StringC;
        representation: t.StringC;
        get: t.StringC;
        set: t.StringC;
    }>]>;
}>;
export interface IMibProperty extends t.TypeOf<typeof MibPropertyV> {
}
declare const MibDeviceTypeV: t.TypeC<{
    annotation: t.StringC;
    appinfo: t.IntersectionC<[t.TypeC<{
        mib_version: t.StringC;
    }>, t.PartialC<{
        device_type: t.StringC;
        loader_type: t.StringC;
        firmware: t.StringC;
        min_version: t.StringC;
    }>]>;
    properties: t.RecordC<t.StringC, t.TypeC<{
        type: t.StringC;
        annotation: t.StringC;
        appinfo: t.IntersectionC<[t.TypeC<{
            nms_id: t.UnionC<[t.StringC, t.BrandC<t.NumberC, t.IntBrand>]>;
            access: t.StringC;
        }>, t.PartialC<{
            category: t.StringC;
            rank: t.StringC;
            zero: t.StringC;
            units: t.StringC;
            precision: t.StringC;
            representation: t.StringC;
            get: t.StringC;
            set: t.StringC;
        }>]>;
    }>>;
}>;
export interface IMibDeviceType extends t.TypeOf<typeof MibDeviceTypeV> {
}
declare const MibTypeV: t.IntersectionC<[t.TypeC<{
    base: t.StringC;
}>, t.PartialC<{
    appinfo: t.PartialC<{
        zero: t.StringC;
        units: t.StringC;
        precision: t.StringC;
        representation: t.StringC;
        get: t.StringC;
        set: t.StringC;
    }>;
    minInclusive: t.StringC;
    maxInclusive: t.StringC;
    enumeration: t.RecordC<t.StringC, t.TypeC<{
        annotation: t.StringC;
    }>>;
}>]>;
export interface IMibType extends t.TypeOf<typeof MibTypeV> {
}
declare const MibSubroutineV: t.IntersectionC<[t.TypeC<{
    annotation: t.StringC;
    appinfo: t.IntersectionC<[t.TypeC<{
        nms_id: t.UnionC<[t.StringC, t.BrandC<t.NumberC, t.IntBrand>]>;
    }>, t.PartialC<{
        response: t.StringC;
    }>]>;
}>, t.PartialC<{
    properties: t.RecordC<t.StringC, t.TypeC<{
        type: t.StringC;
        annotation: t.StringC;
    }>>;
}>]>;
export declare const MibDeviceV: t.IntersectionC<[t.TypeC<{
    device: t.StringC;
    types: t.RecordC<t.StringC, t.UnionC<[t.TypeC<{
        annotation: t.StringC;
        appinfo: t.IntersectionC<[t.TypeC<{
            mib_version: t.StringC;
        }>, t.PartialC<{
            device_type: t.StringC;
            loader_type: t.StringC;
            firmware: t.StringC;
            min_version: t.StringC;
        }>]>;
        properties: t.RecordC<t.StringC, t.TypeC<{
            type: t.StringC;
            annotation: t.StringC;
            appinfo: t.IntersectionC<[t.TypeC<{
                nms_id: t.UnionC<[t.StringC, t.BrandC<t.NumberC, t.IntBrand>]>;
                access: t.StringC;
            }>, t.PartialC<{
                category: t.StringC;
                rank: t.StringC;
                zero: t.StringC;
                units: t.StringC;
                precision: t.StringC;
                representation: t.StringC;
                get: t.StringC;
                set: t.StringC;
            }>]>;
        }>>;
    }>, t.IntersectionC<[t.TypeC<{
        base: t.StringC;
    }>, t.PartialC<{
        appinfo: t.PartialC<{
            zero: t.StringC;
            units: t.StringC;
            precision: t.StringC;
            representation: t.StringC;
            get: t.StringC;
            set: t.StringC;
        }>;
        minInclusive: t.StringC;
        maxInclusive: t.StringC;
        enumeration: t.RecordC<t.StringC, t.TypeC<{
            annotation: t.StringC;
        }>>;
    }>]>, t.TypeC<{
        annotation: t.StringC;
        properties: t.TypeC<{
            id: t.TypeC<{
                type: t.LiteralC<"xs:unsignedShort">;
                annotation: t.StringC;
            }>;
        }>;
    }>]>>;
}>, t.PartialC<{
    subroutines: t.RecordC<t.StringC, t.IntersectionC<[t.TypeC<{
        annotation: t.StringC;
        appinfo: t.IntersectionC<[t.TypeC<{
            nms_id: t.UnionC<[t.StringC, t.BrandC<t.NumberC, t.IntBrand>]>;
        }>, t.PartialC<{
            response: t.StringC;
        }>]>;
    }>, t.PartialC<{
        properties: t.RecordC<t.StringC, t.TypeC<{
            type: t.StringC;
            annotation: t.StringC;
        }>>;
    }>]>>;
}>]>;
export interface MibSubroutines extends t.TypeOf<typeof MibSubroutineV> {
}
export interface IMibDevice extends t.TypeOf<typeof MibDeviceV> {
}
export declare function enumerationConverter(enumerationValues: IMibType['enumeration']): IConverter;
export declare const booleanConverter: IConverter;
export declare const percentConverter: IConverter;
export declare function representationConverter(format: string, size: number): IConverter;
export declare function packed8floatConverter(subtype: IMibType): IConverter;
export declare const fixedPointNumber4Converter: IConverter;
export declare const versionTypeConverter: IConverter;
export declare function getIntSize(type: string): number;
export declare function minInclusiveConverter(min: number): IConverter;
export declare function maxInclusiveConverter(max: number): IConverter;
export declare const evalConverter: (get: string, set: string) => IConverter;
export declare const convertTo: (converters: IConverter[]) => (value: ResultType) => ResultType;
export declare const convertFrom: (converters: IConverter[]) => (value: PresentType) => PresentType;
export {};
//# sourceMappingURL=mib.d.ts.map