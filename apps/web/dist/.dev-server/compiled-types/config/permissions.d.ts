export declare const PERMISSIONS: {
    RS: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    LIMS: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    QMS: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    EHS: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    SRM: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    PDM: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    MES: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    SCM: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    WMS: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    WORKFLOW: {
        READ: string;
        WRITE: string;
        APPROVE: string;
        REJECT: string;
        ADMIN: string;
    };
    DOC: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    AI: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    HRM: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    USER: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    ROLE: {
        READ: string;
        WRITE: string;
        DELETE: string;
        ADMIN: string;
    };
    SYSTEM: {
        READ: string;
        WRITE: string;
        ADMIN: string;
    };
};
export declare const ROLES: {
    ADMIN: {
        ID: string;
        NAME: string;
        DESCRIPTION: string;
    };
    MANAGER: {
        ID: string;
        NAME: string;
        DESCRIPTION: string;
    };
    USER: {
        ID: string;
        NAME: string;
        DESCRIPTION: string;
    };
    GUEST: {
        ID: string;
        NAME: string;
        DESCRIPTION: string;
    };
};
export declare const MODULES: {
    RS: string;
    LIMS: string;
    QMS: string;
    EHS: string;
    SRM: string;
    PDM: string;
    MES: string;
    SCM: string;
    WMS: string;
    WORKFLOW: string;
    DOC: string;
    AI: string;
    HRM: string;
};
export declare const MODULE_PERMISSIONS: {
    [MODULES.RS]: string[];
    [MODULES.LIMS]: string[];
    [MODULES.QMS]: string[];
    [MODULES.EHS]: string[];
    [MODULES.SRM]: string[];
    [MODULES.PDM]: string[];
    [MODULES.MES]: string[];
    [MODULES.SCM]: string[];
    [MODULES.WMS]: string[];
    [MODULES.WORKFLOW]: string[];
    [MODULES.DOC]: string[];
    [MODULES.AI]: string[];
    [MODULES.HRM]: string[];
};
export declare const getModulePermissions: (module: string) => string[];
export declare const getModuleActions: (module: string) => {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canAdmin: boolean;
};
export default PERMISSIONS;
