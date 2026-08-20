use axum::{
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/change-notices",
            get(list_change_notices).post(create_change_notice),
        )
        .route(
            "/change-notices/{id}",
            get(get_change_notice)
                .put(update_change_notice)
                .delete(delete_change_notice),
        )
        .route("/change-notices/{id}/submit", post(submit_change_notice))
        .route("/change-notices/{id}/approve", post(approve_change_notice))
        .route("/change-notices/{id}/reject", post(reject_change_notice))
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ChangeNotice {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub ecn_no: String,
    pub title: String,
    pub description: Option<String>,
    pub change_type: String,
    pub affected_items: serde_json::Value,
    pub reason: Option<String>,
    pub priority: String,
    pub status: String,
    pub initiator: String,
    pub approver: Option<String>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub effective_date: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChangeNoticeRequest {
    pub title: String,
    pub description: Option<String>,
    pub change_type: String,
    pub affected_items: Vec<String>,
    pub reason: Option<String>,
    pub priority: String,
    pub initiator: String,
    pub effective_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChangeNoticeQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub change_type: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChangeNoticeRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub change_type: Option<String>,
    pub affected_items: Option<Vec<String>>,
    pub reason: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub approver: Option<String>,
    pub approved_at: Option<String>,
    pub effective_date: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:change:read"])),
    path = "/api/pdm/change-notices",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_change_notices(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ChangeNoticeQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        SELECT id, tenant_id, ecn_no, title, description, change_type, affected_items,
               reason, priority, status, initiator, approver, approved_at,
               effective_date, created_at, updated_at
        FROM pdm_change_notices
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR ecn_no ILIKE $2 OR title ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR change_type = $4)
          AND ($5::text IS NULL OR priority = $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.change_type)
    .bind(&query.priority)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(notices) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_change_notices
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR ecn_no ILIKE $2 OR title ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR change_type = $4)
                  AND ($5::text IS NULL OR priority = $5)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.change_type)
            .bind(&query.priority)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "notices": notices,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取变更通知列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取变更通知列表失败: {}", e);
            Json(ApiResponse::error(500, "获取变更通知列表失败"))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:change:admin"])),
    path = "/api/pdm/change-notices",
    request_body = CreateChangeNoticeRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateChangeNoticeRequest>,
) -> Json<ApiResponse<ChangeNotice>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.title.is_empty() {
        return Json(ApiResponse::error(400, "变更通知标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let ecn_no = format!(
        "ECN-{}-{}",
        now.format("%Y%m%d"),
        id.to_string().split('-').next().unwrap_or("00000000")
    );

    let affected_items_value = match serde_json::to_value(req.affected_items) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("序列化受影响项失败: {}", e);
            return Json(ApiResponse::error(500, "受影响项数据格式错误"));
        }
    };

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        INSERT INTO pdm_change_notices (
            id, tenant_id, ecn_no, title, description, change_type, affected_items,
            reason, priority, status, initiator, effective_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, tenant_id, ecn_no, title, description, change_type, affected_items,
                  reason, priority, status, initiator, approver, approved_at,
                  effective_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&ecn_no)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.change_type)
    .bind(affected_items_value)
    .bind(&req.reason)
    .bind(&req.priority)
    .bind("draft")
    .bind(&req.initiator)
    .bind(req.effective_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(notice) => Json(ApiResponse::success(notice, "变更通知创建成功")),
        Err(e) => {
            tracing::error!("创建变更通知失败: {}", e);
            Json(ApiResponse::error(500, "创建变更通知失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:change:read"])),
    path = "/api/pdm/change-notices/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ChangeNotice>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        SELECT id, tenant_id, ecn_no, title, description, change_type, affected_items,
               reason, priority, status, initiator, approver, approved_at,
               effective_date, created_at, updated_at
        FROM pdm_change_notices WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(notice)) => Json(ApiResponse::success(notice, "获取变更通知成功")),
        Ok(None) => Json(ApiResponse::error(404, "变更通知不存在")),
        Err(e) => {
            tracing::error!("获取变更通知失败: {}", e);
            Json(ApiResponse::error(500, "获取变更通知失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:change:admin"])),
    path = "/api/pdm/change-notices/{id}",
    request_body = UpdateChangeNoticeRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateChangeNoticeRequest>,
) -> Json<ApiResponse<ChangeNotice>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, ChangeNotice>(
        r#"
        SELECT id, tenant_id, ecn_no, title, description, change_type, affected_items,
               reason, priority, status, initiator, approver, approved_at,
               effective_date, created_at, updated_at
        FROM pdm_change_notices WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "变更通知不存在")),
        Err(e) => {
            tracing::error!("查询变更通知失败: {}", e);
            return Json(ApiResponse::error(500, "查询变更通知失败"));
        }
    };

    let title = req.title.unwrap_or(existing.title);
    let description = req.description.or(existing.description);
    let change_type = req.change_type.unwrap_or(existing.change_type);
    let affected_items = req
        .affected_items
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::Value::Null))
        .unwrap_or(existing.affected_items);
    let reason = req.reason.or(existing.reason);
    let priority = req.priority.unwrap_or(existing.priority);
    let status = req.status.unwrap_or(existing.status);
    let approver = req.approver.or(existing.approver);
    let approved_at = req
        .approved_at
        .or(existing.approved_at.map(|d| d.to_rfc3339()));
    let effective_date = req
        .effective_date
        .or(existing.effective_date.map(|d| d.to_rfc3339()));
    let now = Utc::now();

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        UPDATE pdm_change_notices SET
            title = $2, description = $3, change_type = $4, affected_items = $5,
            reason = $6, priority = $7, status = $8, approver = $9,
            approved_at = $10, effective_date = $11, updated_at = $12
        WHERE id = $1 AND tenant_id = $13
        RETURNING id, tenant_id, ecn_no, title, description, change_type, affected_items,
                  reason, priority, status, initiator, approver, approved_at,
                  effective_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&title)
    .bind(&description)
    .bind(&change_type)
    .bind(affected_items)
    .bind(&reason)
    .bind(&priority)
    .bind(&status)
    .bind(&approver)
    .bind(approved_at)
    .bind(effective_date)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(notice) => Json(ApiResponse::success(notice, "变更通知更新成功")),
        Err(e) => {
            tracing::error!("更新变更通知失败: {}", e);
            Json(ApiResponse::error(500, "更新变更通知失败"))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:change:admin"])),
    path = "/api/pdm/change-notices/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE pdm_change_notices SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "变更通知删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "变更通知不存在")),
        Err(e) => {
            tracing::error!("删除变更通知失败: {}", e);
            Json(ApiResponse::error(500, "删除变更通知失败"))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:change:admin"])),
    path = "/api/pdm/change-notices/{id}/submit",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn submit_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ChangeNotice>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        UPDATE pdm_change_notices SET status = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4 AND status = 'draft'
        RETURNING id, tenant_id, ecn_no, title, description, change_type, affected_items,
                  reason, priority, status, initiator, approver, approved_at,
                  effective_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind("pending")
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(notice)) => Json(ApiResponse::success(notice, "变更通知已提交审批")),
        Ok(None) => Json(ApiResponse::error(400, "变更通知状态不正确，无法提交")),
        Err(e) => {
            tracing::error!("提交变更通知失败: {}", e);
            Json(ApiResponse::error(500, "提交变更通知失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:change:admin"])),
    path = "/api/pdm/change-notices/{id}/approve",
    request_body = serde_json::Value,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn approve_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<ChangeNotice>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let approver = req
        .get("approver")
        .and_then(|v| v.as_str())
        .unwrap_or("system");
    let now = Utc::now();

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        UPDATE pdm_change_notices SET
            status = $2, approver = $3, approved_at = $4, updated_at = $5
        WHERE id = $1 AND tenant_id = $6 AND status = 'pending'
        RETURNING id, tenant_id, ecn_no, title, description, change_type, affected_items,
                  reason, priority, status, initiator, approver, approved_at,
                  effective_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind("approved")
    .bind(approver)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(notice)) => Json(ApiResponse::success(notice, "变更通知审批通过")),
        Ok(None) => Json(ApiResponse::error(400, "变更通知状态不正确，无法审批")),
        Err(e) => {
            tracing::error!("审批变更通知失败: {}", e);
            Json(ApiResponse::error(500, "审批变更通知失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:change:admin"])),
    path = "/api/pdm/change-notices/{id}/reject",
    request_body = serde_json::Value,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn reject_change_notice(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<ChangeNotice>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let approver = req
        .get("approver")
        .and_then(|v| v.as_str())
        .unwrap_or("system");
    let reason = req
        .get("reason")
        .and_then(|v| v.as_str())
        .unwrap_or("审批未通过");
    let now = Utc::now();

    let result = sqlx::query_as::<_, ChangeNotice>(
        r#"
        UPDATE pdm_change_notices SET
            status = $2, approver = $3, approved_at = $4, reason = $5, updated_at = $6
        WHERE id = $1 AND tenant_id = $7 AND status = 'pending'
        RETURNING id, tenant_id, ecn_no, title, description, change_type, affected_items,
                  reason, priority, status, initiator, approver, approved_at,
                  effective_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind("rejected")
    .bind(approver)
    .bind(now)
    .bind(reason)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(notice)) => Json(ApiResponse::success(notice, "变更通知已驳回")),
        Ok(None) => Json(ApiResponse::error(400, "变更通知状态不正确，无法驳回")),
        Err(e) => {
            tracing::error!("驳回变更通知失败: {}", e);
            Json(ApiResponse::error(500, "驳回变更通知失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json::json;

    #[test]
    fn test_create_routes_smoke() {
        let _router = create_routes();
    }

    #[test]
    fn test_change_notice_serde_roundtrip() {
        let notice = ChangeNotice {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            ecn_no: "ECN-20240101-00000000".to_string(),
            title: "Test Change Notice".to_string(),
            description: Some("A test description".to_string()),
            change_type: "minor".to_string(),
            affected_items: json!(["item1", "item2"]),
            reason: Some("Test reason".to_string()),
            priority: "normal".to_string(),
            status: "draft".to_string(),
            initiator: "user1".to_string(),
            approver: Some("approver1".to_string()),
            approved_at: Some(Utc::now()),
            effective_date: Some(Utc::now()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let serialized = serde_json::to_string(&notice).unwrap();
        let deserialized: ChangeNotice = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.id, notice.id);
        assert_eq!(deserialized.ecn_no, notice.ecn_no);
        assert_eq!(deserialized.title, notice.title);
        assert_eq!(deserialized.change_type, notice.change_type);
        assert_eq!(deserialized.priority, notice.priority);
        assert_eq!(deserialized.status, notice.status);
        assert_eq!(deserialized.initiator, notice.initiator);
    }

    #[test]
    fn test_change_notice_clone() {
        fn assert_debug<T: std::fmt::Debug>() {}
        assert_debug::<ChangeNotice>();
        let notice = ChangeNotice {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            ecn_no: "ECN-1".to_string(),
            title: "T".to_string(),
            description: None,
            change_type: "major".to_string(),
            affected_items: json!([]),
            reason: None,
            priority: "high".to_string(),
            status: "draft".to_string(),
            initiator: "u".to_string(),
            approver: None,
            approved_at: None,
            effective_date: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let _another = ChangeNotice {
            id: notice.id,
            tenant_id: notice.tenant_id,
            ecn_no: notice.ecn_no.clone(),
            title: notice.title.clone(),
            description: notice.description.clone(),
            change_type: notice.change_type.clone(),
            affected_items: notice.affected_items.clone(),
            reason: notice.reason.clone(),
            priority: notice.priority.clone(),
            status: notice.status.clone(),
            initiator: notice.initiator.clone(),
            approver: notice.approver.clone(),
            approved_at: notice.approved_at,
            effective_date: notice.effective_date,
            created_at: notice.created_at,
            updated_at: notice.updated_at,
        };
        assert_eq!(notice.id, _another.id);
    }

    #[test]
    fn test_create_change_notice_request_deserialize_full() {
        let json_value = json!({
            "title": "Full Request",
            "description": "A description",
            "change_type": "minor",
            "affected_items": ["P-001", "P-002"],
            "reason": "Because",
            "priority": "normal",
            "initiator": "alice",
            "effective_date": "2025-01-01T00:00:00Z"
        });
        let req: CreateChangeNoticeRequest = serde_json::from_value(json_value).unwrap();
        assert_eq!(req.title, "Full Request");
        assert_eq!(req.description.as_deref(), Some("A description"));
        assert_eq!(req.change_type, "minor");
        assert_eq!(req.affected_items, vec!["P-001", "P-002"]);
        assert_eq!(req.reason.as_deref(), Some("Because"));
        assert_eq!(req.priority, "normal");
        assert_eq!(req.initiator, "alice");
        assert!(req.effective_date.is_some());
    }

    #[test]
    fn test_create_change_notice_request_deserialize_minimal() {
        let json_value = json!({
            "title": "Minimal",
            "change_type": "minor",
            "affected_items": [],
            "priority": "normal",
            "initiator": "bob"
        });
        let req: CreateChangeNoticeRequest = serde_json::from_value(json_value).unwrap();
        assert_eq!(req.title, "Minimal");
        assert!(req.description.is_none());
        assert!(req.reason.is_none());
        assert!(req.effective_date.is_none());
    }

    #[test]
    fn test_change_notice_query_deserialize_empty() {
        let json_value = json!({});
        let q: ChangeNoticeQuery = serde_json::from_value(json_value).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.status.is_none());
        assert!(q.change_type.is_none());
        assert!(q.priority.is_none());
    }

    #[test]
    fn test_change_notice_query_deserialize_filled() {
        let json_value = json!({
            "page": 2,
            "page_size": 20,
            "search": "ECN",
            "status": "pending",
            "change_type": "minor",
            "priority": "high"
        });
        let q: ChangeNoticeQuery = serde_json::from_value(json_value).unwrap();
        assert_eq!(q.page, Some(2));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.search.as_deref(), Some("ECN"));
        assert_eq!(q.status.as_deref(), Some("pending"));
        assert_eq!(q.change_type.as_deref(), Some("minor"));
        assert_eq!(q.priority.as_deref(), Some("high"));
    }

    #[test]
    fn test_update_change_notice_request_deserialize_partial() {
        let json_value = json!({
            "title": "Updated",
            "status": "approved"
        });
        let req: UpdateChangeNoticeRequest = serde_json::from_value(json_value).unwrap();
        assert_eq!(req.title.as_deref(), Some("Updated"));
        assert_eq!(req.status.as_deref(), Some("approved"));
        assert!(req.description.is_none());
        assert!(req.change_type.is_none());
        assert!(req.affected_items.is_none());
    }

    #[test]
    fn test_update_change_notice_request_deserialize_all_none() {
        let json_value = json!({});
        let req: UpdateChangeNoticeRequest = serde_json::from_value(json_value).unwrap();
        assert!(req.title.is_none());
        assert!(req.description.is_none());
        assert!(req.change_type.is_none());
        assert!(req.affected_items.is_none());
        assert!(req.reason.is_none());
        assert!(req.priority.is_none());
        assert!(req.status.is_none());
        assert!(req.approver.is_none());
        assert!(req.approved_at.is_none());
        assert!(req.effective_date.is_none());
    }
}
