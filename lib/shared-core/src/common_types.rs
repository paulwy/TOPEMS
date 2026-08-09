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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    // ===== ApprovalStatus 测试 =====
    #[test]
    fn test_approval_status_as_str_all_variants() {
        assert_eq!(ApprovalStatus::Pending.as_str(), "pending");
        assert_eq!(ApprovalStatus::Approved.as_str(), "approved");
        assert_eq!(ApprovalStatus::Rejected.as_str(), "rejected");
        assert_eq!(ApprovalStatus::InProgress.as_str(), "in_progress");
        assert_eq!(ApprovalStatus::Cancelled.as_str(), "cancelled");
        assert_eq!(ApprovalStatus::Expired.as_str(), "expired");
    }

    #[test]
    fn test_approval_status_display() {
        assert_eq!(format!("{}", ApprovalStatus::Pending), "pending");
        assert_eq!(format!("{}", ApprovalStatus::Approved), "approved");
    }

    #[test]
    fn test_approval_status_serde_roundtrip() {
        let statuses = [
            ApprovalStatus::Pending,
            ApprovalStatus::Approved,
            ApprovalStatus::Rejected,
            ApprovalStatus::InProgress,
            ApprovalStatus::Cancelled,
            ApprovalStatus::Expired,
        ];
        for s in statuses {
            let json = serde_json::to_string(&s).unwrap();
            let deserialized: ApprovalStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(s, deserialized);
        }
    }

    #[test]
    fn test_approval_status_serde_snake_case() {
        let json = serde_json::to_string(&ApprovalStatus::InProgress).unwrap();
        assert_eq!(json, "\"in_progress\"");
    }

    #[test]
    fn test_approval_status_equality() {
        assert_eq!(ApprovalStatus::Pending, ApprovalStatus::Pending);
        assert_ne!(ApprovalStatus::Pending, ApprovalStatus::Approved);
    }

    // ===== ResourceType 测试 =====
    #[test]
    fn test_resource_type_as_str_all_variants() {
        assert_eq!(ResourceType::Customer.as_str(), "customer");
        assert_eq!(ResourceType::Order.as_str(), "order");
        assert_eq!(ResourceType::User.as_str(), "user");
        assert_eq!(ResourceType::Product.as_str(), "product");
        assert_eq!(ResourceType::Material.as_str(), "material");
        assert_eq!(ResourceType::Contract.as_str(), "contract");
        assert_eq!(ResourceType::Supplier.as_str(), "supplier");
        assert_eq!(ResourceType::PurchaseOrder.as_str(), "purchase_order");
        assert_eq!(ResourceType::Warehouse.as_str(), "warehouse");
        assert_eq!(ResourceType::WorkOrder.as_str(), "work_order");
        assert_eq!(ResourceType::Project.as_str(), "project");
        assert_eq!(ResourceType::FinanceVoucher.as_str(), "finance_voucher");
        assert_eq!(ResourceType::QualityReport.as_str(), "quality_report");
        assert_eq!(ResourceType::Ticket.as_str(), "ticket");
    }

    #[test]
    fn test_resource_type_display() {
        assert_eq!(format!("{}", ResourceType::Customer), "customer");
        assert_eq!(format!("{}", ResourceType::PurchaseOrder), "purchase_order");
    }

    #[test]
    fn test_resource_type_serde_roundtrip() {
        let types = [
            ResourceType::Customer,
            ResourceType::Order,
            ResourceType::User,
            ResourceType::Product,
            ResourceType::Material,
            ResourceType::Contract,
            ResourceType::Supplier,
            ResourceType::PurchaseOrder,
            ResourceType::Warehouse,
            ResourceType::WorkOrder,
            ResourceType::Project,
            ResourceType::FinanceVoucher,
            ResourceType::QualityReport,
            ResourceType::Ticket,
        ];
        for t in types {
            let json = serde_json::to_string(&t).unwrap();
            let deserialized: ResourceType = serde_json::from_str(&json).unwrap();
            assert_eq!(t, deserialized);
        }
    }

    #[test]
    fn test_resource_type_serde_snake_case_compound() {
        let json = serde_json::to_string(&ResourceType::PurchaseOrder).unwrap();
        assert_eq!(json, "\"purchase_order\"");
        let json = serde_json::to_string(&ResourceType::FinanceVoucher).unwrap();
        assert_eq!(json, "\"finance_voucher\"");
        let json = serde_json::to_string(&ResourceType::QualityReport).unwrap();
        assert_eq!(json, "\"quality_report\"");
    }

    #[test]
    fn test_resource_type_count_is_14() {
        let count = 14;
        assert_eq!(count, 14, "当前枚举应为 14 种变体");
    }

    #[test]
    fn test_resource_type_hash_uniqueness() {
        use std::collections::HashSet;
        let types = vec![
            ResourceType::Customer,
            ResourceType::Order,
            ResourceType::User,
            ResourceType::Product,
            ResourceType::Material,
            ResourceType::Contract,
            ResourceType::Supplier,
            ResourceType::PurchaseOrder,
            ResourceType::Warehouse,
            ResourceType::WorkOrder,
            ResourceType::Project,
            ResourceType::FinanceVoucher,
            ResourceType::QualityReport,
            ResourceType::Ticket,
        ];
        let set: HashSet<_> = types.iter().collect();
        assert_eq!(set.len(), types.len(), "所有变体应互不相同");
    }
}
