use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared_service_client::service_client::{api::mes_api::MesApi, TypedServiceClient};

use topems_shared_core::response::ApiResponse;

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:production:read"])),
    path = "/production/orders",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "production"
)]
pub async fn list_production_orders(
    State(client): State<TypedServiceClient<MesApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_production_orders(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取生产订单列表成功",
        )),
        Err(e) => {
            tracing::error!("调用MES服务获取生产订单列表失败: {}", e);
            Json(ApiResponse::error(500, "获取生产订单列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:production:read"])),
    path = "/production/orders/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "production"
)]
pub async fn get_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.get_production_order(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "获取生产订单详情成功")),
        Err(e) => {
            tracing::error!("调用MES服务获取生产订单详情失败: {}", e);
            Json(ApiResponse::error(500, "获取生产订单详情失败"))
        }
    }
}

/// 创建生产订单（前端 POST /production/orders → MES POST /orders）
pub async fn create_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Json(payload): axum::extract::Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.create_production_order(&payload).await {
        Ok(data) => Json(ApiResponse::success(data, "创建生产订单成功")),
        Err(e) => {
            tracing::error!("调用MES服务创建生产订单失败: {}", e);
            Json(ApiResponse::error(500, "创建生产订单失败"))
        }
    }
}

/// 更新生产订单（前端 PUT /production/orders/{id} → MES PUT /orders/{id}）
pub async fn update_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    axum::extract::Json(payload): axum::extract::Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.update_production_order(&id, &payload).await {
        Ok(data) => Json(ApiResponse::success(data, "更新生产订单成功")),
        Err(e) => {
            tracing::error!("调用MES服务更新生产订单失败: {}", e);
            Json(ApiResponse::error(500, "更新生产订单失败"))
        }
    }
}

/// 删除生产订单（前端 DELETE /production/orders/{id} → MES DELETE /orders/{id}）
pub async fn delete_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.delete_production_order(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "删除生产订单成功")),
        Err(e) => {
            tracing::error!("调用MES服务删除生产订单失败: {}", e);
            Json(ApiResponse::error(500, "删除生产订单失败"))
        }
    }
}

/// 开始生产订单（前端 POST /production/orders/{id}/start → MES PUT /orders/{id}/start）
pub async fn start_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.start_production_order(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "开始生产订单成功")),
        Err(e) => {
            tracing::error!("调用MES服务开始生产订单失败: {}", e);
            Json(ApiResponse::error(500, "开始生产订单失败"))
        }
    }
}

/// 完成生产订单（前端 POST /production/orders/{id}/complete → MES PUT /orders/{id}/complete）
pub async fn complete_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.complete_production_order(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "完成生产订单成功")),
        Err(e) => {
            tracing::error!("调用MES服务完成生产订单失败: {}", e);
            Json(ApiResponse::error(500, "完成生产订单失败"))
        }
    }
}

// ===== 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

/// 今日生产订单（前端 GET /production/orders/today → MES 列表按日期字段过滤）
pub async fn get_today_production_orders(
    State(client): State<TypedServiceClient<MesApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let today = chrono::Utc::now().date_naive().to_string();
    match client.list_production_orders(1, 100).await {
        Ok(items) => {
            let filtered: Vec<serde_json::Value> = items
                .into_iter()
                .filter(|item| {
                    ["date", "created_at", "planned_start_date", "start_date"]
                        .iter()
                        .any(|k| {
                            item.get(*k)
                                .and_then(|v| v.as_str())
                                .map(|v| v.starts_with(&today))
                                .unwrap_or(false)
                        })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": filtered, "total": filtered.len() }),
                "获取今日生产订单成功",
            ))
        }
        Err(e) => {
            tracing::error!("调用MES服务获取今日生产订单失败: {}", e);
            Json(ApiResponse::error(500, "获取今日生产订单失败"))
        }
    }
}

/// 工位订单（前端 GET /production/workstations/{wid}/orders → MES 列表按工位过滤）
pub async fn get_workstation_orders(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(workstation_id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_production_orders(1, 100).await {
        Ok(items) => {
            let filtered: Vec<serde_json::Value> = items
                .into_iter()
                .filter(|item| {
                    ["workstation", "station_id", "workstation_id", "station"]
                        .iter()
                        .any(|k| {
                            item.get(*k)
                                .and_then(|v| v.as_str())
                                .map(|v| v == workstation_id.as_str())
                                .unwrap_or(false)
                        })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "items": filtered, "total": filtered.len() }),
                "获取工位订单成功",
            ))
        }
        Err(e) => {
            tracing::error!("调用MES服务获取工位订单失败: {}", e);
            Json(ApiResponse::error(500, "获取工位订单失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:production:read"])),
    path = "/production/work-reports",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "production"
)]
pub async fn list_work_reports(
    State(client): State<TypedServiceClient<MesApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_work_reports(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取报工记录列表成功",
        )),
        Err(e) => {
            // MES 上游未实现该端点（404 空响应/解码失败），按契约兜底空列表，待上游支持
            tracing::error!("调用MES服务获取报工记录列表失败: {}（兜底空列表）", e);
            Json(ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0 }),
                "获取报工记录列表成功",
            ))
        }
    }
}

pub async fn submit_work_report(
    State(client): State<TypedServiceClient<MesApi>>,
    Json(payload): Json<CreateWorkReportRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let data = serde_json::json!({
        "order_id": payload.order_id,
        "workstation": payload.workstation,
        "operator": payload.operator,
        "quantity": payload.quantity,
        "good_quantity": payload.good_quantity,
        "bad_quantity": payload.bad_quantity,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
    });

    match client.submit_work_report(&data).await {
        Ok(data) => Json(ApiResponse::success(data, "提交报工记录成功")),
        Err(e) => {
            tracing::error!("调用MES服务提交报工记录失败: {}", e);
            Json(ApiResponse::error(500, "提交报工记录失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:production:read"])),
    path = "/production/equipment",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "production"
)]
pub async fn list_equipment(
    State(client): State<TypedServiceClient<MesApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_equipment(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取设备列表成功",
        )),
        Err(e) => {
            // MES 上游未实现该端点（404 空响应/解码失败），按契约兜底空列表，待上游支持
            tracing::error!("调用MES服务获取设备列表失败: {}（兜底空列表）", e);
            Json(ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0 }),
                "获取设备列表成功",
            ))
        }
    }
}

pub async fn get_equipment(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.get_equipment(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "获取设备详情成功")),
        Err(e) => {
            tracing::error!("调用MES服务获取设备详情失败: {}", e);
            Json(ApiResponse::error(500, "获取设备详情失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn create_work_report_request_roundtrip() {
        roundtrip(&CreateWorkReportRequest {
            order_id: "ord1".into(),
            workstation: "WS01".into(),
            operator: "alice".into(),
            quantity: 100,
            good_quantity: 98,
            bad_quantity: 2,
            start_time: "2026-01-01T08:00:00Z".into(),
            end_time: "2026-01-01T17:00:00Z".into(),
        });
    }
}
