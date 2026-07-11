use axum::http::HeaderValue;
use std::env;
use tower_http::cors::{AllowOrigin, CorsLayer};

pub fn create_cors_layer() -> CorsLayer {
    let allowed_origins = env::var("CORS_ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000,http://localhost:5173".to_string());

    let origins: Vec<HeaderValue> = allowed_origins
        .split(',')
        .filter_map(|origin| origin.trim().parse().ok())
        .collect();

    let allow_origin = if origins.is_empty() {
        tracing::warn!(
            "No CORS origins configured, using strict default (only localhost for development)"
        );
        AllowOrigin::list(vec![
            "http://localhost:3000".parse().unwrap(),
            "http://localhost:5173".parse().unwrap(),
        ])
    } else {
        tracing::info!("CORS allowed origins: {:?}", origins);
        AllowOrigin::list(origins)
    };

    use axum::http::Method;

    CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
            axum::http::header::UPGRADE,
            axum::http::header::CONNECTION,
            axum::http::header::SEC_WEBSOCKET_KEY,
            axum::http::header::SEC_WEBSOCKET_VERSION,
            axum::http::header::ORIGIN,
        ])
        .allow_credentials(true)
        .max_age(std::time::Duration::from_secs(3600))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cors_layer_creation() {
        let _layer = create_cors_layer();
    }

    #[test]
    fn test_default_origins_are_localhost() {
        std::env::remove_var("CORS_ALLOWED_ORIGINS");
        let _layer = create_cors_layer();
    }

    #[test]
    fn test_custom_origins() {
        std::env::set_var("CORS_ALLOWED_ORIGINS", "https://app.topems.com,https://admin.topems.com");
        let _layer = create_cors_layer();
    }
}