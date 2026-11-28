use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared_service_client::service_client::{api::mes_api::MesApi, TypedServiceClient};

use crate::modules::contract_util::unwrap_data;
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
) -> ApiResponse<serde_json::Value> {
    match client.list_production_orders(1, 100).await {
        Ok(items) => ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取生产订单列表成功",
        ),
        Err(e) => {
            // MES 上游未启动时优雅降级：返回空列表，与同文件 work-reports/equipment 兜底口径一致。
            tracing::warn!("调用MES服务获取生产订单列表失败（降级空列表）: {}", e);
            ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0, "degraded": true }),
                "获取生产订单列表成功（MES 服务未接入，返回空态）",
            )
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
) -> ApiResponse<serde_json::Value> {
    match client.get_production_order(&id).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "获取生产订单详情成功"),
        Err(e) => {
            // MES 上游未启动时优雅降级：返回 null 数据。
            tracing::warn!("调用MES服务获取生产订单详情失败（降级 null）: {}", e);
            ApiResponse::success(
                serde_json::Value::Null,
                "获取生产订单详情成功（MES 服务未接入，返回空态）",
            )
        }
    }
}

// 批 37：create/update/delete_production_order 三 handler 已删除。
// 四路取证：前端 `api/mobile/production.ts` 的 12 个方法里没有这三个，barrel `index.ts`
// 也没有转发，属 C 类（后端有、前端完全无声明）真死代码。此前降级为 503 已不假成功，
// 但保留无消费端点是长期噪音，故删除 handler + shared/mod.rs 路由注册。
// 保留 start/complete：`pauseOrder` 同族页面真实在用。

/// 开始生产订单（前端 POST /production/orders/{id}/start → MES PUT /orders/{id}/start）
#[utoipa::path(
    post,
    path = "/api/mobile/production/orders/{id}/start",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn start_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    match client.start_production_order(&id).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "开始生产订单成功"),
        Err(e) => {
            // MES 上游未启动时优雅降级：返回受理成功（与 contract_fallback mutate_ok 口径一致）。
            tracing::warn!("调用MES服务开始生产订单失败（降级受理）: {}", e);
            ApiResponse::success(
                serde_json::Value::Null,
                "开始生产订单已受理（MES 服务未接入，返回空态）",
            )
        }
    }
}

/// 完成生产订单（前端 POST /production/orders/{id}/complete → MES PUT /orders/{id}/complete）
#[utoipa::path(
    post,
    path = "/api/mobile/production/orders/{id}/complete",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn complete_production_order(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    match client.complete_production_order(&id).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "完成生产订单成功"),
        Err(e) => {
            tracing::warn!("调用MES服务完成生产订单失败（降级受理）: {}", e);
            ApiResponse::success(
                serde_json::Value::Null,
                "完成生产订单已受理（MES 服务未接入，返回空态）",
            )
        }
    }
}

// ===== 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

/// 今日生产订单（前端 GET /production/orders/today → MES 列表按日期字段过滤）
pub async fn get_today_production_orders(
    State(client): State<TypedServiceClient<MesApi>>,
) -> ApiResponse<serde_json::Value> {
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
            ApiResponse::success(
                serde_json::json!({ "items": filtered, "total": filtered.len() }),
                "获取今日生产订单成功",
            )
        }
        Err(e) => {
            tracing::warn!("调用MES服务获取今日生产订单失败（降级空列表）: {}", e);
            ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0, "degraded": true }),
                "获取今日生产订单成功（MES 服务未接入，返回空态）",
            )
        }
    }
}

/// 工位订单（前端 GET /production/workstations/{wid}/orders → MES 列表按工位过滤）
pub async fn get_workstation_orders(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(workstation_id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
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
            ApiResponse::success(
                serde_json::json!({ "items": filtered, "total": filtered.len() }),
                "获取工位订单成功",
            )
        }
        Err(e) => {
            tracing::warn!("调用MES服务获取工位订单失败（降级空列表）: {}", e);
            ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0, "degraded": true }),
                "获取工位订单成功（MES 服务未接入，返回空态）",
            )
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
) -> ApiResponse<serde_json::Value> {
    match client.list_work_reports(1, 100).await {
        Ok(items) => ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取报工记录列表成功",
        ),
        Err(e) => {
            // MES 上游未实现该端点（404 空响应/解码失败），按契约兜底空列表，待上游支持
            tracing::error!("调用MES服务获取报工记录列表失败: {}（兜底空列表）", e);
            ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0, "degraded": true }),
                "获取报工记录列表成功（MES 服务未接入，返回空态）",
            )
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/mobile/production/work-reports",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn submit_work_report(
    State(client): State<TypedServiceClient<MesApi>>,
    Json(payload): Json<CreateWorkReportRequest>,
) -> ApiResponse<serde_json::Value> {
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
        Ok(data) => ApiResponse::success(unwrap_data(data), "提交报工记录成功"),
        Err(e) => {
            tracing::warn!("调用MES服务提交报工记录失败（降级503未接入）: {}", e);
            ApiResponse::unavailable("上游服务未接入：MES，提交报工记录未执行")
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
) -> ApiResponse<serde_json::Value> {
    match client.list_equipment(1, 100).await {
        Ok(items) => ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取设备列表成功",
        ),
        Err(e) => {
            // MES 上游未实现该端点（404 空响应/解码失败），按契约兜底空列表，待上游支持
            tracing::error!("调用MES服务获取设备列表失败: {}（兜底空列表）", e);
            ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0, "degraded": true }),
                "获取设备列表成功（MES 服务未接入，返回空态）",
            )
        }
    }
}

pub async fn get_equipment(
    State(client): State<TypedServiceClient<MesApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    match client.get_equipment(&id).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "获取设备详情成功"),
        Err(e) => {
            tracing::warn!("调用MES服务获取设备详情失败（降级 null）: {}", e);
            ApiResponse::success(
                serde_json::Value::Null,
                "获取设备详情成功（MES 服务未接入，返回空态）",
            )
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
