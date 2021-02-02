/// <reference types="node" />
import { MibDescription, Category, HexOrNumber, IKnownPort } from '@nibus/core';
export declare const detectionPath: string;
interface DetectorEvents {
    add: (port: IKnownPort) => void;
    remove: (port: IKnownPort) => void;
    plug: (port: IKnownPort) => void;
    unplug: (port: IKnownPort) => void;
}
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
    on<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
    once<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
    off<U extends keyof DetectorEvents>(event: U, listener: DetectorEvents[U]): this;
    emit<U extends keyof DetectorEvents>(event: U, ...args: Parameters<DetectorEvents[U]>): boolean;
}
declare const detector: IDetector;
export default detector;
//# sourceMappingURL=detector.d.ts.map