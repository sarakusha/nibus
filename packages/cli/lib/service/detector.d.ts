/// <reference types="node" />
import { MibDescription, Category, HexOrNumber, IKnownPort } from '@nibus/core';
export declare const detectionPath: string;
interface IDetectorItem {
    device: string;
    vid: HexOrNumber;
    pid: HexOrNumber;
    manufacturer?: string;
    serialNumber?: string;
    category: Category;
}
interface IDetection {
    mibCategories: {
        [category: string]: MibDescription;
    };
    knownDevices: IDetectorItem[];
}
interface IDetector extends NodeJS.EventEmitter {
    start: () => void;
    stop: () => void;
    restart: () => void;
    getPorts: () => Promise<IKnownPort[]>;
    getDetection: () => IDetection | undefined;
    reload: () => void;
}
declare const detector: IDetector;
export default detector;
//# sourceMappingURL=detector.d.ts.map