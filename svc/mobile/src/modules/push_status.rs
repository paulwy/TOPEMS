//! 移动端推送通知状态唯一集合。
//!
//! 落库列：`mobile.push_notifications.status`（varchar，DB 默认 `pending`）。
//! 创建写 pending；发送统计更新写 sent；failed 预留给发送失败。
//! 历史 191 行 `active` 是旧创建逻辑误写：读取侧统一投影为 pending，
//! 但 DB 值不在枚举内，需在窗口内归一后再 VALIDATE 候选 CHECK。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PushNotificationStatus {
    Pending,
    Sent,
    Failed,
}

impl PushNotificationStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: &'static [&'static str] = &["pending", "sent", "failed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Sent => "sent",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "sent" => Some(Self::Sent),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }

    /// 发送结果回写只允许从 pending 进入 sent，避免重复计数。
    #[must_use]
    pub fn send_from() -> &'static [Self] {
        &[Self::Pending]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in PushNotificationStatus::DB_VALUES {
            let parsed = PushNotificationStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(PushNotificationStatus::from_db_str("active"), None);
        assert_eq!(PushNotificationStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn send_only_from_pending() {
        assert_eq!(PushNotificationStatus::send_from().len(), 1);
        assert!(PushNotificationStatus::send_from().contains(&PushNotificationStatus::Pending));
    }
}
