export declare const isValidEmail: (email: string) => boolean;
export declare const isValidPhone: (phone: string) => boolean;
export declare const isValidUrl: (url: string) => boolean;
export declare const isValidUUID: (uuid: string) => boolean;
export declare const isValidDate: (dateStr: string) => boolean;
export declare const isEmpty: (value: any) => boolean;
export declare const validatePassword: (password: string) => {
    isValid: boolean;
    errors: string[];
};
