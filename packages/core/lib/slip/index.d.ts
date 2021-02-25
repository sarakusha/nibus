/// <reference types="node" />
import { Datagram } from '../common';
export declare const enum BootloaderFunction {
    ECHO = 0,
    VERSION = 1,
    READ = 4,
    EXECUTE = 5,
    WRITE = 19
}
export declare const FLASH_SIZE: number;
export declare const CHUNK_SIZE = 228;
export declare const END = 192;
declare type EncodedChunk = [data: ReadonlyArray<number>, end: number];
export declare type LikeArray = Buffer | Uint8Array | ReadonlyArray<number>;
export declare const encode: (data: LikeArray, offset?: number, maxSize?: number) => EncodedChunk;
declare type SlipResponse = {
    fn: BootloaderFunction;
    errorCode?: number;
    arg?: number[];
};
export declare const trySlipDecode: (data: LikeArray) => SlipResponse | undefined;
export declare const uint32ToBytes: (value: number) => number[];
declare type ChunkInfo = [chunk: Buffer, offset: number];
export declare function slipChunks(fn: BootloaderFunction, data?: LikeArray): Generator<ChunkInfo, void, boolean | undefined>;
export declare class SlipDatagram implements Datagram {
    readonly raw: Buffer;
    readonly fn?: BootloaderFunction;
    readonly errorCode?: number;
    readonly arg?: number[];
    constructor(raw: Buffer, resp?: SlipResponse);
    toJSON(): Partial<SlipResponse>;
    toString(): string;
}
export {};
//# sourceMappingURL=index.d.ts.map