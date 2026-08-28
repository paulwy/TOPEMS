//! GraphQL 辅助函数
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 包含跨服务统计获取、HTTP 客户端、服务健康检查等辅助函数。

use crate::modules::graphql_types::ServiceStatsGql;
use crate::shared::AppState;
use topems_shared_observability::telemetry::TracedRequestExt;

// ==================== 跨服务统计获取 ====================

pub async fn fetch_erp_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.erp_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "erp".into(),
        total: 0,
        active: 0,
        available,
    })
}

pub async fn fetch_crm_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.crm_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "crm".into(),
        total: 0,
        active: 0,
        available,
    })
}

pub async fn fetch_hrm_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.hrm_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "hrm".into(),
        total: 0,
        active: 0,
        available,
    })
}

pub async fn fetch_finance_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.finance_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "finance".into(),
        total: 0,
        active: 0,
        available,
    })
}

pub async fn fetch_mes_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.mes_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "mes".into(),
        total: 0,
        active: 0,
        available,
    })
}

pub async fn fetch_workflow_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.workflow_client.get_health().await.unwrap_or(false);
    Some(ServiceStatsGql {
        service: "workflow".into(),
        total: 0,
        active: 0,
        available,
    })
}

// ==================== HTTP 客户端与健康检查 ====================

// V34.0 Track F: 共享 HTTP 客户端，避免每次健康检查都创建新 Client
static SHARED_HTTP_CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();

pub fn shared_http_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(reqwest::Client::new)
}

pub async fn check_service_health(url: &str) -> bool {
    match shared_http_client()
        .get(format!("{}/health", url))
        .with_trace()
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// 根据服务名获取服务 URL
pub fn service_url(service_name: &str) -> &'static str {
    match service_name {
        "erp" => "http://localhost:8010",
        "crm" => "http://localhost:8029",
        "hrm" => "http://localhost:8020",
        "finance" => "http://localhost:8011",
        "mes" => "http://localhost:8030",
        "workflow" => "http://localhost:8000",
        "iam" => "http://localhost:8000",
        "notification" => "http://localhost:8084",
        _ => "http://localhost:8000",
    }
}
