//! R&D 业务相关的纯函数工具集（不依赖数据库 / async runtime）。
//!
//! 涵盖：实验编号/状态/阶段校验、配方版本校验与比较、项目进度计算、
//! 专利编号格式化与校验、物料编号归一化、预算与收率计算等。

use chrono::NaiveDateTime;
use std::cmp::Ordering;

/// 校验实验编号：非空、≤64 字符、仅允许字母数字 / `-` / `_`。
pub fn validate_experiment_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 64 {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// 归一化实验编号：去首尾空白、转大写、移除内部所有空白字符。
pub fn normalize_experiment_code(code: &str) -> String {
    topems_shared_core::normalize_code(code)
}

/// 校验实验状态是否属于合法枚举值。
pub fn is_valid_experiment_status(status: &str) -> bool {
    matches!(
        status,
        "planned" | "in_progress" | "completed" | "on_hold" | "cancelled"
    )
}

/// 校验实验状态流转是否合法。
pub fn is_valid_experiment_status_transition(from: &str, to: &str) -> bool {
    let allowed: &[(&str, &str)] = &[
        ("planned", "in_progress"),
        ("planned", "cancelled"),
        ("in_progress", "on_hold"),
        ("in_progress", "completed"),
        ("in_progress", "cancelled"),
        ("on_hold", "in_progress"),
        ("on_hold", "cancelled"),
    ];
    allowed.contains(&(from, to))
}

/// 校验实验阶段是否属于合法枚举值。
pub fn is_valid_experiment_phase(phase: &str) -> bool {
    matches!(
        phase,
        "formulation" | "testing" | "analysis" | "scale_up" | "pilot"
    )
}

/// 校验配方版本号是否符合 `X.Y.Z` 语义化格式（每段为非负整数）。
pub fn validate_formula_version(version: &str) -> bool {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() != 3 {
        return false;
    }
    parts
        .iter()
        .all(|p| !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()) && p.len() <= 4)
}

/// 比较两个语义化版本号，返回排序结果。任一格式非法时返回 `None`。
pub fn compare_formula_versions(v1: &str, v2: &str) -> Option<Ordering> {
    if !validate_formula_version(v1) || !validate_formula_version(v2) {
        return None;
    }
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .map(|p| p.parse::<u32>().unwrap_or(0))
            .collect()
    };
    let a = parse(v1);
    let b = parse(v2);
    match (a[0].cmp(&b[0]), a[1].cmp(&b[1]), a[2].cmp(&b[2])) {
        (Ordering::Equal, Ordering::Equal, c) => Some(c),
        (Ordering::Equal, b, _) => Some(b),
        (a, _, _) => Some(a),
    }
}

/// 校验配方状态是否属于合法枚举值。
pub fn is_valid_formula_status(status: &str) -> bool {
    matches!(
        status,
        "draft" | "under_review" | "approved" | "active" | "deprecated"
    )
}

/// 归一化配方编号：去首尾空白、转大写、移除内部空白。
pub fn normalize_formula_code(code: &str) -> String {
    topems_shared_core::normalize_code(code)
}

/// 根据各阶段 `(progress, weight)` 计算项目加权进度（0-100）。
/// `progress` 超出 0-100 的会被截断；权重之和为 0 时返回 `None`。
pub fn calc_project_progress(phases: &[(i32, i32)]) -> Option<i32> {
    if phases.is_empty() {
        return None;
    }
    let total_weight: i64 = phases.iter().map(|(_, w)| *w as i64).sum();
    if total_weight <= 0 {
        return None;
    }
    let weighted: i64 = phases
        .iter()
        .map(|(p, w)| {
            let clamped = (*p).clamp(0, 100) as i64;
            clamped * (*w as i64)
        })
        .sum();
    Some((weighted / total_weight) as i32)
}

/// 计算完成百分比（0.0-1.0）。`total` 为 0 时返回 `None`。
pub fn calc_progress_percentage(completed: u32, total: u32) -> Option<f64> {
    if total == 0 {
        return None;
    }
    let rate = completed as f64 / total as f64;
    Some(rate.clamp(0.0, 1.0))
}

/// 校验专利编号格式：国家代码（2 位字母）+ 数字序列（≥4 位）+ 可选类型后缀（1 位字母）。
pub fn validate_patent_number(patent_no: &str) -> bool {
    let trimmed = patent_no.trim();
    if trimmed.len() < 6 || trimmed.len() > 32 {
        return false;
    }
    let bytes = trimmed.as_bytes();
    if !bytes[0].is_ascii_uppercase() || !bytes[1].is_ascii_uppercase() {
        return false;
    }
    let rest = &trimmed[2..];
    let (digits, kind) = match rest.chars().last() {
        Some(c) if c.is_ascii_alphabetic() => (&rest[..rest.len() - 1], Some(c)),
        _ => (rest, None),
    };
    if digits.len() < 4 || !digits.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    match kind {
        Some(c) => c.is_ascii_uppercase(),
        None => true,
    }
}

/// 格式化专利编号：国家代码大写 + 数字 + 可选类型后缀大写，去空白。
pub fn format_patent_number(country: &str, number: &str, kind: Option<&str>) -> String {
    let c = country.trim().to_uppercase();
    let n: String = number
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_digit())
        .collect();
    match kind {
        Some(k) if !k.trim().is_empty() => {
            format!("{}{}{}", c, n, k.trim().to_uppercase())
        }
        _ => format!("{}{}", c, n),
    }
}

/// 归一化物料编号：仅保留字母数字，转大写。
pub fn normalize_material_code(code: &str) -> String {
    code.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}

/// 校验物料编号：非空、≤64 字符、仅字母数字 / `-` / `_`。
pub fn validate_material_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 64 {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// 计算实验时长（小时）。`end < start` 时返回 `None`。
pub fn calc_experiment_duration_hours(start: NaiveDateTime, end: NaiveDateTime) -> Option<f64> {
    if end < start {
        return None;
    }
    let dur = end - start;
    Some(dur.num_seconds() as f64 / 3600.0)
}

/// 计算预算使用率（0.0-1.0）。`total ≤ 0` 时返回 `None`。
pub fn calc_budget_utilization(used: f64, total: f64) -> Option<f64> {
    if total <= 0.0 {
        return None;
    }
    let rate = used / total;
    Some(rate.clamp(0.0, 1.0))
}

/// 计算预算剩余金额，不会小于 0。
pub fn calc_budget_remaining(total: f64, used: f64) -> f64 {
    let remaining = total - used;
    if remaining < 0.0 {
        0.0
    } else {
        remaining
    }
}

/// 校验风险等级是否属于合法枚举值。
pub fn is_valid_risk_level(level: &str) -> bool {
    matches!(level, "low" | "medium" | "high" | "critical")
}

/// 校验批号：非空、≤32 字符、仅字母数字 / `-`。
pub fn validate_batch_number(batch: &str) -> bool {
    if batch.is_empty() || batch.len() > 32 {
        return false;
    }
    batch.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

/// 计算配方收率（0.0-1.0）。`theoretical ≤ 0` 时返回 `None`。
pub fn calc_formula_yield(actual: f64, theoretical: f64) -> Option<f64> {
    if theoretical <= 0.0 {
        return None;
    }
    let rate = actual / theoretical;
    Some(rate.clamp(0.0, 1.0))
}

/// 校验项目优先级是否在 [-10, 10] 区间内。
pub fn is_valid_priority(priority: i32) -> bool {
    (-10..=10).contains(&priority)
}

/// 校验项目状态字符串是否属于合法枚举值。
pub fn is_valid_project_status(status: &str) -> bool {
    matches!(
        status,
        "draft" | "pending_approval" | "active" | "paused" | "completed" | "cancelled"
    )
}

/// R&D 校验错误类型。
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum RdError {
    #[error("invalid experiment code: {0}")]
    InvalidExperimentCode(String),
    #[error("invalid formula version: {0}")]
    InvalidFormulaVersion(String),
}

/// 严格校验实验编号，失败时返回结构化错误。
pub fn validate_experiment_code_strict(code: &str) -> Result<(), RdError> {
    if !validate_experiment_code(code) {
        return Err(RdError::InvalidExperimentCode(code.to_string()));
    }
    Ok(())
}

/// 严格校验配方版本号，失败时返回结构化错误。
pub fn validate_formula_version_strict(version: &str) -> Result<(), RdError> {
    if !validate_formula_version(version) {
        return Err(RdError::InvalidFormulaVersion(version.to_string()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    // ===== validate_experiment_code =====

    #[test]
    fn test_validate_experiment_code_valid() {
        assert!(validate_experiment_code("EXP-2024-001"));
        assert!(validate_experiment_code("exp_001"));
        assert!(validate_experiment_code("ABC123"));
    }

    #[test]
    fn test_validate_experiment_code_invalid() {
        assert!(!validate_experiment_code(""));
        assert!(!validate_experiment_code("a".repeat(65).as_str()));
        assert!(!validate_experiment_code("EXP 001"));
        assert!(!validate_experiment_code("EXP@001"));
    }

    #[test]
    fn test_validate_experiment_code_boundary_64() {
        assert!(validate_experiment_code(&"a".repeat(64)));
        assert!(!validate_experiment_code(&"a".repeat(65)));
    }

    #[test]
    fn test_validate_experiment_code_single_char() {
        assert!(validate_experiment_code("a"));
        assert!(validate_experiment_code("-"));
        assert!(validate_experiment_code("_"));
    }

    // ===== normalize_experiment_code =====

    #[test]
    fn test_normalize_experiment_code() {
        assert_eq!(normalize_experiment_code("  exp 001  "), "EXP001");
        assert_eq!(normalize_experiment_code("Exp-2024\tA"), "EXP-2024A");
        assert_eq!(normalize_experiment_code("\teXp_01\n"), "EXP_01");
    }

    #[test]
    fn test_normalize_experiment_code_empty() {
        assert_eq!(normalize_experiment_code(""), "");
        assert_eq!(normalize_experiment_code("   "), "");
    }

    #[test]
    fn test_normalize_experiment_code_already_upper() {
        assert_eq!(normalize_experiment_code("EXP-001"), "EXP-001");
    }

    // ===== is_valid_experiment_status =====

    #[test]
    fn test_is_valid_experiment_status_valid() {
        assert!(is_valid_experiment_status("planned"));
        assert!(is_valid_experiment_status("in_progress"));
        assert!(is_valid_experiment_status("completed"));
        assert!(is_valid_experiment_status("on_hold"));
        assert!(is_valid_experiment_status("cancelled"));
    }

    #[test]
    fn test_is_valid_experiment_status_invalid() {
        assert!(!is_valid_experiment_status("done"));
        assert!(!is_valid_experiment_status(""));
        assert!(!is_valid_experiment_status("Planned"));
        assert!(!is_valid_experiment_status("paused"));
    }

    // ===== is_valid_experiment_status_transition =====

    #[test]
    fn test_experiment_status_transition_valid() {
        assert!(is_valid_experiment_status_transition(
            "planned",
            "in_progress"
        ));
        assert!(is_valid_experiment_status_transition(
            "in_progress",
            "completed"
        ));
        assert!(is_valid_experiment_status_transition(
            "in_progress",
            "on_hold"
        ));
        assert!(is_valid_experiment_status_transition(
            "on_hold",
            "in_progress"
        ));
        assert!(is_valid_experiment_status_transition(
            "planned",
            "cancelled"
        ));
    }

    #[test]
    fn test_experiment_status_transition_invalid() {
        assert!(!is_valid_experiment_status_transition(
            "planned",
            "completed"
        ));
        assert!(!is_valid_experiment_status_transition(
            "completed",
            "in_progress"
        ));
        assert!(!is_valid_experiment_status_transition(
            "cancelled",
            "in_progress"
        ));
        assert!(!is_valid_experiment_status_transition(
            "completed",
            "cancelled"
        ));
    }

    // ===== is_valid_experiment_phase =====

    #[test]
    fn test_is_valid_experiment_phase_valid() {
        assert!(is_valid_experiment_phase("formulation"));
        assert!(is_valid_experiment_phase("testing"));
        assert!(is_valid_experiment_phase("analysis"));
        assert!(is_valid_experiment_phase("scale_up"));
        assert!(is_valid_experiment_phase("pilot"));
    }

    #[test]
    fn test_is_valid_experiment_phase_invalid() {
        assert!(!is_valid_experiment_phase(""));
        assert!(!is_valid_experiment_phase("Formulation"));
        assert!(!is_valid_experiment_phase("prototype"));
    }

    // ===== validate_formula_version =====

    #[test]
    fn test_validate_formula_version_valid() {
        assert!(validate_formula_version("1.0.0"));
        assert!(validate_formula_version("2.3.1"));
        assert!(validate_formula_version("0.0.1"));
        assert!(validate_formula_version("10.20.30"));
    }

    #[test]
    fn test_validate_formula_version_invalid() {
        assert!(!validate_formula_version(""));
        assert!(!validate_formula_version("1.0"));
        assert!(!validate_formula_version("1.0.0.0"));
        assert!(!validate_formula_version("1.0.a"));
        assert!(!validate_formula_version("v1.0.0"));
        assert!(!validate_formula_version("1..0"));
    }

    #[test]
    fn test_validate_formula_version_segments_empty() {
        assert!(!validate_formula_version(".0.0"));
        assert!(!validate_formula_version("1..0"));
        assert!(!validate_formula_version("1.0."));
    }

    // ===== compare_formula_versions =====

    #[test]
    fn test_compare_formula_versions_equal() {
        assert_eq!(
            compare_formula_versions("1.0.0", "1.0.0"),
            Some(Ordering::Equal)
        );
        assert_eq!(
            compare_formula_versions("2.5.3", "2.5.3"),
            Some(Ordering::Equal)
        );
    }

    #[test]
    fn test_compare_formula_versions_greater() {
        assert_eq!(
            compare_formula_versions("2.0.0", "1.0.0"),
            Some(Ordering::Greater)
        );
        assert_eq!(
            compare_formula_versions("1.2.0", "1.1.9"),
            Some(Ordering::Greater)
        );
        assert_eq!(
            compare_formula_versions("1.0.2", "1.0.1"),
            Some(Ordering::Greater)
        );
    }

    #[test]
    fn test_compare_formula_versions_less() {
        assert_eq!(
            compare_formula_versions("1.0.0", "2.0.0"),
            Some(Ordering::Less)
        );
        assert_eq!(
            compare_formula_versions("1.0.9", "1.1.0"),
            Some(Ordering::Less)
        );
    }

    #[test]
    fn test_compare_formula_versions_invalid() {
        assert_eq!(compare_formula_versions("1.0", "1.0.0"), None);
        assert_eq!(compare_formula_versions("1.0.0", "bad"), None);
    }

    // ===== is_valid_formula_status =====

    #[test]
    fn test_is_valid_formula_status_valid() {
        assert!(is_valid_formula_status("draft"));
        assert!(is_valid_formula_status("under_review"));
        assert!(is_valid_formula_status("approved"));
        assert!(is_valid_formula_status("active"));
        assert!(is_valid_formula_status("deprecated"));
    }

    #[test]
    fn test_is_valid_formula_status_invalid() {
        assert!(!is_valid_formula_status(""));
        assert!(!is_valid_formula_status("Draft"));
        assert!(!is_valid_formula_status("published"));
    }

    // ===== normalize_formula_code =====

    #[test]
    fn test_normalize_formula_code() {
        assert_eq!(normalize_formula_code("  fm 001  "), "FM001");
        assert_eq!(normalize_formula_code("Fm-2024\tA"), "FM-2024A");
    }

    #[test]
    fn test_normalize_formula_code_empty() {
        assert_eq!(normalize_formula_code(""), "");
        assert_eq!(normalize_formula_code("  "), "");
    }

    // ===== calc_project_progress =====

    #[test]
    fn test_calc_project_progress_weighted() {
        // (progress, weight)
        let phases = [(100, 2), (50, 2)];
        assert_eq!(calc_project_progress(&phases), Some(75));
    }

    #[test]
    fn test_calc_project_progress_single() {
        assert_eq!(calc_project_progress(&[(80, 1)]), Some(80));
        assert_eq!(calc_project_progress(&[(0, 1)]), Some(0));
        assert_eq!(calc_project_progress(&[(100, 1)]), Some(100));
    }

    #[test]
    fn test_calc_project_progress_clamps() {
        // progress > 100 should be clamped to 100
        let phases = [(150, 1), (50, 1)];
        assert_eq!(calc_project_progress(&phases), Some(75));
        // negative progress clamped to 0
        let phases2 = [(-20, 1), (100, 1)];
        assert_eq!(calc_project_progress(&phases2), Some(50));
    }

    #[test]
    fn test_calc_project_progress_empty() {
        assert_eq!(calc_project_progress(&[]), None);
    }

    #[test]
    fn test_calc_project_progress_zero_weight() {
        assert_eq!(calc_project_progress(&[(50, 0), (60, 0)]), None);
    }

    // ===== calc_progress_percentage =====

    #[test]
    fn test_calc_progress_percentage_normal() {
        assert_eq!(calc_progress_percentage(5, 10), Some(0.5));
        assert_eq!(calc_progress_percentage(10, 10), Some(1.0));
        assert_eq!(calc_progress_percentage(0, 10), Some(0.0));
    }

    #[test]
    fn test_calc_progress_percentage_clamps() {
        assert_eq!(calc_progress_percentage(15, 10), Some(1.0));
    }

    #[test]
    fn test_calc_progress_percentage_zero_total() {
        assert_eq!(calc_progress_percentage(5, 0), None);
        assert_eq!(calc_progress_percentage(0, 0), None);
    }

    // ===== validate_patent_number =====

    #[test]
    fn test_validate_patent_number_valid() {
        assert!(validate_patent_number("CN12345678A"));
        assert!(validate_patent_number("US1234567"));
        assert!(validate_patent_number("JP98765432B"));
    }

    #[test]
    fn test_validate_patent_number_invalid() {
        assert!(!validate_patent_number(""));
        assert!(!validate_patent_number("CN123"));
        assert!(!validate_patent_number("Cn12345678"));
        assert!(!validate_patent_number("12ABCDE"));
        assert!(!validate_patent_number("CN12AB45"));
    }

    #[test]
    fn test_validate_patent_number_boundary_length() {
        // 最小合法：2 字母 + 4 数字 = 6
        assert!(validate_patent_number("CN1234"));
        assert!(!validate_patent_number("CN123"));
        // 过长
        assert!(!validate_patent_number(&format!("CN{}", "1".repeat(31))));
    }

    // ===== format_patent_number =====

    #[test]
    fn test_format_patent_number_with_kind() {
        assert_eq!(
            format_patent_number("cn", "12345678", Some("a")),
            "CN12345678A"
        );
        assert_eq!(
            format_patent_number("US", " 9876543 ", Some("B2")),
            "US9876543B2"
        );
    }

    #[test]
    fn test_format_patent_number_without_kind() {
        assert_eq!(format_patent_number("cn", "12345678", None), "CN12345678");
        assert_eq!(
            format_patent_number("JP", "99887766", Some("")),
            "JP99887766"
        );
    }

    #[test]
    fn test_format_patent_number_strips_non_digits() {
        assert_eq!(format_patent_number("CN", "12-34 56", None), "CN123456");
    }

    // ===== normalize_material_code =====

    #[test]
    fn test_normalize_material_code() {
        assert_eq!(normalize_material_code(" mat-001 "), "MAT001");
        assert_eq!(normalize_material_code("\tM_01\n"), "M01");
        assert_eq!(normalize_material_code("aBc-123"), "ABC123");
    }

    #[test]
    fn test_normalize_material_code_empty() {
        assert_eq!(normalize_material_code(""), "");
        assert_eq!(normalize_material_code("  -  "), "");
    }

    // ===== validate_material_code =====

    #[test]
    fn test_validate_material_code_valid() {
        assert!(validate_material_code("MAT-001"));
        assert!(validate_material_code("mat_001"));
        assert!(validate_material_code("A1"));
    }

    #[test]
    fn test_validate_material_code_invalid() {
        assert!(!validate_material_code(""));
        assert!(!validate_material_code("a".repeat(65).as_str()));
        assert!(!validate_material_code("MAT 001"));
        assert!(!validate_material_code("MAT@001"));
    }

    // ===== calc_experiment_duration_hours =====

    #[test]
    fn test_calc_experiment_duration_hours_normal() {
        let start = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(8, 0, 0)
            .unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();
        assert_eq!(calc_experiment_duration_hours(start, end), Some(2.0));
    }

    #[test]
    fn test_calc_experiment_duration_hours_cross_day() {
        let start = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(22, 0, 0)
            .unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 2)
            .unwrap()
            .and_hms_opt(6, 0, 0)
            .unwrap();
        assert_eq!(calc_experiment_duration_hours(start, end), Some(8.0));
    }

    #[test]
    fn test_calc_experiment_duration_hours_reversed() {
        let start = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap();
        let end = NaiveDate::from_ymd_opt(2024, 1, 1)
            .unwrap()
            .and_hms_opt(8, 0, 0)
            .unwrap();
        assert_eq!(calc_experiment_duration_hours(start, end), None);
    }

    #[test]
    fn test_calc_experiment_duration_hours_same_time() {
        let t = NaiveDate::from_ymd_opt(2024, 3, 1)
            .unwrap()
            .and_hms_opt(12, 0, 0)
            .unwrap();
        assert_eq!(calc_experiment_duration_hours(t, t), Some(0.0));
    }

    // ===== calc_budget_utilization =====

    #[test]
    fn test_calc_budget_utilization_normal() {
        assert_eq!(calc_budget_utilization(50.0, 100.0), Some(0.5));
        assert_eq!(calc_budget_utilization(100.0, 100.0), Some(1.0));
        assert_eq!(calc_budget_utilization(0.0, 100.0), Some(0.0));
    }

    #[test]
    fn test_calc_budget_utilization_clamps() {
        assert_eq!(calc_budget_utilization(150.0, 100.0), Some(1.0));
        assert_eq!(calc_budget_utilization(-10.0, 100.0), Some(0.0));
    }

    #[test]
    fn test_calc_budget_utilization_zero_total() {
        assert_eq!(calc_budget_utilization(50.0, 0.0), None);
        assert_eq!(calc_budget_utilization(50.0, -10.0), None);
    }

    // ===== calc_budget_remaining =====

    #[test]
    fn test_calc_budget_remaining_normal() {
        assert_eq!(calc_budget_remaining(100.0, 30.0), 70.0);
        assert_eq!(calc_budget_remaining(100.0, 100.0), 0.0);
    }

    #[test]
    fn test_calc_budget_remaining_overdraw() {
        assert_eq!(calc_budget_remaining(100.0, 150.0), 0.0);
    }

    #[test]
    fn test_calc_budget_remaining_zero() {
        assert_eq!(calc_budget_remaining(0.0, 0.0), 0.0);
    }

    // ===== is_valid_risk_level =====

    #[test]
    fn test_is_valid_risk_level_valid() {
        assert!(is_valid_risk_level("low"));
        assert!(is_valid_risk_level("medium"));
        assert!(is_valid_risk_level("high"));
        assert!(is_valid_risk_level("critical"));
    }

    #[test]
    fn test_is_valid_risk_level_invalid() {
        assert!(!is_valid_risk_level(""));
        assert!(!is_valid_risk_level("Low"));
        assert!(!is_valid_risk_level("extreme"));
    }

    // ===== validate_batch_number =====

    #[test]
    fn test_validate_batch_number_valid() {
        assert!(validate_batch_number("BATCH-2024-001"));
        assert!(validate_batch_number("B001"));
        assert!(validate_batch_number("12345"));
    }

    #[test]
    fn test_validate_batch_number_invalid() {
        assert!(!validate_batch_number(""));
        assert!(!validate_batch_number("a".repeat(33).as_str()));
        assert!(!validate_batch_number("BATCH 001"));
        assert!(!validate_batch_number("BATCH_001"));
    }

    #[test]
    fn test_validate_batch_number_boundary_32() {
        assert!(validate_batch_number(&"a".repeat(32)));
        assert!(!validate_batch_number(&"a".repeat(33)));
    }

    // ===== calc_formula_yield =====

    #[test]
    fn test_calc_formula_yield_normal() {
        assert_eq!(calc_formula_yield(95.0, 100.0), Some(0.95));
        assert_eq!(calc_formula_yield(100.0, 100.0), Some(1.0));
        assert_eq!(calc_formula_yield(0.0, 100.0), Some(0.0));
    }

    #[test]
    fn test_calc_formula_yield_clamps() {
        assert_eq!(calc_formula_yield(120.0, 100.0), Some(1.0));
        assert_eq!(calc_formula_yield(-5.0, 100.0), Some(0.0));
    }

    #[test]
    fn test_calc_formula_yield_zero_theoretical() {
        assert_eq!(calc_formula_yield(50.0, 0.0), None);
        assert_eq!(calc_formula_yield(50.0, -10.0), None);
    }

    // ===== is_valid_priority =====

    #[test]
    fn test_is_valid_priority_valid() {
        assert!(is_valid_priority(0));
        assert!(is_valid_priority(-10));
        assert!(is_valid_priority(10));
        assert!(is_valid_priority(5));
    }

    #[test]
    fn test_is_valid_priority_invalid() {
        assert!(!is_valid_priority(-11));
        assert!(!is_valid_priority(11));
        assert!(!is_valid_priority(100));
    }

    // ===== is_valid_project_status =====

    #[test]
    fn test_is_valid_project_status_valid() {
        assert!(is_valid_project_status("draft"));
        assert!(is_valid_project_status("pending_approval"));
        assert!(is_valid_project_status("active"));
        assert!(is_valid_project_status("paused"));
        assert!(is_valid_project_status("completed"));
        assert!(is_valid_project_status("cancelled"));
    }

    #[test]
    fn test_is_valid_project_status_invalid() {
        assert!(!is_valid_project_status(""));
        assert!(!is_valid_project_status("Draft"));
        assert!(!is_valid_project_status("done"));
    }

    // ===== strict validation + RdError =====

    #[test]
    fn test_validate_experiment_code_strict_ok() {
        assert!(validate_experiment_code_strict("EXP-001").is_ok());
    }

    #[test]
    fn test_validate_experiment_code_strict_err() {
        let err = validate_experiment_code_strict("").unwrap_err();
        assert!(matches!(err, RdError::InvalidExperimentCode(_)));
        assert!(format!("{}", err).contains("invalid experiment code"));
    }

    #[test]
    fn test_validate_formula_version_strict_ok() {
        assert!(validate_formula_version_strict("1.0.0").is_ok());
    }

    #[test]
    fn test_validate_formula_version_strict_err() {
        let err = validate_formula_version_strict("1.0").unwrap_err();
        assert!(matches!(err, RdError::InvalidFormulaVersion(_)));
        assert!(format!("{}", err).contains("invalid formula version"));
    }

    #[test]
    fn test_rd_error_clone_eq() {
        let e1 = RdError::InvalidExperimentCode("x".into());
        let e2 = e1.clone();
        assert_eq!(e1, e2);
        assert_ne!(e1, RdError::InvalidFormulaVersion("x".into()));
    }
}
