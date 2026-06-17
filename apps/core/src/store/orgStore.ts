import { create } from 'zustand';
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

export const useOrgStore = create<OrgStore>((set) => ({
  departments: [],
  positions: [],
  users: [],
  selectedDepartment: null,
  selectedUser: null,
  setDepartments: (departments) => set({ departments }),
  setPositions: (positions) => set({ positions }),
  setUsers: (users) => set({ users }),
  addDepartment: (department) => set((prev) => ({
    departments: [...prev.departments, department],
  })),
  updateDepartment: (department) => set((prev) => ({
    departments: prev.departments.map((d) =>
      d.id === department.id ? department : d
    ),
  })),
  deleteDepartment: (id) => set((prev) => ({
    departments: prev.departments.filter((d) => d.id !== id),
  })),
  addUser: (user) => set((prev) => ({ users: [...prev.users, user] })),
  updateUser: (user) => set((prev) => ({
    users: prev.users.map((u) => (u.id === user.id ? user : u)),
  })),
  deleteUser: (id) => set((prev) => ({
    users: prev.users.filter((u) => u.id !== id),
  })),
  setSelectedDepartment: (department) => set({ selectedDepartment: department }),
  setSelectedUser: (user) => set({ selectedUser: user }),
}));
