use axum::{
    body::Body,
    http::{HeaderName, HeaderValue, Request},
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct SecurityHeadersConfig {
    pub x_content_type_options: Option<String>,
    pub x_frame_options: Option<String>,
    pub x_xss_protection: Option<String>,
    pub strict_transport_security: Option<String>,
    pub content_security_policy: Option<String>,
    pub referrer_policy: Option<String>,
    pub permissions_policy: Option<String>,
}

impl Default for SecurityHeadersConfig {
    fn default() -> Self {
        Self {
            x_content_type_options: Some("nosniff".to_string()),
            x_frame_options: Some("DENY".to_string()),
            x_xss_protection: Some("1; mode=block".to_string()),
            strict_transport_security: Some(format!(
                "max-age={}; includeSubDomains",
                Duration::from_secs(31536000).as_secs()
            )),
            content_security_policy: Some("default-src 'self'".to_string()),
            referrer_policy: Some("strict-origin-when-cross-origin".to_string()),
            permissions_policy: Some("geolocation=(), microphone=(), camera=()".to_string()),
        }
    }
}

impl SecurityHeadersConfig {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn production() -> Self {
        Self {
            x_content_type_options: Some("nosniff".to_string()),
            x_frame_options: Some("DENY".to_string()),
            x_xss_protection: Some("1; mode=block".to_string()),
            strict_transport_security: Some(format!(
                "max-age={}; includeSubDomains; preload",
                Duration::from_secs(31536000).as_secs()
            )),
            content_security_policy: Some("default-src 'self'; \
                 script-src 'self' 'strict-dynamic'; \
                 style-src 'self' 'unsafe-inline'; \
                 img-src 'self' data: https:; \
                 font-src 'self'; \
                 object-src 'none'; \
                 frame-src 'none'; \
                 connect-src 'self'; \
                 base-uri 'self'; \
                 form-action 'self'; \
                 upgrade-insecure-requests;".to_string()),
            referrer_policy: Some("strict-origin-when-cross-origin".to_string()),
            permissions_policy: Some(
                "geolocation=(), microphone=(), camera=(), payment=(), usb=(), vr=()".to_string(),
            ),
        }
    }

    pub fn development() -> Self {
        Self {
            x_content_type_options: Some("nosniff".to_string()),
            x_frame_options: Some("SAMEORIGIN".to_string()),
            x_xss_protection: Some("1; mode=block".to_string()),
            strict_transport_security: None,
            content_security_policy: Some("default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; \
                 script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; \
                 style-src 'self' 'unsafe-inline'; \
                 img-src 'self' data: http: https:; \
                 font-src 'self'; \
                 connect-src 'self' http://localhost:* ws://localhost:*; \
                 frame-src 'self' http://localhost:*; \
                 prefetch-src 'self' http://localhost:*;".to_string()),
            referrer_policy: Some("strict-origin-when-cross-origin".to_string()),
            permissions_policy: Some("geolocation=(), microphone=(), camera=()".to_string()),
        }
    }

    pub fn from_env() -> Self {
        match std::env::var("ENVIRONMENT").unwrap_or_default().as_str() {
            "production" | "prod" => Self::production(),
            "development" | "dev" => Self::development(),
            _ => Self::default(),
        }
    }

    pub fn with_x_content_type_options(mut self, value: impl Into<String>) -> Self {
        self.x_content_type_options = Some(value.into());
        self
    }

    pub fn with_x_frame_options(mut self, value: impl Into<String>) -> Self {
        self.x_frame_options = Some(value.into());
        self
    }

    pub fn with_x_xss_protection(mut self, value: impl Into<String>) -> Self {
        self.x_xss_protection = Some(value.into());
        self
    }

    pub fn with_strict_transport_security(
        mut self,
        max_age: Duration,
        include_subdomains: bool,
    ) -> Self {
        let mut value = format!("max-age={}", max_age.as_secs());
        if include_subdomains {
            value.push_str("; includeSubDomains");
        }
        self.strict_transport_security = Some(value);
        self
    }

    pub fn with_strict_transport_security_with_preload(
        mut self,
        max_age: Duration,
        include_subdomains: bool,
        preload: bool,
    ) -> Self {
        let mut value = format!("max-age={}", max_age.as_secs());
        if include_subdomains {
            value.push_str("; includeSubDomains");
        }
        if preload {
            value.push_str("; preload");
        }
        self.strict_transport_security = Some(value);
        self
    }

    pub fn with_content_security_policy(mut self, value: impl Into<String>) -> Self {
        self.content_security_policy = Some(value.into());
        self
    }

    pub fn with_referrer_policy(mut self, value: impl Into<String>) -> Self {
        self.referrer_policy = Some(value.into());
        self
    }

    pub fn with_permissions_policy(mut self, value: impl Into<String>) -> Self {
        self.permissions_policy = Some(value.into());
        self
    }

    pub fn disable_hsts(mut self) -> Self {
        self.strict_transport_security = None;
        self
    }

    pub fn lenient() -> Self {
        Self {
            x_content_type_options: Some("nosniff".to_string()),
            x_frame_options: Some("SAMEORIGIN".to_string()),
            x_xss_protection: Some("1; mode=block".to_string()),
            strict_transport_security: None,
            content_security_policy: Some(
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'".to_string(),
            ),
            referrer_policy: Some("strict-origin-when-cross-origin".to_string()),
            permissions_policy: Some("geolocation=(), microphone=(), camera=()".to_string()),
        }
    }

    pub fn enable_feature_policy(mut self, features: &[&str]) -> Self {
        self.permissions_policy = Some(features.join(", "));
        self
    }
}

#[derive(Debug, Clone)]
pub struct SecurityHeadersLayer {
    config: Arc<SecurityHeadersConfig>,
}

impl SecurityHeadersLayer {
    pub fn new(config: SecurityHeadersConfig) -> Self {
        Self {
            config: Arc::new(config),
        }
    }

    pub fn config(&self) -> &SecurityHeadersConfig {
        &self.config
    }
}

pub async fn security_headers_middleware(
    layer: Arc<SecurityHeadersLayer>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let mut response = next.run(req).await;
    add_security_headers(&mut response, &layer.config);
    response
}

pub fn create_security_headers_layer(config: SecurityHeadersConfig) -> SecurityHeadersLayer {
    SecurityHeadersLayer::new(config)
}

pub fn add_security_headers<B>(response: &mut Response<B>, config: &SecurityHeadersConfig) {
    let headers = response.headers_mut();

    if let Some(value) = &config.x_content_type_options {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("x-content-type-options"))
                .or_insert(header_value);
        }
    }

    if let Some(value) = &config.x_frame_options {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("x-frame-options"))
                .or_insert(header_value);
        }
    }

    if let Some(value) = &config.x_xss_protection {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("x-xss-protection"))
                .or_insert(header_value);
        }
    }

    if let Some(value) = &config.strict_transport_security {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("strict-transport-security"))
                .or_insert(header_value);
        }
    }

    if let Some(value) = &config.content_security_policy {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("content-security-policy"))
                .or_insert(header_value);
        }
    }

    if let Some(value) = &config.referrer_policy {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("referrer-policy"))
                .or_insert(header_value);
        }
    }

    if let Some(value) = &config.permissions_policy {
        if let Ok(header_value) = HeaderValue::from_str(value) {
            headers
                .entry(HeaderName::from_static("permissions-policy"))
                .or_insert(header_value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    #[test]
    fn test_default_config_has_all_headers() {
        let config = SecurityHeadersConfig::default();
        assert!(config.x_content_type_options.is_some());
        assert!(config.x_frame_options.is_some());
        assert!(config.x_xss_protection.is_some());
        assert!(config.strict_transport_security.is_some());
        assert!(config.content_security_policy.is_some());
        assert!(config.referrer_policy.is_some());
        assert!(config.permissions_policy.is_some());
    }

    #[test]
    fn test_lenient_config() {
        let config = SecurityHeadersConfig::lenient();
        assert_eq!(config.x_frame_options.as_deref(), Some("SAMEORIGIN"));
        assert!(config.strict_transport_security.is_none());
    }

    #[test]
    fn test_builder_methods() {
        let config = SecurityHeadersConfig::new()
            .with_x_frame_options("SAMEORIGIN")
            .with_content_security_policy("default-src 'self'")
            .disable_hsts();

        assert_eq!(config.x_frame_options.as_deref(), Some("SAMEORIGIN"));
        assert!(config.strict_transport_security.is_none());
    }

    #[test]
    fn test_hsts_with_subdomains() {
        let config = SecurityHeadersConfig::new()
            .with_strict_transport_security(Duration::from_secs(3600), true);

        if let Some(hsts) = config.strict_transport_security {
            assert!(hsts.contains("max-age=3600"));
            assert!(hsts.contains("includeSubDomains"));
        } else {
            panic!("Expected HSTS to be set");
        }
    }

    #[test]
    fn test_add_security_headers_to_response() {
        let config = SecurityHeadersConfig::default();
        let mut response = Response::new(());

        add_security_headers(&mut response, &config);

        let headers = response.headers();
        assert!(headers.contains_key("x-content-type-options"));
        assert!(headers.contains_key("x-frame-options"));
        assert!(headers.contains_key("x-xss-protection"));
        assert!(headers.contains_key("strict-transport-security"));
        assert!(headers.contains_key("content-security-policy"));
        assert!(headers.contains_key("referrer-policy"));
        assert!(headers.contains_key("permissions-policy"));
    }

    #[test]
    fn test_add_security_headers_does_not_overwrite() {
        let config = SecurityHeadersConfig::default();
        let mut response = Response::builder()
            .status(StatusCode::OK)
            .body(())
            .expect("Failed to build test response");

        response.headers_mut().insert(
            HeaderName::from_static("x-frame-options"),
            HeaderValue::from_static("ALLOW-FROM https://example.com"),
        );

        add_security_headers(&mut response, &config);

        assert_eq!(
            response
                .headers()
                .get("x-frame-options")
                .expect("Expected x-frame-options header"),
            "ALLOW-FROM https://example.com"
        );
    }
}
