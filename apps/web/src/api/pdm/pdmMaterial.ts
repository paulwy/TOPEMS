export interface Material {
  id: string;
  tenant_id: string;
  material_no: string;
  name: string;
  spec?: string;
  unit?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialRequest {
  material_no: string;
  name: string;
  spec?: string;
  unit?: string;
  status?: string;
}

export interface UpdateMaterialRequest {
  material_no?: string;
  name?: string;
  spec?: string;
  unit?: string;
  status?: string;
}

/** V259 TypeMap: 导出供 config.ts ListPageProps<MaterialQuery> 使用 */
export interface MaterialQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}
