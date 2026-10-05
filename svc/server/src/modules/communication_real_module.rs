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

use axum::routing::{delete, get, post, put};
use axum::{Json, Router};
use topems_shared_core::error::Result;
use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use topems_communication::{im, mail, notification};
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

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
    "/notification-templates/{p0}/variables",
    "/notification-templates/{p0}/versions",
    "/notification/deliveries",
    "/notification/deliveries/batch/{p0}",
    "/notification/deliveries/by-channel/{p0}",
    "/notification/deliveries/by-user/{p0}",
    "/notification/deliveries/failed",
    "/notification/deliveries/stats",
    "/notification/deliveries/{p0}",
    "/notification/digests",
    "/notification/digests/summary",
    "/notification/digests/{p0}",
    "/notification/digests/{p0}/history",
    "/notification/event-types",
    "/notification/groups",
    "/notification/groups/{p0}",
    "/notification/groups/{p0}/members",
    "/notification/groups/{p0}/topics",
    "/notification/my-scheduled",
    "/notification/my-subscriptions",
    "/notification/my-topics",
    "/notification/preferences",
    "/notification/preferences/categories",
    "/notification/preferences/defaults",
    "/notification/preferences/quiet-hours",
    "/notification/provider-types",
    "/notification/providers",
    "/notification/providers/{p0}",
    "/notification/scheduled",
    "/notification/scheduled/{p0}",
    "/notification/subscriptions",
    "/notification/subscriptions/{p0}",
    "/notification/topics",
    "/notification/topics/{p0}",
    "/notification/webhooks",
    "/notification/webhooks/events/{p0}/deliveries",
    "/notification/webhooks/{p0}",
    "/notification/webhooks/{p0}/events",
    "/notifications/bulk-progress/{p0}",
    "/notifications/health/detailed",
    "/push-config",
    "/push-config/channels",
    "/push-config/preferences",
];
const NOTIF_STUB_POST: &[&str] = &[
    "/notification-templates/{p0}/clone",
    "/notification-templates/{p0}/render",
    "/notification-templates/{p0}/test",
    "/notification/batch-subscribe",
    "/notification/deliveries/retry-all",
    "/notification/deliveries/{p0}/retry",
    "/notification/digests",
    "/notification/digests/{p0}/send",
    "/notification/groups",
    "/notification/groups/{p0}/broadcast",
    "/notification/groups/{p0}/members",
    "/notification/preferences/global-mute",
    "/notification/preferences/reset",
    "/notification/providers",
    "/notification/providers/{p0}/test",
    "/notification/scheduled",
    "/notification/scheduled/{p0}/cancel",
    "/notification/scheduled/{p0}/send",
    "/notification/subscriptions",
    "/notification/subscriptions/{p0}/pause",
    "/notification/subscriptions/{p0}/resume",
    "/notification/topics",
    "/notification/topics/{p0}/subscribe",
    "/notification/webhooks",
    "/notification/webhooks/{p0}/disable",
    "/notification/webhooks/{p0}/enable",
    "/notification/webhooks/{p0}/rotate-secret",
    "/notification/webhooks/{p0}/test",
    "/notify/broadcast-with-template",
    "/push-config/channels",
    "/push-config/test",
];
const NOTIF_STUB_PUT: &[&str] = &[
    "/notification-templates/{p0}/status",
    "/notification/digests/{p0}",
    "/notification/groups/{p0}",
    "/notification/groups/{p0}/members/{p1}",
    "/notification/preferences",
    "/notification/preferences/categories/{p0}",
    "/notification/preferences/quiet-hours",
    "/notification/providers/{p0}",
    "/notification/scheduled/{p0}",
    "/notification/subscriptions/{p0}",
    "/notification/topics/{p0}",
    "/notification/webhooks/{p0}",
    "/push-config",
    "/push-config/channels/{p0}",
    "/push-config/channels/{p0}/disable",
    "/push-config/channels/{p0}/enable",
    "/push-config/preferences",
    "/push-config/quiet-hours",
];
const NOTIF_STUB_DELETE: &[&str] = &[
    "/notification/batch-unsubscribe",
    "/notification/deliveries/{p0}",
    "/notification/digests/{p0}",
    "/notification/groups/{p0}",
    "/notification/groups/{p0}/members/{p1}",
    "/notification/preferences/global-mute",
    "/notification/providers/{p0}",
    "/notification/scheduled/{p0}",
    "/notification/subscriptions/event",
    "/notification/subscriptions/{p0}",
    "/notification/topics/{p0}",
    "/notification/topics/{p0}/subscribe",
    "/notification/webhooks/{p0}",
    "/push-config/channels/{p0}",
    "/push-config/quiet-hours",
];

// ===== IM 子域兜底路径 =====
const IM_STUB_GET: &[&str] = &["/contact-groups/{p0}", "/health"];
const IM_STUB_POST: &[&str] = &[
    "/contact-groups/{p0}",
    "/contact-groups/{p0}/{p1}/members",
    "/contacts/{p0}",
    "/files/upload",
];
const IM_STUB_PUT: &[&str] = &[
    "/contact-groups/{p0}/{p1}",
    "/contacts/{p0}/{p1}/accept",
    "/contacts/{p0}/{p1}/reject",
    "/messages/{p0}/read",
    "/notifications/{p0}/read",
    "/notifications/{p0}/read-all",
    "/rooms/{p0}/unmute",
    "/rooms/{p0}/unpin",
];
const IM_STUB_DELETE: &[&str] = &[
    "/contact-groups/{p0}/{p1}",
    "/contact-groups/{p0}/{p1}/members/{p2}",
    "/contacts/{p0}/{p1}",
    "/rooms/{p0}/members/{p1}",
];

// ===== 邮件子域兜底路径 =====
const MAIL_STUB_GET: &[&str] = &["/health"];
const MAIL_STUB_POST: &[&str] = &["/templates/render"];
const MAIL_STUB_PUT: &[&str] = &["/templates/{p0}/status"];

/// 真实 Communication 模块：持有完整业务路由
pub struct CommunicationRealModule {
    routes: Router,
    pool: sqlx::PgPool,
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
            enable_rls: false,
            enable_request_context: false,
            api_prefix: "/api/communication",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // ===== 通知子路由（前端 base /api/communication/notification） =====
        let notification_router = {
            let mut r = Router::new()
                // --- 通知列表 / 详情 / 归档（前端相对路径 /notifications/*） ---
                .route("/notifications", get(notification::get_notifications))
                .route("/notifications", post(notification::create_notification))
                .route("/notifications", delete(notification::delete_all_notifications))
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
                .route("/notify/broadcast", post(notification::broadcast_notification))
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
            r
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
                .route("/contacts/{id}", get(im::get_contact))
                .route("/contact-groups", get(im::list_contact_groups))
                .route("/online-status/{id}", get(im::get_online_status))
                .route("/notifications/{id}", get(im::list_im_notifications))
                .route("/project-groups", get(im::list_project_groups))
                .route("/project-groups", post(im::create_project_group));
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
            r
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
            r
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
            .with_state(ctx.db.clone());
        let routes = axum::Router::new()
            .nest(config.api_prefix, public_routes.merge(protected_routes))
            .layer(axum::middleware::from_fn_with_state(
                ctx.auth_state.clone(),
                topems_shared_auth::auth::auth_middleware,
            ));

        Ok(Self {
            routes,
            pool: ctx.db,
        })
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
        let db_healthy = sqlx::query("SELECT 1").execute(&self.pool).await.is_ok();

        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
