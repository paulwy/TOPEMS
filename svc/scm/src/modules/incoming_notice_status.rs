//! 到货通知单状态唯一集合。
//!
//! 落库列：`scm.incoming_notices.status`（text，NOT NULL，DB 默认 `pending`）。
//! 创建写 `pending`（待收货），收货后流转为 `arrived`（已到货）。
//! 值集与前端 `apps/web/src/schemas/scm/incomingNotice.ts` 的下拉、筛选一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IncomingNoticeStatus {
    Pending,
    Arrived,
}

impl IncomingNoticeStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 2] = ["pending", "arrived"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Arrived => "arrived",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "arrived" => Some(Self::Arrived),
            _ => None,
        }
    }

    /// 响应兜底：列 NOT NULL，未知值回落 `DEFAULT`。
    #[must_use]
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(IncomingNoticeStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(IncomingNoticeStatus::DB_VALUES, ["pending", "arrived"]);
    }

    #[test]
    fn every_value_roundtrips() {
        for value in IncomingNoticeStatus::DB_VALUES {
            assert_eq!(
                IncomingNoticeStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(IncomingNoticeStatus::from_db_str("bogus"), None);
        assert_eq!(IncomingNoticeStatus::normalize(""), "pending");
        assert_eq!(IncomingNoticeStatus::normalize("BOGUS"), "pending");
        assert_eq!(IncomingNoticeStatus::normalize("Arrived"), "arrived");
    }
}
