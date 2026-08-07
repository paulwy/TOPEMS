//! 通用枚举类型定义
//!
//! 跨服务共享的标准枚举，用于消除各服务重复定义的
//! `ResourceType`、`ApprovalStatus` 等常见枚举。
//!
//! 若某服务需要服务特有变体（如 Expired vs Cancelled），
//! 可保留本地枚举或扩展此通用枚举（宁少勿错，优先确保兼容性）。

use serde::{Deserialize, Serialize};

/// 通用审批状态
///
/// 覆盖各服务常见审批状态：待审批 / 已通过 / 已拒绝 / 进行中 / 已取消 / 已过期
///
/// 注：各服务若仅需子集（如无 Expired / 无 Cancelled），
/// 仍然可以使用本枚举（无需的变体不会触发序列化问题）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    InProgress,
    Cancelled,
    Expired,
}

impl ApprovalStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::InProgress => "in_progress",
            Self::Cancelled => "cancelled",
            Self::Expired => "expired",
        }
    }
}

impl std::fmt::Display for ApprovalStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// 通用资源类型
///
/// 覆盖主流服务常见实体类型：客户 / 订单 / 用户 / 产品 / 物料 /
/// 合同 / 供应商 / 采购单 / 仓库 / 工单 / 项目 / 财务凭证 / 质量报告 等。
///
/// 注：若某服务存在特有资源，建议在本地补充枚举或使用字符串形式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    Customer,
    Order,
    User,
    Product,
    Material,
    Contract,
    Supplier,
    PurchaseOrder,
    Warehouse,
    WorkOrder,
    Project,
    FinanceVoucher,
    QualityReport,
    Ticket,
}

impl ResourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Customer => "customer",
            Self::Order => "order",
            Self::User => "user",
            Self::Product => "product",
            Self::Material => "material",
            Self::Contract => "contract",
            Self::Supplier => "supplier",
            Self::PurchaseOrder => "purchase_order",
            Self::Warehouse => "warehouse",
            Self::WorkOrder => "work_order",
            Self::Project => "project",
            Self::FinanceVoucher => "finance_voucher",
            Self::QualityReport => "quality_report",
            Self::Ticket => "ticket",
        }
    }
}

impl std::fmt::Display for ResourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
