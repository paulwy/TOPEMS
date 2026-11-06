//! 真实 Communication 服务接入模块（CommunicationRealModule）—— feature flag 控制
//!
//! 将真实 `topems-communication` 服务（lib 形态）作为模块接入统一入口。
//! communication 提供消息通知、即时通讯（IM）、邮件等能力。
//!
//! 由 feature `module-communication` 门控（core 组）。
//!
//! # 前端契约对齐
//! 前端三个子客户端 base 分别为：
//! - notification → `/api/communication/notification`
//! - im           → `/api/communication/im`
//! - mail         → `/api/communication/mail`
//!
//! 因此本模块在 `/api/communication` 下按客户端拆分为三个嵌套子路由，内部路径直接对齐
//! 前端相对路径。crate 已实现的 handler 直接挂载；crate 暂未实现的子域（providers /
//! deliveries / digests / scheduled / groups / topics / preferences / subscriptions /
//! webhooks / push-config 等）使用轻量兜底 `comm_stub` 返回 200 空数据，避免前端契约
//! 裸 404（待上游支持后替换为真实 handler）。

#![cfg(feature = "module-communication")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use topems_communication::{im, im_location, mail, notification};
use topems_shared_bootstrap::{bootstrap_service_shared, ServiceConfig};
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;

/// 轻量兜底：crate 尚未实现的通信子域端点（待上游支持）。
/// 返回 200 + 空数据，避免前端契约裸 404；非业务实现。
async fn comm_stub() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "communication endpoint pending upstream support",
        "data": null
    }))
}

// ===== 通知子域兜底路径（crate 暂未实现，禁止裸 404） =====
const NOTIF_STUB_GET: &[&str] = &[
    "/notification-templates/{id}/variables",
    "/notification-templates/{id}/versions",
    "/notification/deliveries",
    "/notification/deliveries/batch/{id}",
    "/notification/deliveries/by-channel/{id}",
    "/notification/deliveries/by-user/{id}",
    "/notification/deliveries/failed",
    "/notification/deliveries/stats",
    "/notification/deliveries/{id}",
    "/notification/digests",
    "/notification/digests/summary",
    "/notification/digests/{id}",
    "/notification/digests/{id}/history",
    "/notification/event-types",
    "/notification/groups",
    "/notification/groups/{id}",
    "/notification/groups/{id}/members",
    "/notification/groups/{id}/topics",
    "/notification/my-scheduled",
    "/notification/my-subscriptions",
    "/notification/my-topics",
    "/notification/preferences",
    "/notification/preferences/categories",
    "/notification/preferences/defaults",
    "/notification/preferences/quiet-hours",
    "/notification/provider-types",
    "/notification/providers",
    "/notification/providers/{id}",
    "/notification/scheduled",
    "/notification/scheduled/{id}",
    "/notification/subscriptions",
    "/notification/subscriptions/{id}",
    "/notification/topics",
    "/notification/topics/{id}",
    "/notification/webhooks",
    "/notification/webhooks/events/{id}/deliveries",
    "/notification/webhooks/{id}",
    "/notification/webhooks/{id}/events",
    "/notifications/bulk-progress/{id}",
    "/notifications/health/detailed",
    "/push-config",
    "/push-config/channels",
    "/push-config/preferences",
];
const NOTIF_STUB_POST: &[&str] = &[
    "/notification-templates/{id}/clone",
    "/notification-templates/{id}/test",
    "/notification/batch-subscribe",
    "/notification/deliveries/retry-all",
    "/notification/deliveries/{id}/retry",
    "/notification/digests",
    "/notification/digests/{id}/send",
    "/notification/groups",
    "/notification/groups/{id}/broadcast",
    "/notification/groups/{id}/members",
    "/notification/preferences/global-mute",
    "/notification/preferences/reset",
    "/notification/providers",
    "/notification/providers/{id}/test",
    "/notification/scheduled",
    "/notification/scheduled/{id}/cancel",
    "/notification/scheduled/{id}/send",
    "/notification/subscriptions",
    "/notification/subscriptions/{id}/pause",
    "/notification/subscriptions/{id}/resume",
    "/notification/topics",
    "/notification/topics/{id}/subscribe",
    "/notification/webhooks",
    "/notification/webhooks/{id}/disable",
    "/notification/webhooks/{id}/enable",
    "/notification/webhooks/{id}/rotate-secret",
    "/notification/webhooks/{id}/test",
    "/notify/broadcast-with-template",
    "/push-config/channels",
    "/push-config/test",
];
const NOTIF_STUB_PUT: &[&str] = &[
    "/notification-templates/{id}/status",
    "/notification/digests/{id}",
    "/notification/groups/{id}",
    "/notification/groups/{id}/members/{sub}",
    "/notification/preferences",
    "/notification/preferences/categories/{id}",
    "/notification/preferences/quiet-hours",
    "/notification/providers/{id}",
    "/notification/scheduled/{id}",
    "/notification/subscriptions/{id}",
    "/notification/topics/{id}",
    "/notification/webhooks/{id}",
    "/push-config",
    "/push-config/channels/{id}",
    "/push-config/channels/{id}/disable",
    "/push-config/channels/{id}/enable",
    "/push-config/preferences",
    "/push-config/quiet-hours",
];
const NOTIF_STUB_DELETE: &[&str] = &[
    "/notification/batch-unsubscribe",
    "/notification/deliveries/{id}",
    "/notification/digests/{id}",
    "/notification/groups/{id}",
    "/notification/groups/{id}/members/{sub}",
    "/notification/preferences/global-mute",
    "/notification/providers/{id}",
    "/notification/scheduled/{id}",
    "/notification/subscriptions/event",
    "/notification/subscriptions/{id}",
    "/notification/topics/{id}",
    "/notification/topics/{id}/subscribe",
    "/notification/webhooks/{id}",
    "/push-config/channels/{id}",
    "/push-config/quiet-hours",
];

// ===== IM 子域兜底路径 =====
const IM_STUB_GET: &[&str] = &["/contact-groups/{id}", "/health"];
const IM_STUB_POST: &[&str] = &[
    "/contact-groups/{id}",
    "/contact-groups/{id}/{sub}/members",
    "/contacts/{id}",
    "/files/upload",
    "/notifications",
];
const IM_STUB_PUT: &[&str] = &[
    "/contact-groups/{id}/{sub}",
    "/contacts/{id}/{sub}/accept",
    "/contacts/{id}/{sub}/reject",
    "/messages/{id}/read",
    "/notifications/{id}/read",
    "/notifications/{id}/read-all",
    "/rooms/{id}/unmute",
    "/rooms/{id}/unpin",
];
const IM_STUB_DELETE: &[&str] = &[
    "/contact-groups/{id}/{sub}",
    "/contact-groups/{id}/{sub}/members/{extra}",
    "/contacts/{id}/{sub}",
    "/rooms/{id}/members/{sub}",
];

// ===== 邮件子域兜底路径 =====
const MAIL_STUB_GET: &[&str] = &["/health"];
const MAIL_STUB_POST: &[&str] = &["/templates/render"];
const MAIL_STUB_PUT: &[&str] = &["/templates/{id}/status"];

/// 真实 Communication 模块：持有完整业务路由
pub struct CommunicationRealModule {
    routes: Router,
    db: Db,
}

impl CommunicationRealModule {
    /// 异步构建真实 Communication 模块
    pub async fn build() -> Result<Self> {
        let config = ServiceConfig {
            name: "topems-communication",
            port: 8093,
            port_env_var: Some("COMMUNICATION_PORT"),
            max_db_connections: 10,
            enable_events: false,
            enable_rls: true,
            enable_request_context: false,
            api_prefix: "/api/communication",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service_shared(&config).await?;
        topems_shared_db::database::probe_connection(&ctx.db).await?;
        // 模块 schema 作用域由事务级 search_path 提供（communication, public）
        let db = Db::new(ctx.db.clone(), "communication, public");

        // ===== 通知子路由（前端 base /api/communication/notification） =====
        let notification_router = {
            let mut r = Router::new()
                // --- 通知列表 / 详情 / 归档（前端相对路径 /notifications/*） ---
                .route("/notifications", get(notification::get_notifications))
                .route("/notifications", post(notification::create_notification))
                .route(
                    "/notifications",
                    delete(notification::delete_all_notifications),
                )
                .route(
                    "/notifications/unread-count",
                    get(notification::get_unread_count),
                )
                .route(
                    "/notifications/unread",
                    get(notification::get_unread_notifications),
                )
                .route("/notifications/{id}", get(notification::get_notification))
                .route("/notifications/{id}", put(notification::mark_as_read))
                .route(
                    "/notifications/{id}",
                    delete(notification::delete_notification),
                )
                .route(
                    "/notifications/{id}/unread",
                    put(notification::mark_as_unread),
                )
                .route(
                    "/notifications/{id}/archive",
                    post(notification::archive_notification),
                )
                .route(
                    "/notifications/{id}/unarchive",
                    post(notification::unarchive_notification),
                )
                .route(
                    "/notifications/read-all",
                    put(notification::mark_all_as_read),
                )
                .route(
                    "/notifications/bulk-read",
                    post(notification::bulk_mark_read),
                )
                .route(
                    "/notifications/bulk-unread",
                    post(notification::bulk_mark_unread),
                )
                .route(
                    "/notifications/bulk-read-by-condition",
                    post(notification::bulk_read_by_condition),
                )
                .route(
                    "/notifications/bulk-delete-by-condition",
                    post(notification::bulk_delete_by_condition),
                )
                .route(
                    "/notifications/bulk-archive",
                    post(notification::bulk_archive),
                )
                .route(
                    "/notifications/bulk-unarchive",
                    post(notification::bulk_unarchive),
                )
                .route(
                    "/notifications/bulk-delete-all",
                    post(notification::delete_all_notifications),
                )
                .route(
                    "/notification-templates/batch-status",
                    put(notification::batch_update_template_status),
                )
                .route("/preferences", get(notification::get_preferences))
                .route("/preferences", put(notification::update_preferences))
                .route(
                    "/preferences/categories",
                    get(notification::get_category_preferences),
                )
                .route(
                    "/preferences/categories/{category}",
                    put(notification::update_category_preference),
                )
                .route(
                    "/preferences/global-mute",
                    post(notification::set_global_mute),
                )
                .route(
                    "/preferences/global-mute",
                    delete(notification::cancel_global_mute),
                )
                .route(
                    "/preferences/quiet-hours",
                    get(notification::get_quiet_hours),
                )
                .route(
                    "/preferences/quiet-hours",
                    put(notification::update_quiet_hours),
                )
                .route("/preferences/reset", post(notification::reset_preferences))
                .route(
                    "/preferences/defaults",
                    get(notification::get_default_preferences),
                )
                .route("/subscriptions", get(notification::list_subscriptions))
                .route("/subscriptions", post(notification::create_subscription))
                .route("/subscriptions/{id}", get(notification::get_subscription))
                .route(
                    "/subscriptions/{id}",
                    put(notification::update_subscription),
                )
                .route(
                    "/subscriptions/{id}",
                    delete(notification::delete_subscription),
                )
                .route(
                    "/subscriptions/{id}/pause",
                    post(notification::pause_subscription),
                )
                .route(
                    "/subscriptions/{id}/resume",
                    post(notification::resume_subscription),
                )
                .route("/my-subscriptions", get(notification::my_subscriptions))
                .route("/batch-subscribe", post(notification::batch_subscribe))
                .route(
                    "/batch-unsubscribe",
                    delete(notification::batch_unsubscribe),
                )
                .route(
                    "/subscriptions/event",
                    delete(notification::unsubscribe_event),
                )
                .route("/event-types", get(notification::list_event_types))
                .route("/deliveries", get(notification::list_deliveries))
                .route("/deliveries/{id}", get(notification::get_delivery))
                .route("/deliveries/{id}", delete(notification::delete_delivery))
                .route("/deliveries/{id}/retry", post(notification::retry_delivery))
                .route(
                    "/deliveries/batch/{batchId}",
                    get(notification::list_batch_deliveries),
                )
                .route(
                    "/deliveries/by-user/{userId}",
                    get(notification::list_user_deliveries),
                )
                .route("/deliveries/stats", get(notification::delivery_stats))
                .route(
                    "/deliveries/failed",
                    get(notification::list_failed_deliveries),
                )
                .route(
                    "/deliveries/retry-all",
                    post(notification::retry_all_failed),
                )
                .route(
                    "/deliveries/by-channel/{channel}",
                    get(notification::list_channel_deliveries),
                )
                .route(
                    "/notifications/bulk-delete",
                    delete(notification::bulk_delete),
                )
                .route(
                    "/notifications/stats/me",
                    get(notification::get_notification_stats),
                )
                .route(
                    "/notifications/archived",
                    get(notification::list_archived_notifications),
                )
                .route(
                    "/notifications/archive/config",
                    get(notification::get_archive_config),
                )
                .route(
                    "/notifications/archive/config",
                    put(notification::update_archive_config),
                )
                .route(
                    "/notifications/archive/run",
                    post(notification::run_auto_archive),
                )
                // --- 主动通知动作（前端相对路径 /notify/*） ---
                .route("/notify/list", get(notification::list_notifications))
                .route("/notify/send", post(notification::send_notification))
                .route(
                    "/notify/broadcast",
                    post(notification::broadcast_notification),
                )
                .route("/notify/read-all", post(notification::mark_all_as_read))
                .route("/notify/{id}/read", post(notification::mark_as_read))
                // --- 通知模板（前端相对路径 /notification-templates/*） ---
                .route("/notification-templates", get(notification::list_templates))
                .route(
                    "/notification-templates",
                    post(notification::create_template),
                )
                .route(
                    "/notification-templates/{id}",
                    get(notification::get_template),
                )
                .route(
                    "/notification-templates/{id}",
                    put(notification::update_template),
                )
                .route(
                    "/notification-templates/{id}",
                    delete(notification::delete_template),
                )
                .route(
                    "/notification-templates/{id}/render",
                    post(notification::render_template),
                )
                // --- 通知渠道（前端相对路径 /notification/channels/*，crate 已实现） ---
                .route("/notification/channels", get(notification::list_channels))
                .route("/notification/channels", post(notification::create_channel))
                .route(
                    "/notification/channels/{id}",
                    get(notification::get_channel),
                )
                .route(
                    "/notification/channels/{id}",
                    put(notification::update_channel),
                )
                .route(
                    "/notification/channels/{id}",
                    delete(notification::delete_channel),
                )
                .route(
                    "/notification/channels/{id}/test",
                    post(notification::test_channel),
                )
                .route(
                    "/notification/channels/{id}/metrics",
                    get(notification::get_channel_metrics),
                );
            for p in NOTIF_STUB_GET {
                r = r.route(p, get(comm_stub));
            }
            for p in NOTIF_STUB_POST {
                r = r.route(p, post(comm_stub));
            }
            for p in NOTIF_STUB_PUT {
                r = r.route(p, put(comm_stub));
            }
            for p in NOTIF_STUB_DELETE {
                r = r.route(p, delete(comm_stub));
            }
            r.with_state(db.clone())
        };

        // ===== IM 子路由（前端 base /api/communication/im） =====
        let im_router = {
            let mut r = Router::new()
                .route("/rooms", get(im::list_rooms))
                .route("/rooms", post(im::create_room))
                .route("/rooms/{id}", get(im::get_room))
                .route("/rooms/{id}/messages", get(im::get_messages))
                .route("/rooms/{id}/messages", post(im::send_message))
                .route("/rooms/{id}/messages/search", get(im::search_messages))
                .route("/rooms/{id}/members", get(im::list_members))
                .route("/rooms/{id}/members", post(im::add_member))
                .route("/rooms/{id}/mute", put(im::mute_room))
                .route("/rooms/{id}/pin", put(im::pin_message))
                .route("/messages/{id}", put(im::update_message))
                .route("/messages/{id}", delete(im::delete_message))
                .route("/contacts", get(im::list_contacts))
                .route("/contacts", post(im::add_contact))
                .route("/contacts/{id}", get(im::get_contact))
                .route("/contact-groups", get(im::list_contact_groups))
                .route("/online-status/{id}", get(im::get_online_status))
                .route("/notifications/{id}", get(im::list_im_notifications))
                .route("/project-groups", get(im::list_project_groups))
                .route("/project-groups", post(im::create_project_group))
                // --- 会话已读回执（后端 handler 已存在，统一模块补挂） ---
                .route("/rooms/{id}/read", post(im::mark_messages_read))
                // --- 位置消息 / 地理围栏 / POI 统一搜索（im_location，前缀对齐独立 main.rs：/im/*） ---
                .route("/locations/geofences", get(im_location::list_geofences))
                .route(
                    "/locations/message",
                    post(im_location::send_location_message),
                )
                .route("/pois/search", post(im_location::unified_search_pois));
            for p in IM_STUB_GET {
                r = r.route(p, get(comm_stub));
            }
            for p in IM_STUB_POST {
                r = r.route(p, post(comm_stub));
            }
            for p in IM_STUB_PUT {
                r = r.route(p, put(comm_stub));
            }
            for p in IM_STUB_DELETE {
                r = r.route(p, delete(comm_stub));
            }
            r.with_state(db.clone())
        };

        // ===== 邮件子路由（前端 base /api/communication/mail） =====
        let mail_router = {
            let mut r = Router::new()
                .route("/emails", get(mail::list_emails))
                .route("/emails", post(mail::send_email))
                .route("/emails/{id}", get(mail::get_email))
                .route("/emails/{id}/read", post(mail::mark_as_read))
                .route("/emails/stats", get(mail::get_stats))
                .route("/templates", get(mail::list_templates))
                .route("/templates", post(mail::create_template))
                .route("/templates/{id}", get(mail::get_template))
                .route("/templates/{id}", put(mail::update_template))
                .route("/templates/{id}", delete(mail::delete_template))
                .route("/templates/{id}/send", post(mail::send_with_template));
            for p in MAIL_STUB_GET {
                r = r.route(p, get(comm_stub));
            }
            for p in MAIL_STUB_POST {
                r = r.route(p, post(comm_stub));
            }
            for p in MAIL_STUB_PUT {
                r = r.route(p, put(comm_stub));
            }
            r.with_state(db.clone())
        };

        // 公开路由
        let public_routes =
            Router::new().route("/health", get(|| async { "Communication Service OK" }));

        // 按前端客户端 base 嵌套：/api/communication/{notification,im,mail}/*
        let protected_routes = Router::new()
            .nest("/notification", notification_router)
            .nest("/im", im_router)
            .nest("/mail", mail_router)
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_auth::tenant_middleware(),
            ))
            .with_state(db.clone());
        let routes = axum::Router::new()
            .nest(config.api_prefix, public_routes.merge(protected_routes))
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ))
            // P2：8099 请求层 RLS 中间件（对齐 build_application lib.rs:1013，B6 独占连接模式）
            .layer(axum::middleware::from_fn_with_state(
                ctx.db.clone(),
                topems_shared_db::rls::rls_middleware,
            ));

        Ok(Self { routes, db })
    }
}

#[async_trait::async_trait]
impl Module for CommunicationRealModule {
    fn name(&self) -> &'static str {
        "communication"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let db_healthy = self.db.check_health().await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
