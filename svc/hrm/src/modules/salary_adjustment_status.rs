//! HRM 薪资调整状态：`hrm.salary_adjustments.status` 的唯一值源。
//!
//! 列定义：varchar(20) NOT NULL DEFAULT 'pending'。
//! 同表还有 `approval_status`（同为 NOT NULL DEFAULT 'pending'），当前**没有任何代码读写**，
//! 属历史冗余列；本批用同一词表一并加护栏，避免被外部脚本写入脏值。
//!
//! 此前写入路径：
//! - 创建 `INSERT ... 'pending'`；
//! - `update_salary_adjustment` 用 `status = COALESCE($7, status)`，`req.status` 自由串透传；
//! - 批准 `SET status='approved'`、拒绝 `SET status='rejected'`（字面量）；
//! - 列表过滤 `params.status` 原样绑定（非法值静默查空、空串当真实值）。
//!
//! 值集：pending / approved / rejected，与前端
//! `apps/web/src/schemas/hrm/salaryAdjustment.ts` 的下拉、筛选、色板逐值一致。

/// 薪资调整状态（同时用于 `status` 与 `approval_status` 两列）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SalaryAdjustmentStatus {
    Pending,
    Approved,
    Rejected,
}

impl SalaryAdjustmentStatus {
    /// 该列允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["pending", "approved", "rejected"];

    /// 新建/默认状态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 写入该列的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
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

impl std::fmt::Display for SalaryAdjustmentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        for s in SalaryAdjustmentStatus::DB_VALUES {
            assert_eq!(
                SalaryAdjustmentStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(*s)
            );
        }
        assert_eq!(SalaryAdjustmentStatus::DB_VALUES.len(), 3);
        assert_eq!(SalaryAdjustmentStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(SalaryAdjustmentStatus::normalize("weird"), "pending");
        assert_eq!(
            SalaryAdjustmentStatus::from_db_str("APPROVED").map(|v| v.as_db_str()),
            Some("approved")
        );
        assert_eq!(SalaryAdjustmentStatus::from_db_str("archived"), None);
    }

    #[test]
    fn filters() {
        assert_eq!(SalaryAdjustmentStatus::parse_filter(None), Ok(None));
        assert_eq!(SalaryAdjustmentStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(SalaryAdjustmentStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            SalaryAdjustmentStatus::parse_filter(Some("rejected")),
            Ok(Some(SalaryAdjustmentStatus::Rejected))
        );
        assert_eq!(
            SalaryAdjustmentStatus::parse_filter(Some("bogus")),
            Err("unknown_status")
        );
    }
}
