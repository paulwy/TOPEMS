/**
 * 供应商（Supplier）统一标准类型
 *
 * 跨服务共享的供应商主数据标准定义，用于消除 SRM / SCM / ERP / Mobile /
 * unified-core 五套前端类型之间的字段命名分歧。
 *
 * ## 设计原则
 *
 * - 字段并集：收录所有服务出现过的业务字段，可选字段统一用可选属性
 * - 命名标准：采用多数服务已使用的字段名作为标准
 * - 不破坏现有契约：finance.ts 的 Supplier（财务特化，含 finance_info）
 *   保留不动；本模块定义通用的业务主数据视角 SupplierCore
 * - 渐进迁移：各服务可逐步将 API 响应映射为本类型
 *
 * ## 字段命名映射（业务字段 -> 标准字段）
 *
 * | 语义     | SRM            | SCM           | ERP            | Mobile   | 本标准           |
 * |---------|----------------|---------------|----------------|----------|-----------------|
 * | 编号     | supplier_no    | (无)          | supplier_code  | code     | code            |
 * | 联系人   | contact_person | contact_name  | contact_person | contact_person | contact_person |
 * | 电话     | phone          | contact_phone | contact_phone  | phone    | contact_phone   |
 * | 税号     | tax_id         | tax_number    | tax_number     | (无)     | tax_number      |
 * | 信用评级 | credit_rating  | (无)          | credit_rating  | rating(number) | credit_rating |
 *
 * 注：legal_name（法人名称，SRM）与 short_name（简称，SCM/ERP）语义不同，均保留。
 */

// ==================== 枚举类型 ====================

/**
 * 供应商状态（标准枚举）
 *
 * 覆盖各服务出现的全部状态值。序列化为 snake_case 字符串以兼容
 * 现有前端 status: string 契约。
 */
export type SupplierStatus = 'active' | 'inactive' | 'pending' | 'blacklisted';

export const SupplierStatus = {
  /** 活跃（SRM/SCM/ERP/unified-core 通用） */
  Active: 'active' as const,
  /** 未激活 / 停用（SCM/ERP） */
  Inactive: 'inactive' as const,
  /** 待审核（SRM/SCM 准入流程） */
  Pending: 'pending' as const,
  /** 黑名单（SRM 风险管理） */
  Blacklisted: 'blacklisted' as const,
} as const;

/**
 * 从字符串解析 SupplierStatus，兼容各服务历史用词
 *（如 "disabled" -> "inactive"、"blocked" -> "blacklisted"）。
 */
export function parseSupplierStatus(s: string): SupplierStatus {
  const lower = s.toLowerCase();
  if (lower === 'active') return SupplierStatus.Active;
  if (lower === 'inactive' || lower === 'disabled') return SupplierStatus.Inactive;
  if (lower === 'pending' || lower === 'draft') return SupplierStatus.Pending;
  if (lower === 'blacklisted' || lower === 'blocked') return SupplierStatus.Blacklisted;
  return SupplierStatus.Active;
}

/**
 * 供应商分类（标准枚举）
 *
 * 统一 SRM 的 category（raw_material/service）与 ERP 的 supplier_type
 *（manufacturer/trader）为同一维度。
 */
export type SupplierCategory =
  | 'raw_material'
  | 'manufacturer'
  | 'trader'
  | 'service'
  | 'logistics'
  | 'other';

export const SupplierCategory = {
  RawMaterial: 'raw_material' as const,
  Manufacturer: 'manufacturer' as const,
  Trader: 'trader' as const,
  Service: 'service' as const,
  Logistics: 'logistics' as const,
  Other: 'other' as const,
} as const;

/** 从字符串解析 SupplierCategory，兼容 SRM/ERP 历史用词。 */
export function parseSupplierCategory(s: string): SupplierCategory {
  const lower = s.toLowerCase();
  if (lower === 'raw_material' || lower === 'raw') return SupplierCategory.RawMaterial;
  if (lower === 'manufacturer' || lower === 'producer') return SupplierCategory.Manufacturer;
  if (lower === 'trader' || lower === 'distributor') return SupplierCategory.Trader;
  if (lower === 'service') return SupplierCategory.Service;
  if (lower === 'logistics') return SupplierCategory.Logistics;
  return SupplierCategory.Other;
}

/** 风险等级（SRM 独有，标准化保留） */
export type SupplierRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const SupplierRiskLevel = {
  Low: 'low' as const,
  Medium: 'medium' as const,
  High: 'high' as const,
  Critical: 'critical' as const,
} as const;

// ==================== 核心模型 ====================

/**
 * 供应商标准核心模型（跨服务统一视图）
 *
 * 字段并集 + 统一命名。与 Rust topems_shared_core::supplier::SupplierCore 对齐。
 * tenant_id 设为可选以兼容 SCM/ERP/Mobile 未实现多租户的现状。
 */
export interface SupplierCore {
  /** 主键 */
  id: string;
  /** 租户 ID（SCM/ERP/Mobile 暂未实现，可选） */
  tenant_id?: string;
  /** 供应商编号（标准字段名；SRM 的 supplier_no、ERP 的 supplier_code 均映射至此） */
  code: string;
  /** 供应商全称 */
  name: string;
  /** 简称（SCM/ERP） */
  short_name?: string;
  /** 法人名称（SRM 独有，与 short_name 语义不同，单独保留） */
  legal_name?: string;
  /** 分类（标准枚举字符串） */
  category?: SupplierCategory;
  /** 状态（标准枚举） */
  status: SupplierStatus;
  /** 联系人（标准字段名；SCM 的 contact_name 映射至此） */
  contact_person?: string;
  /** 联系电话（标准字段名；SRM 的 phone 映射至此） */
  contact_phone?: string;
  /** 邮箱 */
  email?: string;
  /** 地址 */
  address?: string;
  /** 省（ERP 独有） */
  province?: string;
  /** 市（ERP 独有） */
  city?: string;
  /** 区/县（ERP 独有） */
  district?: string;
  /** 税号（标准字段名；SRM 的 tax_id 映射至此） */
  tax_number?: string;
  /** 银行账号（SCM/unified-core） */
  bank_account?: string;
  /** 开户行名称（ERP 前端） */
  bank_name?: string;
  /** 网站（SRM 独有） */
  website?: string;
  /** 信用评级（标准字段名；Mobile 的 rating(number) 映射至此为字符串） */
  credit_rating?: string;
  /** 风险等级（SRM 独有，标准化保留） */
  risk_level?: SupplierRiskLevel;
  /** 行业（ERP 独有） */
  industry?: string;
  /** 资质等级（ERP 独有） */
  qualification_level?: string;
  /** 创建人（SRM 独有） */
  created_by?: string;
  /** 扩展属性（unified-core 主数据快照用 JSON） */
  attributes?: Record<string, unknown>;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/** 创建供应商请求（标准模型） */
export interface CreateSupplierRequest {
  code: string;
  name: string;
  short_name?: string;
  legal_name?: string;
  category?: SupplierCategory;
  contact_person?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  website?: string;
  credit_rating?: string;
  risk_level?: SupplierRiskLevel;
  industry?: string;
  qualification_level?: string;
  /** 创建时可指定状态（默认 active） */
  status?: SupplierStatus;
}

/** 更新供应商请求（标准模型，全字段可选） */
export interface UpdateSupplierRequest {
  code?: string;
  name?: string;
  short_name?: string;
  legal_name?: string;
  category?: SupplierCategory;
  status?: SupplierStatus;
  contact_person?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  website?: string;
  credit_rating?: string;
  risk_level?: SupplierRiskLevel;
  industry?: string;
  qualification_level?: string;
}

/**
 * 跨服务同步用的精简结构
 *
 * 用于主数据同步（unified-core master_data）事件载荷，
 * 仅包含跨服务必需的标识与基础信息。
 */
export interface SupplierSync {
  id: string;
  tenant_id?: string;
  code: string;
  name: string;
  status: SupplierStatus;
  category?: SupplierCategory;
  /** 源服务（srm/scm/erp） */
  source_service: string;
  /** 最近同步时间 */
  synced_at: string;
}

// ==================== 各服务类型映射函数 ====================
//
// 以下映射函数将各服务的业务 Supplier 类型转换为统一的 SupplierCore。
// 各服务的本地类型定义保留不动（位于 apps/web/src/api/{svc}/types.ts），
// 仅在需要跨服务消费时调用映射函数。

/**
 * SRM Supplier -> SupplierCore
 *
 * SRM 字段映射：supplier_no -> code, phone -> contact_phone, tax_id -> tax_number
 */
export function mapSrmSupplierToCore(srm: {
  id: string;
  tenant_id?: string;
  supplier_no: string;
  name: string;
  legal_name?: string;
  category: string;
  status: string;
  tax_id?: string;
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  credit_rating?: string;
  risk_level?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}): SupplierCore {
  return {
    id: srm.id,
    tenant_id: srm.tenant_id,
    code: srm.supplier_no,
    name: srm.name,
    legal_name: srm.legal_name,
    category: parseSupplierCategory(srm.category),
    status: parseSupplierStatus(srm.status),
    tax_number: srm.tax_id,
    address: srm.address,
    contact_person: srm.contact_person,
    contact_phone: srm.phone,
    email: srm.email,
    website: srm.website,
    credit_rating: srm.credit_rating,
    risk_level: srm.risk_level as SupplierRiskLevel | undefined,
    created_by: srm.created_by,
    created_at: srm.created_at,
    updated_at: srm.updated_at,
  };
}

/**
 * SCM Supplier -> SupplierCore
 *
 * SCM 字段映射：contact_name -> contact_person
 */
export function mapScmSupplierToCore(scm: {
  id: string;
  name: string;
  short_name?: string;
  contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  bank_account?: string;
  tax_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
}): SupplierCore {
  return {
    id: scm.id,
    code: scm.id, // SCM 无编号字段，暂用 id 作为 code
    name: scm.name,
    short_name: scm.short_name,
    contact_person: scm.contact_name,
    contact_phone: scm.contact_phone,
    email: scm.email,
    address: scm.address,
    bank_account: scm.bank_account,
    tax_number: scm.tax_number,
    status: parseSupplierStatus(scm.status),
    created_at: scm.created_at,
    updated_at: scm.updated_at,
  };
}

/**
 * ERP Supplier -> SupplierCore
 *
 * ERP 字段映射：supplier_code -> code, supplier_name -> name,
 * contact_email -> email, supplier_type -> category
 */
export function mapErpSupplierToCore(erp: {
  id: string;
  supplier_code: string;
  supplier_name: string;
  short_name?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zip_code?: string;
  tax_number?: string;
  bank_account?: string;
  bank_name?: string;
  credit_rating?: string;
  status: string;
  category?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}): SupplierCore {
  return {
    id: erp.id,
    code: erp.supplier_code,
    name: erp.supplier_name,
    short_name: erp.short_name,
    contact_person: erp.contact_person,
    contact_phone: erp.contact_phone,
    email: erp.contact_email,
    address: erp.address,
    province: erp.province,
    city: erp.city,
    tax_number: erp.tax_number,
    bank_account: erp.bank_account,
    bank_name: erp.bank_name,
    credit_rating: erp.credit_rating,
    category: erp.category ? parseSupplierCategory(erp.category) : undefined,
    status: parseSupplierStatus(erp.status),
    created_at: erp.created_at,
    updated_at: erp.updated_at,
  };
}

/**
 * Mobile Supplier -> SupplierCore
 *
 * Mobile 字段映射：phone -> contact_phone, rating(number) -> credit_rating(string)
 */
export function mapMobileSupplierToCore(mobile: {
  id: string;
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  status: string;
  rating?: number;
  total_orders?: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}): SupplierCore {
  return {
    id: mobile.id,
    code: mobile.code ?? mobile.id,
    name: mobile.name,
    contact_person: mobile.contact_person,
    contact_phone: mobile.phone,
    email: mobile.email,
    address: mobile.address,
    category: mobile.category ? parseSupplierCategory(mobile.category) : undefined,
    status: parseSupplierStatus(mobile.status),
    credit_rating: mobile.rating !== undefined ? String(mobile.rating) : undefined,
    created_at: mobile.created_at,
    updated_at: mobile.updated_at,
  };
}
