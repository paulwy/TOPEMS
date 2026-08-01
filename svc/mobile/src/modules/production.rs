use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use topems_shared::service_client::{api::mes_api::MesApi, TypedServiceClient};

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

pub async fn list_work_reports(
    State(client): State<TypedServiceClient<MesApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_work_reports(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取报工记录列表成功",
        )),
        Err(e) => {
            tracing::error!("调用MES服务获取报工记录列表失败: {}", e);
            Json(ApiResponse::error(500, "获取报工记录列表失败"))
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

pub async fn list_equipment(
    State(client): State<TypedServiceClient<MesApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_equipment(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取设备列表成功",
        )),
        Err(e) => {
            tracing::error!("调用MES服务获取设备列表失败: {}", e);
            Json(ApiResponse::error(500, "获取设备列表失败"))
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
