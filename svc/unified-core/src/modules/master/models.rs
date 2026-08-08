//! MDM 主数据模型
//!
//! 5 大主数据域的统一数据模型。
//! 实际数据存储在各业务服务中（CRM/SRM/ERP/HRM/Finance），
//! unified-core 仅维护主数据引用（master_data_refs）用于跨服务查询和事件路由。

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use topems_shared::event::MasterDataDomain;

/// 主数据引用表（核心表）
///
/// 每条记录代表一个主数据实体的引用信息，是跨服务查询的索引。
/// 实际业务字段存储在各业务服务中，本表仅保存主数据索引和最近一次快照。
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MasterDataRef {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub domain: String,
    pub code: String,
    pub name: String,
    pub status: String,
    pub version: i32,
    pub source_service: String,
    pub last_synced_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建主数据引用请求
#[derive(Debug, Clone, Deserialize)]
pub struct CreateMasterDataRefRequest {
    pub domain: String,
    pub code: String,
    pub name: String,
    pub status: Option<String>,
    pub source_service: String,
    pub attributes: Option<serde_json::Value>,
}

/// 更新主数据引用请求
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMasterDataRefRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub attributes: Option<serde_json::Value>,
}

/// 主数据查询参数
#[derive(Debug, Clone, Deserialize, Default)]
pub struct MasterDataQuery {
    pub domain: Option<String>,
    pub code: Option<String>,
    pub name: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 主数据列表响应
#[derive(Debug, Clone, Serialize)]
pub struct MasterDataListResponse {
    pub items: Vec<MasterDataRef>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// 主数据变更历史
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MasterDataChangeLog {
    pub id: Uuid,
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub action: String,
    pub source_service: String,
    pub operator: Option<String>,
    pub changed_fields: Option<Vec<String>>,
    pub payload: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// 组织（Organization）扩展数据
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Organization {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub manager_id: Option<String>,
    pub organization_type: String,
    pub status: String,
    pub effective_date: Option<NaiveDate>,
    pub attributes: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 员工（Employee）扩展数据
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Employee {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub organization_id: Option<String>,
    pub position: Option<String>,
    pub employee_type: Option<String>,
    pub hire_date: Option<NaiveDate>,
    pub status: String,
    pub attributes: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 客户（Customer）扩展数据
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Customer {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub level: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub address: Option<String>,
    pub status: String,
    pub attributes: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 供应商（Supplier）扩展数据
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Supplier {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub rating: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub bank_account: Option<String>,
    pub status: String,
    pub attributes: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 物料（Material）扩展数据
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Material {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub category: Option<String>,
    pub standard_price: Option<rust_decimal::Decimal>,
    pub status: String,
    pub attributes: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 域统计信息
#[derive(Debug, Clone, Serialize)]
pub struct DomainStats {
    pub domain: String,
    pub total: i64,
    pub active: i64,
    pub inactive: i64,
    pub last_updated: Option<DateTime<Utc>>,
}

/// MDM 整体统计
#[derive(Debug, Clone, Serialize)]
pub struct MdmOverallStats {
    pub total_master_data: i64,
    pub by_domain: Vec<DomainStats>,
    pub recent_changes_24h: i64,
}

/// 同步状态
#[derive(Debug, Clone, Serialize)]
pub struct SyncStatus {
    pub domain: String,
    pub source_service: String,
    pub last_sync_at: Option<DateTime<Utc>>,
    pub pending_count: i64,
    pub failed_count: i64,
    pub status: String,
}

impl MasterDataRef {
    pub fn from_request(
        tenant_id: Uuid,
        req: &CreateMasterDataRefRequest,
        master_data_id: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            master_data_id,
            tenant_id,
            domain: req.domain.clone(),
            code: req.code.clone(),
            name: req.name.clone(),
            status: req.status.clone().unwrap_or_else(|| "active".to_string()),
            version: 1,
            source_service: req.source_service.clone(),
            last_synced_at: now,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_domain(tenant_id: Uuid, domain: MasterDataDomain) -> Self {
        let now = Utc::now();
        let (source_service, prefix) = match domain {
            MasterDataDomain::Customer => ("crm", "cust"),
            MasterDataDomain::Supplier => ("srm", "supp"),
            MasterDataDomain::Material => ("erp", "mat"),
            MasterDataDomain::Organization => ("hrm", "org"),
            MasterDataDomain::Employee => ("hrm", "emp"),
            MasterDataDomain::AccountSubject => ("finance", "acct"),
        };
        Self {
            master_data_id: format!("{}-{}", prefix, Uuid::new_v4()),
            tenant_id,
            domain: format!("{:?}", domain).to_lowercase(),
            code: String::new(),
            name: String::new(),
            status: "active".to_string(),
            version: 1,
            source_service: source_service.to_string(),
            last_synced_at: now,
            created_at: now,
            updated_at: now,
        }
    }
}

// ==================== V31.0 质量看板模型 ====================

/// 主数据质量报告
#[derive(Debug, Clone, Serialize)]
pub struct QualityReport {
    pub tenant_id: Uuid,
    pub generated_at: DateTime<Utc>,
    pub overall_score: f64,
    pub total_count: i64,
    pub duplicate_count: i64,
    pub stale_count: i64,
    pub inconsistency_count: i64,
    pub duplicate_rate: f64,
    pub stale_rate: f64,
    pub inconsistency_rate: f64,
    pub by_domain: Vec<DomainQualityDetail>,
}

/// 各域质量详情
#[derive(Debug, Clone, Serialize)]
pub struct DomainQualityDetail {
    pub domain: String,
    pub total: i64,
    pub active: i64,
    pub duplicates: i64,
    pub stale: i64,
    pub inconsistencies: i64,
    pub last_synced: Option<DateTime<Utc>>,
    pub quality_score: f64,
}

/// 重复编码记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DuplicateRecord {
    pub domain: String,
    pub code: String,
    pub count: i64,
    pub master_data_ids: Vec<String>,
}

/// 过期数据记录（超过阈值未同步）
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct StaleRecord {
    pub master_data_id: String,
    pub domain: String,
    pub code: String,
    pub name: String,
    pub source_service: String,
    pub last_synced_at: DateTime<Utc>,
    pub hours_since_sync: f64,
}

/// 对账结果
#[derive(Debug, Clone, Serialize)]
pub struct ReconciliationResult {
    pub tenant_id: Uuid,
    pub reconciled_at: DateTime<Utc>,
    pub domains_checked: Vec<String>,
    pub total_checked: i64,
    pub consistent: i64,
    pub inconsistent: i64,
    pub missing_in_mdm: i64,
    pub missing_in_source: i64,
    pub details: Vec<ReconciliationDetail>,
}

/// 各域对账详情
#[derive(Debug, Clone, Serialize)]
pub struct ReconciliationDetail {
    pub domain: String,
    pub source_service: String,
    pub mdm_count: i64,
    pub source_count: i64,
    pub consistent: i64,
    pub inconsistent: i64,
    pub status: String,
}

/// 对账日志记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ReconciliationLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub domain: String,
    pub master_data_id: String,
    pub issue_type: String,
    pub description: String,
    pub detected_at: DateTime<Utc>,
    pub resolved: bool,
    pub resolved_at: Option<DateTime<Utc>>,
}

// ==================== V31.0 变更审批模型 ====================

/// 需要审批的主数据域
pub const APPROVAL_REQUIRED_DOMAINS: &[&str] = &["account_subject"];

/// 审批状态 — 统一使用 shared-core 通用枚举（6 变体：Pending/Approved/Rejected/InProgress/Cancelled/Expired）
pub use topems_shared::common_types::ApprovalStatus;

/// 主数据变更审批请求
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MasterDataApproval {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub master_data_id: String,
    pub domain: String,
    pub action: String,
    pub requested_by: String,
    pub requested_at: DateTime<Utc>,
    pub status: String,
    pub reviewed_by: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub review_comment: Option<String>,
    pub payload: Option<serde_json::Value>,
}

/// 创建审批请求
#[derive(Debug, Clone, Deserialize)]
pub struct CreateApprovalRequest {
    pub master_data_id: String,
    pub domain: String,
    pub action: String,
    pub payload: Option<serde_json::Value>,
}

/// 审批请求
#[derive(Debug, Clone, Deserialize)]
pub struct ReviewApprovalRequest {
    pub approved: bool,
    pub comment: Option<String>,
}

/// 判断域是否需要审批
pub fn requires_approval(domain: &str) -> bool {
    APPROVAL_REQUIRED_DOMAINS.contains(&domain)
}
