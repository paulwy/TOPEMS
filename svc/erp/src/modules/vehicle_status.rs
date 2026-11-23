//! 车辆与车辆申请状态：`erp.vehicles.status` 与 `erp.vehicle_requests.status` 的唯一值源。
//!
//! 两列都是 varchar 可空（无 DB 默认），写入口此前全部是 SQL 字面量 + 原样透传：
//! - `erp.vehicles`：创建写 `'available'`，更新 `req.status.unwrap_or(existing.status)` 可写任意串；
//!   创建用车申请时校验 `AND status = 'available'`；列表过滤 `params.status.clone()` 原样绑定。
//! - `erp.vehicle_requests`：创建写 `'pending'`，更新 `req.status.unwrap_or(existing.status)` 可写任意串；
//!   冲突检测 `AND status = 'approved'`；列表过滤同样原样绑定。
//!
//! 值集对齐前端 `apps/web/src/schemas/erp/vehicle.ts`（4 值）与
//! `apps/web/src/schemas/erp/vehicleRequest.ts`（4 值）的下拉、筛选、色板与 labelMap。

use serde::{Deserialize, Serialize};

/// 车辆自身状态：`erp.vehicles.status`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VehicleStatus {
    /// 可用（可被派车）
    Available,
    /// 使用中
    InUse,
    /// 维修中
    Maintenance,
    /// 不可用
    Unavailable,
}

impl VehicleStatus {
    pub const DB_VALUES: [&'static str; 4] = ["available", "in_use", "maintenance", "unavailable"];

    /// 新建车辆的默认状态（与创建写入口一致；该列无 DB 默认）
    pub const DEFAULT: Self = Self::Available;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "available" => Some(Self::Available),
            "in_use" | "in-use" | "inuse" => Some(Self::InUse),
            "maintenance" => Some(Self::Maintenance),
            "unavailable" => Some(Self::Unavailable),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::InUse => "in_use",
            Self::Maintenance => "maintenance",
            Self::Unavailable => "unavailable",
        }
    }

    /// 可空列归一：`None` 保持 `None`，未知值回落 `DEFAULT`
    pub fn normalize_optional(raw: Option<&str>) -> Option<&'static str> {
        raw.map(|v| Self::from_db_str(v).unwrap_or(Self::DEFAULT).as_db_str())
    }

    /// 响应兜底（非空语义）：未知历史值回落 `DEFAULT`
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

impl std::fmt::Display for VehicleStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

/// 用车申请状态：`erp.vehicle_requests.status`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VehicleRequestStatus {
    /// 待审批
    Pending,
    /// 已批准（占用时段，参与冲突检测）
    Approved,
    /// 已拒绝
    Rejected,
    /// 已完成
    Completed,
}

impl VehicleRequestStatus {
    pub const DB_VALUES: [&'static str; 4] = ["pending", "approved", "rejected", "completed"];

    /// 新建用车申请的默认状态（与创建写入口一致；该列无 DB 默认）
    pub const DEFAULT: Self = Self::Pending;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "completed" | "complete" | "done" => Some(Self::Completed),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Completed => "completed",
        }
    }

    /// 可空列归一：`None` 保持 `None`，未知值回落 `DEFAULT`
    pub fn normalize_optional(raw: Option<&str>) -> Option<&'static str> {
        raw.map(|v| Self::from_db_str(v).unwrap_or(Self::DEFAULT).as_db_str())
    }

    /// 响应兜底（非空语义）：未知历史值回落 `DEFAULT`
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

impl std::fmt::Display for VehicleRequestStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn vehicle_status_roundtrips_and_rejects_unknown() {
        for s in VehicleStatus::DB_VALUES {
            assert_eq!(
                VehicleStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(VehicleStatus::from_db_str("bogus"), None);
        assert_eq!(VehicleStatus::from_db_str("active"), None);
        assert_eq!(VehicleStatus::DEFAULT.as_db_str(), "available");
        assert_eq!(
            VehicleStatus::from_db_str("IN_USE").map(|v| v.as_db_str()),
            Some("in_use")
        );
    }

    #[test]
    fn vehicle_status_normalize_optional() {
        assert_eq!(VehicleStatus::normalize_optional(None), None);
        assert_eq!(
            VehicleStatus::normalize_optional(Some("maintenance")),
            Some("maintenance")
        );
        assert_eq!(
            VehicleStatus::normalize_optional(Some("weird")),
            Some("available")
        );
    }

    #[test]
    fn vehicle_status_parse_filter() {
        assert_eq!(VehicleStatus::parse_filter(None), Ok(None));
        assert_eq!(VehicleStatus::parse_filter(Some(" ")), Ok(None));
        assert_eq!(VehicleStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            VehicleStatus::parse_filter(Some("unavailable")),
            Ok(Some(VehicleStatus::Unavailable))
        );
        assert_eq!(
            VehicleStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }

    #[test]
    fn vehicle_request_status_roundtrips_and_rejects_unknown() {
        for s in VehicleRequestStatus::DB_VALUES {
            assert_eq!(
                VehicleRequestStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(VehicleRequestStatus::from_db_str("bogus"), None);
        assert_eq!(VehicleRequestStatus::from_db_str("cancelled"), None);
        assert_eq!(VehicleRequestStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            VehicleRequestStatus::from_db_str("done").map(|v| v.as_db_str()),
            Some("completed")
        );
    }

    #[test]
    fn vehicle_request_status_normalize_optional() {
        assert_eq!(VehicleRequestStatus::normalize_optional(None), None);
        assert_eq!(
            VehicleRequestStatus::normalize_optional(Some("approved")),
            Some("approved")
        );
        assert_eq!(
            VehicleRequestStatus::normalize_optional(Some("weird")),
            Some("pending")
        );
    }

    #[test]
    fn vehicle_request_status_parse_filter() {
        assert_eq!(VehicleRequestStatus::parse_filter(None), Ok(None));
        assert_eq!(VehicleRequestStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(
            VehicleRequestStatus::parse_filter(Some("completed")),
            Ok(Some(VehicleRequestStatus::Completed))
        );
        assert_eq!(
            VehicleRequestStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }
}
