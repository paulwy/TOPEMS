export declare const usePermissionCheck: () => {
    hasPermission: (permission: string) => boolean;
    checkPermissionFromServer: (permission: string) => Promise<boolean | undefined>;
    checkPermissionsBatch: (permissions: string[]) => Promise<{
        allowed: boolean;
        results: Record<string, boolean>;
    }>;
    logAccess: (action: string, resource: string, success: boolean, errorMessage?: string) => Promise<void>;
};
export default usePermissionCheck;
