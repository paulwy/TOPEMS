//! Tier 裁剪中间件
//!
//! 根据租户的订阅层级（plan tier）动态启用/禁用模块路由。
//! 集成到各业务服务的路由层，对不可用模块返回 403 Forbidden。
//!
//! # 使用示例
//!
//! ```rust,no_run
//! use axum::Router;
//! use crate::middleware::tier_gate::{tier_gate_middleware, TierGateConfig};
//!
//! let app = Router::new()
//!     .route("/api/mes/*path", get(handler))
//!     .layer(axum::middleware::from_fn_with_state(
//!         state.clone(),
//!         tier_gate_middleware,
//!     ));
//! ```

use axum::extract::State;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::Arc;
use tracing::warn;
use uuid::Uuid;

use crate::modules::subscription::{PlanTier, TierFeatureMatrix, TenantSubscription};

/// Tier 裁剪配置
#[derive(Debug, Clone)]
pub struct TierGateConfig {
    /// 当前服务的模块标识（如 "mes", "wms"）
    pub module: String,
    /// 最低可用层级（默认 basic）
    pub min_tier: PlanTier,
    /// 白名单路径（不进行 tier 检查）
    pub whitelist_paths: HashSet<String>,
    /// 是否启用（默认 true）
    pub enabled: bool,
}

impl Default for TierGateConfig {
    fn default() -> Self {
        Self {
            module: "unknown".to_string(),
            min_tier: PlanTier::Basic,
            whitelist_paths: HashSet::new(),
            enabled: true,
        }
    }
}

impl TierGateConfig {
    /// 创建新的配置
    pub fn new(module: &str, min_tier: PlanTier) -> Self {
        Self {
            module: module.to_string(),
            min_tier,
            whitelist_paths: HashSet::new(),
            enabled: true,
        }
    }

    /// 添加白名单路径
    pub fn with_whitelist(mut self, paths: Vec<&str>) -> Self {
        for path in paths {
            self.whitelist_paths.insert(path.to_string());
        }
        self
    }

    /// 禁用裁剪
    pub fn disabled(mut self) -> Self {
        self.enabled = false;
        self
    }
}

/// Tier 不允许的错误响应
#[derive(Debug, Serialize)]
pub struct TierForbiddenResponse {
    pub error: String,
    pub message: String,
    pub required_tier: String,
    pub current_tier: Option<String>,
    pub module: String,
}

/// 从请求中提取租户 ID
///
/// 优先从扩展中获取（由 tenant_rls_middleware 设置），
/// 其次从 header `X-Tenant-ID` 获取。
fn extract_tenant_id(req: &Request<axum::body::Body>) -> Option<Uuid> {
    // 从扩展中获取
    if let Some(tenant_id) = req.extensions().get::<Uuid>() {
        return Some(*tenant_id);
    }

    // 从 header 获取
    req.headers()
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

/// 从请求中提取当前租户的订阅层级
///
/// 优先从扩展中获取（由认证中间件设置），
/// 其次默认返回 basic。
fn extract_plan_tier(req: &Request<axum::body::Body>) -> PlanTier {
    if let Some(tier) = req.extensions().get::<PlanTier>() {
        return *tier;
    }

    // 从 header 获取
    if let Some(tier_str) = req
        .headers()
        .get("X-Plan-Tier")
        .and_then(|v| v.to_str().ok())
    {
        if let Some(tier) = PlanTier::from_str(tier_str) {
            return tier;
        }
    }

    // 默认 basic
    PlanTier::Basic
}

/// Tier 裁剪中间件
///
/// 根据租户的订阅层级检查当前模块是否可用。
/// 不可用时返回 403 Forbidden。
pub async fn tier_gate_middleware(
    State(config): State<Arc<TierGateConfig>>,
    mut req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    // 如果未启用，直接放行
    if !config.enabled {
        return next.run(req).await;
    }

    // 检查白名单路径
    let path = req.uri().path().to_string();
    if config.whitelist_paths.iter().any(|p| path.starts_with(p)) {
        return next.run(req).await;
    }

    // 提取租户 ID 和层级
    let tenant_id = extract_tenant_id(&req);
    let plan_tier = extract_plan_tier(&req);

    // 将 plan_tier 注入扩展，供后续 handler 使用
    req.extensions_mut().insert(plan_tier);

    // 检查模块是否对当前层级可用
    let is_available = TierFeatureMatrix::is_module_available(&config.module, &plan_tier);

    if !is_available {
        warn!(
            "Tier gate blocked: module={}, tenant={:?}, current_tier={}, required_tier>={}",
            config.module,
            tenant_id,
            plan_tier,
            config.min_tier
        );

        let response = TierForbiddenResponse {
            error: "tier_insufficient".to_string(),
            message: format!(
                "模块 '{}' 需要 '{}' 及以上订阅层级，当前层级为 '{}'",
                config.module, config.min_tier, plan_tier
            ),
            required_tier: config.min_tier.as_str().to_string(),
            current_tier: Some(plan_tier.as_str().to_string()),
            module: config.module.clone(),
        };

        return (StatusCode::FORBIDDEN, axum::Json(response)).into_response();
    }

    next.run(req).await
}

/// 检查租户订阅是否有模块访问权限（带 features 覆盖）
pub fn check_module_access(
    subscription: &TenantSubscription,
    module: &str,
) -> bool {
    crate::modules::subscription::TierPermissionService::has_module_access(subscription, module)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;

    #[test]
    fn test_tier_gate_config_new() {
        let config = TierGateConfig::new("mes", PlanTier::Basic);
        assert_eq!(config.module, "mes");
        assert_eq!(config.min_tier, PlanTier::Basic);
        assert!(config.enabled);
        assert!(config.whitelist_paths.is_empty());
    }

    #[test]
    fn test_tier_gate_config_with_whitelist() {
        let config = TierGateConfig::new("ai", PlanTier::Advanced)
            .with_whitelist(vec!["/api/ai/health", "/api/ai/public"]);
        assert_eq!(config.whitelist_paths.len(), 2);
        assert!(config.whitelist_paths.contains("/api/ai/health"));
        assert!(config.whitelist_paths.contains("/api/ai/public"));
    }

    #[test]
    fn test_tier_gate_config_disabled() {
        let config = TierGateConfig::new("ai", PlanTier::Advanced).disabled();
        assert!(!config.enabled);
    }

    #[test]
    fn test_extract_plan_tier_from_header() {
        let req = Request::builder()
            .header("X-Plan-Tier", "advanced")
            .body(Body::empty())
            .unwrap();
        assert_eq!(extract_plan_tier(&req), PlanTier::Advanced);
    }

    #[test]
    fn test_extract_plan_tier_basic() {
        let req = Request::builder()
            .header("X-Plan-Tier", "basic")
            .body(Body::empty())
            .unwrap();
        assert_eq!(extract_plan_tier(&req), PlanTier::Basic);
    }

    #[test]
    fn test_extract_plan_tier_free() {
        let req = Request::builder()
            .header("X-Plan-Tier", "free")
            .body(Body::empty())
            .unwrap();
        assert_eq!(extract_plan_tier(&req), PlanTier::Free);
    }

    #[test]
    fn test_extract_plan_tier_invalid_defaults_basic() {
        let req = Request::builder()
            .header("X-Plan-Tier", "invalid")
            .body(Body::empty())
            .unwrap();
        assert_eq!(extract_plan_tier(&req), PlanTier::Basic);
    }

    #[test]
    fn test_extract_plan_tier_missing_defaults_basic() {
        let req = Request::builder().body(Body::empty()).unwrap();
        assert_eq!(extract_plan_tier(&req), PlanTier::Basic);
    }

    #[test]
    fn test_extract_plan_tier_from_extensions() {
        let mut req = Request::builder().body(Body::empty()).unwrap();
        req.extensions_mut().insert(PlanTier::Advanced);
        assert_eq!(extract_plan_tier(&req), PlanTier::Advanced);
    }

    #[test]
    fn test_extract_tenant_id_from_header() {
        let tenant_id = Uuid::new_v4();
        let req = Request::builder()
            .header("X-Tenant-ID", tenant_id.to_string())
            .body(Body::empty())
            .unwrap();
        assert_eq!(extract_tenant_id(&req), Some(tenant_id));
    }

    #[test]
    fn test_extract_tenant_id_from_extensions() {
        let tenant_id = Uuid::new_v4();
        let mut req = Request::builder().body(Body::empty()).unwrap();
        req.extensions_mut().insert(tenant_id);
        assert_eq!(extract_tenant_id(&req), Some(tenant_id));
    }

    #[test]
    fn test_extract_tenant_id_missing() {
        let req = Request::builder().body(Body::empty()).unwrap();
        assert_eq!(extract_tenant_id(&req), None);
    }

    #[test]
    fn test_module_availability_matches_matrix() {
        // mes 应该对 basic 及以上可用
        assert!(TierFeatureMatrix::is_module_available("mes", &PlanTier::Basic));
        assert!(TierFeatureMatrix::is_module_available("mes", &PlanTier::Advanced));
        assert!(!TierFeatureMatrix::is_module_available("mes", &PlanTier::Free));

        // ai 应该只对 advanced 可用
        assert!(TierFeatureMatrix::is_module_available("ai", &PlanTier::Advanced));
        assert!(!TierFeatureMatrix::is_module_available("ai", &PlanTier::Basic));
        assert!(!TierFeatureMatrix::is_module_available("ai", &PlanTier::Free));

        // iam 应该对所有层级可用
        assert!(TierFeatureMatrix::is_module_available("iam", &PlanTier::Free));
        assert!(TierFeatureMatrix::is_module_available("iam", &PlanTier::Basic));
        assert!(TierFeatureMatrix::is_module_available("iam", &PlanTier::Advanced));
    }

    #[test]
    fn test_tier_forbidden_response_serialization() {
        let response = TierForbiddenResponse {
            error: "tier_insufficient".to_string(),
            message: "测试消息".to_string(),
            required_tier: "advanced".to_string(),
            current_tier: Some("basic".to_string()),
            module: "ai".to_string(),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("tier_insufficient"));
        assert!(json.contains("advanced"));
        assert!(json.contains("basic"));
        assert!(json.contains("ai"));
    }
}
