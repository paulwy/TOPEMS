export interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    group: (label: string) => void;
    groupEnd: () => void;
}
declare const createLogger: (namespace: string) => Logger;
export default createLogger;
export declare const globalLogger: Logger;
