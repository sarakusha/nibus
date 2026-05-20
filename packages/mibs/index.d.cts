import * as t from "io-ts";

//#region index.d.ts
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
type IMibProperty = t.TypeOf<typeof MibPropertyV>;
declare const MibDeviceTypeV: t.TypeC<{
  annotation: t.StringC;
  appinfo: t.IntersectionC<[t.TypeC<{
    mib_version: t.StringC;
  }>, t.PartialC<{
    device_type: t.StringC;
    loader_type: t.StringC;
    firmware: t.StringC;
    min_version: t.StringC;
    disable_batch_reading: t.StringC;
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
type IMibDeviceType = t.TypeOf<typeof MibDeviceTypeV>;
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
type IMibType = t.TypeOf<typeof MibTypeV>;
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
declare const MibDeviceV: t.IntersectionC<[t.TypeC<{
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
      disable_batch_reading: t.StringC;
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
type MibSubroutines = t.TypeOf<typeof MibSubroutineV>;
type IMibDevice = t.TypeOf<typeof MibDeviceV>;
declare const getMibNames: () => string[];
declare const getMib: (name: string) => IMibDevice | undefined;
//#endregion
export { IMibDevice, IMibDeviceType, IMibProperty, IMibType, MibDeviceV, MibSubroutines, getMib, getMibNames };