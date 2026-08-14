//! 版本与工程变更状态机校验纯函数模块

use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TransitionError {
    InvalidFromStatus(String),
    InvalidToStatus(String),
    IllegalTransition { from: String, to: String },
}

impl std::fmt::Display for TransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransitionError::InvalidFromStatus(s) => write!(f, "invalid from status: '{}'", s),
            TransitionError::InvalidToStatus(s) => write!(f, "invalid to status: '{}'", s),
            TransitionError::IllegalTransition { from, to } => {
                write!(f, "illegal transition: '{}' → '{}'", from, to)
            }
        }
    }
}

impl std::error::Error for TransitionError {}

/// 版本状态合法转移表
/// draft → review / withdrawn
/// review → approved / draft / withdrawn
/// approved → released / withdrawn
/// released → archived / obsolete
/// archived → obsolete
/// withdrawn → draft（重新起草）
/// obsolete → （终态）
pub fn version_transitions() -> HashMap<&'static str, Vec<&'static str>> {
    let mut m = HashMap::new();
    m.insert("draft", vec!["review", "withdrawn"]);
    m.insert("review", vec!["approved", "draft", "withdrawn"]);
    m.insert("approved", vec!["released", "withdrawn"]);
    m.insert("released", vec!["archived", "obsolete"]);
    m.insert("archived", vec!["obsolete"]);
    m.insert("withdrawn", vec!["draft"]);
    m.insert("obsolete", vec![]); // 终态
    m
}

/// ECN 状态合法转移表
/// draft → pending / withdrawn / cancelled
/// pending → approved / rejected / withdrawn / cancelled
/// approved → implemented
/// rejected → draft（修改后重新提交）/ withdrawn
/// implemented → closed
/// closed → （终态）
/// cancelled → （终态）
/// withdrawn → draft（重新起草）
pub fn ecn_transitions() -> HashMap<&'static str, Vec<&'static str>> {
    let mut m = HashMap::new();
    m.insert("draft", vec!["pending", "withdrawn", "cancelled"]);
    m.insert(
        "pending",
        vec!["approved", "rejected", "withdrawn", "cancelled"],
    );
    m.insert("approved", vec!["implemented", "withdrawn"]);
    m.insert("rejected", vec!["draft", "withdrawn"]);
    m.insert("implemented", vec!["closed"]);
    m.insert("closed", vec![]); // 终态
    m.insert("cancelled", vec![]); // 终态
    m.insert("withdrawn", vec!["draft"]);
    m
}

/// 校验版本状态转移是否合法
pub fn validate_version_transition(from: &str, to: &str) -> Result<(), TransitionError> {
    let transitions = version_transitions();
    let allowed = transitions
        .get(from)
        .ok_or_else(|| TransitionError::InvalidFromStatus(from.to_string()))?;

    if !allowed.contains(&to) {
        // 检查 to 是否是有效状态
        if !transitions.contains_key(to) {
            return Err(TransitionError::InvalidToStatus(to.to_string()));
        }
        return Err(TransitionError::IllegalTransition {
            from: from.to_string(),
            to: to.to_string(),
        });
    }
    Ok(())
}

/// 校验 ECN 状态转移是否合法
pub fn validate_ecn_transition(from: &str, to: &str) -> Result<(), TransitionError> {
    let transitions = ecn_transitions();
    let allowed = transitions
        .get(from)
        .ok_or_else(|| TransitionError::InvalidFromStatus(from.to_string()))?;

    if !allowed.contains(&to) {
        if !transitions.contains_key(to) {
            return Err(TransitionError::InvalidToStatus(to.to_string()));
        }
        return Err(TransitionError::IllegalTransition {
            from: from.to_string(),
            to: to.to_string(),
        });
    }
    Ok(())
}

/// 根据动作推导 ECN 下一状态
/// action: "submit" | "approve" | "reject" | "implement" | "close" | "cancel" | "withdraw"
pub fn next_ecn_status(current: &str, action: &str) -> Result<String, TransitionError> {
    let next = match (current, action) {
        ("draft", "submit") => "pending",
        ("draft", "withdraw") => "withdrawn",
        ("draft", "cancel") => "cancelled",
        ("pending", "approve") => "approved",
        ("pending", "reject") => "rejected",
        ("pending", "withdraw") => "withdrawn",
        ("pending", "cancel") => "cancelled",
        ("approved", "implement") => "implemented",
        ("approved", "withdraw") => "withdrawn",
        ("rejected", "resubmit") => "draft",
        ("rejected", "withdraw") => "withdrawn",
        ("implemented", "close") => "closed",
        ("withdrawn", "resubmit") => "draft",
        _ => {
            return Err(TransitionError::IllegalTransition {
                from: current.to_string(),
                to: format!("action:{}", action),
            })
        }
    };
    Ok(next.to_string())
}

/// 判断状态是否为终态
pub fn is_terminal_status(status: &str, kind: &str) -> bool {
    let transitions = match kind {
        "version" => version_transitions(),
        "ecn" => ecn_transitions(),
        _ => return false,
    };
    match transitions.get(status) {
        Some(allowed) => allowed.is_empty(),
        None => false,
    }
}

/// 获取所有合法的下一状态
pub fn next_valid_statuses(current: &str, kind: &str) -> Vec<&'static str> {
    let transitions = match kind {
        "version" => version_transitions(),
        "ecn" => ecn_transitions(),
        _ => return vec![],
    };
    transitions.get(current).cloned().unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== 版本状态机 ==========

    #[test]
    fn test_version_draft_to_review_ok() {
        assert!(validate_version_transition("draft", "review").is_ok());
    }

    #[test]
    fn test_version_review_to_approved_ok() {
        assert!(validate_version_transition("review", "approved").is_ok());
    }

    #[test]
    fn test_version_approved_to_released_ok() {
        assert!(validate_version_transition("approved", "released").is_ok());
    }

    #[test]
    fn test_version_released_to_archived_ok() {
        assert!(validate_version_transition("released", "archived").is_ok());
    }

    #[test]
    fn test_version_released_to_draft_illegal() {
        assert!(validate_version_transition("released", "draft").is_err());
    }

    #[test]
    fn test_version_archived_to_released_illegal() {
        assert!(validate_version_transition("archived", "released").is_err());
    }

    #[test]
    fn test_version_obsolete_is_terminal() {
        assert!(is_terminal_status("obsolete", "version"));
        assert!(!is_terminal_status("draft", "version"));
    }

    #[test]
    fn test_version_withdrawn_to_draft_ok() {
        assert!(validate_version_transition("withdrawn", "draft").is_ok());
    }

    #[test]
    fn test_version_invalid_from_status() {
        assert!(validate_version_transition("invalid", "draft").is_err());
    }

    #[test]
    fn test_version_invalid_to_status() {
        assert!(validate_version_transition("draft", "invalid").is_err());
    }

    // ========== ECN 状态机 ==========

    #[test]
    fn test_ecn_draft_to_pending_ok() {
        assert!(validate_ecn_transition("draft", "pending").is_ok());
    }

    #[test]
    fn test_ecn_draft_to_approved_illegal() {
        // 关键：防止 update_change_notice 绕过审批
        assert!(validate_ecn_transition("draft", "approved").is_err());
    }

    #[test]
    fn test_ecn_pending_to_approved_ok() {
        assert!(validate_ecn_transition("pending", "approved").is_ok());
    }

    #[test]
    fn test_ecn_pending_to_rejected_ok() {
        assert!(validate_ecn_transition("pending", "rejected").is_ok());
    }

    #[test]
    fn test_ecn_approved_to_implemented_ok() {
        assert!(validate_ecn_transition("approved", "implemented").is_ok());
    }

    #[test]
    fn test_ecn_implemented_to_closed_ok() {
        assert!(validate_ecn_transition("implemented", "closed").is_ok());
    }

    #[test]
    fn test_ecn_rejected_to_pending_illegal() {
        assert!(validate_ecn_transition("rejected", "pending").is_err());
    }

    #[test]
    fn test_ecn_closed_is_terminal() {
        assert!(is_terminal_status("closed", "ecn"));
        assert!(is_terminal_status("cancelled", "ecn"));
        assert!(!is_terminal_status("draft", "ecn"));
    }

    // ========== next_ecn_status ==========

    #[test]
    fn test_next_ecn_submit() {
        assert_eq!(next_ecn_status("draft", "submit").unwrap(), "pending");
    }

    #[test]
    fn test_next_ecn_approve() {
        assert_eq!(next_ecn_status("pending", "approve").unwrap(), "approved");
    }

    #[test]
    fn test_next_ecn_reject() {
        assert_eq!(next_ecn_status("pending", "reject").unwrap(), "rejected");
    }

    #[test]
    fn test_next_ecn_implement() {
        assert_eq!(
            next_ecn_status("approved", "implement").unwrap(),
            "implemented"
        );
    }

    #[test]
    fn test_next_ecn_close() {
        assert_eq!(next_ecn_status("implemented", "close").unwrap(), "closed");
    }

    #[test]
    fn test_next_ecn_cancel() {
        assert_eq!(next_ecn_status("draft", "cancel").unwrap(), "cancelled");
    }

    #[test]
    fn test_next_ecn_withdraw() {
        assert_eq!(next_ecn_status("draft", "withdraw").unwrap(), "withdrawn");
    }

    #[test]
    fn test_next_ecn_resubmit_from_rejected() {
        assert_eq!(next_ecn_status("rejected", "resubmit").unwrap(), "draft");
    }

    #[test]
    fn test_next_ecn_draft_approve_illegal() {
        // 草稿不能直接 approve
        assert!(next_ecn_status("draft", "approve").is_err());
    }

    #[test]
    fn test_next_ecn_closed_submit_illegal() {
        // 终态不能再操作
        assert!(next_ecn_status("closed", "submit").is_err());
    }

    #[test]
    fn test_next_ecn_cancelled_submit_illegal() {
        assert!(next_ecn_status("cancelled", "submit").is_err());
    }

    // ========== next_valid_statuses ==========

    #[test]
    fn test_next_valid_statuses_version_draft() {
        let next = next_valid_statuses("draft", "version");
        assert!(next.contains(&"review"));
        assert!(next.contains(&"withdrawn"));
    }

    #[test]
    fn test_next_valid_statuses_ecn_obsolete() {
        let next = next_valid_statuses("obsolete", "version");
        assert!(next.is_empty()); // 终态
    }

    #[test]
    fn test_next_valid_statuses_unknown_kind() {
        let next = next_valid_statuses("draft", "unknown");
        assert!(next.is_empty());
    }

    // ========== 补充：TransitionError Display ==========
    #[test]
    fn test_transition_error_display_invalid_from() {
        let e = TransitionError::InvalidFromStatus("foo".to_string());
        assert!(format!("{}", e).contains("invalid from status"));
        assert!(format!("{}", e).contains("foo"));
    }

    #[test]
    fn test_transition_error_display_invalid_to() {
        let e = TransitionError::InvalidToStatus("bar".to_string());
        assert!(format!("{}", e).contains("invalid to status"));
        assert!(format!("{}", e).contains("bar"));
    }

    #[test]
    fn test_transition_error_display_illegal_transition() {
        let e = TransitionError::IllegalTransition {
            from: "a".to_string(),
            to: "b".to_string(),
        };
        let msg = format!("{}", e);
        assert!(msg.contains("illegal transition"));
        assert!(msg.contains('a'));
        assert!(msg.contains('b'));
    }

    #[test]
    fn test_transition_error_is_std_error() {
        let e: TransitionError = TransitionError::IllegalTransition {
            from: "x".to_string(),
            to: "y".to_string(),
        };
        // 确保可作为 std::error::Error 使用
        let _: &dyn std::error::Error = &e;
    }

    // ========== 补充：版本状态机剩余合法路径 ==========
    #[test]
    fn test_version_review_to_draft_ok() {
        assert!(validate_version_transition("review", "draft").is_ok());
    }

    #[test]
    fn test_version_review_to_withdrawn_ok() {
        assert!(validate_version_transition("review", "withdrawn").is_ok());
    }

    #[test]
    fn test_version_approved_to_withdrawn_ok() {
        assert!(validate_version_transition("approved", "withdrawn").is_ok());
    }

    #[test]
    fn test_version_archived_to_obsolete_ok() {
        assert!(validate_version_transition("archived", "obsolete").is_ok());
    }

    #[test]
    fn test_version_obsolete_to_anything_illegal() {
        // 终态不可再转移
        assert!(validate_version_transition("obsolete", "draft").is_err());
        assert!(validate_version_transition("obsolete", "released").is_err());
    }

    // ========== 补充：ECN 状态机剩余合法路径 ==========
    #[test]
    fn test_ecn_draft_to_withdrawn_ok() {
        assert!(validate_ecn_transition("draft", "withdrawn").is_ok());
    }

    #[test]
    fn test_ecn_draft_to_cancelled_ok() {
        assert!(validate_ecn_transition("draft", "cancelled").is_ok());
    }

    #[test]
    fn test_ecn_pending_to_withdrawn_ok() {
        assert!(validate_ecn_transition("pending", "withdrawn").is_ok());
    }

    #[test]
    fn test_ecn_pending_to_cancelled_ok() {
        assert!(validate_ecn_transition("pending", "cancelled").is_ok());
    }

    #[test]
    fn test_ecn_approved_to_withdrawn_ok() {
        assert!(validate_ecn_transition("approved", "withdrawn").is_ok());
    }

    #[test]
    fn test_ecn_rejected_to_draft_ok() {
        assert!(validate_ecn_transition("rejected", "draft").is_ok());
    }

    #[test]
    fn test_ecn_rejected_to_withdrawn_ok() {
        assert!(validate_ecn_transition("rejected", "withdrawn").is_ok());
    }

    #[test]
    fn test_ecn_withdrawn_to_draft_ok() {
        assert!(validate_ecn_transition("withdrawn", "draft").is_ok());
    }

    #[test]
    fn test_ecn_closed_to_anything_illegal() {
        assert!(validate_ecn_transition("closed", "draft").is_err());
        assert!(validate_ecn_transition("cancelled", "draft").is_err());
    }

    #[test]
    fn test_ecn_invalid_from_status() {
        assert!(validate_ecn_transition("nonexistent", "draft").is_err());
    }

    #[test]
    fn test_ecn_invalid_to_status() {
        assert!(validate_ecn_transition("draft", "nonexistent").is_err());
    }

    // ========== 补充：is_terminal_status 边界 ==========
    #[test]
    fn test_is_terminal_status_unknown_kind() {
        assert!(!is_terminal_status("obsolete", "unknown_kind"));
    }

    #[test]
    fn test_is_terminal_status_unknown_status() {
        // 未知状态非终态
        assert!(!is_terminal_status("nonexistent", "version"));
        assert!(!is_terminal_status("nonexistent", "ecn"));
    }

    #[test]
    fn test_is_terminal_status_non_terminal_states() {
        assert!(!is_terminal_status("review", "version"));
        assert!(!is_terminal_status("pending", "ecn"));
        assert!(!is_terminal_status("implemented", "ecn"));
    }

    // ========== 补充：next_ecn_status 剩余动作 ==========
    #[test]
    fn test_next_ecn_withdraw_from_pending() {
        assert_eq!(next_ecn_status("pending", "withdraw").unwrap(), "withdrawn");
    }

    #[test]
    fn test_next_ecn_cancel_from_pending() {
        assert_eq!(next_ecn_status("pending", "cancel").unwrap(), "cancelled");
    }

    #[test]
    fn test_next_ecn_withdraw_from_approved() {
        assert_eq!(
            next_ecn_status("approved", "withdraw").unwrap(),
            "withdrawn"
        );
    }

    #[test]
    fn test_next_ecn_resubmit_from_withdrawn() {
        assert_eq!(next_ecn_status("withdrawn", "resubmit").unwrap(), "draft");
    }

    #[test]
    fn test_next_ecn_withdraw_from_rejected() {
        assert_eq!(
            next_ecn_status("rejected", "withdraw").unwrap(),
            "withdrawn"
        );
    }

    #[test]
    fn test_next_ecn_unknown_action_illegal() {
        assert!(next_ecn_status("draft", "unknown_action").is_err());
    }

    #[test]
    fn test_next_ecn_implement_from_pending_illegal() {
        // pending 不能直接 implement
        assert!(next_ecn_status("pending", "implement").is_err());
    }

    // ========== 补充：转换表内容 ==========
    #[test]
    fn test_version_transitions_table_draft_targets() {
        let t = version_transitions();
        assert_eq!(t.get("draft").unwrap().len(), 2);
        assert_eq!(t.get("obsolete").unwrap().len(), 0);
    }

    #[test]
    fn test_ecn_transitions_table_pending_targets() {
        let t = ecn_transitions();
        assert_eq!(t.get("pending").unwrap().len(), 4);
        assert!(t.get("closed").unwrap().is_empty());
        assert!(t.get("cancelled").unwrap().is_empty());
    }

    #[test]
    fn test_next_valid_statuses_version_released() {
        let next = next_valid_statuses("released", "version");
        assert!(next.contains(&"archived"));
        assert!(next.contains(&"obsolete"));
    }

    #[test]
    fn test_next_valid_statuses_ecn_draft() {
        let next = next_valid_statuses("draft", "ecn");
        assert!(next.contains(&"pending"));
        assert!(next.contains(&"withdrawn"));
        assert!(next.contains(&"cancelled"));
    }

    #[test]
    fn test_next_valid_statuses_unknown_status_empty() {
        assert!(next_valid_statuses("unknown_status", "version").is_empty());
        assert!(next_valid_statuses("unknown_status", "ecn").is_empty());
    }
}
