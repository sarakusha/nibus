import * as t from 'io-ts';
export declare const ClientMessagesV: t.KeyofC<{
    setLogLevel: null;
    reloadDevices: null;
    config: null;
    ping: null;
    getBrightnessHistory: null;
}>;
export declare type ClientMessages = t.TypeOf<typeof ClientMessagesV>;
export declare const SetLogLevelArgsV: t.TupleC<[t.LiteralC<"setLogLevel">, t.KeyofC<{
    none: null;
    hex: null;
    nibus: null;
}>]>;
export interface SetLogLevelArgs extends t.TypeOf<typeof SetLogLevelArgsV> {
}
export declare const ReloadDevicesArgsV: t.TupleC<[t.LiteralC<"reloadDevices">]>;
export interface ReloadDevicesArgs extends t.TypeOf<typeof ReloadDevicesArgsV> {
}
export declare const ConfigArgsV: t.TupleC<[t.LiteralC<"config">, t.UnknownRecordC]>;
export interface ConfigArgs extends t.TypeOf<typeof ConfigArgsV> {
}
export declare const PingArgsV: t.TupleC<[t.LiteralC<"ping">]>;
export interface PingArgs extends t.TypeOf<typeof PingArgsV> {
}
export declare const GetBrightnessHistoryV: t.TupleC<[t.LiteralC<"getBrightnessHistory">, t.NumberC]>;
export interface GetBrightnessHistory extends t.TypeOf<typeof GetBrightnessHistoryV> {
}
export declare const ClientEventsArgsV: t.UnionC<[t.TupleC<[t.LiteralC<"setLogLevel">, t.KeyofC<{
    none: null;
    hex: null;
    nibus: null;
}>]>, t.TupleC<[t.LiteralC<"reloadDevices">]>, t.TupleC<[t.LiteralC<"config">, t.UnknownRecordC]>, t.TupleC<[t.LiteralC<"ping">]>, t.TupleC<[t.LiteralC<"getBrightnessHistory">, t.NumberC]>]>;
export declare type ClientEventsArgs = SetLogLevelArgs | ReloadDevicesArgs | ConfigArgs | PingArgs | GetBrightnessHistory;
//# sourceMappingURL=clientEvents.d.ts.map