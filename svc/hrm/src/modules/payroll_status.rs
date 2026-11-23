//! HRM 薪资状态：`hrm.payroll_runs.status` / `hrm.payroll_items.status` 的唯一值源。
//!
//! 列定义：两列均 varchar(20) NOT NULL，默认分别为 `draft`（run）与 `pending`（item）。
//!
//! 此前写入路径（全部是 SQL 文本里的字面量或自由串）：
//! - 创建 run `VALUES (..., 'draft', ...)`；
//! - 计算 `UPDATE ... SET status='calculated' WHERE status='draft'`；
//! - 发放明细 `INSERT ... 'pending'`、`UPDATE payroll_items SET status='paid' WHERE status='pending'`；
//! - 发放 run `SET status='paid' WHERE status='calculated'`；
//! - 删除守卫 `WHERE status='draft'`；
//! - 工资单查询 `if payroll_run.status != "paid"`；
//! - 三个列表过滤 `params.status` 原样绑定（非法值静默查空、空串当真实值）。
//!
//! 值集只收有代码证据的：run = draft / calculated / paid；item = pending / paid。
//! 没有 `cancelled`/`approved` 之类写入方，不预置。

/// 薪资周期（run）状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayrollRunStatus {
    /// 草稿（DB 默认，可计算、可删除）
    Draft,
    /// 已计算（明细已生成，待发放）
    Calculated,
    /// 已发放
    Paid,
}

impl PayrollRunStatus {
    /// 该列允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["draft", "calculated", "paid"];

    /// 新建/默认状态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Draft;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "calculated" => Some(Self::Calculated),
            "paid" => Some(Self::Paid),
            _ => None,
        }
    }

    /// 写入该列的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Calculated => "calculated",
            Self::Paid => "paid",
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

impl std::fmt::Display for PayrollRunStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

/// 薪资明细（item）状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PayrollItemStatus {
    /// 待发放（计算时写入，DB 默认）
    Pending,
    /// 已发放
    Paid,
}

impl PayrollItemStatus {
    /// 该列允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["pending", "paid"];

    /// 默认状态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "paid" => Some(Self::Paid),
            _ => None,
        }
    }

    /// 写入该列的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Paid => "paid",
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

impl std::fmt::Display for PayrollItemStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn run_status_roundtrip_is_total() {
        for v in PayrollRunStatus::DB_VALUES {
            let parsed = PayrollRunStatus::from_db_str(v).expect("值集内必须可解析");
            assert_eq!(parsed.as_db_str(), *v);
        }
        assert_eq!(PayrollRunStatus::from_db_str("bogus"), None);
        assert_eq!(PayrollRunStatus::normalize("bogus"), "draft");
    }

    #[test]
    fn item_status_roundtrip_is_total() {
        for v in PayrollItemStatus::DB_VALUES {
            let parsed = PayrollItemStatus::from_db_str(v).expect("值集内必须可解析");
            assert_eq!(parsed.as_db_str(), *v);
        }
        assert_eq!(PayrollItemStatus::from_db_str("calculated"), None);
        assert_eq!(PayrollItemStatus::normalize("bogus"), "pending");
    }

    #[test]
    fn parse_filter_rejects_unknown() {
        assert_eq!(PayrollRunStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            PayrollRunStatus::parse_filter(Some("bogus")),
            Err("unknown_status")
        );
        assert_eq!(
            PayrollItemStatus::parse_filter(Some("paid")),
            Ok(Some(PayrollItemStatus::Paid))
        );
        assert_eq!(
            PayrollItemStatus::parse_filter(Some("draft")),
            Err("unknown_status")
        );
    }
}
