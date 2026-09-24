//! 真实 Communication 服务接入模块（CommunicationRealModule）—— feature flag 控制
//!
//! 将真实 `topems-communication` 服务（lib 形态）作为模块接入统一入口。
//! communication 提供消息通知、即时通讯（IM）、邮件等能力。
//!
//! 由 feature `module-communication` 门控（core 组）。

#![cfg(feature = "module-communication")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::routing::{delete, get, post, put};
use axum::Router;
use topems_communication::{im, mail, notification};
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

/// 真实 Communication 模块：持有完整业务路由
pub struct CommunicationRealModule {
    routes: Router,
    pool: sqlx::PgPool,
}

impl CommunicationRealModule {
    /// 异步构建真实 Communication 模块
    pub async fn build() -> anyhow::Result<Self> {
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

        // ===== 通知读取路由 =====
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
            .route(
                "/notification/notifications/archive/config",
                get(notification::get_archive_config),
            )
            .route(
                "/notification/notification-templates",
                get(notification::list_templates),
            )
            .route(
                "/notification/notification-templates/{id}",
                get(notification::get_template),
            )
            .route("/notification/channels", get(notification::list_channels))
            .route(
                "/notification/channels/{id}",
                get(notification::get_channel),
            )
            .route(
                "/notification/channels/{id}/metrics",
                get(notification::get_channel_metrics),
            );

        // ===== 通知写入路由 =====
        let notification_write = Router::new()
            .route("/notify/send", post(notification::send_notification))
            .route(
                "/notification/notifications",
                post(notification::create_notification),
            )
            .route(
                "/notify/broadcast",
                post(notification::broadcast_notification),
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
            .route(
                "/notification/notifications/archive/config",
                put(notification::update_archive_config),
            )
            .route(
                "/notification/notifications/archive/run",
                post(notification::run_auto_archive),
            )
            .route(
                "/notification/notification-templates",
                post(notification::create_template),
            )
            .route(
                "/notification/notification-templates/{id}",
                put(notification::update_template),
            )
            .route(
                "/notification/notification-templates/{id}",
                delete(notification::delete_template),
            )
            .route("/notification/channels", post(notification::create_channel))
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
            );

        // ===== IM 核心路由 =====
        let im_routes = Router::new()
            .route("/im/rooms", get(im::list_rooms))
            .route("/im/rooms/{id}", get(im::get_room))
            .route("/im/rooms/{id}/messages", get(im::get_messages))
            .route("/im/rooms/{id}/members", get(im::list_members))
            .route("/im/rooms/search", get(im::search_rooms))
            .route("/im/contacts", get(im::list_contacts))
            .route("/im/rooms", post(im::create_room))
            .route("/im/rooms/{id}/messages", post(im::send_message))
            .route("/im/rooms/{id}/members", post(im::add_member));

        // ===== 邮件核心路由 =====
        let mail_routes = Router::new()
            .route("/mail/emails", get(mail::list_emails))
            .route("/mail/emails/{id}", get(mail::get_email))
            .route("/mail/emails/stats", get(mail::get_stats))
            .route("/mail/templates", get(mail::list_templates))
            .route("/mail/emails", post(mail::send_email))
            .route("/mail/emails/{id}/read", post(mail::mark_as_read))
            .route("/mail/templates", post(mail::create_template));

        // 公开路由
        let public_routes =
            Router::new().route("/health", get(|| async { "Communication Service OK" }));

        // 合并所有路由
        let protected_routes = Router::new()
            .merge(notification_read)
            .merge(notification_write)
            .merge(im_routes)
            .merge(mail_routes)
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
