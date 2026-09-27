use axum::{extract::Extension, extract::Path, extract::Query, extract::State, Json};
use chrono::{DateTime, Utc};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use topems_shared::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_db::decimal::big_decimal_to_f64;

use topems_shared::response::ApiResponse;

use super::models::*;

pub async fn create_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMaterialReturnRequest>,
) -> Json<ApiResponse<MaterialReturnResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await
    {
        return e;
    }

    let now = Utc::now();
    let return_no = format!(
        "MR{}{:04}",
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
            return Json(ApiResponse::error(500, "创建物料退库单失败"));
        }
    };

    let order_no_flat = order_no;
    let order_no_arg = order_no_flat;
    let return_result = sqlx::query!(
        r#"
        INSERT INTO material_returns (
            return_no, order_id, order_no, status,
            warehouse_id, operator_id, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $7)
        RETURNING 
            id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        "#,
        return_no,
        req.order_id,
        order_no_arg.unwrap_or_default(),
        req.warehouse_id,
        req.operator_id,
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&mut *tx)
    .await;

    let return_record = match return_result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create material return: {}", e);
            let _ = tx.rollback().await;
            return Json(ApiResponse::error(500, "创建物料退库单失败"));
        }
    };

    for item in &req.items {
        let _ = sqlx::query!(
            r#"
            INSERT INTO material_return_items (
                return_id, material_id, material_code, material_name,
                unit, quantity, reason, batch_no, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
            return_record.id,
            item.material_id,
            item.material_code.clone(),
            item.material_name.clone(),
            item.unit.clone(),
            item.quantity
                .to_string()
                .parse::<BigDecimal>()
                .ok()
                .unwrap_or_else(|| BigDecimal::new(0.into(), 0)),
            item.reason.clone(),
            item.batch_no.clone(),
            item.notes.clone(),
        )
        .execute(&mut *tx)
        .await;
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "创建物料退库单失败"));
    }

    let response = MaterialReturnResponse {
        id: return_record.id.to_string(),
        return_no: return_record.return_no,
        order_id: return_record.order_id.map(|u| u.to_string()),
        order_no: return_record.order_no,
        status: return_record
            .status
            .unwrap_or_else(|| "pending".to_string()),
        warehouse_id: return_record.warehouse_id.map(|u| u.to_string()),
        operator_id: return_record.operator_id.map(|u| u.to_string()),
        return_time: return_record.return_time.map(|d| d.and_utc().to_rfc3339()),
        notes: return_record.notes,
        created_at: (Some(return_record.created_at.unwrap_or_default().and_utc()))
            .unwrap_or_default(),
        updated_at: (Some(return_record.updated_at.unwrap_or_default().and_utc()))
            .unwrap_or_default(),
    };

    Json(ApiResponse::success(response, "物料退库单创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-returns",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn list_material_returns(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListMaterialReturnsQuery>,
) -> Json<ApiResponse<ListMaterialReturnsResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE (return_no ILIKE $1 OR order_no ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (return_no ILIKE ${} OR order_no ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM material_returns{}",
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
            tracing::error!("Failed to count material returns: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        FROM material_returns
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
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let returns = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch material returns: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单列表失败"));
        }
    };

    let return_list: Vec<MaterialReturnResponse> = returns
        .into_iter()
        .map(|r| MaterialReturnResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            return_no: r.try_get::<String, _>("return_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
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
            return_time: r
                .try_get::<Option<DateTime<Utc>>, _>("return_time")
                .ok()
                .flatten()
                .map(|d| d.to_rfc3339()),
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

    Json(ApiResponse::success(
        ListMaterialReturnsResponse {
            returns: return_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取物料退库单列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:material:read"])),
    path = "/material-returns/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Material"
)]
pub async fn get_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MaterialBomRead).await
    {
        return e;
    }

    let return_result = sqlx::query!(
        r#"
        SELECT id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        FROM material_returns
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let return_record = match return_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "物料退库单不存在")),
        Err(e) => {
            tracing::error!("Failed to fetch material return: {}", e);
            return Json(ApiResponse::error(500, "获取物料退库单失败"));
        }
    };

    let items_result = sqlx::query!(
        r#"
        SELECT id, return_id, material_id, material_code, material_name,
            unit, quantity, reason, batch_no, notes
        FROM material_return_items
        WHERE return_id = $1
        ORDER BY id ASC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await;

    let items = match items_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("Failed to fetch return items: {}", e);
            return Json(ApiResponse::error(500, "获取退库单明细失败"));
        }
    };

    let return_json = serde_json::json!({
        "id": return_record.id.to_string(),
        "return_no": return_record.return_no,
        "order_id": return_record.order_id.map(|u| u.to_string()),
        "order_no": return_record.order_no,
        "status": return_record.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": return_record.warehouse_id.map(|u| u.to_string()),
        "operator_id": return_record.operator_id.map(|u| u.to_string()),
        "return_time": return_record.return_time,
        "notes": return_record.notes,
        "created_at": (Some(return_record.created_at.unwrap_or_default())).unwrap_or_default(),
        "updated_at": (Some(return_record.updated_at.unwrap_or_default())).unwrap_or_default(),
        "items": items.iter().map(|i| serde_json::json!({
            "id": i.id.to_string(),
            "return_id": i.return_id.to_string(),
            "material_id": i.material_id.map(|u| u.to_string()),
            "material_code": i.material_code,
            "material_name": i.material_name,
            "unit": i.unit,
            "quantity": big_decimal_to_f64(Some(i.quantity.clone())),
            "reason": i.reason,
            "batch_no": i.batch_no,
            "notes": i.notes,
        })).collect::<Vec<_>>(),
    });

    Json(ApiResponse::success(return_json, "获取物料退库单成功"))
}

pub async fn update_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateMaterialReturnRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await
    {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE material_returns SET
            status = COALESCE($2, status),
            warehouse_id = COALESCE($3, warehouse_id),
            operator_id = COALESCE($4, operator_id),
            notes = COALESCE($5, notes),
            return_time = CASE WHEN $2 = 'completed' AND return_time IS NULL THEN $6 ELSE return_time END,
            updated_at = $6
        WHERE id = $1
        RETURNING id, return_no, order_id, order_no, status,
            warehouse_id, operator_id, return_time, notes,
            created_at, updated_at
        "#,
        id,
        req.status,
        req.warehouse_id,
        req.operator_id,
        req.notes,
now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let return_record = match result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "物料退库单不存在")),
        Err(e) => {
            tracing::error!("Failed to update material return: {}", e);
            return Json(ApiResponse::error(500, "更新物料退库单失败"));
        }
    };

    let return_json = serde_json::json!({
        "id": return_record.id.to_string(),
        "return_no": return_record.return_no,
        "order_id": return_record.order_id.map(|u| u.to_string()),
        "order_no": return_record.order_no,
        "status": return_record.status.unwrap_or_else(|| "pending".to_string()),
        "warehouse_id": return_record.warehouse_id.map(|u| u.to_string()),
        "operator_id": return_record.operator_id.map(|u| u.to_string()),
        "return_time": return_record.return_time,
        "notes": return_record.notes,
        "created_at": (Some(return_record.created_at.unwrap_or_default())).unwrap_or_default(),
        "updated_at": (Some(return_record.updated_at.unwrap_or_default())).unwrap_or_default(),
    });

    Json(ApiResponse::success(return_json, "物料退库单更新成功"))
}

pub async fn delete_material_return(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::MaterialBomReturn).await
    {
        return e;
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to begin transaction: {}", e);
            return Json(ApiResponse::error(500, "删除物料退库单失败"));
        }
    };

    let _ = sqlx::query!("DELETE FROM material_return_items WHERE return_id = $1", id)
        .execute(&mut *tx)
        .await;

    let result = sqlx::query!(
        "UPDATE material_returns SET deleted_at = NOW() WHERE id = $1 AND status = 'pending'",
        id
    )
    .execute(&mut *tx)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to delete material return: {}", e);
            return Json(ApiResponse::error(500, "删除物料退库单失败"));
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {}", e);
        return Json(ApiResponse::error(500, "删除物料退库单失败"));
    }

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "物料退库单删除成功"))
    } else {
        Json(ApiResponse::error(404, "物料退库单不存在或状态不允许删除"))
    }
}
