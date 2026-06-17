import type { Department, Position, User } from '@topems/shared-types';
interface OrgStore {
    departments: Department[];
    positions: Position[];
    users: User[];
    selectedDepartment: Department | null;
    selectedUser: User | null;
    setDepartments: (departments: Department[]) => void;
    setPositions: (positions: Position[]) => void;
    setUsers: (users: User[]) => void;
    addDepartment: (department: Department) => void;
    updateDepartment: (department: Department) => void;
    deleteDepartment: (id: string) => void;
    addUser: (user: User) => void;
    updateUser: (user: User) => void;
    deleteUser: (id: string) => void;
    setSelectedDepartment: (department: Department | null) => void;
    setSelectedUser: (user: User | null) => void;
}
export declare const useOrgStore: import("zustand").UseBoundStore<import("zustand").StoreApi<OrgStore>>;
export {};
