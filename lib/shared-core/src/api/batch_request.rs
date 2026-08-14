use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;
use tokio::time::timeout;
use tracing::info;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Default)]
pub enum RequestPriority {
    Low,
    #[default]
    Normal,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRequest {
    pub requests: Vec<SingleRequest>,
    pub timeout_ms: Option<u64>,
    pub max_concurrent: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SingleRequest {
    pub id: String,
    pub method: String,
    pub url: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<serde_json::Value>,
    pub priority: Option<String>,
    pub service_group: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResponse {
    pub success: bool,
    pub results: Vec<SingleResponse>,
    pub successful_count: usize,
    pub failed_count: usize,
    pub total_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SingleResponse {
    pub request_id: String,
    pub status_code: u16,
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
    pub latency_ms: u64,
}

impl BatchRequest {
    pub fn new(requests: Vec<SingleRequest>) -> Self {
        Self {
            requests,
            timeout_ms: None,
            max_concurrent: None,
        }
    }

    pub fn with_timeout(mut self, timeout_ms: u64) -> Self {
        self.timeout_ms = Some(timeout_ms);
        self
    }

    pub fn with_max_concurrent(mut self, max_concurrent: usize) -> Self {
        self.max_concurrent = Some(max_concurrent);
        self
    }
}

pub struct BatchRequestHandler {
    client: Client,
    default_timeout: Duration,
    default_max_concurrent: usize,
}

impl BatchRequestHandler {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            default_timeout: Duration::from_secs(30),
            default_max_concurrent: 10,
        }
    }

    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.default_timeout = timeout;
        self
    }

    pub fn with_max_concurrent(mut self, max_concurrent: usize) -> Self {
        self.default_max_concurrent = max_concurrent;
        self
    }

    pub async fn execute(&self, batch: BatchRequest) -> BatchResponse {
        let start = std::time::Instant::now();

        let timeout_duration = match batch.timeout_ms {
            Some(ms) => Duration::from_millis(ms),
            None => self.default_timeout,
        };

        let max_concurrent = batch.max_concurrent.unwrap_or(self.default_max_concurrent);
        let semaphore = Arc::new(Semaphore::new(max_concurrent));

        let grouped_requests = self.group_by_service(&batch.requests);
        info!(
            "Batch request received: {} requests, {} service groups",
            batch.requests.len(),
            grouped_requests.len()
        );

        let mut tasks = Vec::new();

        for (service, requests) in grouped_requests {
            info!(
                "Processing service group: {} with {} requests",
                service,
                requests.len()
            );

            for req in requests {
                let semaphore_clone = semaphore.clone();
                let client = self.client.clone();
                let timeout_clone = timeout_duration;

                let task = tokio::spawn(async move {
                    let permit = match semaphore_clone.acquire_owned().await {
                        Ok(p) => p,
                        Err(e) => {
                            tracing::error!("Semaphore acquire failed: {}", e);
                            return SingleResponse {
                                request_id: req.id,
                                status_code: 503,
                                success: false,
                                data: None,
                                error: Some("Service temporarily unavailable".to_string()),
                                latency_ms: 0,
                            };
                        }
                    };
                    let _permit = permit;
                    let start = std::time::Instant::now();

                    let result = Self::execute_single_request(&client, &req, timeout_clone).await;
                    let latency = start.elapsed().as_millis() as u64;

                    SingleResponse {
                        request_id: req.id,
                        status_code: result.status_code,
                        success: result.success,
                        data: result.data,
                        error: result.error,
                        latency_ms: latency,
                    }
                });

                tasks.push(task);
            }
        }

        let results: Vec<SingleResponse> = futures::future::join_all(tasks)
            .await
            .into_iter()
            .filter_map(|t| t.ok())
            .collect();

        let successful_count = results.iter().filter(|r| r.success).count();
        let failed_count = results.len() - successful_count;
        let total_time = start.elapsed().as_millis() as u64;

        info!(
            "Batch request completed: {} succeeded, {} failed, total time: {}ms",
            successful_count, failed_count, total_time
        );

        BatchResponse {
            success: failed_count == 0,
            results,
            successful_count,
            failed_count,
            total_time_ms: total_time,
        }
    }

    fn group_by_service(&self, requests: &[SingleRequest]) -> HashMap<String, Vec<SingleRequest>> {
        let mut groups: HashMap<String, Vec<SingleRequest>> = HashMap::new();

        for req in requests {
            let group = req
                .service_group
                .clone()
                .unwrap_or_else(|| self.extract_service_from_url(&req.url));
            groups.entry(group).or_default().push(req.clone());
        }

        groups
    }

    fn extract_service_from_url(&self, url: &str) -> String {
        match url::Url::parse(url) {
            Ok(parsed) => parsed.host_str().unwrap_or("unknown").to_string(),
            Err(_) => "unknown".to_string(),
        }
    }

    async fn execute_single_request(
        client: &Client,
        req: &SingleRequest,
        timeout_duration: Duration,
    ) -> SingleResponseResult {
        let method = match Method::from_bytes(req.method.as_bytes()) {
            Ok(m) => m,
            Err(_) => return SingleResponseResult::error(400, "Invalid HTTP method".to_string()),
        };

        let mut request_builder = client.request(method.clone(), &req.url);

        if let Some(headers) = &req.headers {
            for (key, value) in headers {
                request_builder = request_builder.header(key, value);
            }
        }

        if let Some(body) = &req.body {
            request_builder = request_builder.json(body);
        }

        let request = match request_builder.build() {
            Ok(r) => r,
            Err(e) => {
                return SingleResponseResult::error(400, format!("Failed to build request: {}", e));
            }
        };

        match timeout(timeout_duration, client.execute(request)).await {
            Ok(response) => match response {
                Ok(response) => {
                    let status_code = response.status().as_u16();
                    let success = response.status().is_success();

                    let text = response.text().await.unwrap_or_default();

                    match serde_json::from_str::<serde_json::Value>(&text) {
                        Ok(data) => SingleResponseResult {
                            status_code,
                            success,
                            data: Some(data),
                            error: None,
                        },
                        Err(e) => {
                            if success {
                                SingleResponseResult {
                                    status_code,
                                    success: true,
                                    data: Some(serde_json::json!({ "raw": text })),
                                    error: None,
                                }
                            } else {
                                SingleResponseResult {
                                    status_code,
                                    success: false,
                                    data: None,
                                    error: Some(format!("{}: {}", e, text)),
                                }
                            }
                        }
                    }
                }
                Err(e) => SingleResponseResult::error(500, format!("Request failed: {}", e)),
            },
            Err(_) => SingleResponseResult::error(408, "Request timeout".to_string()),
        }
    }
}

struct SingleResponseResult {
    status_code: u16,
    success: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

impl SingleResponseResult {
    fn error(status_code: u16, message: String) -> Self {
        Self {
            status_code,
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

impl Default for BatchRequestHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_request_construction() {
        let requests = vec![SingleRequest {
            id: "1".to_string(),
            method: "GET".to_string(),
            url: "http://localhost:8000/api/test".to_string(),
            headers: None,
            body: None,
            priority: None,
            service_group: None,
        }];

        let batch = BatchRequest::new(requests)
            .with_timeout(5000)
            .with_max_concurrent(5);

        assert_eq!(batch.requests.len(), 1);
        assert_eq!(batch.timeout_ms, Some(5000));
        assert_eq!(batch.max_concurrent, Some(5));
    }

    #[test]
    fn test_service_grouping() {
        let handler = BatchRequestHandler::new();

        let requests = vec![
            SingleRequest {
                id: "1".to_string(),
                method: "GET".to_string(),
                url: "http://hrm:8080/api/users".to_string(),
                headers: None,
                body: None,
                priority: None,
                service_group: Some("hrm".to_string()),
            },
            SingleRequest {
                id: "2".to_string(),
                method: "GET".to_string(),
                url: "http://hrm:8080/api/departments".to_string(),
                headers: None,
                body: None,
                priority: None,
                service_group: Some("hrm".to_string()),
            },
            SingleRequest {
                id: "3".to_string(),
                method: "GET".to_string(),
                url: "http://iam:8081/api/roles".to_string(),
                headers: None,
                body: None,
                priority: None,
                service_group: Some("iam".to_string()),
            },
        ];

        let groups = handler.group_by_service(&requests);

        assert_eq!(groups.len(), 2);
        assert_eq!(groups.get("hrm").unwrap().len(), 2);
        assert_eq!(groups.get("iam").unwrap().len(), 1);
    }

    #[test]
    fn test_priority_ordering() {
        let high = RequestPriority::High;
        let normal = RequestPriority::Normal;
        let low = RequestPriority::Low;

        assert!(high > normal);
        assert!(normal > low);
        assert!(high > low);
    }

    #[test]
    fn test_request_priority_default_is_normal() {
        let p: RequestPriority = Default::default();
        assert_eq!(p, RequestPriority::Normal);
    }

    #[test]
    fn test_request_priority_clone_and_equality() {
        let a = RequestPriority::High;
        let b = a.clone();
        assert_eq!(a, b);
        assert_ne!(RequestPriority::Low, RequestPriority::High);
    }

    #[test]
    fn test_request_priority_sort_orders_low_to_high() {
        let mut v = vec![
            RequestPriority::Low,
            RequestPriority::High,
            RequestPriority::Normal,
        ];
        v.sort();
        assert_eq!(
            v,
            vec![
                RequestPriority::Low,
                RequestPriority::Normal,
                RequestPriority::High,
            ]
        );
    }

    #[test]
    fn test_batch_request_new_has_no_options() {
        let batch = BatchRequest::new(vec![]);
        assert!(batch.requests.is_empty());
        assert_eq!(batch.timeout_ms, None);
        assert_eq!(batch.max_concurrent, None);
    }

    #[test]
    fn test_batch_request_builder_chain() {
        let batch = BatchRequest::new(vec![])
            .with_timeout(1000)
            .with_max_concurrent(2);
        assert_eq!(batch.timeout_ms, Some(1000));
        assert_eq!(batch.max_concurrent, Some(2));
    }

    #[test]
    fn test_single_request_serde_roundtrip() {
        let mut headers = HashMap::new();
        headers.insert("X-Test".to_string(), "v".to_string());
        let req = SingleRequest {
            id: "rid".to_string(),
            method: "POST".to_string(),
            url: "http://x/api".to_string(),
            headers: Some(headers),
            body: Some(serde_json::json!({"k": 42})),
            priority: Some("High".to_string()),
            service_group: Some("svc".to_string()),
        };
        let json = serde_json::to_string(&req).expect("serialize");
        let de: SingleRequest = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(de.id, "rid");
        assert_eq!(de.method, "POST");
        assert_eq!(de.url, "http://x/api");
        assert_eq!(
            de.headers.as_ref().unwrap().get("X-Test"),
            Some(&"v".to_string())
        );
        assert_eq!(
            de.body.as_ref().unwrap().get("k"),
            Some(&serde_json::json!(42))
        );
        assert_eq!(de.priority.as_deref(), Some("High"));
        assert_eq!(de.service_group.as_deref(), Some("svc"));
    }

    #[test]
    fn test_batch_request_serde_roundtrip() {
        let batch = BatchRequest::new(vec![SingleRequest {
            id: "1".to_string(),
            method: "GET".to_string(),
            url: "http://a/api".to_string(),
            headers: None,
            body: None,
            priority: None,
            service_group: None,
        }])
        .with_timeout(200)
        .with_max_concurrent(1);
        let json = serde_json::to_string(&batch).expect("serialize");
        let de: BatchRequest = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(de.requests.len(), 1);
        assert_eq!(de.timeout_ms, Some(200));
        assert_eq!(de.max_concurrent, Some(1));
    }

    #[test]
    fn test_batch_response_serde_roundtrip() {
        let resp = BatchResponse {
            success: true,
            results: vec![SingleResponse {
                request_id: "r1".to_string(),
                status_code: 200,
                success: true,
                data: Some(serde_json::json!({"ok": true})),
                error: None,
                latency_ms: 12,
            }],
            successful_count: 1,
            failed_count: 0,
            total_time_ms: 12,
        };
        let json = serde_json::to_string(&resp).expect("serialize");
        let de: BatchResponse = serde_json::from_str(&json).expect("deserialize");
        assert!(de.success);
        assert_eq!(de.successful_count, 1);
        assert_eq!(de.failed_count, 0);
        assert_eq!(de.results[0].status_code, 200);
        assert_eq!(de.results[0].latency_ms, 12);
    }

    #[test]
    fn test_single_response_serde_minimal() {
        let resp = SingleResponse {
            request_id: "r2".to_string(),
            status_code: 500,
            success: false,
            data: None,
            error: Some("boom".to_string()),
            latency_ms: 0,
        };
        let json = serde_json::to_string(&resp).expect("serialize");
        let de: SingleResponse = serde_json::from_str(&json).expect("deserialize");
        assert!(!de.success);
        assert_eq!(de.error.as_deref(), Some("boom"));
        assert!(de.data.is_none());
    }

    #[test]
    fn test_batch_request_handler_default() {
        let handler = BatchRequestHandler::default();
        let _ = handler;
    }

    #[test]
    fn test_batch_request_handler_builder_chain() {
        let handler = BatchRequestHandler::new()
            .with_timeout(Duration::from_secs(10))
            .with_max_concurrent(20);
        let _ = handler;
    }

    #[test]
    fn test_extract_service_from_url_valid() {
        let handler = BatchRequestHandler::new();
        let svc = handler.extract_service_from_url("https://api.example.com:8080/path");
        assert_eq!(svc, "api.example.com");
    }

    #[test]
    fn test_extract_service_from_url_invalid_returns_unknown() {
        let handler = BatchRequestHandler::new();
        let svc = handler.extract_service_from_url("not-a-url");
        assert_eq!(svc, "unknown");
    }

    #[test]
    fn test_group_by_service_uses_url_when_no_group() {
        let handler = BatchRequestHandler::new();
        let requests = vec![
            SingleRequest {
                id: "1".to_string(),
                method: "GET".to_string(),
                url: "http://hrm:8080/a".to_string(),
                headers: None,
                body: None,
                priority: None,
                service_group: None,
            },
            SingleRequest {
                id: "2".to_string(),
                method: "GET".to_string(),
                url: "http://iam:8081/b".to_string(),
                headers: None,
                body: None,
                priority: None,
                service_group: None,
            },
        ];
        let groups = handler.group_by_service(&requests);
        assert_eq!(groups.len(), 2);
        assert!(groups.contains_key("hrm"));
        assert!(groups.contains_key("iam"));
    }

    #[test]
    fn test_single_response_result_error_construction() {
        let r = SingleResponseResult::error(503, "service unavailable".to_string());
        assert_eq!(r.status_code, 503);
        assert!(!r.success);
        assert!(r.data.is_none());
        assert_eq!(r.error.as_deref(), Some("service unavailable"));
    }
}
