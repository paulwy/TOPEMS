use axum::{routing::delete, routing::get, routing::post, routing::put, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use topems_shared_boundary::only_own_schema_query;

mod im;
mod im_location;
mod mail;
mod models;
mod notification;
pub mod openapi;
mod schema_defense;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "communication, public");

    let config = ServiceConfig {
        name: "topems-communication",
        port: 8084,
        port_env_var: Some("COMMUNICATION_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: false,
        enable_request_context: true,
        api_prefix: "/api/communication",
        legacy_prefixes: &["/api/core/comm", "/api/core/notification"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    // 初始化数据库表
    if let Err(e) = init_database(&ctx.db).await {
        tracing::warn!("Database initialization warning: {}", e);
    }

    // 初始化位置与地理围栏表
    if let Err(e) = im_location::register_geofence_tables(&ctx.db).await {
        tracing::warn!("Geofence table initialization warning: {}", e);
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
        );

    // ===== 通知写入路由（需要认证） =====
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
                .route("/locations/geofences", post(im_location::create_geofence))
                .route(
                    "/locations/geofences/{id}",
                    put(im_location::update_geofence),
                )
                .route(
                    "/locations/geofences/{id}",
                    delete(im_location::delete_geofence),
                )
                .route("/pois/search", post(im_location::unified_search_pois)),
        );

    // ===== 邮件路由（需要认证） =====
    let mail_read = Router::new()
        .route("/mail/emails", get(mail::list_emails))
        .route("/mail/emails/{id}", get(mail::get_email))
        .route("/mail/templates", get(mail::list_templates))
        .route("/mail/templates/{id}", get(mail::get_template));

    let mail_write = Router::new()
        .route("/mail/emails", post(mail::send_email))
        .route("/mail/emails/{id}/read", post(mail::mark_as_read))
        .route("/mail/templates", post(mail::create_template))
        .route("/mail/templates/{id}", put(mail::update_template))
        .route("/mail/templates/{id}/send", post(mail::send_with_template))
        .route("/mail/emails/{id}", delete(mail::delete_email));

    // 合并所有路由（PgPool 作为 state），build_application 自动加 auth/rate_limit/CORS/Prometheus/telemetry
    let protected_routes = Router::new()
        .merge(notification_read)
        .merge(notification_write)
        .merge(im_read)
        .merge(im_write)
        .merge(mail_read)
        .merge(mail_write)
        .layer(axum::middleware::from_fn(require_permission(
            "communication:admin",
        )))
        .with_state(ctx.db.clone());

    let public_routes = Router::new().route("/health", get(health_handler));

    let app = build_application(&ctx, &config, public_routes, protected_routes, None);

    run(app).await?;
    Ok(())
}

async fn health_handler() -> &'static str {
    "ok"
}

/// 初始化数据库表
async fn init_database(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    // 通知表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title VARCHAR(256) NOT NULL,
            content TEXT,
            notification_type VARCHAR(64) DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            priority INTEGER DEFAULT 0,
            data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            read_at TIMESTAMP,
            is_archived BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP
        )
        "#
    ))
    .execute(pool)
    .await?;

    // 通知模板表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_notification_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            title_template VARCHAR(256) NOT NULL,
            content_template TEXT NOT NULL,
            notification_type VARCHAR(64) DEFAULT 'info',
            description TEXT,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#
    ))
    .execute(pool)
    .await?;

    // IM 聊天室表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_rooms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128),
            room_type VARCHAR(32) DEFAULT 'private',
            creator_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    // IM 成员表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_members (
            room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
            user_id UUID NOT NULL,
            role VARCHAR(32) DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (room_id, user_id)
        )
        "#
    ))
    .execute(pool)
    .await?;

    // IM 消息表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
            sender_id UUID NOT NULL,
            sender_name VARCHAR(128),
            message_type VARCHAR(32) DEFAULT 'text',
            content TEXT NOT NULL,
            file_url VARCHAR(512),
            is_recalled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    // 邮件表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_emails (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_email TEXT NOT NULL,
            to_email TEXT NOT NULL,
            subject VARCHAR(512),
            body TEXT,
            html_body TEXT,
            cc TEXT[],
            bcc TEXT[],
            is_read BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP,
            read_at TIMESTAMP,
            deleted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#
    ))
    .execute(pool)
    .await?;

    // 邮件模板表
    sqlx::query(only_own_schema_query!(
        "communication",
        r#"
        CREATE TABLE IF NOT EXISTS core_email_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            subject_template VARCHAR(512) NOT NULL,
            body_template TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#
    ))
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query(only_own_schema_query!(
        "communication",
        "CREATE INDEX IF NOT EXISTS idx_core_notifications_user ON core_notifications(user_id)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "communication",
        "CREATE INDEX IF NOT EXISTS idx_core_chat_rooms_members ON core_chat_members(user_id)"
    ))
    .execute(pool)
    .await?;
    sqlx::query(only_own_schema_query!(
        "communication",
        "CREATE INDEX IF NOT EXISTS idx_core_chat_messages_room ON core_chat_messages(room_id)"
    ))
    .execute(pool)
    .await?;

    tracing::info!("Communication database tables initialized");

    // V69.3 Schema 防御：增量迁移 + 一致性自检（9 表）
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[communication] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}
