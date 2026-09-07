pub mod permission;

use axum::extract::FromRef;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_event::event::EventPublisher;

use crate::dsh::agent::{AgentOrchestrator, AgentPerformanceMonitor};
use crate::dsh::knowledge_graph::KnowledgeGraph;
use crate::dsh::multi_agent::MultiAgentCoordinator;
use crate::dsh::rag::RagEngine;
use crate::services::audit::AiAuditService;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    /// 常规读写连接池（遗留⑩：ai_knowledge 模块直查库使用，2026-09-08 补充）
    pub pool: sqlx::PgPool,
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
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
