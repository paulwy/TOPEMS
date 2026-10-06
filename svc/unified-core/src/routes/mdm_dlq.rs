//! A4: MDM 主数据死信队列管理 API（list / replay）
//!
//! 背景：R-7b 将 MDM 主数据事件超限失败推入独立 keyspace `topems:mdm_dlq:{prefix}`
//! （`MdmDeadLetter` + `push_mdm`），但此前只 push、无管理端点——事件入 DLQ 后无法
//! 查看/重投。本模块补齐 list（分页查看）与 replay（重投回原 MDM Stream 走标准消费链路）。
//!
//! 鉴权：对齐 unified-core 既有 admin 路由风格——全局 `auth_middleware`（JWT）+
//! `require_permission("system:read")`（list）/ `require_permission("system:write")`（replay）。
//!
//! 重投语义：保留事件原 event_id（嵌在 payload JSON 内，复用既有幂等 UPSERT），
//! XADD `*` 生成新 message_id 使消费者组重新投递、重试计数从 0 累积；重投成功后从 DLQ 移除条目。

use axum::extract::{Path, Query, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::middleware::permission::require_permission;
use crate::AppState;
use topems_shared_core::response::{api_success, ApiResponse};
use topems_shared_event::event::dead_letter_queue::{
    DeadLetterQueue, MdmDeadLetter, MdmDeadLetterList,
};

/// list 查询参数（全部可选）
#[derive(Debug, serde::Deserialize)]
pub struct ListMdmDlqQuery {
    /// 域前缀过滤（如 `mat`/`emp`/`cust`）；缺省扫描全部 `topems:mdm_dlq:*`
    pub prefix: Option<String>,
    /// 页码，从 0 开始，默认 0
    pub page: Option<usize>,
    /// 每页条数，默认 20，上限 200
    pub page_size: Option<usize>,
}

fn err_message(e: &impl std::fmt::Debug) -> String {
    format!("{:?}", e)
}

/// GET /system/mdm-dlq —— 分页列出 MDM 死信（system:read）
async fn list_mdm_dlq(
    State(_state): State<AppState>,
    Query(q): Query<ListMdmDlqQuery>,
) -> Json<ApiResponse<MdmDeadLetterList>> {
    let page = q.page.unwrap_or(0);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 200);
    match DeadLetterQueue::new() {
        Ok(dlq) => match dlq
            .list_mdm_dead_letters(q.prefix.as_deref(), page, page_size)
            .await
        {
            Ok(list) => Json(api_success(list)),
            Err(_) => Json(ApiResponse::from(TopemsError::Internal(
                "查询 MDM 死信记录失败".to_string(),
            ))),
        },
        Err(_) => Json(ApiResponse::from(TopemsError::Internal(
            "查询 MDM 死信记录失败".to_string(),
        ))),
    }
}

/// POST /system/mdm-dlq/events/{event_id}/replay —— 重投单条 MDM 死信（system:write）
///
/// 重投成功返回被重投的条目；未找到对应条目返回 404。
async fn replay_mdm_dlq(
    State(_state): State<AppState>,
    Path(event_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let dlq = match DeadLetterQueue::new() {
        Ok(d) => d,
        Err(_) => {
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询 MDM 死信记录失败".to_string(),
            )))
        }
    };
    match dlq.replay_mdm_dead_letter(event_id).await {
        Ok(()) => Json(api_success(serde_json::json!({
            "event_id": event_id.to_string(),
            "replayed": true,
        }))),
        Err(topems_shared_event::EventError::ConfigError(_)) => {
            // 未找到条目
            Json(ApiResponse::from(TopemsError::ResourceNotFound(
                "未找到 MDM 事件死信记录".to_string(),
            )))
        }
        Err(_) => Json(ApiResponse::from(TopemsError::Internal(
            "查询 MDM 死信记录失败".to_string(),
        ))),
    }
}

/// GET /system/mdm-dlq/events/{event_id} —— 单条 MDM 死信（system:read）
///
/// 按 event_id 跨全部 MDM DLQ keyspace 查找；未找到返回 404。
async fn get_mdm_dlq(
    State(_state): State<AppState>,
    Path(event_id): Path<Uuid>,
) -> Json<ApiResponse<MdmDeadLetter>> {
    let dlq = match DeadLetterQueue::new() {
        Ok(d) => d,
        Err(_) => {
            return Json(ApiResponse::from(TopemsError::Internal(
                "查询 MDM 死信记录失败".to_string(),
            )))
        }
    };
    match dlq.get_mdm_dead_letter(event_id).await {
        Ok(Some(dl)) => Json(api_success(dl)),
        Ok(None) => Json(ApiResponse::from(TopemsError::ResourceNotFound(
            "未找到 MDM 事件死信记录".to_string(),
        ))),
        Err(_) => Json(ApiResponse::from(TopemsError::Internal(
            "查询 MDM 死信记录失败".to_string(),
        ))),
    }
}

pub fn mdm_dlq_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route("/system/mdm-dlq", get(list_mdm_dlq))
        .route("/system/mdm-dlq/events/{event_id}", get(get_mdm_dlq))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:read"),
        ));

    let write = Router::new()
        .route(
            "/system/mdm-dlq/events/{event_id}/replay",
            post(replay_mdm_dlq),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("system:write"),
        ));

    read.merge(write)
}
