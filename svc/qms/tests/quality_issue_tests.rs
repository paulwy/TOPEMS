use serde::{Deserialize, Serialize};

use topems_qms::modules::quality_issue::{CreateIssueRequest, IssueQuery, UpdateIssueRequest};

#[test]
fn test_issue_query_defaults() {
    let query = IssueQuery {
        page: None,
        page_size: None,
        status: None,
        severity: None,
    };

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    assert_eq!(page, 1);
    assert_eq!(page_size, 10);
    assert_eq!(offset, 0);
}

#[test]
fn test_issue_query_custom() {
    let query = IssueQuery {
        page: Some(5),
        page_size: Some(20),
        status: Some("open".to_string()),
        severity: Some("critical".to_string()),
    };

    assert_eq!(query.page.unwrap(), 5);
    assert_eq!(query.page_size.unwrap(), 20);
    assert_eq!(query.status.unwrap(), "open");
    assert_eq!(query.severity.unwrap(), "critical");
}

#[test]
fn test_issue_query_serialization() {
    let query = IssueQuery {
        page: Some(3),
        page_size: Some(15),
        status: Some("resolved".to_string()),
        severity: Some("high".to_string()),
    };

    let json = serde_json::to_string(&query).unwrap();
    let deserialized: IssueQuery = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.page, query.page);
    assert_eq!(deserialized.page_size, query.page_size);
    assert_eq!(deserialized.status, query.status);
    assert_eq!(deserialized.severity, query.severity);
}

#[test]
fn test_create_issue_request_full() {
    let request = CreateIssueRequest {
        title: "产品质量问题".to_string(),
        description: Some("发现产品表面有划痕".to_string()),
        severity: Some("high".to_string()),
        source: Some("inspection".to_string()),
        related_inspection_id: Some("12345678-1234-5678-1234-567812345678".to_string()),
        created_by: Some("user123".to_string()),
        workflow_id: None,
    };

    assert_eq!(request.title, "产品质量问题");
    assert!(request.description.is_some());
    assert_eq!(request.severity.unwrap(), "high");
    assert_eq!(request.source.unwrap(), "inspection");
    assert!(request.related_inspection_id.is_some());
    assert!(request.created_by.is_some());
}

#[test]
fn test_create_issue_request_minimal() {
    let request = CreateIssueRequest {
        title: "简单问题".to_string(),
        description: None,
        severity: None,
        source: None,
        related_inspection_id: None,
        created_by: None,
        workflow_id: None,
    };

    assert_eq!(request.title, "简单问题");
    assert!(request.description.is_none());
    assert!(request.severity.is_none());
    assert!(request.source.is_none());
    assert!(request.related_inspection_id.is_none());
    assert!(request.created_by.is_none());
}

#[test]
fn test_create_issue_request_serialization() {
    let request = CreateIssueRequest {
        title: "测试问题".to_string(),
        description: Some("测试描述".to_string()),
        severity: Some("medium".to_string()),
        source: Some("customer".to_string()),
        related_inspection_id: None,
        created_by: Some("tester".to_string()),
        workflow_id: None,
    };

    let json = serde_json::to_string(&request).unwrap();
    let deserialized: CreateIssueRequest = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.title, request.title);
    assert_eq!(deserialized.description, request.description);
    assert_eq!(deserialized.severity, request.severity);
    assert_eq!(deserialized.source, request.source);
    assert_eq!(deserialized.created_by, request.created_by);
}

#[test]
fn test_update_issue_request_full() {
    let request = UpdateIssueRequest {
        title: Some("更新后的标题".to_string()),
        description: Some("更新后的描述".to_string()),
        severity: Some("low".to_string()),
        status: Some("resolved".to_string()),
    };

    assert!(request.title.is_some());
    assert!(request.description.is_some());
    assert!(request.severity.is_some());
    assert!(request.status.is_some());

    assert_eq!(request.title.unwrap(), "更新后的标题");
    assert_eq!(request.status.unwrap(), "resolved");
}

#[test]
fn test_update_issue_request_partial() {
    let request = UpdateIssueRequest {
        title: None,
        description: None,
        severity: None,
        status: Some("closed".to_string()),
    };

    assert!(request.title.is_none());
    assert!(request.description.is_none());
    assert!(request.severity.is_none());
    assert!(request.status.is_some());
    assert_eq!(request.status.unwrap(), "closed");
}

#[test]
fn test_update_issue_request_serialization() {
    let request = UpdateIssueRequest {
        title: Some("新标题".to_string()),
        description: None,
        severity: Some("critical".to_string()),
        status: Some("in_progress".to_string()),
    };

    let json = serde_json::to_string(&request).unwrap();
    let deserialized: UpdateIssueRequest = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.title, request.title);
    assert_eq!(deserialized.description, request.description);
    assert_eq!(deserialized.severity, request.severity);
    assert_eq!(deserialized.status, request.status);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QualityIssueSeverity {
    value: String,
    label: String,
    color: String,
}

#[test]
fn test_quality_issue_severity_levels() {
    let severities = vec![
        QualityIssueSeverity {
            value: "critical".to_string(),
            label: "严重".to_string(),
            color: "#dc2626".to_string(),
        },
        QualityIssueSeverity {
            value: "high".to_string(),
            label: "高".to_string(),
            color: "#f97316".to_string(),
        },
        QualityIssueSeverity {
            value: "medium".to_string(),
            label: "中".to_string(),
            color: "#eab308".to_string(),
        },
        QualityIssueSeverity {
            value: "low".to_string(),
            label: "低".to_string(),
            color: "#22c55e".to_string(),
        },
    ];

    for severity in severities {
        assert!(!severity.value.is_empty());
        assert!(!severity.label.is_empty());
        assert!(!severity.color.is_empty());
        assert!(severity.color.starts_with('#'));
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QualityIssueStatus {
    value: String,
    label: String,
}

#[test]
fn test_quality_issue_status_values() {
    let statuses = vec![
        QualityIssueStatus {
            value: "open".to_string(),
            label: "待处理".to_string(),
        },
        QualityIssueStatus {
            value: "in_progress".to_string(),
            label: "处理中".to_string(),
        },
        QualityIssueStatus {
            value: "resolved".to_string(),
            label: "已解决".to_string(),
        },
        QualityIssueStatus {
            value: "closed".to_string(),
            label: "已关闭".to_string(),
        },
    ];

    for status in statuses {
        assert!(!status.value.is_empty());
        assert!(!status.label.is_empty());
    }
}

#[test]
fn test_issue_number_generation() {
    let issue_no = format!(
        "QI-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    assert!(issue_no.starts_with("QI-"));
    assert_eq!(issue_no.len(), 11);
    assert!(issue_no.chars().skip(3).all(|c| c.is_alphanumeric()));
}

#[test]
fn test_issue_pagination_calculation() {
    let test_cases = vec![(1, 10, 0), (2, 10, 10), (5, 20, 80), (10, 50, 450)];

    for (page, page_size, expected_offset) in test_cases {
        let offset = (page - 1) * page_size;
        assert_eq!(offset, expected_offset);
    }
}
