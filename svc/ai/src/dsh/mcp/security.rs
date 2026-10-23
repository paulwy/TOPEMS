//! MCP 安全防护中间件。
//!
//! 提供输入校验、权限检查、输出脱敏、注入检测等安全防护功能。
//!
//! ## 安全防护体系
//!
//! 1. **输入校验**：JSON Schema 合规性检查、输入大小限制
//! 2. **注入检测**：SQL 注入、命令注入等危险模式检测
//! 3. **权限检查**：基于用户角色的工具访问权限控制
//! 4. **输出脱敏**：敏感字段自动脱敏处理
//! 5. **速率限制**：防止滥用和 DoS 攻击

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use serde_json::Value;
use tokio::sync::RwLock;
use tracing::{info, warn};

use super::tools::ToolExecutionError;
use topems_shared_mcp::protocol::SensitiveOutput;

/// 最大输入大小（字节）
const MAX_INPUT_SIZE: usize = 1024 * 1024; // 1 MB

/// 注入检测模式列表（P2-3：仅保留高风险语句级模式，统一子串匹配语义；
/// 删除 `--`/`;--`/`INSERT INTO`/`CREATE TABLE` 等误伤面大的字面量——
/// 业务文本（备注、客户名等）含 `--`、`SELECT` 等单词时不应被误拒）
const INJECTION_PATTERNS: &[&str] = &[
    "DROP TABLE",
    "DELETE FROM",
    "DROP DATABASE",
    "EXEC(",
    "xp_cmdshell",
    "UNION SELECT",
    "WAITFOR DELAY",
    "BENCHMARK(",
    "SLEEP(",
    "pg_sleep(",
];

/// 敏感字段列表（需要脱敏）
/// P2-4：收窄到高风险凭据/身份字段；email/phone/mobile/address/location 等业务联系字段
/// 是工具核心价值（如 get_customer_profile 返回联系方式），移出全局脱敏，
/// 不再被 ***REDACTED*** 误伤。
const SENSITIVE_FIELDS: &[&str] = &[
    "password",
    "passwd",
    "secret",
    "token",
    "api_key",
    "apikey",
    "private_key",
    "credit_card",
    "card_number",
    "cvv",
    "ssn",
    "social_security",
    "id_card",
    "idcard",
    "ip_address",
];

/// 将敏感字符串掩码为「前3****后4」形式（Phase D，与 integration `mask_app_secret` 同风格）。
/// 过短（≤7 位，前后缀会重叠）→ 整体 `****`。
/// 例：`130101199001011234` → `130****1234`；`sk-abcdef1234` → `sk-****1234`。
pub fn mask_secret_string(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let n = chars.len();
    if n <= 7 {
        return "****".to_string();
    }
    // n > 7 ≥ 8，前后缀切片必然合法；用 get 满足 indexing_slicing=deny。
    let prefix: String = chars.get(..3).unwrap_or(&[]).iter().collect();
    let suffix: String = chars.get(n - 4..).unwrap_or(&[]).iter().collect();
    format!("{prefix}****{suffix}")
}

/// 处理 MCP Text 内容块内嵌 JSON：字符串能解析为 JSON 对象/数组时，对其内层
/// 声明字段按前3后4 掩码后重新序列化；解析失败（纯文本）原样返回。
fn mask_inner_json_text(val: &Value, declared: &[String]) -> String {
    let Some(s) = val.as_str() else {
        return val.to_string();
    };
    let Ok(inner) = serde_json::from_str::<Value>(s) else {
        return s.to_string();
    };
    // 复用同一递归掩码逻辑处理内层 JSON
    let middleware = McpSecurityMiddleware::new();
    let masked = middleware.walk_mask_declared(&inner, declared);
    serde_json::to_string(&masked).unwrap_or_else(|_| s.to_string())
}

/// 认证用户信息
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    /// 用户 ID
    pub user_id: String,
    /// 租户 ID
    pub tenant_id: String,
    /// 用户角色列表
    pub roles: Vec<String>,
    /// 用户名
    pub username: String,
}

impl AuthenticatedUser {
    /// 创建新的认证用户
    pub fn new(
        user_id: impl Into<String>,
        tenant_id: impl Into<String>,
        roles: Vec<String>,
    ) -> Self {
        Self {
            user_id: user_id.into(),
            tenant_id: tenant_id.into(),
            roles,
            username: String::new(),
        }
    }

    /// 检查用户是否具有指定角色
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    /// 检查用户是否具有指定权限
    pub fn has_permission(&self, permission: &str) -> bool {
        // 简化实现：admin 角色拥有所有权限
        if self.has_role("admin") || self.has_role("super_admin") {
            return true;
        }
        // 检查角色是否匹配权限前缀
        self.roles
            .iter()
            .any(|role| permission.starts_with(role.as_str()) || role == permission)
    }
}

/// 速率限制条目
struct RateLimitEntry {
    /// 请求时间戳
    timestamps: Vec<Instant>,
}

/// MCP 安全中间件
///
/// 提供输入校验、权限检查、输出脱敏等安全防护功能。
#[derive(Clone)]
pub struct McpSecurityMiddleware {
    /// 速率限制（每用户每分钟最大请求数）
    rate_limit_per_minute: u32,
    /// 用户速率限制状态
    rate_limits: Arc<RwLock<HashMap<String, RateLimitEntry>>>,
    /// 启用注入检测
    injection_detection_enabled: bool,
    /// 启用输出脱敏
    output_sanitization_enabled: bool,
}

impl Default for McpSecurityMiddleware {
    fn default() -> Self {
        Self::new()
    }
}

impl McpSecurityMiddleware {
    /// 创建新的安全中间件
    pub fn new() -> Self {
        // P1-3：速率上限可由 MCP_RATE_LIMIT_PER_MINUTE 环境变量覆盖（默认 60/min）
        let rate_limit_per_minute = std::env::var("MCP_RATE_LIMIT_PER_MINUTE")
            .ok()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(60);
        Self {
            rate_limit_per_minute,
            rate_limits: Arc::new(RwLock::new(HashMap::new())),
            injection_detection_enabled: true,
            output_sanitization_enabled: true,
        }
    }

    /// 设置速率限制（每分钟最大请求数）
    pub fn with_rate_limit(mut self, limit: u32) -> Self {
        self.rate_limit_per_minute = limit;
        self
    }

    /// 启用或禁用注入检测
    pub fn with_injection_detection(mut self, enabled: bool) -> Self {
        self.injection_detection_enabled = enabled;
        self
    }

    /// 启用或禁用输出脱敏
    pub fn with_output_sanitization(mut self, enabled: bool) -> Self {
        self.output_sanitization_enabled = enabled;
        self
    }

    /// 校验工具输入
    ///
    /// 执行以下检查：
    /// 1. 输入大小限制
    /// 2. 注入模式检测
    /// 3. JSON 格式验证
    pub async fn validate_tool_input(
        &self,
        tool_name: &str,
        input: &Value,
    ) -> Result<(), ToolExecutionError> {
        // 1. 检查输入大小
        let input_str = serde_json::to_string(input).unwrap_or_default();
        if input_str.len() > MAX_INPUT_SIZE {
            warn!(
                tool = tool_name,
                input_size = input_str.len(),
                max_size = MAX_INPUT_SIZE,
                "Input size exceeds limit"
            );
            return Err(ToolExecutionError::Validation(format!(
                "Input size {} exceeds maximum limit of {} bytes",
                input_str.len(),
                MAX_INPUT_SIZE
            )));
        }

        // 2. 注入模式检测
        if self.injection_detection_enabled {
            self.check_injection_patterns(tool_name, &input_str)?;
        }

        // 3. JSON 格式验证（已经是 Value，说明格式正确）
        if !input.is_object() && !input.is_array() && !input.is_null() {
            return Err(ToolExecutionError::Validation(
                "Input must be a JSON object, array, or null".to_string(),
            ));
        }

        info!(tool = tool_name, "Tool input validated successfully");
        Ok(())
    }

    /// 检查用户是否有权限执行工具
    pub async fn check_permission(
        &self,
        user: &AuthenticatedUser,
        tool_name: &str,
        required_permission: Option<&str>,
    ) -> Result<(), ToolExecutionError> {
        // 如果没有要求特定权限，允许访问
        let Some(permission) = required_permission else {
            return Ok(());
        };

        // 检查用户权限
        if !user.has_permission(permission) {
            warn!(
                user_id = %user.user_id,
                tenant_id = %user.tenant_id,
                tool = tool_name,
                required_permission = permission,
                "Permission denied for tool execution"
            );
            return Err(ToolExecutionError::PermissionDenied(format!(
                "User '{}' does not have required permission '{}' for tool '{}'",
                user.user_id, permission, tool_name
            )));
        }

        info!(
            user_id = %user.user_id,
            tool = tool_name,
            "Permission check passed"
        );
        Ok(())
    }

    #[allow(clippy::as_conversions)]
    /// 检查速率限制
    pub async fn check_rate_limit(&self, user_id: &str) -> Result<(), ToolExecutionError> {
        let now = Instant::now();
        let one_minute = std::time::Duration::from_secs(60);

        let mut rate_limits = self.rate_limits.write().await;
        let entry = rate_limits
            .entry(user_id.to_string())
            .or_insert_with(|| RateLimitEntry {
                timestamps: Vec::new(),
            });

        // 清理超过 1 分钟的旧时间戳
        entry
            .timestamps
            .retain(|&t| now.duration_since(t) < one_minute);

        // 检查是否超过速率限制
        if entry.timestamps.len() >= self.rate_limit_per_minute as usize {
            warn!(
                user_id = user_id,
                request_count = entry.timestamps.len(),
                limit = self.rate_limit_per_minute,
                "Rate limit exceeded"
            );
            return Err(ToolExecutionError::Validation(format!(
                "Rate limit exceeded: {} requests per minute",
                self.rate_limit_per_minute
            )));
        }

        // 记录当前请求时间戳
        entry.timestamps.push(now);

        Ok(())
    }

    /// 脱敏工具输出
    ///
    /// 自动识别并脱敏敏感字段。
    pub fn sanitize_output(&self, output: Value) -> Value {
        if !self.output_sanitization_enabled {
            return output;
        }

        let sanitized = self.sanitize_value(&output);
        info!("Output sanitized successfully");
        sanitized
    }

    /// 检查注入模式
    fn check_injection_patterns(
        &self,
        tool_name: &str,
        input_str: &str,
    ) -> Result<(), ToolExecutionError> {
        let input_lower = input_str.to_lowercase();

        for pattern in INJECTION_PATTERNS {
            if input_lower.contains(&pattern.to_lowercase()) {
                warn!(
                    tool = tool_name,
                    pattern = pattern,
                    "Potential injection pattern detected"
                );
                return Err(ToolExecutionError::Validation(format!(
                    "Potential injection pattern detected: {}",
                    pattern
                )));
            }
        }

        Ok(())
    }

    /// 递归脱敏 JSON 值
    fn sanitize_value(&self, value: &Value) -> Value {
        match value {
            Value::Object(map) => {
                let mut sanitized = serde_json::Map::new();
                for (key, val) in map {
                    if SENSITIVE_FIELDS.contains(&key.as_str()) {
                        // 脱敏敏感字段
                        sanitized.insert(key.clone(), Value::String("***REDACTED***".to_string()));
                    } else {
                        // 递归处理嵌套值
                        sanitized.insert(key.clone(), self.sanitize_value(val));
                    }
                }
                Value::Object(sanitized)
            }
            Value::Array(arr) => Value::Array(arr.iter().map(|v| self.sanitize_value(v)).collect()),
            _ => value.clone(),
        }
    }

    /// 按工具 sensitive_output 声明脱敏（Phase D）。
    ///
    /// 与全局 `SENSITIVE_FIELDS`（整字段 `***REDACTED***`）互补：工具声明的字段
    /// 按「前3后4」掩码（同 integration `mask_app_secret` 风格），保留可辨认性的
    /// 同时不回显明文；短值（≤7 字符）整体 `****`。
    pub fn sanitize_declared_fields(&self, value: &Value, decl: &SensitiveOutput) -> Value {
        if decl.fields.is_empty() {
            return value.clone();
        }
        let masked = self.walk_mask_declared(value, &decl.fields);
        if decl.contains_sensitive == Some(true) {
            warn!(
                fields = ?decl.fields,
                "Tool output contains sensitive fields; masked per declaration"
            );
        }
        masked
    }

    /// 递归遍历：key 命中声明字段名时，字符串值按前3后4 掩码；其余递归。
    ///
    /// 业务工具实际输出形态为 `McpContent::Text { text: <json_string> }`（业务 JSON
    /// 序列化为字符串内嵌），因此 `text` 字符串若能解析为 JSON，同样对其内层 JSON
    /// 应用声明字段掩码，否则原样保留。
    fn walk_mask_declared(&self, value: &Value, declared: &[String]) -> Value {
        match value {
            Value::Object(map) => {
                let mut out = serde_json::Map::new();
                for (key, val) in map {
                    if declared.contains(key) {
                        let masked = match val {
                            Value::String(s) => Value::String(mask_secret_string(s)),
                            other => other.clone(),
                        };
                        out.insert(key.clone(), masked);
                    } else if key == "text" {
                        out.insert(key.clone(), Value::String(mask_inner_json_text(val, declared)));
                    } else {
                        out.insert(key.clone(), self.walk_mask_declared(val, declared));
                    }
                }
                Value::Object(out)
            }
            Value::Array(arr) => {
                Value::Array(arr.iter().map(|v| self.walk_mask_declared(v, declared)).collect())
            }
            _ => value.clone(),
        }
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
    /// 获取当前速率限制状态
    pub async fn get_rate_limit_status(&self, user_id: &str) -> RateLimitStatus {
        let rate_limits = self.rate_limits.read().await;
        let now = Instant::now();
        let one_minute = std::time::Duration::from_secs(60);

        let current_count = rate_limits
            .get(user_id)
            .map(|entry| {
                entry
                    .timestamps
                    .iter()
                    .filter(|&&t| now.duration_since(t) < one_minute)
                    .count()
            })
            .unwrap_or(0);

        RateLimitStatus {
            current_count,
            limit: self.rate_limit_per_minute,
            remaining: self
                .rate_limit_per_minute
                .saturating_sub(current_count as u32),
        }
    }
}

/// 速率限制状态
#[derive(Debug, Clone, serde::Serialize)]
pub struct RateLimitStatus {
    /// 当前请求数
    pub current_count: usize,
    /// 限制请求数
    pub limit: u32,
    /// 剩余请求数
    pub remaining: u32,
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_authenticated_user_has_role() {
        let user = AuthenticatedUser::new(
            "user1",
            "tenant1",
            vec!["admin".to_string(), "user".to_string()],
        );
        assert!(user.has_role("admin"));
        assert!(user.has_role("user"));
        assert!(!user.has_role("super_admin"));
    }

    #[test]
    fn test_authenticated_user_has_permission() {
        let admin = AuthenticatedUser::new("admin1", "tenant1", vec!["admin".to_string()]);
        assert!(admin.has_permission("crm.read"));
        assert!(admin.has_permission("anything"));

        let user = AuthenticatedUser::new("user1", "tenant1", vec!["crm".to_string()]);
        assert!(user.has_permission("crm.read"));
        assert!(user.has_permission("crm"));
        assert!(!user.has_permission("erp.read"));
    }

    #[tokio::test]
    async fn test_validate_tool_input_size_limit() {
        let middleware = McpSecurityMiddleware::new();
        let large_input = Value::String("x".repeat(MAX_INPUT_SIZE + 1));
        let result = middleware
            .validate_tool_input("test_tool", &large_input)
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_validate_tool_input_injection_detection() {
        let middleware = McpSecurityMiddleware::new();
        let input = serde_json::json!({"query": "DROP TABLE users"});
        let result = middleware.validate_tool_input("test_tool", &input).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_sanitize_output() {
        let middleware = McpSecurityMiddleware::new();
        let output = serde_json::json!({
            "username": "testuser",
            "password": "secret123",
            "email": "test@example.com",
            "profile": {
                "phone": "1234567890",
                "address": "123 Main St"
            }
        });
        let sanitized = middleware.sanitize_output(output);
        assert_eq!(sanitized["username"], "testuser");
        assert_eq!(sanitized["password"], "***REDACTED***");
        // P2-4：email/phone/address 为业务联系字段（工具核心价值），移出全局脱敏
        assert_eq!(sanitized["email"], "test@example.com");
        assert_eq!(sanitized["profile"]["phone"], "1234567890");
        assert_eq!(sanitized["profile"]["address"], "123 Main St");
    }

    #[tokio::test]
    async fn test_rate_limit() {
        let middleware = McpSecurityMiddleware::new().with_rate_limit(2);

        // 前两次请求应该成功
        assert!(middleware.check_rate_limit("user1").await.is_ok());
        assert!(middleware.check_rate_limit("user1").await.is_ok());

        // 第三次请求应该失败
        assert!(middleware.check_rate_limit("user1").await.is_err());
    }

    #[test]
    fn test_check_injection_patterns() {
        let middleware = McpSecurityMiddleware::new();
        assert!(middleware
            .check_injection_patterns("test", "SELECT * FROM users")
            .is_ok());
        assert!(middleware
            .check_injection_patterns("test", "DROP TABLE users")
            .is_err());
        assert!(middleware
            .check_injection_patterns("test", "DELETE FROM users WHERE id=1")
            .is_err());
    }

    #[test]
    fn test_injection_patterns_allow_normal_business_text() {
        // P2-3：正常业务文本（含 --、SELECT、INSERT 等单词/符号）不应被误拒
        let middleware = McpSecurityMiddleware::new();
        assert!(middleware
            .check_injection_patterns(
                "test",
                "客户备注：2026-09-13 -- 重点客户，需跟进 SELECT 相关信息"
            )
            .is_ok());
        assert!(middleware
            .check_injection_patterns("test", "INSERT INTO 提及的合同条款已归档")
            .is_ok());
        assert!(middleware
            .check_injection_patterns("test", "普通查询请求")
            .is_ok());
    }

    #[test]
    fn test_mask_secret_string_style() {
        // 与 integration mask_app_secret 同风格：前3****后4；过短整体 ****
        assert_eq!(mask_secret_string("130101199001011234"), "130****1234");
        assert_eq!(mask_secret_string("sk-abcdef1234"), "sk-****1234");
        assert_eq!(mask_secret_string("abcdefg"), "****"); // 7 位 → 整体
        assert_eq!(mask_secret_string(""), "****");
    }

    #[test]
    fn test_sanitize_declared_fields_matches_nested() {
        // Phase D：工具声明字段按前3后4 掩码，未声明字段原样保留；数组逐项生效
        let middleware = McpSecurityMiddleware::new();
        let decl = SensitiveOutput {
            fields: vec!["id_card".to_string(), "bank_account".to_string()],
            contains_sensitive: Some(true),
        };
        let output = serde_json::json!({
            "name": "张三",
            "id_card": "130101199001011234",
            "profile": { "bank_account": "6222021234567890123" },
            "records": [
                { "id_card": "320101198505051234" }
            ],
            "phone": "13800001111"
        });
        let sanitized = middleware.sanitize_declared_fields(&output, &decl);
        assert_eq!(sanitized["name"], "张三");
        assert_eq!(sanitized["id_card"], "130****1234");
        assert_eq!(sanitized["profile"]["bank_account"], "622****0123");
        assert_eq!(sanitized["records"][0]["id_card"], "320****1234");
        // 未声明字段不受影响（P2-4：phone 为业务联系字段）
        assert_eq!(sanitized["phone"], "13800001111");
    }

    #[test]
    fn test_sanitize_declared_fields_empty_decl_noop() {
        let middleware = McpSecurityMiddleware::new();
        let decl = SensitiveOutput::default();
        let output = serde_json::json!({"password": "secret123"});
        // 空声明原样返回（全局脱敏仍由调用方在 handle_tools_call 先执行）
        assert_eq!(
            middleware.sanitize_declared_fields(&output, &decl),
            output
        );
    }
}
