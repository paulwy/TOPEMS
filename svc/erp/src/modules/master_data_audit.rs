//! V35.0 AC-7: 主数据变更审计追踪
//!
//! 记录主数据变更历史（创建/更新/删除/同步），支持查询审计追踪列表。
//! 从 master_data_refs.rs 拆分。

use axum::extract::{Extension, Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared::ApiResponse;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::PaginatedResponse;
use utoipa::IntoParams;

use super::ApiState;

#[derive(Debug, Serialize)]
pub struct MasterDataAuditEvent {
    pub id: String,
    pub master_data_id: String,
    pub domain: String,
    pub action: String,
    pub source_service: String,
    pub target_service: String,
    pub changed_by: Option<String>,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RecordAuditRequest {
    pub master_data_id: String,
    pub domain: String,
    pub action: String,
    pub source_service: String,
    pub target_service: Option<String>,
    pub changed_by: Option<String>,
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct AuditTrailQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 记录主数据变更审计事件
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/audit-trail",
    tag = "Master Data",
    operation_id = "record_audit_event",
    responses((status = 200, description = "OK")),
)]
pub async fn record_audit_event(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RecordAuditRequest>,
) -> Json<ApiResponse<MasterDataAuditEvent>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = uuid::Uuid::new_v4();
    let now = chrono::Utc::now();
    let target_service = req.target_service.unwrap_or_else(|| "erp".to_string());

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        r#"INSERT INTO erp_master_data_audit_trail
           (id, master_data_id, domain, action, source_service, target_service,
            changed_by, old_values, new_values, created_at)
           VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)"#
    ))
    .bind(id)
    .bind(&req.master_data_id)
    .bind(&req.domain)
    .bind(&req.action)
    .bind(&req.source_service)
    .bind(&target_service)
    .bind(&req.changed_by)
    .bind(&req.old_values)
    .bind(&req.new_values)
    .bind(now)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                MasterDataAuditEvent {
                    id: id.to_string(),
                    master_data_id: req.master_data_id,
                    domain: req.domain,
                    action: req.action,
                    source_service: req.source_service,
                    target_service,
                    changed_by: req.changed_by,
                    old_values: req.old_values,
                    new_values: req.new_values,
                    created_at: now.to_rfc3339(),
                },
                "审计事件记录成功",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 记录审计事件失败: {}", e);
            Json(ApiResponse::error(500, &format!("记录审计事件失败: {}", e)))
        }
    }
}

/// 查询主数据变更审计历史
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/{master_data_id}/audit-trail",
    tag = "Master Data",
    operation_id = "get_audit_trail",
    params(AuditTrailQuery),
    responses((status = 200, description = "OK")),
)]
pub async fn get_audit_trail(
    State(_state): State<ApiState>,
    Path(master_data_id): Path<String>,
    Query(params): Query<AuditTrailQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<MasterDataAuditEvent>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(only_own_schema_query!(
        "erp",
        r#"SELECT id, master_data_id, domain, action, source_service, target_service,
                  changed_by, old_values, new_values, created_at
           FROM erp_master_data_audit_trail
           WHERE master_data_id = $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3"#
    ))
    .bind(&master_data_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<MasterDataAuditEvent> = rows
                .iter()
                .map(|r| MasterDataAuditEvent {
                    id: r
                        .try_get::<uuid::Uuid, _>("id")
                        .unwrap_or_default()
                        .to_string(),
                    master_data_id: r.try_get::<String, _>("master_data_id").unwrap_or_default(),
                    domain: r.try_get::<String, _>("domain").unwrap_or_default(),
                    action: r.try_get::<String, _>("action").unwrap_or_default(),
                    source_service: r.try_get::<String, _>("source_service").unwrap_or_default(),
                    target_service: r.try_get::<String, _>("target_service").unwrap_or_default(),
                    changed_by: r.try_get::<Option<String>, _>("changed_by").ok().flatten(),
                    old_values: r
                        .try_get::<Option<serde_json::Value>, _>("old_values")
                        .ok()
                        .flatten(),
                    new_values: r
                        .try_get::<Option<serde_json::Value>, _>("new_values")
                        .ok()
                        .flatten(),
                    created_at: r
                        .try_get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .unwrap_or_else(|_| chrono::Utc::now())
                        .to_rfc3339(),
                })
                .collect();
            let total = items.len() as i64;
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "审计追踪列表",
            ))
        }
        Err(e) => {
            tracing::warn!("[erp-mdm] 查询审计追踪失败: {}", e);
            Json(ApiResponse::success(
                PaginatedResponse::new(vec![], 0, page, page_size),
                "审计追踪列表（空）",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_master_data_audit_event_serialization() {
        let event = MasterDataAuditEvent {
            id: "audit1".to_string(),
            master_data_id: "md1".to_string(),
            domain: "customer".to_string(),
            action: "update".to_string(),
            source_service: "crm".to_string(),
            target_service: "erp".to_string(),
            changed_by: Some("admin".to_string()),
            old_values: Some(serde_json::json!({"name": "旧名称"})),
            new_values: Some(serde_json::json!({"name": "新名称"})),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["id"], "audit1");
        assert_eq!(json["master_data_id"], "md1");
        assert_eq!(json["domain"], "customer");
        assert_eq!(json["action"], "update");
        assert_eq!(json["source_service"], "crm");
        assert_eq!(json["target_service"], "erp");
        assert_eq!(json["changed_by"], "admin");
        assert_eq!(json["old_values"]["name"], "旧名称");
        assert_eq!(json["new_values"]["name"], "新名称");
    }

    #[test]
    fn test_master_data_audit_event_minimal() {
        let event = MasterDataAuditEvent {
            id: "audit2".to_string(),
            master_data_id: "md2".to_string(),
            domain: "product".to_string(),
            action: "create".to_string(),
            source_service: "erp".to_string(),
            target_service: "wms".to_string(),
            changed_by: None,
            old_values: None,
            new_values: None,
            created_at: "2024-01-02T00:00:00Z".to_string(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["action"], "create");
        assert!(json["changed_by"].is_null());
        assert!(json["old_values"].is_null());
        assert!(json["new_values"].is_null());
    }

    #[test]
    fn test_record_audit_request_deserialize() {
        let json = r#"{
            "master_data_id": "md1",
            "domain": "customer",
            "action": "update",
            "source_service": "crm",
            "target_service": "erp",
            "changed_by": "admin",
            "old_values": {"name": "旧名称"},
            "new_values": {"name": "新名称"}
        }"#;
        let request: RecordAuditRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.master_data_id, "md1");
        assert_eq!(request.domain, "customer");
        assert_eq!(request.action, "update");
        assert_eq!(request.source_service, "crm");
        assert_eq!(request.target_service.as_deref(), Some("erp"));
        assert_eq!(request.changed_by.as_deref(), Some("admin"));
    }

    #[test]
    fn test_record_audit_request_minimal() {
        let json = r#"{
            "master_data_id": "md2",
            "domain": "product",
            "action": "create",
            "source_service": "erp"
        }"#;
        let request: RecordAuditRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.master_data_id, "md2");
        assert!(request.target_service.is_none());
        assert!(request.changed_by.is_none());
        assert!(request.old_values.is_none());
        assert!(request.new_values.is_none());
    }

    #[test]
    fn test_audit_trail_query_deserialize() {
        let query = "page=1&page_size=20";
        let params: AuditTrailQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
    }

    #[test]
    fn test_audit_trail_query_default() {
        let query = "";
        let params: AuditTrailQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }
}
