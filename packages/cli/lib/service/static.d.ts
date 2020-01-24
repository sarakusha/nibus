declare const _default: {
    mibCategories: {
        siolynx: {
            mib: string;
            link: boolean;
            find: string;
        };
        minihost: {
            type: number;
            find: string;
        };
        fancontrol: {
            mib: string;
            find: string;
            link: boolean;
        };
        c22: {
            link: boolean;
            find: string;
            win32: {
                parity: string;
            };
        };
        sensor: {
            mib: string;
            find: string;
            disableBatchReading: boolean;
        };
        ftdi: {
            select: string[];
        };
    };
    knownDevices: ({
        vid: string;
        pid: string;
        category: string;
        device?: undefined;
        manufacturer?: undefined;
        serialNumber?: undefined;
    } | {
        device: string;
        vid: string;
        pid: string;
        category: string;
        manufacturer?: undefined;
        serialNumber?: undefined;
    } | {
        device: string;
        vid: string;
        pid: string;
        manufacturer: string;
        category: string;
        serialNumber?: undefined;
    } | {
        device: string;
        vid: number;
        pid: number;
        serialNumber: string;
        category: string;
        manufacturer?: undefined;
    })[];
};
export default _default;
//# sourceMappingURL=static.d.ts.map