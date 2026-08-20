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
use sqlx::PgPool;

mod conversion_rules;
mod event_bus;
mod event_handlers;
mod handlers;
mod mes_erp_sync;
mod mes_qms_integration;
mod models;
mod openapi;
mod plugin;
mod qms_lims_ehs;
mod retry_handler;
mod routes;
mod rule_engine;
mod schema_defense;
mod sync_retry;

use axum::{routing::get, Router};
use axum_prometheus::PrometheusMetricLayer;
use conversion_rules::init_conversion_rules_table;
use mes_erp_sync::MesErpSyncService;
use models::AppState;
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::logging::request_context_middleware;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "integration, public");

    let config = ServiceConfig {
        name: "topems-integration",
        port: 8072,
        port_env_var: Some("INTEGRATION_PORT"),
        max_db_connections: 5,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/integration",
        legacy_prefixes: &["/api/v1/integration"],
    };

    let ctx = bootstrap_service(&config).await?;

    // 业务初始化：表 + 事件订阅者
    if let Err(e) = init_database(&ctx.db).await {
        tracing::warn!("⚠️ Database initialization warning: {}", e);
    }
    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ Integration 事件订阅者启动失败: {}", e);
    }

    let lims_url =
        std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string());
    let qms_url =
        std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string());
    let mes_url =
        std::env::var("MES_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8030".to_string());
    let erp_url =
        std::env::var("ERP_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());
    let wms_url =
        std::env::var("WMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8041".to_string());
    let scm_url =
        std::env::var("SCM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let app_state = AppState {
        pool: ctx.db.clone(),
        lims_url,
        qms_url,
        mes_url: mes_url.clone(),
        erp_url: erp_url.clone(),
        wms_url,
        scm_url,
        auth_state: ctx.auth_state.clone(),
        mes_erp_sync_service: std::sync::Arc::new(MesErpSyncService::new(
            ctx.db.clone(),
            mes_url,
            erp_url,
        )),
    };

    // 业务路由（内部已完成 with_state + auth/rls/rate_limit/cors/telemetry/nest/legacy）
    let business_router = routes::create_routes(app_state);

    // 补 Prometheus layer + /metrics 路由（/health 已由 business_router 提供）
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_router = Router::new().route(
        "/metrics",
        get(move || async move { metric_handle.render() }),
    );

    let final_router = Router::new()
        .merge(business_router)
        .merge(metrics_router)
        .layer(axum::middleware::from_fn(request_context_middleware))
        .layer(prometheus_layer);

    let app = Application {
        router: final_router,
        port: resolve_port(&config),
        name: config.name,
    };

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    if let Err(e) = init_conversion_rules_table(pool).await {
        tracing::warn!("init_conversion_rules_table warning: {}", e);
    }
    if let Err(e) = mes_qms_integration::init_mes_qms_tables(pool).await {
        tracing::warn!("init_mes_qms_tables warning: {}", e);
    }
    if let Err(e) = init_sync_tables(pool).await {
        tracing::warn!("init_sync_tables warning: {}", e);
    }

    // V69.3 Schema 防御：增量迁移 + 一致性自检（8 表）
    if let Err(e) = schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[integration] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}

/// 初始化通用跨服务同步任务表（从 unified-core 迁移而来）
async fn init_sync_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_inter_module_sync (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            sync_type VARCHAR(64) NOT NULL,
            source_module VARCHAR(64) NOT NULL,
            target_module VARCHAR(64) NOT NULL,
            source_entity VARCHAR(128) NOT NULL,
            source_id UUID,
            source_code VARCHAR(128),
            status VARCHAR(32) DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            error_message TEXT,
            next_retry_at TIMESTAMP,
            executed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_inter_module_sync_status ON core_inter_module_sync(status)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_inter_module_sync_tenant ON core_inter_module_sync(tenant_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_inter_module_sync_source ON core_inter_module_sync(source_module)",
    )
    .execute(pool)
    .await?;

    Ok(())
}
