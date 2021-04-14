import * as t from 'io-ts';
import { MibDescription } from '../MibDescription';
import { IKnownPort } from '../session/KnownPorts';
export declare const PortArgV: t.TypeC<{
    portInfo: t.IntersectionC<[t.TypeC<{
        path: t.StringC;
        productId: t.NumberC;
        vendorId: t.NumberC;
    }>, t.PartialC<{
        manufacturer: t.StringC;
        serialNumber: t.StringC;
        pnpId: t.StringC;
        locationId: t.StringC;
        deviceAddress: t.NumberC;
        device: t.StringC;
        category: t.UnionC<[t.KeyofC<{
            siolynx: null;
            minihost: null;
            fancontrol: null;
            c22: null;
            relay: null;
            ftdi: null;
            sensor: null;
        }>, t.UndefinedC]>;
    }>]>;
    description: t.Type<MibDescription, MibDescription, unknown>;
}>;
export interface PortArg extends t.TypeOf<typeof PortArgV> {
    portInfo: IKnownPort;
    description: MibDescription;
}
export declare const HostV: t.TypeC<{
    name: t.StringC;
    platform: t.StringC;
    arch: t.StringC;
    version: t.StringC;
}>;
export interface Host extends t.TypeOf<typeof HostV> {
}
export declare const PortsEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>>, t.Mixed]> | t.TupleC<[t.ArrayC<t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>>]>;
}>;
export interface PortsEvent extends t.TypeOf<typeof PortsEventV> {
}
export declare const PortAddedEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>, t.Mixed]> | t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>]>;
}>;
export interface PortAddedEvent extends t.TypeOf<typeof PortAddedEventV> {
}
export declare const PortRemovedEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>, t.Mixed]> | t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>]>;
}>;
export interface PortRemovedEvent extends t.TypeOf<typeof PortRemovedEventV> {
}
export declare const LogLevelEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.KeyofC<{
        none: null;
        hex: null;
        nibus: null;
    }>, t.Mixed]> | t.TupleC<[t.KeyofC<{
        none: null;
        hex: null;
        nibus: null;
    }>]>;
}>;
export interface LogLevelEvent extends t.TypeOf<typeof LogLevelEventV> {
}
export declare const ConfigEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.UnknownRecordC, t.Mixed]> | t.TupleC<[t.UnknownRecordC]>;
}>;
export interface ConfigEvent extends t.TypeOf<typeof ConfigEventV> {
}
export declare const HostEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.TypeC<{
        name: t.StringC;
        platform: t.StringC;
        arch: t.StringC;
        version: t.StringC;
    }>, t.Mixed]> | t.TupleC<[t.TypeC<{
        name: t.StringC;
        platform: t.StringC;
        arch: t.StringC;
        version: t.StringC;
    }>]>;
}>;
export interface HostEvent extends t.TypeOf<typeof HostEventV> {
}
export declare const LogLineEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.StringC, t.Mixed]> | t.TupleC<[t.StringC]>;
}>;
export interface LogLineEvent extends t.TypeOf<typeof LogLineEventV> {
}
export declare const PongEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.VoidC, t.Mixed]> | t.TupleC<[t.VoidC]>;
}>;
export interface PongEvent extends t.TypeOf<typeof PongEventV> {
}
export declare const RectV: t.TypeC<{
    x: t.NumberC;
    y: t.NumberC;
    width: t.NumberC;
    height: t.NumberC;
}>;
export interface Rect extends t.TypeOf<typeof RectV> {
}
export declare const DisplayV: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    bounds: t.TypeC<{
        x: t.NumberC;
        y: t.NumberC;
        width: t.NumberC;
        height: t.NumberC;
    }>;
    workArea: t.TypeC<{
        x: t.NumberC;
        y: t.NumberC;
        width: t.NumberC;
        height: t.NumberC;
    }>;
    displayFrequency: t.NumberC;
    internal: t.BooleanC;
}>, t.PartialC<{
    primary: t.BooleanC;
}>]>;
export interface Display extends t.TypeOf<typeof DisplayV> {
}
export declare const DisplaysEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        id: t.NumberC;
        bounds: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        workArea: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        displayFrequency: t.NumberC;
        internal: t.BooleanC;
    }>, t.PartialC<{
        primary: t.BooleanC;
    }>]>>, t.Mixed]> | t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        id: t.NumberC;
        bounds: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        workArea: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        displayFrequency: t.NumberC;
        internal: t.BooleanC;
    }>, t.PartialC<{
        primary: t.BooleanC;
    }>]>>]>;
}>;
export interface DisplaysEvent extends t.TypeOf<typeof DisplaysEventV> {
}
export declare const BrightnessHistoryV: t.IntersectionC<[t.TypeC<{
    timestamp: t.NumberC;
    brightness: t.NumberC;
}>, t.PartialC<{
    actual: t.NumberC;
}>]>;
export interface BrightnessHistory extends t.TypeOf<typeof BrightnessHistoryV> {
}
export declare const BrightnessHistoryEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.NumberC;
        brightness: t.NumberC;
    }>, t.PartialC<{
        actual: t.NumberC;
    }>]>>, t.Mixed]> | t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.NumberC;
        brightness: t.NumberC;
    }>, t.PartialC<{
        actual: t.NumberC;
    }>]>>]>;
}>;
export interface BrightnessHistoryEvent extends t.TypeOf<typeof BrightnessHistoryEventV> {
}
export declare const EventV: t.UnionC<[t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>>, t.Mixed]> | t.TupleC<[t.ArrayC<t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>>]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>, t.Mixed]> | t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>, t.Mixed]> | t.TupleC<[t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            path: t.StringC;
            productId: t.NumberC;
            vendorId: t.NumberC;
        }>, t.PartialC<{
            manufacturer: t.StringC;
            serialNumber: t.StringC;
            pnpId: t.StringC;
            locationId: t.StringC;
            deviceAddress: t.NumberC;
            device: t.StringC;
            category: t.UnionC<[t.KeyofC<{
                siolynx: null;
                minihost: null;
                fancontrol: null;
                c22: null;
                relay: null;
                ftdi: null;
                sensor: null;
            }>, t.UndefinedC]>;
        }>]>;
        description: t.Type<MibDescription, MibDescription, unknown>;
    }>]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.KeyofC<{
        none: null;
        hex: null;
        nibus: null;
    }>, t.Mixed]> | t.TupleC<[t.KeyofC<{
        none: null;
        hex: null;
        nibus: null;
    }>]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.UnknownRecordC, t.Mixed]> | t.TupleC<[t.UnknownRecordC]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.TypeC<{
        name: t.StringC;
        platform: t.StringC;
        arch: t.StringC;
        version: t.StringC;
    }>, t.Mixed]> | t.TupleC<[t.TypeC<{
        name: t.StringC;
        platform: t.StringC;
        arch: t.StringC;
        version: t.StringC;
    }>]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.StringC, t.Mixed]> | t.TupleC<[t.StringC]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.VoidC, t.Mixed]> | t.TupleC<[t.VoidC]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        id: t.NumberC;
        bounds: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        workArea: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        displayFrequency: t.NumberC;
        internal: t.BooleanC;
    }>, t.PartialC<{
        primary: t.BooleanC;
    }>]>>, t.Mixed]> | t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        id: t.NumberC;
        bounds: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        workArea: t.TypeC<{
            x: t.NumberC;
            y: t.NumberC;
            width: t.NumberC;
            height: t.NumberC;
        }>;
        displayFrequency: t.NumberC;
        internal: t.BooleanC;
    }>, t.PartialC<{
        primary: t.BooleanC;
    }>]>>]>;
}>, t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.NumberC;
        brightness: t.NumberC;
    }>, t.PartialC<{
        actual: t.NumberC;
    }>]>>, t.Mixed]> | t.TupleC<[t.ArrayC<t.IntersectionC<[t.TypeC<{
        timestamp: t.NumberC;
        brightness: t.NumberC;
    }>, t.PartialC<{
        actual: t.NumberC;
    }>]>>]>;
}>]>;
export declare type Event = PortsEvent | PortAddedEvent | PortRemovedEvent | LogLevelEvent | ConfigEvent | HostEvent | LogLineEvent | PongEvent | DisplaysEvent | BrightnessHistoryEvent;
declare class FromStringType<A> extends t.Type<A, string> {
    constructor(name: string, type: t.Mixed);
}
export declare class EventFromStringType extends FromStringType<Event> {
    constructor();
}
export declare const EventFromString: EventFromStringType;
export {};
//# sourceMappingURL=events.d.ts.map