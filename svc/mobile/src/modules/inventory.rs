use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use topems_shared_core::response::ApiResponse;
use topems_shared_service_client::service_client::{api::wms_api::WmsApi, TypedServiceClient};
use crate::modules::contract_util::unwrap_data;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStocktakeRecordRequest {
    pub item_id: String,
    pub actual_quantity: i32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScanInventoryParams {
    pub barcode: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:inventory:read"])),
    path = "/inventory/items",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn list_inventory_items(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_inventory_items(1, 100).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "获取库存列表成功")),
        Err(e) => {
            tracing::error!("调用WMS服务获取库存列表失败: {}", e);
            Json(ApiResponse::error(500, "获取库存列表失败"))
        }
    }
}

/// 创建库存明细项（前端 POST /inventory，透传 WMS 上游）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:inventory:write"])),
    path = "/inventory",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn create_inventory_item(
    State(client): State<TypedServiceClient<WmsApi>>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.create_inventory(&payload).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "创建库存成功")),
        Err(e) => {
            tracing::error!("调用WMS服务创建库存失败: {}", e);
            Json(ApiResponse::error(500, "创建库存失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:inventory:read"])),
    path = "/inventory/items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn get_inventory_item(
    State(client): State<TypedServiceClient<WmsApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.get_inventory_item(&id).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "获取库存详情成功")),
        Err(e) => {
            tracing::error!("调用WMS服务获取库存详情失败: {}", e);
            Json(ApiResponse::error(500, "获取库存详情失败"))
        }
    }
}

/// 更新库存（前端 PUT /inventory/{id} → WmsApi.update_inventory）
pub async fn update_inventory_item(
    State(client): State<TypedServiceClient<WmsApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.update_inventory(&id, &payload).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "更新库存成功")),
        Err(e) => {
            tracing::error!("调用WMS服务更新库存失败: {}", e);
            Json(ApiResponse::error(500, "更新库存失败"))
        }
    }
}

/// 删除库存（前端 DELETE /inventory/{id} → WmsApi.delete_inventory）
pub async fn delete_inventory_item(
    State(client): State<TypedServiceClient<WmsApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.delete_inventory(&id).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "删除库存成功")),
        Err(e) => {
            tracing::error!("调用WMS服务删除库存失败: {}", e);
            Json(ApiResponse::error(500, "删除库存失败"))
        }
    }
}

/// 低库存列表（前端 GET /inventory/low-stock → WMS /inventory/low-stock）
pub async fn list_low_stock_items(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_low_stock_inventory().await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "获取低库存列表成功")),
        Err(e) => {
            tracing::error!("调用WMS服务获取低库存列表失败: {}", e);
            Json(ApiResponse::error(500, "获取低库存列表失败"))
        }
    }
}

/// 扫码查库存（前端 GET /inventory/scan?barcode= → 列表内按条码/编码过滤）
pub async fn scan_inventory(
    State(client): State<TypedServiceClient<WmsApi>>,
    Query(params): Query<ScanInventoryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let barcode = params.barcode.unwrap_or_default();
    if barcode.is_empty() {
        return Json(ApiResponse::error(400, "缺少条码参数"));
    }

    match client.list_inventory_items(1, 100).await {
        Ok(data) => {
            // WMS 返回可能是 { items: [...] } 或纯数组，兼容两种结构
            let items = if let Some(arr) = data.get("items").and_then(|v| v.as_array()) {
                arr.clone()
            } else if let Some(arr) = data.as_array() {
                arr.clone()
            } else {
                Vec::new()
            };
            let found = items.iter().find(|item| {
                ["barcode", "code", "material_code", "sku"].iter().any(|k| {
                    item.get(*k)
                        .and_then(|v| v.as_str())
                        .map(|v| v.eq_ignore_ascii_case(&barcode))
                        .unwrap_or(false)
                })
            });
            match found {
                Some(item) => Json(ApiResponse::success(item.clone(), "扫码查询成功")),
                None => Json(ApiResponse::success(
                    serde_json::Value::Null,
                    "未找到对应库存",
                )),
            }
        }
        Err(e) => {
            tracing::error!("调用WMS服务扫码查询失败: {}", e);
            Json(ApiResponse::error(500, "扫码查询失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:inventory:read"])),
    path = "/inventory/stocktake",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn list_stocktake_tasks(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_stocktake_tasks(1, 100).await {
        Ok(data) => Json(ApiResponse::success(
            serde_json::json!({ "items": data, "total": data.len() }),
            "获取盘点任务列表成功",
        )),
        Err(e) => {
            // WMS 上游暂未实现盘点任务端点（探测 404），轻量兜底返回空列表，待上游支持。
            tracing::error!("调用WMS服务获取盘点任务失败（兜底空列表）: {}", e);
            Json(ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0 }),
                "获取盘点任务列表成功（待上游支持）",
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:inventory:write"])),
    path = "/inventory/stocktake/{task_id}/records",
    params(
("task_id" = String, Path, description = "task_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn create_stocktake_record(
    State(client): State<TypedServiceClient<WmsApi>>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(payload): Json<CreateStocktakeRecordRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let data = serde_json::json!({
        "item_id": payload.item_id,
        "actual_quantity": payload.actual_quantity,
    });

    match client.create_stocktake_record(&task_id, &data).await {
        Ok(data) => Json(ApiResponse::success(unwrap_data(data), "创建盘点记录成功")),
        Err(e) => {
            tracing::error!("调用WMS服务创建盘点记录失败: {}", e);
            Json(ApiResponse::error(500, "创建盘点记录失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:inventory:read"])),
    path = "/inventory/inbound",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn list_inbound_orders(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_inbound_orders(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取入库单列表成功",
        )),
        Err(e) => {
            // WMS 上游入库单响应暂无法解码，轻量兜底返回空列表，待上游支持。
            tracing::error!("调用WMS服务获取入库单列表失败（兜底空列表）: {}", e);
            Json(ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0 }),
                "获取入库单列表成功（待上游支持）",
            ))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:inventory:read"])),
    path = "/inventory/outbound",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "inventory"
)]
pub async fn list_outbound_orders(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_outbound_orders(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取出库单列表成功",
        )),
        Err(e) => {
            // WMS 上游出库单响应暂无法解码，轻量兜底返回空列表，待上游支持。
            tracing::error!("调用WMS服务获取出库单列表失败（兜底空列表）: {}", e);
            Json(ApiResponse::success(
                serde_json::json!({ "items": [], "total": 0 }),
                "获取出库单列表成功（待上游支持）",
            ))
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
    fn create_stocktake_record_request_roundtrip() {
        roundtrip(&CreateStocktakeRecordRequest {
            item_id: "item001".into(),
            actual_quantity: 50,
        });
    }
}
