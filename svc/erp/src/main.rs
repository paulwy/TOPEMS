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
mod event_handlers;
mod models;
mod sagas;
mod schema_defense;
mod services;
mod shared;
mod utils;

pub mod modules;

use anyhow::Result;
use prometheus::{register_int_counter, register_int_gauge, IntCounter, IntGauge};
use std::env;
use std::sync::Arc;
use std::time::Duration;
use utoipa::OpenApi;

use modules::ApiState;
use topems_shared::LocalInMemoryCache as InMemoryCache;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, create_health_state, create_standard_health_routes, run,
    ServiceConfig,
};
use topems_shared_service_client::notification::NotificationServiceClient;
use topems_shared_service_client::service_client::{
    api::finance_api::FinanceApi, api::hrm_api::HrmApi, TypedServiceClient,
};

lazy_static::lazy_static! {
    pub static ref ASSET_COUNT: IntGauge = register_int_gauge!("topems_erp_asset_count", "Total number of assets in ERP system").expect("Failed to register asset_count gauge - check for duplicate metric registrations");
    pub static ref VOUCHER_COUNT: IntGauge = register_int_gauge!("topems_erp_voucher_count", "Total number of vouchers in ERP system").expect("Failed to register voucher_count gauge - check for duplicate metric registrations");
    pub static ref FINANCIAL_TRANSACTION_COUNT: IntCounter = register_int_counter!("topems_erp_financial_transactions_total", "Total number of financial transactions").expect("Failed to register financial_transactions counter - check for duplicate metric registrations");
    pub static ref ACTIVE_USERS: IntGauge = register_int_gauge!("topems_erp_active_users", "Number of active users in the last hour").expect("Failed to register active_users gauge - check for duplicate metric registrations");
    pub static ref API_REQUESTS_TOTAL: IntCounter = register_int_counter!("topems_erp_api_requests_total", "Total number of API requests").expect("Failed to register api_requests counter - check for duplicate metric registrations");
}

#[tokio::main]
async fn main() -> Result<()> {
    std::env::set_var("SEARCH_PATH", "erp, public");

    let config = ServiceConfig {
        name: "topems-erp",
        port: 8010,
        port_env_var: Some("ERP_PORT"),
        max_db_connections: 20,
        enable_events: true,
        api_prefix: "/api/erp",
        legacy_prefixes: &["/api/v1/erp"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;

    // 数据库初始化
    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    // 事件订阅者（失败不阻塞启动）
    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ ERP 事件订阅者启动失败: {}", e);
    }

    // 后台业务指标更新
    let pool_clone = ctx.db.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            update_business_metrics(&pool_clone).await;
        }
    });

    // 初始化加密服务
    let encryption_service = topems_shared::init_encryption_from_env();
    tracing::info!("🔐 字段加密服务初始化成功");

    // 通知服务客户端
    let notification_service_url = env::var("NOTIFICATION_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let notification_client = Arc::new(NotificationServiceClient::with_base_url(
        notification_service_url,
    ));

    // HRM 服务客户端
    let hrm_client = TypedServiceClient::<HrmApi>::from_env_default()
        .map(Arc::new)
        .unwrap_or_else(|e| {
            tracing::warn!("HRM服务客户端初始化失败: {}, 将使用mock模式", e);
            let default_url = "http://localhost:8020".to_string();
            Arc::new(
                TypedServiceClient::new(HrmApi, default_url).unwrap_or_else(|e| {
                    tracing::error!("默认HRM客户端创建失败: {}", e);
                    panic!("HRM客户端创建失败，请检查HRM服务配置")
                }),
            )
        });

    // Finance 服务客户端
    let finance_client = TypedServiceClient::<FinanceApi>::from_env_default()
        .map(Arc::new)
        .unwrap_or_else(|e| {
            tracing::warn!("Finance服务客户端初始化失败: {}, 将使用mock模式", e);
            let default_url = "http://localhost:8011".to_string();
            Arc::new(
                TypedServiceClient::new(FinanceApi, default_url).unwrap_or_else(|e| {
                    tracing::error!("默认Finance客户端创建失败: {}", e);
                    panic!("Finance客户端创建失败，请检查Finance服务配置")
                }),
            )
        });

    let api_state = ApiState {
        db: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: ctx.metrics.clone(),
        start_time: ctx.start_time,
        dict_cache: Arc::new(InMemoryCache::new(Duration::from_secs(600))),
        notification_client,
        hrm_client,
        encryption: Arc::new(encryption_service),
        event_publisher: ctx.event_publisher.clone(),
        finance_client,
    };

    // 标准健康检查路由（使用 BootstrapAppState）
    let health_state = create_health_state(&ctx, &config);
    let public_routes = create_standard_health_routes(health_state);

    // 业务路由
    let protected_routes = modules::create_routes().with_state(api_state);

    // OpenAPI 文档
    let openapi_json = Some(
        serde_json::to_string_pretty(&modules::openapi::ErpApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // 启动时自动注册到统一核心
    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::erp_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await
}

async fn update_business_metrics(pool: &sqlx::PgPool) {
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM assets")
        .fetch_one(pool)
        .await
    {
        Ok(count) => ASSET_COUNT.set(count),
        Err(e) => tracing::warn!("Failed to update asset count: {}", e),
    }

    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM financial_vouchers")
        .fetch_one(pool)
        .await
    {
        Ok(count) => VOUCHER_COUNT.set(count),
        Err(e) => tracing::warn!("Failed to update voucher count: {}", e),
    }

    match sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM audit_logs 
         WHERE created_at >= NOW() - INTERVAL '1 hour'",
    )
    .fetch_one(pool)
    .await
    {
        Ok(count) => ACTIVE_USERS.set(count),
        Err(e) => tracing::warn!("Failed to update active users: {}", e),
    }
}

async fn init_db(pool: &sqlx::PgPool) -> Result<()> {
    // V32.0 AC-5: 本地主数据引用表，用于跨服务 master_data_id 关联
    // 消费端通过 master_data_id 查找本地业务记录，而非依赖业务编码
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS erp_master_data_refs (
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
    tracing::info!("[erp] erp_master_data_refs 表已就绪（AC-5 本地主数据引用）");

    // Schema 防御：增量迁移 + 一致性自检
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[erp] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}
