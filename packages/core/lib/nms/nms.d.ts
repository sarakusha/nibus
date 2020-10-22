/// <reference types="node" />
import NmsValueType from './NmsValueType';
export declare function getSizeOf(valueType?: NmsValueType, value?: unknown): number;
export declare function decodeValue(valueType: NmsValueType, buffer: Buffer, offset?: number): any;
export declare function writeValue(valueType: NmsValueType, value: unknown, buffer: Buffer, offset?: number): number;
export declare function encodeValue(valueType: NmsValueType, value: unknown): Buffer;
export declare function getNmsType(simpleType: string): number;
//# sourceMappingURL=nms.d.ts.map