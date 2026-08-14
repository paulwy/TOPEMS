use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub version: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealth {
    pub status: String,
    pub uptime: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

#[derive(Clone)]
pub struct GenericServiceClient {
    base_client: BaseServiceClient,
    service_name: String,
}

impl GenericServiceClient {
    pub fn new(
        service_name: impl Into<String>,
        base_url: impl Into<String>,
    ) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
            service_name: service_name.into(),
        })
    }

    pub fn from_env(
        service_name: impl Into<String>,
        env_var: &str,
        default_url: &str,
    ) -> ServiceClientResult<Self> {
        let base_url = std::env::var(env_var).unwrap_or_else(|_| default_url.into());
        Self::new(service_name, base_url)
    }

    pub fn service_name(&self) -> &str {
        &self.service_name
    }

    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.base_client.set_auth_token(token);
    }

    pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
        self.base_client.set_auth_token(token);
        self
    }

    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.base_client.add_header(key, value);
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_detailed_health(&self) -> ServiceClientResult<ServiceHealth> {
        self.base_client.get("/api/health/detailed").await
    }

    pub async fn get_service_info(&self) -> ServiceClientResult<ServiceInfo> {
        self.base_client.get("/api/info").await
    }

    pub async fn get<T: serde::de::DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        self.base_client.get(path).await
    }

    pub async fn post<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        self.base_client.post(path, body).await
    }

    pub async fn put<T: serde::de::DeserializeOwned, B: serde::Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<T> {
        self.base_client.put(path, body).await
    }

    pub async fn delete<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> ServiceClientResult<T> {
        self.base_client.delete(path).await
    }

    pub async fn post_without_body<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> ServiceClientResult<T> {
        self.base_client.post_without_body(path).await
    }
}

#[macro_export]
macro_rules! define_service_client {
    (
        $client_name:ident,
        $env_var:expr,
        $default_url:expr,
        {
            $(
                $(#[$meta:meta])*
                $method_name:ident ( $($param_name:ident : $param_type:ty),* $(,)? ) -> $return_type:ty
                {
                    $http_method:ident => $path_template:expr
                    $(; body: $body_param:ident : $body_type:ty )?
                }
            )*
        }
    ) => {
        #[derive(Clone)]
        pub struct $client_name {
            base: $crate::service_client::generic::GenericServiceClient,
        }

        impl $client_name {
            pub fn new(base_url: impl Into<String>) -> $crate::service_client::error::ServiceClientResult<Self> {
                Ok(Self {
                    base: $crate::service_client::generic::GenericServiceClient::new(
                        stringify!($client_name),
                        base_url,
                    )?,
                })
            }

            pub fn from_env() -> $crate::service_client::error::ServiceClientResult<Self> {
                let base_url = std::env::var($env_var)
                    .unwrap_or_else(|_| $default_url.into());
                Self::new(base_url)
            }

            pub fn set_auth_token(&mut self, token: impl Into<String>) {
                self.base.set_auth_token(token);
            }

            pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
                self.base.set_auth_token(token);
                self
            }

            pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
                self.base.add_header(key, value);
            }

            pub async fn get_health(&self) -> $crate::service_client::error::ServiceClientResult<bool> {
                self.base.get_health().await
            }

            $(
                $(#[$meta])*
                pub async fn $method_name(
                    &self
                    $(, $param_name: $param_type)*
                    $(, $body_param: $body_type)?
                ) -> $crate::service_client::error::ServiceClientResult<$return_type> {
                    let path = format!($path_template $(, $param_name)*);
                    $crate::define_service_client!(
                        @dispatch $http_method,
                        self.base,
                        path
                        $(, $body_param)*
                    )
                }
            )*
        }
    };

    (@dispatch get, $base:expr, $path:expr) => { $base.get(&$path).await };
    (@dispatch delete, $base:expr, $path:expr) => { $base.delete(&$path).await };
    (@dispatch post, $base:expr, $path:expr) => { $base.post_without_body(&$path).await };
    (@dispatch post, $base:expr, $path:expr, $body:expr) => { $base.post(&$path, $body).await };
    (@dispatch put, $base:expr, $path:expr, $body:expr) => { $base.put(&$path, $body).await };
    (@dispatch patch, $base:expr, $path:expr, $body:expr) => { $base.put(&$path, $body).await };
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== ServiceInfo serde tests ==========

    #[test]
    fn service_info_serde_roundtrip() {
        let original = ServiceInfo {
            name: "finance-service".to_string(),
            version: "1.2.3".to_string(),
            status: "healthy".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ServiceInfo = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn service_info_deserialize_from_json() {
        let json = r#"{"name":"iam","version":"0.1.0","status":"running"}"#;
        let info: ServiceInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.name, "iam");
        assert_eq!(info.version, "0.1.0");
        assert_eq!(info.status, "running");
    }

    // ========== ServiceHealth serde tests ==========

    #[test]
    fn service_health_serde_roundtrip() {
        let original = ServiceHealth {
            status: "ok".to_string(),
            uptime: "3d 4h 5m".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ServiceHealth = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn service_health_deserialize_from_json() {
        let json = r#"{"status":"degraded","uptime":"1h"}"#;
        let health: ServiceHealth = serde_json::from_str(json).unwrap();
        assert_eq!(health.status, "degraded");
        assert_eq!(health.uptime, "1h");
    }

    // ========== ApiResponse<T> serde tests ==========

    #[test]
    fn api_response_with_data_serde_roundtrip() {
        let original = ApiResponse {
            code: 200,
            success: true,
            data: Some(vec![1, 2, 3]),
            message: "ok".to_string(),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ApiResponse<Vec<i32>> = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn api_response_without_data_serde_roundtrip() {
        let original: ApiResponse<i32> = ApiResponse {
            code: 404,
            success: false,
            data: None,
            message: "not found".to_string(),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ApiResponse<i32> = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn api_response_with_string_data_serde_roundtrip() {
        let original = ApiResponse {
            code: 200,
            success: true,
            data: Some("hello".to_string()),
            message: "success".to_string(),
            timestamp: "2024-06-15T12:30:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ApiResponse<String> = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn api_response_with_json_value_data_serde_roundtrip() {
        let original = ApiResponse {
            code: 200,
            success: true,
            data: Some(serde_json::json!({"key": "value", "nested": {"a": 1}})),
            message: "ok".to_string(),
            timestamp: "2024-01-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ApiResponse<serde_json::Value> = serde_json::from_str(&json).unwrap();
        let val1 = serde_json::to_value(&original).unwrap();
        let val2 = serde_json::to_value(&deserialized).unwrap();
        assert_eq!(val1, val2);
    }

    #[test]
    fn api_response_deserialize_from_json_with_data() {
        let json = r#"{"code":200,"success":true,"data":[1,2,3],"message":"ok","timestamp":"t"}"#;
        let resp: ApiResponse<Vec<i32>> = serde_json::from_str(json).unwrap();
        assert_eq!(resp.code, 200);
        assert!(resp.success);
        assert_eq!(resp.data, Some(vec![1, 2, 3]));
        assert_eq!(resp.message, "ok");
    }

    #[test]
    fn api_response_deserialize_from_json_without_data() {
        let json = r#"{"code":500,"success":false,"data":null,"message":"error","timestamp":"t"}"#;
        let resp: ApiResponse<i32> = serde_json::from_str(json).unwrap();
        assert_eq!(resp.code, 500);
        assert!(!resp.success);
        assert!(resp.data.is_none());
    }

    // ========== GenericServiceClient construction tests ==========

    #[test]
    fn generic_client_new_succeeds() {
        let client = GenericServiceClient::new("test-service", "http://localhost:9999");
        assert!(client.is_ok());
        assert_eq!(client.unwrap().service_name(), "test-service");
    }

    #[test]
    fn generic_client_new_with_empty_url_fails() {
        let result = GenericServiceClient::new("test-service", "");
        assert!(result.is_err());
    }

    #[test]
    fn generic_client_from_env_with_default_url_succeeds() {
        let client = GenericServiceClient::from_env(
            "svc",
            "TOPEMS_TEST_NONEXISTENT_ENV_VAR_12345",
            "http://localhost:8888",
        );
        assert!(client.is_ok());
        assert_eq!(client.unwrap().service_name(), "svc");
    }

    #[test]
    fn generic_client_service_name_returns_configured_name() {
        let client =
            GenericServiceClient::new("my-custom-service", "http://localhost:3000").unwrap();
        assert_eq!(client.service_name(), "my-custom-service");
    }

    #[test]
    fn generic_client_set_auth_token_does_not_panic() {
        let mut client = GenericServiceClient::new("svc", "http://localhost:3000").unwrap();
        client.set_auth_token("tok-abc");
    }

    #[test]
    fn generic_client_with_auth_token_returns_self() {
        let client = GenericServiceClient::new("svc", "http://localhost:3000").unwrap();
        let _client = client.with_auth_token("tok-xyz");
    }

    #[test]
    fn generic_client_add_header_does_not_panic() {
        let mut client = GenericServiceClient::new("svc", "http://localhost:3000").unwrap();
        client.add_header("X-Custom", "val");
    }

    #[tokio::test]
    async fn generic_client_get_health_unreachable_returns_false() {
        let client = GenericServiceClient::new("svc", "http://127.0.0.1:1").unwrap();
        let result = client.get_health().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), false);
    }
}
