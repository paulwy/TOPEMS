export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  managerId?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  children?: Department[];
}

export interface Position {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  level: number;
  status: 'active' | 'inactive';
}

export interface UserPosition {
  userId: string;
  positionId: string;
  isPrimary: boolean;
  startDate: string;
  endDate?: string;
}
