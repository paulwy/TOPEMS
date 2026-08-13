#![allow(dead_code, clippy::empty_loop)]

//! Lowcode compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! `/api/lowcode/*` calls that are not represented by concrete utoipa
//! handlers yet. They do not alter runtime routing behavior.

use std::collections::HashMap;

// ===== Pure lowcode-domain helpers =====

/// 校验表单字段值是否符合声明的类型。
pub fn validate_field_value(value: &str, field_type: &str, required: bool) -> Result<(), String> {
    if required && value.trim().is_empty() {
        return Err(format!("field of type '{}' is required", field_type));
    }
    if value.trim().is_empty() {
        return Ok(());
    }
    match field_type {
        "text" => Ok(()),
        "number" => value
            .trim()
            .parse::<f64>()
            .map(|_| ())
            .map_err(|_| format!("'{}' is not a valid number", value)),
        "email" => {
            if value.contains('@') && value.contains('.') {
                Ok(())
            } else {
                Err(format!("'{}' is not a valid email", value))
            }
        }
        "boolean" => {
            if value == "true" || value == "false" {
                Ok(())
            } else {
                Err(format!("'{}' is not a valid boolean", value))
            }
        }
        _ => Err(format!("unknown field type: '{}'", field_type)),
    }
}

/// 校验 JSON 字符串是否为对象且包含全部必填键。
pub fn validate_json_schema(data: &str, required_keys: &[&str]) -> Result<(), String> {
    let parsed: serde_json::Value =
        serde_json::from_str(data).map_err(|e| format!("invalid JSON: {}", e))?;
    let obj = parsed
        .as_object()
        .ok_or_else(|| "data is not a JSON object".to_string())?;
    for key in required_keys {
        if !obj.contains_key(*key) {
            return Err(format!("missing required key: {}", key));
        }
    }
    Ok(())
}

/// 计算组件树的最大深度（根节点 "root"/"" 视为第 0 层）。
pub fn calculate_component_depth(components: &[(&str, &str)]) -> u32 {
    use std::collections::{HashMap, HashSet};
    let mut parent_map: HashMap<&str, &str> = HashMap::new();
    for (parent, child) in components {
        parent_map.insert(child, parent);
    }
    let mut max_depth = 0u32;
    for (_, child) in components {
        let mut depth = 0u32;
        let mut current = *child;
        let mut visited: HashSet<&str> = HashSet::new();
        while let Some(parent) = parent_map.get(current) {
            if !visited.insert(current) {
                break; // 检测到环
            }
            if *parent == "root" || parent.is_empty() {
                break;
            }
            depth += 1;
            current = *parent;
        }
        if depth > max_depth {
            max_depth = depth;
        }
    }
    max_depth
}

/// 计算简单算术表达式（仅支持 + - * / 与数字，含负数）。
pub fn evaluate_simple_expression(expr: &str) -> Result<f64, String> {
    #[derive(Clone)]
    enum Token {
        Num(f64),
        Op(char),
    }
    let expr = expr.trim();
    if expr.is_empty() {
        return Err("empty expression".to_string());
    }
    // 词法分析
    let mut tokens: Vec<Token> = Vec::new();
    let mut chars = expr.chars().peekable();
    let mut expect_number = true;
    while let Some(&ch) = chars.peek() {
        if ch.is_whitespace() {
            chars.next();
            continue;
        }
        if ch.is_ascii_digit() || ch == '.' || (expect_number && (ch == '-' || ch == '+')) {
            let mut num_str = String::new();
            if ch == '-' || ch == '+' {
                num_str.push(ch);
                chars.next();
            }
            while let Some(&c) = chars.peek() {
                if c.is_ascii_digit() || c == '.' {
                    num_str.push(c);
                    chars.next();
                } else {
                    break;
                }
            }
            if num_str == "-" || num_str == "+" || num_str.is_empty() {
                return Err("incomplete number".to_string());
            }
            let num: f64 = num_str
                .parse()
                .map_err(|_| format!("invalid number: {}", num_str))?;
            tokens.push(Token::Num(num));
            expect_number = false;
        } else if ch == '+' || ch == '-' || ch == '*' || ch == '/' {
            tokens.push(Token::Op(ch));
            chars.next();
            expect_number = true;
        } else {
            return Err(format!("invalid character: {}", ch));
        }
    }
    if tokens.is_empty() {
        return Err("empty expression".to_string());
    }
    // 第一遍：处理 * 和 /
    let mut pass1: Vec<Token> = Vec::new();
    let mut i = 0;
    while i < tokens.len() {
        match &tokens[i] {
            Token::Num(_) => {
                pass1.push(tokens[i].clone());
                i += 1;
            }
            Token::Op('*') | Token::Op('/') => {
                let op = if let Token::Op(c) = &tokens[i] {
                    *c
                } else {
                    unreachable!()
                };
                let prev = match pass1.pop() {
                    Some(Token::Num(n)) => n,
                    _ => return Err("expected number before operator".to_string()),
                };
                i += 1;
                if i >= tokens.len() {
                    return Err("expected number after operator".to_string());
                }
                let next = match &tokens[i] {
                    Token::Num(n) => *n,
                    _ => return Err("expected number after operator".to_string()),
                };
                i += 1;
                let result = match op {
                    '*' => prev * next,
                    '/' => {
                        if next == 0.0 {
                            return Err("division by zero".to_string());
                        }
                        prev / next
                    }
                    _ => unreachable!(),
                };
                pass1.push(Token::Num(result));
            }
            Token::Op(_) => {
                pass1.push(tokens[i].clone());
                i += 1;
            }
        }
    }
    // 第二遍：处理 + 和 -
    if pass1.is_empty() {
        return Err("empty expression".to_string());
    }
    let mut result = match &pass1[0] {
        Token::Num(n) => *n,
        _ => return Err("expected number at start".to_string()),
    };
    let mut i = 1;
    while i < pass1.len() {
        match &pass1[i] {
            Token::Op('+') => {
                i += 1;
                if i >= pass1.len() {
                    return Err("expected number after +".to_string());
                }
                if let Token::Num(n) = &pass1[i] {
                    result += *n;
                } else {
                    return Err("expected number after +".to_string());
                }
                i += 1;
            }
            Token::Op('-') => {
                i += 1;
                if i >= pass1.len() {
                    return Err("expected number after -".to_string());
                }
                if let Token::Num(n) = &pass1[i] {
                    result -= *n;
                } else {
                    return Err("expected number after -".to_string());
                }
                i += 1;
            }
            _ => return Err("unexpected token".to_string()),
        }
    }
    Ok(result)
}

/// 计算页面栅格布局位置 (x, y, w, h)，宽度会根据总列数进行收窄。
pub fn calculate_grid_position(
    col: u32,
    row: u32,
    col_span: u32,
    row_span: u32,
    total_cols: u32,
) -> (u32, u32, u32, u32) {
    let x = col;
    let y = row;
    let h = row_span;
    let w = if total_cols > 0 && col < total_cols {
        let available = total_cols - col;
        if col_span > available {
            available
        } else {
            col_span
        }
    } else {
        col_span
    };
    (x, y, w, h)
}

/// 校验工作流状态迁移是否合法。
pub fn is_valid_workflow_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "draft" => matches!(to, "active" | "cancelled"),
        "active" => matches!(to, "paused" | "completed" | "cancelled"),
        "paused" => matches!(to, "active" | "cancelled"),
        "completed" | "cancelled" => false,
        _ => false,
    }
}

/// 通过字节求和生成提交哈希（非加密用途）。
pub fn generate_submission_hash(form_id: &str, data: &str) -> String {
    let sum: u64 = form_id.bytes().map(|b| b as u64).sum::<u64>()
        + data.bytes().map(|b| b as u64).sum::<u64>();
    format!("{:x}", sum)
}

/// 合并组件属性：以 default 为基准，使用 override_vals 覆盖。
pub fn merge_component_properties(
    default: &HashMap<String, String>,
    override_vals: &HashMap<String, String>,
) -> HashMap<String, String> {
    let mut result = default.clone();
    for (k, v) in override_vals {
        result.insert(k.clone(), v.clone());
    }
    result
}

// ===== Apps =====

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_id() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/apps/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_apps_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/apps/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_apps_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/{id}/publish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_id_publish() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/{id}/unpublish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_id_unpublish() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/{id}/duplicate",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_id_duplicate() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{id}/export",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_id_export() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/apps/import",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_apps_import() {}

// ===== Data Models =====

#[utoipa::path(
    get,
    path = "/api/lowcode/data-models",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_models() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/data-models/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_models_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/data-models",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_data_models() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/data-models/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_data_models_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/data-models/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_data_models_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/data-models/{id}/materialize",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_data_models_id_materialize() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/data-models",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_data_models() {}

// ===== Data Sources =====

#[utoipa::path(
    get,
    path = "/api/lowcode/data-sources",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_sources() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/data-sources/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_data_sources_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/data-sources",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_data_sources() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/data-sources/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_data_sources_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/data-sources/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_data_sources_id() {}

// ===== Forms =====

#[utoipa::path(
    get,
    path = "/api/lowcode/forms",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_forms() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/forms/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_forms_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/forms",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_forms() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/forms/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_forms_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/forms/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_forms_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/forms/{id}/publish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_forms_id_publish() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/forms/{id}/preview",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_forms_id_preview() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/forms",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_forms() {}

// ===== Dashboard =====

#[utoipa::path(
    get,
    path = "/api/lowcode/dashboard/stats",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_dashboard_stats() {}

// ===== Pages =====

#[utoipa::path(
    get,
    path = "/api/lowcode/pages",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_pages() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/pages/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_pages_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/pages/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_pages_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/pages/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_pages_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages/{id}/publish",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages_id_publish() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/pages/{id}/preview",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_pages_id_preview() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages/{id}/set-home",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages_id_set_home() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/pages",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_pages() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/pages/{pageId}/on-form-submit",
    tag = "Lowcode-Compat",
    params(("pageId" = String, Path, description = "pageId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_pages_pageid_on_form_submit() {}

// ===== Workflows =====

#[utoipa::path(
    get,
    path = "/api/lowcode/workflows",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_workflows() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/workflows/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_workflows_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/workflows",
    tag = "Lowcode-Compat",
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_workflows() {}

#[utoipa::path(
    put,
    path = "/api/lowcode/workflows/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_put_api_lowcode_workflows_id() {}

#[utoipa::path(
    delete,
    path = "/api/lowcode/workflows/{id}",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_delete_api_lowcode_workflows_id() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/workflows/{id}/enable",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_workflows_id_enable() {}

#[utoipa::path(
    post,
    path = "/api/lowcode/workflows/{id}/disable",
    tag = "Lowcode-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_post_api_lowcode_workflows_id_disable() {}

#[utoipa::path(
    get,
    path = "/api/lowcode/apps/{appId}/workflows",
    tag = "Lowcode-Compat",
    params(("appId" = String, Path, description = "appId")),
    responses((status = 200, description = "Lowcode compatibility endpoint"))
)]
pub async fn compat_get_api_lowcode_apps_appid_workflows() {}

#[cfg(test)]
mod tests {
    use super::*;

    // ----- validate_field_value -----
    #[test]
    fn test_validate_field_required_empty() {
        assert!(validate_field_value("", "text", true).is_err());
        assert!(validate_field_value("   ", "text", true).is_err());
    }

    #[test]
    fn test_validate_field_text_ok() {
        assert!(validate_field_value("hello", "text", false).is_ok());
        assert!(validate_field_value("hello", "text", true).is_ok());
    }

    #[test]
    fn test_validate_field_number() {
        assert!(validate_field_value("42", "number", false).is_ok());
        assert!(validate_field_value("3.14", "number", false).is_ok());
        assert!(validate_field_value("-7", "number", false).is_ok());
        assert!(validate_field_value("abc", "number", false).is_err());
    }

    #[test]
    fn test_validate_field_email() {
        assert!(validate_field_value("a@b.com", "email", false).is_ok());
        assert!(validate_field_value("no-at", "email", false).is_err());
        assert!(validate_field_value("a@b", "email", false).is_err());
    }

    #[test]
    fn test_validate_field_boolean() {
        assert!(validate_field_value("true", "boolean", false).is_ok());
        assert!(validate_field_value("false", "boolean", false).is_ok());
        assert!(validate_field_value("yes", "boolean", false).is_err());
    }

    #[test]
    fn test_validate_field_unknown_type() {
        assert!(validate_field_value("x", "unknown", false).is_err());
    }

    #[test]
    fn test_validate_field_optional_empty_ok() {
        assert!(validate_field_value("", "text", false).is_ok());
        assert!(validate_field_value("", "number", false).is_ok());
    }

    // ----- validate_json_schema -----
    #[test]
    fn test_validate_json_schema_ok() {
        let data = r#"{"name":"x","age":1}"#;
        assert!(validate_json_schema(data, &["name", "age"]).is_ok());
    }

    #[test]
    fn test_validate_json_schema_missing_key() {
        let data = r#"{"name":"x"}"#;
        assert!(validate_json_schema(data, &["name", "age"]).is_err());
    }

    #[test]
    fn test_validate_json_schema_invalid_json() {
        assert!(validate_json_schema("{not json}", &[]).is_err());
    }

    #[test]
    fn test_validate_json_schema_not_object() {
        assert!(validate_json_schema("[1,2,3]", &[]).is_err());
        assert!(validate_json_schema("\"str\"", &[]).is_err());
        assert!(validate_json_schema("42", &[]).is_err());
    }

    #[test]
    fn test_validate_json_schema_empty_keys() {
        assert!(validate_json_schema("{}", &[]).is_ok());
    }

    // ----- calculate_component_depth -----
    #[test]
    fn test_component_depth_empty() {
        assert_eq!(calculate_component_depth(&[]), 0);
    }

    #[test]
    fn test_component_depth_single() {
        assert_eq!(calculate_component_depth(&[("root", "a")]), 0);
        assert_eq!(calculate_component_depth(&[("", "a")]), 0);
    }

    #[test]
    fn test_component_depth_chain() {
        let comps = [("root", "a"), ("a", "b"), ("b", "c")];
        assert_eq!(calculate_component_depth(&comps), 2);
    }

    #[test]
    fn test_component_depth_no_root_parent() {
        let comps = [("a", "b"), ("b", "c")];
        assert_eq!(calculate_component_depth(&comps), 2);
    }

    #[test]
    fn test_component_depth_cycle_safe() {
        let comps = [("a", "b"), ("b", "a")];
        // 不应 panic / 死循环
        let d = calculate_component_depth(&comps);
        assert!(d <= 2);
    }

    // ----- evaluate_simple_expression -----
    #[test]
    fn test_eval_addition() {
        assert_eq!(evaluate_simple_expression("1 + 2").unwrap(), 3.0);
    }

    #[test]
    fn test_eval_precedence() {
        assert_eq!(evaluate_simple_expression("1 + 2 * 3").unwrap(), 7.0);
        assert_eq!(evaluate_simple_expression("2 * 3 + 4").unwrap(), 10.0);
    }

    #[test]
    fn test_eval_division() {
        assert_eq!(evaluate_simple_expression("10 / 4").unwrap(), 2.5);
    }

    #[test]
    fn test_eval_negative() {
        assert_eq!(evaluate_simple_expression("-5 + 3").unwrap(), -2.0);
    }

    #[test]
    fn test_eval_decimal() {
        assert_eq!(evaluate_simple_expression("3.5 + 1.5").unwrap(), 5.0);
    }

    #[test]
    fn test_eval_div_by_zero() {
        assert!(evaluate_simple_expression("1 / 0").is_err());
    }

    #[test]
    fn test_eval_invalid_char() {
        assert!(evaluate_simple_expression("1 + a").is_err());
    }

    #[test]
    fn test_eval_empty() {
        assert!(evaluate_simple_expression("").is_err());
        assert!(evaluate_simple_expression("   ").is_err());
    }

    // ----- calculate_grid_position -----
    #[test]
    fn test_grid_basic() {
        assert_eq!(calculate_grid_position(0, 0, 4, 1, 12), (0, 0, 4, 1));
    }

    #[test]
    fn test_grid_clamp_width() {
        assert_eq!(calculate_grid_position(8, 0, 6, 1, 12), (8, 0, 4, 1));
        assert_eq!(calculate_grid_position(10, 0, 4, 1, 12), (10, 0, 2, 1));
    }

    #[test]
    fn test_grid_full_row() {
        assert_eq!(calculate_grid_position(0, 2, 12, 3, 12), (0, 2, 12, 3));
    }

    #[test]
    fn test_grid_zero_total_cols() {
        assert_eq!(calculate_grid_position(0, 0, 4, 1, 0), (0, 0, 4, 1));
    }

    #[test]
    fn test_grid_col_beyond_total() {
        assert_eq!(calculate_grid_position(20, 0, 4, 1, 12), (20, 0, 4, 1));
    }

    // ----- is_valid_workflow_transition -----
    #[test]
    fn test_workflow_draft_to_active() {
        assert!(is_valid_workflow_transition("draft", "active"));
    }

    #[test]
    fn test_workflow_active_to_paused() {
        assert!(is_valid_workflow_transition("active", "paused"));
        assert!(is_valid_workflow_transition("paused", "active"));
    }

    #[test]
    fn test_workflow_terminal() {
        assert!(!is_valid_workflow_transition("completed", "active"));
        assert!(!is_valid_workflow_transition("cancelled", "active"));
    }

    #[test]
    fn test_workflow_invalid() {
        assert!(!is_valid_workflow_transition("draft", "completed"));
        assert!(!is_valid_workflow_transition("draft", "paused"));
    }

    #[test]
    fn test_workflow_same_state() {
        assert!(is_valid_workflow_transition("draft", "draft"));
        assert!(is_valid_workflow_transition("active", "active"));
    }

    #[test]
    fn test_workflow_unknown_state() {
        assert!(!is_valid_workflow_transition("foo", "bar"));
    }

    // ----- generate_submission_hash -----
    #[test]
    fn test_hash_deterministic() {
        let h1 = generate_submission_hash("form1", "data");
        let h2 = generate_submission_hash("form1", "data");
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_hash_differs_by_form() {
        let h1 = generate_submission_hash("form1", "data");
        let h2 = generate_submission_hash("form2", "data");
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_hash_differs_by_data() {
        let h1 = generate_submission_hash("form1", "data1");
        let h2 = generate_submission_hash("form1", "data2");
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_hash_empty_inputs() {
        let h = generate_submission_hash("", "");
        assert_eq!(h, "0");
    }

    #[test]
    fn test_hash_is_hex() {
        let h = generate_submission_hash("form1", "data");
        assert!(h.chars().all(|c| c.is_ascii_hexdigit()));
    }

    // ----- merge_component_properties -----
    #[test]
    fn test_merge_default_only() {
        let mut default = HashMap::new();
        default.insert("a".to_string(), "1".to_string());
        let override_vals = HashMap::new();
        let result = merge_component_properties(&default, &override_vals);
        assert_eq!(result.get("a"), Some(&"1".to_string()));
    }

    #[test]
    fn test_merge_override_wins() {
        let mut default = HashMap::new();
        default.insert("a".to_string(), "1".to_string());
        let mut override_vals = HashMap::new();
        override_vals.insert("a".to_string(), "2".to_string());
        let result = merge_component_properties(&default, &override_vals);
        assert_eq!(result.get("a"), Some(&"2".to_string()));
    }

    #[test]
    fn test_merge_adds_new_keys() {
        let mut default = HashMap::new();
        default.insert("a".to_string(), "1".to_string());
        let mut override_vals = HashMap::new();
        override_vals.insert("b".to_string(), "2".to_string());
        let result = merge_component_properties(&default, &override_vals);
        assert_eq!(result.get("a"), Some(&"1".to_string()));
        assert_eq!(result.get("b"), Some(&"2".to_string()));
    }

    #[test]
    fn test_merge_both_empty() {
        let default = HashMap::new();
        let override_vals = HashMap::new();
        let result = merge_component_properties(&default, &override_vals);
        assert!(result.is_empty());
    }

    #[test]
    fn test_merge_does_not_mutate_inputs() {
        let mut default = HashMap::new();
        default.insert("a".to_string(), "1".to_string());
        let mut override_vals = HashMap::new();
        override_vals.insert("a".to_string(), "2".to_string());
        let _result = merge_component_properties(&default, &override_vals);
        assert_eq!(default.get("a"), Some(&"1".to_string()));
        assert_eq!(override_vals.get("a"), Some(&"2".to_string()));
    }
}
