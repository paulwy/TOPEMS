use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use topems_shared::ApiResponse;
use topems_shared_service_client::service_client::{api::wms_api::WmsApi, TypedServiceClient};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStocktakeRecordRequest {
    pub item_id: String,
    pub actual_quantity: i32,
}

pub async fn list_inventory_items(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_inventory_items(1, 100).await {
        Ok(data) => Json(ApiResponse::success(data, "获取库存列表成功")),
        Err(e) => {
            tracing::error!("调用WMS服务获取库存列表失败: {}", e);
            Json(ApiResponse::error(500, "获取库存列表失败"))
        }
    }
}

pub async fn get_inventory_item(
    State(client): State<TypedServiceClient<WmsApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.get_inventory_item(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "获取库存详情成功")),
        Err(e) => {
            tracing::error!("调用WMS服务获取库存详情失败: {}", e);
            Json(ApiResponse::error(500, "获取库存详情失败"))
        }
    }
}

pub async fn list_stocktake_tasks(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_stocktake_tasks(1, 100).await {
        Ok(data) => Json(ApiResponse::success(data, "获取盘点任务列表成功")),
        Err(e) => {
            tracing::error!("调用WMS服务获取盘点任务失败: {}", e);
            Json(ApiResponse::error(500, "获取盘点任务列表失败"))
        }
    }
}

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
        Ok(data) => Json(ApiResponse::success(data, "创建盘点记录成功")),
        Err(e) => {
            tracing::error!("调用WMS服务创建盘点记录失败: {}", e);
            Json(ApiResponse::error(500, "创建盘点记录失败"))
        }
    }
}

pub async fn list_inbound_orders(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_inbound_orders(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取入库单列表成功",
        )),
        Err(e) => {
            tracing::error!("调用WMS服务获取入库单列表失败: {}", e);
            Json(ApiResponse::error(500, "获取入库单列表失败"))
        }
    }
}

pub async fn list_outbound_orders(
    State(client): State<TypedServiceClient<WmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_outbound_orders(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取出库单列表成功",
        )),
        Err(e) => {
            tracing::error!("调用WMS服务获取出库单列表失败: {}", e);
            Json(ApiResponse::error(500, "获取出库单列表失败"))
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
