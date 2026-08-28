//! 审计日志模型 — 统一使用 shared-bootstrap 通用实现
//!
//! 详见 [topems_shared_bootstrap::audit] 模块

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

/// 将审计动作归类为 create / read / update / delete / other。
pub fn classify_audit_action(action: &str) -> &'static str {
    let normalized = action.trim().to_lowercase();
    let a = normalized.as_str();
    if matches!(a, "create" | "insert" | "add" | "post") {
        "create"
    } else if matches!(a, "read" | "get" | "list" | "view" | "fetch") {
        "read"
    } else if matches!(a, "update" | "put" | "patch" | "modify" | "edit") {
        "update"
    } else if matches!(a, "delete" | "remove" | "drop" | "del") {
        "delete"
    } else {
        "other"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_create() {
        assert_eq!(classify_audit_action("create"), "create");
        assert_eq!(classify_audit_action("INSERT"), "create");
        assert_eq!(classify_audit_action("Add"), "create");
        assert_eq!(classify_audit_action("post"), "create");
    }

    #[test]
    fn test_classify_read() {
        assert_eq!(classify_audit_action("read"), "read");
        assert_eq!(classify_audit_action("GET"), "read");
        assert_eq!(classify_audit_action("list"), "read");
        assert_eq!(classify_audit_action("view"), "read");
        assert_eq!(classify_audit_action("fetch"), "read");
    }

    #[test]
    fn test_classify_update() {
        assert_eq!(classify_audit_action("update"), "update");
        assert_eq!(classify_audit_action("PUT"), "update");
        assert_eq!(classify_audit_action("patch"), "update");
        assert_eq!(classify_audit_action("modify"), "update");
        assert_eq!(classify_audit_action("edit"), "update");
    }

    #[test]
    fn test_classify_delete() {
        assert_eq!(classify_audit_action("delete"), "delete");
        assert_eq!(classify_audit_action("remove"), "delete");
        assert_eq!(classify_audit_action("DROP"), "delete");
        assert_eq!(classify_audit_action("del"), "delete");
    }

    #[test]
    fn test_classify_other() {
        assert_eq!(classify_audit_action("login"), "other");
        assert_eq!(classify_audit_action("export"), "other");
        assert_eq!(classify_audit_action(""), "other");
    }

    #[test]
    fn test_classify_trims_whitespace() {
        assert_eq!(classify_audit_action("  create  "), "create");
        assert_eq!(classify_audit_action("\tread\n"), "read");
    }
}
