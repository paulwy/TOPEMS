use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use topems_shared::ApiResponse;
use topems_shared_service_client::service_client::{api::qms_api::QmsApi, TypedServiceClient};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDefectRequest {
    pub task_id: String,
    pub defect_type: String,
    pub severity: String,
    pub quantity: i32,
    pub description: String,
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskStatusRequest {
    pub status: String,
    pub result: Option<serde_json::Value>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:quality:read"])),
    path = "/quality/tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
pub async fn list_quality_tasks(
    State(client): State<TypedServiceClient<QmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_quality_tasks(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取质检任务列表成功",
        )),
        Err(e) => {
            tracing::error!("调用QMS服务获取质检任务列表失败: {}", e);
            Json(ApiResponse::error(500, "获取质检任务列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:quality:read"])),
    path = "/quality/tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
pub async fn get_quality_task(
    State(client): State<TypedServiceClient<QmsApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.get_quality_task(&id).await {
        Ok(data) => Json(ApiResponse::success(data, "获取质检任务详情成功")),
        Err(e) => {
            tracing::error!("调用QMS服务获取质检任务详情失败: {}", e);
            Json(ApiResponse::error(500, "获取质检任务详情失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:quality:read"])),
    path = "/quality/defects",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
pub async fn list_defect_records(
    State(client): State<TypedServiceClient<QmsApi>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match client.list_defect_records(1, 100).await {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({ "items": items, "total": items.len() }),
            "获取缺陷记录列表成功",
        )),
        Err(e) => {
            tracing::error!("调用QMS服务获取缺陷记录列表失败: {}", e);
            Json(ApiResponse::error(500, "获取缺陷记录列表失败"))
        }
    }
}

pub async fn report_defect(
    State(client): State<TypedServiceClient<QmsApi>>,
    Json(payload): Json<CreateDefectRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let data = serde_json::json!({
        "task_id": payload.task_id,
        "defect_type": payload.defect_type,
        "severity": payload.severity,
        "quantity": payload.quantity,
        "description": payload.description,
        "images": payload.images.unwrap_or_default(),
    });

    match client.report_defect(&data).await {
        Ok(data) => Json(ApiResponse::success(data, "上报缺陷成功")),
        Err(e) => {
            tracing::error!("调用QMS服务上报缺陷失败: {}", e);
            Json(ApiResponse::error(500, "上报缺陷失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mobile:quality:write"])),
    path = "/quality/tasks/{id}/status",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality"
)]
pub async fn update_quality_task_status(
    State(client): State<TypedServiceClient<QmsApi>>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(payload): Json<UpdateTaskStatusRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let data = serde_json::json!({
        "status": payload.status,
        "result": payload.result,
    });

    match client.update_quality_task_status(&id, &data).await {
        Ok(data) => Json(ApiResponse::success(data, "更新质检任务状态成功")),
        Err(e) => {
            tracing::error!("调用QMS服务更新质检任务状态失败: {}", e);
            Json(ApiResponse::error(500, "更新质检任务状态失败"))
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
    fn create_defect_request_roundtrip() {
        roundtrip(&CreateDefectRequest {
            task_id: "t1".into(),
            defect_type: "scratch".into(),
            severity: "minor".into(),
            quantity: 2,
            description: "bad".into(),
            images: None,
        });
    }

    #[test]
    fn update_task_status_request_roundtrip() {
        roundtrip(&UpdateTaskStatusRequest {
            status: "done".into(),
            result: Some(serde_json::json!({"ok":true})),
        });
    }
}
