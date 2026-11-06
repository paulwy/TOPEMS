pub mod permission;

use axum::extract::FromRef;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;

use crate::dsh::agent::{AgentOrchestrator, AgentPerformanceMonitor};
use crate::dsh::knowledge_graph::KnowledgeGraph;
use crate::dsh::multi_agent::MultiAgentCoordinator;
use crate::dsh::rag::RagEngine;
use crate::services::audit::AiAuditService;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    /// 模块级数据库句柄（事务级 search_path = `ai, public`）。
    pub db: Db,
    pub document_service: crate::services::DocumentService,
    pub vector_service: crate::services::VectorService,
    pub qa_service: crate::services::QAService,
    pub analysis_service: crate::services::AnalysisService,
    pub agent_service: crate::services::AgentService,
    pub recommendation_service: crate::services::RecommendationService,
    pub multimodal_service: crate::services::MultimodalService,
    pub dify_service: crate::services::DifyService,
    pub workflow_orchestrator: std::sync::Arc<crate::services::agent::WorkflowOrchestrator>,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub audit: AiAuditService,
    /// DSH Agent 编排器（可选）
    pub dsh_agent_orchestrator: Option<AgentOrchestrator>,
    /// DSH Agent 性能监控器（可选）
    pub dsh_agent_performance_monitor: Option<AgentPerformanceMonitor>,
    /// DSH 知识图谱（可选）
    pub dsh_knowledge_graph: Option<KnowledgeGraph>,
    /// DSH RAG 引擎（可选）
    pub dsh_rag_engine: Option<RagEngine>,
    /// DSH 多 Agent 协调器（可选）
    pub dsh_multi_agent_coordinator: Option<MultiAgentCoordinator>,
    /// [P3-4] MCP 工具注册就绪屏障：routes.rs 后台注册完成前置 true；
    /// 详细健康检查据此报告 Degraded（注册窗口），避免启动初期 tools/list 瞬时空被探活判活。
    pub mcp_tools_ready: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for Db {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}
