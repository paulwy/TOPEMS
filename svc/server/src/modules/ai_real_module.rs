//! 真实 AI 服务接入模块（AiRealModule）—— 嵌入模块化单体
//!
//! 复用 topems-ai 独立部署 main.rs 的 AppState 组装链（DocumentService / VectorService /
//! QA / Analysis / Agent / Recommendation / Multimodal / Dify / WorkflowOrchestrator），
//! 由 server 统一提供 HTTP 入口（nest /api/ai）。create_routes 内部已含 auth / tenant /
//! rate_limit / cors / prometheus / telemetry 中间件，此处不再重复挂 server 认证。

#![cfg(feature = "module-ai")]

use crate::module::{Module, ModuleContext, ModuleGroup, ModuleHealth};
use axum::Router;
use axum_prometheus::PrometheusMetricLayer;
use reqwest::Client;
use std::sync::{Arc, Mutex};
use topems_ai::models::{
    Config, CHUNKS, CLIENT, CONFIG, CONNECTORS, DIFY_CONFIG, DOCS_DIR, DOCUMENTS, VECTORS,
};
use topems_ai::services::document::DocumentQAConfig;
use topems_ai::services::embedding::{index_all_documents, load_documents_from_dir};
use topems_ai::services::{
    AnalysisConfig, AnalysisService, Database, DocumentService, MultimodalService, QAConfig,
    QAService, RecommendationService, VectorService,
};
use topems_shared_ai::ai_client::{AIModelConfig, AIProviderType};
use topems_shared_bootstrap::{bootstrap_service, ServiceConfig};

pub struct AiRealModule {
    routes: Router,
    db: sqlx::PgPool,
}

impl AiRealModule {
    /// 异步构建真实 AI 模块（嵌入模式）
    pub async fn build() -> anyhow::Result<Self> {
        std::env::set_var("SEARCH_PATH", "ai, public");

        let config = ServiceConfig {
            name: "topems-ai",
            port: 8013,
            port_env_var: Some("AI_PORT"),
            max_db_connections: 10,
            enable_events: true,
            enable_request_context: false,
            enable_rls: false,
            api_prefix: "/api/ai",
            legacy_prefixes: &[],
            init_telemetry: false,
        };

        let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

        // 通用资源（telemetry、auth_state、event_publisher）
        let ctx = bootstrap_service(&config).await?;
        let _conn = ctx.db.acquire().await?;

        // AI 专用 Database（提供 run_migrations 和服务内部状态）
        let database_url = std::env::var("DATABASE_URL")
            .map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable is required"))?;
        let db = Database::new(&database_url).await?;

        // 迁移 / schema 防御 / ai_knowledge 初始化（失败仅告警不阻塞启动）
        if let Err(e) = db.run_migrations().await {
            tracing::warn!("⚠️ AI 迁移失败（表已存在则跳过）: {}", e);
        }
        if let Err(e) =
            topems_ai::schema_defense::run_schema_migration_and_verify(db.ddl_pool()).await
        {
            tracing::error!("[ai] Schema 防御检查失败: {:?}", e);
        }
        if let Err(e) = topems_ai::modules::ai_knowledge::init_database(db.ddl_pool()).await {
            tracing::error!("[ai] ai_knowledge 初始化失败（知识库表未就绪）: {:?}", e);
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

        // Dify 集成配置（可选）
        let dify_config = {
            let base_url = std::env::var("DIFY_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:8180".to_string());
            let api_key = std::env::var("DIFY_API_KEY").unwrap_or_default();
            let default_user =
                std::env::var("DIFY_DEFAULT_USER").unwrap_or_else(|_| "topems-user".to_string());
            let timeout_secs = std::env::var("DIFY_TIMEOUT_SECS")
                .ok()
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or(120);
            let cfg = topems_ai::models::DifyConfig {
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
        let dify_service =
            topems_ai::services::DifyService::new(http_client.clone(), dify_config.clone());
        let _ = DIFY_CONFIG.set(dify_config);

        // 创建服务
        let pool = db.pool().clone();
        let vector_service = VectorService::new(db);
        let file_service_url = std::env::var("FILE_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8000".to_string());
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
        let _ = DOCUMENTS.set(Arc::new(Mutex::new(docs)));
        let _ = VECTORS.set(Arc::new(Mutex::new(Vec::new())));
        let _ = CHUNKS.set(Arc::new(Mutex::new(Vec::new())));

        // 后台索引文档（向后兼容）
        if std::env::var("DISABLE_AUTO_INDEX").is_err() {
            tokio::spawn(async {
                index_all_documents().await;
            });
        } else {
            tracing::info!("⚠️ 自动文档索引已禁用");
        }

        let _ = CLIENT.set(http_client.clone());
        let _ = CONFIG.set(model_config.clone());
        let _ = CONNECTORS.set(Arc::new(Mutex::new(Vec::new())));
        tracing::info!("✅ 数据连接器框架已初始化");

        // 创建 Agent / 推荐 / 多模态服务
        let agent_service = topems_ai::services::AgentService::new(qa_service.clone());

        // WorkflowOrchestrator with DifyService integration
        let workflow_orchestrator =
            std::sync::Arc::new(topems_ai::services::agent::WorkflowOrchestrator::new(
                agent_service.clone(),
                Some(dify_service.clone()),
            ));

        let recommendation_service =
            RecommendationService::new(vector_service.db().clone(), qa_service.clone());
        let multimodal_service = MultimodalService::new(qa_service.clone());

        // 创建应用状态
        let app_state = topems_ai::shared::AppState {
            auth_state: ctx.auth_state.clone(),
            pool: pool.clone(),
            document_service,
            vector_service,
            qa_service,
            analysis_service,
            agent_service,
            recommendation_service,
            multimodal_service,
            dify_service,
            workflow_orchestrator,
            event_publisher: ctx.event_publisher.clone(),
            audit: topems_ai::services::audit::AiAuditService::new(pool.clone()),
            dsh_agent_orchestrator: None,
            dsh_agent_performance_monitor: Some(
                topems_ai::dsh::agent::AgentPerformanceMonitor::with_defaults(),
            ),
            dsh_knowledge_graph: None,
            dsh_rag_engine: None,
            dsh_multi_agent_coordinator: None,
        };

        // 创建路由（create_routes 处理 auth/tenant/rate_limit/cors/prometheus/telemetry）
        let router = topems_ai::routes::create_routes(
            app_state,
            pool,
            prometheus_layer,
            metric_handle,
            false, // 嵌入模式跳过 GET /api（与 server 聚合 /api 冲突）
        );

        // 注意：create_routes 内部已通过 register_routes_with_legacy_alias 注册完整前缀
        // （/api/ai、/api/v1/ai、/api/core/ai/v1），protected 路由只存在于这些前缀下。
        // 与 plugin_registry 同理：直接挂载（merge），不可再 nest（否则变 /api/ai/api/ai/*）。
        let routes = Router::new().merge(router);

        tracing::info!(
            "✅ 真实 AI 模块已接入统一入口（db={}，prefix={}）",
            ctx.db.size(),
            config.api_prefix
        );

        Ok(Self { routes, db: ctx.db })
    }
}

#[async_trait::async_trait]
impl Module for AiRealModule {
    fn name(&self) -> &'static str {
        "ai"
    }

    fn group(&self) -> ModuleGroup {
        ModuleGroup::Core
    }

    fn routes(&self, _state: ModuleContext) -> Router {
        self.routes.clone()
    }

    async fn health_check(&self) -> ModuleHealth {
        let db_healthy = sqlx::query("SELECT 1").execute(&self.db).await.is_ok();
        if db_healthy {
            ModuleHealth::healthy(self.name(), self.group())
        } else {
            ModuleHealth::unhealthy(self.name(), self.group(), "database disconnected")
        }
    }
}
