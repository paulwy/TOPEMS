//! 有限状态机（FSM）公共基础模块
//!
//! 提供 5 个业务服务（QMS / APS / MES / TMS / WMS）共享的 FSM 错误类型与校验工具。
//! 各服务的具体状态机定义（状态常量、`*_can_transition`、`*_requires_approval`、
//! `is_valid_*_status`）仍保留在各自 `src/shared/fsm.rs` 中，仅引用本模块的公共基础。

/// FSM 统一错误类型
///
/// 业务服务的 `*_can_transition` / `*_requires_approval` 函数返回 `Result<(), FsmError>`。
#[derive(Debug, Clone, thiserror::Error, PartialEq)]
pub enum FsmError {
    /// 源状态为终态，不能再发生状态迁移
    #[error("state '{0}' is terminal and cannot transition")]
    TerminalState(String),
    /// 源状态到目标状态的迁移不在允许的迁移对中
    #[error("invalid transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
    /// 输入的状态字符串不在该 FSM 的合法状态列表中
    #[error("unknown status: {0}")]
    UnknownStatus(String),
}

/// 校验 `status` 是否在 `allowed` 状态列表中。
///
/// 合法返回 `Ok(())`，否则返回 `FsmError::UnknownStatus`。
pub fn validate_status(status: &str, allowed: &[&str]) -> Result<(), FsmError> {
    if allowed.contains(&status) {
        Ok(())
    } else {
        Err(FsmError::UnknownStatus(status.to_string()))
    }
}

/// 校验 `from -> to` 迁移是否合法。
///
/// 校验顺序：
/// 1. `from` / `to` 必须都在 `all_states` 中（否则 `UnknownStatus`）；
/// 2. `from` 不能是 `terminal` 终态（否则 `TerminalState`）；
/// 3. `(from, to)` 必须在 `allowed_pairs` 中（否则 `InvalidTransition`）。
pub fn check_pair(
    from: &str,
    to: &str,
    allowed_pairs: &[(&str, &str)],
    terminal: &[&str],
    all_states: &[&str],
) -> Result<(), FsmError> {
    validate_status(from, all_states)?;
    validate_status(to, all_states)?;
    if terminal.contains(&from) {
        return Err(FsmError::TerminalState(from.to_string()));
    }
    if allowed_pairs.contains(&(from, to)) {
        Ok(())
    } else {
        Err(FsmError::InvalidTransition {
            from: from.to_string(),
            to: to.to_string(),
        })
    }
}

/// `check_pair` 的 bool 包装：自转移拒绝，其余同 `check_pair`。
///
/// 供各服务的 `is_valid_*_status_transition` 函数复用，消除重复模板代码。
pub fn is_valid_transition(
    from: &str,
    to: &str,
    allowed_pairs: &[(&str, &str)],
    terminal: &[&str],
    all_states: &[&str],
) -> bool {
    if from == to {
        return false;
    }
    check_pair(from, to, allowed_pairs, terminal, all_states).is_ok()
}

// ==================== FsmDef 结构体 ====================

/// 有限状态机定义（声明式）。
///
/// 将 5 个服务（MES/APS/QMS/TMS/WMS）共 32 个 FSM 的 "4 常量 + 3 函数" 模板
/// 收敛为一个结构体 + 3 个方法，消除 ~96 个重复的包装函数。
///
/// 各服务只需定义 `pub const XXX: FsmDef = FsmDef { ... };`，
/// 调用方用 `XXX.can_transition(from, to)` 替代 `xxx_can_transition(from, to)`。
/// 兼容函数可委托给 `FsmDef` 方法，保持 `use crate::shared::fsm::*` 调用方无需改动。
pub struct FsmDef {
    /// 全部合法状态
    pub states: &'static [&'static str],
    /// 终态（不可再迁移）
    pub terminal: &'static [&'static str],
    /// 允许的迁移对 (from, to)
    pub transitions: &'static [(&'static str, &'static str)],
    /// 需要审批的迁移对 (from, to)
    pub approval_transitions: &'static [(&'static str, &'static str)],
}

impl FsmDef {
    /// 校验 `from -> to` 迁移是否合法。
    ///
    /// 等价于 `check_pair(from, to, self.transitions, self.terminal, self.states)`。
    pub fn can_transition(&self, from: &str, to: &str) -> Result<(), FsmError> {
        check_pair(from, to, self.transitions, self.terminal, self.states)
    }

    /// 判断 `from -> to` 是否需要审批。
    pub fn requires_approval(&self, from: &str, to: &str) -> bool {
        self.approval_transitions.contains(&(from, to))
    }

    /// 判断 `status` 是否为该 FSM 的合法状态。
    pub fn is_valid_status(&self, status: &str) -> bool {
        self.states.contains(&status)
    }

    /// 判断 `from -> to` 是否为有效迁移（自转移拒绝，其余同 `can_transition`）。
    pub fn is_valid_transition(&self, from: &str, to: &str) -> bool {
        if from == to {
            return false;
        }
        self.can_transition(from, to).is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_status_ok_for_known() {
        assert!(validate_status("a", &["a", "b"]).is_ok());
        assert!(validate_status("b", &["a", "b"]).is_ok());
    }

    #[test]
    fn validate_status_err_for_unknown() {
        match validate_status("c", &["a", "b"]) {
            Err(FsmError::UnknownStatus(s)) => assert_eq!(s, "c"),
            other => panic!("expected UnknownStatus(c), got {:?}", other),
        }
    }

    #[test]
    fn check_pair_ok_for_allowed() {
        assert!(check_pair("a", "b", &[("a", "b")], &[], &["a", "b"]).is_ok());
    }

    #[test]
    fn check_pair_unknown_from() {
        match check_pair("x", "b", &[("a", "b")], &[], &["a", "b"]) {
            Err(FsmError::UnknownStatus(s)) => assert_eq!(s, "x"),
            other => panic!("expected UnknownStatus(x), got {:?}", other),
        }
    }

    #[test]
    fn check_pair_unknown_to() {
        match check_pair("a", "x", &[("a", "b")], &[], &["a", "b"]) {
            Err(FsmError::UnknownStatus(s)) => assert_eq!(s, "x"),
            other => panic!("expected UnknownStatus(x), got {:?}", other),
        }
    }

    #[test]
    fn check_pair_terminal_blocks() {
        match check_pair("t", "a", &[("a", "b")], &["t"], &["a", "b", "t"]) {
            Err(FsmError::TerminalState(s)) => assert_eq!(s, "t"),
            other => panic!("expected TerminalState(t), got {:?}", other),
        }
    }

    #[test]
    fn check_pair_invalid_transition() {
        match check_pair("a", "t", &[("a", "b")], &[], &["a", "b", "t"]) {
            Err(FsmError::InvalidTransition { from, to }) => {
                assert_eq!(from, "a");
                assert_eq!(to, "t");
            }
            other => panic!("expected InvalidTransition a->t, got {:?}", other),
        }
    }

    #[test]
    fn fsm_error_display_messages() {
        let term = FsmError::TerminalState("done".into());
        assert!(format!("{}", term).contains("done"));
        assert!(format!("{}", term).contains("terminal"));

        let inv = FsmError::InvalidTransition {
            from: "a".into(),
            to: "b".into(),
        };
        let msg = format!("{}", inv);
        assert!(msg.contains("a") && msg.contains("b") && msg.contains("invalid"));

        let unk = FsmError::UnknownStatus("weird".into());
        assert!(format!("{}", unk).contains("weird"));
        assert!(format!("{}", unk).contains("unknown"));
    }

    #[test]
    fn fsm_error_clone_and_eq() {
        let e1 = FsmError::TerminalState("x".into());
        let e2 = e1.clone();
        assert_eq!(e1, e2);

        let e3 = FsmError::InvalidTransition {
            from: "a".into(),
            to: "b".into(),
        };
        let e4 = e3.clone();
        assert_eq!(e3, e4);

        assert_ne!(e1, e3);
        assert_ne!(e1, FsmError::UnknownStatus("x".into()));
    }

    #[test]
    fn fsm_error_debug_format() {
        let err = FsmError::InvalidTransition {
            from: "a".into(),
            to: "b".into(),
        };
        let debug = format!("{:?}", err);
        assert!(debug.contains("InvalidTransition"));
        assert!(debug.contains("a"));
        assert!(debug.contains("b"));
    }
}
