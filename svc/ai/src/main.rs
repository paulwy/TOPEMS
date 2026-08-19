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
mod handlers;
mod middleware;
mod models;
mod modules;
mod routes;
mod schema_defense;
mod services;
mod shared;

use crate::models::{
    Config, CHUNKS, CLIENT, CONFIG, CONNECTORS, DIFY_CONFIG, DOCS_DIR, DOCUMENTS, VECTORS,
};
use crate::services::document::DocumentQAConfig;
use crate::services::embedding::{index_all_documents, load_documents_from_dir};

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use reqwest::Client;
use std::sync::{Arc, Mutex};

use services::{
    AnalysisConfig, AnalysisService, Database, DocumentService, MultimodalService, QAConfig,
    QAService, RecommendationService, VectorService,
};
use topems_shared_ai::ai_client::{AIModelConfig, AIProviderType};
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "ai_service, public, shared");

    let config = ServiceConfig {
        name: "topems-ai",
        port: 8013,
        port_env_var: Some("AI_PORT"),
        max_db_connections: 10,
        enable_events: true,
        api_prefix: "/api/ai",
        legacy_prefixes: &["/api/v1/ai", "/api/core/ai/v1"],
        ..Default::default()
    };

    // 注册自定义 Prometheus 指标
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_ai_custom_metric",
        "This is a custom metric for TOPEMS-AI",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!(
            "Prometheus gauge creation failed - this is a startup error, check for duplicate metric registrations"
        )
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    tracing::info!("🚀 TOPEMS-AI 智能知识库服务启动中...");
    tracing::info!("📦 PostgreSQL + pgvector 持久化存储");
    tracing::info!("📄 PDF 文档解析支持");

    // 使用 bootstrap_service 初始化通用资源（telemetry、auth_state、event_publisher）
    let ctx = bootstrap_service(&config).await?;

    // AI 专用 Database（提供 run_migrations 和服务内部状态）
    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL environment variable is required")
    })?;
    tracing::info!(
        "🔌 连接数据库: {}",
        database_url.split('@').next_back().unwrap_or("...")
    );
    let db = Database::new(&database_url).await?;
    tracing::info!("✅ 数据库连接成功");

    if let Err(e) =
        event_handlers::start_event_subscribers(db.pool().clone(), ctx.event_publisher.clone())
            .await
    {
        tracing::warn!("⚠️ AI 事件订阅者启动失败: {}", e);
    }

    // 运行迁移
    db.run_migrations().await?;
    tracing::info!("✅ 数据库表结构已就绪");

    // V69.3 Schema 防御：增量补齐列 + 一致性自检（失败不阻塞启动）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(db.pool()).await {
        tracing::error!("[ai] Schema 防御检查失败: {:?}", e);
    }

    // 读取 AI 配置
    let api_key = std::env::var("OLLAMA_API_KEY")
        .ok()
        .or_else(|| std::env::var("OPENAI_API_KEY").ok());
    let base_url = std::env::var("OLLAMA_URL")
        .or_else(|_| std::env::var("OLLAMA_BASE_URL"))
        .or_else(|_| std::env::var("OPENAI_BASE_URL"))
        .unwrap_or_else(|_| "http://localhost:11434/v1".to_string());
    let model = std::env::var("OLLAMA_MODEL")
        .or_else(|_| std::env::var("OPENAI_MODEL"))
        .unwrap_or_else(|_| "qwen2.5:7b-instruct".to_string());
    let embedding_model =
        std::env::var("EMBEDDING_MODEL").unwrap_or_else(|_| "nomic-embed-text".to_string());
    let use_ollama = std::env::var("OLLAMA_URL").is_ok()
        || std::env::var("OLLAMA_BASE_URL").is_ok()
        || base_url.contains("localhost:11434")
        || base_url.contains("127.0.0.1:11434");
    let model_config = Config {
        api_key: api_key.clone(),
        base_url: base_url.clone(),
        model: model.clone(),
        use_ollama,
        embedding_model: embedding_model.clone(),
    };

    // HTTP 客户端
    let http_client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    // Dify 集成配置（可选：未设置 DIFY_API_KEY 时 DifyService 仍可创建但 is_configured=false）
    let dify_config = {
        let base_url =
            std::env::var("DIFY_BASE_URL").unwrap_or_else(|_| "http://localhost:8180".to_string());
        let api_key = std::env::var("DIFY_API_KEY").unwrap_or_default();
        let default_user =
            std::env::var("DIFY_DEFAULT_USER").unwrap_or_else(|_| "topems-user".to_string());
        let timeout_secs = std::env::var("DIFY_TIMEOUT_SECS")
            .ok()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(120);
        let cfg = crate::models::DifyConfig {
            base_url,
            api_key,
            default_user,
            timeout_secs,
        };
        if !cfg.api_key.is_empty() {
            tracing::info!(
                "✅ Dify 集成已配置 (base_url={}, default_user={}, timeout={}s)",
                cfg.base_url,
                cfg.default_user,
                cfg.timeout_secs
            );
        } else {
            tracing::warn!("⚠️ Dify 集成未启用：缺少 DIFY_API_KEY 环境变量");
        }
        cfg
    };
    let dify_service = crate::services::DifyService::new(http_client.clone(), dify_config.clone());
    DIFY_CONFIG
        .set(dify_config)
        .map_err(|_| anyhow::anyhow!("DIFY_CONFIG already initialized"))?;

    // 创建服务
    let pool = db.pool().clone();
    let vector_service = VectorService::new(db);
    let file_service_url =
        std::env::var("FILE_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let document_service = {
        let qa_config = DocumentQAConfig {
            base_url: base_url.clone(),
            api_key: api_key.clone(),
            model: model.clone(),
        };
        if std::env::var("FILE_SERVICE_URL").is_ok() {
            tracing::info!("🔗 连接 File 服务: {}", file_service_url);
            DocumentService::with_file_client(vector_service.clone(), &file_service_url)
                .with_qa_config(qa_config)
        } else {
            tracing::warn!("⚠️ FILE_SERVICE_URL 未设置，DocumentService 将以兼容模式运行");
            DocumentService::new(vector_service.clone()).with_qa_config(qa_config)
        }
    };

    // 创建 QA 和 Analysis 服务（使用统一 AI 客户端）
    let chat_model_config = AIModelConfig {
        provider: if use_ollama {
            AIProviderType::Ollama
        } else {
            AIProviderType::OpenAI
        },
        model_name: model.clone(),
        base_url: base_url.clone(),
        api_key: api_key.clone(),
        ..Default::default()
    };
    let embedding_model_config = AIModelConfig {
        provider: if use_ollama {
            AIProviderType::Ollama
        } else {
            AIProviderType::OpenAI
        },
        model_name: embedding_model.clone(),
        base_url: if use_ollama {
            base_url.clone().replace("/v1", "/api")
        } else {
            base_url.clone()
        },
        api_key: api_key.clone(),
        ..Default::default()
    };
    let qa_config = QAConfig {
        chat_model: chat_model_config,
        embedding_model: embedding_model_config,
    };
    let qa_service = QAService::new(vector_service.db().clone(), qa_config);
    let analysis_config = AnalysisConfig {
        base_url: base_url.clone(),
        api_key: api_key.clone(),
        model: model.clone(),
    };
    let analysis_service = AnalysisService::new(
        vector_service.db().clone(),
        http_client.clone(),
        analysis_config,
    );

    // 初始化静态存储（向后兼容）
    let docs = load_documents_from_dir(DOCS_DIR).await;
    tracing::info!("📁 加载了 {} 个文件系统文档", docs.len());
    DOCUMENTS
        .set(Arc::new(Mutex::new(docs)))
        .map_err(|_| anyhow::anyhow!("DOCUMENTS already initialized"))?;
    VECTORS
        .set(Arc::new(Mutex::new(Vec::new())))
        .map_err(|_| anyhow::anyhow!("VECTORS already initialized"))?;
    CHUNKS
        .set(Arc::new(Mutex::new(Vec::new())))
        .map_err(|_| anyhow::anyhow!("CHUNKS already initialized"))?;

    // 后台索引文档（向后兼容）
    if std::env::var("DISABLE_AUTO_INDEX").is_err() {
        tokio::spawn(async {
            index_all_documents().await;
        });
    } else {
        tracing::info!("⚠️ 自动文档索引已禁用");
    }

    CLIENT
        .set(http_client.clone())
        .map_err(|_| anyhow::anyhow!("CLIENT already initialized"))?;
    CONFIG
        .set(model_config.clone())
        .map_err(|_| anyhow::anyhow!("CONFIG already initialized"))?;
    CONNECTORS
        .set(Arc::new(Mutex::new(Vec::new())))
        .map_err(|_| anyhow::anyhow!("CONNECTORS already initialized"))?;
    tracing::info!("✅ 数据连接器框架已初始化");

    // 创建 Agent / 推荐 / 多模态服务
    let agent_service = crate::services::AgentService::new(qa_service.clone());
    let recommendation_service =
        RecommendationService::new(vector_service.db().clone(), qa_service.clone());
    let multimodal_service = MultimodalService::new(qa_service.clone());

    // 创建应用状态
    let app_state = crate::shared::AppState {
        auth_state: ctx.auth_state.clone(),
        document_service,
        vector_service,
        qa_service,
        analysis_service,
        agent_service,
        recommendation_service,
        multimodal_service,
        dify_service,
        event_publisher: ctx.event_publisher.clone(),
    };

    // 创建路由（routes::create_routes 处理所有中间件：auth、tenant、rate_limit、cors、prometheus、telemetry）
    let router = crate::routes::create_routes(app_state, pool, prometheus_layer, metric_handle);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::ai_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    tracing::info!(
        "✅ TOPEMS-AI 服务运行在 http://0.0.0.0:{}",
        resolve_port(&config)
    );
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("📊 向量库功能已启用，嵌入模型: {}", embedding_model);
    if use_ollama {
        tracing::info!(
            "✅ 使用 Ollama 本地 AI 服务 (模型: {}, 地址: {}, 超时: 120 秒)",
            model,
            base_url
        );
    } else if api_key.is_some() {
        tracing::info!("✅ 使用云端 AI 服务 (模型: {}, 超时: 120 秒)", model);
    } else {
        tracing::warn!("⚠️ AI API 未配置，请设置 OPENAI_API_KEY 或配置 Ollama");
    }

    run(Application {
        router,
        port: resolve_port(&config),
        name: config.name,
    })
    .await
}
