//! # 服务间认证（Service-to-Service Auth）
//!
//! 服务 A 调用服务 B 时，用**共享 JWT 密钥**签发"服务身份" token，
//! 替代转发前端用户 token（前端用户通常缺少目标服务的内部权限 → 401 降级）。
//!
//! ## 设计原则
//! - **最小权限**：调用方显式声明所需权限（如 `&["wms:admin"]`），而非签发超管。
//! - **短时效**：默认 5 分钟有效，每次调用重新签发，降低泄漏窗口。
//! - **可审计**：`username` 固定为服务名（如 `"erp-service"`），日志可区分服务与真实用户。
//! - **零依赖密钥**：各服务经 `AuthState::from_env()` 读取同一 `JWT_SECRET`，
//!   签发方与验证方密钥天然一致，无需额外配置。
//!
//! ## 使用
//! ```rust
//! use topems_shared_auth::service::issue_service_token;
//! let token = issue_service_token("shared-secret", "erp-service", &["wms:admin"], None)?;
//! # Ok::<(), Box<dyn std::error::Error>>(())
//! ```

use crate::auth::Claims;
use crate::service_monitor::ServiceCallMonitor;
use prometheus::{register_int_counter_vec, IntCounterVec};
use std::sync::OnceLock;
use topems_shared_core::error::TopemsError;

/// 服务间调用计数（service 维度）——Prometheus 指标。
///
/// 在 auth 中间件识别到服务身份（`is_service_claims`）时递增，
/// 通过各服务 `/metrics`（prometheus 格式）暴露，供监控区分
/// 服务调用与真实用户调用、定位调用方与服务依赖热点。
pub static SERVICE_TO_SERVICE_CALLS: OnceLock<IntCounterVec> = OnceLock::new();

fn service_calls_metric() -> &'static IntCounterVec {
    SERVICE_TO_SERVICE_CALLS.get_or_init(|| {
        register_int_counter_vec!(
            "topems_service_to_service_calls_total",
            "Total number of service-to-service calls by calling service",
            &["service"]
        )
        .expect("failed to register topems_service_to_service_calls_total")
    })
}

/// 下游服务调用降级计数（下游服务维度）——Prometheus 指标。
///
/// 调用方（如 portal 搜索聚合）在某下游源返回 5xx / 网络错误 / 降级时递增，
/// 用于区分"服务不可用"与"正常调用"、量化聚合功能降级面。
pub static SERVICE_CALLS_DEGRADED: OnceLock<IntCounterVec> = OnceLock::new();

fn service_calls_degraded_metric() -> &'static IntCounterVec {
    SERVICE_CALLS_DEGRADED.get_or_init(|| {
        register_int_counter_vec!(
            "topems_service_calls_degraded_total",
            "Total number of degraded/failed downstream service calls by downstream service",
            &["service"]
        )
        .expect("failed to register topems_service_calls_degraded_total")
    })
}

/// 服务调用告警监控器（进程内单例，`from_env` 按环境变量配置）。
static SERVICE_CALL_MONITOR: OnceLock<ServiceCallMonitor> = OnceLock::new();

/// 记录一次服务间调用（按调用方服务名打点），并执行异常告警检测。
pub fn record_service_call(service_name: &str) {
    service_calls_metric()
        .with_label_values(&[service_name])
        .inc();
    SERVICE_CALL_MONITOR
        .get_or_init(ServiceCallMonitor::from_env)
        .record(service_name);
}

/// 记录一次下游服务调用降级/失败（如搜索源 5xx / 网络错误 / 不可用）。
///
/// 打点 `topems_service_calls_degraded_total{service=下游}` 并触发降级告警
/// （冷却去重）。调用方聚合功能降级时使用（如 portal 搜索某源失败）。
pub fn record_service_degrade(service_name: &str, detail: &str) {
    service_calls_degraded_metric()
        .with_label_values(&[service_name])
        .inc();
    SERVICE_CALL_MONITOR
        .get_or_init(ServiceCallMonitor::from_env)
        .record_degrade(service_name, detail);
}

/// 查询某调用方服务的累计服务间调用次数（供测试/内部诊断）。
pub fn service_call_count(service_name: &str) -> u64 {
    service_calls_metric()
        .with_label_values(&[service_name])
        .get()
}

/// 查询某下游服务的累计降级/失败调用次数（供测试/内部诊断）。
pub fn service_degrade_count(service_name: &str) -> u64 {
    service_calls_degraded_metric()
        .with_label_values(&[service_name])
        .get()
}

/// 服务身份 token 默认有效期（秒）：5 分钟
pub const SERVICE_TOKEN_TTL_SECS: usize = 300;

/// 服务身份的固定 sub（非真实用户，标识系统级调用）
pub const SERVICE_SUBJECT: &str = "00000000-0000-0000-0000-000000000000";

/// 服务身份的固定 role（区分于真实用户的业务角色）
pub const SERVICE_ROLE: &str = "service";

/// 签发服务间认证 token（HS256/RS256 由 `jwt_secret` 格式自动选择）。
///
/// - `jwt_secret`: 共享 JWT 密钥（与目标服务 `AuthState::from_env()` 读取的一致）。
/// - `username`: 调用方服务名（如 `"erp-service"`），用于审计与日志。
/// - `permissions`: 调用目标服务所需的最小权限集合（如 `&["wms:admin"]`）。
/// - `ttl_secs`: 有效期秒数，`None` 时使用 [`SERVICE_TOKEN_TTL_SECS`]（300 秒）。
pub fn issue_service_token(
    jwt_secret: &str,
    username: &str,
    permissions: &[&str],
    ttl_secs: Option<usize>,
) -> Result<String, TopemsError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as usize)
        .unwrap_or(0);
    let ttl = ttl_secs.unwrap_or(SERVICE_TOKEN_TTL_SECS);

    let claims = Claims {
        sub: SERVICE_SUBJECT.to_string(),
        username: username.to_string(),
        role: SERVICE_ROLE.to_string(),
        roles: vec![SERVICE_ROLE.to_string()],
        permissions: permissions.iter().map(|s| s.to_string()).collect(),
        is_superuser: false,
        exp: now + ttl,
        iat: now,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
    };
    claims.encode(jwt_secret)
}

/// 判断 Claims 是否为服务身份（非真实用户）。
///
/// 被调用方可在中间件中用于区分服务调用与用户调用（如审计、告警差异）。
pub fn is_service_claims(claims: &Claims) -> bool {
    claims.role == SERVICE_ROLE
        || (claims.sub == SERVICE_SUBJECT && claims.username.ends_with("-service"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::verify_jwt_token;

    const TEST_SECRET: &str = "topems-test-jwt-secret-key-at-least-32-characters-long";

    #[test]
    fn test_issue_service_token_roundtrip() {
        let token = issue_service_token(TEST_SECRET, "erp-service", &["wms:admin"], None)
            .expect("签发成功");
        let claims = verify_jwt_token(&token, TEST_SECRET).expect("验证成功");

        assert_eq!(claims.username, "erp-service");
        assert_eq!(claims.role, SERVICE_ROLE);
        assert_eq!(claims.permissions, vec!["wms:admin"]);
        assert!(!claims.is_superuser, "服务 token 不应为超管");
        assert!(is_service_claims(&claims));
    }

    #[test]
    fn test_issue_service_token_custom_ttl() {
        let token = issue_service_token(TEST_SECRET, "portal-service", &["erp:read"], Some(60))
            .expect("签发成功");
        let claims = verify_jwt_token(&token, TEST_SECRET).expect("验证成功");
        assert_eq!(claims.exp - claims.iat, 60);
    }

    #[test]
    fn test_is_service_claims_false_for_user() {
        let user_claims = Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "alice".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string()],
            permissions: vec!["wms:admin".to_string()],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        };
        assert!(!is_service_claims(&user_claims));
    }

    #[test]
    fn test_record_service_degrade_metric_and_alert() {
        let svc = "degrade-test-service";
        // 降级上报应打点 degraded 指标（触发 ServiceCallMonitor 告警，不 panic）
        record_service_degrade(svc, "search source 503");
        record_service_degrade(svc, "network error");
        assert_eq!(service_degrade_count(svc), 2);
        // 其他服务计数独立
        assert_eq!(service_degrade_count("other-svc"), 0);
    }

    #[test]
    fn test_service_degrade_count_zero_when_never_called() {
        assert_eq!(service_degrade_count("never-degraded-svc"), 0);
    }
}
