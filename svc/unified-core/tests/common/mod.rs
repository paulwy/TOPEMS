//! unified-core 集成测试共享辅助模块
//!
//! 导入方式：在任意 sibling 测试文件（如 hrm_permission_tests.rs）首行写：
//! ```rust
//! mod common;
//! use common::TestContext;
//! ```
//! Rust 集成测试的默认模块解析会自动查找 `tests/common/mod.rs`（目录根）。
//!
//! 双模式路由：
//! - 默认 Direct 模式（env 未设置 TEST_ROUTE_MODE=proxy）：Group1 走 8000，Group2 走独立端口
//! - Proxy 模式（TEST_ROUTE_MODE=proxy）：所有请求统一走 8000，依赖 unified-core 的服务网格代理
//!   （Proxy 模式需 Phase 2 接入服务网格代理后才可稳定使用）

use reqwest::{Client, ClientBuilder, Method, RequestBuilder};
use serde_json::{json, Value};
use std::time::Duration;

use topems_lib::service_port::{get_service_port, is_group2_service, UNIFIED_CORE_PORT};

/// 集成测试统一上下文：封装 HTTP 客户端、管理员 Token、路由模式
pub struct TestContext {
    pub client: Client,
    pub admin_token: String,
    pub route_mode: &'static str,
}

impl TestContext {
    /// 构造上下文：创建带超时的 reqwest 客户端，并用 admin 账号登录拿 token
    ///
    /// 注意：即便 ctx 创建成功，使用 `request()` 发业务请求（非登录）时仍然需要
    /// Phase 2 双轨注册接入完成，否则会得到 404。
    pub async fn new() -> Self {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("failed to build reqwest client for integration tests");

        let route_mode = detect_route_mode();
        let admin_token = match login_admin(&client).await {
            Ok(tok) => tok,
            Err(e) => {
                eprintln!(
                    "WARN: TestContext::new() 无法登录 admin，这通常是 unified-core 服务还没启动。\n\
                     返回一个空 token 的 TestContext（仅用于编译检查和单测）\n\
                     原始错误: {}",
                    e
                );
                String::from("__placeholder_token_for_compile_check__")
            }
        };

        Self {
            client,
            admin_token,
            route_mode,
        }
    }

    /// 返回服务对应的 base URL（Direct 模式 vs Proxy 模式的唯一差异点）
    ///
    /// - `svc=None` → Group1 统一返回 `http://localhost:{UNIFIED_CORE_PORT}`
    /// - `svc=Some("hrm")` → Direct 模式独立端口 / Proxy 模式仍走 8000
    pub fn service_base_url(&self, svc: Option<&str>) -> String {
        match self.route_mode {
            "proxy" => format!("http://localhost:{}", UNIFIED_CORE_PORT),
            _direct_or_unknown => match svc {
                Some(name) if is_group2_service(name) => {
                    let port = get_service_port(name).unwrap_or(UNIFIED_CORE_PORT);
                    format!("http://localhost:{}", port)
                }
                _group1_or_unknown => format!("http://localhost:{}", UNIFIED_CORE_PORT),
            },
        }
    }

    /// 发送一个鉴权请求。核心 URL 拼装规则：
    ///
    /// ```text
    /// 最终 URL = {base}/api/{group}{endpoint}
    /// ```
    ///
    /// ## group 参数约定
    ///
    /// | 服务类型 | group 写法 | 例子 |
    /// |---|---|---|
    /// | Group 1 模块 | `"core/iam"`、`"core/flow"`、`"core/file"` 等 | group="core/iam" + endpoint="/auth/login" → `/api/core/iam/auth/login` |
    /// | Group 2 服务 | 直接写 `"hrm"`、`"crm"` 等 | group="hrm" + endpoint="/employees" → `/api/hrm/employees` |
    ///
    /// ## endpoint 参数约定
    ///
    /// 必须以 `/` 开头（debug_assert 保护），例如 `/employees`，不能写成 `employees`。
    ///
    /// ## 路径约定
    ///
    /// 此方法拼出的路径为统一路由模式（无 `/v1`），直接命中 handler。
    /// 登录等场景请直接调用本模块的 `login()` / `login_admin()`。
    pub async fn request(
        &self,
        group: &str,
        method: &str,
        endpoint: &str,
        body: Option<Value>,
    ) -> Result<(u16, Value), String> {
        debug_assert!(
            endpoint.starts_with('/'),
            "endpoint 必须以 '/' 开头，例如 '/employees'，当前值: {}",
            endpoint
        );

        let svc = pick_service_for_base_url(group);
        let base = self.service_base_url(svc.as_deref());
        let url = format!("{base}/api/{group}{endpoint}");

        let method = match method.to_uppercase().as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            other => return Err(format!("unsupported HTTP method: {}", other)),
        };

        let mut req: RequestBuilder = self.client.request(method, &url);
        if !self.admin_token.is_empty()
            && self.admin_token != "__placeholder_token_for_compile_check__"
        {
            req = req.bearer_auth(&self.admin_token);
        }

        if let Some(b) = body {
            req = req.json(&b);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| format!("request {} {} failed: {}", method, url, e))?;

        let status = resp.status().as_u16();
        let parsed: Value = resp
            .json()
            .await
            .unwrap_or_else(|_| json!({"_raw": "not-json"}));

        Ok((status, parsed))
    }
}

// ============== 公共登录辅助（立即可用，不依赖 Phase 2 兼容层）==============

/// 通用登录：向 unified-core 的 IAM v1 登录接口发请求，成功返回 access_token
///
/// 使用"含 /v1 的旧路径"以保证即使 Phase 2 还没接入也能命中 handler。
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

// ============== 内部辅助 ==============

fn detect_route_mode() -> &'static str {
    match std::env::var("TEST_ROUTE_MODE")
        .ok()
        .as_deref()
        .map(|s| s.trim().to_ascii_lowercase())
        .as_deref()
    {
        Some("proxy") => "proxy",
        _ => "direct",
    }
}

/// 根据 group 参数推断 svc，供 `service_base_url()` 选择端口
///
/// - `"core/iam"` → `None`（Group 1 → 统一 8000）
/// - `"hrm"` → `Some("hrm")`（Group 2 → 查独立端口）
fn pick_service_for_base_url(group: &str) -> Option<String> {
    if group.starts_with("core/") {
        return None;
    }
    // 顶层名即 Group 2 svc
    Some(group.to_string())
}
