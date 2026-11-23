//! HRM 招聘三态列的唯一值源：`hrm.job_openings.status`、`hrm.candidates.status`、
//! `hrm.interviews.status`。
//!
//! 三列都是 NOT NULL varchar(20)，DB 默认分别为 draft / new / scheduled。
//! 此前写入路径的特征：
//! - 职位：`INSERT ... 'draft'`、发布 `SET status='published' WHERE status='draft'`、
//!   关闭 `SET status='closed' WHERE status='published'`、删除守卫 `status='draft'`，
//!   全是散落字面量；
//! - 候选人：`INSERT ... 'new'`，但 `update_candidate` 用 `status = COALESCE($8, status)`
//!   把 `req.status` 自由串直接落库；
//! - 面试：`INSERT ... 'scheduled'`、完成 `SET status='completed' WHERE status='scheduled'`，
//!   `update_interview` 同样 `COALESCE($6, status)` 透传自由串；
//! - 三个列表的 `status` 过滤都是 `params.status` 原样绑定（非法值静默查空、空串当真实值）。
//!
//! 值集依据：
//! - 职位：与前端 `apps/web/src/schemas/hrm/recruitment.ts` 的下拉/筛选/色板完全一致
//!   （draft / published / in_progress / closed / filled）。
//! - 候选人、面试：前端没有对应 schema，取招聘漏斗的标准态；本批只做 `NOT VALID` 护栏，
//!   若产品口径不同可收窄词表并同步候选约束。

/// 招聘职位状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JobOpeningStatus {
    Draft,
    Published,
    InProgress,
    Closed,
    Filled,
}

/// 候选人状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CandidateStatus {
    New,
    Screening,
    Interviewing,
    Offered,
    Hired,
    Rejected,
    Withdrawn,
}

/// 面试状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InterviewStatus {
    Scheduled,
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
    JobOpeningStatus,
    JobOpeningStatus::Draft,
    [
        Draft => "draft",
        Published => "published",
        InProgress => "in_progress",
        Closed => "closed",
        Filled => "filled",
    ]
);

impl_status!(
    CandidateStatus,
    CandidateStatus::New,
    [
        New => "new",
        Screening => "screening",
        Interviewing => "interviewing",
        Offered => "offered",
        Hired => "hired",
        Rejected => "rejected",
        Withdrawn => "withdrawn",
    ]
);

impl_status!(
    InterviewStatus,
    InterviewStatus::Scheduled,
    [
        Scheduled => "scheduled",
        InProgress => "in_progress",
        Completed => "completed",
        Cancelled => "cancelled",
    ]
);

/// 请求里的可选状态：`None` / 空串 => 不改变；未知 => `Err`（调用方转 400）
pub fn parse_optional<T>(
    parse: fn(&str) -> Option<T>,
    to_db: fn(&T) -> &'static str,
    raw: Option<&str>,
) -> Result<Option<&'static str>, &'static str> {
    match raw.map(str::trim) {
        None => Ok(None),
        Some("") => Ok(None),
        Some(v) => parse(v).map(|s| Some(to_db(&s))).ok_or("unknown_status"),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn job_opening_roundtrip() {
        for s in JobOpeningStatus::DB_VALUES {
            assert_eq!(
                JobOpeningStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(*s)
            );
        }
        assert_eq!(JobOpeningStatus::DB_VALUES.len(), 5);
        assert_eq!(JobOpeningStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(JobOpeningStatus::from_db_str("PAUSED"), None);
        assert_eq!(JobOpeningStatus::normalize("weird"), "draft");
    }

    #[test]
    fn candidate_roundtrip() {
        assert_eq!(CandidateStatus::DEFAULT.as_db_str(), "new");
        assert_eq!(CandidateStatus::DB_VALUES.len(), 7);
        assert_eq!(
            CandidateStatus::from_db_str("Interviewing").map(|v| v.as_db_str()),
            Some("interviewing")
        );
        assert_eq!(CandidateStatus::from_db_str("archived"), None);
    }

    #[test]
    fn interview_roundtrip() {
        assert_eq!(InterviewStatus::DEFAULT.as_db_str(), "scheduled");
        assert_eq!(InterviewStatus::DB_VALUES.len(), 4);
        assert_eq!(InterviewStatus::normalize("bogus"), "scheduled");
    }

    #[test]
    fn filters() {
        assert_eq!(JobOpeningStatus::parse_filter(None), Ok(None));
        assert_eq!(JobOpeningStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(JobOpeningStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            JobOpeningStatus::parse_filter(Some("filled")),
            Ok(Some(JobOpeningStatus::Filled))
        );
        assert_eq!(
            JobOpeningStatus::parse_filter(Some("x")),
            Err("unknown_status")
        );
        assert_eq!(
            CandidateStatus::parse_filter(Some("hired")),
            Ok(Some(CandidateStatus::Hired))
        );
        assert_eq!(
            InterviewStatus::parse_filter(Some("completed")),
            Ok(Some(InterviewStatus::Completed))
        );
    }

    #[test]
    fn optional_status_helper() {
        assert_eq!(
            parse_optional(
                InterviewStatus::from_db_str,
                InterviewStatus::as_db_str,
                None
            ),
            Ok(None)
        );
        assert_eq!(
            parse_optional(
                InterviewStatus::from_db_str,
                InterviewStatus::as_db_str,
                Some(" ")
            ),
            Ok(None)
        );
        assert_eq!(
            parse_optional(
                InterviewStatus::from_db_str,
                InterviewStatus::as_db_str,
                Some("completed")
            ),
            Ok(Some("completed"))
        );
        assert_eq!(
            parse_optional(
                InterviewStatus::from_db_str,
                InterviewStatus::as_db_str,
                Some("nope")
            ),
            Err("unknown_status")
        );
    }
}
