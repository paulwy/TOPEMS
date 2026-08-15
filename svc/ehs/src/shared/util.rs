//! EHS 领域纯函数工具集 —— 校验、归一化、风险与合规计算
//!
//! 本模块仅包含无副作用、无 IO 的纯函数，便于单元测试覆盖。
//! 与 `modules/risk.rs`、`shared/permission.rs` 风格保持一致，
//! 不与 `modules/risk.rs` 中已有的 LEC/矩阵打分函数重叠。

/// EHS 工具层通用错误
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum EhsError {
    #[error("invalid inspection number: {0}")]
    InvalidInspectionNo(String),
    #[error("invalid PPE requirement: {0}")]
    InvalidPpeRequirement(String),
    #[error("invalid parameter: {0}")]
    InvalidParam(String),
}

/// 巡检状态机：与 `models/mod.rs` 中 `qa_ehs_inspection_records.status` 取值一致
pub const INSPECTION_STATES: &[&str] = &[
    "reported",
    "in_progress",
    "pending_review",
    "completed",
    "cancelled",
];

/// 巡检状态机的终态
pub const INSPECTION_TERMINAL: &[&str] = &["completed", "cancelled"];

/// 巡检状态机允许的 (from, to) 转移
pub const INSPECTION_TRANSITIONS: &[(&str, &str)] = &[
    ("reported", "in_progress"),
    ("reported", "cancelled"),
    ("in_progress", "pending_review"),
    ("in_progress", "cancelled"),
    ("in_progress", "reported"),
    ("pending_review", "completed"),
    ("pending_review", "in_progress"),
];

/// 合法的 PPE（个人防护装备）类型
pub const VALID_PPE_TYPES: &[&str] = &[
    "head",
    "eye",
    "ear",
    "respiratory",
    "hand",
    "foot",
    "body",
    "fall",
    "face",
];

/// 需要外部上报的事故严重度（一旦达到这些等级，必须上报）
pub const REPORTABLE_SEVERITIES: &[&str] = &["major", "severe", "fatal"];

/// 所有可能的事故类型
pub const INCIDENT_TYPES: &[&str] = &[
    "injury",
    "illness",
    "property",
    "environmental",
    "fire",
    "near_miss",
    "security",
];

/// 一定需要上报的事故类型（与严重度无关）
pub const ALWAYS_REPORTABLE_TYPES: &[&str] = &["environmental", "fire"];

/// 巡检编号最大长度（不含）
pub const INSPECTION_NO_MAX_LEN: usize = 64;
/// 巡检编号最小长度（含）
pub const INSPECTION_NO_MIN_LEN: usize = 3;

/// 高风险阈值（FMEA RPN 风格：score > 100 视为高风险，需立即处置）
pub const HIGH_RISK_THRESHOLD: f64 = 100.0;

/// OSHA TRIR 标准基数：100 名员工 × 40 小时/周 × 50 周 = 200,000 工时
pub const OSHA_BASE_HOURS: f64 = 200_000.0;

/// 校验巡检编号
///
/// 规则：非空；trim 后长度 [3, 64]；首字符为 ASCII 字母；
/// 仅允许 ASCII 字母数字、`-`、`_`。
pub fn validate_inspection_no(s: &str) -> Result<(), EhsError> {
    if s.is_empty() {
        return Err(EhsError::InvalidInspectionNo("empty".to_string()));
    }
    let trimmed = s.trim();
    if trimmed.len() < INSPECTION_NO_MIN_LEN {
        return Err(EhsError::InvalidInspectionNo(format!(
            "too short: '{}'",
            trimmed
        )));
    }
    if trimmed.len() > INSPECTION_NO_MAX_LEN {
        return Err(EhsError::InvalidInspectionNo(format!(
            "too long: {} chars",
            trimmed.len()
        )));
    }
    let first_ok = trimmed
        .chars()
        .next()
        .map(|c| c.is_ascii_alphabetic())
        .unwrap_or(false);
    if !first_ok {
        return Err(EhsError::InvalidInspectionNo(format!(
            "must start with letter: '{}'",
            trimmed
        )));
    }
    let all_ok = trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if !all_ok {
        return Err(EhsError::InvalidInspectionNo(format!(
            "contains invalid chars: '{}'",
            trimmed
        )));
    }
    Ok(())
}

/// 归一化隐患编号：去首尾空白、内部连续空白压缩为单个 `-`、转大写
pub fn normalize_hazard_code(s: &str) -> String {
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

/// 巡检状态转移是否合法
///
/// 规则：未知状态拒绝；自转移拒绝；终态拒绝；必须在 `INSPECTION_TRANSITIONS` 中。
pub fn is_valid_inspection_status_transition(from: &str, to: &str) -> bool {
    if !INSPECTION_STATES.contains(&from) || !INSPECTION_STATES.contains(&to) {
        return false;
    }
    if INSPECTION_TERMINAL.contains(&from) {
        return false;
    }
    if from == to {
        return false;
    }
    INSPECTION_TRANSITIONS.contains(&(from, to))
}

/// 计算 LEC 风险分值（FMEA RPN 风格）
///
/// 输入会被 clamp 到 [0.0, 10.0]：
/// - `probability`：事故发生概率（0-10）
/// - `severity`：后果严重度（0-10）
/// - `exposure`：暴露频次（0-10）
///
/// 返回三者的乘积（0-1000）。
pub fn calc_risk_score(probability: f64, severity: f64, exposure: f64) -> f64 {
    let p = probability.clamp(0.0, 10.0);
    let s = severity.clamp(0.0, 10.0);
    let e = exposure.clamp(0.0, 10.0);
    p * s * e
}

/// 判定是否为高风险（`calc_risk_score` 返回值 > `HIGH_RISK_THRESHOLD`）
pub fn is_high_risk(score: f64) -> bool {
    score > HIGH_RISK_THRESHOLD
}

/// 校验 PPE 需求字符串
///
/// 接受的取值见 `VALID_PPE_TYPES`，大小写敏感（与现有 FSM/状态字符串风格一致）。
pub fn validate_ppe_requirement(ppe: &str) -> Result<(), EhsError> {
    let trimmed = ppe.trim();
    if trimmed.is_empty() {
        return Err(EhsError::InvalidPpeRequirement("empty".to_string()));
    }
    if !VALID_PPE_TYPES.contains(&trimmed) {
        return Err(EhsError::InvalidPpeRequirement(format!(
            "unknown PPE type: '{}'",
            trimmed
        )));
    }
    Ok(())
}

/// 判定事故是否需要外部上报
///
/// 规则：
/// - 未知严重度或未知事故类型 → 不上报
/// - 严重度 ∈ `REPORTABLE_SEVERITIES`（major/severe/fatal）→ 必须上报
/// - 事故类型 ∈ `ALWAYS_REPORTABLE_TYPES`（environmental/fire）→ 必须上报
/// - 严重度 moderate 且事故类型 ∈ {injury, illness, environmental, fire} → 上报
/// - 其余 → 不上报
pub fn is_incident_reportable(severity: &str, incident_type: &str) -> bool {
    if !INCIDENT_TYPES.contains(&incident_type) {
        return false;
    }
    if ALWAYS_REPORTABLE_TYPES.contains(&incident_type) {
        return true;
    }
    if REPORTABLE_SEVERITIES.contains(&severity) {
        return true;
    }
    if severity == "moderate" {
        return matches!(incident_type, "injury" | "illness");
    }
    false
}

/// 计算事故率（OSHA TRIR：每 200,000 工时的事故数）
///
/// `hours_worked` 为 0 时返回 0.0；负输入按 0 处理。
pub fn calc_incident_rate(incidents: u64, hours_worked: u64) -> f64 {
    if hours_worked == 0 {
        return 0.0;
    }
    (incidents as f64) * OSHA_BASE_HOURS / (hours_worked as f64)
}

/// 归一化化学品名称：去首尾空白、内部连续空白压缩为单空格、每个词首字母大写
pub fn normalize_chemical_name(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_space = true;
    for c in trimmed.chars() {
        if c.is_whitespace() {
            if !prev_space {
                result.push(' ');
                prev_space = true;
            }
        } else {
            if prev_space {
                result.push(c.to_ascii_uppercase());
            } else {
                result.push(c.to_ascii_lowercase());
            }
            prev_space = false;
        }
    }
    result
}

/// 判定合规审计是否到期
///
/// 参数均以“自 epoch 起的天数”（i64）表示，避免引入 chrono。
///
/// 规则：
/// - `frequency_days ≤ 0` → 永不到期（无合规计划）→ 返回 false
/// - `last_audit_epoch_days > current_epoch_days`（即审计日期在未来）→ 返回 false
/// - 否则返回 `(current - last) ≥ frequency`
pub fn is_compliance_due(
    last_audit_epoch_days: i64,
    current_epoch_days: i64,
    frequency_days: i64,
) -> bool {
    if frequency_days <= 0 {
        return false;
    }
    if last_audit_epoch_days > current_epoch_days {
        return false;
    }
    let elapsed = current_epoch_days - last_audit_epoch_days;
    elapsed >= frequency_days
}

#[cfg(test)]
mod tests {
    use super::*;

    // =========================================================================
    // validate_inspection_no —— 20 tests
    // =========================================================================

    #[test]
    fn insp_no_valid_simple() {
        assert!(validate_inspection_no("INSP-001").is_ok());
    }

    #[test]
    fn insp_no_valid_underscore() {
        assert!(validate_inspection_no("QC_12345").is_ok());
    }

    #[test]
    fn insp_no_valid_min_length() {
        assert!(validate_inspection_no("ABC").is_ok());
    }

    #[test]
    fn insp_no_valid_with_padding() {
        assert!(validate_inspection_no("  INSP-001  ").is_ok());
    }

    #[test]
    fn insp_no_valid_mixed_alphanum() {
        assert!(validate_inspection_no("EHS2024X1").is_ok());
    }

    #[test]
    fn insp_no_invalid_empty() {
        let r = validate_inspection_no("");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), EhsError::InvalidInspectionNo(_)));
    }

    #[test]
    fn insp_no_invalid_only_whitespace() {
        let r = validate_inspection_no("   ");
        assert!(r.is_err());
    }

    #[test]
    fn insp_no_invalid_too_short() {
        assert!(validate_inspection_no("AB").is_err());
    }

    #[test]
    fn insp_no_invalid_too_short_after_trim() {
        assert!(validate_inspection_no("  A  ").is_err());
    }

    #[test]
    fn insp_no_invalid_digit_prefix() {
        assert!(validate_inspection_no("123ABC").is_err());
    }

    #[test]
    fn insp_no_invalid_underscore_prefix() {
        assert!(validate_inspection_no("_INSP001").is_err());
    }

    #[test]
    fn insp_no_invalid_dash_prefix() {
        assert!(validate_inspection_no("-INSP001").is_err());
    }

    #[test]
    fn insp_no_invalid_space_inside() {
        assert!(validate_inspection_no("INSP 001").is_err());
    }

    #[test]
    fn insp_no_invalid_slash() {
        assert!(validate_inspection_no("INSP/001").is_err());
    }

    #[test]
    fn insp_no_invalid_dot() {
        assert!(validate_inspection_no("INSP.001").is_err());
    }

    #[test]
    fn insp_no_invalid_unicode_letter() {
        // 首字符非 ASCII 字母
        assert!(validate_inspection_no("检查001").is_err());
    }

    #[test]
    fn insp_no_invalid_too_long() {
        let s = "A".to_string() + &"b".repeat(70);
        assert!(validate_inspection_no(&s).is_err());
    }

    #[test]
    fn insp_no_valid_max_length() {
        // 64 字符正好合法
        let s = "A".to_string() + &"b".repeat(63);
        assert_eq!(s.len(), 64);
        assert!(validate_inspection_no(&s).is_ok());
    }

    #[test]
    fn insp_no_invalid_just_over_max() {
        // 65 字符非法
        let s = "A".to_string() + &"b".repeat(64);
        assert_eq!(s.len(), 65);
        assert!(validate_inspection_no(&s).is_err());
    }

    #[test]
    fn insp_no_error_message_contains_input() {
        let r = validate_inspection_no("123");
        let msg = format!("{}", r.unwrap_err());
        assert!(msg.contains("123") || msg.contains("letter"));
    }

    // =========================================================================
    // normalize_hazard_code —— 12 tests
    // =========================================================================

    #[test]
    fn hazard_code_basic_uppercase() {
        assert_eq!(normalize_hazard_code("hzd001"), "HZD001");
    }

    #[test]
    fn hazard_code_internal_space_becomes_dash() {
        assert_eq!(normalize_hazard_code("  HZD  001  "), "HZD-001");
    }

    #[test]
    fn hazard_code_empty_returns_empty() {
        assert_eq!(normalize_hazard_code(""), "");
    }

    #[test]
    fn hazard_code_only_whitespace_returns_empty() {
        assert_eq!(normalize_hazard_code("   \t\n  "), "");
    }

    #[test]
    fn hazard_code_mixed_whitespace() {
        assert_eq!(normalize_hazard_code("a \t\n  b  c"), "A-B-C");
    }

    #[test]
    fn hazard_code_already_normalized() {
        assert_eq!(normalize_hazard_code("HZD-001"), "HZD-001");
    }

    #[test]
    fn hazard_code_preserves_digits() {
        assert_eq!(normalize_hazard_code("h2024"), "H2024");
    }

    #[test]
    fn hazard_code_single_char() {
        assert_eq!(normalize_hazard_code("x"), "X");
    }

    #[test]
    fn hazard_code_preserves_dash_and_underscore() {
        assert_eq!(normalize_hazard_code("h_z-1"), "H_Z-1");
    }

    #[test]
    fn hazard_code_unicode_preserved_uppercase_ascii_only() {
        // 非 ASCII 字符原样保留（to_ascii_uppercase 不影响它们）
        assert_eq!(normalize_hazard_code("隐患 001"), "隐患-001");
    }

    #[test]
    fn hazard_code_multiple_consecutive_dashes_preserved() {
        // 已存在的 `-` 不与空白合并
        assert_eq!(normalize_hazard_code("a-b"), "A-B");
    }

    #[test]
    fn hazard_code_leading_dash_from_space() {
        // trim 会去掉首尾空白，所以 " a" → "A"（不会产生前导 "-"）
        assert_eq!(normalize_hazard_code(" a"), "A");
    }

    // =========================================================================
    // is_valid_inspection_status_transition —— 22 tests
    // =========================================================================

    #[test]
    fn insp_transition_reported_to_in_progress() {
        assert!(is_valid_inspection_status_transition(
            "reported",
            "in_progress"
        ));
    }

    #[test]
    fn insp_transition_reported_to_cancelled() {
        assert!(is_valid_inspection_status_transition(
            "reported",
            "cancelled"
        ));
    }

    #[test]
    fn insp_transition_in_progress_to_pending_review() {
        assert!(is_valid_inspection_status_transition(
            "in_progress",
            "pending_review"
        ));
    }

    #[test]
    fn insp_transition_in_progress_to_cancelled() {
        assert!(is_valid_inspection_status_transition(
            "in_progress",
            "cancelled"
        ));
    }

    #[test]
    fn insp_transition_in_progress_back_to_reported() {
        assert!(is_valid_inspection_status_transition(
            "in_progress",
            "reported"
        ));
    }

    #[test]
    fn insp_transition_pending_review_to_completed() {
        assert!(is_valid_inspection_status_transition(
            "pending_review",
            "completed"
        ));
    }

    #[test]
    fn insp_transition_pending_review_back_to_in_progress() {
        assert!(is_valid_inspection_status_transition(
            "pending_review",
            "in_progress"
        ));
    }

    #[test]
    fn insp_transition_self_rejected_reported() {
        assert!(!is_valid_inspection_status_transition(
            "reported", "reported"
        ));
    }

    #[test]
    fn insp_transition_self_rejected_in_progress() {
        assert!(!is_valid_inspection_status_transition(
            "in_progress",
            "in_progress"
        ));
    }

    #[test]
    fn insp_transition_terminal_completed_rejected() {
        assert!(!is_valid_inspection_status_transition(
            "completed",
            "in_progress"
        ));
        assert!(!is_valid_inspection_status_transition(
            "completed",
            "reported"
        ));
    }

    #[test]
    fn insp_transition_terminal_cancelled_rejected() {
        assert!(!is_valid_inspection_status_transition(
            "cancelled",
            "reported"
        ));
        assert!(!is_valid_inspection_status_transition(
            "cancelled",
            "in_progress"
        ));
    }

    #[test]
    fn insp_transition_invalid_jump_reported_to_completed() {
        assert!(!is_valid_inspection_status_transition(
            "reported",
            "completed"
        ));
    }

    #[test]
    fn insp_transition_invalid_jump_reported_to_pending_review() {
        assert!(!is_valid_inspection_status_transition(
            "reported",
            "pending_review"
        ));
    }

    #[test]
    fn insp_transition_invalid_jump_in_progress_to_completed() {
        assert!(!is_valid_inspection_status_transition(
            "in_progress",
            "completed"
        ));
    }

    #[test]
    fn insp_transition_invalid_jump_pending_review_to_cancelled() {
        assert!(!is_valid_inspection_status_transition(
            "pending_review",
            "cancelled"
        ));
    }

    #[test]
    fn insp_transition_unknown_from_rejected() {
        assert!(!is_valid_inspection_status_transition(
            "unknown",
            "in_progress"
        ));
    }

    #[test]
    fn insp_transition_unknown_to_rejected() {
        assert!(!is_valid_inspection_status_transition(
            "reported", "garbage"
        ));
    }

    #[test]
    fn insp_transition_both_unknown_rejected() {
        assert!(!is_valid_inspection_status_transition("foo", "bar"));
    }

    #[test]
    fn insp_transition_empty_strings_rejected() {
        assert!(!is_valid_inspection_status_transition("", ""));
    }

    #[test]
    fn insp_transition_case_sensitive() {
        assert!(!is_valid_inspection_status_transition(
            "Reported",
            "in_progress"
        ));
        assert!(!is_valid_inspection_status_transition(
            "reported",
            "IN_PROGRESS"
        ));
    }

    #[test]
    fn insp_transition_completed_to_cancelled_rejected() {
        // completed 是终态
        assert!(!is_valid_inspection_status_transition(
            "completed",
            "cancelled"
        ));
    }

    #[test]
    fn insp_transition_cancelled_to_completed_rejected() {
        // cancelled 是终态
        assert!(!is_valid_inspection_status_transition(
            "cancelled",
            "completed"
        ));
    }

    // =========================================================================
    // calc_risk_score —— 18 tests
    // =========================================================================

    #[test]
    fn risk_score_zero_probability() {
        assert_eq!(calc_risk_score(0.0, 5.0, 5.0), 0.0);
    }

    #[test]
    fn risk_score_zero_severity() {
        assert_eq!(calc_risk_score(5.0, 0.0, 5.0), 0.0);
    }

    #[test]
    fn risk_score_zero_exposure() {
        assert_eq!(calc_risk_score(5.0, 5.0, 0.0), 0.0);
    }

    #[test]
    fn risk_score_all_zero() {
        assert_eq!(calc_risk_score(0.0, 0.0, 0.0), 0.0);
    }

    #[test]
    fn risk_score_all_max() {
        assert_eq!(calc_risk_score(10.0, 10.0, 10.0), 1000.0);
    }

    #[test]
    fn risk_score_mid_values() {
        assert_eq!(calc_risk_score(5.0, 5.0, 5.0), 125.0);
    }

    #[test]
    fn risk_score_fractional_inputs() {
        let s = calc_risk_score(2.5, 4.0, 1.5);
        assert!((s - 15.0).abs() < 1e-9);
    }

    #[test]
    fn risk_score_negative_probability_clamped() {
        assert_eq!(calc_risk_score(-5.0, 5.0, 5.0), 0.0);
    }

    #[test]
    fn risk_score_negative_severity_clamped() {
        assert_eq!(calc_risk_score(5.0, -5.0, 5.0), 0.0);
    }

    #[test]
    fn risk_score_negative_exposure_clamped() {
        assert_eq!(calc_risk_score(5.0, 5.0, -5.0), 0.0);
    }

    #[test]
    fn risk_score_over_max_probability_clamped() {
        assert_eq!(calc_risk_score(100.0, 5.0, 5.0), 250.0);
    }

    #[test]
    fn risk_score_over_max_severity_clamped() {
        assert_eq!(calc_risk_score(5.0, 100.0, 5.0), 250.0);
    }

    #[test]
    fn risk_score_over_max_exposure_clamped() {
        assert_eq!(calc_risk_score(5.0, 5.0, 100.0), 250.0);
    }

    #[test]
    fn risk_score_all_over_max_clamped() {
        assert_eq!(calc_risk_score(50.0, 50.0, 50.0), 1000.0);
    }

    #[test]
    fn risk_score_just_above_high_threshold() {
        // 5 * 5 * 4.01 = 100.25 > 100
        let s = calc_risk_score(5.0, 5.0, 4.01);
        assert!(s > HIGH_RISK_THRESHOLD);
    }

    #[test]
    fn risk_score_just_below_high_threshold() {
        // 5 * 5 * 4 = 100
        let s = calc_risk_score(5.0, 5.0, 4.0);
        assert!(!is_high_risk(s));
    }

    #[test]
    fn risk_score_inf_input_clamped_to_max() {
        // inf clamp to 10.0
        let s = calc_risk_score(f64::INFINITY, 5.0, 5.0);
        assert!((s - 250.0).abs() < 1e-9);
    }

    #[test]
    fn risk_score_nan_input_treated_as_zero_score() {
        // NaN clamp 行为未定义，但应返回有限数（NaN clamp 到 0 或 10）
        // 我们只验证不 panic
        let _ = calc_risk_score(f64::NAN, 5.0, 5.0);
    }

    // =========================================================================
    // is_high_risk —— 8 tests
    // =========================================================================

    #[test]
    fn high_risk_zero_score() {
        assert!(!is_high_risk(0.0));
    }

    #[test]
    fn high_risk_just_below_threshold() {
        assert!(!is_high_risk(99.99));
    }

    #[test]
    fn high_risk_exact_threshold_not_high() {
        // 严格大于
        assert!(!is_high_risk(100.0));
    }

    #[test]
    fn high_risk_just_above_threshold() {
        assert!(is_high_risk(100.01));
    }

    #[test]
    fn high_risk_large_score() {
        assert!(is_high_risk(1000.0));
    }

    #[test]
    fn high_risk_negative_score() {
        assert!(!is_high_risk(-50.0));
    }

    #[test]
    fn high_risk_consistent_with_calc_above() {
        assert!(is_high_risk(calc_risk_score(10.0, 10.0, 5.0)));
    }

    #[test]
    fn high_risk_consistent_with_calc_below() {
        assert!(!is_high_risk(calc_risk_score(1.0, 1.0, 1.0)));
    }

    // =========================================================================
    // validate_ppe_requirement —— 16 tests
    // =========================================================================

    #[test]
    fn ppe_valid_head() {
        assert!(validate_ppe_requirement("head").is_ok());
    }

    #[test]
    fn ppe_valid_eye() {
        assert!(validate_ppe_requirement("eye").is_ok());
    }

    #[test]
    fn ppe_valid_ear() {
        assert!(validate_ppe_requirement("ear").is_ok());
    }

    #[test]
    fn ppe_valid_respiratory() {
        assert!(validate_ppe_requirement("respiratory").is_ok());
    }

    #[test]
    fn ppe_valid_hand() {
        assert!(validate_ppe_requirement("hand").is_ok());
    }

    #[test]
    fn ppe_valid_foot() {
        assert!(validate_ppe_requirement("foot").is_ok());
    }

    #[test]
    fn ppe_valid_body() {
        assert!(validate_ppe_requirement("body").is_ok());
    }

    #[test]
    fn ppe_valid_fall() {
        assert!(validate_ppe_requirement("fall").is_ok());
    }

    #[test]
    fn ppe_valid_face() {
        assert!(validate_ppe_requirement("face").is_ok());
    }

    #[test]
    fn ppe_invalid_empty() {
        let r = validate_ppe_requirement("");
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), EhsError::InvalidPpeRequirement(_)));
    }

    #[test]
    fn ppe_invalid_only_whitespace() {
        assert!(validate_ppe_requirement("   ").is_err());
    }

    #[test]
    fn ppe_valid_with_padding() {
        assert!(validate_ppe_requirement("  head  ").is_ok());
    }

    #[test]
    fn ppe_invalid_unknown_type() {
        assert!(validate_ppe_requirement("helmet").is_err());
    }

    #[test]
    fn ppe_invalid_case_uppercase() {
        assert!(validate_ppe_requirement("HEAD").is_err());
    }

    #[test]
    fn ppe_invalid_case_mixed() {
        assert!(validate_ppe_requirement("Head").is_err());
    }

    #[test]
    fn ppe_invalid_compound() {
        assert!(validate_ppe_requirement("head_eye").is_err());
        assert!(validate_ppe_requirement("head, eye").is_err());
    }

    // =========================================================================
    // is_incident_reportable —— 18 tests
    // =========================================================================

    #[test]
    fn incident_reportable_major_injury() {
        assert!(is_incident_reportable("major", "injury"));
    }

    #[test]
    fn incident_reportable_severe_injury() {
        assert!(is_incident_reportable("severe", "injury"));
    }

    #[test]
    fn incident_reportable_fatal_injury() {
        assert!(is_incident_reportable("fatal", "injury"));
    }

    #[test]
    fn incident_reportable_minor_environmental_always() {
        // environmental 类型无论严重度都上报
        assert!(is_incident_reportable("minor", "environmental"));
    }

    #[test]
    fn incident_reportable_major_environmental() {
        assert!(is_incident_reportable("major", "environmental"));
    }

    #[test]
    fn incident_reportable_minor_fire_always() {
        assert!(is_incident_reportable("minor", "fire"));
    }

    #[test]
    fn incident_reportable_moderate_injury() {
        assert!(is_incident_reportable("moderate", "injury"));
    }

    #[test]
    fn incident_reportable_moderate_illness() {
        assert!(is_incident_reportable("moderate", "illness"));
    }

    #[test]
    fn incident_not_reportable_minor_injury() {
        assert!(!is_incident_reportable("minor", "injury"));
    }

    #[test]
    fn incident_not_reportable_minor_property() {
        assert!(!is_incident_reportable("minor", "property"));
    }

    #[test]
    fn incident_not_reportable_moderate_property() {
        assert!(!is_incident_reportable("moderate", "property"));
    }

    #[test]
    fn incident_not_reportable_major_near_miss_still_reportable() {
        // major 严重度必须上报，即使 near_miss
        assert!(is_incident_reportable("major", "near_miss"));
    }

    #[test]
    fn incident_not_reportable_minor_near_miss() {
        assert!(!is_incident_reportable("minor", "near_miss"));
    }

    #[test]
    fn incident_not_reportable_moderate_security() {
        assert!(!is_incident_reportable("moderate", "security"));
    }

    #[test]
    fn incident_reportable_major_security() {
        assert!(is_incident_reportable("major", "security"));
    }

    #[test]
    fn incident_unknown_severity_not_reportable() {
        assert!(!is_incident_reportable("catastrophic", "injury"));
    }

    #[test]
    fn incident_unknown_type_not_reportable() {
        assert!(!is_incident_reportable("major", "earthquake"));
    }

    #[test]
    fn incident_empty_strings_not_reportable() {
        assert!(!is_incident_reportable("", ""));
    }

    // =========================================================================
    // calc_incident_rate —— 12 tests
    // =========================================================================

    #[test]
    fn incident_rate_zero_incidents() {
        assert_eq!(calc_incident_rate(0, 200_000), 0.0);
    }

    #[test]
    fn incident_rate_one_per_base() {
        assert_eq!(calc_incident_rate(1, 200_000), 1.0);
    }

    #[test]
    fn incident_rate_five_per_base() {
        assert_eq!(calc_incident_rate(5, 200_000), 5.0);
    }

    #[test]
    fn incident_rate_zero_hours() {
        assert_eq!(calc_incident_rate(5, 0), 0.0);
    }

    #[test]
    fn incident_rate_double_base_hours() {
        // 200,000 工时 1 起事故 → 1.0；400,000 工时 1 起事故 → 0.5
        let r = calc_incident_rate(1, 400_000);
        assert!((r - 0.5).abs() < 1e-9);
    }

    #[test]
    fn incident_rate_half_base_hours() {
        // 100,000 工时 1 起事故 → 2.0
        let r = calc_incident_rate(1, 100_000);
        assert!((r - 2.0).abs() < 1e-9);
    }

    #[test]
    fn incident_rate_large_workforce() {
        // 1,000,000 工时 10 起事故 → 2.0
        let r = calc_incident_rate(10, 1_000_000);
        assert!((r - 2.0).abs() < 1e-9);
    }

    #[test]
    fn incident_rate_typical_osha() {
        // OSHA 良好水平：100 工人 1 年（200,000 工时）发生 1 起事故 → TRIR = 1.0
        let r = calc_incident_rate(1, 200_000);
        assert!((r - 1.0).abs() < 1e-9);
    }

    #[test]
    fn incident_rate_high_rate() {
        // 50,000 工时发生 5 起事故 → 5 * 200000 / 50000 = 20.0
        let r = calc_incident_rate(5, 50_000);
        assert!((r - 20.0).abs() < 1e-9);
    }

    #[test]
    fn incident_rate_both_zero() {
        assert_eq!(calc_incident_rate(0, 0), 0.0);
    }

    #[test]
    fn incident_rate_one_incident_one_hour() {
        let r = calc_incident_rate(1, 1);
        assert!((r - 200_000.0).abs() < 1e-3);
    }

    #[test]
    fn incident_rate_huge_workforce() {
        let r = calc_incident_rate(100, 100_000_000);
        assert!((r - 0.2).abs() < 1e-9);
    }

    // =========================================================================
    // normalize_chemical_name —— 12 tests
    // =========================================================================

    #[test]
    fn chem_name_basic_title_case() {
        assert_eq!(normalize_chemical_name("sulfuric acid"), "Sulfuric Acid");
    }

    #[test]
    fn chem_name_already_title_case() {
        assert_eq!(normalize_chemical_name("Sulfuric Acid"), "Sulfuric Acid");
    }

    #[test]
    fn chem_name_all_uppercase() {
        assert_eq!(normalize_chemical_name("SULFURIC ACID"), "Sulfuric Acid");
    }

    #[test]
    fn chem_name_all_lowercase() {
        assert_eq!(normalize_chemical_name("sulfuric acid"), "Sulfuric Acid");
    }

    #[test]
    fn chem_name_mixed_case() {
        assert_eq!(normalize_chemical_name("sUlFuRiC aCiD"), "Sulfuric Acid");
    }

    #[test]
    fn chem_name_empty_returns_empty() {
        assert_eq!(normalize_chemical_name(""), "");
    }

    #[test]
    fn chem_name_only_whitespace_returns_empty() {
        assert_eq!(normalize_chemical_name("   \t  \n  "), "");
    }

    #[test]
    fn chem_name_collapses_multiple_spaces() {
        assert_eq!(normalize_chemical_name("sulfuric   acid"), "Sulfuric Acid");
    }

    #[test]
    fn chem_name_trims_leading_trailing() {
        assert_eq!(
            normalize_chemical_name("  sulfuric acid  "),
            "Sulfuric Acid"
        );
    }

    #[test]
    fn chem_name_single_word() {
        assert_eq!(normalize_chemical_name("methanol"), "Methanol");
    }

    #[test]
    fn chem_name_mixed_whitespace() {
        assert_eq!(
            normalize_chemical_name("hydrogen \t chloride"),
            "Hydrogen Chloride"
        );
    }

    #[test]
    fn chem_name_preserves_digits() {
        assert_eq!(normalize_chemical_name("h2so4"), "H2so4");
    }

    // =========================================================================
    // is_compliance_due —— 14 tests
    // =========================================================================

    #[test]
    fn compliance_due_exact() {
        // 距上次审计正好 frequency 天 → 到期
        assert!(is_compliance_due(100, 200, 100));
    }

    #[test]
    fn compliance_due_overdue() {
        // 距上次审计超过 frequency 天 → 到期
        assert!(is_compliance_due(100, 250, 100));
    }

    #[test]
    fn compliance_not_due_yet() {
        // 距上次审计不足 frequency 天 → 未到期
        assert!(!is_compliance_due(100, 150, 100));
    }

    #[test]
    fn compliance_same_day_not_due() {
        // 0 天 elapsed，frequency > 0 → 未到期
        assert!(!is_compliance_due(100, 100, 30));
    }

    #[test]
    fn compliance_zero_frequency_never_due() {
        assert!(!is_compliance_due(100, 1_000_000, 0));
    }

    #[test]
    fn compliance_negative_frequency_never_due() {
        assert!(!is_compliance_due(100, 1_000_000, -30));
    }

    #[test]
    fn compliance_future_audit_date_not_due() {
        // last_audit 在 current 之后 → 视为异常，返回 false
        assert!(!is_compliance_due(300, 100, 30));
    }

    #[test]
    fn compliance_one_day_before_not_due() {
        assert!(!is_compliance_due(100, 199, 100));
    }

    #[test]
    fn compliance_one_day_after_due() {
        assert!(is_compliance_due(100, 201, 100));
    }

    #[test]
    fn compliance_yearly_audit_due() {
        // 一年（365 天）合规周期
        assert!(is_compliance_due(0, 365, 365));
        assert!(!is_compliance_due(0, 364, 365));
    }

    #[test]
    fn compliance_quarterly_audit() {
        assert!(is_compliance_due(0, 90, 90));
        assert!(!is_compliance_due(0, 89, 90));
    }

    #[test]
    fn compliance_zero_elapsed_zero_frequency() {
        // frequency ≤ 0 → 永不到期
        assert!(!is_compliance_due(100, 100, 0));
    }

    #[test]
    fn compliance_large_values() {
        assert!(is_compliance_due(1_000_000, 2_000_000, 1_000_000));
        assert!(!is_compliance_due(1_000_000, 1_500_000, 1_000_000));
    }

    #[test]
    fn compliance_negative_current_treated_as_future() {
        // current < last_audit → 视为审计在未来，返回 false
        assert!(!is_compliance_due(0, -10, 30));
    }

    // =========================================================================
    // EhsError Display / Clone / Debug —— 8 tests
    // =========================================================================

    #[test]
    fn ehs_error_invalid_insp_no_display_not_empty() {
        let e = EhsError::InvalidInspectionNo("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
        assert!(s.contains("bad") || s.contains("InvalidInspectionNo"));
    }

    #[test]
    fn ehs_error_invalid_ppe_display_not_empty() {
        let e = EhsError::InvalidPpeRequirement("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn ehs_error_invalid_param_display_not_empty() {
        let e = EhsError::InvalidParam("bad".to_string());
        let s = format!("{}", e);
        assert!(!s.is_empty());
    }

    #[test]
    fn ehs_error_clone_and_eq_same() {
        let a = EhsError::InvalidInspectionNo("x".to_string());
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn ehs_error_ne_different_variants() {
        let a = EhsError::InvalidInspectionNo("x".to_string());
        let b = EhsError::InvalidPpeRequirement("x".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn ehs_error_ne_different_payload() {
        let a = EhsError::InvalidInspectionNo("x".to_string());
        let b = EhsError::InvalidInspectionNo("y".to_string());
        assert_ne!(a, b);
    }

    #[test]
    fn ehs_error_debug_format_contains_variant() {
        let a = EhsError::InvalidInspectionNo("abc".to_string());
        let s = format!("{:?}", a);
        assert!(s.contains("InvalidInspectionNo"));
        assert!(s.contains("abc"));
    }

    #[test]
    fn ehs_error_can_be_used_in_match() {
        fn classify(e: &EhsError) -> &'static str {
            match e {
                EhsError::InvalidInspectionNo(_) => "insp",
                EhsError::InvalidPpeRequirement(_) => "ppe",
                EhsError::InvalidParam(_) => "param",
            }
        }
        assert_eq!(classify(&EhsError::InvalidInspectionNo("a".into())), "insp");
        assert_eq!(
            classify(&EhsError::InvalidPpeRequirement("a".into())),
            "ppe"
        );
        assert_eq!(classify(&EhsError::InvalidParam("a".into())), "param");
    }

    // =========================================================================
    // 常量与边界 —— 6 tests
    // =========================================================================

    #[test]
    fn inspection_states_has_five_entries() {
        assert_eq!(INSPECTION_STATES.len(), 5);
        assert!(INSPECTION_STATES.contains(&"reported"));
        assert!(INSPECTION_STATES.contains(&"completed"));
    }

    #[test]
    fn inspection_terminal_has_two_entries() {
        assert_eq!(INSPECTION_TERMINAL.len(), 2);
        assert!(INSPECTION_TERMINAL.contains(&"completed"));
        assert!(INSPECTION_TERMINAL.contains(&"cancelled"));
    }

    #[test]
    fn valid_ppe_types_has_nine_entries() {
        assert_eq!(VALID_PPE_TYPES.len(), 9);
    }

    #[test]
    fn reportable_severities_has_three_entries() {
        assert_eq!(REPORTABLE_SEVERITIES.len(), 3);
        assert!(REPORTABLE_SEVERITIES.contains(&"major"));
        assert!(REPORTABLE_SEVERITIES.contains(&"severe"));
        assert!(REPORTABLE_SEVERITIES.contains(&"fatal"));
    }

    #[test]
    fn always_reportable_types_has_two_entries() {
        assert_eq!(ALWAYS_REPORTABLE_TYPES.len(), 2);
        assert!(ALWAYS_REPORTABLE_TYPES.contains(&"environmental"));
        assert!(ALWAYS_REPORTABLE_TYPES.contains(&"fire"));
    }

    #[test]
    fn high_risk_threshold_is_100() {
        assert_eq!(HIGH_RISK_THRESHOLD, 100.0);
        assert_eq!(OSHA_BASE_HOURS, 200_000.0);
    }
}
