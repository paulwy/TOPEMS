use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

use crate::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/lims/reagents",
            get(list_reagents).post(create_reagent),
        )
        .route(
            "/api/lims/reagents/{id}",
            get(get_reagent).put(update_reagent).delete(delete_reagent),
        )
}

#[derive(Debug, Deserialize)]
pub struct ReagentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Reagent {
    pub id: String,
    pub reagent_no: String,
    pub name: String,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
    pub expired_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReagentRequest {
    pub name: String,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub expired_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReagentRequest {
    pub name: Option<String>,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: Option<String>,
    pub expired_at: Option<String>,
}

pub async fn list_reagents(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<ReagentQuery>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.status.as_ref(), query.name.as_ref()) {
        (Some(_), Some(_)) => format!(
            "SELECT id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE status = $1 AND name LIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        ),
        (Some(_), None) => format!(
            "SELECT id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        ),
        (None, Some(_)) => format!(
            "SELECT id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE name LIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        ),
        (None, None) => format!(
            "SELECT id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        ),
    };

    let mut query_builder = sqlx::query(&sql);
    match (query.status.as_ref(), query.name.as_ref()) {
        (Some(st), Some(nm)) => {
            query_builder = query_builder
                .bind(st)
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (Some(st), None) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, Some(nm)) => {
            query_builder = query_builder
                .bind(format!("%{}%", nm))
                .bind(page_size)
                .bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let reagents = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| Reagent {
                id: row.get("id"),
                reagent_no: row.get("reagent_no"),
                name: row.get("name"),
                specification: row.get("specification"),
                manufacturer: row.get("manufacturer"),
                batch_no: row.get("batch_no"),
                quantity: row.get("quantity"),
                unit: row.get("unit"),
                status: row.get("status"),
                expired_at: row.get("expired_at"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match reagents {
        Ok(data) => Json(ApiResponse::success(data, "获取试剂列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch reagents: {}", e);
            Json(ApiResponse::error(500, "获取试剂列表失败"))
        }
    }
}

pub async fn create_reagent(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateReagentRequest>,
) -> Json<ApiResponse<Reagent>> {
    let reagent_no = format!(
        "RGT-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let row = sqlx::query(
        "INSERT INTO qa_lab_reagents (reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'normal', $8) RETURNING id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(reagent_no)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(&req.manufacturer)
    .bind(&req.batch_no)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(&req.expired_at)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Reagent {
                id: r.get("id"),
                reagent_no: r.get("reagent_no"),
                name: r.get("name"),
                specification: r.get("specification"),
                manufacturer: r.get("manufacturer"),
                batch_no: r.get("batch_no"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "试剂创建成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create reagent: {}", e);
            Json(ApiResponse::error(500, "试剂创建失败"))
        }
    }
}

pub async fn get_reagent(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Reagent>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };

    let row = sqlx::query(
        "SELECT id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_lab_reagents WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Reagent {
                id: r.get("id"),
                reagent_no: r.get("reagent_no"),
                name: r.get("name"),
                specification: r.get("specification"),
                manufacturer: r.get("manufacturer"),
                batch_no: r.get("batch_no"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取试剂成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch reagent: {}", e);
            Json(ApiResponse::error(500, "获取试剂失败"))
        }
    }
}

pub async fn update_reagent(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateReagentRequest>,
) -> Json<ApiResponse<Reagent>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };

    let row = sqlx::query(
        "UPDATE qa_lab_reagents SET name = COALESCE($2, name), specification = COALESCE($3, specification), manufacturer = COALESCE($4, manufacturer), batch_no = COALESCE($5, batch_no), quantity = COALESCE($6, quantity), unit = COALESCE($7, unit), status = COALESCE($8, status), expired_at = COALESCE($9, expired_at), updated_at = NOW() WHERE id = $1 RETURNING id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(&req.manufacturer)
    .bind(&req.batch_no)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(&req.status)
    .bind(&req.expired_at)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            Reagent {
                id: r.get("id"),
                reagent_no: r.get("reagent_no"),
                name: r.get("name"),
                specification: r.get("specification"),
                manufacturer: r.get("manufacturer"),
                batch_no: r.get("batch_no"),
                quantity: r.get("quantity"),
                unit: r.get("unit"),
                status: r.get("status"),
                expired_at: r.get("expired_at"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "试剂更新成功",
        )),
        Err(e) => {
            tracing::error!("Failed to update reagent: {}", e);
            Json(ApiResponse::error(500, "试剂更新失败"))
        }
    }
}

pub async fn delete_reagent(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lab_reagents WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "试剂删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete reagent: {}", e);
            Json(ApiResponse::error(500, "试剂删除失败"))
        }
    }
}

// ========================================
// Reagent Inventory Alerts & Warnings
// ========================================

#[derive(Debug, Serialize)]
pub struct ReagentAlert {
    pub id: String,
    pub reagent_id: String,
    pub reagent_no: String,
    pub reagent_name: String,
    pub alert_type: String,
    pub current_value: f64,
    pub threshold_value: f64,
    pub unit: Option<String>,
    pub message: String,
    pub is_resolved: bool,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InventoryStatistics {
    pub total_reagents: i64,
    pub normal_count: i64,
    pub low_stock_count: i64,
    pub expiring_soon_count: i64,
    pub expired_count: i64,
    pub total_value: Option<f64>,
    pub by_category: Vec<CategoryCount>,
}

#[derive(Debug, Serialize)]
pub struct CategoryCount {
    pub category: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
pub struct StockAdjustmentRequest {
    pub adjustment_type: String,
    pub quantity: f64,
    pub reason: Option<String>,
    pub operator: Option<String>,
}

pub async fn get_reagent_alerts(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<ReagentAlert>>> {
    let rows = sqlx::query(
        r#"
        SELECT id, reagent_id, reagent_no, reagent_name, alert_type,
               current_value, threshold_value, unit, message,
               is_resolved, created_at::TEXT, resolved_at::TEXT
        FROM qa_lab_reagent_alerts
        WHERE is_resolved = FALSE
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let alerts: Vec<ReagentAlert> = rows
                .into_iter()
                .map(|row| ReagentAlert {
                    id: row.get("id"),
                    reagent_id: row.get("reagent_id"),
                    reagent_no: row.get("reagent_no"),
                    reagent_name: row.get("reagent_name"),
                    alert_type: row.get("alert_type"),
                    current_value: row.get("current_value"),
                    threshold_value: row.get("threshold_value"),
                    unit: row.get("unit"),
                    message: row.get("message"),
                    is_resolved: row.get("is_resolved"),
                    created_at: row.get("created_at"),
                    resolved_at: row.get("resolved_at"),
                })
                .collect();
            Json(ApiResponse::success(alerts, "获取试剂告警成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch reagent alerts: {}", e);
            Json(ApiResponse::error(500, "获取试剂告警失败"))
        }
    }
}

pub async fn get_low_stock_reagents(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    let threshold = 10.0; // Low stock threshold

    let rows = sqlx::query(
        r#"
        SELECT id, reagent_no, name, specification, manufacturer, batch_no, 
               quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM qa_lab_reagents
        WHERE status = 'normal' AND (quantity IS NULL OR quantity < $1)
        ORDER BY quantity ASC NULLS FIRST
        "#,
    )
    .bind(threshold)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let reagents: Vec<Reagent> = rows
                .into_iter()
                .map(|row| Reagent {
                    id: row.get("id"),
                    reagent_no: row.get("reagent_no"),
                    name: row.get("name"),
                    specification: row.get("specification"),
                    manufacturer: row.get("manufacturer"),
                    batch_no: row.get("batch_no"),
                    quantity: row.get("quantity"),
                    unit: row.get("unit"),
                    status: row.get("status"),
                    expired_at: row.get("expired_at"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(reagents, "获取低库存试剂成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch low stock reagents: {}", e);
            Json(ApiResponse::error(500, "获取低库存试剂失败"))
        }
    }
}

pub async fn get_expiring_reagents(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    let days_ahead = 30; // Expiring within 30 days

    let rows = sqlx::query(
        r#"
        SELECT id, reagent_no, name, specification, manufacturer, batch_no, 
               quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM qa_lab_reagents
        WHERE status = 'normal' 
          AND expired_at IS NOT NULL 
          AND expired_at <= NOW() + INTERVAL '1 day' * $1
          AND expired_at > NOW()
        ORDER BY expired_at ASC
        "#,
    )
    .bind(days_ahead)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let reagents: Vec<Reagent> = rows
                .into_iter()
                .map(|row| Reagent {
                    id: row.get("id"),
                    reagent_no: row.get("reagent_no"),
                    name: row.get("name"),
                    specification: row.get("specification"),
                    manufacturer: row.get("manufacturer"),
                    batch_no: row.get("batch_no"),
                    quantity: row.get("quantity"),
                    unit: row.get("unit"),
                    status: row.get("status"),
                    expired_at: row.get("expired_at"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(reagents, "获取即将过期试剂成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch expiring reagents: {}", e);
            Json(ApiResponse::error(500, "获取即将过期试剂失败"))
        }
    }
}

pub async fn get_expired_reagents(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    let rows = sqlx::query(
        r#"
        SELECT id, reagent_no, name, specification, manufacturer, batch_no, 
               quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        FROM qa_lab_reagents
        WHERE status = 'normal' 
          AND expired_at IS NOT NULL 
          AND expired_at < NOW()
        ORDER BY expired_at ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let reagents: Vec<Reagent> = rows
                .into_iter()
                .map(|row| Reagent {
                    id: row.get("id"),
                    reagent_no: row.get("reagent_no"),
                    name: row.get("name"),
                    specification: row.get("specification"),
                    manufacturer: row.get("manufacturer"),
                    batch_no: row.get("batch_no"),
                    quantity: row.get("quantity"),
                    unit: row.get("unit"),
                    status: row.get("status"),
                    expired_at: row.get("expired_at"),
                    created_at: row.get("created_at"),
                    updated_at: row.get("updated_at"),
                })
                .collect();
            Json(ApiResponse::success(reagents, "获取已过期试剂成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch expired reagents: {}", e);
            Json(ApiResponse::error(500, "获取已过期试剂失败"))
        }
    }
}

pub async fn get_inventory_statistics(
    State(state): State<crate::AppState>,
) -> Json<ApiResponse<InventoryStatistics>> {
    let stats_row = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_reagents,
            COUNT(*) FILTER (WHERE quantity >= 10 AND (expired_at IS NULL OR expired_at > NOW())) as normal_count,
            COUNT(*) FILTER (WHERE quantity < 10 AND (expired_at IS NULL OR expired_at > NOW())) as low_stock_count,
            COUNT(*) FILTER (WHERE expired_at IS NOT NULL AND expired_at <= NOW() + INTERVAL '30 days' AND expired_at > NOW()) as expiring_soon_count,
            COUNT(*) FILTER (WHERE expired_at IS NOT NULL AND expired_at < NOW()) as expired_count
        FROM qa_lab_reagents
        WHERE status = 'normal'
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match stats_row {
        Ok(row) => {
            let stats = InventoryStatistics {
                total_reagents: row.get("total_reagents"),
                normal_count: row.get("normal_count"),
                low_stock_count: row.get("low_stock_count"),
                expiring_soon_count: row.get("expiring_soon_count"),
                expired_count: row.get("expired_count"),
                total_value: None,
                by_category: vec![],
            };
            Json(ApiResponse::success(stats, "获取库存统计成功"))
        }
        Err(e) => {
            tracing::error!("Failed to fetch inventory statistics: {}", e);
            Json(ApiResponse::error(500, "获取库存统计失败"))
        }
    }
}

pub async fn adjust_stock(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<StockAdjustmentRequest>,
) -> Json<ApiResponse<Reagent>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };

    let adjustment = match req.adjustment_type.as_str() {
        "add" => req.quantity,
        "remove" | "use" => -req.quantity,
        "set" => {
            // For "set", we need the current quantity
            let current = sqlx::query_scalar::<_, Option<f64>>(
                "SELECT quantity FROM qa_lab_reagents WHERE id = $1",
            )
            .bind(id)
            .fetch_optional(&state.pool)
            .await;

            match current {
                Ok(Some(q)) => req.quantity - q.unwrap_or(0.0),
                Ok(None) => return Json(ApiResponse::error(404, "试剂不存在")),
                Err(e) => return Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
            }
        }
        _ => return Json(ApiResponse::error(400, "无效的调整类型")),
    };

    let row = sqlx::query(
        r#"
        UPDATE qa_lab_reagents 
        SET quantity = quantity + $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, reagent_no, name, specification, manufacturer, batch_no, 
                  quantity, unit, status, expired_at::TEXT, created_at::TEXT, updated_at::TEXT
        "#,
    )
    .bind(id)
    .bind(adjustment)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => {
            // Record stock adjustment in history
            let history_id = Uuid::new_v4();
            let _ = sqlx::query(
                r#"
                INSERT INTO qa_lab_reagent_history (id, reagent_id, adjustment_type, quantity, reason, operator, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                "#,
            )
            .bind(history_id)
            .bind(id)
            .bind(&req.adjustment_type)
            .bind(req.quantity)
            .bind(&req.reason)
            .bind(&req.operator)
            .execute(&state.pool)
            .await;

            Json(ApiResponse::success(
                Reagent {
                    id: r.get("id"),
                    reagent_no: r.get("reagent_no"),
                    name: r.get("name"),
                    specification: r.get("specification"),
                    manufacturer: r.get("manufacturer"),
                    batch_no: r.get("batch_no"),
                    quantity: r.get("quantity"),
                    unit: r.get("unit"),
                    status: r.get("status"),
                    expired_at: r.get("expired_at"),
                    created_at: r.get("created_at"),
                    updated_at: r.get("updated_at"),
                },
                "库存调整成功",
            ))
        }
        Err(e) => {
            tracing::error!("Failed to adjust stock: {}", e);
            Json(ApiResponse::error(500, "库存调整失败"))
        }
    }
}

pub async fn resolve_alert(
    State(state): State<crate::AppState>,
    axum::extract::Path(alert_id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&alert_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的告警ID")),
    };

    let result = sqlx::query(
        r#"
        UPDATE qa_lab_reagent_alerts
        SET is_resolved = TRUE, resolved_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "告警已解决")),
        Err(e) => {
            tracing::error!("Failed to resolve alert: {}", e);
            Json(ApiResponse::error(500, "解决告警失败"))
        }
    }
}
