import { SerialTee } from '../ipc';
export declare class NibusService {
    private readonly server;
    private isStarted;
    private connections;
    constructor();
    get path(): string;
    updateLogger(connection?: SerialTee): void;
    start(): Promise<void>;
    stop(): void;
    private logLevelHandler;
    private connectionHandler;
    private addHandler;
    private removeHandler;
    reload(): void;
}
declare const service: NibusService;
export { detectionPath } from './detector';
export default service;
//# sourceMappingURL=index.d.ts.map