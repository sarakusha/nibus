import * as t from 'io-ts';
import { MibDescription } from '../MibDescription';
import { IKnownPort } from '../session/KnownPorts';
export declare const PortArgV: t.TypeC<{
    portInfo: t.IntersectionC<[t.TypeC<{
        comName: t.StringC;
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
export declare const PortsEventV: t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
export declare const EventV: t.UnionC<[t.TypeC<{
    event: t.LiteralC<string>;
    args: t.TupleC<[t.ArrayC<t.TypeC<{
        portInfo: t.IntersectionC<[t.TypeC<{
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
            comName: t.StringC;
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
}>]>;
export declare type Event = PortsEvent | PortAddedEvent | PortRemovedEvent;
declare class FromStringType<A> extends t.Type<A, string> {
    constructor(name: string, type: t.Mixed);
}
export declare class EventFromStringType extends FromStringType<Event> {
    constructor();
}
export declare const EventFromString: EventFromStringType;
export {};
//# sourceMappingURL=events.d.ts.map