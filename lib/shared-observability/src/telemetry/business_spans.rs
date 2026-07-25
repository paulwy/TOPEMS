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
