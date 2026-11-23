//! MES↔ERP 同步记录状态（W5-B B224）
//!
//! `integration.mes_erp_sync.sync_status` 是 varchar(50) NOT NULL DEFAULT `pending`，
//! 没有 CHECK、也没有 Rust 类型。同一列被两条链路写成两个不同的“成功”值：
//! 服务层 `update_sync_success` 写 `'success'`，HTTP 快照接口 `sync_mes_erp` 写
//! `'synced'`；前端 `MES_ERP_STATUS_CONFIG` 只认 `pending / synced / failed`，
//! 列表过滤又直接把请求参数裸绑进 `sync_status = $2`。
//!
//! 本模块把权威值集定为前端一致的 `pending / synced / failed`，`success`
//! 作为历史别名映射到 `synced`。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MesErpSyncStatus {
    Pending,
    Synced,
    Failed,
}

impl MesErpSyncStatus {
    pub const ALL: [Self; 3] = [Self::Pending, Self::Synced, Self::Failed];

    pub const DB_VALUES: [&'static str; 3] = ["pending", "synced", "failed"];

    /// DB 默认值（`mes_erp_sync.sync_status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Synced => "synced",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `success` / `succeeded` / `completed` → synced。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "synced" | "success" | "succeeded" | "completed" => Some(Self::Synced),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }

    /// 只有失败记录允许重试。
    #[must_use]
    pub const fn can_retry(self) -> bool {
        matches!(self, Self::Failed)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法 MES↔ERP 同步状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法 MES↔ERP 同步状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for MesErpSyncStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for MesErpSyncStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_round_trip() {
        for status in MesErpSyncStatus::ALL {
            assert_eq!(MesErpSyncStatus::from_db_str(status.as_str()), Some(status));
        }
        assert_eq!(MesErpSyncStatus::DB_VALUES.len(), 3);
        assert_eq!(MesErpSyncStatus::DEFAULT, MesErpSyncStatus::Pending);
    }

    #[test]
    fn legacy_success_alias_maps_to_synced() {
        assert_eq!(
            MesErpSyncStatus::from_db_str("success"),
            Some(MesErpSyncStatus::Synced)
        );
        assert_eq!(
            MesErpSyncStatus::from_db_str("SUCCEEDED"),
            Some(MesErpSyncStatus::Synced)
        );
        assert_eq!(MesErpSyncStatus::from_db_str("processing"), None);
    }

    #[test]
    fn retry_only_from_failed() {
        assert!(MesErpSyncStatus::Failed.can_retry());
        assert!(!MesErpSyncStatus::Pending.can_retry());
        assert!(!MesErpSyncStatus::Synced.can_retry());
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(MesErpSyncStatus::parse_filter(None), Ok(None));
        assert_eq!(MesErpSyncStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(MesErpSyncStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            MesErpSyncStatus::parse_filter(Some(" success ")),
            Ok(Some(MesErpSyncStatus::Synced))
        );
        assert!(MesErpSyncStatus::parse_filter(Some("bogus")).is_err());
    }
}
