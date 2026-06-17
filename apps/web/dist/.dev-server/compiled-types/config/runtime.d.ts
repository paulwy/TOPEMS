import type { RuntimeConfig } from "./types";
declare const config: RuntimeConfig;
export default config;
export declare function isProduction(): boolean;
export declare function isDevelopment(): boolean;
export declare function isTest(): boolean;
export declare function getMode(): string;
