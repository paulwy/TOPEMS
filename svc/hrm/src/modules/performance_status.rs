//! HRM 绩效两列的唯一值源：`hrm.performance_reviews.status`、`hrm.performance_goals.status`。
//!
//! 两列都是 varchar(20) NOT NULL，DB 默认分别 draft / pending。
//! 此前写入路径：
//! - 评核：创建 `'draft'`，提交 `SET status='submitted' WHERE status='draft'`，
//!   批准 `SET status='approved' WHERE status='submitted'`，删除守卫 `status='draft'`；
//!   `update_review` 用 `status = COALESCE($2, status)` 自由串透传；
//! - 目标：创建 `'pending'`，`update_goal` 用 `COALESCE($6, status)` 自由串透传；
//! - 两个列表的 `status` 过滤都是 `params.status` 原样绑定。
//!
//! 值集：
//! - 评核取**并集**：前端 `apps/web/src/schemas/hrm/performance.ts` 的
//!   pending / self_reviewed / manager_reviewed / completed / archived，
//!   加上后端 submit/approve 接口实际写入的 submitted / approved，以及创建态的 draft。
//!   两套词表当前各走一条链路（前端展示态 vs 后端审批流），本批只做值域护栏，
//!   统一口径留作后续专项（届时删变体 + 收窄候选约束即可）。
//! - 目标：pending / in_progress / completed / cancelled（创建态 pending，
//!   in_progress / completed 为既有单测口径）。

/// 绩效评核状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PerformanceReviewStatus {
    Draft,
    Pending,
    Submitted,
    Approved,
    SelfReviewed,
    ManagerReviewed,
    Completed,
    Archived,
}

/// 绩效目标状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PerformanceGoalStatus {
    Pending,
    InProgress,
    Completed,
    Cancelled,
}

macro_rules! impl_status {
    ($ty:ty, $default:expr, [$($variant:ident => $db:literal),+ $(,)?]) => {
        impl $ty {
            /// 该列允许的唯一集合
            pub const DB_VALUES: &'static [&'static str] = &[$($db),+];

            /// 新建时的默认状态（与 DB 默认一致）
            pub const DEFAULT: Self = $default;

            /// 严格解析数据库字符串；未知值返回 `None`
            pub fn from_db_str(s: &str) -> Option<Self> {
                match s.trim().to_ascii_lowercase().as_str() {
                    $($db => Some(Self::$variant),)+
                    _ => None,
                }
            }

            /// 写入该列的唯一字符串形式
            pub fn as_db_str(&self) -> &'static str {
                match self {
                    $(Self::$variant => $db,)+
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

        impl std::fmt::Display for $ty {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                f.write_str(self.as_db_str())
            }
        }
    };
}

impl_status!(
    PerformanceReviewStatus,
    PerformanceReviewStatus::Draft,
    [
        Draft => "draft",
        Pending => "pending",
        Submitted => "submitted",
        Approved => "approved",
        SelfReviewed => "self_reviewed",
        ManagerReviewed => "manager_reviewed",
        Completed => "completed",
        Archived => "archived",
    ]
);

impl_status!(
    PerformanceGoalStatus,
    PerformanceGoalStatus::Pending,
    [
        Pending => "pending",
        InProgress => "in_progress",
        Completed => "completed",
        Cancelled => "cancelled",
    ]
);

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn review_roundtrip() {
        for s in PerformanceReviewStatus::DB_VALUES {
            assert_eq!(
                PerformanceReviewStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(*s)
            );
        }
        assert_eq!(PerformanceReviewStatus::DB_VALUES.len(), 8);
        assert_eq!(PerformanceReviewStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(PerformanceReviewStatus::normalize("weird"), "draft");
        assert_eq!(
            PerformanceReviewStatus::from_db_str("SELF_REVIEWED").map(|v| v.as_db_str()),
            Some("self_reviewed")
        );
    }

    #[test]
    fn goal_roundtrip() {
        assert_eq!(PerformanceGoalStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(PerformanceGoalStatus::DB_VALUES.len(), 4);
        assert_eq!(PerformanceGoalStatus::normalize("archived"), "pending");
    }

    #[test]
    fn filters() {
        assert_eq!(PerformanceReviewStatus::parse_filter(None), Ok(None));
        assert_eq!(PerformanceReviewStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(PerformanceReviewStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            PerformanceReviewStatus::parse_filter(Some("approved")),
            Ok(Some(PerformanceReviewStatus::Approved))
        );
        assert_eq!(
            PerformanceReviewStatus::parse_filter(Some("bogus")),
            Err("unknown_status")
        );
        assert_eq!(
            PerformanceGoalStatus::parse_filter(Some("in_progress")),
            Ok(Some(PerformanceGoalStatus::InProgress))
        );
    }
}
