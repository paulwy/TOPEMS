export type Role = "admin" | "manager" | "user" | "guest";
export declare const useRole: () => {
    roles: string[];
    currentRole: string;
    roleLevel: number;
    checkRole: (role: string) => boolean;
    checkAnyRole: (roleList: string[]) => boolean;
    isAdmin: () => boolean;
    isManager: () => boolean;
    isUser: () => boolean;
    isGuest: () => boolean;
    getRoleName: () => string;
    getRoleLevel: () => number;
};
export default useRole;
