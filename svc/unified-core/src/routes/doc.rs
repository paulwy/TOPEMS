use axum::Router;

use crate::modules;
use crate::AppState;

/// Doc routes registered under `/api/core/doc/*`.
/// Merges the doc module's create_routes() under the `/doc` prefix.
pub fn doc_routes(_state: &AppState) -> Router<AppState> {
    Router::new().nest("/doc", modules::doc::create_routes())
}

// V289: 已删除 R4/R6 stub_router（原挂载 /internal/stubs/doc + require_permission
// doc:dashboard:read）。原因见 routes/mod.rs V289 注释：前端 0 业务流量 +
// {mod}:dashboard:read 从未进入 init_permissions 权限表 + plugin.yaml 是权限真源。
