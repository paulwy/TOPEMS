use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkReportRequest {
    pub order_id: String,
    pub workstation: String,
    pub operator: String,
    pub quantity: i32,
    pub good_quantity: i32,
    pub bad_quantity: i32,
    pub start_time: String,
    pub end_time: String,
}

pub async fn list_production_orders(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, order_no, product_name, quantity, completed_quantity, status, workstation, start_time, end_time, due_date, created_at
        FROM production_orders
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
                        "product_name": row.product_name,
                        "quantity": row.quantity,
                        "completed_quantity": row.completed_quantity,
                        "status": row.status,
                        "workstation": row.workstation,
                        "start_time": row.start_time.map(|t| t.to_string()),
                        "end_time": row.end_time.map(|t| t.to_string()),
                        "due_date": row.due_date.map(|d| d.to_string()),
                        "created_at": row.created_at.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": orders, "total": orders.len() }),
                "获取生产订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产订单列表失败: {}", e);
            Json(ApiResponse::error(500, "获取生产订单列表失败"))
        }
    }
}

pub async fn get_production_order(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let order_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的ID格式")),
    };

    let row = sqlx::query!(
        r#"
        SELECT id, order_no, product_name, quantity, completed_quantity, status, workstation, start_time, end_time, due_date, created_at
        FROM production_orders
        WHERE id = $1
        "#,
        order_id
    )
    .fetch_optional(&pool)
    .await;

    match row {
        Ok(Some(row)) => {
            let order = serde_json::json!({
                "id": row.id,
                "order_no": row.order_no,
                "product_name": row.product_name,
                "quantity": row.quantity,
                "completed_quantity": row.completed_quantity,
                "status": row.status,
                "workstation": row.workstation,
                "start_time": row.start_time.map(|t| t.to_string()),
                "end_time": row.end_time.map(|t| t.to_string()),
                "due_date": row.due_date.map(|d| d.to_string()),
                "created_at": row.created_at.map(|t| t.to_string()),
            });
            Json(ApiResponse::success(order, "获取生产订单详情成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "生产订单不存在")),
        Err(e) => {
            tracing::error!("获取生产订单详情失败: {}", e);
            Json(ApiResponse::error(500, "获取生产订单详情失败"))
        }
    }
}

pub async fn list_work_reports(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, order_id, order_no, workstation, operator, quantity, good_quantity, bad_quantity, start_time, end_time, duration, created_at
        FROM work_reports
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let reports: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "order_id": row.order_id,
                        "order_no": row.order_no,
                        "workstation": row.workstation,
                        "operator": row.operator,
                        "quantity": row.quantity,
                        "good_quantity": row.good_quantity,
                        "bad_quantity": row.bad_quantity,
                        "start_time": row.start_time.map(|t| t.to_string()),
                        "end_time": row.end_time.map(|t| t.to_string()),
                        "duration": row.duration,
                        "created_at": row.created_at.map(|t| t.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": reports, "total": reports.len() }),
                "获取报工记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取报工记录列表失败: {}", e);
            Json(ApiResponse::error(500, "获取报工记录列表失败"))
        }
    }
}

pub async fn submit_work_report(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateWorkReportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let order_id = match Uuid::parse_str(&payload.order_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的订单ID格式")),
    };

    let order_info = sqlx::query!(
        r#"
        SELECT order_no, workstation
        FROM production_orders
        WHERE id = $1
        "#,
        order_id
    )
    .fetch_optional(&pool)
    .await;

    let (order_no, _workstation) = match order_info {
        Ok(Some(row)) => (row.order_no, row.workstation),
        Ok(None) => return Json(ApiResponse::error(404, "生产订单不存在")),
        Err(e) => {
            tracing::error!("获取生产订单信息失败: {}", e);
            return Json(ApiResponse::error(500, "获取生产订单信息失败"));
        }
    };

    let start_time = chrono::DateTime::parse_from_rfc3339(&payload.start_time);
    let end_time = chrono::DateTime::parse_from_rfc3339(&payload.end_time);

    let (start_time, end_time, duration) = match (start_time, end_time) {
        (Ok(start), Ok(end)) => {
            let duration = (end - start).num_seconds() as i32;
            (
                start.with_timezone(&chrono::Utc),
                end.with_timezone(&chrono::Utc),
                duration,
            )
        }
        _ => return Json(ApiResponse::error(400, "无效的时间格式")),
    };

    let report_id = Uuid::new_v4();

    let result = sqlx::query!(
        r#"
        INSERT INTO work_reports (id, order_id, order_no, workstation, operator, quantity, good_quantity, bad_quantity, start_time, end_time, duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
        report_id,
        order_id,
        order_no,
        payload.workstation,
        payload.operator,
        payload.quantity as i32,
        payload.good_quantity as i32,
        payload.bad_quantity as i32,
        start_time.naive_utc(),
        end_time.naive_utc(),
        duration as i64
    )
    .execute(&pool)
    .await;

    match result {
        Ok(_) => {
            let report = serde_json::json!({
                "id": report_id,
                "order_id": order_id,
                "order_no": order_no,
                "workstation": payload.workstation,
                "operator": payload.operator,
                "quantity": payload.quantity,
                "good_quantity": payload.good_quantity,
                "bad_quantity": payload.bad_quantity,
                "start_time": start_time.to_rfc3339(),
                "end_time": end_time.to_rfc3339(),
                "duration": duration,
                "created_at": chrono::Utc::now().to_rfc3339(),
            });
            Json(ApiResponse::success(report, "提交报工记录成功"))
        }
        Err(e) => {
            tracing::error!("提交报工记录失败: {}", e);
            Json(ApiResponse::error(500, "提交报工记录失败"))
        }
    }
}

pub async fn list_equipment(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, equipment_no, name, equipment_type, status, location, last_maintenance, next_maintenance, running_hours, created_at, updated_at
        FROM equipment
        ORDER BY name
        "#
    )
    .fetch_all(&pool)
    .await;

    match rows {
        Ok(rows) => {
            let equipment: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id,
                        "equipment_no": row.equipment_no,
                        "name": row.name,
                        "type": row.equipment_type,
                        "status": row.status,
                        "location": row.location,
                        "last_maintenance": row.last_maintenance.map(|d| d.to_string()),
                        "next_maintenance": row.next_maintenance.map(|d| d.to_string()),
                        "running_hours": row.running_hours,
                        "created_at": row.created_at.map(|d| d.to_string()),
                        "updated_at": row.updated_at.map(|d| d.to_string()),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": equipment, "total": equipment.len() }),
                "获取设备列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取设备列表失败: {}", e);
            Json(ApiResponse::error(500, "获取设备列表失败"))
        }
    }
}

pub async fn get_equipment(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let equipment_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的ID格式")),
    };

    let row = sqlx::query!(
        r#"
        SELECT id, equipment_no, name, equipment_type, status, location, last_maintenance, next_maintenance, running_hours, created_at, updated_at
        FROM equipment
        WHERE id = $1
        "#,
        equipment_id
    )
    .fetch_optional(&pool)
    .await;

    match row {
        Ok(Some(row)) => {
            let equipment = serde_json::json!({
                "id": row.id,
                "equipment_no": row.equipment_no,
                "name": row.name,
                "type": row.equipment_type,
                "status": row.status,
                "location": row.location,
                "last_maintenance": row.last_maintenance.map(|d| d.to_string()),
                "next_maintenance": row.next_maintenance.map(|d| d.to_string()),
                "running_hours": row.running_hours,
                "created_at": row.created_at.map(|d| d.to_string()),
                "updated_at": row.updated_at.map(|d| d.to_string()),
            });
            Json(ApiResponse::success(equipment, "获取设备详情成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "设备不存在")),
        Err(e) => {
            tracing::error!("获取设备详情失败: {}", e);
            Json(ApiResponse::error(500, "获取设备详情失败"))
        }
    }
}
