use axum::{
    extract::Extension, extract::Path, extract::Query, extract::State, http::HeaderMap, Json,
};
use chrono::{DateTime, Utc};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::require_tenant;
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_db::decimal::big_decimal_to_f64;

use topems_shared_core::response::ApiResponse;

use super::issue_status::MaterialIssueStatus;
use super::models::*;

#[derive(Debug, sqlx::FromRow)]
struct MaterialIssueRow {
    id: Uuid,
    issue_no: String,
    order_id: Option<Uuid>,
    order_no: Option<String>,
    bom_id: Option<Uuid>,
    status: Option<String>,
    warehouse_id: Option<Uuid>,
    operator_id: Option<Uuid>,
    issue_time: Option<DateTime<Utc>>,
    notes: Option<String>,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
}

#[utoipa::path(
    post,
    path = "/material-issues",
    tag = "mes",
    responses((status = 200, description = "OK"))
)]
pub async fn create_material_issue(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateMaterialIssueRequest>,
) -> ApiResponse<MaterialIssueResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let now = Utc::now();
    let issue_no = format!(
        "MI{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    // material_issues 是业务表：服务身份缺租户头同样 400，写路径必须有确定租户。
    let tenant_id: Uuid = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_code, msg)) => return ApiResponse::bad_request(&msg),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return ApiResponse::server_error("创建物料领用单失败");
        }
    };

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_number AS order_no FROM mes.production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_optional(&mut scope)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };

    let order_no_flat = order_no;
    let order_no_arg = order_no_flat;
    let issue_result = sqlx::query_as::<_, MaterialIssueRow>(
        r#"
        INSERT INTO mes.material_issues (
            issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, notes, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)
        RETURNING 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        "#,
    )
    .bind(&issue_no)
    .bind(req.order_id)
    .bind(order_no_arg.unwrap_or_default())
    .bind(req.bom_id)
    .bind(MaterialIssueStatus::DEFAULT.as_db_str())
    .bind(req.warehouse_id)
    .bind(req.operator_id)
    .bind(req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let issue = match issue_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to create material issue: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("创建物料领用单失败");
        }
    };

    for item in &req.items {
        let _ = sqlx::query!(
            r#"
            INSERT INTO mes.material_issue_items (
                issue_id, material_id, material_code, material_name,
                unit, planned_quantity, actual_quantity, batch_no, notes, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
            issue.id,
            item.material_id,
            item.material_code.clone(),
            item.material_name.clone(),
            item.unit.clone(),
            item.planned_quantity
                .to_string()
                .parse::<BigDecimal>()
                .ok()
                .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
            item.actual_quantity
                .to_string()
                .parse::<BigDecimal>()
                .ok()
                .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
            item.batch_no.clone(),
            item.notes.clone(),
            tenant_id,
        )
        .execute(&mut scope)
        .await;
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("创建物料领用单失败");
    }

    let response = MaterialIssueResponse {
        id: issue.id.to_string(),
        issue_no: issue.issue_no,
        order_id: issue.order_id.map(|u| u.to_string()),
        order_no: issue.order_no,
        bom_id: issue.bom_id.map(|u| u.to_string()),
        status: issue
            .status
            .unwrap_or_else(|| MaterialIssueStatus::DEFAULT.as_db_str().to_string()),
        warehouse_id: issue.warehouse_id.map(|u| u.to_string()),
        operator_id: issue.operator_id.map(|u| u.to_string()),
        issue_time: issue.issue_time,
        notes: issue.notes,
        created_at: issue.created_at.unwrap_or_else(Utc::now),
        updated_at: issue.updated_at.unwrap_or_else(Utc::now),
    };

    ApiResponse::success(response, "物料领用单创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-issues",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
#[allow(clippy::as_conversions)]
pub async fn list_material_issues(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialIssuesQuery>,
) -> ApiResponse<ListMaterialIssuesResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取物料领用单列表失败");
        }
    };

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    let status_filter = match query.status.as_deref() {
        Some(raw) => match MaterialIssueStatus::from_db_str(raw) {
            Some(v) => Some(v),
            None => return ApiResponse::bad_request("无效的物料领用单状态过滤值"),
        },
        None => None,
    };
    if let Some(status) = status_filter {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status.as_db_str().to_string()));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (issue_no ILIKE $1 OR order_no ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (issue_no ILIKE ${} OR order_no ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.material_issues{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }

    let count_result = count_query.fetch_one(&mut scope).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count material issues: {}", e);
            return ApiResponse::server_error("获取物料领用单列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM mes.material_issues
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let issues = match fetch_query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material issues: {}", e);
            return ApiResponse::server_error("获取物料领用单列表失败");
        }
    };

    let issue_list: Vec<MaterialIssueResponse> = issues
        .into_iter()
        .map(|r| MaterialIssueResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            issue_no: r.try_get::<String, _>("issue_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            bom_id: r
                .try_get::<Option<Uuid>, _>("bom_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| MaterialIssueStatus::DEFAULT.as_db_str().to_string()),
            warehouse_id: r
                .try_get::<Option<Uuid>, _>("warehouse_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            operator_id: r
                .try_get::<Option<Uuid>, _>("operator_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            issue_time: r
                .try_get::<Option<DateTime<Utc>>, _>("issue_time")
                .ok()
                .flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
        })
        .collect();

    ApiResponse::success(
        ListMaterialIssuesResponse {
            issues: issue_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取物料领用单列表成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-issues/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn get_material_issue(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立只读作用域失败: {}", e);
            return ApiResponse::server_error("获取物料领用单失败");
        }
    };

    let issue_result = sqlx::query!(
        r#"
        SELECT id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM mes.material_issues
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&mut scope)
    .await;

    let issue = match issue_result {
        Ok(Some(i)) => i,
        Ok(None) => return ApiResponse::not_found("物料领用单不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch material issue: {}", e);
            return ApiResponse::server_error("获取物料领用单失败");
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT id, issue_id, material_id, material_code, material_name,
            unit, planned_quantity, actual_quantity, batch_no, notes
        FROM mes.material_issue_items
        WHERE issue_id = $1
        ORDER BY id ASC
        "#,
        id,
    )
    .fetch_all(&mut scope)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch issue items: {}", e);
            return ApiResponse::server_error("获取领用单明细失败");
        }
    };

    let issue_json = serde_json::json!({
        "id": issue.id.to_string(),
        "issue_no": issue.issue_no,
        "order_id": issue.order_id.map(|u| u.to_string()),
        "order_no": issue.order_no,
        "bom_id": issue.bom_id.map(|u| u.to_string()),
        "status": issue.status.unwrap_or_else(|| MaterialIssueStatus::DEFAULT.as_db_str().to_string()),
        "warehouse_id": issue.warehouse_id.map(|u| u.to_string()),
        "operator_id": issue.operator_id.map(|u| u.to_string()),
        "issue_time": issue.issue_time,
        "notes": issue.notes,
        "created_at": issue.created_at.unwrap_or_else(Utc::now),
        "updated_at": issue.updated_at.unwrap_or_else(Utc::now),
        "items": items.iter().map(|i| serde_json::json!({
            "id": i.id.to_string(),
            "issue_id": i.issue_id.to_string(),
            "material_id": i.material_id.map(|u| u.to_string()),
            "material_code": i.material_code,
            "material_name": i.material_name,
            "unit": i.unit,
            "planned_quantity": big_decimal_to_f64(Some(i.planned_quantity.clone())),
            "actual_quantity": big_decimal_to_f64(Some(i.actual_quantity.clone())),
            "batch_no": i.batch_no,
            "notes": i.notes,
        })).collect::<Vec<_>>(),
    });

    ApiResponse::success(issue_json, "获取物料领用单成功")
}

#[utoipa::path(
    put,
    path = "/material-issues/{id}",
    tag = "mes",
    responses((status = 200, description = "OK"))
)]
pub async fn update_material_issue(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialIssueRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let now = Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("建立写作用域失败: {}", e);
            return ApiResponse::server_error("更新物料领用单失败");
        }
    };

    let status_target = match req.status.as_deref() {
        Some(raw) => match MaterialIssueStatus::from_db_str(raw) {
            Some(v) => Some(v),
            None => return ApiResponse::bad_request("无效的物料领用单状态"),
        },
        None => None,
    };
    let allowed_from: Vec<String> = match status_target {
        Some(target) => MaterialIssueStatus::db_values(target.update_from())
            .into_iter()
            .map(str::to_string)
            .collect(),
        None => MaterialIssueStatus::DB_VALUES
            .iter()
            .map(|s| (*s).to_string())
            .collect(),
    };

    let result = sqlx::query_as::<_, MaterialIssueRow>(
        r#"
        UPDATE mes.material_issues SET
            status = COALESCE($2, status),
            warehouse_id = COALESCE($3, warehouse_id),
            operator_id = COALESCE($4, operator_id),
            notes = COALESCE($5, notes),
            issue_time = CASE WHEN $2 = $7 AND issue_time IS NULL THEN $6 ELSE issue_time END,
            updated_at = $6
        WHERE id = $1
          AND (status = ANY($8::text[]) OR status IS NULL)
        RETURNING id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.status)
    .bind(req.warehouse_id)
    .bind(req.operator_id)
    .bind(req.notes)
    .bind(now)
    .bind(MaterialIssueStatus::Completed.as_db_str())
    .bind(&allowed_from)
    .fetch_optional(&mut scope)
    .await;

    let issue = match result {
        Ok(Some(i)) => i,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("物料领用单不存在或当前状态不允许变更");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("Failed to update material issue: {}", e);
            return ApiResponse::server_error("更新物料领用单失败");
        }
    };

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("更新物料领用单失败");
    }

    let issue_json = serde_json::json!({
        "id": issue.id.to_string(),
        "issue_no": issue.issue_no,
        "order_id": issue.order_id.map(|u| u.to_string()),
        "order_no": issue.order_no,
        "bom_id": issue.bom_id.map(|u| u.to_string()),
        "status": issue.status.unwrap_or_else(|| MaterialIssueStatus::DEFAULT.as_db_str().to_string()),
        "warehouse_id": issue.warehouse_id.map(|u| u.to_string()),
        "operator_id": issue.operator_id.map(|u| u.to_string()),
        "issue_time": issue.issue_time,
        "notes": issue.notes,
        "created_at": issue.created_at.unwrap_or_else(Utc::now),
        "updated_at": issue.updated_at.unwrap_or_else(Utc::now),
    });

    ApiResponse::success(issue_json, "物料领用单更新成功")
}

#[utoipa::path(
    delete,
    path = "/material-issues/{id}",
    tag = "mes",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_material_issue(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return ApiResponse::server_error("删除物料领用单失败");
        }
    };

    let deletable_from: Vec<String> = vec![MaterialIssueStatus::Pending.as_db_str().to_string()];
    let result = sqlx::query(
        "UPDATE mes.material_issues SET deleted_at = NOW() WHERE id = $1 AND status = ANY($2::text[])",
    )
    .bind(id)
    .bind(&deletable_from)
    .execute(&mut scope)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("Failed to delete material issue: {}", e);
            return ApiResponse::server_error("删除物料领用单失败");
        }
    };
    if result.rows_affected() == 0 {
        let _ = scope.rollback().await;
        return ApiResponse::conflict("物料领用单不存在或状态不允许删除");
    }

    if let Err(e) = sqlx::query("DELETE FROM mes.material_issue_items WHERE issue_id = $1")
        .bind(id)
        .execute(&mut scope)
        .await
    {
        let _ = scope.rollback().await;
        tracing::error!("Failed to delete material issue items: {}", e);
        return ApiResponse::server_error("删除物料领用单失败");
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return ApiResponse::server_error("删除物料领用单失败");
    }

    ApiResponse::success("".to_string(), "物料领用单删除成功")
}
