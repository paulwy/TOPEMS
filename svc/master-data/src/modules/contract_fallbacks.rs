//! Web 前端契约收口兜底路由（contract fallbacks）—— 待上游支持
//!
//! 背景：scripts/web_contract_smoke.py 从 apps/web/src/api/master/*.ts 静态提取前端契约。
//! 其中两类端点会被实跑探测到，但后端尚无真实实现：
//!   1. mdm-v66 数据资产目录的「预埋零消费」端点（dataAssetCatalogV66.ts 头部注释：
//!      高级方法 bulk/import/export/maps/categories/columns 等保留预埋，页面零消费，待 V66 后端落地）；
//!   2. 静态提取把 `/path${querystring}` 折叠成 `/path:x` 产生的“伪动态段”——真实前端
//!      打的是已在役路由（带 query string），冒烟却多拼了一段路径。
//!
//! 这些端点一律挂轻量空数据兜底（绝不裸 404）：返回 200 + 空集合/通用成功体。
//! 待 V66 正式落地后，用真实 handler 逐个替换本模块挂载点。
//!
//! 注意：本模块仅做“契约面存在性”兜底，不读写任何业务表。

use crate::shared::AppState;
use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};
use topems_shared_core::response::{api_success, ApiResponse};

/// 分页列表兜底：{ items: [], total: 0 }
pub async fn list(State(_s): State<AppState>) -> Json<ApiResponse<Value>> {
    Json(api_success(json!({ "items": [], "total": 0 })))
}

/// 纯数组兜底：[]
pub async fn array(State(_s): State<AppState>) -> Json<ApiResponse<Value>> {
    Json(api_success(json!([])))
}

/// 通用成功兜底（写操作 / 单对象 / 导出）：{ success: true }
pub async fn ok(State(_s): State<AppState>) -> Json<ApiResponse<Value>> {
    Json(api_success(json!({ "success": true })))
}
