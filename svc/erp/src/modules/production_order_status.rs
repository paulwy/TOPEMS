//! ERP 生产订单状态：`erp.erp_production_orders.status` 的唯一值源。
//!
//! 列定义：varchar NOT NULL，DB 默认 `pending`。创建写 `'pending'`（一致）。
//! 此前该列是「审批 + 下发」两段式且**几乎没有任何校验**：
//! - 创建固定 `'pending'`；
//! - 编辑只允许 `status IN ('pending', 'released')`；
//! - 删除只允许 `status IN ('pending', 'cancelled')`；
//! - `update_production_order` 用 `status = COALESCE($3, status)`，`req.status` 是自由字符串；
//! - `update_production_status`（状态流转专用接口）把 `req.status` 原样写库；
//! - 此外还有 `if req.status == "approved"` 的字面量比较，用来触发 `ErpProductionOrderDispatched` 事件。
//!
//! 值集：审批段 `pending → approved`，下发给 MES 后 `released`，MES 回写 `in_progress → completed`，
//! 任意阶段可 `cancelled`。与 MES 侧 `apps/web/src/schemas/mes/productionOrder.ts`
//! （pending / released / in_progress / completed / cancelled / paused / closed）取并集去重后，
//! ERP 这一列不含 `paused` / `closed`（那是 `mes.production_orders` 自己的执行态）。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductionOrderStatus {
    /// 待审批
    Pending,
    /// 已审批（触发下发事件）
    Approved,
    /// 已下达 MES
    Released,
    /// 生产中（MES 回写）
    InProgress,
    /// 已完工（MES 回写）
    Completed,
    /// 已取消
    Cancelled,
}

impl ProductionOrderStatus {
    /// `erp.erp_production_orders.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 6] = [
        "pending",
        "approved",
        "released",
        "in_progress",
        "completed",
        "cancelled",
    ];

    /// 新建生产订单的默认状态（与 DB 默认、创建写入一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "released" => Some(Self::Released),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `erp.erp_production_orders.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Released => "released",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 响应兜底：列 NOT NULL，未知历史值回落 `DEFAULT`
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }

    /// 列表过滤解析：`None` / 空串 / `all` 表示不过滤，未知值返回 `Err`
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, &'static str> {
        match raw.map(str::trim) {
            None => Ok(None),
            Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or("unknown_status"),
        }
    }
}

impl std::fmt::Display for ProductionOrderStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn db_strings_roundtrip() {
        for s in ProductionOrderStatus::DB_VALUES {
            assert_eq!(
                ProductionOrderStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(ProductionOrderStatus::DB_VALUES.len(), 6);
    }

    #[test]
    fn defaults_to_pending() {
        assert_eq!(ProductionOrderStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn rejects_mes_only_states() {
        assert_eq!(ProductionOrderStatus::from_db_str("paused"), None);
        assert_eq!(ProductionOrderStatus::from_db_str("closed"), None);
        assert_eq!(ProductionOrderStatus::from_db_str("bogus"), None);
        assert!(ProductionOrderStatus::from_db_str("IN_PROGRESS").is_some());
    }

    #[test]
    fn accepts_canceled_alias() {
        assert_eq!(
            ProductionOrderStatus::from_db_str("canceled").map(|v| v.as_db_str()),
            Some("cancelled")
        );
    }

    #[test]
    fn normalize_and_parse_filter() {
        assert_eq!(ProductionOrderStatus::normalize("released"), "released");
        assert_eq!(ProductionOrderStatus::normalize("weird"), "pending");
        assert_eq!(ProductionOrderStatus::parse_filter(None), Ok(None));
        assert_eq!(ProductionOrderStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(
            ProductionOrderStatus::parse_filter(Some("approved")),
            Ok(Some(ProductionOrderStatus::Approved))
        );
        assert_eq!(
            ProductionOrderStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }
}
