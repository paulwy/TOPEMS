//! 前端契约兜底路由（轻量占位）。
//!
//! ## 批 37 · 全量清理（原 161 个占位端点 → 1 个）
//!
//! 本文件原有 161 个方法端点（覆盖 AI / 工作流 / 审批 / 报表 / 看板 / 供应链 / 库存 /
//! 巡检 / GIS / 文档 / 项目 / 员工 / 客户子端点等前端曾调用但后端未实现的路径）。
//! 其中 `mutate_ok` 假成功写端点占 75 个：返回 `200 + "操作成功（轻量兜底）"` 而数据
//! 一条都不落库，用户不会重试，比报错危害更大。
//!
//! ### 四路取证方法与结论
//!
//! 取证链（避开"只 grep 端点路径"的误判，批 35 踩过 barrel 间接引用坑）：
//! ① 在 `apps/web/src/api/mobile/*.ts` 找端点路径字符串 → 定位所属 API 函数名；
//! ② 用 API 函数名在 `apps/web/src/`（排除 `src/api/` 自身与 `__tests__/`）全量 grep；
//! ③ 核查 barrel `index.ts` 的平铺别名是否被别处 import。
//!
//! 结论：
//! - **A 类（前端真实调用）1 个**：`POST /production/orders/{p1}/pause`
//!   （`useMobileProduction.ts:196` → `productionApi.pauseOrder`）。保留路由，改 503。
//! - **B 类（前端仅声明、零真实调用）160 个**：已**双向删除**——前端死封装（含整文件
//!   删除 `aiAssistant.ts`/`workflow.ts`/`bpm.ts`/`report.ts`）与后端占位路由同步移除。
//! - **C 类（后端有、前端完全无声明）0 个**。
//!
//! 之所以 160 个占位端点全部零消费：mobile 页面并不走 `@/api/mobile/*` 这条通道，
//! 而是各自走 `@/api/ai/*`、`@/api/report`、`@/api/workflow/approval`、`@/api/gis`、
//! `@/api/pdm`、`@/api/mes`、`@/api/qms/inspection` 等独立模块。`@/api/mobile` 下
//! 这些封装自诞生起就没有消费方，属"声明了但从不调用"。
//!
//! 单独说明两个特殊点：
//! - `GET /production/equipment/{p1}` 此前由本文件 `detail_missing` 顶着，实际
//!   `production.rs:get_equipment` 早已实现只是没挂路由；批 37 已在 `shared/mod.rs`
//!   挂上真实路由，本文件对应占位随之删除。
//! - `/customers/{p1}/assign|contacts|follow-ups` 批 36 曾改为 `mutate_unavailable`，
//!   批 37 取证确认前端同样零调用，随其余 B 类一并双向删除。
//!
//! ### 保留的唯一占位：pause
//!
//! 前端"暂停生产订单"是真实在用的操作，但后端没有 pause 实现（`production.rs` 内
//! grep `pause` 零命中），MES 也未提供该动作。按"写操作绝不假成功"原则，此端点
//! 一律返回 **503 + code=503 + 中文说明**，明确告知操作未执行。

use axum::{http::StatusCode, routing::post, Router};
use serde_json::Value;

use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

/// 写操作兜底：明确告知"上游未接入、操作未执行"，绝不返回假成功。
/// message 含"未接入"以匹配 `scripts/web_contract_smoke.py` 的 503 语义豁免
/// （豁免条件收紧为 HTTP==503 且 body.code==503 且 message 含"未接入"三项同时满足，
/// 真实网关 503 与真实 500 故障仍判 FAIL）。
async fn mutate_unavailable() -> (StatusCode, ApiResponse<Value>) {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        ApiResponse::unavailable("上游服务未接入：MES，暂停生产订单未执行"),
    )
}

/// 组装兜底路由表（与 `build_protected_routes` 相同的 `AppState` 类型，供 .merge）。
pub fn routes() -> Router<AppState> {
    Router::new().route("/production/orders/{p1}/pause", post(mutate_unavailable))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 构造路由表时若出现路径冲突（同路径同方法重复 / 同位置参数名重复），
    /// axum 会 panic；此测试兜底防止回归。
    #[test]
    fn fallback_router_builds_without_conflict() {
        let _r = routes();
    }
}
