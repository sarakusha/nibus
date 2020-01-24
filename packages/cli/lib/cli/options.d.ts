export interface CommonOpts {
    mac: string | undefined;
    raw: boolean;
    id: ReadonlyArray<string | number> | undefined;
    mib: string | undefined;
    compact: boolean;
    quiet: boolean;
    timeout: number;
}
export declare type MakeRequired<T, K extends keyof T> = Omit<T, K> & {
    [P in K]-?: Exclude<T[P], undefined>;
};
export declare type MacOptions = MakeRequired<CommonOpts, 'mac'>;
//# sourceMappingURL=options.d.ts.map