//! # N+1 查询检测器
//!
//! 提供请求级别的 SQL 查询计数与 N+1 查询模式检测能力。
//!
//! 通过 axum 中间件 [`n_plus_one_middleware`] 为每个请求注入一个 [`QueryCounter`]，
//! 业务代码可在执行数据库查询前后调用 [`QueryCounter::record`] 进行计数；
//! 当单次请求的查询数超过阈值时，自动记录 warning 日志，帮助发现 N+1 查询问题。
//!
//! # 集成示例
//!
//! 在服务启动时挂载中间件（以 `from_fn_with_state` 方式）：
//!
//! ```ignore
//! use axum::Router;
//! use topems_shared_core::n_plus_one_detector::{n_plus_one_middleware, NPlusOneConfig};
//!
//! let app: Router = Router::new()
//!     .layer(axum::middleware::from_fn_with_state(
//!         NPlusOneConfig::default(),
//!         n_plus_one_middleware,
//!     ));
//! ```
//!
//! 在 handler 中通过 `Extension<QueryCounter>` 取出计数器并记录查询：
//!
//! ```ignore
//! use axum::extract::Extension;
//! use topems_shared_core::n_plus_one_detector::QueryCounter;
//!
//! async fn list_users(Extension(counter): Extension<QueryCounter>) -> () {
//!     counter.record();
//!     sqlx::query("SELECT * FROM users").fetch_all(&pool).await;
//! }
//! ```
//!
//! # 配置
//!
//! 阈值可通过 [`NPlusOneConfig::from_env`] 从环境变量读取：
//! - `NPLUSONE_THRESHOLD`：每请求查询数告警阈值（默认 20）
//! - `NPLUSONE_ENABLED`：是否启用（`"false"`/`"0"`/`"off"`/`"no"` 关闭，默认启用）

use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use tracing::warn;

/// 默认的每请求查询数告警阈值。
pub const DEFAULT_QUERY_THRESHOLD: u32 = 20;

/// N+1 查询检测器配置。
#[derive(Debug, Clone)]
pub struct NPlusOneConfig {
    /// 单次请求查询数告警阈值，超过后记录 warning 日志。
    pub query_threshold: u32,
    /// 是否启用检测。关闭后中间件直接放行，不注入计数器。
    pub enabled: bool,
}

impl Default for NPlusOneConfig {
    fn default() -> Self {
        Self {
            query_threshold: DEFAULT_QUERY_THRESHOLD,
            enabled: true,
        }
    }
}

impl NPlusOneConfig {
    /// 从环境变量读取配置：
    /// - `NPLUSONE_THRESHOLD`：阈值（解析失败回退到默认值 20）
    /// - `NPLUSONE_ENABLED`：是否启用（`"false"`/`"0"`/`"off"`/`"no"` 关闭，默认启用）
    pub fn from_env() -> Self {
        let mut cfg = Self::default();
        if let Ok(v) = std::env::var("NPLUSONE_THRESHOLD") {
            if let Ok(n) = v.parse::<u32>() {
                cfg.query_threshold = n;
            }
        }
        if let Ok(v) = std::env::var("NPLUSONE_ENABLED") {
            if matches!(v.to_lowercase().as_str(), "false" | "0" | "off" | "no") {
                cfg.enabled = false;
            }
        }
        cfg
    }
}

/// 单次请求的查询计数器。
///
/// 通过 [`n_plus_one_middleware`] 注入到 request extensions 中，
/// 业务代码可通过 `axum::extract::Extension<QueryCounter>` 取出并调用 [`QueryCounter::record`]。
///
/// 内部使用 `Arc<AtomicU32>`，可低成本地在异步上下文中共享与克隆。
#[derive(Debug, Clone)]
pub struct QueryCounter {
    count: Arc<AtomicU32>,
    threshold: u32,
}

impl QueryCounter {
    fn new(threshold: u32) -> Self {
        Self {
            count: Arc::new(AtomicU32::new(0)),
            threshold,
        }
    }

    /// 记录一次查询。可在每次执行 SQL 前后调用。
    pub fn record(&self) {
        self.count.fetch_add(1, Ordering::Relaxed);
    }

    /// 一次记录 N 次查询。适用于批量场景或已知查询次数的服务调用。
    pub fn record_n(&self, n: u32) {
        if n > 0 {
            self.count.fetch_add(n, Ordering::Relaxed);
        }
    }

    /// 当前累计查询次数。
    pub fn count(&self) -> u32 {
        self.count.load(Ordering::Relaxed)
    }

    /// 是否已超过告警阈值。
    pub fn is_exceeded(&self) -> bool {
        self.count() > self.threshold
    }

    /// 配置的阈值。
    pub fn threshold(&self) -> u32 {
        self.threshold
    }
}

/// axum 中间件：为每个请求注入 [`QueryCounter`] 并在响应结束时检测 N+1 风险。
///
/// 当请求的查询数超过 `config.query_threshold` 时，记录 warning 日志，
/// 包含请求方法、路径、查询次数与阈值，便于定位 N+1 热点。
///
/// 检测关闭（`config.enabled == false`）时直接放行，不注入计数器，零额外开销。
///
/// # 集成方式
///
/// ```ignore
/// use axum::middleware::from_fn_with_state;
/// use topems_shared_core::n_plus_one_detector::{n_plus_one_middleware, NPlusOneConfig};
///
/// let app = router.layer(from_fn_with_state(
///     NPlusOneConfig::default(),
///     n_plus_one_middleware,
/// ));
/// ```
pub async fn n_plus_one_middleware(
    State(config): State<NPlusOneConfig>,
    mut request: Request,
    next: Next,
) -> Response {
    if !config.enabled {
        return next.run(request).await;
    }

    let counter = QueryCounter::new(config.query_threshold);
    request.extensions_mut().insert(counter.clone());

    let method = request.method().clone();
    let path = request.uri().path().to_string();

    let response = next.run(request).await;

    let count = counter.count();
    if count > config.query_threshold {
        warn!(
            target: "n_plus_one_detector",
            count = count,
            threshold = config.query_threshold,
            http.method = %method,
            http.path = %path,
            "Potential N+1 query detected: {} DB queries on {} {} (threshold={})",
            count,
            method,
            path,
            config.query_threshold,
        );
    } else if count > 0 {
        tracing::debug!(
            target: "n_plus_one_detector",
            count = count,
            http.method = %method,
            http.path = %path,
            "Request executed {} DB queries on {} {}",
            count,
            method,
            path,
        );
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    fn test_query_counter_record() {
        let counter = QueryCounter::new(5);
        assert_eq!(counter.count(), 0);
        assert!(!counter.is_exceeded());
        counter.record();
        counter.record();
        counter.record();
        assert_eq!(counter.count(), 3);
        assert!(!counter.is_exceeded());
    }

    #[test]
    fn test_query_counter_record_n() {
        let counter = QueryCounter::new(5);
        counter.record_n(10);
        assert_eq!(counter.count(), 10);
        assert!(counter.is_exceeded());
    }

    #[test]
    fn test_query_counter_record_n_zero_is_noop() {
        let counter = QueryCounter::new(5);
        counter.record_n(0);
        assert_eq!(counter.count(), 0);
    }

    #[test]
    fn test_query_counter_threshold_boundary() {
        let counter = QueryCounter::new(20);
        assert_eq!(counter.threshold(), 20);
        for _ in 0..20 {
            counter.record();
        }
        assert_eq!(counter.count(), 20);
        // 严格大于阈值才告警，等于阈值不算
        assert!(!counter.is_exceeded());
        counter.record();
        assert!(counter.is_exceeded());
    }

    #[test]
    fn test_query_counter_clone_shares_state() {
        let counter = QueryCounter::new(5);
        let cloned = counter.clone();
        counter.record();
        assert_eq!(cloned.count(), 1);
        cloned.record();
        assert_eq!(counter.count(), 2);
    }

    #[test]
    fn test_config_default() {
        let cfg = NPlusOneConfig::default();
        assert!(cfg.enabled);
        assert_eq!(cfg.query_threshold, DEFAULT_QUERY_THRESHOLD);
        assert_eq!(cfg.query_threshold, 20);
    }

    #[test]
    #[serial]
    fn test_config_from_env_threshold() {
        // 注意：env var 测试在并行执行下可能存在竞争，这里仅验证读取逻辑
        std::env::set_var("NPLUSONE_THRESHOLD", "50");
        let cfg = NPlusOneConfig::from_env();
        assert_eq!(cfg.query_threshold, 50);
        std::env::remove_var("NPLUSONE_THRESHOLD");
    }

    #[test]
    #[serial]
    fn test_config_from_env_enabled_flag() {
        std::env::set_var("NPLUSONE_ENABLED", "false");
        let cfg = NPlusOneConfig::from_env();
        assert!(!cfg.enabled);
        std::env::remove_var("NPLUSONE_ENABLED");

        std::env::set_var("NPLUSONE_ENABLED", "0");
        let cfg = NPlusOneConfig::from_env();
        assert!(!cfg.enabled);
        std::env::remove_var("NPLUSONE_ENABLED");

        std::env::set_var("NPLUSONE_ENABLED", "yes");
        let cfg = NPlusOneConfig::from_env();
        assert!(cfg.enabled);
        std::env::remove_var("NPLUSONE_ENABLED");
    }

    #[test]
    #[serial]
    fn test_config_from_env_invalid_threshold_falls_back() {
        std::env::set_var("NPLUSONE_THRESHOLD", "not-a-number");
        let cfg = NPlusOneConfig::from_env();
        assert_eq!(cfg.query_threshold, DEFAULT_QUERY_THRESHOLD);
        std::env::remove_var("NPLUSONE_THRESHOLD");
    }

    // ===== 新增：QueryCounter 基础测试 =====

    #[test]
    fn test_new_counter_has_zero_count() {
        let counter = QueryCounter::new(10);
        assert_eq!(counter.count(), 0);
        assert!(!counter.is_exceeded());
        assert_eq!(counter.threshold(), 10);
    }

    #[test]
    fn test_record_accumulates_to_count() {
        let counter = QueryCounter::new(100);
        for _ in 0..5 {
            counter.record();
        }
        assert_eq!(counter.count(), 5);
        assert!(!counter.is_exceeded());
    }

    #[test]
    fn test_record_n_with_large_value() {
        let counter = QueryCounter::new(100);
        counter.record_n(1000);
        assert_eq!(counter.count(), 1000);
        assert!(counter.is_exceeded());
    }

    #[test]
    fn test_is_exceeded_false_below_threshold() {
        let counter = QueryCounter::new(10);
        counter.record_n(9);
        assert!(!counter.is_exceeded());
        counter.record();
        assert_eq!(counter.count(), 10);
        // 等于阈值不算超过（严格大于）
        assert!(!counter.is_exceeded());
    }

    #[test]
    fn test_threshold_zero_exceeded_after_one_record() {
        let counter = QueryCounter::new(0);
        // count=0, threshold=0: 0 > 0 is false
        assert!(!counter.is_exceeded());
        counter.record();
        assert_eq!(counter.count(), 1);
        // 1 > 0 is true
        assert!(counter.is_exceeded());
    }

    #[test]
    fn test_record_and_record_n_combined() {
        let counter = QueryCounter::new(100);
        counter.record();
        counter.record_n(5);
        counter.record();
        counter.record_n(3);
        assert_eq!(counter.count(), 10);
    }

    #[test]
    fn test_record_n_one_equivalent_to_record() {
        let counter1 = QueryCounter::new(10);
        let counter2 = QueryCounter::new(10);
        counter1.record();
        counter2.record_n(1);
        assert_eq!(counter1.count(), counter2.count());
        assert_eq!(counter1.count(), 1);
    }

    // ===== 新增：NPlusOneConfig 测试 =====

    #[test]
    fn test_config_clone_preserves_all_fields() {
        let cfg = NPlusOneConfig {
            query_threshold: 42,
            enabled: false,
        };
        let cloned = cfg.clone();
        assert_eq!(cloned.query_threshold, 42);
        assert!(!cloned.enabled);
    }

    #[test]
    fn test_config_custom_threshold_and_disabled() {
        let cfg = NPlusOneConfig {
            query_threshold: 5,
            enabled: false,
        };
        assert_eq!(cfg.query_threshold, 5);
        assert!(!cfg.enabled);
    }

    #[test]
    fn test_default_threshold_constant_value() {
        assert_eq!(DEFAULT_QUERY_THRESHOLD, 20);
    }

    #[test]
    fn test_query_counter_debug_repr_compiles() {
        let counter = QueryCounter::new(15);
        let debug_str = format!("{:?}", counter);
        assert!(debug_str.contains("QueryCounter"));
    }

    #[test]
    fn test_config_debug_repr_compiles() {
        let cfg = NPlusOneConfig::default();
        let debug_str = format!("{:?}", cfg);
        assert!(debug_str.contains("NPlusOneConfig"));
        assert!(debug_str.contains("20"));
    }

    // ===== 新增：中间件行为测试 =====

    async fn handler_requires_counter(
        axum::Extension(counter): axum::Extension<QueryCounter>,
    ) -> axum::http::StatusCode {
        counter.record();
        axum::http::StatusCode::OK
    }

    async fn handler_exceeds_threshold(
        axum::Extension(counter): axum::Extension<QueryCounter>,
    ) -> axum::http::StatusCode {
        for _ in 0..100 {
            counter.record();
        }
        axum::http::StatusCode::OK
    }

    #[tokio::test]
    async fn test_middleware_disabled_does_not_inject_counter() {
        use axum::{body::Body, http::StatusCode, routing::get, Router};
        use tower::ServiceExt;

        let config = NPlusOneConfig {
            query_threshold: 5,
            enabled: false,
        };
        let app = Router::new()
            .route("/", get(handler_requires_counter))
            .layer(axum::middleware::from_fn_with_state(
                config,
                n_plus_one_middleware,
            ));
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/")
                    .body(Body::empty())
                    .expect("build request"),
            )
            .await
            .expect("oneshot failed");
        // 未注入 counter → Extension extractor 失败 → 500
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[tokio::test]
    async fn test_middleware_enabled_injects_counter() {
        use axum::{body::Body, http::StatusCode, routing::get, Router};
        use tower::ServiceExt;

        let config = NPlusOneConfig {
            query_threshold: 5,
            enabled: true,
        };
        let app = Router::new()
            .route("/", get(handler_requires_counter))
            .layer(axum::middleware::from_fn_with_state(
                config,
                n_plus_one_middleware,
            ));
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/")
                    .body(Body::empty())
                    .expect("build request"),
            )
            .await
            .expect("oneshot failed");
        // 注入了 counter → handler 正常执行 → 200
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_middleware_exceeded_does_not_block() {
        use axum::{body::Body, http::StatusCode, routing::get, Router};
        use tower::ServiceExt;

        let config = NPlusOneConfig {
            query_threshold: 5,
            enabled: true,
        };
        let app = Router::new()
            .route("/", get(handler_exceeds_threshold))
            .layer(axum::middleware::from_fn_with_state(
                config,
                n_plus_one_middleware,
            ));
        let response = app
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/")
                    .body(Body::empty())
                    .expect("build request"),
            )
            .await
            .expect("oneshot failed");
        // 超过阈值只记录 warning 日志，不阻塞请求 → 200
        assert_eq!(response.status(), StatusCode::OK);
    }
}
