//! GraphQL 辅助函数
//!
//! 从 graphql_schema.rs 拆分出来的独立模块。
//! 包含跨服务统计获取、HTTP 客户端、服务健康检查等辅助函数。

use crate::modules::graphql_types::ServiceStatsGql;
use crate::shared::AppState;
use topems_shared_auth::service::issue_service_token;
use topems_shared_observability::telemetry::TracedRequestExt;

// ==================== 跨服务统计获取 ====================
// total/active 语义：该服务当前关键业务量（如订单/实例/员工数），
// available 来自服务健康探测。
// 模块化单体模式下客户端 base 指向 topems-server（MONOLITH_SERVICE_URL），
// 各调用经服务 token 认证后返回真实数据。

pub async fn fetch_erp_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.erp_client.get_health().await.unwrap_or(false);
    // total：采购订单在途量；active：库存条目数
    let total = state
        .erp_client
        .list_purchase_orders(1, 1)
        .await
        .map(|v| v.len() as u64)
        .unwrap_or(0);
    let active = state
        .erp_client
        .get_inventory_summary()
        .await
        .ok()
        .and_then(|v| {
            v.get("total_items")
                .or_else(|| v.get("total"))
                .or_else(|| v.get("count"))
                .and_then(|x| x.as_u64())
        })
        .unwrap_or(0);
    Some(ServiceStatsGql {
        service: "erp".into(),
        total,
        active,
        available,
    })
}

pub async fn fetch_crm_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.crm_client.get_health().await.unwrap_or(false);
    // total：客户数；active：进行中商机数
    let total = state
        .crm_client
        .list_customers(1, 1)
        .await
        .map(|v| v.len() as u64)
        .unwrap_or(0);
    let active = state
        .crm_client
        .get_dashboard_stats()
        .await
        .ok()
        .and_then(|v| {
            v.get("active_opportunities")
                .or_else(|| v.get("open_opportunities"))
                .or_else(|| v.get("opportunities"))
                .and_then(|x| x.as_u64())
        })
        .unwrap_or(0);
    Some(ServiceStatsGql {
        service: "crm".into(),
        total,
        active,
        available,
    })
}

pub async fn fetch_hrm_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.hrm_client.get_health().await.unwrap_or(false);
    // total：员工总数；active：在职（active）员工数
    let (total, active) = match state.hrm_client.list_employees().await {
        Ok(employees) => {
            let active_count = employees
                .iter()
                .filter(|e| {
                    let s = e.status.to_lowercase();
                    s == "active" || s == "在职" || s == "employed" || s == "on"
                })
                .count() as u64;
            (employees.len() as u64, active_count)
        }
        Err(_) => (0, 0),
    };
    Some(ServiceStatsGql {
        service: "hrm".into(),
        total,
        active,
        available,
    })
}

pub async fn fetch_finance_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.finance_client.get_health().await.unwrap_or(false);
    // total：总账科目/凭证数；active：待审批数
    let total = state
        .finance_client
        .list_accounts()
        .await
        .map(|v| v.len() as u64)
        .unwrap_or(0);
    let active = state
        .finance_client
        .get_dashboard_stats()
        .await
        .ok()
        .and_then(|v| {
            v.get("pending_approvals")
                .or_else(|| v.get("pending"))
                .or_else(|| v.get("approvals"))
                .and_then(|x| x.as_u64())
        })
        .unwrap_or(0);
    Some(ServiceStatsGql {
        service: "finance".into(),
        total,
        active,
        available,
    })
}

pub async fn fetch_mes_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.mes_client.get_health().await.unwrap_or(false);
    // total：生产订单数；active：在制品（WIP）数量
    let total = state
        .mes_client
        .list_production_orders(1, 1)
        .await
        .map(|v| v.len() as u64)
        .unwrap_or(0);
    let active = state
        .mes_client
        .get_wip_summary()
        .await
        .ok()
        .and_then(|v| {
            v.get("total_count")
                .or_else(|| v.get("count"))
                .and_then(|x| x.as_u64())
        })
        .unwrap_or(0);
    Some(ServiceStatsGql {
        service: "mes".into(),
        total,
        active,
        available,
    })
}

pub async fn fetch_workflow_stats(state: &AppState) -> Option<ServiceStatsGql> {
    let available = state.workflow_client.get_health().await.unwrap_or(false);
    // total：流程实例总数；active：运行中实例数
    let (total, active) = match state.workflow_client.get_statistics().await {
        Ok(s) => (
            s.total_instances.max(0) as u64,
            s.running_instances.max(0) as u64,
        ),
        Err(_) => (0, 0),
    };
    Some(ServiceStatsGql {
        service: "workflow".into(),
        total,
        active,
        available,
    })
}

// ==================== HTTP 客户端与健康检查 ====================

// V34.0 Track F: 共享 HTTP 客户端，避免每次健康检查都创建新 Client
static SHARED_HTTP_CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();

pub fn shared_http_client() -> &'static reqwest::Client {
    SHARED_HTTP_CLIENT.get_or_init(reqwest::Client::new)
}

/// portal 启动时注册 JWT_SECRET，供联邦实体解析 / 跨服务聚合读签发 service token。
/// （与 announcements 模块走 AppState.auth_state 的方式等价，但可被无 Context 的
/// 独立函数（如 resolve_federated_entity）全局访问。）
static SERVICE_JWT_SECRET: std::sync::OnceLock<String> = std::sync::OnceLock::new();

pub fn init_service_auth(jwt_secret: &str) {
    let _ = SERVICE_JWT_SECRET.set(jwt_secret.to_string());
}

/// 签发 portal-service 身份 token；未注册或签发失败时返回 None（调用方降级匿名，保持现状）。
pub fn service_token(permissions: &[&str]) -> Option<String> {
    let jwt = SERVICE_JWT_SECRET.get()?;
    issue_service_token(jwt, "portal-service", permissions, None).ok()
}

/// 联邦实体解析 / 批量聚合读的统一权限集（portal 作为 BFF 可读各业务域；
/// 与 shared/mod.rs 中 portal-service 客户端的多权限声明保持一致）。
pub const FEDERATION_READ_PERMS: &[&str] = &[
    "erp:read",
    "crm:read",
    "hrm:read",
    "finance:read",
    "wms:read",
    "mes:read",
    "qms:read",
    "pdm:read",
    "lims:read",
    "ehs:read",
    "scm:read",
    "monitor:read",
    "communication:read",
];

/// 联邦网关写路径（跨服务变更）统一走 admin 级权限（与 shared/mod.rs
/// portal-service 客户端的 admin 声明保持一致）。
pub const FEDERATION_WRITE_PERMS: &[&str] = &[
    "erp:admin",
    "crm:admin",
    "hrm:admin",
    "finance:admin",
    "wms:admin",
    "mes:admin",
    "qms:admin",
    "pdm:admin",
    "lims:admin",
    "ehs:admin",
    "scm:admin",
];

/// 带服务身份的任意方法请求（GET 之外还覆盖 batch POST / 写 PUT / DELETE）。
pub fn service_request(
    method: reqwest::Method,
    url: &str,
    permissions: &[&str],
) -> reqwest::RequestBuilder {
    let builder = shared_http_client().request(method, url).with_trace();
    match service_token(permissions) {
        Some(t) => builder.bearer_auth(t),
        None => builder,
    }
}

/// 带服务身份 GET：联邦实体解析 / 跨服务聚合读统一走 portal-service service token，
/// 对端按服务身份审计 / RLS 豁免，不再匿名调用。
pub async fn service_auth_get(
    url: &str,
    permissions: &[&str],
) -> Result<reqwest::Response, reqwest::Error> {
    let builder = shared_http_client().get(url).with_trace();
    match service_token(permissions) {
        Some(t) => builder.bearer_auth(t).send().await,
        None => builder.send().await,
    }
}

/// 带服务身份的请求构造（供 `let client = shared_http_client()` 形式的调用点使用）。
pub fn service_auth_builder(url: &str, permissions: &[&str]) -> reqwest::RequestBuilder {
    let builder = shared_http_client().get(url).with_trace();
    match service_token(permissions) {
        Some(t) => builder.bearer_auth(t),
        None => builder,
    }
}

pub async fn check_service_health(url: &str) -> bool {
    match shared_http_client()
        .get(format!("{}/health", url))
        .with_trace()
        // 聚合 /health 在模块化单体下会逐模块健康检查（实测 ~5s），
        // 2s 超时必然误判不可用；放宽到 8s 与慢路径对齐。
        .timeout(std::time::Duration::from_secs(8))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// 服务健康探测（统一口径）：
/// - 模块化单体模式（`MONOLITH_SERVICE_URL` 已设置）：所有服务进程内嵌于
///   topems-server，统一探测 server 聚合 `/health`（200 = 服务所在进程存活）
/// - 独立部署模式：逐服务独立端口探测
///
/// 注意：`check_service_health` 内部会拼 `/health`，此处只传 base，避免双拼。
pub async fn probe_service_health(service_name: &str, standalone_url: &str) -> bool {
    let result = if let Ok(base) = std::env::var("MONOLITH_SERVICE_URL") {
        tracing::debug!(target: "portal_health_probe", service = %service_name, branch = "monolith", base = %base, "probe via MONOLITH_SERVICE_URL");
        check_service_health(&base).await
    } else {
        tracing::debug!(target: "portal_health_probe", service = %service_name, branch = "standalone", url = %standalone_url, "probe standalone URL");
        check_service_health(standalone_url).await
    };
    tracing::debug!(target: "portal_health_probe", service = %service_name, healthy = result, "probe result");
    result
}

/// 根据服务名获取服务 URL
///
/// 模块化单体模式（`MONOLITH_SERVICE_URL` 已设置）：所有服务统一指向 topems-server，
/// 健康探测走 server 聚合 `/health`（200 = 该服务所在进程存活）；
/// 独立部署模式：返回各服务独立端口。
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
