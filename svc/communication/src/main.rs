use axum::{routing::delete, routing::get, routing::post, routing::put, Router};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use topems_shared::{
    auth_middleware, create_cors_layer, init_telemetry, register_routes_with_legacy_alias,
    AuthState,
};

mod im;
mod mail;
mod models;
mod notification;

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_telemetry("topems-communication");

    tracing::info!("🚀 TOPEMS Communication Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    // 初始化数据库表
    if let Err(e) = init_database(&pool).await {
        tracing::warn!("Database initialization warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let cors = create_cors_layer();

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
        .route("/im/project-groups", get(im::list_project_groups));

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
        .route("/im/project-groups", post(im::create_project_group));

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

    // 合并所有路由并应用认证中间件
    let protected_routes = Router::new()
        .merge(notification_read)
        .merge(notification_write)
        .merge(im_read)
        .merge(im_write)
        .merge(mail_read)
        .merge(mail_write)
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    // 注册路由并添加 legacy 别名
    let api_routes = register_routes_with_legacy_alias(
        Router::new(),
        "/api/communication",
        &["/api/core/comm", "/api/core/notification"],
        protected_routes,
    );

    let app = Router::new()
        .merge(api_routes)
        .route("/health", get(health_handler))
        .layer(cors)
        .with_state(pool);

    let port = std::env::var("COMMUNICATION_PORT")
        .unwrap_or_else(|_| "8084".to_string())
        .parse()
        .unwrap_or(8084);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Communication Service is running at http://{}", addr);
    tracing::info!("📋 API prefix: /api/communication/*");
    tracing::info!("📋 Legacy aliases: /api/core/comm/*, /api/core/notification/*");

    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("Failed to bind to {}: {}", addr, e);
            return;
        }
    };

    if let Err(e) = axum::serve(listener, app.into_make_service()).await {
        tracing::error!("Server error: {}", e);
    }
}

async fn health_handler() -> &'static str {
    "ok"
}

/// 初始化数据库表
async fn init_database(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    // 通知表
    sqlx::query(
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
            is_archived BOOLEAN DEFAULT FALSE
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 通知模板表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_notification_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            title_template VARCHAR(256) NOT NULL,
            content_template TEXT NOT NULL,
            notification_type VARCHAR(64) DEFAULT 'info',
            description TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_by UUID,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // IM 聊天室表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_rooms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128),
            room_type VARCHAR(32) DEFAULT 'private',
            creator_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // IM 成员表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_members (
            room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
            user_id UUID NOT NULL,
            role VARCHAR(32) DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (room_id, user_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // IM 消息表
    sqlx::query(
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
        "#,
    )
    .execute(pool)
    .await?;

    // 邮件表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_emails (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_email VARCHAR(256) NOT NULL,
            to_email VARCHAR(256) NOT NULL,
            subject VARCHAR(512),
            body TEXT,
            html_body TEXT,
            cc TEXT[],
            bcc TEXT[],
            is_read BOOLEAN DEFAULT FALSE,
            is_deleted BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP,
            read_at TIMESTAMP,
            deleted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 邮件模板表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_email_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            subject_template VARCHAR(512) NOT NULL,
            body_template TEXT NOT NULL,
            description TEXT,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 创建索引
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_notifications_user ON core_notifications(user_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_chat_rooms_members ON core_chat_members(user_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_chat_messages_room ON core_chat_messages(room_id)",
    )
    .execute(pool)
    .await?;

    tracing::info!("Communication database tables initialized");
    Ok(())
}
