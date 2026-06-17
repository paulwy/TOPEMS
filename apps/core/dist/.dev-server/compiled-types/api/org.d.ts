import type { Department, Position, User, PaginatedResponse } from '@topems/shared-types';
export declare const orgApi: {
    getUsers: (params?: {
        page?: number;
        pageSize?: number;
        keyword?: string;
    }) => Promise<PaginatedResponse<User>>;
    getUser: (id: string) => Promise<User>;
    createUser: (data: Partial<User>) => Promise<User>;
    updateUser: (id: string, data: Partial<User>) => Promise<User>;
    deleteUser: (id: string) => Promise<void>;
    getDepartments: () => Promise<Department[]>;
    getDepartment: (id: string) => Promise<Department>;
    createDepartment: (data: Partial<Department>) => Promise<Department>;
    updateDepartment: (id: string, data: Partial<Department>) => Promise<Department>;
    deleteDepartment: (id: string) => Promise<void>;
    getPositions: (departmentId?: string) => Promise<Position[]>;
    createPosition: (data: Partial<Position>) => Promise<Position>;
    updatePosition: (id: string, data: Partial<Position>) => Promise<Position>;
    deletePosition: (id: string) => Promise<void>;
};
