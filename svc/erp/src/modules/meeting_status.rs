//! 会议室与会议预约状态：`erp.meeting_rooms.status` 与 `erp.meeting_bookings.status` 的唯一值源。
//!
//! 两列都是 varchar 可空；写入口此前全部是 SQL 字面量 + 原样透传：
//! - `erp.meeting_rooms`：DB 默认 `available`，创建也写 `'available'`；更新
//!   `req.status.unwrap_or(existing.status)` 可写任意串；创建预约时校验 `AND status = 'available'`；
//!   列表过滤 `params.status.clone()` 原样绑定。
//! - `erp.meeting_bookings`：DB 默认 `pending`（从未被写入口使用），创建写 `'confirmed'`；
//!   同一时段的冲突检测用 `AND status = 'confirmed'`；更新同样任意串透传；列表过滤原样绑定。
//!   本批把列默认统一到写入口实际使用的 `confirmed`（0 行数据，无回填风险）。
//!
//! 值集对齐前端 `apps/web/src/schemas/erp/meetingRoom.ts` 的下拉、筛选、`statusBadge.colorMap`
//! 与 `labelMap`（available / occupied / maintenance / unavailable）。预约侧前端暂无状态展示层，
//! `confirmed` 与 `cancelled` 由后端负责，色板键在 `apps/web/src/utils/status.ts` 全局表中登记。

use serde::{Deserialize, Serialize};

/// 会议室状态：`erp.meeting_rooms.status`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MeetingRoomStatus {
    /// 可用（可预约）
    Available,
    /// 占用中
    Occupied,
    /// 维护中
    Maintenance,
    /// 不可用
    Unavailable,
}

impl MeetingRoomStatus {
    pub const DB_VALUES: [&'static str; 4] =
        ["available", "occupied", "maintenance", "unavailable"];

    /// 新建会议室的默认状态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Available;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "available" => Some(Self::Available),
            "occupied" => Some(Self::Occupied),
            "maintenance" => Some(Self::Maintenance),
            "unavailable" => Some(Self::Unavailable),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Occupied => "occupied",
            Self::Maintenance => "maintenance",
            Self::Unavailable => "unavailable",
        }
    }

    /// 响应兜底：未知历史值回落 `DEFAULT`
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

impl std::fmt::Display for MeetingRoomStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

/// 会议预约状态：`erp.meeting_bookings.status`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MeetingBookingStatus {
    /// 已确认（创建即确认，占用时段参与冲突检测）
    Confirmed,
    /// 已取消（当前无取消入口，值保留以约束后续实现）
    Cancelled,
}

impl MeetingBookingStatus {
    pub const DB_VALUES: [&'static str; 2] = ["confirmed", "cancelled"];

    /// 新建会议预约的默认状态（与改后的 DB 默认一致）
    pub const DEFAULT: Self = Self::Confirmed;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "confirmed" => Some(Self::Confirmed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Confirmed => "confirmed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 响应兜底：未知历史值回落 `DEFAULT`
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

impl std::fmt::Display for MeetingBookingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn meeting_room_status_roundtrips() {
        for s in MeetingRoomStatus::DB_VALUES {
            assert_eq!(
                MeetingRoomStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(MeetingRoomStatus::DEFAULT.as_db_str(), "available");
        assert_eq!(MeetingRoomStatus::from_db_str("bogus"), None);
        assert_eq!(MeetingRoomStatus::normalize("weird"), "available");
        assert_eq!(
            MeetingRoomStatus::parse_filter(Some("occupied")),
            Ok(Some(MeetingRoomStatus::Occupied))
        );
        assert_eq!(MeetingRoomStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            MeetingRoomStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }

    #[test]
    fn meeting_booking_status_roundtrips() {
        for s in MeetingBookingStatus::DB_VALUES {
            assert_eq!(
                MeetingBookingStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(MeetingBookingStatus::DEFAULT.as_db_str(), "confirmed");
        assert_eq!(MeetingBookingStatus::from_db_str("pending"), None);
        assert_eq!(
            MeetingBookingStatus::from_db_str("canceled").map(|v| v.as_db_str()),
            Some("cancelled")
        );
        assert_eq!(MeetingBookingStatus::normalize("pending"), "confirmed");
        assert_eq!(
            MeetingBookingStatus::parse_filter(Some("cancelled")),
            Ok(Some(MeetingBookingStatus::Cancelled))
        );
        assert_eq!(
            MeetingBookingStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }
}
