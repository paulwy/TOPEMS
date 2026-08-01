//! finance 服务集成测试共享辅助模块
//!
//! 导入方式：在任意 sibling 测试文件首行写：
//! ```rust
//! mod common;
//! use common::TestContext;
//! ```
//! Rust 集成测试的默认模块解析会自动查找 `tests/common/mod.rs`（目录根）。

use reqwest::{Client, ClientBuilder, Method, RequestBuilder};
use serde_json::{json, Value};
use std::time::Duration;

use topems_shared::service_port::{FINANCE_PORT, UNIFIED_CORE_PORT};

const PLACEHOLDER_TOKEN: &str = "__placeholder_token_for_compile_check__";

/// 集成测试统一上下文：封装 HTTP 客户端、管理员 Token
pub struct TestContext {
    pub client: Client,
    pub admin_token: String,
}

impl TestContext {
    /// 构造上下文：创建带超时的 reqwest 客户端，并用 admin 账号登录拿 token
    ///
    /// 注意：即便 ctx 创建成功，使用 `request()` 发业务请求时仍然需要
    /// finance 服务已启动，否则会得到连接错误。
    pub async fn new() -> Self {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client for integration tests");

        let admin_token = match login_admin(&client).await {
            Ok(tok) => tok,
            Err(e) => {
                eprintln!(
                    "WARN: TestContext::new() 无法登录 admin，这通常是 unified-core 服务还没启动。\n\
                     返回一个空 token 的 TestContext（仅用于编译检查和单测）\n\
                     原始错误: {}",
                    e
                );
                String::from(PLACEHOLDER_TOKEN)
            }
        };

        Self {
            client,
            admin_token,
        }
    }

    /// 返回 finance 服务的 base URL
    pub fn base_url(&self) -> String {
        format!("http://localhost:{}", FINANCE_PORT)
    }

    /// 发送一个鉴权请求。核心 URL 拼装规则：
    ///
    /// ```text
    /// 最终 URL = {base}/api/core/finance/v1{endpoint}
    /// ```
    ///
    /// ## endpoint 参数约定
    ///
    /// 必须以 `/` 开头（debug_assert 保护），例如 `/accounts`，不能写成 `accounts`。
    pub async fn request(&self, method: &str, endpoint: &str, body: Option<Value>) -> (u16, Value) {
        debug_assert!(
            endpoint.starts_with('/'),
            "endpoint 必须以 '/' 开头，例如 '/accounts'，当前值: {}",
            endpoint
        );

        let base = self.base_url();
        let url = format!("{}/api/core/finance/v1{}", base, endpoint);

        let method = match method.to_uppercase().as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            other => {
                return (
                    400,
                    json!({"error": format!("unsupported HTTP method: {}", other)}),
                )
            }
        };

        let mut req: RequestBuilder = self.client.request(method.clone(), &url);
        if self.admin_token != PLACEHOLDER_TOKEN {
            req = req.bearer_auth(&self.admin_token);
        }

        if let Some(b) = body {
            req = req.json(&b);
        }

        match req.send().await {
            Ok(resp) => {
                let status = resp.status().as_u16();
                let parsed: Value = resp
                    .json()
                    .await
                    .unwrap_or_else(|_| json!({"_raw": "not-json"}));
                (status, parsed)
            }
            Err(e) => {
                eprintln!("ERROR: request {} {} failed: {}", method, url, e);
                (0, json!({"error": e.to_string()}))
            }
        }
    }
}

// ============== 公共登录辅助 ==============

/// 通用登录：向 unified-core 的 IAM 登录接口发请求，成功返回 access_token
pub async fn login(client: &Client, username: &str, password: &str) -> Result<String, String> {
    let url = format!(
        "http://localhost:{}/api/core/iam/auth/login",
        UNIFIED_CORE_PORT
    );
    let resp = client
        .post(&url)
        .json(&json!({
            "username": username,
            "password": password,
        }))
        .send()
        .await
        .map_err(|e| format!("login POST {} failed: {}", url, e))?;

    let status = resp.status();
    let body: Value = resp
        .json()
        .await
        .unwrap_or_else(|_| json!({"_raw": "not-json"}));

    if !status.is_success() {
        return Err(format!("login HTTP {}: {}", status.as_u16(), body));
    }

    let success = body["success"].as_bool().unwrap_or(false);
    if !success {
        return Err(format!("login response success=false: {}", body));
    }

    body["data"]["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("login missing data.access_token in response: {}", body))
}

/// 以 admin/admin123 登录（集成测试种子账号）
pub async fn login_admin(client: &Client) -> Result<String, String> {
    login(client, "admin", "admin123").await
}

// ============== 服务可用性检查 ==============

/// 检查 finance 服务是否可用（连接 /health 端点，2 秒超时）
pub async fn service_available() -> bool {
    let client = match ClientBuilder::new().timeout(Duration::from_secs(2)).build() {
        Ok(c) => c,
        Err(_) => return false,
    };

    let url = format!("http://localhost:{}/health", FINANCE_PORT);
    client
        .get(&url)
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
