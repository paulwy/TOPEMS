export interface DictType {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface DictData {
  id: string;
  typeId: string;
  label: string;
  value: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}
