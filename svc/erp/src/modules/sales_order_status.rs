//! 销售订单状态：`erp.sales_orders.status` 的唯一值源。
//!
//! 与代码写入口、前端展示、DB CHECK 候选共用同一集合；解析未知值返回 `None`，
//! 不再静默落默认，避免脏值写进 `status` 列。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SalesOrderStatus {
    /// 新建未提交
    Draft,
    /// 已提交待审批（历史 stats 与外部写入在用）
    Pending,
    /// 已审批
    Approved,
    /// 已发货
    Shipped,
    /// 已完成
    Completed,
    /// 已取消
    Cancelled,
}

impl SalesOrderStatus {
    /// `erp.sales_orders.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "pending",
        "approved",
        "shipped",
        "completed",
        "cancelled",
    ];

    /// 读取侧兼容集合：历史 `confirmed` 投影为 approved，其余与 DB_VALUES 一致
    pub const READ_VALUES: [&'static str; 7] = [
        "draft",
        "pending",
        "approved",
        "confirmed",
        "shipped",
        "completed",
        "cancelled",
    ];

    /// 新建订单的默认状态
    pub const DEFAULT: Self = Self::Draft;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "shipped" => Some(Self::Shipped),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 读取侧解析：历史 `confirmed` 归一为 approved，未知值仍返回 None
    pub fn from_read_str(s: &str) -> Option<Self> {
        if s.trim().eq_ignore_ascii_case("confirmed") {
            Some(Self::Approved)
        } else {
            Self::from_db_str(s)
        }
    }

    /// 写入 `erp.sales_orders.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Shipped => "shipped",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 允许的起始状态集合（用于 UPDATE 的 `status = ANY($n)` 谓词）
    pub fn allowed_from(self) -> &'static [&'static str] {
        match self {
            Self::Draft => &["pending", "approved"],
            Self::Pending => &["draft"],
            Self::Approved => &["draft", "pending", "approved"],
            Self::Shipped => &["approved", "shipped"],
            Self::Completed => &["shipped", "completed"],
            Self::Cancelled => &["draft", "pending", "approved"],
        }
    }
}

impl std::fmt::Display for SalesOrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn sales_order_status_db_strings_roundtrip() {
        for s in SalesOrderStatus::DB_VALUES {
            assert_eq!(
                SalesOrderStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
    }

    #[test]
    fn sales_order_status_read_compat() {
        assert_eq!(
            SalesOrderStatus::from_read_str("confirmed"),
            Some(SalesOrderStatus::Approved)
        );
        assert_eq!(
            SalesOrderStatus::from_read_str(" CONFIRMED "),
            Some(SalesOrderStatus::Approved)
        );
        assert_eq!(SalesOrderStatus::from_read_str("void"), None);
        assert!(SalesOrderStatus::READ_VALUES.contains(&"confirmed"));
    }

    #[test]
    fn sales_order_status_rejects_unknown() {
        assert_eq!(SalesOrderStatus::from_db_str("confirmed"), None);
        assert_eq!(
            SalesOrderStatus::from_db_str("approved "),
            Some(SalesOrderStatus::Approved)
        );
        assert_eq!(
            SalesOrderStatus::from_db_str("APPROVED"),
            Some(SalesOrderStatus::Approved)
        );
        assert_eq!(SalesOrderStatus::from_db_str(""), None);
    }

    #[test]
    fn sales_order_status_transitions_cover_terminal_states() {
        assert!(SalesOrderStatus::Cancelled
            .allowed_from()
            .contains(&"draft"));
        assert!(!SalesOrderStatus::Cancelled
            .allowed_from()
            .contains(&"shipped"));
        assert!(SalesOrderStatus::Completed
            .allowed_from()
            .contains(&"shipped"));
        assert!(SalesOrderStatus::Shipped
            .allowed_from()
            .contains(&"approved"));
    }
}
