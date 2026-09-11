use prometheus::{
    register_histogram_vec, register_int_counter_vec, register_int_gauge, register_int_gauge_vec,
    HistogramVec, IntCounterVec, IntGauge, IntGaugeVec,
};
use std::sync::LazyLock;

pub static HTTP_REQUEST_DURATION: LazyLock<HistogramVec> = LazyLock::new(|| {
    register_histogram_vec!(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        &["method", "path", "status"],
        vec![0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    )
    .expect("Failed to register HTTP_REQUEST_DURATION histogram")
});

pub static HTTP_REQUESTS_TOTAL: LazyLock<IntCounterVec> = LazyLock::new(|| {
    register_int_counter_vec!(
        "http_requests_total",
        "Total number of HTTP requests",
        &["method", "path", "status"]
    )
    .expect("Failed to register HTTP_REQUESTS_TOTAL counter")
});

pub static ACTIVE_USERS: LazyLock<IntGauge> = LazyLock::new(|| {
    register_int_gauge!("topems_active_users", "Number of currently active users")
        .expect("Failed to register ACTIVE_USERS gauge")
});

pub static BUSINESS_OPERATION_DURATION: LazyLock<HistogramVec> = LazyLock::new(|| {
    register_histogram_vec!(
        "topems_business_operation_duration_seconds",
        "Business operation duration in seconds",
        &["service", "operation", "status"],
        vec![0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
    )
    .expect("Failed to register BUSINESS_OPERATION_DURATION histogram")
});

pub static BUSINESS_OPERATIONS_TOTAL: LazyLock<IntCounterVec> = LazyLock::new(|| {
    register_int_counter_vec!(
        "topems_business_operations_total",
        "Total number of business operations",
        &["service", "operation", "status"]
    )
    .expect("Failed to register BUSINESS_OPERATIONS_TOTAL counter")
});

pub static DB_QUERY_DURATION: LazyLock<HistogramVec> = LazyLock::new(|| {
    register_histogram_vec!(
        "topems_db_query_duration_seconds",
        "Database query duration in seconds",
        &["service", "query_type", "table"],
        vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
    )
    .expect("Failed to register DB_QUERY_DURATION histogram")
});

// ==================== 缓存指标 ====================

/// 缓存命中总数（按 service、entity、operation 分类）
pub static CACHE_HITS_TOTAL: LazyLock<IntCounterVec> = LazyLock::new(|| {
    register_int_counter_vec!(
        "topems_cache_hits_total",
        "Total number of cache hits",
        &["service", "entity", "operation"]
    )
    .expect("Failed to register CACHE_HITS_TOTAL counter")
});

/// 缓存未命中总数（按 service、entity、operation 分类）
pub static CACHE_MISSES_TOTAL: LazyLock<IntCounterVec> = LazyLock::new(|| {
    register_int_counter_vec!(
        "topems_cache_misses_total",
        "Total number of cache misses",
        &["service", "entity", "operation"]
    )
    .expect("Failed to register CACHE_MISSES_TOTAL counter")
});

/// 缓存写入总数（按 service、entity、operation 分类）
pub static CACHE_SETS_TOTAL: LazyLock<IntCounterVec> = LazyLock::new(|| {
    register_int_counter_vec!(
        "topems_cache_sets_total",
        "Total number of cache writes",
        &["service", "entity", "operation"]
    )
    .expect("Failed to register CACHE_SETS_TOTAL counter")
});

/// 缓存失效总数（按 service、entity、operation 分类）
pub static CACHE_REMOVALS_TOTAL: LazyLock<IntCounterVec> = LazyLock::new(|| {
    register_int_counter_vec!(
        "topems_cache_removals_total",
        "Total number of cache removals",
        &["service", "entity", "operation"]
    )
    .expect("Failed to register CACHE_REMOVALS_TOTAL counter")
});

/// 当前缓存条目数（按 service、entity 分类）
pub static CACHE_ENTRIES: LazyLock<IntGaugeVec> = LazyLock::new(|| {
    register_int_gauge_vec!(
        "topems_cache_entries",
        "Current number of entries in cache",
        &["service", "entity"]
    )
    .expect("Failed to register CACHE_ENTRIES gauge")
});

#[macro_export]
macro_rules! observe_operation {
    ($service:expr, $operation:expr, $body:expr) => {{
        let timer = $crate::metrics::BUSINESS_OPERATION_DURATION
            .with_label_values(&[$service, $operation, "pending"])
            .start_timer();

        let result = $body;

        let status = if result.is_ok() { "success" } else { "error" };

        timer.observe_duration();

        $crate::metrics::BUSINESS_OPERATIONS_TOTAL
            .with_label_values(&[$service, $operation, status])
            .inc();

        result
    }};
}

#[macro_export]
macro_rules! observe_db_query {
    ($service:expr, $query_type:expr, $table:expr, $body:expr) => {{
        let timer = $crate::metrics::DB_QUERY_DURATION
            .with_label_values(&[$service, $query_type, $table])
            .start_timer();
        let result = $body;
        timer.observe_duration();
        result
    }};
}

pub fn init_metrics() {
    LazyLock::force(&HTTP_REQUEST_DURATION);
    LazyLock::force(&HTTP_REQUESTS_TOTAL);
    LazyLock::force(&ACTIVE_USERS);
    LazyLock::force(&BUSINESS_OPERATION_DURATION);
    LazyLock::force(&BUSINESS_OPERATIONS_TOTAL);
    LazyLock::force(&DB_QUERY_DURATION);
    // 缓存指标
    LazyLock::force(&CACHE_HITS_TOTAL);
    LazyLock::force(&CACHE_MISSES_TOTAL);
    LazyLock::force(&CACHE_SETS_TOTAL);
    LazyLock::force(&CACHE_REMOVALS_TOTAL);
    LazyLock::force(&CACHE_ENTRIES);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_metrics_succeeds() {
        init_metrics();
    }

    #[test]
    fn test_init_metrics_is_idempotent() {
        init_metrics();
        init_metrics();
    }

    #[test]
    fn test_lazy_lock_http_request_duration_accessible() {
        LazyLock::force(&HTTP_REQUEST_DURATION);
        let metric = HTTP_REQUEST_DURATION.with_label_values(&["GET", "/test", "200"]);
        metric.observe(0.042);
    }

    #[test]
    fn test_lazy_lock_http_requests_total_accessible() {
        LazyLock::force(&HTTP_REQUESTS_TOTAL);
        let metric = HTTP_REQUESTS_TOTAL.with_label_values(&["POST", "/api", "201"]);
        metric.inc();
    }

    #[test]
    fn test_lazy_lock_active_users_accessible() {
        LazyLock::force(&ACTIVE_USERS);
        ACTIVE_USERS.set(42);
        assert_eq!(ACTIVE_USERS.get(), 42);
        ACTIVE_USERS.inc();
        assert_eq!(ACTIVE_USERS.get(), 43);
        ACTIVE_USERS.dec();
        assert_eq!(ACTIVE_USERS.get(), 42);
    }

    #[test]
    fn test_lazy_lock_business_operation_duration_accessible() {
        LazyLock::force(&BUSINESS_OPERATION_DURATION);
        let metric = BUSINESS_OPERATION_DURATION.with_label_values(&[
            "user_service",
            "create_user",
            "success",
        ]);
        metric.observe(0.123);
    }

    #[test]
    fn test_lazy_lock_business_operations_total_accessible() {
        LazyLock::force(&BUSINESS_OPERATIONS_TOTAL);
        let metric =
            BUSINESS_OPERATIONS_TOTAL.with_label_values(&["user_service", "delete_user", "error"]);
        metric.inc();
    }

    #[test]
    fn test_lazy_lock_db_query_duration_accessible() {
        LazyLock::force(&DB_QUERY_DURATION);
        let metric = DB_QUERY_DURATION.with_label_values(&["user_service", "select", "users"]);
        metric.observe(0.007);
    }

    #[test]
    fn test_all_metrics_are_usable_after_init() {
        init_metrics();

        HTTP_REQUEST_DURATION
            .with_label_values(&["GET", "/a", "200"])
            .observe(0.001);
        HTTP_REQUESTS_TOTAL
            .with_label_values(&["GET", "/a", "200"])
            .inc();
        ACTIVE_USERS.set(1);
        BUSINESS_OPERATION_DURATION
            .with_label_values(&["s", "o", "success"])
            .observe(0.01);
        BUSINESS_OPERATIONS_TOTAL
            .with_label_values(&["s", "o", "success"])
            .inc();
        DB_QUERY_DURATION
            .with_label_values(&["s", "q", "t"])
            .observe(0.001);
    }

    #[test]
    fn test_histogram_vec_observe_multiple_times() {
        init_metrics();
        let h = HTTP_REQUEST_DURATION.with_label_values(&["GET", "/multi", "200"]);
        for _ in 0..10 {
            h.observe(0.05);
        }
    }

    #[test]
    fn test_counter_vec_inc_multiple_times() {
        init_metrics();
        let c = HTTP_REQUESTS_TOTAL.with_label_values(&["POST", "/multi", "201"]);
        for _ in 0..5 {
            c.inc();
        }
    }

    #[test]
    fn test_observe_operation_macro_ok_path() {
        init_metrics();
        let result: Result<i32, &str> = observe_operation!("svc", "op", { Ok(42) });
        assert_eq!(result, Ok(42));
    }

    #[test]
    fn test_observe_operation_macro_err_path() {
        init_metrics();
        let result: Result<i32, &str> = observe_operation!("svc", "op_fail", { Err("boom") });
        assert_eq!(result, Err("boom"));
    }

    #[test]
    fn test_observe_db_query_macro() {
        init_metrics();
        let value = observe_db_query!("svc", "select", "items", { 99 });
        assert_eq!(value, 99);
    }
}
