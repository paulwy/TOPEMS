//! Pure domain helpers for the lowcode service.
//!
//! All functions are pure (no I/O, no async) and safe to unit-test in
//! isolation. Helpers cover app-name validation, component-id / property-key /
//! page-path normalization, page-type / event-action / data-source-type
//! validation, form-schema validation, workflow-status FSM checks, and
//! complexity-score calculation.

use thiserror::Error;

/// Lowcode domain error returned by validation helpers.
#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum LowcodeError {
    #[error("invalid app name: {0}")]
    InvalidAppName(String),
    #[error("invalid form schema: {0}")]
    InvalidFormSchema(String),
    #[error("invalid data source type: {0}")]
    InvalidDataSourceType(String),
}

/// Validate an app name.
///
/// A valid app name is 2-50 characters long after trimming and contains at
/// least one non-whitespace character.
pub fn validate_app_name(name: &str) -> Result<(), LowcodeError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(LowcodeError::InvalidAppName("empty app name".to_string()));
    }
    let len = trimmed.chars().count();
    if len < 2 {
        return Err(LowcodeError::InvalidAppName(
            "app name must be at least 2 characters".to_string(),
        ));
    }
    if len > 50 {
        return Err(LowcodeError::InvalidAppName(
            "app name must be at most 50 characters".to_string(),
        ));
    }
    Ok(())
}

/// Normalize a component id: trim, lowercase, replace non-alphanumeric
/// character runs with single underscores, and strip leading/trailing
/// underscores.
pub fn normalize_component_id(id: &str) -> String {
    let lower = id.trim().to_lowercase();
    let mut result = String::with_capacity(lower.len());
    let mut prev_underscore = false;
    for c in lower.chars() {
        if c.is_alphanumeric() {
            result.push(c);
            prev_underscore = false;
        } else if !prev_underscore {
            result.push('_');
            prev_underscore = true;
        }
    }
    if result.ends_with('_') {
        result.pop();
    }
    if result.starts_with('_') {
        result.remove(0);
    }
    result
}

/// Return `true` if `page_type` is one of the recognized page types.
pub fn is_valid_page_type(page_type: &str) -> bool {
    matches!(
        page_type,
        "list" | "detail" | "form" | "dashboard" | "custom"
    )
}

/// Validate a form schema JSON string.
///
/// The string must be valid JSON and must deserialize to a JSON object.
pub fn validate_form_schema(json: &str) -> Result<(), LowcodeError> {
    let trimmed = json.trim();
    if trimmed.is_empty() {
        return Err(LowcodeError::InvalidFormSchema("empty schema".to_string()));
    }
    let value: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|e| LowcodeError::InvalidFormSchema(format!("invalid JSON: {e}")))?;
    if !value.is_object() {
        return Err(LowcodeError::InvalidFormSchema(
            "schema must be a JSON object".to_string(),
        ));
    }
    Ok(())
}

/// Check whether a workflow status transition is allowed.
///
/// Valid statuses: `draft`, `active`, `inactive`, `archived`. Same-status
/// transitions are always allowed. `archived` is terminal.
pub fn is_valid_workflow_status_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "draft" => matches!(to, "active" | "archived"),
        "active" => matches!(to, "inactive" | "draft" | "archived"),
        "inactive" => matches!(to, "active" | "draft" | "archived"),
        "archived" => false,
        _ => false,
    }
}

/// Normalize a property key: trim, lowercase, replace whitespace runs with
/// underscores.
pub fn normalize_property_key(key: &str) -> String {
    key.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("_")
}

/// Validate a data source type against the known set.
pub fn validate_data_source_type(ds_type: &str) -> Result<(), LowcodeError> {
    let trimmed = ds_type.trim();
    if trimmed.is_empty() {
        return Err(LowcodeError::InvalidDataSourceType(
            "empty data source type".to_string(),
        ));
    }
    if !matches!(trimmed, "database" | "api" | "static" | "computed") {
        return Err(LowcodeError::InvalidDataSourceType(format!(
            "unknown data source type: {trimmed}"
        )));
    }
    Ok(())
}

/// Calculate a complexity score from the number of components and bindings.
///
/// Each component contributes 1.0 and each binding contributes 0.5.
pub fn calc_complexity_score(components: u32, bindings: u32) -> f64 {
    components as f64 + bindings as f64 * 0.5
}

/// Return `true` if `action` is one of the recognized event actions.
pub fn is_valid_event_action(action: &str) -> bool {
    matches!(
        action,
        "click" | "change" | "submit" | "load" | "focus" | "blur"
    )
}

/// Normalize a page path: ensure a leading `/` and remove any trailing `/`
/// (except for the root path itself).
pub fn normalize_page_path(path: &str) -> String {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return "/".to_string();
    }
    let with_slash = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    };
    if with_slash.len() > 1 && with_slash.ends_with('/') {
        with_slash[..with_slash.len() - 1].to_string()
    } else {
        with_slash
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== validate_app_name ==========

    #[test]
    fn test_validate_app_name_valid() {
        assert!(validate_app_name("My App").is_ok());
    }

    #[test]
    fn test_validate_app_name_min_length() {
        assert!(validate_app_name("Ab").is_ok());
    }

    #[test]
    fn test_validate_app_name_max_length() {
        let name = "a".repeat(50);
        assert!(validate_app_name(&name).is_ok());
    }

    #[test]
    fn test_validate_app_name_trims_whitespace() {
        assert!(validate_app_name("  My App  ").is_ok());
    }

    #[test]
    fn test_validate_app_name_empty() {
        assert!(validate_app_name("").is_err());
    }

    #[test]
    fn test_validate_app_name_only_whitespace() {
        assert!(validate_app_name("   ").is_err());
    }

    #[test]
    fn test_validate_app_name_too_short() {
        assert!(validate_app_name("A").is_err());
    }

    #[test]
    fn test_validate_app_name_too_long() {
        let name = "a".repeat(51);
        assert!(validate_app_name(&name).is_err());
    }

    #[test]
    fn test_validate_app_name_unicode_count() {
        assert!(validate_app_name("应用").is_ok());
    }

    #[test]
    fn test_validate_app_name_error_type() {
        let err = validate_app_name("").unwrap_err();
        assert_eq!(
            err,
            LowcodeError::InvalidAppName("empty app name".to_string())
        );
    }

    // ========== normalize_component_id ==========

    #[test]
    fn test_normalize_component_id_basic() {
        assert_eq!(normalize_component_id("  Button_1  "), "button_1");
    }

    #[test]
    fn test_normalize_component_id_lowercase() {
        assert_eq!(normalize_component_id("FormInput"), "forminput");
    }

    #[test]
    fn test_normalize_component_id_special_chars() {
        assert_eq!(normalize_component_id("my-component.id"), "my_component_id");
    }

    #[test]
    fn test_normalize_component_id_multiple_special() {
        assert_eq!(normalize_component_id("a---b"), "a_b");
    }

    #[test]
    fn test_normalize_component_id_leading_trailing_special() {
        assert_eq!(normalize_component_id("--abc--"), "abc");
    }

    #[test]
    fn test_normalize_component_id_empty() {
        assert_eq!(normalize_component_id(""), "");
    }

    #[test]
    fn test_normalize_component_id_only_special() {
        assert_eq!(normalize_component_id("---"), "");
    }

    #[test]
    fn test_normalize_component_id_alphanumeric() {
        assert_eq!(normalize_component_id("abc123"), "abc123");
    }

    #[test]
    fn test_normalize_component_id_spaces() {
        assert_eq!(normalize_component_id("my component"), "my_component");
    }

    #[test]
    fn test_normalize_component_id_unicode() {
        assert_eq!(normalize_component_id("组件_1"), "组件_1");
    }

    // ========== is_valid_page_type ==========

    #[test]
    fn test_page_type_valid_all() {
        for t in ["list", "detail", "form", "dashboard", "custom"] {
            assert!(is_valid_page_type(t), "page type {t} should be valid");
        }
    }

    #[test]
    fn test_page_type_invalid_values() {
        assert!(!is_valid_page_type("table"));
        assert!(!is_valid_page_type(""));
        assert!(!is_valid_page_type("FORM"));
        assert!(!is_valid_page_type("form "));
    }

    // ========== validate_form_schema ==========

    #[test]
    fn test_validate_form_schema_valid_object() {
        assert!(validate_form_schema(r#"{"fields": []}"#).is_ok());
    }

    #[test]
    fn test_validate_form_schema_valid_empty_object() {
        assert!(validate_form_schema("{}").is_ok());
    }

    #[test]
    fn test_validate_form_schema_trims_whitespace() {
        assert!(validate_form_schema(r#"  {"a": 1}  "#).is_ok());
    }

    #[test]
    fn test_validate_form_schema_empty() {
        assert!(validate_form_schema("").is_err());
    }

    #[test]
    fn test_validate_form_schema_only_whitespace() {
        assert!(validate_form_schema("   ").is_err());
    }

    #[test]
    fn test_validate_form_schema_invalid_json() {
        assert!(validate_form_schema(r#"{"a": }"#).is_err());
        assert!(validate_form_schema("not json").is_err());
    }

    #[test]
    fn test_validate_form_schema_array_rejected() {
        assert!(validate_form_schema(r#"[1, 2, 3]"#).is_err());
    }

    #[test]
    fn test_validate_form_schema_string_rejected() {
        assert!(validate_form_schema(r#""hello""#).is_err());
    }

    #[test]
    fn test_validate_form_schema_number_rejected() {
        assert!(validate_form_schema("42").is_err());
    }

    #[test]
    fn test_validate_form_schema_null_rejected() {
        assert!(validate_form_schema("null").is_err());
    }

    #[test]
    fn test_validate_form_schema_boolean_rejected() {
        assert!(validate_form_schema("true").is_err());
    }

    #[test]
    fn test_validate_form_schema_error_type() {
        let err = validate_form_schema("").unwrap_err();
        assert_eq!(
            err,
            LowcodeError::InvalidFormSchema("empty schema".to_string())
        );
    }

    #[test]
    fn test_validate_form_schema_nested_object() {
        let schema = r#"{"fields": [{"name": "x", "type": "text"}]}"#;
        assert!(validate_form_schema(schema).is_ok());
    }

    // ========== is_valid_workflow_status_transition ==========

    #[test]
    fn test_workflow_transition_same_status_allowed() {
        for s in ["draft", "active", "inactive", "archived"] {
            assert!(
                is_valid_workflow_status_transition(s, s),
                "same-status {s} should be allowed"
            );
        }
    }

    #[test]
    fn test_workflow_transition_draft_to_active() {
        assert!(is_valid_workflow_status_transition("draft", "active"));
    }

    #[test]
    fn test_workflow_transition_draft_to_archived() {
        assert!(is_valid_workflow_status_transition("draft", "archived"));
    }

    #[test]
    fn test_workflow_transition_draft_to_inactive_rejected() {
        assert!(!is_valid_workflow_status_transition("draft", "inactive"));
    }

    #[test]
    fn test_workflow_transition_active_to_inactive() {
        assert!(is_valid_workflow_status_transition("active", "inactive"));
    }

    #[test]
    fn test_workflow_transition_active_to_draft() {
        assert!(is_valid_workflow_status_transition("active", "draft"));
    }

    #[test]
    fn test_workflow_transition_active_to_archived() {
        assert!(is_valid_workflow_status_transition("active", "archived"));
    }

    #[test]
    fn test_workflow_transition_inactive_to_active() {
        assert!(is_valid_workflow_status_transition("inactive", "active"));
    }

    #[test]
    fn test_workflow_transition_inactive_to_draft() {
        assert!(is_valid_workflow_status_transition("inactive", "draft"));
    }

    #[test]
    fn test_workflow_transition_inactive_to_archived() {
        assert!(is_valid_workflow_status_transition("inactive", "archived"));
    }

    #[test]
    fn test_workflow_transition_archived_terminal() {
        assert!(!is_valid_workflow_status_transition("archived", "draft"));
        assert!(!is_valid_workflow_status_transition("archived", "active"));
        assert!(!is_valid_workflow_status_transition("archived", "inactive"));
    }

    #[test]
    fn test_workflow_transition_unknown_status_rejected() {
        assert!(!is_valid_workflow_status_transition("unknown", "draft"));
        assert!(!is_valid_workflow_status_transition("draft", "unknown"));
    }

    #[test]
    fn test_workflow_transition_empty_status_rejected() {
        assert!(!is_valid_workflow_status_transition("", "draft"));
        assert!(!is_valid_workflow_status_transition("draft", ""));
    }

    // ========== normalize_property_key ==========

    #[test]
    fn test_normalize_property_key_basic() {
        assert_eq!(normalize_property_key("  First Name  "), "first_name");
    }

    #[test]
    fn test_normalize_property_key_lowercase() {
        assert_eq!(normalize_property_key("EmailAddr"), "emailaddr");
    }

    #[test]
    fn test_normalize_property_key_multiple_spaces() {
        assert_eq!(normalize_property_key("a  b  c"), "a_b_c");
    }

    #[test]
    fn test_normalize_property_key_empty() {
        assert_eq!(normalize_property_key(""), "");
    }

    #[test]
    fn test_normalize_property_key_only_whitespace() {
        assert_eq!(normalize_property_key("   "), "");
    }

    #[test]
    fn test_normalize_property_key_no_change() {
        assert_eq!(normalize_property_key("email"), "email");
    }

    #[test]
    fn test_normalize_property_key_tabs_newlines() {
        assert_eq!(
            normalize_property_key("first\tlast\nfield"),
            "first_last_field"
        );
    }

    #[test]
    fn test_normalize_property_key_unicode() {
        assert_eq!(normalize_property_key("用户 名称"), "用户_名称");
    }

    // ========== validate_data_source_type ==========

    #[test]
    fn test_validate_ds_type_valid_all() {
        for t in ["database", "api", "static", "computed"] {
            assert!(
                validate_data_source_type(t).is_ok(),
                "ds type {t} should be valid"
            );
        }
    }

    #[test]
    fn test_validate_ds_type_trims_whitespace() {
        assert!(validate_data_source_type("  api  ").is_ok());
    }

    #[test]
    fn test_validate_ds_type_empty() {
        assert!(validate_data_source_type("").is_err());
    }

    #[test]
    fn test_validate_ds_type_only_whitespace() {
        assert!(validate_data_source_type("   ").is_err());
    }

    #[test]
    fn test_validate_ds_type_unknown() {
        assert!(validate_data_source_type("graphql").is_err());
        assert!(validate_data_source_type("file").is_err());
    }

    #[test]
    fn test_validate_ds_type_case_sensitive() {
        assert!(validate_data_source_type("API").is_err());
        assert!(validate_data_source_type("Database").is_err());
    }

    #[test]
    fn test_validate_ds_type_error_type() {
        let err = validate_data_source_type("graphql").unwrap_err();
        assert_eq!(
            err,
            LowcodeError::InvalidDataSourceType("unknown data source type: graphql".to_string())
        );
    }

    // ========== calc_complexity_score ==========

    #[test]
    fn test_complexity_score_zero() {
        assert!((calc_complexity_score(0, 0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_complexity_score_only_components() {
        assert!((calc_complexity_score(5, 0) - 5.0).abs() < 1e-9);
    }

    #[test]
    fn test_complexity_score_only_bindings() {
        assert!((calc_complexity_score(0, 4) - 2.0).abs() < 1e-9);
    }

    #[test]
    fn test_complexity_score_mixed() {
        assert!((calc_complexity_score(10, 6) - 13.0).abs() < 1e-9);
    }

    #[test]
    fn test_complexity_score_large() {
        assert!((calc_complexity_score(1000, 2000) - 2000.0).abs() < 1e-9);
    }

    #[test]
    fn test_complexity_score_odd_bindings() {
        assert!((calc_complexity_score(1, 1) - 1.5).abs() < 1e-9);
    }

    #[test]
    fn test_complexity_score_all_bindings() {
        assert!((calc_complexity_score(3, 3) - 4.5).abs() < 1e-9);
    }

    // ========== is_valid_event_action ==========

    #[test]
    fn test_event_action_valid_all() {
        for a in ["click", "change", "submit", "load", "focus", "blur"] {
            assert!(is_valid_event_action(a), "action {a} should be valid");
        }
    }

    #[test]
    fn test_event_action_invalid_values() {
        assert!(!is_valid_event_action("hover"));
        assert!(!is_valid_event_action(""));
        assert!(!is_valid_event_action("CLICK"));
        assert!(!is_valid_event_action("click "));
    }

    // ========== normalize_page_path ==========

    #[test]
    fn test_normalize_page_path_basic() {
        assert_eq!(normalize_page_path("home"), "/home");
    }

    #[test]
    fn test_normalize_page_path_already_has_slash() {
        assert_eq!(normalize_page_path("/home"), "/home");
    }

    #[test]
    fn test_normalize_page_path_trims_trailing_slash() {
        assert_eq!(normalize_page_path("/home/"), "/home");
    }

    #[test]
    fn test_normalize_page_path_trims_whitespace() {
        assert_eq!(normalize_page_path("  /home  "), "/home");
    }

    #[test]
    fn test_normalize_page_path_empty() {
        assert_eq!(normalize_page_path(""), "/");
    }

    #[test]
    fn test_normalize_page_path_only_whitespace() {
        assert_eq!(normalize_page_path("   "), "/");
    }

    #[test]
    fn test_normalize_page_path_root() {
        assert_eq!(normalize_page_path("/"), "/");
    }

    #[test]
    fn test_normalize_page_path_no_leading_slash_no_trailing() {
        assert_eq!(normalize_page_path("users/profile"), "/users/profile");
    }

    #[test]
    fn test_normalize_page_path_trailing_slash_deep() {
        assert_eq!(normalize_page_path("users/profile/"), "/users/profile");
    }

    #[test]
    fn test_normalize_page_path_multiple_segments() {
        assert_eq!(normalize_page_path("/a/b/c"), "/a/b/c");
    }

    // ========== LowcodeError structural / Display ==========

    #[test]
    fn test_lowcode_error_debug_clone() {
        let err = LowcodeError::InvalidAppName("bad".to_string());
        let cloned = err.clone();
        assert_eq!(err, cloned);
        let debug = format!("{:?}", err);
        assert!(debug.contains("InvalidAppName"));
    }

    #[test]
    fn test_lowcode_error_display_invalid_app_name() {
        let err = LowcodeError::InvalidAppName("bad name".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid app name"));
        assert!(msg.contains("bad name"));
    }

    #[test]
    fn test_lowcode_error_display_invalid_form_schema() {
        let err = LowcodeError::InvalidFormSchema("bad".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid form schema"));
        assert!(msg.contains("bad"));
    }

    #[test]
    fn test_lowcode_error_display_invalid_ds_type() {
        let err = LowcodeError::InvalidDataSourceType("bad".to_string());
        let msg = format!("{}", err);
        assert!(msg.contains("invalid data source type"));
        assert!(msg.contains("bad"));
    }

    #[test]
    fn test_lowcode_error_eq_variants() {
        let a = LowcodeError::InvalidAppName("x".to_string());
        let b = LowcodeError::InvalidFormSchema("x".to_string());
        assert_ne!(a, b);
        assert_eq!(a, LowcodeError::InvalidAppName("x".to_string()));
    }

    #[test]
    fn test_lowcode_error_is_std_error() {
        fn assert_error<T: std::error::Error>(_: T) {}
        assert_error(LowcodeError::InvalidAppName("e".to_string()));
        assert_error(LowcodeError::InvalidFormSchema("e".to_string()));
        assert_error(LowcodeError::InvalidDataSourceType("e".to_string()));
    }

    #[test]
    fn test_complexity_score_single_component() {
        assert!((calc_complexity_score(1, 0) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_normalize_page_path_root_with_trailing_slash() {
        assert_eq!(normalize_page_path("/  "), "/");
    }

    #[test]
    fn test_validate_app_name_exactly_two_chars() {
        assert!(validate_app_name("ab").is_ok());
        assert!(validate_app_name("a ").is_err());
    }
}
