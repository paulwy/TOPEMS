use axum::{routing::delete, routing::get, routing::post, routing::put, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service_shared, build_application, run, ServiceConfig};
use topems_shared_db::scope::Db;

/// 管理类路由动作门：仅 `communication:admin` 可访问；个人类路由不加此门（auth 即放行）。
/// 以 MethodRouter 粒度挂载，同一路径的读/写可分别归类（如 `/notifications` 的 GET
/// 是个人、POST 是管理）。
fn admin_only<S>(route: axum::routing::MethodRouter<S>) -> axum::routing::MethodRouter<S>
where
    S: Clone + Send + Sync + 'static,
{
    route.layer(axum::middleware::from_fn(require_permission(
        "communication:admin",
    )))
}

mod im;
mod im_location;
mod mail;
mod models;
mod notification;
pub mod openapi;
mod schema_defense;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = ServiceConfig {
        name: "topems-communication",
        port: 8084,
        port_env_var: Some("COMMUNICATION_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/communication",
        legacy_prefixes: &["/api/core/comm", "/api/core/notification"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;
    let db = Db::new(ctx.db.clone(), "communication, public");

    // C-1：自建 DDL 已移除（迁移权威唯一仲裁）；Schema 防御保留
    if let Err(e) = schema_defense::run_schema_migration_and_verify(
        ctx.migrate_pool.as_ref().unwrap_or(&ctx.db),
    )
    .await
    {
        tracing::error!("[communication] Schema 防御检查失败: {:?}", e);
    }

    // ===== 通知读取路由（需要认证） =====
    let notification_read = Router::new()
        .route("/notify/list", get(notification::list_notifications))
        .route(
            "/notification/notifications",
            get(notification::get_notifications),
        )
        .route(
            "/notification/notifications/unread-count",
            get(notification::get_unread_count),
        )
        .route(
            "/notification/notifications/unread",
            get(notification::get_unread_notifications),
        )
        .route(
            "/notification/notifications/{id}",
            get(notification::get_notification),
        )
        .route(
            "/notification/notifications/stats/me",
            get(notification::get_notification_stats),
        )
        .route(
            "/notification/notifications/archived",
            get(notification::list_archived_notifications),
        )
        // 归档策略属租户级配置 → 管理类
        .route(
            "/notification/notifications/archive/config",
            admin_only(get(notification::get_archive_config)),
        )
        .route(
            "/notification/notification-templates",
            admin_only(get(notification::list_templates)),
        )
        .route(
            "/notification/notification-templates/{id}",
            admin_only(get(notification::get_template)),
        )
        .route(
            "/notification/channels",
            admin_only(get(notification::list_channels)),
        )
        .route(
            "/notification/channels/{id}",
            admin_only(get(notification::get_channel)),
        )
        .route(
            "/notification/channels/{id}/metrics",
            admin_only(get(notification::get_channel_metrics)),
        );

    // ===== 通知写入路由（个人类仅需认证；管理类挂 admin_only） =====
    let notification_write = Router::new()
        // 主动推送 / 给他人创建通知 / 群发 → 管理类
        .route(
            "/notify/send",
            admin_only(post(notification::send_notification)),
        )
        .route(
            "/notification/notifications",
            admin_only(post(notification::create_notification)),
        )
        .route(
            "/notify/broadcast",
            admin_only(post(notification::broadcast_notification)),
        )
        .route("/notify/{id}/read", post(notification::mark_as_read))
        .route("/notify/read-all", post(notification::mark_all_as_read))
        .route(
            "/notification/notifications/{id}",
            put(notification::mark_as_read),
        )
        .route(
            "/notification/notifications/read-all",
            put(notification::mark_all_as_read),
        )
        .route(
            "/notification/notifications/{id}/unread",
            put(notification::mark_as_unread),
        )
        .route(
            "/notification/notifications/bulk-read",
            post(notification::bulk_mark_read),
        )
        .route(
            "/notification/notifications/bulk-delete",
            delete(notification::bulk_delete),
        )
        .route(
            "/notification/notifications/{id}/archive",
            post(notification::archive_notification),
        )
        .route(
            "/notification/notifications/{id}/unarchive",
            post(notification::unarchive_notification),
        )
        .route(
            "/notification/notifications/{id}",
            delete(notification::delete_notification),
        )
        .route(
            "/notification/notifications",
            delete(notification::delete_all_notifications),
        )
        // 归档策略配置 / 归档任务 → 管理类
        .route(
            "/notification/notifications/archive/config",
            admin_only(put(notification::update_archive_config)),
        )
        .route(
            "/notification/notifications/archive/run",
            admin_only(post(notification::run_auto_archive)),
        )
        .route(
            "/notification/notification-templates",
            admin_only(post(notification::create_template)),
        )
        .route(
            "/notification/notification-templates/{id}",
            admin_only(put(notification::update_template)),
        )
        .route(
            "/notification/notification-templates/{id}",
            admin_only(delete(notification::delete_template)),
        )
        .route(
            "/notification/channels",
            admin_only(post(notification::create_channel)),
        )
        .route(
            "/notification/channels/{id}",
            admin_only(put(notification::update_channel)),
        )
        .route(
            "/notification/channels/{id}",
            admin_only(delete(notification::delete_channel)),
        )
        .route(
            "/notification/channels/{id}/test",
            admin_only(post(notification::test_channel)),
        );

    // ===== IM 路由（需要认证） =====
    let im_read = Router::new()
        .route("/im/rooms", get(im::list_rooms))
        .route("/im/rooms/{id}", get(im::get_room))
        .route("/im/rooms/{id}/messages", get(im::get_messages))
        .route("/im/rooms/{id}/members", get(im::list_members))
        .route("/im/rooms/search", get(im::search_rooms))
        .route("/im/rooms/{id}/messages/search", get(im::search_messages))
        .route("/im/contacts", get(im::list_contacts))
        .route("/im/contacts/{id}", get(im::get_contact))
        .route("/im/contact-groups", get(im::list_contact_groups))
        .route("/im/online-status/{user_id}", get(im::get_online_status))
        .route(
            "/im/notifications/{user_id}",
            get(im::list_im_notifications),
        )
        .route("/im/project-groups", get(im::list_project_groups))
        // Location & Geofence read endpoints
        .nest(
            "/im",
            Router::new()
                .route(
                    "/locations/rooms/{chat_id}/messages",
                    get(im_location::list_location_messages),
                )
                .route("/locations/geofences", get(im_location::list_geofences))
                .route("/locations/geofences/{id}", get(im_location::get_geofence)),
        );

    let im_write = Router::new()
        .route("/im/rooms", post(im::create_room))
        .route("/im/rooms/{id}", put(im::update_room))
        .route("/im/rooms/{id}", delete(im::delete_room))
        .route("/im/rooms/{id}/messages", post(im::send_message))
        .route("/im/rooms/{id}/members", post(im::add_member))
        .route("/im/rooms/{id}/members", delete(im::remove_member))
        .route("/im/messages/{id}", put(im::update_message))
        .route("/im/messages/{id}", delete(im::delete_message))
        .route("/im/rooms/{id}/read", post(im::mark_messages_read))
        .route("/im/rooms/{id}/mute", post(im::mute_room))
        .route("/im/rooms/{id}/pin", post(im::pin_message))
        .route("/im/contacts", post(im::add_contact))
        .route("/im/contacts/{id}", put(im::update_contact))
        .route("/im/contacts/{id}", delete(im::remove_contact))
        .route("/im/contact-groups", post(im::create_contact_group))
        .route("/im/contact-groups/{id}", put(im::update_contact_group))
        .route("/im/contact-groups/{id}", delete(im::delete_contact_group))
        .route("/im/project-groups", post(im::create_project_group))
        // Location & Geofence write endpoints
        .nest(
            "/im",
            Router::new()
                .route(
                    "/locations/message",
                    post(im_location::send_location_message),
                )
                // 围栏为组织级配置（影响全员定位判定）→ 管理类；POI 搜索与位置消息属个人行为
                .route(
                    "/locations/geofences",
                    admin_only(post(im_location::create_geofence)),
                )
                .route(
                    "/locations/geofences/{id}",
                    admin_only(put(im_location::update_geofence)),
                )
                .route(
                    "/locations/geofences/{id}",
                    admin_only(delete(im_location::delete_geofence)),
                )
                .route("/pois/search", post(im_location::unified_search_pois)),
        );

    // ===== 邮件路由（需要认证） =====
    let mail_read = Router::new()
        .route("/mail/emails", get(mail::list_emails))
        .route("/mail/emails/{id}", get(mail::get_email))
        .route("/mail/emails/stats", get(mail::get_stats));

    let mail_write = Router::new()
        .route("/mail/emails", post(mail::send_email))
        .route("/mail/emails/{id}/read", post(mail::mark_as_read))
        // 批量重发历史邮件（可能覆盖他人邮件）→ 管理类
        .route("/mail/emails/resend", admin_only(post(mail::resend_emails)))
        .route("/mail/emails/{id}", delete(mail::delete_email));

    // 合并所有路由（Db 作为 state；租户中间件仍使用原生池），build_application 自动加 auth/rate_limit/CORS/Prometheus/telemetry
    let protected_routes = Router::new()
        .merge(notification_read)
        .merge(notification_write)
        .merge(im_read)
        .merge(im_write)
        .merge(mail_read)
        .merge(mail_write)
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        // 个人类路由仅需认证；管理类路由在各自的 MethodRouter 上挂 admin_only。
        .with_state(db.clone());

    let public_routes = Router::new().route("/health", get(health_handler));

    let app = build_application(&ctx, &config, public_routes, protected_routes, None);

    run(app).await?;
    Ok(())
}

async fn health_handler() -> &'static str {
    "ok"
}
