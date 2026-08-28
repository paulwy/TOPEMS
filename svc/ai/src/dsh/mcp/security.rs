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

/// 最大输入大小（字节）
const MAX_INPUT_SIZE: usize = 1024 * 1024; // 1 MB

/// 注入检测模式列表
const INJECTION_PATTERNS: &[&str] = &[
    "DROP TABLE",
    "DELETE FROM",
    "DROP DATABASE",
    "EXEC(",
    "xp_cmdshell",
    "--",
    ";--",
    "UNION SELECT",
    "INSERT INTO",
    "UPDATE.*SET",
    "ALTER TABLE",
    "CREATE TABLE",
    "TRUNCATE TABLE",
    "INFORMATION_SCHEMA",
    "sysobjects",
    "syscolumns",
    "WAITFOR DELAY",
    "BENCHMARK(",
    "SLEEP(",
    "pg_sleep(",
];

/// 敏感字段列表（需要脱敏）
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
    "phone",
    "mobile",
    "email",
    "id_card",
    "idcard",
    "address",
    "location",
    "ip_address",
];

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
    pub fn new(user_id: impl Into<String>, tenant_id: impl Into<String>, roles: Vec<String>) -> Self {
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
        self.roles.iter().any(|role| {
            permission.starts_with(role.as_str()) || role == permission
        })
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
        Self {
            rate_limit_per_minute: 60, // 默认每分钟 60 次请求
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

    /// 检查速率限制
    pub async fn check_rate_limit(&self, user_id: &str) -> Result<(), ToolExecutionError> {
        let now = Instant::now();
        let one_minute = std::time::Duration::from_secs(60);

        let mut rate_limits = self.rate_limits.write().await;
        let entry = rate_limits.entry(user_id.to_string()).or_insert_with(|| RateLimitEntry {
            timestamps: Vec::new(),
        });

        // 清理超过 1 分钟的旧时间戳
        entry.timestamps.retain(|&t| now.duration_since(t) < one_minute);

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
            Value::Array(arr) => {
                Value::Array(arr.iter().map(|v| self.sanitize_value(v)).collect())
            }
            _ => value.clone(),
        }
    }

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
            remaining: self.rate_limit_per_minute.saturating_sub(current_count as u32),
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
mod tests {
    use super::*;

    #[test]
    fn test_authenticated_user_has_role() {
        let user = AuthenticatedUser::new("user1", "tenant1", vec!["admin".to_string(), "user".to_string()]);
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
        let result = middleware.validate_tool_input("test_tool", &large_input).await;
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
        assert_eq!(sanitized["email"], "***REDACTED***");
        assert_eq!(sanitized["profile"]["phone"], "***REDACTED***");
        assert_eq!(sanitized["profile"]["address"], "***REDACTED***");
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
        assert!(middleware.check_injection_patterns("test", "SELECT * FROM users").is_ok());
        assert!(middleware.check_injection_patterns("test", "DROP TABLE users").is_err());
        assert!(middleware.check_injection_patterns("test", "DELETE FROM users WHERE id=1").is_err());
    }
}
