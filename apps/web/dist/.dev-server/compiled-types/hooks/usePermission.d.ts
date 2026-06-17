export declare const usePermission: () => {
    permissions: string[];
    isSuperuser: boolean;
    checkPermission: (permission: string) => boolean;
    checkAnyPermission: (permissionList: string[]) => boolean;
    checkAllPermissions: (permissionList: string[]) => boolean;
    getModulePermissions: (module: string) => {
        read: boolean;
        write: boolean;
        delete: boolean;
        admin: boolean;
    };
    canAccessModule: (module: string) => boolean;
    canWriteModule: (module: string) => boolean;
    canDeleteModule: (module: string) => boolean;
    canAdminModule: (module: string) => boolean;
};
export default usePermission;
