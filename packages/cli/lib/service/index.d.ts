import { SerialTee, Server } from '../ipc';
export declare class NibusService {
    readonly port: number;
    readonly server: Server;
    private isStarted;
    private ad?;
    constructor();
    get path(): string;
    updateLogger(connection?: SerialTee): void;
    start(): Promise<void>;
    stop(): void;
    reload(): void;
    private logLevelHandler;
    private connectionHandler;
    private addHandler;
    private removeHandler;
}
declare const service: NibusService;
export { detectionPath } from './detector';
export default service;
//# sourceMappingURL=index.d.ts.map