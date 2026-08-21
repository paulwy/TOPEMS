use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
struct StandardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateStandardRequest {
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateStandardRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QualityStandard {
    id: String,
    code: String,
    name: String,
    category: String,
    level: Option<String>,
    status: Option<String>,
    version: Option<String>,
}

#[test]
fn test_quality_standard_creation() {
    let standard = QualityStandard {
        id: "12345678-1234-5678-1234-567812345678".to_string(),
        code: "ISO-9001".to_string(),
        name: "ISO 9001:2015".to_string(),
        category: "Quality Management".to_string(),
        level: Some("International".to_string()),
        status: Some("active".to_string()),
        version: Some("2015".to_string()),
    };

    assert_eq!(standard.code, "ISO-9001");
    assert_eq!(standard.name, "ISO 9001:2015");
    assert_eq!(standard.category, "Quality Management");
    assert!(standard.level.is_some());
}

#[test]
fn test_quality_standard_serialization() {
    let standard = QualityStandard {
        id: "12345678-1234-5678-1234-567812345678".to_string(),
        code: "ISO-14001".to_string(),
        name: "ISO 14001:2015".to_string(),
        category: "Environmental".to_string(),
        level: None,
        status: Some("draft".to_string()),
        version: None,
    };

    let json = serde_json::to_string(&standard).unwrap();
    let deserialized: QualityStandard = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.id, standard.id);
    assert_eq!(deserialized.name, standard.name);
    assert_eq!(deserialized.status, standard.status);
}

#[test]
fn test_standard_categories() {
    let categories = vec![
        "Quality Management",
        "Environmental",
        "Health & Safety",
        "Food Safety",
        "Information Security",
        "Energy Management",
    ];

    for category in categories {
        let standard = QualityStandard {
            id: "test-id".to_string(),
            code: "TEST-001".to_string(),
            name: format!("Standard for {}", category),
            category: category.to_string(),
            level: None,
            status: None,
            version: None,
        };
        assert_eq!(standard.category, category);
    }
}

#[test]
fn test_standard_statuses() {
    let statuses = vec![
        "draft",
        "review",
        "approved",
        "active",
        "deprecated",
        "archived",
    ];

    for status in statuses {
        let standard = QualityStandard {
            id: "test-id".to_string(),
            code: "TEST-001".to_string(),
            name: "Test Standard".to_string(),
            category: "Test".to_string(),
            level: None,
            status: Some(status.to_string()),
            version: None,
        };
        assert_eq!(standard.status.as_deref(), Some(status));
    }
}
