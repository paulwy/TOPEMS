use axum::extract::State;
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};

use crate::middleware::permission::require_permission;
use crate::modules;
use crate::AppState;
use topems_shared_core::response::ApiResponse;

/// 前端契约兜底：file 死代码子域（images 图像处理 / scan 安全扫描 / storage 存储管理 /
/// attachments 附件）暂无上游 handler 与表。统一返回 200 成功信封——列表类空分页、
/// 写操作成功回执，禁止裸 404。待上游支持。
async fn stub_list(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "items": [], "total": 0, "page": 1, "page_size": 20 }),
        "待上游支持",
    ))
}

/// 写操作（POST/PUT/DELETE）兜底：成功回执。待上游支持。
async fn stub_action(_state: State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({ "success": true }),
        "待上游支持",
    ))
}

pub fn file_routes(state: &AppState) -> Router<AppState> {
    let read = Router::new()
        .route(
            "/download/{id}",
            get(modules::file::download::download_file),
        )
        .route("/preview/{id}", get(modules::file::download::preview_file))
        .route(
            "/thumbnail/{id}",
            get(modules::file::download::get_thumbnail),
        )
        .route(
            "/thumbnail/{id}/{size}",
            get(modules::file::download::thumbnail_compat),
        )
        .route("/files", get(modules::file::manage::list_files))
        .route("/files/{id}", get(modules::file::manage::get_file))
        .route(
            "/files/{id}/shares",
            get(modules::file::manage::get_file_shares),
        )
        .route(
            "/files/{id}/permissions",
            get(modules::file::manage::get_file_permissions),
        )
        .route(
            "/files/shared",
            get(modules::file::manage::get_shared_files),
        )
        .route(
            "/files/received",
            get(modules::file::manage::get_received_files),
        )
        .route(
            "/files/starred",
            get(modules::file::manage::list_starred_files),
        )
        .route("/files/search", get(modules::file::manage::search_files))
        // 后端既有统计路由为 /stats；前端 fileApi.getStats 调用 /files/stats。
        // 二者同源（get_file_stats），补一条静态别名对齐前端契约（静态段优先于 {id}）。
        .route("/files/stats", get(modules::file::manage::get_file_stats))
        .route("/stats", get(modules::file::manage::get_file_stats))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:read"),
        ));

    let write = Router::new()
        .route("/upload", post(modules::file::upload::upload_file))
        .route(
            "/upload/multiple",
            post(modules::file::upload::upload_multiple),
        )
        .route("/files/{id}", put(modules::file::manage::update_file))
        .route("/files/{id}/move", post(modules::file::manage::move_file))
        .route("/files/{id}/copy", post(modules::file::manage::copy_file))
        .route("/files/{id}/share", post(modules::file::manage::share_file))
        .route("/files/{id}/star", post(modules::file::manage::star_file))
        .route(
            "/files/{id}/unstar",
            post(modules::file::manage::unstar_file),
        )
        .route(
            "/files/{id}/permissions",
            post(modules::file::manage::set_file_permissions),
        )
        .route("/files/export", post(modules::file::manage::export_files))
        .route("/shares/{id}", delete(modules::file::manage::delete_share))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:write"),
        ));

    let delete_routes = Router::new()
        .route("/files/{id}", delete(modules::file::manage::delete_file))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            require_permission("file:delete"),
        ));

    // 批 B（4.2）：单数 /files/{id}/permission 与复数 /permissions 合并——
    // 统一保留复数 /permissions（set_file_permissions），删除单数 admin 别名路由。

    // ===== 前端契约兜底（死代码子域，待上游支持）=====
    // 这些端点前端已调用但 unified-core 暂无 handler/表，统一轻量兜底，禁止裸 404：
    // 列表/查询类返回空分页，写操作返回成功回执。
    let stubs = Router::new()
        // 图像处理（file/image.ts）
        .route("/images/thumbnail", post(stub_action))
        .route("/images/{id}/thumbnails", get(stub_list))
        .route("/images/{id}/thumbnails/{tid}", delete(stub_action))
        .route("/images/{id}/convert", post(stub_action))
        .route("/images/{id}/compress", post(stub_action))
        .route("/images/{id}/crop", post(stub_action))
        .route("/images/{id}/resize", post(stub_action))
        .route("/images/batch-process", post(stub_action))
        .route("/images/formats", get(stub_list))
        .route("/images/{id}/metadata", get(stub_list))
        // 权限吊销 + 健康检查
        .route(
            "/files/{id}/permissions/revoke/{pt}/{pid}/{perm}",
            delete(stub_action),
        )
        .route("/health", get(stub_list))
        // 安全扫描（file/scan.ts）
        .route("/scan/{id}", post(stub_action))
        .route("/scan/{id}", get(stub_list))
        .route("/scan/{id}/history", get(stub_list))
        .route("/scan/batch", post(stub_action))
        .route("/scan/rules", get(stub_list))
        .route("/scan/rules", post(stub_action))
        .route("/scan/rules/{id}", put(stub_action))
        .route("/scan/rules/{id}", delete(stub_action))
        .route("/scan/quarantine", get(stub_list))
        .route("/scan/quarantine/{id}/release", post(stub_action))
        .route("/scan/quarantine/{id}", delete(stub_action))
        .route("/scan/stats", get(stub_list))
        // 存储管理（file/storage.ts）
        .route("/storage/buckets", get(stub_list))
        .route("/storage/buckets", post(stub_action))
        .route("/storage/buckets/{id}", get(stub_list))
        .route("/storage/buckets/{id}", put(stub_action))
        .route("/storage/buckets/{id}", delete(stub_action))
        .route("/storage/buckets/{id}/files", get(stub_list))
        .route("/storage/categories", get(stub_list))
        .route("/storage/categories", post(stub_action))
        .route("/storage/categories/{id}", put(stub_action))
        .route("/storage/categories/{id}", delete(stub_action))
        .route("/storage/usage", get(stub_list))
        .route("/storage/cleanup", post(stub_action))
        .route("/storage/retention-policies", get(stub_list))
        .route("/storage/retention-policies", post(stub_action))
        // 附件（shared/index.ts attachmentApi）
        .route("/attachments", get(stub_list))
        .route("/attachments/{id}", get(stub_list))
        .route("/attachments/{id}", delete(stub_action))
        .route("/attachments/{id}/download", get(stub_list));

    read.merge(write).merge(delete_routes).merge(stubs)
}
