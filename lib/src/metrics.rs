use prometheus::{
    register_histogram_vec, register_int_counter_vec, register_int_gauge, HistogramVec,
    IntCounterVec, IntGauge,
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
}
