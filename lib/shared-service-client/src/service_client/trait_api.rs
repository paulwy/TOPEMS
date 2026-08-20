//! 基于 trait 的统一服务通信模式
//!
//! 用 `ServiceApi` trait + `TypedServiceClient<T>` 泛型替代 11 个具体 Client，
//! 消除 O(N²) 的手写 Client 样板代码。
//!
//! # 设计
//!
//! - `ServiceApi`：每个服务实现此 trait，提供 `service_name`、`api_prefix`、
//!   `default_port` 等元数据，用于服务发现与 URL 构建。
//! - `TypedServiceClient<T: ServiceApi>`：持有 `BaseServiceClient` 与 `T`，
//!   提供通用 HTTP 方法（get/post/put/delete）与 ApiResponse 解包辅助。
//! - `define_service_api!` 宏：一行声明服务元数据，自动生成 struct 与
//!   `ServiceApi` 实现。
//! - 各 `api/*_api.rs` 在 `TypedServiceClient<SpecificApi>` 上实现业务方法。
//!
//! # 使用示例
//!
//! ```no_run
//! use topems_shared::service_client::trait_api::{ServiceApi, TypedServiceClient};
//! use topems_shared::service_client::api::erp_api::ErpApi;
//!
//! # async fn demo() -> Result<(), Box<dyn std::error::Error>> {
//! let client = TypedServiceClient::<ErpApi>::discover_default().await?;
//! let assets = client.list_assets(1, 20).await?;
//! # Ok(())
//! # }
//! ```

use super::base_client::BaseServiceClient;
use super::error::ServiceClientResult;
use serde::{de::DeserializeOwned, Serialize};
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

/// 服务 API trait — 所有服务 API 定义的基础。
///
/// 每个服务通过实现此 trait 提供服务发现所需的元数据。
/// `TypedServiceClient<T: ServiceApi>` 依赖这些元数据来构建请求 URL
/// 和回退地址。
pub trait ServiceApi: Send + Sync + 'static {
    /// 服务名称，用于 Consul 服务发现（如 `"topems-erp"`）。
    fn service_name(&self) -> &str;

    /// 服务的 API 前缀，如 `"/api/v1"` 或 `"/api/erp"`。
    fn api_prefix(&self) -> &str {
        "/api/v1"
    }

    /// 默认端口，当服务发现失败时的回退端口。
    fn default_port(&self) -> u16 {
        8000
    }

    /// 环境变量名（如 `"ERP_SERVICE_URL"`），优先级高于服务发现。
    fn env_var(&self) -> Option<&str> {
        None
    }

    /// 默认回退 URL（`http://localhost:{port}`）。
    fn fallback_url(&self) -> String {
        format!("http://localhost:{}", self.default_port())
    }
}

/// 类型化的服务客户端 — 基于 `ServiceApi` trait 的泛型 HTTP 客户端。
///
/// 持有 `BaseServiceClient` 执行实际 HTTP 调用，同时携带 `T: ServiceApi`
/// 作为服务元数据。业务方法通过 `impl TypedServiceClient<SpecificApi>`
/// 在各 `api/*_api.rs` 文件中定义。
///
/// # 生命周期
///
/// 1. `new(api, base_url)` — 直接指定 URL。
/// 2. `from_env(api)` — 优先读环境变量，回退到 `fallback_url()`。
/// 3. `discover(api)` — 优先环境变量 → Consul 服务发现 → 回退端口。
/// 4. `discover_default()` — `T::default()` + `discover(api)`。
#[derive(Clone)]
pub struct TypedServiceClient<T: ServiceApi> {
    inner: BaseServiceClient,
    api: T,
}

impl<T: ServiceApi + Default> TypedServiceClient<T> {
    /// 使用默认构造的 API 元数据并通过服务发现创建客户端。
    ///
    /// 解析顺序：环境变量 → Consul → 回退 `http://localhost:{port}`。
    pub async fn discover_default() -> ServiceClientResult<Self> {
        Self::discover(T::default()).await
    }

    /// 使用默认构造的 API 元数据，从环境变量创建客户端。
    pub fn from_env_default() -> ServiceClientResult<Self> {
        Self::from_env(T::default())
    }
}

impl<T: ServiceApi> TypedServiceClient<T> {
    /// 直接指定 base URL 创建客户端。
    pub fn new(api: T, base_url: impl Into<String>) -> ServiceClientResult<Self> {
        Ok(Self {
            inner: BaseServiceClient::new(base_url)?,
            api,
        })
    }

    /// 从环境变量创建客户端。
    ///
    /// 若 `api.env_var()` 返回 `Some` 且环境变量已设置，则使用其值；
    /// 否则回退到 `api.fallback_url()`。
    pub fn from_env(api: T) -> ServiceClientResult<Self> {
        if let Some(env_var) = api.env_var() {
            if let Ok(url) = std::env::var(env_var) {
                return Self::new(api, url);
            }
        }
        let url = api.fallback_url();
        Self::new(api, url)
    }

    /// 通过服务发现创建客户端。
    ///
    /// 解析顺序：
    /// 1. 环境变量（`api.env_var()` 指定的变量）
    /// 2. Consul 服务发现（需 `CONSUL_URL` 环境变量）
    /// 3. 回退到 `http://localhost:{api.default_port()}`
    pub async fn discover(api: T) -> ServiceClientResult<Self> {
        let service_name = api.service_name().to_string();

        // 1. 优先环境变量
        if let Some(env_var) = api.env_var() {
            if let Ok(url) = std::env::var(env_var) {
                return Self::new(api, url);
            }
        }

        // 2. Consul 服务发现
        if let Some(url) = try_consul_discovery(&service_name).await {
            return Self::new(api, url);
        }

        // 3. 回退到本地默认端口
        let fallback = api.fallback_url();
        tracing::debug!(
            "[TypedServiceClient] service `{}` not resolvable via discovery, fallback: {}",
            service_name,
            fallback
        );
        Self::new(api, fallback)
    }

    /// 返回内部 API 元数据的引用。
    pub fn api(&self) -> &T {
        &self.api
    }

    /// 返回 base URL。
    pub fn base_url(&self) -> &str {
        self.inner.base_url()
    }

    /// 设置 auth token。
    pub fn set_auth_token(&mut self, token: impl Into<String>) {
        self.inner.set_auth_token(token);
    }

    /// Builder 风格设置 auth token。
    pub fn with_auth_token(mut self, token: impl Into<String>) -> Self {
        self.inner.set_auth_token(token);
        self
    }

    /// 添加自定义 header。
    pub fn add_header(&mut self, key: impl Into<String>, value: impl Into<String>) {
        self.inner.add_header(key, value);
    }

    // ============ 通用 HTTP 方法 ============

    /// GET 请求，直接反序列化为 `R`。
    pub async fn get<R: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<R> {
        self.inner.get(path).await
    }

    /// POST 请求 with body，反序列化为 `R`。
    pub async fn post<R: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<R> {
        self.inner.post(path, body).await
    }

    /// POST 请求 without body，反序列化为 `R`。
    pub async fn post_without_body<R: DeserializeOwned>(
        &self,
        path: &str,
    ) -> ServiceClientResult<R> {
        self.inner.post_without_body(path).await
    }

    /// PUT 请求 with body，反序列化为 `R`。
    pub async fn put<R: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<R> {
        self.inner.put(path, body).await
    }

    /// DELETE 请求，反序列化为 `R`。
    pub async fn delete<R: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<R> {
        self.inner.delete(path).await
    }

    // ============ ApiResponse 解包辅助 ============

    /// GET 请求并解包 `ApiResponse<T>` 的 `data` 字段。
    pub async fn get_and_unwrap<R: DeserializeOwned>(&self, path: &str) -> ServiceClientResult<R> {
        let resp: ApiResponse<R> = self.inner.get(path).await?;
        resp.data
            .ok_or_else(|| TopemsError::Config("API response missing `data` field".into()))
    }

    /// POST 请求并解包 `ApiResponse<T>` 的 `data` 字段。
    pub async fn post_and_unwrap<R: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<R> {
        let resp: ApiResponse<R> = self.inner.post(path, body).await?;
        resp.data
            .ok_or_else(|| TopemsError::Config("API response missing `data` field".into()))
    }

    /// PUT 请求并解包 `ApiResponse<T>` 的 `data` 字段。
    pub async fn put_and_unwrap<R: DeserializeOwned, B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<R> {
        let resp: ApiResponse<R> = self.inner.put(path, body).await?;
        resp.data
            .ok_or_else(|| TopemsError::Config("API response missing `data` field".into()))
    }

    /// POST 请求并检查 `ApiResponse.success`。
    pub async fn post_and_check_success<B: Serialize>(
        &self,
        path: &str,
        body: &B,
    ) -> ServiceClientResult<bool> {
        let resp: ApiResponse<serde_json::Value> = self.inner.post(path, body).await?;
        Ok(resp.success)
    }

    /// 健康检查（返回布尔值，不区分错误类型）。
    pub async fn get_health(&self) -> ServiceClientResult<bool> {
        match self.inner.get_without_response("/health").await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// 发送 GET 请求并返回原始 Response（用于代理透传场景）
    /// 支持额外的 query 参数和 headers（如 x-tenant-id）
    pub async fn get_raw_response(
        &self,
        path: &str,
        query: Option<&[(&str, &str)]>,
        extra_headers: &[(&str, &str)],
    ) -> Result<reqwest::Response, reqwest::Error> {
        self.inner
            .get_raw_response(path, query, extra_headers)
            .await
    }

    /// 拼接 API 前缀与路径，例如 `api_prefix=/api/erp`、`path=/assets` → `/api/erp/assets`。
    pub fn build_path(&self, path: &str) -> String {
        let prefix = self.api.api_prefix().trim_end_matches('/');
        let path = path.trim_start_matches('/');
        format!("{}/{}", prefix, path)
    }
}

/// 尝试通过 Consul 服务发现获取服务 URL。
///
/// 当 `CONSUL_URL` 未设置或 Consul 不可达时返回 `None`。
async fn try_consul_discovery(service_name: &str) -> Option<String> {
    let consul = topems_shared_event::service_discovery::ConsulDiscoveryClient::from_env()?;
    consul.get_service_url(service_name).await
}

/// 声明服务 API 元数据的宏。
///
/// 生成一个实现 `ServiceApi` trait 的 unit struct，包含服务名、端口、
/// 环境变量和可选的 API 前缀。
///
/// # 示例
///
/// ```no_run
/// // 最简形式：服务名 + 端口
/// topems_shared::define_service_api!(FooApi, "foo", 9000);
///
/// // 带环境变量
/// topems_shared::define_service_api!(ErpApi, "topems-erp", 8010, Some("ERP_SERVICE_URL"));
///
/// // 带环境变量 + API 前缀
/// topems_shared::define_service_api!(
///     HrmApi, "topems-hrm", 8020,
///     Some("HRM_SERVICE_URL"), "/api/hrm"
/// );
/// ```
#[macro_export]
macro_rules! define_service_api {
    // 完整形式：name, service_name, port, env_var, api_prefix
    ($api_name:ident, $service_name:expr, $port:expr, $env_var:expr, $api_prefix:expr) => {
        #[derive(Debug, Clone, Default)]
        pub struct $api_name;

        impl $crate::service_client::trait_api::ServiceApi for $api_name {
            fn service_name(&self) -> &str {
                $service_name
            }

            fn default_port(&self) -> u16 {
                $port
            }

            fn env_var(&self) -> Option<&str> {
                $env_var
            }

            fn api_prefix(&self) -> &str {
                $api_prefix
            }
        }
    };
    // 带环境变量，API 前缀用默认 "/api/v1"
    ($api_name:ident, $service_name:expr, $port:expr, $env_var:expr) => {
        $crate::define_service_api!($api_name, $service_name, $port, $env_var, "/api/v1");
    };
    // 最简形式：服务名 + 端口
    ($api_name:ident, $service_name:expr, $port:expr) => {
        $crate::define_service_api!($api_name, $service_name, $port, None, "/api/v1");
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // 全局互斥锁用于同步环境变量的访问，避免测试并行时的竞态条件
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    struct FakeApi;

    impl ServiceApi for FakeApi {
        fn service_name(&self) -> &str {
            "fake-service"
        }

        fn default_port(&self) -> u16 {
            9999
        }

        fn env_var(&self) -> Option<&str> {
            Some("FAKE_SERVICE_URL")
        }

        fn api_prefix(&self) -> &str {
            "/api/fake"
        }
    }

    impl Default for FakeApi {
        fn default() -> Self {
            FakeApi
        }
    }

    #[test]
    fn test_fallback_url() {
        let api = FakeApi;
        assert_eq!(api.fallback_url(), "http://localhost:9999");
    }

    #[test]
    fn test_build_path() {
        let api = FakeApi;
        let client = TypedServiceClient::new(api, "http://localhost:9999").unwrap();
        assert_eq!(client.build_path("/assets"), "/api/fake/assets");
        assert_eq!(client.build_path("assets"), "/api/fake/assets");
    }

    #[test]
    fn test_from_env_fallback() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::remove_var("FAKE_SERVICE_URL");
        let client = TypedServiceClient::from_env(FakeApi).unwrap();
        assert_eq!(client.base_url(), "http://localhost:9999");
    }

    #[test]
    fn test_from_env_override() {
        let _lock = ENV_LOCK.lock().unwrap();
        std::env::set_var("FAKE_SERVICE_URL", "http://10.0.0.1:7777");
        let client = TypedServiceClient::from_env(FakeApi).unwrap();
        assert_eq!(client.base_url(), "http://10.0.0.1:7777");
        std::env::remove_var("FAKE_SERVICE_URL");
    }

    #[test]
    fn test_macro_generates_service_api_impl() {
        define_service_api!(MacroApi, "macro-service", 8888, Some("MACRO_SERVICE_URL"));
        let api = MacroApi;
        assert_eq!(api.service_name(), "macro-service");
        assert_eq!(api.default_port(), 8888);
        assert_eq!(api.env_var(), Some("MACRO_SERVICE_URL"));
    }
}
