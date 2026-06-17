export declare const setStorage: <T>(key: string, value: T) => void;
export declare const getStorage: <T>(key: string, defaultValue?: T) => T | undefined;
export declare const removeStorage: (key: string) => void;
export declare const clearStorage: () => void;
export declare const setSessionStorage: <T>(key: string, value: T) => void;
export declare const getSessionStorage: <T>(key: string, defaultValue?: T) => T | undefined;
export declare const removeSessionStorage: (key: string) => void;
