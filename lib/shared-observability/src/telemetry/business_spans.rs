use std::time::Instant;
use tracing::info_span;

pub async fn trace_db_query<T>(
    sql: &str,
    params: &[&str],
    f: impl std::future::Future<Output = Result<T, sqlx::Error>>,
) -> Result<T, sqlx::Error> {
    let span = info_span!("db_query", sql = %sql);
    let _enter = span.enter();

    let start = Instant::now();
    let result = f.await;
    let duration = start.elapsed();

    tracing::info!(
        db.query.duration_ms = duration.as_millis(),
        db.query.params = ?params,
        db.query.success = result.is_ok()
    );

    result
}

pub async fn trace_external_call<T>(
    url: &str,
    method: &str,
    f: impl std::future::Future<Output = Result<T, reqwest::Error>>,
) -> Result<T, reqwest::Error> {
    let span = info_span!("external_call", url = %url, method = %method);
    let _enter = span.enter();

    let start = Instant::now();
    let result = f.await;
    let duration = start.elapsed();

    tracing::info!(
        external.call.duration_ms = duration.as_millis(),
        external.call.success = result.is_ok()
    );

    result
}

pub async fn trace_rabbitmq_publish<T>(
    exchange: &str,
    routing_key: &str,
    f: impl std::future::Future<Output = Result<T, amqprs::error::Error>>,
) -> Result<T, amqprs::error::Error> {
    let span = info_span!("rabbitmq_publish", exchange = %exchange, routing_key = %routing_key);
    let _enter = span.enter();

    let start = Instant::now();
    let result = f.await;
    let duration = start.elapsed();

    tracing::info!(
        rabbitmq.publish.duration_ms = duration.as_millis(),
        rabbitmq.publish.success = result.is_ok()
    );

    result
}

pub async fn trace_redis_operation<T>(
    command: &str,
    key: Option<&str>,
    f: impl std::future::Future<Output = redis::RedisResult<T>>,
) -> redis::RedisResult<T> {
    let span = info_span!("redis_operation", command = %command);
    let _enter = span.enter();

    let start = Instant::now();
    let result = f.await;
    let duration = start.elapsed();

    if let Some(key) = key {
        tracing::info!(redis.key = %key);
    }

    tracing::info!(
        redis.operation.duration_ms = duration.as_millis(),
        redis.operation.success = result.is_ok()
    );

    result
}

pub async fn trace_service_call<T, E>(
    service: &str,
    endpoint: &str,
    f: impl std::future::Future<Output = Result<T, E>>,
) -> Result<T, E> {
    let span = info_span!("service_client_call", service = %service, endpoint = %endpoint);
    let _enter = span.enter();

    let start = Instant::now();
    let result = f.await;
    let duration = start.elapsed();

    tracing::info!(
        service_call.duration_ms = duration.as_millis(),
        service_call.success = result.is_ok()
    );

    result
}

#[macro_export]
macro_rules! trace_db {
    ($sql:expr, $params:expr, $future:expr) => {
        $crate::telemetry::business_spans::trace_db_query($sql, $params, $future).await
    };
}

#[macro_export]
macro_rules! trace_http {
    ($url:expr, $method:expr, $future:expr) => {
        $crate::telemetry::business_spans::trace_external_call($url, $method, $future).await
    };
}

#[macro_export]
macro_rules! trace_rabbitmq {
    ($exchange:expr, $routing_key:expr, $future:expr) => {
        $crate::telemetry::business_spans::trace_rabbitmq_publish($exchange, $routing_key, $future)
            .await
    };
}

#[macro_export]
macro_rules! trace_redis {
    ($command:expr, $key:expr, $future:expr) => {
        $crate::telemetry::business_spans::trace_redis_operation($command, $key, $future).await
    };
}

#[macro_export]
macro_rules! trace_service {
    ($service:expr, $endpoint:expr, $future:expr) => {
        $crate::telemetry::business_spans::trace_service_call($service, $endpoint, $future).await
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_trace_db_query_ok_returns_value() {
        let result: Result<i32, sqlx::Error> =
            trace_db_query("SELECT 1", &[], async { Ok(42) }).await;
        assert_eq!(result.unwrap(), 42);
    }

    #[tokio::test]
    async fn test_trace_db_query_preserves_result_value() {
        // Larger value to ensure no accidental transformation of the payload.
        let result: Result<u64, sqlx::Error> =
            trace_db_query("SELECT $1", &["42"], async { Ok(1_000_000) }).await;
        assert_eq!(result.unwrap(), 1_000_000);
    }

    #[tokio::test]
    async fn test_trace_db_query_propagates_error() {
        let err = sqlx::Error::Configuration(Box::new(std::io::Error::new(
            std::io::ErrorKind::Other,
            "db test error",
        )));
        let result: Result<i32, sqlx::Error> =
            trace_db_query("SELECT broken", &[], async { Err(err) }).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_trace_external_call_ok_returns_value() {
        let result: Result<i32, reqwest::Error> =
            trace_external_call("http://example.com/api", "GET", async { Ok(7) }).await;
        assert_eq!(result.unwrap(), 7);
    }

    #[tokio::test]
    async fn test_trace_rabbitmq_publish_ok_returns_value() {
        let result: Result<i32, amqprs::error::Error> =
            trace_rabbitmq_publish("amq.topic", "routing.key", async { Ok(1) }).await;
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_trace_redis_operation_ok_without_key() {
        let result: redis::RedisResult<i32> =
            trace_redis_operation("GET", None, async { Ok(99) }).await;
        assert_eq!(result.unwrap(), 99);
    }

    #[tokio::test]
    async fn test_trace_redis_operation_ok_with_key() {
        // Exercises the `if let Some(key)` logging branch.
        let result: redis::RedisResult<String> =
            trace_redis_operation("SET", Some("user:1"), async { Ok("OK".to_string()) }).await;
        assert_eq!(result.unwrap(), "OK");
    }

    #[tokio::test]
    async fn test_trace_service_call_ok_returns_value() {
        let result: Result<i32, std::io::Error> =
            trace_service_call("user-svc", "/users/1", async { Ok(5) }).await;
        assert_eq!(result.unwrap(), 5);
    }

    #[tokio::test]
    async fn test_trace_service_call_propagates_error() {
        let err = std::io::Error::new(std::io::ErrorKind::Other, "service down");
        let result: Result<i32, std::io::Error> =
            trace_service_call("user-svc", "/users/1", async { Err(err) }).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_trace_db_macro_invokes_helper() {
        // The macro should delegate to trace_db_query and return the inner result.
        let result: Result<i32, sqlx::Error> = trace_db!("SELECT 1", &[], async { Ok(123) });
        assert_eq!(result.unwrap(), 123);
    }
}
