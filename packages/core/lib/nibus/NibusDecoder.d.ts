/// <reference types="node" />
import { Transform, TransformCallback, TransformOptions } from 'stream';
export default class NibusDecoder extends Transform {
    private buf;
    private slipMode;
    constructor(options?: TransformOptions);
    setSlipMode(value: boolean): void;
    _transform(chunk: any, encoding: string, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
    private analyze;
}
//# sourceMappingURL=NibusDecoder.d.ts.map