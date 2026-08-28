//! V461: Audit Log Export API
//!
//! Provides REST API endpoints for exporting permission audit logs in
//! CSV and JSON formats. Supports filtering and streaming export for
//! large datasets.

use axum::extract::{Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum::Router;

use crate::shared::AppState;
use super::permission_audit_log::{AuditLogEntry, AuditLogQuery};

// ===== Export Format =====

/// Export format for audit logs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    /// CSV format.
    Csv,
    /// JSON format.
    Json,
}

impl std::str::FromStr for ExportFormat {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "csv" => Ok(Self::Csv),
            "json" => Ok(Self::Json),
            _ => Err(format!("Unknown export format: {}. Use 'csv' or 'json'.", s)),
        }
    }
}

impl std::fmt::Display for ExportFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Csv => write!(f, "csv"),
            Self::Json => write!(f, "json"),
        }
    }
}

// ===== Export Query Parameters =====

/// Query parameters for audit log export.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ExportQuery {
    /// Export format: csv or json. Defaults to csv.
    #[serde(default = "default_format")]
    pub format: String,
    /// Filter by tenant ID (optional).
    #[serde(default)]
    pub tenant_id: Option<String>,
    /// Filter by user ID (optional).
    #[serde(default)]
    pub user_id: Option<String>,
    /// Filter by action (optional).
    #[serde(default)]
    pub action: Option<String>,
    /// Filter by actor (optional).
    #[serde(default)]
    pub changed_by: Option<String>,
    /// Start time (RFC3339, optional).
    #[serde(default)]
    pub start_time: Option<String>,
    /// End time (RFC3339, optional).
    #[serde(default)]
    pub end_time: Option<String>,
    /// Maximum number of records to export. Defaults to 10000.
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_format() -> String {
    "csv".to_string()
}

fn default_limit() -> usize {
    10000
}

impl Default for ExportQuery {
    fn default() -> Self {
        Self {
            format: default_format(),
            tenant_id: None,
            user_id: None,
            action: None,
            changed_by: None,
            start_time: None,
            end_time: None,
            limit: default_limit(),
        }
    }
}

impl From<&ExportQuery> for AuditLogQuery {
    fn from(q: &ExportQuery) -> Self {
        Self {
            tenant_id: q.tenant_id.clone(),
            user_id: q.user_id.clone(),
            action: q.action.clone(),
            changed_by: q.changed_by.clone(),
            start_time: q.start_time.clone(),
            end_time: q.end_time.clone(),
            limit: q.limit,
            offset: 0,
        }
    }
}

// ===== CSV Export =====

/// Convert audit log entries to CSV format.
fn entries_to_csv(entries: &[AuditLogEntry]) -> String {
    let mut csv = String::new();

    // Header
    csv.push_str("id,tenant_id,user_id,action,changed_by,changed_at,ip_address,user_agent,old_value,new_value,metadata\n");

    for entry in entries {
        let old_value = entry.old_value
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_default())
            .unwrap_or_default();
        let new_value = entry.new_value
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_default())
            .unwrap_or_default();
        let metadata = serde_json::to_string(&entry.metadata).unwrap_or_default();

        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{}\n",
            escape_csv_field(&entry.id),
            escape_csv_field(&entry.tenant_id),
            escape_csv_field(&entry.user_id),
            escape_csv_field(&entry.action.to_string()),
            escape_csv_field(&entry.changed_by),
            escape_csv_field(&entry.changed_at),
            escape_csv_field(&entry.ip_address.clone().unwrap_or_default()),
            escape_csv_field(&entry.user_agent.clone().unwrap_or_default()),
            escape_csv_field(&old_value),
            escape_csv_field(&new_value),
            escape_csv_field(&metadata),
        ));
    }

    csv
}

/// Escape a CSV field (wrap in quotes if contains commas, quotes, or newlines).
fn escape_csv_field(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') || field.contains('\r') {
        let escaped = field.replace('"', "\"\"");
        format!("\"{}\"", escaped)
    } else {
        field.to_string()
    }
}

// ===== JSON Export =====

/// Convert audit log entries to JSON format.
fn entries_to_json(entries: &[AuditLogEntry]) -> String {
    serde_json::to_string_pretty(entries).unwrap_or_else(|_| "[]".to_string())
}

// ===== Route Handlers =====

/// `GET /api/business-tools/permissions/audit-logs/export` — Export audit logs.
pub async fn export_audit_logs(
    State(state): State<AppState>,
    Query(query): Query<ExportQuery>,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    // Parse export format
    let format: ExportFormat = query.format.parse().map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": e,
            })),
        )
    })?;

    // Build audit log query
    let audit_query = AuditLogQuery::from(&query);

    // Query audit logs
    let response = state.audit_logger.query(&audit_query).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": format!("Failed to query audit logs: {}", e),
            })),
        )
    })?;

    // Generate filename with timestamp
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("audit_logs_{}.{}", timestamp, format);

    match format {
        ExportFormat::Csv => {
            let csv = entries_to_csv(&response.entries);
            Ok((
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "text/csv; charset=utf-8".to_string()),
                    (header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}\"", filename)),
                ],
                csv,
            ).into_response())
        }
        ExportFormat::Json => {
            let json = entries_to_json(&response.entries);
            Ok((
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "application/json".to_string()),
                    (header::CONTENT_DISPOSITION, format!("attachment; filename=\"{}\"", filename)),
                ],
                json,
            ).into_response())
        }
    }
}

// ===== Route Registration =====

/// Create audit log export routes.
pub fn audit_export_routes() -> Router<AppState> {
    Router::new().route(
        "/business-tools/permissions/audit-logs/export",
        axum::routing::get(export_audit_logs),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use crate::routes::business_tools::permission_audit_log::AuditAction;

    #[test]
    fn test_export_format_from_str() {
        assert_eq!("csv".parse::<ExportFormat>().unwrap(), ExportFormat::Csv);
        assert_eq!("json".parse::<ExportFormat>().unwrap(), ExportFormat::Json);
        assert_eq!("CSV".parse::<ExportFormat>().unwrap(), ExportFormat::Csv);
        assert_eq!("JSON".parse::<ExportFormat>().unwrap(), ExportFormat::Json);
        assert!("xml".parse::<ExportFormat>().is_err());
    }

    #[test]
    fn test_export_format_display() {
        assert_eq!(ExportFormat::Csv.to_string(), "csv");
        assert_eq!(ExportFormat::Json.to_string(), "json");
    }

    #[test]
    fn test_export_query_default() {
        let query = ExportQuery::default();
        assert_eq!(query.format, "csv");
        assert_eq!(query.limit, 10000);
        assert!(query.tenant_id.is_none());
    }

    #[test]
    fn test_export_query_to_audit_query() {
        let export_query = ExportQuery {
            format: "csv".to_string(),
            tenant_id: Some("t1".to_string()),
            user_id: Some("u1".to_string()),
            action: Some("create".to_string()),
            changed_by: Some("admin".to_string()),
            start_time: Some("2026-01-01T00:00:00Z".to_string()),
            end_time: Some("2026-12-31T23:59:59Z".to_string()),
            limit: 100,
        };

        let audit_query = AuditLogQuery::from(&export_query);
        assert_eq!(audit_query.tenant_id.as_deref(), Some("t1"));
        assert_eq!(audit_query.user_id.as_deref(), Some("u1"));
        assert_eq!(audit_query.action.as_deref(), Some("create"));
        assert_eq!(audit_query.changed_by.as_deref(), Some("admin"));
        assert_eq!(audit_query.limit, 100);
        assert_eq!(audit_query.offset, 0);
    }

    #[test]
    fn test_escape_csv_field_no_special_chars() {
        assert_eq!(escape_csv_field("hello"), "hello");
    }

    #[test]
    fn test_escape_csv_field_with_comma() {
        assert_eq!(escape_csv_field("hello,world"), "\"hello,world\"");
    }

    #[test]
    fn test_escape_csv_field_with_quote() {
        assert_eq!(escape_csv_field("hello\"world"), "\"hello\"\"world\"");
    }

    #[test]
    fn test_escape_csv_field_with_newline() {
        assert_eq!(escape_csv_field("hello\nworld"), "\"hello\nworld\"");
    }

    #[test]
    fn test_entries_to_csv() {
        let entries = vec![
            AuditLogEntry {
                id: "1".to_string(),
                tenant_id: "t1".to_string(),
                user_id: "u1".to_string(),
                action: AuditAction::Create,
                old_value: None,
                new_value: Some(serde_json::json!({"role": "admin"})),
                changed_by: "admin".to_string(),
                changed_at: "2026-01-01T00:00:00Z".to_string(),
                ip_address: Some("127.0.0.1".to_string()),
                user_agent: Some("TestAgent".to_string()),
                metadata: HashMap::new(),
            },
        ];

        let csv = entries_to_csv(&entries);
        assert!(csv.contains("id,tenant_id,user_id,action"));
        assert!(csv.contains("1,t1,u1,create,admin"));
        assert!(csv.contains("127.0.0.1"));
        assert!(csv.contains("TestAgent"));
    }

    #[test]
    fn test_entries_to_csv_empty() {
        let csv = entries_to_csv(&[]);
        assert_eq!(csv.lines().count(), 1); // Only header
        assert!(csv.contains("id,tenant_id,user_id,action"));
    }

    #[test]
    fn test_entries_to_json() {
        let entries = vec![
            AuditLogEntry {
                id: "1".to_string(),
                tenant_id: "t1".to_string(),
                user_id: "u1".to_string(),
                action: AuditAction::Create,
                old_value: None,
                new_value: None,
                changed_by: "admin".to_string(),
                changed_at: "2026-01-01T00:00:00Z".to_string(),
                ip_address: None,
                user_agent: None,
                metadata: HashMap::new(),
            },
        ];

        let json = entries_to_json(&entries);
        let parsed: Vec<AuditLogEntry> = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].id, "1");
        assert_eq!(parsed[0].tenant_id, "t1");
    }

    #[test]
    fn test_entries_to_json_empty() {
        let json = entries_to_json(&[]);
        assert_eq!(json, "[]");
    }
}
