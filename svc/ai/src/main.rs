// TOPEMS-AI Backend - with PostgreSQL/pgvector persistence and PDF support
// =============================================================================

mod event_handlers;
mod handlers;
mod middleware;
mod models;
mod modules;
mod routes;
mod services;
mod shared;

use crate::models::{Config, CHUNKS, CLIENT, CONFIG, CONNECTORS, DOCS_DIR, DOCUMENTS, VECTORS};
use crate::services::document::DocumentQAConfig;
use crate::services::embedding::{index_all_documents, load_documents_from_dir};

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use reqwest::Client;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use services::{
    AnalysisConfig, AnalysisService, Database, DocumentService, MultimodalService, QAConfig,
    QAService, RecommendationService, VectorService,
};
use topems_shared::ai_client::{AIModelConfig, AIProviderType};
use topems_shared::{init_telemetry, AuthState};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-ai");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_ai_custom_metric",
        "This is a custom metric for TOPEMS-AI",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - this is a startup error, check for duplicate metric registrations")
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

    // 读取配置
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

    let config = Config {
        api_key: api_key.clone(),
        base_url: base_url.clone(),
        model: model.clone(),
        use_ollama,
        embedding_model: embedding_model.clone(),
    };

    // 初始化数据库
    let database_url = std::env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        "DATABASE_URL environment variable is required"
    })?;

    std::env::set_var("SEARCH_PATH", "ai_service, shared, public");

    tracing::info!(
        "🔌 连接数据库: {}",
        database_url.split('@').next_back().unwrap_or("...")
    );

    let db = Database::new(&database_url).await?;
    tracing::info!("✅ 数据库连接成功");

    let event_publisher = match topems_shared::event::EventPublisher::new("topems-ai") {
        Ok(publisher) => {
            tracing::info!("📢 事件发布服务初始化成功");
            Some(std::sync::Arc::new(publisher))
        }
        Err(e) => {
            tracing::warn!("⚠️ 事件发布服务初始化失败（不阻塞启动）: {}", e);
            None
        }
    };

    if let Err(e) =
        event_handlers::start_event_subscribers(db.pool().clone(), event_publisher.clone()).await
    {
        tracing::warn!("⚠️ AI 事件订阅者启动失败: {}", e);
    }

    // 运行迁移
    db.run_migrations().await?;
    tracing::info!("✅ 数据库表结构已就绪");

    // HTTP 客户端
    let http_client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()?;

    // 创建服务
    let vector_service = VectorService::new(db);

    // File 服务 URL（可选，用于从 File 服务获取文件）
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
        .map_err(|_| "DOCUMENTS already initialized")?;
    VECTORS
        .set(Arc::new(Mutex::new(Vec::new())))
        .map_err(|_| "VECTORS already initialized")?;
    CHUNKS
        .set(Arc::new(Mutex::new(Vec::new())))
        .map_err(|_| "CHUNKS already initialized")?;

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
        .map_err(|_| "CLIENT already initialized")?;
    CONFIG
        .set(config.clone())
        .map_err(|_| "CONFIG already initialized")?;
    CONNECTORS
        .set(Arc::new(Mutex::new(Vec::new())))
        .map_err(|_| "CONNECTORS already initialized")?;
    tracing::info!("✅ 数据连接器框架已初始化");

    // 创建 Agent 服务
    let agent_service = crate::services::AgentService::new(qa_service.clone());

    // 创建推荐服务
    let recommendation_service =
        RecommendationService::new(vector_service.db().clone(), qa_service.clone());

    // 创建多模态服务
    let multimodal_service = MultimodalService::new(qa_service.clone());

    // 创建应用状态
    let app_state = crate::shared::AppState {
        auth_state: AuthState::from_env(),
        document_service,
        vector_service,
        qa_service,
        analysis_service,
        agent_service,
        recommendation_service,
        multimodal_service,
        event_publisher,
    };

    // 创建路由
    let app = crate::routes::create_routes(app_state, prometheus_layer, metric_handle);

    let port = std::env::var("AI_PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "8013".to_string())
        .parse()
        .unwrap_or(8013);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-AI 服务运行在 http://{}", addr);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("📊 向量库功能已启用，嵌入模型: {}", embedding_model);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::ai_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

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

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    )
    .await?;

    Ok(())
}
