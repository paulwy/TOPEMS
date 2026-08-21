//! 供应商（Supplier）统一标准类型
//!
//! 跨服务共享的供应商主数据标准定义，用于消除 SRM / SCM / ERP / unified-core
//! 四套 Rust 模型与五套前端类型之间的字段命名分歧。
//!
//! ## 设计原则
//!
//! - **字段并集**：收录所有服务出现过的业务字段，可选字段统一用 `Option<T>`
//! - **命名标准**：采用多数服务已使用的字段名作为标准
//! - **不碰 schema**：本模块仅定义"视图模型"，各服务数据库列名与 `sqlx::query!`
//!   类型推断保持不变，`.sqlx` 离线缓存不受影响
//! - **渐进迁移**：各服务可在 handler 层将业务模型转换为本标准类型后返回
//!
//! ## 字段命名映射（业务字段 -> 标准字段）
//!
//! | 语义       | SRM            | SCM           | ERP              | unified-core   | 本标准           |
//! |-----------|----------------|---------------|------------------|----------------|-----------------|
//! | 编号       | supplier_no    | (无)          | code             | code           | `code`          |
//! | 联系人     | contact_person | contact_name  | contact_person   | contact_person | `contact_person`|
//! | 电话       | phone          | contact_phone | contact_phone    | contact_phone  | `contact_phone` |
//! | 税号       | tax_id         | tax_number    | (无)             | (无)           | `tax_number`    |
//! | 信用评级   | credit_rating  | (无)          | (无)             | rating         | `credit_rating` |
//! | 分类       | category       | (无)          | supplier_type    | category       | `category`      |
//!
//! 注：`legal_name`（法人名称，SRM）与 `short_name`（简称，SCM/ERP）语义不同，均保留为独立字段。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

/// 供应商状态（标准枚举）
///
/// 覆盖各服务出现的全部状态值。各服务若仅使用子集，仍可安全使用本枚举；
/// 序列化为 snake_case 字符串以兼容现有前端 `status: string` 契约。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SupplierStatus {
    /// 活跃（SRM/SCM/ERP/unified-core 通用）
    Active,
    /// 未激活 / 停用（SCM/ERP）
    Inactive,
    /// 待审核（SRM/SCM 准入流程）
    Pending,
    /// 黑名单（SRM 风险管理）
    Blacklisted,
}

impl SupplierStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Pending => "pending",
            Self::Blacklisted => "blacklisted",
        }
    }

    /// 从字符串解析，兼容各服务历史用词（如 "disabled" -> Inactive）。
    pub fn from_str_lossy(s: &str) -> Self {
        match s.to_ascii_lowercase().as_str() {
            "active" => Self::Active,
            "inactive" | "disabled" => Self::Inactive,
            "pending" | "draft" => Self::Pending,
            "blacklisted" | "blocked" => Self::Blacklisted,
            _ => Self::Active,
        }
    }
}

impl std::fmt::Display for SupplierStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl Default for SupplierStatus {
    fn default() -> Self {
        Self::Active
    }
}

/// 供应商分类（标准枚举）
///
/// 统一 SRM 的 `category`（raw_material/service）与 ERP 的 `supplier_type`
///（manufacturer/trader）为同一维度，使用本枚举。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SupplierCategory {
    /// 原材料供应商
    RawMaterial,
    /// 制造商
    Manufacturer,
    /// 贸易商
    Trader,
    /// 服务供应商
    Service,
    /// 物流供应商
    Logistics,
    /// 其他
    Other,
}

impl SupplierCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::RawMaterial => "raw_material",
            Self::Manufacturer => "manufacturer",
            Self::Trader => "trader",
            Self::Service => "service",
            Self::Logistics => "logistics",
            Self::Other => "other",
        }
    }

    /// 从字符串解析，兼容 SRM/ERP 历史用词。
    pub fn from_str_lossy(s: &str) -> Self {
        match s.to_ascii_lowercase().as_str() {
            "raw_material" | "raw" => Self::RawMaterial,
            "manufacturer" | "producer" => Self::Manufacturer,
            "trader" | "distributor" => Self::Trader,
            "service" => Self::Service,
            "logistics" => Self::Logistics,
            _ => Self::Other,
        }
    }
}

impl std::fmt::Display for SupplierCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// 风险等级（SRM 独有，标准化保留）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum SupplierRiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl SupplierRiskLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

impl Default for SupplierRiskLevel {
    fn default() -> Self {
        Self::Low
    }
}

/// 供应商标准核心模型（跨服务统一视图）
///
/// 字段并集 + 统一命名。各服务业务模型通过 `From` 实现转换为本类型后返回，
/// 前端统一消费此结构。`tenant_id` 设为可选以兼容 SCM/ERP 未实现多租户的现状。
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierCore {
    /// 主键（unified-core 的 master_data_id: String 在同步层单独处理）
    pub id: Uuid,
    /// 租户 ID（SCM/ERP 暂未实现，可选）
    pub tenant_id: Option<Uuid>,
    /// 供应商编号（标准字段名；SRM 的 supplier_no、ERP 的 code 均映射至此）
    pub code: String,
    /// 供应商全称
    pub name: String,
    /// 简称（SCM/ERP）
    pub short_name: Option<String>,
    /// 法人名称（SRM 独有，与 short_name 语义不同，单独保留）
    pub legal_name: Option<String>,
    /// 分类（标准枚举；序列化为 snake_case 字符串）
    pub category: Option<SupplierCategory>,
    /// 状态（标准枚举）
    pub status: SupplierStatus,
    /// 联系人（标准字段名；SCM 的 contact_name 映射至此）
    pub contact_person: Option<String>,
    /// 联系电话（标准字段名；SRM 的 phone 映射至此）
    pub contact_phone: Option<String>,
    /// 邮箱
    pub email: Option<String>,
    /// 地址
    pub address: Option<String>,
    /// 省（ERP 独有）
    pub province: Option<String>,
    /// 市（ERP 独有）
    pub city: Option<String>,
    /// 区/县（ERP 独有）
    pub district: Option<String>,
    /// 税号（标准字段名；SRM 的 tax_id 映射至此）
    pub tax_number: Option<String>,
    /// 银行账号（SCM/unified-core）
    pub bank_account: Option<String>,
    /// 开户行名称（ERP 前端）
    pub bank_name: Option<String>,
    /// 网站（SRM 独有）
    pub website: Option<String>,
    /// 信用评级（标准字段名；unified-core 的 rating 映射至此）
    pub credit_rating: Option<String>,
    /// 风险等级（SRM 独有，标准化保留）
    pub risk_level: Option<SupplierRiskLevel>,
    /// 行业（ERP 独有）
    pub industry: Option<String>,
    /// 资质等级（ERP 独有）
    pub qualification_level: Option<String>,
    /// 创建人（SRM 独有）
    pub created_by: Option<Uuid>,
    /// 扩展属性（unified-core 主数据快照用 JSON）
    pub attributes: Option<serde_json::Value>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

/// 创建供应商请求（标准模型）
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateSupplierRequest {
    pub code: String,
    pub name: String,
    pub short_name: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<SupplierCategory>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub tax_number: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: Option<SupplierRiskLevel>,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
    /// 创建时可指定状态（默认 active）
    pub status: Option<SupplierStatus>,
}

/// 更新供应商请求（标准模型，全字段可选）
#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct UpdateSupplierRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub short_name: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<SupplierCategory>,
    pub status: Option<SupplierStatus>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub province: Option<String>,
    pub city: Option<String>,
    pub district: Option<String>,
    pub tax_number: Option<String>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: Option<SupplierRiskLevel>,
    pub industry: Option<String>,
    pub qualification_level: Option<String>,
}

/// 跨服务同步用的精简结构
///
/// 用于主数据同步（unified-core master_data）事件载荷，
/// 仅包含跨服务必需的标识与基础信息。
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SupplierSync {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
    pub code: String,
    pub name: String,
    pub status: SupplierStatus,
    pub category: Option<SupplierCategory>,
    /// 源服务（srm/scm/erp）
    pub source_service: String,
    /// 最近同步时间
    pub synced_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn sample_datetime() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-21T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn sample_supplier_core() -> SupplierCore {
        SupplierCore {
            id: sample_uuid(),
            tenant_id: Some(sample_uuid()),
            code: "SUP-001".to_string(),
            name: "Acme Corp".to_string(),
            short_name: Some("ACME".to_string()),
            legal_name: Some("Acme Corporation Ltd".to_string()),
            category: Some(SupplierCategory::Manufacturer),
            status: SupplierStatus::Active,
            contact_person: Some("Zhang San".to_string()),
            contact_phone: Some("13800000000".to_string()),
            email: Some("contact@acme.com".to_string()),
            address: Some("No.1 Main St".to_string()),
            province: Some("Shanghai".to_string()),
            city: Some("Shanghai".to_string()),
            district: Some("Pudong".to_string()),
            tax_number: Some("91110000MA02CT357K".to_string()),
            bank_account: Some("6222020200112345678".to_string()),
            bank_name: Some("ICBC".to_string()),
            website: Some("https://acme.com".to_string()),
            credit_rating: Some("AAA".to_string()),
            risk_level: Some(SupplierRiskLevel::Low),
            industry: Some("Manufacturing".to_string()),
            qualification_level: Some("A".to_string()),
            created_by: Some(sample_uuid()),
            attributes: Some(serde_json::json!({"key": "value"})),
            created_at: sample_datetime(),
            updated_at: sample_datetime(),
        }
    }

    #[test]
    fn supplier_core_serde_roundtrip_full() {
        let s = sample_supplier_core();
        let json = serde_json::to_string(&s).unwrap();
        let de: SupplierCore = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, s.id);
        assert_eq!(de.code, s.code);
        assert_eq!(de.name, s.name);
        assert_eq!(de.short_name, s.short_name);
        assert_eq!(de.legal_name, s.legal_name);
        assert_eq!(de.category, s.category);
        assert_eq!(de.status, s.status);
        assert_eq!(de.contact_person, s.contact_person);
        assert_eq!(de.contact_phone, s.contact_phone);
        assert_eq!(de.tax_number, s.tax_number);
        assert_eq!(de.bank_account, s.bank_account);
        assert_eq!(de.credit_rating, s.credit_rating);
        assert_eq!(de.risk_level, s.risk_level);
    }

    #[test]
    fn supplier_core_serde_minimal() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "code": "SUP-002",
            "name": "Minimal Supplier",
            "status": "pending",
            "created_at": "2026-08-21T08:00:00Z",
            "updated_at": "2026-08-21T08:00:00Z"
        }"#;
        let s: SupplierCore = serde_json::from_str(json).unwrap();
        assert_eq!(s.code, "SUP-002");
        assert_eq!(s.name, "Minimal Supplier");
        assert_eq!(s.status, SupplierStatus::Pending);
        assert!(s.tenant_id.is_none());
        assert!(s.short_name.is_none());
        assert!(s.category.is_none());
        assert!(s.tax_number.is_none());
    }

    #[test]
    fn supplier_status_serializes_snake_case() {
        assert_eq!(
            serde_json::to_string(&SupplierStatus::Active).unwrap(),
            "\"active\""
        );
        assert_eq!(
            serde_json::to_string(&SupplierStatus::Blacklisted).unwrap(),
            "\"blacklisted\""
        );
    }

    #[test]
    fn supplier_status_from_str_lossy_compat() {
        assert_eq!(SupplierStatus::from_str_lossy("active"), SupplierStatus::Active);
        assert_eq!(SupplierStatus::from_str_lossy("disabled"), SupplierStatus::Inactive);
        assert_eq!(SupplierStatus::from_str_lossy("draft"), SupplierStatus::Pending);
        assert_eq!(SupplierStatus::from_str_lossy("blocked"), SupplierStatus::Blacklisted);
        assert_eq!(SupplierStatus::from_str_lossy("unknown"), SupplierStatus::Active);
    }

    #[test]
    fn supplier_category_from_str_lossy_compat() {
        assert_eq!(
            SupplierCategory::from_str_lossy("raw_material"),
            SupplierCategory::RawMaterial
        );
        assert_eq!(
            SupplierCategory::from_str_lossy("producer"),
            SupplierCategory::Manufacturer
        );
        assert_eq!(
            SupplierCategory::from_str_lossy("distributor"),
            SupplierCategory::Trader
        );
        assert_eq!(
            SupplierCategory::from_str_lossy("custom"),
            SupplierCategory::Other
        );
    }

    #[test]
    fn supplier_status_default_is_active() {
        assert_eq!(SupplierStatus::default(), SupplierStatus::Active);
    }

    #[test]
    fn supplier_risk_level_default_is_low() {
        assert_eq!(SupplierRiskLevel::default(), SupplierRiskLevel::Low);
    }

    #[test]
    fn create_supplier_request_serde_roundtrip() {
        let req = CreateSupplierRequest {
            code: "SUP-NEW".to_string(),
            name: "New Supplier".to_string(),
            short_name: Some("NS".to_string()),
            legal_name: None,
            category: Some(SupplierCategory::Trader),
            contact_person: Some("Li Si".to_string()),
            contact_phone: None,
            email: Some("new@supplier.com".to_string()),
            address: None,
            province: None,
            city: None,
            district: None,
            tax_number: Some("TAX123".to_string()),
            bank_account: None,
            bank_name: None,
            website: None,
            credit_rating: Some("AA".to_string()),
            risk_level: Some(SupplierRiskLevel::Medium),
            industry: None,
            qualification_level: None,
            status: Some(SupplierStatus::Pending),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, "SUP-NEW");
        assert_eq!(de.category, Some(SupplierCategory::Trader));
        assert_eq!(de.status, Some(SupplierStatus::Pending));
        assert!(de.legal_name.is_none());
    }

    #[test]
    fn update_supplier_request_all_none() {
        let req = UpdateSupplierRequest::default();
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateSupplierRequest = serde_json::from_str(&json).unwrap();
        assert!(de.code.is_none());
        assert!(de.name.is_none());
        assert!(de.status.is_none());
        assert!(de.category.is_none());
    }

    #[test]
    fn update_supplier_request_partial() {
        let json = r#"{"name": "Updated", "status": "inactive"}"#;
        let req: UpdateSupplierRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name.as_deref(), Some("Updated"));
        assert_eq!(req.status, Some(SupplierStatus::Inactive));
        assert!(req.code.is_none());
    }

    #[test]
    fn supplier_sync_serde_roundtrip() {
        let sync = SupplierSync {
            id: sample_uuid(),
            tenant_id: Some(sample_uuid()),
            code: "SUP-SYNC".to_string(),
            name: "Sync Supplier".to_string(),
            status: SupplierStatus::Active,
            category: Some(SupplierCategory::Service),
            source_service: "srm".to_string(),
            synced_at: sample_datetime(),
        };
        let json = serde_json::to_string(&sync).unwrap();
        let de: SupplierSync = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, "SUP-SYNC");
        assert_eq!(de.source_service, "srm");
        assert_eq!(de.status, SupplierStatus::Active);
    }

    #[test]
    fn supplier_core_ignores_unknown_fields() {
        let s = sample_supplier_core();
        let mut json = serde_json::to_value(&s).unwrap();
        json["extra_field"] = serde_json::json!("ignored");
        let de: SupplierCore = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, s.id);
    }

    #[test]
    fn supplier_core_json_field_names_snake_case() {
        let s = sample_supplier_core();
        let json = serde_json::to_value(&s).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("id"));
        assert!(obj.contains_key("tenant_id"));
        assert!(obj.contains_key("code"));
        assert!(obj.contains_key("contact_person"));
        assert!(obj.contains_key("contact_phone"));
        assert!(obj.contains_key("tax_number"));
        assert!(obj.contains_key("credit_rating"));
        assert!(obj.contains_key("created_at"));
    }
}
