#[macro_export]
macro_rules! init_service_telemetry {
    ($service_name:expr) => {{
        let _ = dotenv::dotenv();
        $crate::telemetry::init_telemetry($service_name)
    }};
}

#[macro_export]
macro_rules! with_telemetry {
    ($router:expr) => {{
        $router.layer(axum::middleware::from_fn(
            $crate::telemetry::telemetry_middleware,
        ))
    }};
}

#[macro_export]
macro_rules! trace_request {
    ($method:expr, $path:expr) => {{
        let span = tracing::info_span!(
            "http_request",
            otel.name = tracing::field::display(format!("{} {}", $method, $path)),
            http.method = %$method,
            http.route = %$path,
        );
        span
    }};
}

#[macro_export]
macro_rules! trace_function {
    ($name:expr) => {{
        let span = tracing::info_span!("function", function.name = %$name);
        span
    }};
}

#[macro_export]
macro_rules! trace_span {
    ($name:expr) => {{
        let span = tracing::info_span!(%$name);
        span
    }};
}
