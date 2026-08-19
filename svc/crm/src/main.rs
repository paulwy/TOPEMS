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
use anyhow::Result;
use axum::{routing::get, Router};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared_service_client::service_client::{
    create_erp_client, create_wms_client, create_workflow_client,
};

mod middleware;
mod models;
mod schema_defense;
mod services;
mod shared;

mod event_handlers;
pub mod modules;

use modules::ApiState;
use topems_shared_auth::middleware::require_permission;

#[tokio::main]
async fn main() -> Result<()> {
    env::set_var("SEARCH_PATH", "crm, public, shared");

    let config = ServiceConfig {
        name: "topems-crm",
        port: 8029,
        port_env_var: Some("CRM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/crm",
        legacy_prefixes: &["/api/v1/crm"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ CRM 事件订阅者启动失败: {}", e);
    }

    let encryption_service = topems_shared::init_encryption_from_env();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 初始化 ERP / WMS 服务客户端（失败不阻塞启动，相关联动功能会优雅降级）
    let erp_client = match create_erp_client() {
        Ok(client) => {
            tracing::info!("🔗 ERP 服务客户端初始化成功");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ ERP 服务客户端初始化失败: {}", e);
            None
        }
    };
    let wms_client = match create_wms_client() {
        Ok(client) => {
            tracing::info!("🔗 WMS 服务客户端初始化成功");
            Some(Arc::new(client))
        }
        Err(e) => {
            tracing::warn!("⚠️ WMS 服务客户端初始化失败: {}", e);
            None
        }
    };

    let workflow_url =
        env::var("WORKFLOW_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = create_workflow_client().expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        encryption: Arc::new(encryption_service),
        event_publisher: ctx.event_publisher.clone(),
        erp_client,
        wms_client,
        workflow_client,
        customer_cache: Arc::new(shared::InMemoryCache::new(Duration::from_secs(3600))),
        dashboard_cache: Arc::new(shared::InMemoryCache::new(Duration::from_secs(300))),
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    // 插件路由（需要 ApiState）
    let plugin_routes = Router::new()
        .route("/plugins/info", get(modules::crm_plugin::get_plugin_info))
        .route(
            "/plugins/health",
            get(modules::crm_plugin::plugin_health_check),
        )
        .with_state(api_state.clone());
    let public_routes = create_standard_health_routes(health_state).merge(plugin_routes);

    // 业务路由（预应用 tenant_middleware，build_application 会叠加 auth + rls + rate_limit）
    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn(require_permission("crm:admin")))
        .with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::CrmApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::crm_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // V32.0 AC-5: 本地主数据引用表，用于跨服务 master_data_id 关联
    // 消费端通过 master_data_id 查找本地业务记录，而非依赖业务编码
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm_master_data_refs (
            master_data_id   VARCHAR(128) PRIMARY KEY,
            tenant_id        UUID NOT NULL,
            domain           VARCHAR(32) NOT NULL,
            code             VARCHAR(128) NOT NULL,
            name             VARCHAR(256),
            status           VARCHAR(32) DEFAULT 'active',
            source_service   VARCHAR(64) NOT NULL,
            local_entity_type VARCHAR(64),
            local_entity_id  UUID,
            payload_snapshot JSONB,
            last_synced_at   TIMESTAMPTZ DEFAULT NOW(),
            created_at       TIMESTAMPTZ DEFAULT NOW(),
            updated_at       TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    tracing::info!("[crm] crm_master_data_refs 表已就绪（AC-5 本地主数据引用）");

    // RFM 客户分群：订单数据表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm.customer_orders (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id    UUID NOT NULL,
            customer_id  UUID,
            order_no     VARCHAR(100),
            order_date   DATE NOT NULL DEFAULT CURRENT_DATE,
            order_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
            status       VARCHAR(20) NOT NULL DEFAULT 'completed',
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    tracing::info!("[crm] customer_orders 表已就绪（RFM 订单数据源）");

    // RFM 客户分群：分析结果缓存表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS crm.rfm_results (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id    UUID NOT NULL,
            customer_id  UUID,
            recency_days INTEGER NOT NULL DEFAULT 0,
            frequency    INTEGER NOT NULL DEFAULT 0,
            monetary     DECIMAL(15,2) NOT NULL DEFAULT 0,
            r_score      INTEGER NOT NULL DEFAULT 0,
            f_score      INTEGER NOT NULL DEFAULT 0,
            m_score      INTEGER NOT NULL DEFAULT 0,
            rfm_score    DECIMAL(10,2) NOT NULL DEFAULT 0,
            segment      VARCHAR(32) NOT NULL DEFAULT 'hibernating',
            analyzed_at  TIMESTAMPTZ DEFAULT NOW(),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    tracing::info!("[crm] rfm_results 表已就绪（RFM 分析结果缓存）");

    // Schema 防御：增量迁移 + 一致性自检
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[crm] Schema 防御检查失败: {:?}", e);
    }
    Ok(())
}
