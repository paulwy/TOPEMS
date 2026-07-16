import type { ListQueryParams } from './common';

// ============ Hazardous Material Types ============
export interface HazardousMaterial {
  id: string;
  material_no: string;
  name: string;
  category: string;
  hazard_class: string;
  un_number: string | null;
  cas_no: string | null;
  specification: string | null;
  unit: string | null;
  description: string | null;
  hazards: string[] | null;
  storage_requirements: string | null;
  handling_requirements: string | null;
  emergency_measures: string | null;
  msds_url: string | null;
  status: 'active' | 'inactive' | 'restricted';
  created_at: string;
  updated_at: string;
}

export interface HazardousMaterialCategory {
  id: string;
  category_code: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  hazardlevel: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HazardousMaterialInventory {
  id: string;
  material_id: string;
  material_name: string;
  warehouse: string | null;
  location: string | null;
  batch_no: string | null;
  quantity: number;
  unit: string | null;
  safety_stock: number | null;
  expiry_date: string | null;
  manufacturer: string | null;
  supplier: string | null;
  status: 'normal' | 'low_stock' | 'expired' | 'overstock';
  last_updated: string | null;
  created_at: string;
  updated_at: string;
}

export interface HazardousMaterialMovement {
  id: string;
  movement_no: string;
  material_id: string;
  material_name: string;
  movement_type: 'in' | 'out' | 'transfer' | 'return' | 'scrap';
  quantity: number;
  unit: string | null;
  batch_no: string | null;
  source_location: string | null;
  target_location: string | null;
  handler: string | null;
  movement_date: string | null;
  reason: string | null;
  operator: string | null;
  approver: string | null;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface MSDS {
  id: string;
  material_id: string;
  material_name: string;
  version: string | null;
  product_name: string | null;
  manufacturer: string | null;
  emergency_phone: string | null;
  hazard_identification: string | null;
  composition_info: string | null;
  first_aid_measures: string | null;
  fire_fighting_measures: string | null;
  accidental_release_measures: string | null;
  handling_and_storage: string | null;
  exposure_controls: string | null;
  physical_chemical_properties: string | null;
  reactivity_info: string | null;
  toxicological_info: string | null;
  ecological_info: string | null;
  disposal_considerations: string | null;
  transport_info: string | null;
  regulatory_info: string | null;
  other_info: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHazardousMaterialRequest {
  name: string;
  category: string;
  hazard_class: string;
  un_number?: string | null;
  cas_no?: string | null;
  specification?: string | null;
  unit?: string | null;
  description?: string | null;
  hazards?: string[] | null;
  storage_requirements?: string | null;
  handling_requirements?: string | null;
  emergency_measures?: string | null;
  msds_url?: string | null;
  status?: 'active' | 'inactive' | 'restricted';
}

export interface UpdateHazardousMaterialRequest {
  name?: string;
  category?: string;
  hazard_class?: string;
  un_number?: string | null;
  cas_no?: string | null;
  specification?: string | null;
  unit?: string | null;
  description?: string | null;
  hazards?: string[] | null;
  storage_requirements?: string | null;
  handling_requirements?: string | null;
  emergency_measures?: string | null;
  msds_url?: string | null;
  status?: 'active' | 'inactive' | 'restricted';
}

export interface CreateHazardousMaterialCategoryRequest {
  category_code: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  hazardlevel?: string | null;
  sort_order?: number;
}

export interface UpdateHazardousMaterialCategoryRequest {
  category_code?: string;
  name?: string;
  parent_id?: string | null;
  description?: string | null;
  hazardlevel?: string | null;
  sort_order?: number;
}

export interface CreateHazardousMaterialInventoryRequest {
  material_id: string;
  warehouse?: string | null;
  location?: string | null;
  batch_no?: string | null;
  quantity: number;
  unit?: string | null;
  safety_stock?: number | null;
  expiry_date?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
}

export interface UpdateHazardousMaterialInventoryRequest {
  warehouse?: string | null;
  location?: string | null;
  quantity?: number;
  safety_stock?: number | null;
  expiry_date?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
  status?: 'normal' | 'low_stock' | 'expired' | 'overstock';
}

export interface CreateHazardousMaterialMovementRequest {
  material_id: string;
  movement_type: 'in' | 'out' | 'transfer' | 'return' | 'scrap';
  quantity: number;
  unit?: string | null;
  batch_no?: string | null;
  source_location?: string | null;
  target_location?: string | null;
  handler?: string | null;
  movement_date?: string | null;
  reason?: string | null;
  operator?: string | null;
  attachments?: string[] | null;
  status?: 'pending' | 'approved' | 'completed' | 'rejected';
}

export interface UpdateHazardousMaterialMovementRequest {
  movement_type?: 'in' | 'out' | 'transfer' | 'return' | 'scrap';
  quantity?: number;
  source_location?: string | null;
  target_location?: string | null;
  handler?: string | null;
  movement_date?: string | null;
  reason?: string | null;
  approver?: string | null;
  status?: 'pending' | 'approved' | 'completed' | 'rejected';
  attachments?: string[] | null;
}

export interface CreateMSDSRequest {
  material_id: string;
  material_name: string;
  version?: string | null;
  product_name?: string | null;
  manufacturer?: string | null;
  emergency_phone?: string | null;
  hazard_identification?: string | null;
  composition_info?: string | null;
  first_aid_measures?: string | null;
  fire_fighting_measures?: string | null;
  accidental_release_measures?: string | null;
  handling_and_storage?: string | null;
  exposure_controls?: string | null;
  physical_chemical_properties?: string | null;
  reactivity_info?: string | null;
  toxicological_info?: string | null;
  ecological_info?: string | null;
  disposal_considerations?: string | null;
  transport_info?: string | null;
  regulatory_info?: string | null;
  other_info?: string | null;
  file_url?: string | null;
}

export interface UpdateMSDSRequest {
  version?: string | null;
  product_name?: string | null;
  manufacturer?: string | null;
  emergency_phone?: string | null;
  hazard_identification?: string | null;
  composition_info?: string | null;
  first_aid_measures?: string | null;
  fire_fighting_measures?: string | null;
  accidental_release_measures?: string | null;
  handling_and_storage?: string | null;
  exposure_controls?: string | null;
  physical_chemical_properties?: string | null;
  reactivity_info?: string | null;
  toxicological_info?: string | null;
  ecological_info?: string | null;
  disposal_considerations?: string | null;
  transport_info?: string | null;
  regulatory_info?: string | null;
  other_info?: string | null;
  file_url?: string | null;
}

export interface HazardousMaterialListQueryParams extends ListQueryParams {
  category?: string;
  hazard_class?: string;
  status?: string;
}

export interface HazardousMaterialInventoryListQueryParams extends ListQueryParams {
  material_id?: string;
  warehouse?: string;
  status?: string;
}

export interface HazardousMaterialMovementListQueryParams extends ListQueryParams {
  material_id?: string;
  movement_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}
