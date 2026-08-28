//! 审计日志模型 — 统一使用 shared-bootstrap 通用实现
//!
//! 详见 [topems_shared_bootstrap::audit] 模块

#[allow(unused_imports)]
pub use topems_shared_bootstrap::audit::{AuditEventParams, AuditLog, ListAuditLogsQuery};

/// 根据操作动作分类审计日志类别
pub fn audit_action_category(action: &str) -> &'static str {
    let a = action.to_lowercase();
    if a.contains("create") || a.contains("insert") || a.contains("add") {
        "create"
    } else if a.contains("update") || a.contains("modify") || a.contains("edit") {
        "update"
    } else if a.contains("delete") || a.contains("remove") {
        "delete"
    } else if a.contains("read") || a.contains("view") || a.contains("list") || a.contains("get") {
        "read"
    } else if a.contains("login") || a.contains("logout") || a.contains("auth") {
        "auth"
    } else {
        "other"
    }
}

/// 判断审计字段是否为敏感字段
pub fn is_sensitive_audit_field(field: &str) -> bool {
    let f = field.to_lowercase();
    matches!(
        f.as_str(),
        "password"
            | "token"
            | "secret"
            | "api_key"
            | "private_key"
            | "credential"
            | "access_token"
            | "refresh_token"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_category_create() {
        assert_eq!(audit_action_category("create_feedback"), "create");
        assert_eq!(audit_action_category("INSERT"), "create");
        assert_eq!(audit_action_category("add_user"), "create");
    }

    #[test]
    fn test_audit_category_update() {
        assert_eq!(audit_action_category("update_feedback"), "update");
        assert_eq!(audit_action_category("modify_status"), "update");
        assert_eq!(audit_action_category("edit_profile"), "update");
    }

    #[test]
    fn test_audit_category_delete() {
        assert_eq!(audit_action_category("delete_feedback"), "delete");
        assert_eq!(audit_action_category("remove_user"), "delete");
    }

    #[test]
    fn test_audit_category_read() {
        assert_eq!(audit_action_category("read_feedback"), "read");
        assert_eq!(audit_action_category("view_list"), "read");
        assert_eq!(audit_action_category("list_items"), "read");
        assert_eq!(audit_action_category("get_detail"), "read");
    }

    #[test]
    fn test_audit_category_auth() {
        assert_eq!(audit_action_category("login"), "auth");
        assert_eq!(audit_action_category("logout"), "auth");
        assert_eq!(audit_action_category("authenticate"), "auth");
    }

    #[test]
    fn test_audit_category_other() {
        assert_eq!(audit_action_category("export"), "other");
        assert_eq!(audit_action_category("notify"), "other");
        assert_eq!(audit_action_category(""), "other");
    }

    #[test]
    fn test_audit_category_case_insensitive() {
        assert_eq!(audit_action_category("CREATE"), "create");
        assert_eq!(audit_action_category("Delete"), "delete");
        assert_eq!(audit_action_category("LOGIN"), "auth");
    }

    #[test]
    fn test_sensitive_field_password() {
        assert!(is_sensitive_audit_field("password"));
        assert!(is_sensitive_audit_field("PASSWORD"));
        assert!(is_sensitive_audit_field("Password"));
    }

    #[test]
    fn test_sensitive_field_token() {
        assert!(is_sensitive_audit_field("token"));
        assert!(is_sensitive_audit_field("access_token"));
        assert!(is_sensitive_audit_field("refresh_token"));
    }

    #[test]
    fn test_sensitive_field_secret() {
        assert!(is_sensitive_audit_field("secret"));
        assert!(is_sensitive_audit_field("api_key"));
        assert!(is_sensitive_audit_field("private_key"));
        assert!(is_sensitive_audit_field("credential"));
    }

    #[test]
    fn test_sensitive_field_not_sensitive() {
        assert!(!is_sensitive_audit_field("username"));
        assert!(!is_sensitive_audit_field("email"));
        assert!(!is_sensitive_audit_field("name"));
        assert!(!is_sensitive_audit_field("id"));
        assert!(!is_sensitive_audit_field(""));
    }

    #[test]
    fn test_sensitive_field_case_insensitive() {
        assert!(is_sensitive_audit_field("TOKEN"));
        assert!(is_sensitive_audit_field("Secret"));
        assert!(!is_sensitive_audit_field("USERNAME"));
    }
}
