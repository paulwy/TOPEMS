use crate::modules::quality_standard::{
    CreateStandardRequest, StandardQuery, UpdateStandardRequest,
};
use serde_json::Value;

fn build_where_clause(query: &StandardQuery) -> (String, Vec<Value>) {
    let mut params: Vec<Value> = Vec::new();
    let mut where_clause = String::new();
    let mut param_idx = 1;

    if let Some(category) = &query.category {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE");
        } else {
            where_clause.push_str(" AND");
        }
        where_clause.push_str(&format!(" category = ${}", param_idx));
        params.push(Value::String(category.clone()));
        param_idx += 1;
    }

    if let Some(status) = &query.status {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE");
        } else {
            where_clause.push_str(" AND");
        }
        where_clause.push_str(&format!(" status = ${}", param_idx));
        params.push(Value::String(status.clone()));
        param_idx += 1;
    }

    if let Some(search) = &query.search {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE");
        } else {
            where_clause.push_str(" AND");
        }
        where_clause.push_str(&format!(
            " (name ILIKE ${} OR code ILIKE ${})",
            param_idx, param_idx
        ));
        params.push(Value::String(format!("%{}%", search)));
        param_idx += 1;
    }

    (where_clause, params)
}

#[test]
fn test_build_where_clause_empty() {
    let query = StandardQuery {
        page: None,
        page_size: None,
        category: None,
        status: None,
        search: None,
    };

    let (clause, params) = build_where_clause(&query);
    assert_eq!(clause, "");
    assert_eq!(params.len(), 0);
}

#[test]
fn test_build_where_clause_with_category() {
    let query = StandardQuery {
        page: None,
        page_size: None,
        category: Some("ISO".to_string()),
        status: None,
        search: None,
    };

    let (clause, params) = build_where_clause(&query);
    assert_eq!(clause, " WHERE category = $1");
    assert_eq!(params.len(), 1);
    assert_eq!(params[0], Value::String("ISO".to_string()));
}

#[test]
fn test_build_where_clause_with_status() {
    let query = StandardQuery {
        page: None,
        page_size: None,
        category: None,
        status: Some("active".to_string()),
        search: None,
    };

    let (clause, params) = build_where_clause(&query);
    assert_eq!(clause, " WHERE status = $1");
    assert_eq!(params.len(), 1);
    assert_eq!(params[0], Value::String("active".to_string()));
}

#[test]
fn test_build_where_clause_with_search() {
    let query = StandardQuery {
        page: None,
        page_size: None,
        category: None,
        status: None,
        search: Some("test".to_string()),
    };

    let (clause, params) = build_where_clause(&query);
    assert!(clause.contains("name ILIKE"));
    assert!(clause.contains("code ILIKE"));
    assert_eq!(params.len(), 1);
    assert_eq!(params[0], Value::String("%test%".to_string()));
}

#[test]
fn test_build_where_clause_with_multiple_filters() {
    let query = StandardQuery {
        page: None,
        page_size: None,
        category: Some("ISO".to_string()),
        status: Some("active".to_string()),
        search: Some("test".to_string()),
    };

    let (clause, params) = build_where_clause(&query);
    assert!(clause.contains("category = $1"));
    assert!(clause.contains("status = $2"));
    assert!(clause.contains("name ILIKE $3"));
    assert_eq!(params.len(), 3);
}

#[test]
fn test_create_standard_request_validation() {
    let json_str = r#"{"name": "ISO 9001", "category": "Quality"}"#;
    let request: CreateStandardRequest = serde_json::from_str(json_str).unwrap();

    assert_eq!(request.name, "ISO 9001");
    assert_eq!(request.category, "Quality");
    assert!(request.level.is_none());
}

#[test]
fn test_update_standard_request_partial_update() {
    let json_str = r#"{"name": "Updated Name", "status": "draft"}"#;
    let request: UpdateStandardRequest = serde_json::from_str(json_str).unwrap();

    assert_eq!(request.name, Some("Updated Name".to_string()));
    assert_eq!(request.status, Some("draft".to_string()));
    assert!(request.category.is_none());
    assert!(request.level.is_none());
}

#[test]
fn test_pagination_defaults() {
    let query = StandardQuery {
        page: None,
        page_size: None,
        category: None,
        status: None,
        search: None,
    };

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    assert_eq!(page, 1);
    assert_eq!(page_size, 10);
    assert_eq!(offset, 0);
}

#[test]
fn test_pagination_custom_values() {
    let query = StandardQuery {
        page: Some(3),
        page_size: Some(25),
        category: None,
        status: None,
        search: None,
    };

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    assert_eq!(page, 3);
    assert_eq!(page_size, 25);
    assert_eq!(offset, 50);
}
