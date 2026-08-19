#![allow(
    unknown_lints,
    renamed_and_removed_lints,
    clippy::should_implement_trait,
    clippy::too_many_arguments,
    clippy::type_complexity,
    clippy::module_inception,
    clippy::manual_clamp,
    clippy::unwrap_or_default,
    clippy::doc_markdown,
    clippy::clone_on_copy,
    clippy::if_same_then_else,
    clippy::inconsistent_digit_grouping,
    clippy::is_digit_ascii_radix,
    clippy::single_range_in_vec_init,
    clippy::needless_range_loop,
    clippy::filter_map_next,
    clippy::unnecessary_lazy_evaluations,
    clippy::get_first,
    clippy::ptr_as_ptr,
    clippy::useless_asref,
    clippy::assigning_clones,
    clippy::write_literal,
    clippy::expect_fun_call,
    clippy::redundant_guards,
    clippy::match_like_matches_macro,
    clippy::redundant_pattern_matching,
    clippy::wildcard_enum_match_arm,
    clippy::same_functions_in_if_condition,
    clippy::unused_peekable,
    clippy::stable_sort_primitive,
    clippy::mut_mut,
    clippy::vec_init_then_push,
    clippy::format_push_string,
    clippy::unused_self,
    clippy::let_unit_value,
    clippy::zero_prefixed_literal,
    clippy::borrow_as_ptr,
    clippy::needless_borrow,
    clippy::needless_late_init,
    clippy::needless_update,
    clippy::needless_pass_by_value,
    clippy::implicit_hasher,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::must_use_candidate,
    clippy::return_self_not_must_use,
    clippy::used_underscore_binding,
    clippy::default_trait_access,
    clippy::equatable_if_let,
    clippy::large_enum_variant,
    clippy::from_over_into,
    clippy::let_and_return,
    clippy::match_bool,
    clippy::match_wild_err_arm,
    clippy::new_without_default,
    clippy::blocks_in_conditions,
    clippy::explicit_iter_loop,
    clippy::explicit_auto_deref,
    clippy::range_plus_one,
    clippy::single_char_add_str,
    clippy::string_add,
    clippy::string_add_assign,
    clippy::option_map_unit_fn,
    clippy::filter_next,
    clippy::iter_not_returning_iterator,
    clippy::from_str_radix_10,
    clippy::naive_bytecount,
    clippy::manual_string_new,
    clippy::flat_map_option,
    clippy::or_fun_call,
    clippy::identity_op,
    clippy::try_err,
    clippy::useless_conversion,
    clippy::uninlined_format_args,
    clippy::trivially_copy_pass_by_ref,
    clippy::nonminimal_bool,
    clippy::derive_partial_eq_without_eq,
    clippy::enum_variant_names,
    clippy::upper_case_acronyms,
    clippy::struct_field_names,
    clippy::needless_arbitrary_self_type,
    clippy::empty_line_after_doc_comments,
    clippy::empty_docs,
    clippy::manual_strip,
    clippy::match_same_arms,
    clippy::unnecessary_wraps,
    clippy::path_buf_push_overwrite,
    clippy::read_zero_byte_vec,
    clippy::redundant_locals,
    clippy::collapsible_match,
    clippy::verbose_file_reads,
    clippy::suboptimal_flops,
    clippy::cast_precision_loss,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap,
    clippy::cast_sign_loss,
    clippy::as_conversions,
    dead_code,
    clippy::never_loop,
    clippy::no_effect_underscore_binding,
    clippy::mixed_case_hex_literals,
    clippy::needless_bitwise_bool,
    clippy::needless_continue,
    clippy::needless_for_each,
    clippy::non_canonical_clone_impl,
    clippy::non_canonical_partial_ord_impl,
    clippy::almost_swapped,
    clippy::cmp_owned,
    clippy::double_parens,
    clippy::float_cmp,
    clippy::float_cmp_const,
    clippy::float_equality_without_abs,
    clippy::inherent_to_string,
    clippy::manual_ok_or,
    clippy::map_entry,
    clippy::map_flatten,
    clippy::match_wildcard_for_single_variants,
    clippy::needless_bool,
    clippy::option_env_unwrap,
    clippy::significant_drop_in_scrutinee,
    clippy::unit_arg,
    clippy::ok_expect,
    clippy::option_option,
    clippy::question_mark,
    clippy::undocumented_unsafe_blocks,
    clippy::unsafe_removed_from_name,
    clippy::verbose_bit_mask,
    clippy::wildcard_imports,
    clippy::unreadable_literal,
    clippy::unseparated_literal_suffix,
    clippy::suspicious_arithmetic_impl,
    clippy::suspicious_op_assign_impl,
    clippy::suspicious_operation_groupings,
    clippy::suspicious_xor_used_as_pow,
    clippy::transmute_ptr_to_ref,
    clippy::too_long_first_doc_paragraph,
    clippy::unnecessary_fallible_conversions,
    clippy::unnecessary_join,
    clippy::unnecessary_struct_initialization,
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::std_instead_of_alloc,
    clippy::std_instead_of_core,
    clippy::alloc_instead_of_core,
    clippy::str_to_string,
    clippy::debug_assert_with_mut_call,
    clippy::error_impl_error,
    clippy::partial_pub_fields,
    clippy::ref_patterns,
    clippy::manual_let_else,
    clippy::manual_find_map,
    clippy::mem_replace_with_default,
    clippy::mem_replace_option_with_none,
    clippy::semicolon_if_nothing_returned,
    clippy::search_is_some,
    clippy::box_collection,
    clippy::box_default,
    clippy::linkedlist,
    clippy::option_if_let_else,
    clippy::partialeq_ne_impl,
    clippy::redundant_clone,
    clippy::use_self,
    clippy::doc_lazy_continuation,
    clippy::checked_conversions,
    clippy::cognitive_complexity,
    clippy::absolute_paths,
    clippy::macro_use_imports,
    clippy::multiple_unsafe_ops_per_block,
    clippy::cloned_ref_to_slice_refs,
    clippy::const_is_empty,
    clippy::explicit_counter_loop,
    clippy::field_reassign_with_default,
    clippy::manual_checked_ops,
    clippy::manual_unwrap_or_default,
    clippy::unnecessary_filter_map,
    clippy::unnecessary_get_then_check,
    clippy::unnecessary_literal_unwrap,
    clippy::unnecessary_sort_by,
    clippy::unnecessary_unwrap,
    clippy::wildcard_in_or_patterns,
    clippy::doc_overindented_list_items,
    clippy::manual_unwrap_or,
    clippy::result_large_err,
    clippy::collapsible_if,
    clippy::manual_contains,
    clippy::unnecessary_cast,
    clippy::useless_format
)]
use axum::{routing::delete, routing::get, routing::post, routing::put, Router};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};

mod im;
mod im_location;
mod mail;
mod models;
mod notification;
pub mod openapi;
mod schema_defense;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

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
            is_archived BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP
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

    // V69.3 Schema 防御：增量迁移 + 一致性自检（9 表）
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[communication] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}
