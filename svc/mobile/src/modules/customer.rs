//! 客户模块（前端 mobile/customer.ts 契约对齐，2026-10-05）
//! 复用 CRM 服务客户端（/api/crm/customers 完整 CRUD）

use crate::modules::contract_util::unwrap_data;
use axum::{extract::State, Json};
use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::{api::crm_api::CrmApi, TypedServiceClient};

/// 客户列表（前端 GET /customer）
pub async fn list_customers(
    State(client): State<TypedServiceClient<CrmApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_customers(1, 100).await {
        Ok(data) => Json(ApiResponse::success(
            serde_json::Value::Array(data),
            "获取客户列表成功",
        )),
        Err(e) => {
            tracing::error!("调用CRM服务获取客户列表失败: {}", e);
            Json(ApiResponse::server_error("获取客户列表失败"))
        }
    }
}

/// 客户详情（前端 GET /customer/{id}）
pub async fn get_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.get_customer(&id).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "获取客户详情成功")),
        Err(e) => {
            tracing::error!("调用CRM服务获取客户详情失败: {}", e);
            Json(ApiResponse::server_error("获取客户详情失败"))
        }
    }
}

/// 新建客户（前端 POST /customer）
pub async fn create_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.create_customer(&payload).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "创建客户成功")),
        Err(e) => {
            tracing::error!("调用CRM服务创建客户失败: {}", e);
            Json(ApiResponse::server_error("创建客户失败"))
        }
    }
}

/// 更新客户（前端 PUT /customer/{id}）
pub async fn update_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.update_customer(&id, &payload).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "更新客户成功")),
        Err(e) => {
            tracing::error!("调用CRM服务更新客户失败: {}", e);
            Json(ApiResponse::server_error("更新客户失败"))
        }
    }
}

/// 删除客户（前端 DELETE /customer/{id}）
pub async fn delete_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.delete_customer(&id).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "删除客户成功")),
        Err(e) => {
            tracing::error!("调用CRM服务删除客户失败: {}", e);
            Json(ApiResponse::server_error("删除客户失败"))
        }
    }
}
