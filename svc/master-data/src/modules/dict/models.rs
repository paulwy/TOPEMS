use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DictType {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DictItem {
    pub id: Uuid,
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: i32,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDictTypeRequest {
    pub code: String,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDictTypeRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDictItemRequest {
    pub dict_type_id: Uuid,
    pub code: String,
    pub name: String,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDictItemRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub value: Option<String>,
    pub sort_order: Option<i32>,
    pub parent_id: Option<Uuid>,
    pub extra_data: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchCreateDictItemsRequest {
    pub dict_type_id: Uuid,
    pub items: Vec<CreateDictItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictTypeQuery {
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictItemQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictTypeListResponse {
    pub items: Vec<DictType>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictItemListResponse {
    pub items: Vec<DictItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

// ==================== 纯函数（无副作用，可单测） ====================

/// 根据字典项 code 在字典项列表中查找对应的 value。
/// - 找到且 value 非空：返回 Some(value)
/// - 找到但 value 为 None/空字符串：返回 None
/// - 未找到：返回 None
pub fn lookup_dict_value<'a>(items: &'a [DictItem], code: &str) -> Option<&'a str> {
    items
        .iter()
        .find(|it| it.code == code)
        .and_then(|it| it.value.as_deref())
        .filter(|v| !v.is_empty())
}

/// 校验字典类型 code 是否合法：
/// - 非空
/// - 仅包含字母、数字、下划线、连字符
/// - 长度在 1..=100 之间
pub fn is_valid_dict_code(code: &str) -> bool {
    if code.is_empty() || code.len() > 100 {
        return false;
    }
    code.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// 过滤出指定状态（active/inactive）的字典项；传入空 status 表示不筛选。
pub fn filter_items_by_status<'a>(
    items: &'a [DictItem],
    status: Option<&str>,
) -> Vec<&'a DictItem> {
    match status {
        Some(s) if !s.is_empty() => items.iter().filter(|it| it.status == s).collect(),
        _ => items.iter().collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_item(code: &str, value: Option<&str>, status: &str) -> DictItem {
        DictItem {
            id: Uuid::new_v4(),
            dict_type_id: Uuid::new_v4(),
            code: code.to_string(),
            name: code.to_string(),
            value: value.map(|s| s.to_string()),
            sort_order: 0,
            parent_id: None,
            extra_data: None,
            status: status.to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    // ---------- lookup_dict_value ----------

    #[test]
    fn test_lookup_dict_value_found() {
        let items = vec![
            make_item("a", Some("1"), "active"),
            make_item("b", Some("2"), "active"),
        ];
        assert_eq!(lookup_dict_value(&items, "a"), Some("1"));
        assert_eq!(lookup_dict_value(&items, "b"), Some("2"));
    }

    #[test]
    fn test_lookup_dict_value_not_found() {
        let items = vec![make_item("a", Some("1"), "active")];
        assert_eq!(lookup_dict_value(&items, "missing"), None);
    }

    #[test]
    fn test_lookup_dict_value_empty_value_returns_none() {
        let items = vec![make_item("a", Some(""), "active")];
        assert_eq!(lookup_dict_value(&items, "a"), None);
    }

    #[test]
    fn test_lookup_dict_value_none_value_returns_none() {
        let items = vec![make_item("a", None, "active")];
        assert_eq!(lookup_dict_value(&items, "a"), None);
    }

    #[test]
    fn test_lookup_dict_value_empty_items() {
        let items: Vec<DictItem> = vec![];
        assert_eq!(lookup_dict_value(&items, "a"), None);
    }

    #[test]
    fn test_lookup_dict_value_first_match_wins() {
        let items = vec![
            make_item("a", Some("first"), "active"),
            make_item("a", Some("second"), "active"),
        ];
        assert_eq!(lookup_dict_value(&items, "a"), Some("first"));
    }

    // ---------- is_valid_dict_code ----------

    #[test]
    fn test_dict_code_valid_simple() {
        assert!(is_valid_dict_code("gender"));
        assert!(is_valid_dict_code("user_status"));
        assert!(is_valid_dict_code("order-type"));
    }

    #[test]
    fn test_dict_code_valid_alphanumeric() {
        assert!(is_valid_dict_code("abc123"));
        assert!(is_valid_dict_code("A1_B2-C3"));
    }

    #[test]
    fn test_dict_code_empty_invalid() {
        assert!(!is_valid_dict_code(""));
    }

    #[test]
    fn test_dict_code_with_spaces_invalid() {
        assert!(!is_valid_dict_code("has space"));
    }

    #[test]
    fn test_dict_code_with_special_chars_invalid() {
        assert!(!is_valid_dict_code("a@b"));
        assert!(!is_valid_dict_code("a.b"));
        assert!(!is_valid_dict_code("a/b"));
        assert!(!is_valid_dict_code("a#b"));
    }

    #[test]
    fn test_dict_code_with_unicode_invalid() {
        assert!(!is_valid_dict_code("类型"));
    }

    #[test]
    fn test_dict_code_too_long_invalid() {
        let long_code = "a".repeat(101);
        assert!(!is_valid_dict_code(&long_code));
    }

    #[test]
    fn test_dict_code_max_length_valid() {
        let max_code = "a".repeat(100);
        assert!(is_valid_dict_code(&max_code));
    }

    // ---------- filter_items_by_status ----------

    #[test]
    fn test_filter_items_no_filter_returns_all() {
        let items = vec![
            make_item("a", Some("1"), "active"),
            make_item("b", Some("2"), "inactive"),
        ];
        let filtered = filter_items_by_status(&items, None);
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_filter_items_by_active_status() {
        let items = vec![
            make_item("a", Some("1"), "active"),
            make_item("b", Some("2"), "inactive"),
            make_item("c", Some("3"), "active"),
        ];
        let filtered = filter_items_by_status(&items, Some("active"));
        assert_eq!(filtered.len(), 2);
        assert_eq!(filtered[0].code, "a");
        assert_eq!(filtered[1].code, "c");
    }

    #[test]
    fn test_filter_items_by_inactive_status() {
        let items = vec![
            make_item("a", Some("1"), "active"),
            make_item("b", Some("2"), "inactive"),
        ];
        let filtered = filter_items_by_status(&items, Some("inactive"));
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].code, "b");
    }

    #[test]
    fn test_filter_items_empty_status_returns_all() {
        let items = vec![
            make_item("a", Some("1"), "active"),
            make_item("b", Some("2"), "inactive"),
        ];
        let filtered = filter_items_by_status(&items, Some(""));
        assert_eq!(filtered.len(), 2);
    }

    #[test]
    fn test_filter_items_no_match() {
        let items = vec![make_item("a", Some("1"), "active")];
        let filtered = filter_items_by_status(&items, Some("archived"));
        assert!(filtered.is_empty());
    }

    #[test]
    fn test_filter_items_empty_input() {
        let items: Vec<DictItem> = vec![];
        let filtered = filter_items_by_status(&items, Some("active"));
        assert!(filtered.is_empty());
    }
}
