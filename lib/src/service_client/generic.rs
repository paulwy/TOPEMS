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
    pub fn new(service_name: impl Into<String>, base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            base_client: BaseServiceClient::new(base_url)?,
            service_name: service_name.into(),
        })
    }

    pub fn from_env(service_name: impl Into<String>, env_var: &str, default_url: &str) -> ServiceClientResult<Self> {
        let base_url = std::env::var(env_var).unwrap_or_else(|_| default_url.into());
        Self::new(service_name, base_url)
    }

    pub fn service_name(&self) -> &str {
        &self.service_name
    }

    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.base_client.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_detailed_health(&self) -> ServiceClientResult<ServiceHealth> {
        self.base_client.get("/api/v1/health/detailed").await
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

    pub async fn delete<T: serde::de::DeserializeOwned>(&self, path: &str) -> ServiceClientResult<T> {
        self.base_client.delete(path).await
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
                    $crate::define_service_client!(@call $http_method, self.base, path $(, $body_param )?)
                }
            )*
        }
    };

    (@call get, $base:expr, $path:expr) => { $base.get(&$path).await };
    (@call delete, $base:expr, $path:expr) => { $base.delete(&$path).await };
    (@call post, $base:expr, $path:expr, $body:expr) => { $base.post(&$path, $body).await };
    (@call put, $base:expr, $path:expr, $body:expr) => { $base.put(&$path, $body).await };
    (@call patch, $base:expr, $path:expr, $body:expr) => { $base.patch(&$path, $body).await };
}
