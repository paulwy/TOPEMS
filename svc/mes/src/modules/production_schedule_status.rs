//! 排产状态：`mes.production_schedules.status` 的唯一值源。
//!
//! 生命周期：pending（手工新建）→ released → running → completed；
//! APS 生成的排程写 `scheduled`（本地 9678 行），只允许发布或取消；
//! 未完结前均可 cancelled。历史上 `in_progress` 只出现在删除/调整谓词里，
//! 没有写入方也没有存量，统一收敛为 `running`。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProductionScheduleStatus {
    /// 手工新建待发布
    Pending,
    /// APS 排程结果待发布
    Scheduled,
    /// 已发布待开工
    Released,
    /// 执行中
    Running,
    /// 已完成
    Completed,
    /// 已取消
    Cancelled,
}

impl ProductionScheduleStatus {
    /// `mes.production_schedules.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 6] = [
        "pending",
        "scheduled",
        "released",
        "running",
        "completed",
        "cancelled",
    ];

    /// 手工新建的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// APS 排程结果的初始态
    pub const APS_DEFAULT: Self = Self::Scheduled;

    /// 删除（软删）允许的状态
    pub fn delete_from() -> &'static [&'static str] {
        &["pending", "scheduled", "cancelled"]
    }

    /// 调整工位/时间允许的状态：未完结都允许改排
    pub fn adjustable_from() -> &'static [&'static str] {
        &["pending", "scheduled", "released", "running"]
    }

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "scheduled" => Some(Self::Scheduled),
            "released" => Some(Self::Released),
            "running" => Some(Self::Running),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `mes.production_schedules.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Scheduled => "scheduled",
            Self::Released => "released",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    /// 状态机合法性（与 `shared::aps_fsm::SCHEDULE` 对齐，额外允许 scheduled 起点）
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Pending, Self::Released | Self::Cancelled)
                | (Self::Scheduled, Self::Released | Self::Cancelled)
                | (
                    Self::Released,
                    Self::Running | Self::Pending | Self::Cancelled
                )
                | (Self::Running, Self::Completed | Self::Cancelled)
        )
    }
}

impl std::fmt::Display for ProductionScheduleStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn production_schedule_status_db_strings_roundtrip() {
        for s in ProductionScheduleStatus::DB_VALUES {
            assert_eq!(
                ProductionScheduleStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(ProductionScheduleStatus::from_db_str("in_progress"), None);
        assert_eq!(ProductionScheduleStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            ProductionScheduleStatus::APS_DEFAULT.as_db_str(),
            "scheduled"
        );
        assert!(ProductionScheduleStatus::Scheduled
            .can_transition_to(ProductionScheduleStatus::Released));
        assert!(!ProductionScheduleStatus::Completed
            .can_transition_to(ProductionScheduleStatus::Running));
        assert!(ProductionScheduleStatus::Running
            .can_transition_to(ProductionScheduleStatus::Cancelled));
    }
}
