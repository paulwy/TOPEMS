use super::circuit_breaker::{is_failure, CircuitBreaker};
use super::error::ServiceClientResult;
use super::metrics::{ClientMetrics, ClientMetricsSnapshot};
use opentelemetry::global;
use reqwest::{Client, RequestBuilder};
use serde::{de::DeserializeOwned, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use topems_shared_core::error::TopemsError;

struct TraceHeaderInjector(HashMap<String, String>);

impl opentelemetry::propagation::Injector for TraceHeaderInjector {
    fn set(&mut self, key: &str, value: String) {
        self.0.insert(key.to_string(), value);
    }
}

#[derive(Clone)]
pub struct BaseServiceClient {
    client: Client,
    base_url: String,
    auth_token: Option<String>,
    custom_headers: HashMap<String, String>,
    /// 服务调用熔断器（clone 间共享，防下游故障雪崩）。
    breaker: Arc<CircuitBreaker>,
    /// 客户端实时运行监控（clone 间共享，供 metrics/诊断消费）。
    metrics: Arc<ClientMetrics>,
}

impl BaseServiceClient {
    pub fn new(base_url: impl Into<String>) -> ServiceClientResult<Self> {
        let base_url = base_url.into();

        // 验证 URL 有效性
        if base_url.is_empty() {
            return Err(TopemsError::InvalidUrl("Base URL cannot be empty".into()));
        }

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(5))
            .build()?;

        Ok(Self {
            client,
            base_url,
            auth_token: None,
            custom_headers: HashMap::new(),
            breaker: Arc::new(CircuitBreaker::from_env()),
            metrics: Arc::new(ClientMetrics::new()),
        })
    }

    /// 当前是否处于熔断打开态（供诊断/metrics）。
    pub fn circuit_is_open(&self) -> bool {
        self.breaker.is_open()
    }

    /// 客户端实时运行监控快照（请求量 / 在途 / 成功率 / 平均耗时 / 熔断拦截）。
    pub fn metrics(&self) -> ClientMetricsSnapshot {
        self.metrics
            .snapshot(self.breaker.is_open(), &self.base_url)
    }

    fn build_url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.get(&url);
        self.execute_request(request).await
    }

    pub async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.post(&url).json(body);
        self.execute_request(request).await
    }

    /// POST with body，附加 per-request 额外 header（如 accept-language），
    /// 不污染共享客户端的持久化 custom_headers。
    pub async fn post_with_headers<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
        extra_headers: &[(&str, &str)],
    ) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let mut request = self.client.post(&url).json(body);
        request = self.apply_headers(request);
        for &(key, value) in extra_headers {
            request = request.header(key, value);
        }
        self.execute_request(request).await
    }

    pub async fn post_without_body<T: DeserializeOwned>(
        &self,
        path: &str,
    ) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.post(&url);
        self.execute_request(request).await
    }

    pub async fn put<T: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.put(&url).json(body);
        self.execute_request(request).await
    }

    pub async fn delete<T: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        let url = self.build_url(path);
        let request = self.client.delete(&url);
        self.execute_request(request).await
    }

    async fn execute_request<T: DeserializeOwned>(
        &self,
        request: RequestBuilder,
    ) -> ServiceClientResult<T> {
        // 熔断快速失败：OPEN 期间直接返回，不发请求
        if !self.breaker.allow_request() {
            self.metrics.record_circuit_block();
            return Err(CircuitBreaker::circuit_open_error());
        }
        let started = Instant::now();
        let _guard = self.metrics.begin_request();
        let result = self.execute_request_inner(request).await;
        let elapsed_ns = started.elapsed().as_nanos() as u64;
        match &result {
            Ok(_) => {
                self.breaker.record_success();
                self.metrics.record_success(elapsed_ns);
            }
            Err(e) => {
                if is_failure(e) {
                    self.breaker.record_failure();
                }
                self.metrics.record_failure(elapsed_ns);
            }
        }
        result
    }

    async fn execute_request_inner<T: DeserializeOwned>(
        &self,
        request: RequestBuilder,
    ) -> ServiceClientResult<T> {
        let response = self.apply_headers(request).send().await?;

        let status_code = response.status().as_u16();

        if !response.status().is_success() {
            let error_message = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".into());

            return Err(TopemsError::ServiceError {
                status_code,
                message: error_message,
            });
        }

        let result = response.json::<T>().await?;

        Ok(result)
    }

    pub async fn get_without_response(&self, path: &str) -> ServiceClientResult<()> {
        if !self.breaker.allow_request() {
            self.metrics.record_circuit_block();
            return Err(CircuitBreaker::circuit_open_error());
        }
        let started = Instant::now();
        let _guard = self.metrics.begin_request();
        let result = self.get_without_response_inner(path).await;
        let elapsed_ns = started.elapsed().as_nanos() as u64;
        match &result {
            Ok(_) => {
                self.breaker.record_success();
                self.metrics.record_success(elapsed_ns);
            }
            Err(e) => {
                if is_failure(e) {
                    self.breaker.record_failure();
                }
                self.metrics.record_failure(elapsed_ns);
            }
        }
        result
    }

    async fn get_without_response_inner(&self, path: &str) -> ServiceClientResult<()> {
        let url = self.build_url(path);
        let response = self.client.get(&url).send().await?;

        if !response.status().is_success() {
            let status_code = response.status().as_u16();
            let error_message = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".into());

            return Err(TopemsError::ServiceError {
                status_code,
                message: error_message,
            });
        }

        Ok(())
    }

    /// 发送 GET 请求并返回原始 Response（用于代理透传场景）
    /// 支持额外的 query 参数和 headers（如 x-tenant-id）
    pub async fn get_raw_response(
        &self,
        path: &str,
        query: Option<&[(&str, &str)]>,
        extra_headers: &[(&str, &str)],
    ) -> Result<reqwest::Response, reqwest::Error> {
        let started = Instant::now();
        let _guard = self.metrics.begin_request();
        let url = self.build_url(path);
        let mut request = self.client.get(&url);
        if let Some(q) = query {
            request = request.query(q);
        }
        let mut request = self.apply_headers(request);
        for &(key, value) in extra_headers {
            request = request.header(key, value);
        }
        let result = request.send().await;
        let elapsed_ns = started.elapsed().as_nanos() as u64;
        match &result {
            Ok(_) => self.metrics.record_success(elapsed_ns),
            Err(_) => self.metrics.record_failure(elapsed_ns),
        }
        result
    }

    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.auth_token = Some(token.into());
    }

    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.custom_headers.insert(key.into(), value.into());
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    fn apply_headers(&self, request: RequestBuilder) -> RequestBuilder {
        let mut request = request;

        if let Some(token) = &self.auth_token {
            request = request.bearer_auth(token);
        }

        for (key, value) in &self.custom_headers {
            request = request.header(key, value);
        }

        // 注入 OpenTelemetry trace context，实现跨服务链路追踪
        let mut injector = TraceHeaderInjector(HashMap::new());
        global::get_text_map_propagator(|propagator| {
            propagator.inject_context(&opentelemetry::Context::current(), &mut injector);
        });
        for (key, value) in injector.0 {
            request = request.header(key, value);
        }

        request
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use opentelemetry::propagation::Injector;

    #[test]
    fn new_with_valid_url_succeeds() {
        let client = BaseServiceClient::new("http://localhost:8011");
        assert!(client.is_ok());
    }

    #[test]
    fn new_with_https_url_succeeds() {
        let client = BaseServiceClient::new("https://api.example.com");
        assert!(client.is_ok());
    }

    #[test]
    fn new_with_empty_url_returns_invalid_url_error() {
        let result = BaseServiceClient::new("");
        match result {
            Err(TopemsError::InvalidUrl(msg)) => {
                assert_eq!(msg, "Base URL cannot be empty");
            }
            Err(other) => panic!("Expected InvalidUrl, got {:?}", other),
            Ok(_) => panic!("Expected error for empty URL"),
        }
    }

    #[test]
    fn base_url_returns_configured_url() {
        let client = BaseServiceClient::new("http://example.com:8080").unwrap();
        assert_eq!(client.base_url(), "http://example.com:8080");
    }

    #[test]
    fn build_url_concatenates_base_and_path() {
        let client = BaseServiceClient::new("http://localhost:9090").unwrap();
        assert_eq!(
            client.build_url("/api/test"),
            "http://localhost:9090/api/test"
        );
        assert_eq!(client.build_url("/health"), "http://localhost:9090/health");
        assert_eq!(client.build_url(""), "http://localhost:9090");
    }

    #[test]
    fn build_url_preserves_query_params_in_path() {
        let client = BaseServiceClient::new("http://localhost:9090").unwrap();
        assert_eq!(
            client.build_url("/api/test?page=1&size=10"),
            "http://localhost:9090/api/test?page=1&size=10"
        );
    }

    #[test]
    fn set_auth_token_does_not_panic() {
        let mut client = BaseServiceClient::new("http://localhost:8011").unwrap();
        client.set_auth_token("bearer-token-123");
    }

    #[test]
    fn add_header_does_not_panic() {
        let mut client = BaseServiceClient::new("http://localhost:8011").unwrap();
        client.add_header("X-Tenant-Id", "tenant-001");
        client.add_header("X-Request-Id", "req-abc");
    }

    #[test]
    fn trace_header_injector_set_stores_entries() {
        let mut injector = TraceHeaderInjector(HashMap::new());
        injector.set("traceparent", "00-abc-def-01".to_string());
        injector.set("tracestate", "key=value".to_string());
        assert_eq!(
            injector.0.get("traceparent"),
            Some(&"00-abc-def-01".to_string())
        );
        assert_eq!(injector.0.get("tracestate"), Some(&"key=value".to_string()));
        assert_eq!(injector.0.len(), 2);
    }

    #[test]
    fn trace_header_injector_overwrites_duplicate_keys() {
        let mut injector = TraceHeaderInjector(HashMap::new());
        injector.set("key", "value1".to_string());
        injector.set("key", "value2".to_string());
        assert_eq!(injector.0.len(), 1);
        assert_eq!(injector.0.get("key"), Some(&"value2".to_string()));
    }

    #[test]
    fn trace_header_injector_starts_empty() {
        let injector = TraceHeaderInjector(HashMap::new());
        assert!(injector.0.is_empty());
    }

    #[tokio::test]
    async fn get_without_response_on_unreachable_server_returns_error() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client.get_without_response("/health").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn get_on_unreachable_server_returns_error() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let result: ServiceClientResult<serde_json::Value> = client.get("/api/test").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn get_raw_response_on_unreachable_server_returns_error() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let result = client.get_raw_response("/api/test", None, &[]).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn get_raw_response_with_query_on_unreachable_returns_error() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let query: &[(&str, &str)] = &[("page", "1"), ("size", "10")];
        let result = client.get_raw_response("/api/test", Some(query), &[]).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn get_raw_response_with_extra_headers_on_unreachable_returns_error() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let headers: &[(&str, &str)] = &[("x-tenant-id", "tenant-001")];
        let result = client.get_raw_response("/api/test", None, headers).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn metrics_counts_failed_request() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let _: ServiceClientResult<serde_json::Value> = client.get("/api/test").await;
        let snap = client.metrics();
        assert_eq!(snap.total_requests, 1);
        assert_eq!(snap.failure_requests, 1);
        assert_eq!(snap.success_requests, 0);
        assert_eq!(snap.in_flight, 0);
        assert!(snap.avg_duration_ms >= 0.0);
        assert_eq!(snap.base_url, "http://127.0.0.1:1");
    }

    #[tokio::test]
    async fn metrics_shared_across_clones() {
        let client = BaseServiceClient::new("http://127.0.0.1:1").unwrap();
        let clone = client.clone();
        let _: ServiceClientResult<serde_json::Value> = clone.get("/api/test").await;
        let snap = client.metrics();
        assert_eq!(snap.total_requests, 1);
        assert_eq!(snap.failure_requests, 1);
    }
}
