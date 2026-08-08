pub mod permission;

use axum::extract::FromRef;
use std::sync::Arc;
use topems_shared_event::event::EventPublisher;
use topems_shared_auth::auth::AuthState;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub document_service: crate::services::DocumentService,
    pub vector_service: crate::services::VectorService,
    pub qa_service: crate::services::QAService,
    pub analysis_service: crate::services::AnalysisService,
    pub agent_service: crate::services::AgentService,
    pub recommendation_service: crate::services::RecommendationService,
    pub multimodal_service: crate::services::MultimodalService,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}
