//! master-data 集成测试共享辅助模块
//!
//! 导入方式：在 sibling 测试文件首行写：
//! ```rust
//! mod common;
//! use common::TestContext;
//! ```
//! Rust 集成测试默认模块解析会自动查找 `tests/common/mod.rs`。
//!
//! 路径结构（双层嵌套）：
//! - main.rs 外层: `.nest("/api/master-data", protected_routes)`
//! - modules::create_routes 内层: `.nest("/api/master/mdm-v60", ...)`
//! - V60 完整路径: `/api/master-data/api/master/mdm-v60/{sub_path}`

use reqwest::{Client, ClientBuilder, Method, RequestBuilder};
use serde_json::{json, Value};
use std::time::Duration;

const MASTER_DATA_PORT: u16 = 8090;
const PLACEHOLDER_TOKEN: &str = "__placeholder_token_for_compile_check__";

/// 集成测试统一上下文：封装 HTTP 客户端与管理员 Token
pub struct TestContext {
    pub client: Client,
    pub admin_token: String,
}

impl TestContext {
    /// 构造上下文：创建带超时的 reqwest 客户端，并用 admin 账号登录拿 token
    ///
    /// 登录失败时降级为 placeholder token，确保编译检查和本地开发时
    /// 即使服务未启动也能 `cargo test --no-run` 通过。
    pub async fn new() -> Self {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client for integration tests");

        let admin_token = match login_admin(&client).await {
            Ok(tok) => tok,
            Err(e) => {
                eprintln!(
                    "WARN: TestContext::new() 无法登录 admin，master-data 服务可能未启动。\n\
                     返回 placeholder token（仅用于编译检查）\n\
                     原始错误: {}",
                    e
                );
                PLACEHOLDER_TOKEN.to_string()
            }
        };

        Self {
            client,
            admin_token,
        }
    }

    /// 返回 master-data 服务的 base URL
    pub fn base_url() -> String {
        format!("http://localhost:{}", MASTER_DATA_PORT)
    }

    /// 发送一个带 Bearer Token 的 HTTP 请求。
    ///
    /// - `full_path`: 调用方自行拼好的完整路径（必须以 `/` 开头）
    /// - `body`: 可选 JSON 请求体
    ///
    /// 返回 `(status_code, response_json)`。
    pub async fn request(
        &self,
        method: &str,
        full_path: &str,
        body: Option<Value>,
    ) -> Result<(u16, Value), String> {
        debug_assert!(
            full_path.starts_with('/'),
            "full_path 必须以 '/' 开头，例如 '/health'，当前值: {}",
            full_path
        );

        let url = format!("{}{}", Self::base_url(), full_path);
        let method_str = method.to_uppercase();

        let method = match method_str.as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            other => return Err(format!("unsupported HTTP method: {}", other)),
        };

        let mut req: RequestBuilder = self.client.request(method, &url);

        if self.admin_token != PLACEHOLDER_TOKEN {
            req = req.bearer_auth(&self.admin_token);
        }

        if let Some(b) = body {
            req = req.json(&b);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("request {} {} failed: {}", method_str, url, e))?;

        let status = resp.status().as_u16();
        let parsed: Value = resp
            .json()
            .await
            .unwrap_or_else(|_| json!({"_raw": "not-json"}));

        Ok((status, parsed))
    }

    /// 便捷方法：调用 V60 MDM API，自动拼装完整路径。
    ///
    /// 最终路径 = `/api/master-data/api/master/mdm-v60{sub_path}`
    ///
    /// `sub_path` 必须以 `/` 开头，例如 `/metadata`、`/metadata/search`。
    pub async fn v60_request(
        &self,
        method: &str,
        sub_path: &str,
        body: Option<Value>,
    ) -> Result<(u16, Value), String> {
        debug_assert!(
            sub_path.starts_with('/'),
            "sub_path 必须以 '/' 开头，例如 '/metadata'，当前值: {}",
            sub_path
        );
        let full_path = format!("/api/master-data/api/master/mdm-v60{}", sub_path);
        self.request(method, &full_path, body).await
    }
}

// ============== 登录辅助 ==============

/// 以 admin/admin123 登录 unified-core IAM，获取 access_token
///
/// 登录请求直接打到 unified-core（8000 端口）的 IAM 接口，
/// 这是测试环境的标准种子账号。
async fn login_admin(client: &Client) -> Result<String, String> {
    let url = "http://localhost:8000/api/core/iam/auth/login";
    let resp = client
        .post(url)
        .json(&json!({
            "username": "admin",
            "password": "admin123",
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

// ============== 服务可用性检测 ==============

/// 检测 master-data 服务是否可用（访问 /health 端点，2 秒超时）
///
/// 返回 `true` 表示服务已启动且健康检查通过。
pub async fn service_available() -> bool {
    let client = match ClientBuilder::new()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    let url = format!("{}/health", TestContext::base_url());
    match client.get(&url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}
