use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use chrono::{NaiveDateTime, Utc};
use sqlx::types::BigDecimal;
use sqlx::{types::Uuid, Row};
use topems_shared::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

use super::models::*;
use super::utils::*;

pub async fn create_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialIssueRequest>,
) -> Json<ApiResponse<MaterialIssueResponse>> {
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

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_number AS order_no FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "创建物料领用单失败"));
        }
    };

    let order_no_flat = order_no;
    let order_no_arg = order_no_flat;
    let issue_result = sqlx::query!(
        r#"
        INSERT INTO material_issues (
            issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $8)
        RETURNING 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        "#,
        issue_no,
        req.order_id,
        order_no_arg.flatten().as_deref(),
        req.bom_id,
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&mut *tx)
    .await;

    let issue = match issue_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to create material issue: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建物料领用单失败"));
        }
    };

    for item in &req.items {
        let _ = sqlx::query!(
            r#"
            INSERT INTO material_issue_items (
                issue_id, material_id, material_code, material_name,
                unit, planned_quantity, actual_quantity, batch_no, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        )
        .execute(&mut *tx)
        .await;
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建物料领用单失败"));
    }

    let response = MaterialIssueResponse {
        id: issue.id.to_string(),
        issue_no: issue.issue_no,
        order_id: issue.order_id.map(|u| u.to_string()),
        order_no: issue.order_no,
        bom_id: issue.bom_id.map(|u| u.to_string()),
        status: issue.status.unwrap_or_else(|| "pending".to_string()),
        warehouse_id: issue.warehouse_id.map(|u| u.to_string()),
        operator_id: issue.operator_id.map(|u| u.to_string()),
        issue_time: opt_datetime_to_string(issue.issue_time),
        notes: issue.notes,
        created_at: datetime_to_string(Some(issue.created_at)),
        updated_at: datetime_to_string(Some(issue.updated_at)),
    };

    Json(ApiResponse::success(response, "物料领用单创建成功"))
}

pub async fn list_material_issues(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialIssuesQuery>,
) -> Json<ApiResponse<ListMaterialIssuesResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<String> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(status);
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
        params.push(pattern);
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM material_issues{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count material issues: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM material_issues
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let issues = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material issues: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单列表失败"));
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
                .unwrap_or_else(|| "pending".to_string()),
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
            issue_time: opt_datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("issue_time")
                    .ok()
                    .flatten(),
            ),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListMaterialIssuesResponse {
            issues: issue_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取物料领用单列表成功",
    ))
}

pub async fn get_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let issue_result = sqlx::query!(
        r#"
        SELECT id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        FROM material_issues
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let issue = match issue_result {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "物料领用单不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch material issue: {}", e);
            return Json(ApiResponse::error(500, "获取物料领用单失败"));
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT id, issue_id, material_id, material_code, material_name,
            unit, planned_quantity, actual_quantity, batch_no, notes
        FROM material_issue_items
        WHERE issue_id = $1
        ORDER BY id ASC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch issue items: {}", e);
            return Json(ApiResponse::error(500, "获取领用单明细失败"));
        }
    };

    let issue_json = serde_json::json!({
        "id": issue.id.to_string(),
        "issue_no": issue.issue_no,
        "order_id": issue.order_id.map(|u| u.to_string()),
        "order_no": issue.order_no,
        "bom_id": issue.bom_id.map(|u| u.to_string()),
        "status": issue.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": issue.warehouse_id.map(|u| u.to_string()),
        "operator_id": issue.operator_id.map(|u| u.to_string()),
        "issue_time": opt_datetime_to_string(issue.issue_time),
        "notes": issue.notes,
        "created_at": datetime_to_string(Some(issue.created_at)),
        "updated_at": datetime_to_string(Some(issue.updated_at)),
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

    Json(ApiResponse::success(issue_json, "获取物料领用单成功"))
}

pub async fn update_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialIssueRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query!(
        r#"
        UPDATE material_issues SET
            status = COALESCE($2, status),
            warehouse_id = COALESCE($3, warehouse_id),
            operator_id = COALESCE($4, operator_id),
            notes = COALESCE($5, notes),
            issue_time = CASE WHEN $2 = 'completed' AND issue_time IS NULL THEN $6 ELSE issue_time END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, issue_no, order_id, order_no, bom_id, status,
            warehouse_id, operator_id, issue_time, notes,
            created_at, updated_at
        "#,
        id,
        req.status,
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now,
    )
    .fetch_optional(&state.pool)
    .await;

    let issue = match result {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::error(404, "物料领用单不存在")),
        Err(e) => {
            tracing::error!("Failed to update material issue: {}", e);
            return Json(ApiResponse::error(500, "更新物料领用单失败"));
        }
    };

    let issue_json = serde_json::json!({
        "id": issue.id.to_string(),
        "issue_no": issue.issue_no,
        "order_id": issue.order_id.map(|u| u.to_string()),
        "order_no": issue.order_no,
        "bom_id": issue.bom_id.map(|u| u.to_string()),
        "status": issue.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": issue.warehouse_id.map(|u| u.to_string()),
        "operator_id": issue.operator_id.map(|u| u.to_string()),
        "issue_time": opt_datetime_to_string(issue.issue_time),
        "notes": issue.notes,
        "created_at": datetime_to_string(Some(issue.created_at)),
        "updated_at": datetime_to_string(Some(issue.updated_at)),
    });

    Json(ApiResponse::success(issue_json, "物料领用单更新成功"))
}

pub async fn delete_material_issue(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomIssue).await
    {
        return e;
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "删除物料领用单失败"));
        }
    };

    let _ = sqlx::query!("DELETE FROM material_issue_items WHERE issue_id = $1", id)
        .execute(&mut *tx)
        .await;

    let result = sqlx::query!(
        "UPDATE material_issues SET deleted_at = NOW() WHERE id = $1 AND status = 'pending'",
        id
    )
    .execute(&mut *tx)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to delete material issue: {}", e);
            return Json(ApiResponse::error(500, "删除物料领用单失败"));
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "删除物料领用单失败"));
    }

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "物料领用单删除成功"))
    } else {
        Json(ApiResponse::error(404, "物料领用单不存在或状态不允许删除"))
    }
}
