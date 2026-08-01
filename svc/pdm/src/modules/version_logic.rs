//! 语义化版本（Semantic Versioning）纯函数模块
//! 参考：https://semver.org/lang/zh-CN/

use std::cmp::Ordering;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SemVer {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub pre_release: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BumpLevel {
    Major,
    Minor,
    Patch,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VersionError {
    InvalidFormat(String),
    InvalidPreRelease(String),
    NonNumericComponent(String),
}

impl std::fmt::Display for VersionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VersionError::InvalidFormat(v) => write!(
                f,
                "invalid version format: '{}', expected 'major.minor.patch'",
                v
            ),
            VersionError::InvalidPreRelease(v) => write!(f, "invalid pre-release: '{}'", v),
            VersionError::NonNumericComponent(v) => {
                write!(f, "non-numeric version component: '{}'", v)
            }
        }
    }
}

impl std::error::Error for VersionError {}

/// 解析版本号字符串为 SemVer
/// 支持："1.2.3" / "v1.2.3" / "1.2.3-alpha.1" / "1.2.3+build.123"
pub fn parse_semver(version_no: &str) -> Result<SemVer, VersionError> {
    let trimmed = version_no
        .trim()
        .trim_start_matches('v')
        .trim_start_matches('V');

    // 分离 build metadata
    let (version_core, _build) = match trimmed.split_once('+') {
        Some((v, b)) => (v, Some(b)),
        None => (trimmed, None),
    };

    // 分离 pre-release
    let (main, pre_release) = match version_core.split_once('-') {
        Some((m, p)) => (m, Some(p.to_string())),
        None => (version_core, None),
    };

    let parts: Vec<&str> = main.split('.').collect();
    if parts.len() != 3 {
        return Err(VersionError::InvalidFormat(version_no.to_string()));
    }

    let major = parts[0]
        .parse::<u32>()
        .map_err(|_| VersionError::NonNumericComponent(parts[0].to_string()))?;
    let minor = parts[1]
        .parse::<u32>()
        .map_err(|_| VersionError::NonNumericComponent(parts[1].to_string()))?;
    let patch = parts[2]
        .parse::<u32>()
        .map_err(|_| VersionError::NonNumericComponent(parts[2].to_string()))?;

    Ok(SemVer {
        major,
        minor,
        patch,
        pre_release,
    })
}

/// SemVer 转字符串
impl std::fmt::Display for SemVer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}.{}.{}", self.major, self.minor, self.patch)?;
        if let Some(ref pre) = self.pre_release {
            write!(f, "-{}", pre)?;
        }
        Ok(())
    }
}

/// 递增版本号
/// - Patch: 1.2.3 → 1.2.4，若有 pre-release 则去掉（1.2.3-alpha → 1.2.3）
/// - Minor: 1.2.3 → 1.3.0（重置 patch）
/// - Major: 1.2.3 → 2.0.0（重置 minor 和 patch）
pub fn bump_version(version_no: &str, level: BumpLevel) -> Result<String, VersionError> {
    let mut v = parse_semver(version_no)?;
    match level {
        BumpLevel::Patch => {
            if v.pre_release.is_some() {
                // 预发布版本 bump patch = 去掉 pre-release
                v.pre_release = None;
            } else {
                v.patch = v.patch.saturating_add(1);
            }
        }
        BumpLevel::Minor => {
            v.minor = v.minor.saturating_add(1);
            v.patch = 0;
            v.pre_release = None;
        }
        BumpLevel::Major => {
            v.major = v.major.saturating_add(1);
            v.minor = 0;
            v.patch = 0;
            v.pre_release = None;
        }
    }
    Ok(v.to_string())
}

/// 比较两个版本号
/// 预发布版本 < 正式版本（如 1.0.0-alpha < 1.0.0）
pub fn compare_semver(v1: &str, v2: &str) -> Result<Ordering, VersionError> {
    let s1 = parse_semver(v1)?;
    let s2 = parse_semver(v2)?;

    // 比较 major.minor.patch
    let ord = s1
        .major
        .cmp(&s2.major)
        .then(s1.minor.cmp(&s2.minor))
        .then(s1.patch.cmp(&s2.patch));

    if ord != Ordering::Equal {
        return Ok(ord);
    }

    // 相同 major.minor.patch 时，比较 pre-release
    match (&s1.pre_release, &s2.pre_release) {
        (None, None) => Ok(Ordering::Equal),
        (None, Some(_)) => Ok(Ordering::Greater), // 正式 > 预发布
        (Some(_), None) => Ok(Ordering::Less),
        (Some(p1), Some(p2)) => Ok(compare_pre_release(p1, p2)),
    }
}

/// 比较预发布标识符
fn compare_pre_release(p1: &str, p2: &str) -> Ordering {
    let ids1: Vec<&str> = p1.split('.').collect();
    let ids2: Vec<&str> = p2.split('.').collect();

    for i in 0..ids1.len().min(ids2.len()) {
        let ord = compare_pre_release_identifier(ids1[i], ids2[i]);
        if ord != Ordering::Equal {
            return ord;
        }
    }

    ids1.len().cmp(&ids2.len())
}

fn compare_pre_release_identifier(a: &str, b: &str) -> Ordering {
    // 数字 < 字母
    let a_num = a.parse::<u64>().ok();
    let b_num = b.parse::<u64>().ok();

    match (a_num, b_num) {
        (Some(an), Some(bn)) => an.cmp(&bn),
        (Some(_), None) => Ordering::Less, // 数字 < 字母
        (None, Some(_)) => Ordering::Greater,
        (None, None) => a.cmp(b),
    }
}

/// 给定已有版本列表，计算下一个版本
/// 从 existing 中找到最大版本作为 base，按 level 递增
/// 若 existing 为空且 base 为 None，返回 "0.0.1"（patch）/"0.1.0"（minor）/"1.0.0"（major）
pub fn next_version(
    existing: &[String],
    base: Option<&str>,
    level: BumpLevel,
) -> Result<String, VersionError> {
    let base_version = if let Some(b) = base {
        b.to_string()
    } else if existing.is_empty() {
        // 空列表默认起点
        return Ok(match level {
            BumpLevel::Patch => "0.0.1".to_string(),
            BumpLevel::Minor => "0.1.0".to_string(),
            BumpLevel::Major => "1.0.0".to_string(),
        });
    } else {
        // 找最大版本
        let mut max_version: Option<String> = None;
        for v in existing {
            match &max_version {
                None => max_version = Some(v.clone()),
                Some(current_max) => {
                    if let Ok(ord) = compare_semver(v, current_max) {
                        if ord == Ordering::Greater {
                            max_version = Some(v.clone());
                        }
                    }
                }
            }
        }
        max_version.ok_or_else(|| VersionError::InvalidFormat("no valid versions".to_string()))?
    };

    bump_version(&base_version, level)
}

/// 校验版本号唯一性
pub fn check_uniqueness(existing: &[String], candidate: &str) -> bool {
    !existing.iter().any(|v| {
        // 严格比较（考虑 build metadata 不参与比较）
        match (parse_semver(v), parse_semver(candidate)) {
            (Ok(a), Ok(b)) => {
                a.major == b.major
                    && a.minor == b.minor
                    && a.patch == b.patch
                    && a.pre_release == b.pre_release
            }
            _ => v == candidate,
        }
    })
}

/// 校验版本号格式合法性
pub fn validate_version_format(version_no: &str) -> Result<(), VersionError> {
    parse_semver(version_no).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== 解析 ==========

    #[test]
    fn test_parse_semver_basic() {
        let v = parse_semver("1.2.3").unwrap();
        assert_eq!(
            v,
            SemVer {
                major: 1,
                minor: 2,
                patch: 3,
                pre_release: None
            }
        );
    }

    #[test]
    fn test_parse_semver_with_v_prefix() {
        let v = parse_semver("v1.0.0").unwrap();
        assert_eq!(v.major, 1);
        let v2 = parse_semver("V2.0.0").unwrap();
        assert_eq!(v2.major, 2);
    }

    #[test]
    fn test_parse_semver_with_pre_release() {
        let v = parse_semver("1.2.3-alpha.1").unwrap();
        assert_eq!(v.pre_release, Some("alpha.1".to_string()));
    }

    #[test]
    fn test_parse_semver_with_build_metadata() {
        let v = parse_semver("1.2.3+build.123").unwrap();
        assert_eq!(v.major, 1);
        assert_eq!(v.minor, 2);
        assert_eq!(v.patch, 3);
        assert_eq!(v.pre_release, None);
    }

    #[test]
    fn test_parse_semver_invalid_two_parts() {
        assert!(parse_semver("1.2").is_err());
    }

    #[test]
    fn test_parse_semver_invalid_four_parts() {
        assert!(parse_semver("1.2.3.4").is_err());
    }

    #[test]
    fn test_parse_semver_invalid_non_numeric() {
        assert!(parse_semver("a.b.c").is_err());
        assert!(parse_semver("1.2.x").is_err());
    }

    #[test]
    fn test_parse_semver_empty() {
        assert!(parse_semver("").is_err());
    }

    #[test]
    fn test_parse_semver_with_whitespace() {
        let v = parse_semver("  1.2.3  ").unwrap();
        assert_eq!(v.major, 1);
    }

    // ========== 递增 ==========

    #[test]
    fn test_bump_patch() {
        assert_eq!(bump_version("1.2.3", BumpLevel::Patch).unwrap(), "1.2.4");
    }

    #[test]
    fn test_bump_patch_removes_pre_release() {
        assert_eq!(
            bump_version("1.2.3-alpha", BumpLevel::Patch).unwrap(),
            "1.2.3"
        );
    }

    #[test]
    fn test_bump_minor_resets_patch() {
        assert_eq!(bump_version("1.2.3", BumpLevel::Minor).unwrap(), "1.3.0");
    }

    #[test]
    fn test_bump_minor_removes_pre_release() {
        assert_eq!(
            bump_version("1.2.3-beta.1", BumpLevel::Minor).unwrap(),
            "1.3.0"
        );
    }

    #[test]
    fn test_bump_major_resets_lower() {
        assert_eq!(bump_version("1.9.9", BumpLevel::Major).unwrap(), "2.0.0");
    }

    #[test]
    fn test_bump_major_from_pre_release() {
        assert_eq!(
            bump_version("1.0.0-rc.1", BumpLevel::Major).unwrap(),
            "2.0.0"
        );
    }

    // ========== 比较 ==========

    #[test]
    fn test_compare_less() {
        assert_eq!(compare_semver("1.0.0", "2.0.0").unwrap(), Ordering::Less);
    }

    #[test]
    fn test_compare_equal() {
        assert_eq!(compare_semver("1.0.0", "1.0.0").unwrap(), Ordering::Equal);
    }

    #[test]
    fn test_compare_greater() {
        assert_eq!(
            compare_semver("1.10.0", "1.9.99").unwrap(),
            Ordering::Greater
        );
    }

    #[test]
    fn test_compare_minor_difference() {
        assert_eq!(compare_semver("1.2.0", "1.3.0").unwrap(), Ordering::Less);
    }

    #[test]
    fn test_compare_patch_difference() {
        assert_eq!(compare_semver("1.0.1", "1.0.2").unwrap(), Ordering::Less);
    }

    #[test]
    fn test_compare_pre_release_less_than_release() {
        assert_eq!(
            compare_semver("1.0.0-alpha", "1.0.0").unwrap(),
            Ordering::Less
        );
    }

    #[test]
    fn test_compare_pre_release_alphabetical() {
        assert_eq!(
            compare_semver("1.0.0-alpha", "1.0.0-beta").unwrap(),
            Ordering::Less
        );
    }

    #[test]
    fn test_compare_pre_release_numeric_less_than_alpha() {
        // 数字标识符 < 字母标识符
        assert_eq!(
            compare_semver("1.0.0-1", "1.0.0-alpha").unwrap(),
            Ordering::Less
        );
    }

    #[test]
    fn test_compare_pre_release_more_identifiers() {
        // 1.0.0-alpha < 1.0.0-alpha.1
        assert_eq!(
            compare_semver("1.0.0-alpha", "1.0.0-alpha.1").unwrap(),
            Ordering::Less
        );
    }

    // ========== next_version ==========

    #[test]
    fn test_next_version_empty_list_patch() {
        assert_eq!(next_version(&[], None, BumpLevel::Patch).unwrap(), "0.0.1");
    }

    #[test]
    fn test_next_version_empty_list_minor() {
        assert_eq!(next_version(&[], None, BumpLevel::Minor).unwrap(), "0.1.0");
    }

    #[test]
    fn test_next_version_empty_list_major() {
        assert_eq!(next_version(&[], None, BumpLevel::Major).unwrap(), "1.0.0");
    }

    #[test]
    fn test_next_version_picks_max_base() {
        let existing = vec![
            "1.0.0".to_string(),
            "1.0.5".to_string(),
            "1.0.3".to_string(),
        ];
        assert_eq!(
            next_version(&existing, None, BumpLevel::Patch).unwrap(),
            "1.0.6"
        );
    }

    #[test]
    fn test_next_version_with_explicit_base() {
        let existing = vec!["2.0.0".to_string()];
        assert_eq!(
            next_version(&existing, Some("1.0.0"), BumpLevel::Minor).unwrap(),
            "1.1.0"
        );
    }

    #[test]
    fn test_next_version_unsorted_list() {
        let existing = vec![
            "1.0.5".to_string(),
            "1.0.0".to_string(),
            "1.0.3".to_string(),
        ];
        assert_eq!(
            next_version(&existing, None, BumpLevel::Patch).unwrap(),
            "1.0.6"
        );
    }

    #[test]
    fn test_next_version_major_bump() {
        let existing = vec!["1.9.9".to_string(), "1.9.0".to_string()];
        assert_eq!(
            next_version(&existing, None, BumpLevel::Major).unwrap(),
            "2.0.0"
        );
    }

    // ========== 唯一性校验 ==========

    #[test]
    fn test_check_uniqueness_duplicate() {
        let existing = vec!["1.0.0".to_string(), "1.0.1".to_string()];
        assert!(!check_uniqueness(&existing, "1.0.0"));
    }

    #[test]
    fn test_check_uniqueness_unique() {
        let existing = vec!["1.0.0".to_string(), "1.0.1".to_string()];
        assert!(check_uniqueness(&existing, "1.0.2"));
    }

    #[test]
    fn test_check_uniqueness_empty_list() {
        assert!(check_uniqueness(&[], "1.0.0"));
    }

    #[test]
    fn test_check_uniqueness_pre_release_distinct() {
        let existing = vec!["1.0.0".to_string()];
        // 1.0.0-alpha 与 1.0.0 是不同版本
        assert!(check_uniqueness(&existing, "1.0.0-alpha"));
    }

    #[test]
    fn test_validate_version_format_valid() {
        assert!(validate_version_format("1.2.3").is_ok());
        assert!(validate_version_format("v1.2.3").is_ok());
        assert!(validate_version_format("1.2.3-alpha").is_ok());
    }

    #[test]
    fn test_validate_version_format_invalid() {
        assert!(validate_version_format("1.2").is_err());
        assert!(validate_version_format("abc").is_err());
    }
}
