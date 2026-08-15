//! QMS domain pure helpers

use std::fmt;

#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum QmsUtilError {
    #[error("invalid inspection number: {0}")]
    InvalidInspectionNo(String),
    #[error("invalid parameters: {0}")]
    InvalidParams(String),
}

#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum SampleError {
    #[error("invalid lot size: {0}")]
    InvalidLotSize(String),
    #[error("invalid aql: {0}")]
    InvalidAql(String),
    #[error("invalid level: {0}")]
    InvalidLevel(String),
    #[error("invalid sample size: {0}")]
    InvalidSampleSize(String),
    #[error("invalid defect count: {0}")]
    InvalidDefectCount(String),
}

pub fn validate_inspection_no(s: &str) -> Result<(), QmsUtilError> {
    if s.is_empty() {
        return Err(QmsUtilError::InvalidInspectionNo("empty".to_string()));
    }
    let trimmed = s.trim();
    if trimmed.len() < 3 {
        return Err(QmsUtilError::InvalidInspectionNo(format!(
            "too short: '{}'",
            trimmed
        )));
    }
    if trimmed.len() > 64 {
        return Err(QmsUtilError::InvalidInspectionNo(format!(
            "too long: '{}'",
            trimmed
        )));
    }
    let prefix_ok = trimmed
        .chars()
        .next()
        .map(|c| c.is_ascii_alphabetic())
        .unwrap_or(false);
    if !prefix_ok {
        return Err(QmsUtilError::InvalidInspectionNo(format!(
            "must start with letter: '{}'",
            trimmed
        )));
    }
    let all_ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !all_ok {
        return Err(QmsUtilError::InvalidInspectionNo(format!(
            "contains invalid chars: '{}'",
            trimmed
        )));
    }
    Ok(())
}

pub fn normalize_batch_no(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_space = false;
    for c in trimmed.chars() {
        if c.is_whitespace() {
            if !prev_space {
                result.push('-');
                prev_space = true;
            }
        } else {
            result.push(c.to_ascii_uppercase());
            prev_space = false;
        }
    }
    result
}

pub fn calc_defect_rate(defect_count: u64, total_count: u64) -> f64 {
    if total_count == 0 {
        return 0.0;
    }
    if defect_count >= total_count {
        return 1.0;
    }
    defect_count as f64 / total_count as f64
}

const NCR_STATES: &[&str] = &[
    "open",
    "investigating",
    "assigned",
    "resolved",
    "verified",
    "closed",
    "cancelled",
];
const NCR_TERMINAL: &[&str] = &["closed", "cancelled"];
const NCR_TRANSITIONS: &[(&str, &str)] = &[
    ("open", "investigating"),
    ("open", "cancelled"),
    ("investigating", "assigned"),
    ("investigating", "cancelled"),
    ("assigned", "resolved"),
    ("assigned", "investigating"),
    ("resolved", "verified"),
    ("resolved", "assigned"),
    ("verified", "closed"),
    ("verified", "resolved"),
];

pub fn is_valid_ncr_status_transition(from: &str, to: &str) -> bool {
    if !NCR_STATES.contains(&from) || !NCR_STATES.contains(&to) {
        return false;
    }
    if NCR_TERMINAL.contains(&from) {
        return false;
    }
    if from == to {
        return false;
    }
    NCR_TRANSITIONS.contains(&(from, to))
}

pub fn is_valid_inspection_status_transition(from: &str, to: &str) -> bool {
    if from == to {
        return false;
    }
    let pairs: &[(&str, &str)] = &[
        ("pending", "in_progress"),
        ("in_progress", "pending_audit"),
        ("pending_audit", "completed"),
        ("pending_audit", "rejected"),
        ("rejected", "in_progress"),
    ];
    let terminal: &[&str] = &["completed"];
    if terminal.contains(&from) {
        return false;
    }
    pairs.contains(&(from, to))
}

pub fn calc_sample_size_ansi_zs1_4(
    lot_size: u32,
    aql: &str,
    level: &str,
) -> Result<u32, SampleError> {
    if lot_size == 0 {
        return Err(SampleError::InvalidLotSize("zero".to_string()));
    }
    let aql_val: f64 = aql
        .parse::<f64>()
        .map_err(|_| SampleError::InvalidAql(aql.to_string()))?;
    if aql_val < 0.0 {
        return Err(SampleError::InvalidAql(format!("negative: {}", aql)));
    }
    let allowed_aql: &[&str] = &[
        "0.065", "0.1", "0.15", "0.25", "0.4", "0.65", "1", "1.5", "2.5", "4", "6.5", "10",
    ];
    if !allowed_aql.contains(&aql) {
        return Err(SampleError::InvalidAql(format!("unsupported aql: {}", aql)));
    }
    let level_up = level.to_ascii_uppercase();
    let allowed_levels: &[&str] = &["I", "II", "III", "S1", "S2", "S3", "S4"];
    if !allowed_levels.contains(&level_up.as_str()) {
        return Err(SampleError::InvalidLevel(level.to_string()));
    }
    let sample = match lot_size {
        1..=25 => 5,
        26..=90 => 8,
        91..=150 => 13,
        151..=280 => 20,
        281..=500 => 32,
        501..=1200 => 50,
        1201..=3200 => 80,
        3201..=10000 => 125,
        10001..=35000 => 200,
        _ => 315,
    };
    let level_factor = match level_up.as_str() {
        "S1" => 0.3,
        "S2" => 0.5,
        "S3" => 0.7,
        "S4" => 0.85,
        "I" => 0.7,
        "II" => 1.0,
        "III" => 1.5,
        _ => 1.0,
    };
    let adjusted = (sample as f64 * level_factor).round() as u32;
    Ok(adjusted.max(2))
}

pub fn check_aql_pass(defects: u32, sample_size: u32, aql: &str) -> Result<bool, SampleError> {
    if sample_size == 0 {
        return Err(SampleError::InvalidSampleSize("zero".to_string()));
    }
    if defects > sample_size {
        return Err(SampleError::InvalidDefectCount(format!(
            "defects {} > sample_size {}",
            defects, sample_size
        )));
    }
    let aql_val: f64 = aql
        .parse::<f64>()
        .map_err(|_| SampleError::InvalidAql(aql.to_string()))?;
    if aql_val < 0.0 {
        return Err(SampleError::InvalidAql(format!("negative: {}", aql)));
    }
    let max_defects_f = sample_size as f64 * (aql_val / 100.0);
    let max_allowed = max_defects_f.floor() as u32;
    Ok(defects <= max_allowed)
}

pub fn normalize_defect_severity(s: &str) -> Option<String> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }
    let lower = trimmed.to_ascii_lowercase();
    let normalized = match lower.as_str() {
        "critical" | "crit" | "严重" | "致命" | "cr" | "c" => "Critical".to_string(),
        "major" | "maj" | "主要" | "大" | "ma" | "m" => "Major".to_string(),
        "minor" | "min" | "轻微" | "小" | "mi" => "Minor".to_string(),
        "incidental" | "inc" | "建议" | "观察" | "轻微问题" | "obs" | "o" | "i" => {
            "Incidental".to_string()
        }
        _ => return None,
    };
    Some(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_inspection_no_valid() {
        assert!(validate_inspection_no("INSP-001").is_ok());
        assert!(validate_inspection_no("QC_12345").is_ok());
        assert!(validate_inspection_no("ABC").is_ok());
        assert!(validate_inspection_no("I1").is_err());
    }

    #[test]
    fn test_validate_inspection_no_invalid_empty() {
        let r = validate_inspection_no("");
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            QmsUtilError::InvalidInspectionNo(_)
        ));
    }

    #[test]
    fn test_validate_inspection_no_invalid_short() {
        let r = validate_inspection_no("AB");
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            QmsUtilError::InvalidInspectionNo(_)
        ));
    }

    #[test]
    fn test_validate_inspection_no_invalid_prefix() {
        let r = validate_inspection_no("123ABC");
        assert!(r.is_err());
    }

    #[test]
    fn test_validate_inspection_no_invalid_chars() {
        assert!(validate_inspection_no("INSP 001").is_err());
        assert!(validate_inspection_no("INSP/001").is_err());
    }

    #[test]
    fn test_normalize_batch_no_basic() {
        assert_eq!(normalize_batch_no("batch123"), "BATCH123");
        assert_eq!(normalize_batch_no("  BaTcH  456  "), "BATCH-456");
    }

    #[test]
    fn test_normalize_batch_no_empty_and_whitespace() {
        assert_eq!(normalize_batch_no(""), "");
        assert_eq!(normalize_batch_no("   "), "");
    }

    #[test]
    fn test_normalize_batch_no_mixed_whitespace() {
        assert_eq!(
            normalize_batch_no("lot \t\n  alpha  beta"),
            "LOT-ALPHA-BETA"
        );
    }

    #[test]
    fn test_calc_defect_rate_normal() {
        assert!((calc_defect_rate(5, 100) - 0.05).abs() < 1e-9);
        assert!((calc_defect_rate(50, 100) - 0.5).abs() < 1e-9);
        assert!((calc_defect_rate(1, 1000) - 0.001).abs() < 1e-9);
    }

    #[test]
    fn test_calc_defect_rate_edge_zero_total() {
        assert_eq!(calc_defect_rate(0, 0), 0.0);
        assert_eq!(calc_defect_rate(10, 0), 0.0);
    }

    #[test]
    fn test_calc_defect_rate_edge_defects_ge_total() {
        assert_eq!(calc_defect_rate(100, 100), 1.0);
        assert_eq!(calc_defect_rate(150, 100), 1.0);
    }

    #[test]
    fn test_calc_defect_rate_zero_defects() {
        assert_eq!(calc_defect_rate(0, 100), 0.0);
        assert_eq!(calc_defect_rate(0, 1), 0.0);
    }

    #[test]
    fn test_is_valid_ncr_status_transition_valid() {
        assert!(is_valid_ncr_status_transition("open", "investigating"));
        assert!(is_valid_ncr_status_transition("investigating", "assigned"));
        assert!(is_valid_ncr_status_transition("assigned", "resolved"));
        assert!(is_valid_ncr_status_transition("resolved", "verified"));
        assert!(is_valid_ncr_status_transition("verified", "closed"));
    }

    #[test]
    fn test_is_valid_ncr_status_transition_invalid_terminal() {
        assert!(!is_valid_ncr_status_transition("closed", "open"));
        assert!(!is_valid_ncr_status_transition(
            "cancelled",
            "investigating"
        ));
    }

    #[test]
    fn test_is_valid_ncr_status_transition_invalid_self() {
        assert!(!is_valid_ncr_status_transition("open", "open"));
        assert!(!is_valid_ncr_status_transition("assigned", "assigned"));
    }

    #[test]
    fn test_is_valid_ncr_status_transition_invalid_unknown() {
        assert!(!is_valid_ncr_status_transition("unknown", "open"));
        assert!(!is_valid_ncr_status_transition("open", "garbage"));
    }

    #[test]
    fn test_is_valid_ncr_status_transition_invalid_jumps() {
        assert!(!is_valid_ncr_status_transition("open", "resolved"));
        assert!(!is_valid_ncr_status_transition("assigned", "closed"));
    }

    #[test]
    fn test_is_valid_inspection_status_transition_valid() {
        assert!(is_valid_inspection_status_transition(
            "pending",
            "in_progress"
        ));
        assert!(is_valid_inspection_status_transition(
            "in_progress",
            "pending_audit"
        ));
        assert!(is_valid_inspection_status_transition(
            "pending_audit",
            "completed"
        ));
    }

    #[test]
    fn test_is_valid_inspection_status_transition_invalid() {
        assert!(!is_valid_inspection_status_transition(
            "pending",
            "pending_audit"
        ));
        assert!(!is_valid_inspection_status_transition(
            "pending",
            "completed"
        ));
    }

    #[test]
    fn test_is_valid_inspection_status_transition_terminal_and_self() {
        assert!(!is_valid_inspection_status_transition(
            "completed",
            "pending"
        ));
        assert!(!is_valid_inspection_status_transition("pending", "pending"));
    }

    #[test]
    fn test_calc_sample_size_basic_level_ii() {
        assert_eq!(calc_sample_size_ansi_zs1_4(500, "2.5", "II").unwrap(), 32);
        assert_eq!(calc_sample_size_ansi_zs1_4(1000, "4", "II").unwrap(), 50);
        assert_eq!(calc_sample_size_ansi_zs1_4(10, "1", "II").unwrap(), 5);
    }

    #[test]
    fn test_calc_sample_size_level_factor() {
        let s2 = calc_sample_size_ansi_zs1_4(500, "2.5", "S2").unwrap();
        let s3 = calc_sample_size_ansi_zs1_4(500, "2.5", "S3").unwrap();
        let ii = calc_sample_size_ansi_zs1_4(500, "2.5", "II").unwrap();
        let iii = calc_sample_size_ansi_zs1_4(500, "2.5", "III").unwrap();
        assert!(s2 <= s3);
        assert!(s3 <= ii);
        assert!(ii <= iii);
    }

    #[test]
    fn test_calc_sample_size_invalid_lot_size() {
        let r = calc_sample_size_ansi_zs1_4(0, "2.5", "II");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), SampleError::InvalidLotSize(_)));
    }

    #[test]
    fn test_calc_sample_size_invalid_aql() {
        assert!(calc_sample_size_ansi_zs1_4(100, "bad", "II").is_err());
        assert!(calc_sample_size_ansi_zs1_4(100, "-1", "II").is_err());
    }

    #[test]
    fn test_calc_sample_size_invalid_level() {
        let r = calc_sample_size_ansi_zs1_4(100, "2.5", "ZZZ");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), SampleError::InvalidLevel(_)));
    }

    #[test]
    fn test_check_aql_pass_happy() {
        assert!(check_aql_pass(0, 100, "2.5").unwrap());
        assert!(check_aql_pass(2, 100, "2.5").unwrap());
    }

    #[test]
    fn test_check_aql_pass_fail() {
        assert!(!check_aql_pass(10, 100, "2.5").unwrap());
        assert!(!check_aql_pass(5, 50, "1").unwrap());
    }

    #[test]
    fn test_check_aql_pass_edge_zero_sample() {
        let r = check_aql_pass(0, 0, "2.5");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), SampleError::InvalidSampleSize(_)));
    }

    #[test]
    fn test_check_aql_pass_edge_defects_gt_sample() {
        let r = check_aql_pass(20, 10, "2.5");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), SampleError::InvalidDefectCount(_)));
    }

    #[test]
    fn test_check_aql_pass_invalid_aql() {
        assert!(check_aql_pass(0, 100, "notanumber").is_err());
        assert!(check_aql_pass(0, 100, "-0.5").is_err());
    }

    #[test]
    fn test_normalize_defect_severity_english() {
        assert_eq!(
            normalize_defect_severity("critical"),
            Some("Critical".to_string())
        );
        assert_eq!(
            normalize_defect_severity("  MAJOR  "),
            Some("Major".to_string())
        );
        assert_eq!(normalize_defect_severity("Min"), Some("Minor".to_string()));
        assert_eq!(
            normalize_defect_severity("Incidental"),
            Some("Incidental".to_string())
        );
    }

    #[test]
    fn test_normalize_defect_severity_chinese() {
        assert_eq!(
            normalize_defect_severity("严重"),
            Some("Critical".to_string())
        );
        assert_eq!(normalize_defect_severity("主要"), Some("Major".to_string()));
        assert_eq!(normalize_defect_severity("轻微"), Some("Minor".to_string()));
        assert_eq!(
            normalize_defect_severity("建议"),
            Some("Incidental".to_string())
        );
    }

    #[test]
    fn test_normalize_defect_severity_abbreviations() {
        assert_eq!(
            normalize_defect_severity("CR"),
            Some("Critical".to_string())
        );
        assert_eq!(normalize_defect_severity("Ma"), Some("Major".to_string()));
        assert_eq!(normalize_defect_severity("mi"), Some("Minor".to_string()));
        assert_eq!(
            normalize_defect_severity("obs"),
            Some("Incidental".to_string())
        );
    }

    #[test]
    fn test_normalize_defect_severity_invalid() {
        assert_eq!(normalize_defect_severity(""), None);
        assert_eq!(normalize_defect_severity("   "), None);
        assert_eq!(normalize_defect_severity("unknown"), None);
        assert_eq!(normalize_defect_severity("随机文本"), None);
    }

    #[test]
    fn test_errors_display() {
        let e1 = QmsUtilError::InvalidInspectionNo("x".to_string());
        let s = format!("{}", e1);
        assert!(s.contains("invalid inspection number"));
        let e2 = QmsUtilError::InvalidParams("bad".to_string());
        assert!(format!("{}", e2).contains("invalid parameters"));
        let s1 = SampleError::InvalidLotSize("0".to_string());
        assert!(format!("{}", s1).contains("invalid lot size"));
        let s2 = SampleError::InvalidAql("-1".to_string());
        assert!(format!("{}", s2).contains("invalid aql"));
        let s3 = SampleError::InvalidLevel("X".to_string());
        assert!(format!("{}", s3).contains("invalid level"));
        let s4 = SampleError::InvalidSampleSize("0".to_string());
        assert!(format!("{}", s4).contains("invalid sample size"));
        let s5 = SampleError::InvalidDefectCount("99".to_string());
        assert!(format!("{}", s5).contains("invalid defect count"));
    }

    #[test]
    fn test_errors_clone_and_debug() {
        let e1 = QmsUtilError::InvalidInspectionNo("x".to_string());
        let e2 = e1.clone();
        assert_eq!(e1, e2);
        let s = format!("{:?}", e1);
        assert!(!s.is_empty());
        let s1 = SampleError::InvalidLotSize("0".to_string());
        let s2 = s1.clone();
        assert_eq!(s1, s2);
        assert!(!format!("{:?}", s1).is_empty());
    }

    #[test]
    fn test_calc_sample_size_large_lot() {
        assert!(calc_sample_size_ansi_zs1_4(1_000_000, "2.5", "II").unwrap() >= 100);
    }

    #[test]
    fn test_validate_inspection_no_long_input() {
        let long = "A".repeat(65);
        assert!(validate_inspection_no(&long).is_err());
        let ok = "A".repeat(64);
        assert!(validate_inspection_no(&ok).is_ok());
    }
}
