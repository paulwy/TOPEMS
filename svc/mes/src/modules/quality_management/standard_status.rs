//! 质量标准状态白名单（active/inactive/archived）。
//!
//! DB 侧 `status` 为可空 text + CHECK；接口层必须先归一并在写 SQL 前拒绝非法值，
//! 否则非法 status 会落到 PostgreSQL 23514，最终以 500 暴露。

pub const QUALITY_STANDARD_STATUSES: [&str; 3] = ["active", "inactive", "archived"];

pub fn normalize_quality_standard_status(raw: &str) -> Option<&'static str> {
    let value = raw.trim().to_ascii_lowercase();
    QUALITY_STANDARD_STATUSES
        .iter()
        .copied()
        .find(|candidate| candidate == &value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_is_strict() {
        assert_eq!(
            normalize_quality_standard_status(" Active "),
            Some("active")
        );
        assert_eq!(
            normalize_quality_standard_status("INACTIVE"),
            Some("inactive")
        );
        assert_eq!(
            normalize_quality_standard_status("archived"),
            Some("archived")
        );
        assert_eq!(normalize_quality_standard_status("pending"), None);
        assert_eq!(normalize_quality_standard_status(""), None);
    }
}
