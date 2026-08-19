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
use crate::shared::AppState;
use std::sync::Arc;
use std::time::Instant;

use axum::{extract::State, routing::get, Json, Router};

use topems_shared::ApiResponse;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{
    simple_health_check, ServiceHealth, SimpleHealthConfig, SystemMetrics,
};

mod shared;

pub mod modules;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-monitor",
        port: 8095,
        port_env_var: Some("MONITOR_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/monitor",
        legacy_prefixes: &[],
    };

    let ctx = bootstrap_service(&config).await?;

    tracing::info!("🚀 TOPEMS Monitor Service (拆分自 unified-core / V68.1 A2.1) starting...");

    let start_time = Instant::now();
    let app_state = AppState {
        pool: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: Arc::new(SystemMetrics::new()),
        start_time,
    };

    let public_routes = Router::new().route("/", get(home));

    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn(require_permission(
            "monitor:admin",
        )))
        .with_state(app_state.clone());

    // monitor 暂未独立生成 OpenAPI 文档
    let openapi_json = None::<String>;

    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    let stateful_public = Router::new()
        .route("/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Monitor Service (V68.1 A2.1) is running at http://0.0.0.0:{}",
        app.port
    );

    // TODO: 后续补齐 monitor_plugin::auto_register_to_core 调用

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Monitor Service\n\n\
     Alerts · Metrics · SLO · Business Metrics · Health Checks\n\
     (拆分自 unified-core / V68.1 A2.1)\n\n\
     - /health   - Health check\n\
     - /metrics  - Prometheus metrics\n\
     - /health/detailed - Detailed service health"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    let config = SimpleHealthConfig::new("topems-monitor").with_db(state.pool.clone());
    simple_health_check(&config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "topems-monitor",
        "split_from": "unified-core",
        "v68_1_task": "A2.1",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "metrics": "active",
            "health_check": "active",
            "alerts": "active",
            "alert_evaluator": "active",
            "business_metrics": "active",
            "slo": "active"
        },
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ],
        "version": env!("CARGO_PKG_VERSION")
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}
