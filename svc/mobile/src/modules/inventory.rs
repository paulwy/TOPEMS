use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::{types::BigDecimal, PgPool};
use uuid::Uuid;

use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStocktakeRecordRequest {
    pub item_id: String,
    pub actual_quantity: i32,
}

pub async fn list_inventory_items(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, sku, name, category, quantity, unit, location, batch_no, expiry_date, status, last_updated
        FROM inventory_items
        ORDER BY last_updated DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "sku": row.sku,
                        "name": row.name,
                        "category": row.category,
                        "quantity": row.quantity,
                        "unit": row.unit,
                        "location": row.location,
                        "batch_no": row.batch_no,
                        "expiry_date": row.expiry_date,
                        "status": row.status,
                        "last_updated": row.last_updated.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": items, "total": items.len() }),
                "获取库存列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存列表失败: {}", e);
            Json(ApiResponse::error(500, "获取库存列表失败"))
        }
    }
}

pub async fn get_inventory_item(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let item_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的ID格式")),
    };

    let row = sqlx::query!(
        r#"
        SELECT id, sku, name, category, quantity, unit, location, batch_no, expiry_date, status, last_updated
        FROM inventory_items
        WHERE id = $1
        "#,
        item_id
    )
    .fetch_optional(&pool)
    .await;

    match row {
        Ok(Some(row)) => {
            let item = serde_json::json!({
                "id": row.id,
                "sku": row.sku,
                "name": row.name,
                "category": row.category,
                "quantity": row.quantity,
                "unit": row.unit,
                "location": row.location,
                "batch_no": row.batch_no,
                "expiry_date": row.expiry_date,
                "status": row.status,
                "last_updated": row.last_updated.map(|t| t.to_string()),
            });
            Json(ApiResponse::success(item, "获取库存详情成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "库存项不存在")),
        Err(e) => {
            tracing::error!("获取库存详情失败: {}", e);
            Json(ApiResponse::error(500, "获取库存详情失败"))
        }
    }
}

pub async fn list_stocktake_tasks(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, title, warehouse, status, total_items, counted_items, assignee, due_date, created_at
        FROM stocktake_tasks
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "title": row.title,
                        "warehouse": row.warehouse,
                        "status": row.status,
                        "total_items": row.total_items,
                        "counted_items": row.counted_items,
                        "assignee": row.assignee,
                        "due_date": row.due_date.map(|d| d.to_string()),
                        "created_at": row.created_at.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": tasks, "total": tasks.len() }),
                "获取盘点任务列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取盘点任务列表失败: {}", e);
            Json(ApiResponse::error(500, "获取盘点任务列表失败"))
        }
    }
}

pub async fn create_stocktake_record(
    State(pool): State<PgPool>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(payload): Json<CreateStocktakeRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID格式")),
    };

    let item_id = match Uuid::parse_str(&payload.item_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的库存项ID格式")),
    };

    let item_info = sqlx::query!(
        r#"
        SELECT name, sku, quantity
        FROM inventory_items
        WHERE id = $1
        "#,
        item_id
    )
    .fetch_optional(&pool)
    .await;

    let (item_name, sku, system_quantity) = match item_info {
        Ok(Some(row)) => (row.name, row.sku, row.quantity),
        Ok(None) => return Json(ApiResponse::error(404, "库存项不存在")),
        Err(e) => {
            tracing::error!("获取库存项信息失败: {}", e);
            return Json(ApiResponse::error(500, "获取库存项信息失败"));
        }
    };

    let system_qty = system_quantity.clone().unwrap_or_default();
    let actual_qty: BigDecimal = payload.actual_quantity.into();
    let difference = &actual_qty - &system_qty;
    let status = if difference == BigDecimal::from(0i32) {
        "normal"
    } else if difference > BigDecimal::from(0i32) {
        "surplus"
    } else {
        "shortage"
    };

    let record_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let record = serde_json::json!({
        "id": record_id,
        "task_id": task_id,
        "item_id": item_id,
        "item_name": item_name,
        "sku": sku,
        "system_quantity": system_quantity,
        "actual_quantity": payload.actual_quantity,
        "difference": difference,
        "status": status,
        "counted_by": "mobile_user",
        "counted_at": now.to_rfc3339(),
    });

    let result = sqlx::query(
        r#"
        INSERT INTO stocktake_records (id, task_id, item_id, item_name, sku, system_quantity, actual_quantity, difference, status, counted_by, counted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
    )
    .bind(record_id)
    .bind(task_id)
    .bind(item_id)
    .bind(item_name)
    .bind(sku)
    .bind(system_qty)
    .bind(actual_qty)
    .bind(difference)
    .bind(status)
    .bind("mobile_user")
    .bind(now.naive_utc())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(record, "创建盘点记录成功")),
        Err(e) => {
            tracing::error!("创建盘点记录失败: {}", e);
            Json(ApiResponse::error(500, "创建盘点记录失败"))
        }
    }
}

pub async fn list_inbound_orders(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, order_no, supplier, order_type, status, total_items, total_quantity, expected_date, created_at
        FROM inbound_orders
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let orders: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "order_no": row.order_no,
                        "supplier": row.supplier,
                        "type": row.order_type,
                        "status": row.status,
                        "total_items": row.total_items,
                        "total_quantity": row.total_quantity,
                        "expected_date": row.expected_date.map(|d| d.to_string()),
                        "created_at": row.created_at.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": orders, "total": orders.len() }),
                "获取入库单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取入库单列表失败: {}", e);
            Json(ApiResponse::error(500, "获取入库单列表失败"))
        }
    }
}

pub async fn list_outbound_orders(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, order_no, customer, order_type, status, total_items, total_quantity, expected_date, created_at
        FROM outbound_orders
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let orders: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "order_no": row.order_no,
                        "customer": row.customer,
                        "type": row.order_type,
                        "status": row.status,
                        "total_items": row.total_items,
                        "total_quantity": row.total_quantity,
                        "expected_date": row.expected_date.map(|d| d.to_string()),
                        "created_at": row.created_at.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": orders, "total": orders.len() }),
                "获取出库单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取出库单列表失败: {}", e);
            Json(ApiResponse::error(500, "获取出库单列表失败"))
        }
    }
}
