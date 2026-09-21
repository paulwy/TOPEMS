use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/production-processes",
            get(list_processes).post(create_process),
        )
        .route(
            "/production-processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionProcess {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub process_type: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub unit: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProcessRequest {
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub process_type: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProcessRequest {
    pub process_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub process_type: Option<String>,
    pub standard_time: Option<BigDecimal>,
    pub unit: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProcessQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-processes",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn list_processes(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ProcessQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));
    let locale = Locale::from_headers(&headers).as_sql();

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, tenant_id, process_no,
               CASE WHEN $4 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               description, process_type, standard_time, unit, status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        FROM pdm_production_processes
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR process_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(locale)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(processes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_processes
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::text IS NULL OR process_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "processes": processes,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取工序列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取工序列表失败: {}", e);
            Json(ApiResponse::error(500, "获取工序列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pdm:bom:write"])),
    path = "/api/pdm/production-processes",
    request_body = CreateProcessRequest,
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn create_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<CreateProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    if req.process_no.is_empty() {
        return Json(ApiResponse::error(400, "工序编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "工序名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        INSERT INTO pdm_production_processes (tenant_id, process_no, name, description, process_type, standard_time, unit, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, process_no, name, description, process_type, standard_time, unit, status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.process_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.process_type)
    .bind(&req.standard_time)
    .bind(&req.unit)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(process) => Json(ApiResponse::success(process, "工序创建成功")),
        Err(e) => {
            tracing::error!("创建工序失败: {}", e);
            Json(ApiResponse::error(500, "创建工序失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pdm:read"])),
    path = "/api/pdm/production-processes/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionProcess>> {
    let tenant_id: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        Some(claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok()).unwrap_or_default())
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, tenant_id, process_no,
               CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               description, process_type, standard_time, unit, status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        FROM pdm_production_processes WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(locale)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(process)) => Json(ApiResponse::success(process, "获取工序成功")),
        Ok(None) => Json(ApiResponse::error(404, "工序不存在")),
        Err(e) => {
            tracing::error!("获取工序失败: {}", e);
            Json(ApiResponse::error(500, "获取工序失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pdm:update"])),
    path = "/api/pdm/production-processes/{id}",
    request_body = UpdateProcessRequest,
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        UPDATE pdm_production_processes SET
            process_no = COALESCE($2, process_no),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            process_type = COALESCE($5, process_type),
            standard_time = COALESCE($6, standard_time),
            unit = COALESCE($7, unit),
            status = COALESCE($8, status),
            updated_at = $9
        WHERE id = $1 AND tenant_id = $10
        RETURNING id, tenant_id, process_no, name, description, process_type, standard_time, unit, status, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
    )
    .bind(id)
    .bind(&req.process_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.process_type)
    .bind(&req.standard_time)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(process)) => Json(ApiResponse::success(process, "工序更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "工序不存在")),
        Err(e) => {
            tracing::error!("更新工序失败: {}", e);
            Json(ApiResponse::error(500, "更新工序失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pdm:delete"])),
    path = "/api/pdm/production-processes/{id}",
    tag = "pdm",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_process(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query(
        "UPDATE pdm_production_processes SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "工序删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "工序不存在")),
        Err(e) => {
            tracing::error!("删除工序失败: {}", e);
            Json(ApiResponse::error(500, "删除工序失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde_json::json;
    use sqlx::types::BigDecimal;

    #[test]
    fn test_create_routes_smoke() {
        let _router = create_routes();
    }

    #[test]
    fn test_production_process_serde_roundtrip() {
        let p = ProductionProcess {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            process_no: "PROC-001".to_string(),
            name: "Assembly".to_string(),
            description: Some("Assemble parts".to_string()),
            process_type: Some("manufacturing".to_string()),
            standard_time: Some(BigDecimal::from(10)),
            unit: Some("hours".to_string()),
            status: "active".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let serialized = serde_json::to_string(&p).unwrap();
        let d: ProductionProcess = serde_json::from_str(&serialized).unwrap();
        assert_eq!(d.id, p.id);
        assert_eq!(d.process_no, "PROC-001");
        assert_eq!(d.name, "Assembly");
        assert_eq!(d.status, "active");
        assert_eq!(d.description.as_deref(), Some("Assemble parts"));
        assert_eq!(d.process_type.as_deref(), Some("manufacturing"));
        assert_eq!(d.unit.as_deref(), Some("hours"));
    }

    #[test]
    fn test_production_process_serde_all_optionals_none() {
        let p = ProductionProcess {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            process_no: "P1".to_string(),
            name: "N".to_string(),
            description: None,
            process_type: None,
            standard_time: None,
            unit: None,
            status: "inactive".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let serialized = serde_json::to_value(&p).unwrap();
        assert!(serialized["description"].is_null());
        assert!(serialized["process_type"].is_null());
        assert!(serialized["standard_time"].is_null());
        assert!(serialized["unit"].is_null());
    }

    #[test]
    fn test_create_process_request_deserialize_full() {
        let j = json!({
            "process_no": "PROC-002",
            "name": "Cutting",
            "description": "Cut materials",
            "process_type": "machining",
            "standard_time": "5.5",
            "unit": "min",
            "status": "active"
        });
        let req: CreateProcessRequest = serde_json::from_value(j).unwrap();
        assert_eq!(req.process_no, "PROC-002");
        assert_eq!(req.name, "Cutting");
        assert_eq!(req.description.as_deref(), Some("Cut materials"));
        assert_eq!(req.process_type.as_deref(), Some("machining"));
        assert!(req.standard_time.is_some());
        assert_eq!(req.unit.as_deref(), Some("min"));
        assert_eq!(req.status.as_deref(), Some("active"));
    }

    #[test]
    fn test_create_process_request_deserialize_minimal() {
        let j = json!({
            "process_no": "P2",
            "name": "N2"
        });
        let req: CreateProcessRequest = serde_json::from_value(j).unwrap();
        assert_eq!(req.process_no, "P2");
        assert_eq!(req.name, "N2");
        assert!(req.description.is_none());
        assert!(req.process_type.is_none());
        assert!(req.standard_time.is_none());
        assert!(req.unit.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_process_request_deserialize_empty() {
        let j = json!({});
        let req: UpdateProcessRequest = serde_json::from_value(j).unwrap();
        assert!(req.process_no.is_none());
        assert!(req.name.is_none());
        assert!(req.description.is_none());
        assert!(req.process_type.is_none());
        assert!(req.standard_time.is_none());
        assert!(req.unit.is_none());
        assert!(req.status.is_none());
    }

    #[test]
    fn test_update_process_request_deserialize_partial() {
        let j = json!({
            "status": "inactive",
            "name": "Updated"
        });
        let req: UpdateProcessRequest = serde_json::from_value(j).unwrap();
        assert_eq!(req.status.as_deref(), Some("inactive"));
        assert_eq!(req.name.as_deref(), Some("Updated"));
        assert!(req.process_no.is_none());
    }

    #[test]
    fn test_process_query_deserialize_empty() {
        let j = json!({});
        let q: ProcessQuery = serde_json::from_value(j).unwrap();
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.status.is_none());
    }

    #[test]
    fn test_process_query_deserialize_filled() {
        let j = json!({
            "page": 3,
            "page_size": 50,
            "search": "assemble",
            "status": "active"
        });
        let q: ProcessQuery = serde_json::from_value(j).unwrap();
        assert_eq!(q.page, Some(3));
        assert_eq!(q.page_size, Some(50));
        assert_eq!(q.search.as_deref(), Some("assemble"));
        assert_eq!(q.status.as_deref(), Some("active"));
    }
}
