//! P2-8: 财务默认科目/期间按租户补播（bootstrap）
//!
//! 默认科目（1001 库存现金 / 1002 银行存款 / 2202 应付账款 / 6001 主营业务收入 / 6601 管理费用）
//! 与当前月开放会计期间的幂等播种。迁移 `20261021000004` 已将种子逻辑抽为
//! `finance.bootstrap_defaults(p_tenant_id)` 函数并对存量租户全量补播；
//! 本端点暴露按需播种能力：新租户建立后（或存量租户缺默认科目/期间时）可调用，
//! 幂等（缺失才插，不覆盖既有自定义科目/期间）。

use axum::{extract::State, Extension, Json};
use serde::Deserialize;
use serde_json::json;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::shared::{err_resp, AppState};

pub fn create_routes() -> axum::Router<AppState> {
    axum::Router::new().route("/bootstrap", axum::routing::post(bootstrap_defaults))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BootstrapRequest {
    /// 可选：仅补播指定租户；缺省时由服务端解析会话租户。
    tenant_id: Option<String>,
}

/// 补播财务默认科目/期间（幂等）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:write"])),
    path = "/bootstrap",
    request_body = BootstrapRequest,
    responses(
        (status = 200, description = "补播成功", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
    tag = "Finance"
)]
pub async fn bootstrap_defaults(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<BootstrapRequest>,
) -> ApiResponse<serde_json::Value> {
    // 目标租户：请求显式指定优先，否则取会话租户
    let target = match req.tenant_id {
        Some(t) if !t.trim().is_empty() => Some(t),
        _ => claims.tenant_id.clone(),
    };
    let target_label = target.clone().unwrap_or_else(|| "ALL".to_string());

    let backfilled: i32 = match target {
        Some(tid) => {
            let uuid = match uuid::Uuid::parse_str(&tid) {
                Ok(u) => u,
                Err(_) => return ApiResponse::bad_request("tenant_id 格式无效"),
            };
            let mut scope = match state.db.scope_for_tenant(uuid).await {
                Ok(s) => s,
                Err(e) => return err_resp(e),
            };
            let result = sqlx::query_scalar("SELECT finance.bootstrap_defaults($1)")
                .bind(uuid)
                .fetch_one(&mut scope)
                .await;
            if let Err(e) = scope.commit().await {
                return err_resp(e);
            }
            match result {
                Ok(n) => n,
                Err(e) => return err_resp(e),
            }
        }
        None => {
            // 系统通道：超管全局补播无租户上下文（启动/后台例外，登记 §2.1）
            let mut scope = match state.db.scope_system().await {
                Ok(s) => s,
                Err(e) => return err_resp(e),
            };
            // 无会话租户且未显式指定：回退补播全部既有租户
            let result = sqlx::query_scalar("SELECT finance.bootstrap_defaults(NULL)")
                .fetch_one(&mut scope)
                .await;
            if let Err(e) = scope.commit().await {
                return err_resp(e);
            }
            match result {
                Ok(n) => n,
                Err(e) => return err_resp(e),
            }
        }
    };

    ApiResponse::success(
        json!({
            "backfilled_tenants": backfilled,
            "target": target_label,
        }),
        "补播成功（幂等，缺失才插）",
    )
}
use utoipa::ToSchema;
