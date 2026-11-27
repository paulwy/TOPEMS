//! Health handlers

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use uuid::Uuid;

use crate::shared::permission::{dual_scope, open_read_scope, open_write_scope};
use crate::shared::AppState;

/// 统计查询：租户通道显式绑定 tenant_id，系统通道显式不带 tenant_id 谓词。
async fn health_count(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    sql: String,
    tenant: Option<Uuid>,
) -> i64 {
    let mut q = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(sql));
    if let Some(t) = tenant {
        q = q.bind(t);
    }
    q.fetch_one(&mut *scope).await.unwrap_or(0)
}
pub fn create_routes() -> Router<AppState> {
    // 注意：业务集合路由不再挂在 `/health` 下。`/api/ehs/health` 保留给外层探活
    // （auth 中间件 is_public_path 的 ends_with("/health") 早退 + Traefik ehs-health-rewrite），
    // 业务读写统一走 `/health-monitor`，确保 Claims 正常注入、租户 scope 生效。
    Router::new()
        .route("/health-monitor", get(list_records).post(create_record))
        .route(
            "/health-monitor/{id}",
            get(get_record).put(update_record).delete(delete_record),
        )
        .route("/health-monitor/statistics", get(get_statistics))
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
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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

#[utoipa::path(
    security(("BearerAuth" = ["ehs:read"])),
    get,
    path = "/health-monitor",
    tag = "ehs",
    responses((status = 200, description = "OK"))
)]
pub async fn list_records(
    State(state): State<crate::shared::AppState>,
    // 防御：若中间件误将本路由判为 public 而不注入 Claims，仍 fail-closed 拒读/拒写
    claims_ext: Option<Extension<Claims>>,
    _headers: HeaderMap,
    axum::extract::Query(q): axum::extract::Query<HealthQuery>,
) -> ApiResponse<Vec<HealthRecord>> {
    let claims = match claims_ext {
        Some(Extension(c)) => c,
        None => {
            tracing::warn!(
                "[tenant_ctx] /api/ehs/health-monitor 未注入 Claims，拒读（fail-closed，不返回跨租户数据）"
            );
            return ApiResponse::unauthorized("缺少租户上下文，拒绝访问");
        }
    };
    let tenant_scope = match dual_scope(&claims, "ehs.health.list_records", "ehs.health_records") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open health scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(st) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(st.clone());
    }
    if let Some(ct) = &q.check_type {
        where_clause.push_str(&format!(
            " AND check_type = ${}",
            params.len() + filter_base
        ));
        params.push(ct.clone());
    }
    if let Some(eid) = &q.employee_id {
        where_clause.push_str(&format!(
            " AND employee_id = ${}",
            params.len() + filter_base
        ));
        params.push(eid.clone());
    }
    if let Some(k) = &q.keyword {
        where_clause.push_str(&format!(
            " AND (employee_name ILIKE ${} OR record_no ILIKE ${})",
            params.len() + filter_base,
            params.len() + filter_base + 1
        ));
        let like = format!("%{k}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no, employee_name, employee_id, department,
               check_type, check_date::text AS check_date, result, status, remarks,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id AS tenant_id
        FROM ehs.health_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list health records: {}", e);
            return ApiResponse::server_error("获取健康监测记录列表失败");
        }
    };

    let records: Vec<HealthRecord> = rows.iter().map(health_record_from_row).collect();
    ApiResponse::success(records, "获取健康监测记录列表成功")
}

#[utoipa::path(
    security(("BearerAuth" = ["ehs:admin"])),
    post,
    path = "/health-monitor",
    tag = "ehs",
    responses((status = 200, description = "OK"))
)]
pub async fn create_record(
    State(state): State<crate::shared::AppState>,
    // 防御：若中间件误将本路由判为 public 而不注入 Claims，仍 fail-closed 拒读/拒写
    claims_ext: Option<Extension<Claims>>,
    _headers: HeaderMap,
    Json(req): Json<CreateHealthRecordRequest>,
) -> ApiResponse<HealthRecord> {
    let claims = match claims_ext {
        Some(Extension(c)) => c,
        None => {
            tracing::warn!(
                "[tenant_ctx] /api/ehs/health-monitor 未注入 Claims，拒写（fail-closed，不落 nil 租户行）"
            );
            return ApiResponse::unauthorized("缺少租户上下文，拒绝写入");
        }
    };
    let tenant_id = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant_id).await {
        // scope-exempt: no-request-txn
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

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
            created_at AS created_at, updated_at AS updated_at,
            tenant_id AS tenant_id
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
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create health record: {}", e);
            return ApiResponse::server_error("创建健康监测记录失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }

    ApiResponse::success(health_record_from_row(&row), "创建健康监测记录成功")
}

#[utoipa::path(
    security(("BearerAuth" = ["ehs:read"])),
    get,
    path = "/health-monitor/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK"))
)]
pub async fn get_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<HealthRecord> {
    let tenant_scope = match dual_scope(&claims, "ehs.health.get_record", "ehs.health_records") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open health scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, record_no, employee_name, employee_id, department,
               check_type, check_date::text AS check_date, result, status, remarks,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id AS tenant_id
        FROM ehs.health_records
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        SELECT id::text AS id, record_no, employee_name, employee_id, department,
               check_type, check_date::text AS check_date, result, status, remarks,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id AS tenant_id
        FROM ehs.health_records
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = query.fetch_one(&mut scope).await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get health record: {}", e);
            return ApiResponse::not_found("健康记录不存在");
        }
    };
    ApiResponse::success(health_record_from_row(&row), "获取健康记录成功")
}
#[utoipa::path(
    security(("BearerAuth" = ["ehs:admin"])),
    put,
    path = "/health-monitor/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK"))
)]
pub async fn update_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateHealthRecordRequest>,
) -> ApiResponse<HealthRecord> {
    let tenant_scope = match dual_scope(&claims, "ehs.health.update_record", "ehs.health_records") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open health scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };

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
    sets.push(format!("updated_at = ${}::timestamptz", params.len() + 1));
    params.push(chrono::Utc::now().to_rfc3339());
    let set_clause = sets.join(", ");

    let id_idx = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.health_records
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING
            id::text AS id, record_no, employee_name, employee_id, department,
            check_type, check_date::text AS check_date, result, status, remarks,
            created_at AS created_at, updated_at AS updated_at,
            tenant_id AS tenant_id
        "#
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }

    let row = match query.fetch_one(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update health record: {}", e);
            return ApiResponse::not_found("健康记录不存在或更新失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(health_record_from_row(&row), "更新健康记录成功")
}
#[utoipa::path(
    security(("BearerAuth" = ["ehs:admin"])),
    delete,
    path = "/health-monitor/{id}",
    tag = "ehs",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_record(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(&claims, "ehs.health.delete_record", "ehs.health_records") {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open health scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.health_records
        SET deleted_at = NOW()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        UPDATE ehs.health_records
        SET deleted_at = NOW()
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = query.execute(&mut scope).await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success((), "健康记录删除成功")
        }
        Ok(_) => ApiResponse::not_found("健康记录不存在"),
        Err(e) => {
            tracing::error!("Failed to delete health record: {}", e);
            ApiResponse::server_error("删除健康记录失败")
        }
    }
}
#[utoipa::path(
    security(("BearerAuth" = ["ehs:read"])),
    get,
    path = "/health-monitor/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK"))
)]
pub async fn get_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<HealthStatistics> {
    let tenant_scope = match dual_scope(&claims, "ehs.health.get_statistics", "ehs.health_records")
    {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open health scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant = tenant_scope.tenant_id();
    // 租户通道显式绑定 tenant_id；系统通道显式不带租户谓词。
    let tc = if tenant.is_some() {
        "tenant_id = $1::uuid AND deleted_at IS NULL"
    } else {
        "deleted_at IS NULL"
    };

    let total_records = health_count(
        &mut scope,
        format!("SELECT COUNT(*) FROM ehs.health_records WHERE {}", tc),
        tenant,
    )
    .await;
    let normal_count = health_count(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.health_records WHERE {} AND result = '正常'",
            tc
        ),
        tenant,
    )
    .await;
    let abnormal_count = health_count(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.health_records WHERE {} AND result IS NOT NULL AND result <> '正常'",
            tc
        ),
        tenant,
    )
    .await;
    let pending_count = health_count(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.health_records WHERE {} AND (result IS NULL OR result = '')",
            tc
        ),
        tenant,
    )
    .await;

    let mut by_check_type: Vec<serde_json::Value> = Vec::new();
    let mut type_query = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(check_type, '未分类') AS ct, COUNT(*)::int8 AS cnt FROM ehs.health_records WHERE {} GROUP BY 1 ORDER BY cnt DESC",
        tc
    )));
    if let Some(t) = tenant {
        type_query = type_query.bind(t);
    }
    if let Ok(rows) = type_query.fetch_all(&mut scope).await {
        for r in rows {
            by_check_type.push(serde_json::json!({
                "type": r.try_get::<String, _>("ct").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            }));
        }
    }

    let mut by_department: Vec<serde_json::Value> = Vec::new();
    let mut dept_query = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(department, '未分类') AS dept, COUNT(*)::int8 AS cnt FROM ehs.health_records WHERE {} GROUP BY 1 ORDER BY cnt DESC",
        tc
    )));
    if let Some(t) = tenant {
        dept_query = dept_query.bind(t);
    }
    if let Ok(rows) = dept_query.fetch_all(&mut scope).await {
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
