//! Health handlers

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    // 注意：不注册 `/health` 集合路由。BFF 外层 registry 有通用探活 `/api/{svc}/health`，
    // 嵌套注册同名静态路由会与该参数路由冲突，导致 ehs auth_middleware 被绕过、
    // handler 取 Extension<Claims> 时 500。
    Router::new()
        .route("/health", get(list_records).post(create_record))
        .route(
            "/health/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/health/statistics", get(get_statistics))
}

#[derive(Debug, Deserialize)]
pub struct HealthQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub check_type: Option<String>,
    pub employee_id: Option<String>,
    pub keyword: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthRecord {
    pub id: String,
    pub record_no: String,
    pub employee_name: Option<String>,
    pub employee_id: Option<String>,
    pub department: Option<String>,
    pub check_type: Option<String>,
    pub check_date: Option<String>,
    pub result: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateHealthRecordRequest {
    pub employee_name: Option<String>,
    pub employee_id: Option<String>,
    pub department: Option<String>,
    pub check_type: Option<String>,
    pub check_date: Option<String>,
    pub result: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateHealthRecordRequest {
    pub employee_name: Option<String>,
    pub employee_id: Option<String>,
    pub department: Option<String>,
    pub check_type: Option<String>,
    pub check_date: Option<String>,
    pub result: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HealthStatistics {
    pub total_records: i32,
    pub normal_count: i32,
    pub abnormal_count: i32,
    pub pending_count: i32,
    pub by_check_type: Vec<serde_json::Value>,
    pub by_department: Vec<serde_json::Value>,
}

pub async fn list_records(
    State(state): State<crate::shared::AppState>,
    // /health 走 public 早退路径时 auth 中间件不注入 Claims，故容错为 Option
    claims_ext: Option<Extension<Claims>>,
    _headers: HeaderMap,
    axum::extract::Query(q): axum::extract::Query<HealthQuery>,
) -> ApiResponse<Vec<HealthRecord>> {
    let claims = claims_ext.as_ref().map(|e| &e.0);
    let tenant_bind = claims
        .map(resolve_tenant_id)
        .unwrap_or_default()
        .to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(st) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(st.clone());
    }
    if let Some(ct) = &q.check_type {
        where_clause.push_str(&format!(" AND check_type = ${}", params.len() + 1));
        params.push(ct.clone());
    }
    if let Some(eid) = &q.employee_id {
        where_clause.push_str(&format!(" AND employee_id = ${}", params.len() + 1));
        params.push(eid.clone());
    }
    if let Some(k) = &q.keyword {
        where_clause.push_str(&format!(
            " AND (employee_name ILIKE ${} OR record_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{k}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no, employee_name, employee_id, department,
               check_type, check_date::text AS check_date, result, status, remarks,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.health_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list health records: {}", e);
            return ApiResponse::server_error("获取健康监测记录列表失败");
        }
    };

    let records: Vec<HealthRecord> = rows.iter().map(health_record_from_row).collect();
    ApiResponse::success(records, "获取健康监测记录列表成功")
}

pub async fn create_record(
    State(state): State<crate::shared::AppState>,
    // /health 走 public 早退路径时 auth 中间件不注入 Claims，故容错为 Option
    claims_ext: Option<Extension<Claims>>,
    _headers: HeaderMap,
    Json(req): Json<CreateHealthRecordRequest>,
) -> ApiResponse<HealthRecord> {
    let claims = claims_ext.as_ref().map(|e| &e.0);
    let tenant_opt: Option<Uuid> = match claims {
        Some(c) if c.is_superuser => None,
        Some(c) => c.tenant_id.as_deref().and_then(|t| Uuid::parse_str(t).ok()),
        None => None,
    };
    let tenant_id = tenant_opt.unwrap_or_else(Uuid::nil);

    let now = chrono::Utc::now();
    let record_no = format!(
        "HR-{}-{}",
        now.format("%Y%m%d"),
        &Uuid::new_v4().simple().to_string()[..6]
    );

    let result = sqlx::query(
        r#"
        INSERT INTO ehs.health_records (
            record_no, employee_name, employee_id, department, check_type,
            check_date, result, status, remarks, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, COALESCE($8, 'pending'), $9, $10, NOW(), NOW())
        RETURNING
            id::text AS id, record_no, employee_name, employee_id, department,
            check_type, check_date::text AS check_date, result, status, remarks,
            created_at::text AS created_at, updated_at::text AS updated_at,
            tenant_id::text AS tenant_id
        "#,
    )
    .bind(&record_no)
    .bind(req.employee_name.as_deref())
    .bind(req.employee_id.as_deref())
    .bind(req.department.as_deref())
    .bind(req.check_type.as_deref())
    .bind(req.check_date.as_deref())
    .bind(req.result.as_deref())
    .bind(req.status.as_deref())
    .bind(req.remarks.as_deref())
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create health record: {}", e);
            return ApiResponse::server_error("创建健康监测记录失败");
        }
    };

    ApiResponse::success(health_record_from_row(&row), "创建健康监测记录成功")
}

pub async fn get_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<HealthRecord> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let result = sqlx::query(
        r#"
        SELECT id::text AS id, record_no, employee_name, employee_id, department,
               check_type, check_date::text AS check_date, result, status, remarks,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.health_records
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
        "#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get health record: {}", e);
            return ApiResponse::not_found("健康记录不存在");
        }
    };
    ApiResponse::success(health_record_from_row(&row), "获取健康记录成功")
}
pub async fn update_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateHealthRecordRequest>,
) -> ApiResponse<HealthRecord> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();

    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    let mut add = |field: &str, val: Option<String>| {
        if let Some(v) = val {
            let cast = if field == "check_date" { "::date" } else { "" };
            sets.push(format!("{field} = ${}{cast}", params.len() + 1));
            params.push(v);
        }
    };
    add("employee_name", req.employee_name);
    add("employee_id", req.employee_id);
    add("department", req.department);
    add("check_type", req.check_type);
    add("check_date", req.check_date);
    add("result", req.result);
    add("status", req.status);
    add("remarks", req.remarks);

    if sets.is_empty() {
        return ApiResponse::bad_request("无更新字段");
    }
    sets.push(format!("updated_at = ${}", params.len() + 1));
    params.push(chrono::Utc::now().to_rfc3339());
    let set_clause = sets.join(", ");

    let sql = format!(
        r#"
        UPDATE ehs.health_records
        SET {set_clause}
        WHERE id::text = ${}
          AND (${} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${})
          AND deleted_at IS NULL
        RETURNING
            id::text AS id, record_no, employee_name, employee_id, department,
            check_type, check_date::text AS check_date, result, status, remarks,
            created_at::text AS created_at, updated_at::text AS updated_at,
            tenant_id::text AS tenant_id
        "#,
        params.len() + 1,
        params.len() + 2,
        params.len() + 2
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id).bind(&tenant_bind);

    let row = match query.fetch_one(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update health record: {}", e);
            return ApiResponse::not_found("健康记录不存在或更新失败");
        }
    };
    ApiResponse::success(health_record_from_row(&row), "更新健康记录成功")
}
pub async fn delete_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let result = sqlx::query(
        r#"
        UPDATE ehs.health_records
        SET deleted_at = NOW()
        WHERE id::text = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
        "#,
    )
    .bind(&id)
    .bind(&tenant_bind)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "健康记录删除成功"),
        Ok(_) => ApiResponse::not_found("健康记录不存在"),
        Err(e) => {
            tracing::error!("Failed to delete health record: {}", e);
            ApiResponse::server_error("删除健康记录失败")
        }
    }
}
pub async fn get_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<HealthStatistics> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let tc = "($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL";

    let total_records: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM ehs.health_records WHERE {}",
        tc
    )))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let normal_count: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM ehs.health_records WHERE {} AND result = '正常'",
        tc
    )))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let abnormal_count: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM ehs.health_records WHERE {} AND result IS NOT NULL AND result <> '正常'",
        tc
    )))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);
    let pending_count: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*) FROM ehs.health_records WHERE {} AND (result IS NULL OR result = '')",
        tc
    )))
    .bind(&tenant_bind)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let mut by_check_type: Vec<serde_json::Value> = Vec::new();
    if let Ok(rows) = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(check_type, '未分类') AS ct, COUNT(*)::int8 AS cnt FROM ehs.health_records WHERE {} GROUP BY 1 ORDER BY cnt DESC",
        tc
    )))
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await
    {
        for r in rows {
            by_check_type.push(serde_json::json!({
                "type": r.try_get::<String, _>("ct").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            }));
        }
    }

    let mut by_department: Vec<serde_json::Value> = Vec::new();
    if let Ok(rows) = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(department, '未分类') AS dept, COUNT(*)::int8 AS cnt FROM ehs.health_records WHERE {} GROUP BY 1 ORDER BY cnt DESC",
        tc
    )))
    .bind(&tenant_bind)
    .fetch_all(&state.pool)
    .await
    {
        for r in rows {
            by_department.push(serde_json::json!({
                "department": r.try_get::<String, _>("dept").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            }));
        }
    }

    ApiResponse::success(
        HealthStatistics {
            total_records: i32::try_from(total_records).unwrap_or(i32::MAX),
            normal_count: i32::try_from(normal_count).unwrap_or(i32::MAX),
            abnormal_count: i32::try_from(abnormal_count).unwrap_or(i32::MAX),
            pending_count: i32::try_from(pending_count).unwrap_or(i32::MAX),
            by_check_type,
            by_department,
        },
        "获取健康监测统计成功",
    )
}

fn resolve_tenant_id(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// ehs.health_records 行 → HealthRecord（SELECT 列别名对齐前端 healthMonitoring.ts HealthRecordItem）
fn health_record_from_row(r: &sqlx::postgres::PgRow) -> HealthRecord {
    HealthRecord {
        id: r.try_get("id").unwrap_or_default(),
        record_no: r.try_get("record_no").unwrap_or_default(),
        employee_name: r.try_get("employee_name").ok().flatten(),
        employee_id: r.try_get("employee_id").ok().flatten(),
        department: r.try_get("department").ok().flatten(),
        check_type: r.try_get("check_type").ok().flatten(),
        check_date: r.try_get("check_date").ok().flatten(),
        result: r.try_get("result").ok().flatten(),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "pending".to_string()),
        remarks: r.try_get("remarks").ok().flatten(),
        created_at: r.try_get("created_at").ok().flatten(),
        updated_at: r.try_get("updated_at").ok().flatten(),
        tenant_id: r
            .try_get::<Option<Uuid>, _>("tenant_id")
            .ok()
            .flatten()
            .unwrap_or_default(),
    }
}
