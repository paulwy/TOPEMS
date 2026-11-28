//! 客户模块（前端 mobile/customer.ts 契约对齐，2026-10-05）
//! 复用 CRM 服务客户端（/api/crm/customers 完整 CRUD）

use crate::modules::contract_util::{downstream_error, unwrap_data};
use axum::{extract::State, Json};
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::{api::crm_api::CrmApi, TypedServiceClient};

/// 客户列表（前端 GET /customer）
#[utoipa::path(
    get,
    path = "/api/mobile/customers",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn list_customers(
    State(client): State<TypedServiceClient<CrmApi>>,
) -> ApiResponse<serde_json::Value> {
    match client.list_customers(1, 100).await {
        Ok(data) => ApiResponse::success(serde_json::Value::Array(data), "获取客户列表成功"),
        Err(e) => {
            // CRM 上游未接入时优雅降级：返回空列表（与 inventory/production 列表兜底口径一致）。
            tracing::warn!("调用CRM服务获取客户列表失败（降级空列表）: {}", e);
            ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0 }),
                "获取客户列表成功（CRM 服务未接入，返回空态）",
            )
        }
    }
}

/// 客户详情（前端 GET /customer/{id}）
#[utoipa::path(
    get,
    path = "/api/mobile/customers/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    match client.get_customer(&id).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "获取客户详情成功"),
        Err(e) => {
            tracing::warn!("调用CRM服务获取客户详情失败（降级空态）: {}", e);
            ApiResponse::success(
                serde_json::Value::Null,
                "获取客户详情成功（CRM 服务未接入，返回空态）",
            )
        }
    }
}

/// 新建客户（前端 POST /customer）
#[utoipa::path(
    post,
    path = "/api/mobile/customers",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn create_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    match client.create_customer(&payload).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "创建客户成功"),
        Err(e) => {
            // 4xx 业务错误透传；连接失败/5xx 降级为 503 未接入（操作未执行）。
            if let TopemsError::ServiceError { status_code, .. } = &e {
                if (400..500).contains(status_code) {
                    return downstream_error(&e, "创建客户失败");
                }
            }
            tracing::warn!("调用CRM服务创建客户失败（降级503未接入）: {}", e);
            ApiResponse::unavailable("上游服务未接入：CRM，创建客户未执行")
        }
    }
}

/// 更新客户（前端 PUT /customer/{id}）
#[utoipa::path(
    put,
    path = "/api/mobile/customers/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    match client.update_customer(&id, &payload).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "更新客户成功"),
        Err(e) => {
            if let TopemsError::ServiceError { status_code, .. } = &e {
                if (400..500).contains(status_code) {
                    return downstream_error(&e, "更新客户失败");
                }
            }
            tracing::warn!("调用CRM服务更新客户失败（降级503未接入）: {}", e);
            ApiResponse::unavailable("上游服务未接入：CRM，更新客户未执行")
        }
    }
}

/// 删除客户（前端 DELETE /customer/{id}）
#[utoipa::path(
    delete,
    path = "/api/mobile/customers/{id}",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete_customer(
    State(client): State<TypedServiceClient<CrmApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<serde_json::Value> {
    match client.delete_customer(&id).await {
        Ok(data) => ApiResponse::success(unwrap_data(data), "删除客户成功"),
        Err(e) => {
            if let TopemsError::ServiceError { status_code, .. } = &e {
                if (400..500).contains(status_code) {
                    return downstream_error(&e, "删除客户失败");
                }
            }
            tracing::warn!("调用CRM服务删除客户失败（降级503未接入）: {}", e);
            ApiResponse::unavailable("上游服务未接入：CRM，删除客户未执行")
        }
    }
}
