//! MCP 安全治理专项。
//!
//! 提供 MCP 协议的专项安全治理功能，包括：
//! - MCP 工具访问审计
//! - MCP 工具权限矩阵
//! - MCP 安全事件监控
//! - MCP 越权检测

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{info, warn};

/// MCP 安全事件类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum McpSecurityEventType {
    /// 工具调用
    ToolCall,
    /// 权限拒绝
    PermissionDenied,
    /// 输入验证失败
    ValidationFailed,
    /// 注入检测
    InjectionDetected,
    /// 速率限制
    RateLimitExceeded,
    /// 敏感信息泄露
    SensitiveDataLeak,
}

/// MCP 安全事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpSecurityEvent {
    /// 事件 ID
    pub event_id: String,
    /// 事件类型
    pub event_type: McpSecurityEventType,
    /// 用户 ID
    pub user_id: String,
    /// 租户 ID
    pub tenant_id: String,
    /// 工具名称
    pub tool_name: String,
    /// 事件描述
    pub description: String,
    /// 事件时间戳
    pub timestamp: String,
    /// 严重程度（low/medium/high/critical）
    pub severity: String,
    /// 事件详情
    pub details: Option<serde_json::Value>,
}

impl McpSecurityEvent {
    /// 创建新的安全事件
    pub fn new(
        event_type: McpSecurityEventType,
        user_id: impl Into<String>,
        tenant_id: impl Into<String>,
        tool_name: impl Into<String>,
        description: impl Into<String>,
        severity: impl Into<String>,
    ) -> Self {
        Self {
            event_id: uuid::Uuid::new_v4().to_string(),
            event_type,
            user_id: user_id.into(),
            tenant_id: tenant_id.into(),
            tool_name: tool_name.into(),
            description: description.into(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            severity: severity.into(),
            details: None,
        }
    }

    /// 添加事件详情
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}

/// MCP 工具权限矩阵条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolPermission {
    /// 工具名称
    pub tool_name: String,
    /// 所需角色列表
    pub required_roles: Vec<String>,
    /// 所需权限列表
    pub required_permissions: Vec<String>,
    /// 是否允许匿名访问
    pub allow_anonymous: bool,
    /// 每日调用上限（0 表示无限制）
    pub daily_limit: u32,
    /// 是否需要审计
    pub require_audit: bool,
}

impl McpToolPermission {
    /// 创建新的工具权限
    pub fn new(tool_name: impl Into<String>) -> Self {
        Self {
            tool_name: tool_name.into(),
            required_roles: Vec::new(),
            required_permissions: Vec::new(),
            allow_anonymous: false,
            daily_limit: 0,
            require_audit: true,
        }
    }

    /// 添加所需角色
    pub fn with_required_role(mut self, role: impl Into<String>) -> Self {
        self.required_roles.push(role.into());
        self
    }

    /// 添加所需权限
    pub fn with_required_permission(mut self, permission: impl Into<String>) -> Self {
        self.required_permissions.push(permission.into());
        self
    }

    /// 设置是否允许匿名访问
    pub fn with_allow_anonymous(mut self, allow: bool) -> Self {
        self.allow_anonymous = allow;
        self
    }

    /// 设置每日调用上限
    pub fn with_daily_limit(mut self, limit: u32) -> Self {
        self.daily_limit = limit;
        self
    }
}

/// MCP 用户调用统计
#[derive(Debug, Clone, Default)]
struct UserCallStats {
    /// 今日调用次数
    daily_calls: HashMap<String, u32>,
    /// 最后重置日期
    last_reset: String,
}

/// MCP 安全治理
///
/// 提供 MCP 协议的专项安全治理功能。
#[derive(Clone)]
pub struct McpSecurityGovernance {
    /// 工具权限矩阵
    tool_permissions: Arc<RwLock<HashMap<String, McpToolPermission>>>,
    /// 安全事件日志
    security_events: Arc<RwLock<Vec<McpSecurityEvent>>>,
    /// 用户调用统计
    user_call_stats: Arc<RwLock<HashMap<String, UserCallStats>>>,
    /// 最大安全事件日志数量
    max_event_log_size: usize,
}

impl Default for McpSecurityGovernance {
    fn default() -> Self {
        Self::new()
    }
}

impl McpSecurityGovernance {
    /// 创建新的 MCP 安全治理实例
    pub fn new() -> Self {
        Self {
            tool_permissions: Arc::new(RwLock::new(HashMap::new())),
            security_events: Arc::new(RwLock::new(Vec::new())),
            user_call_stats: Arc::new(RwLock::new(HashMap::new())),
            max_event_log_size: 10000,
        }
    }

    /// 注册工具权限
    pub async fn register_tool_permission(&self, permission: McpToolPermission) {
        let tool_name = permission.tool_name.clone();
        let mut tool_permissions = self.tool_permissions.write().await;
        tool_permissions.insert(tool_name.clone(), permission);
        info!("Tool permission registered: {}", tool_name);
    }

    /// 获取工具权限
    pub async fn get_tool_permission(&self, tool_name: &str) -> Option<McpToolPermission> {
        let tool_permissions = self.tool_permissions.read().await;
        tool_permissions.get(tool_name).cloned()
    }

    /// 检查用户是否有权限调用工具
    pub async fn check_tool_permission(
        &self,
        user_id: &str,
        tenant_id: &str,
        tool_name: &str,
        user_roles: &[String],
    ) -> Result<(), String> {
        let tool_permissions = self.tool_permissions.read().await;
        let Some(permission) = tool_permissions.get(tool_name) else {
            // 如果没有注册权限，默认允许（向后兼容）
            return Ok(());
        };

        // 检查是否允许匿名访问
        if permission.allow_anonymous && user_id.is_empty() {
            return Ok(());
        }

        // 检查所需角色
        if !permission.required_roles.is_empty() {
            let has_role = user_roles.iter().any(|role| {
                permission.required_roles.contains(role)
                    || role == "admin"
                    || role == "super_admin"
            });
            if !has_role {
                let err = format!(
                    "User '{}' does not have required roles for tool '{}'",
                    user_id, tool_name
                );
                warn!(user_id = user_id, tool = tool_name, "Permission denied: missing roles");
                self.log_security_event(McpSecurityEvent::new(
                    McpSecurityEventType::PermissionDenied,
                    user_id,
                    tenant_id,
                    tool_name,
                    err.clone(),
                    "high",
                ))
                .await;
                return Err(err);
            }
        }

        // 检查每日调用上限
        if permission.daily_limit > 0 {
            let daily_calls = self.get_user_daily_calls(user_id, tool_name).await;
            if daily_calls >= permission.daily_limit {
                let err = format!(
                    "Daily limit exceeded for tool '{}': {}/{}",
                    tool_name, daily_calls, permission.daily_limit
                );
                warn!(user_id = user_id, tool = tool_name, "Daily limit exceeded");
                self.log_security_event(McpSecurityEvent::new(
                    McpSecurityEventType::RateLimitExceeded,
                    user_id,
                    tenant_id,
                    tool_name,
                    err.clone(),
                    "medium",
                ))
                .await;
                return Err(err);
            }
        }

        Ok(())
    }

    /// 记录工具调用
    pub async fn record_tool_call(&self, user_id: &str, tool_name: &str) {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let mut user_call_stats = self.user_call_stats.write().await;
        let stats = user_call_stats
            .entry(user_id.to_string())
            .or_insert_with(UserCallStats::default);

        // 检查是否需要重置每日统计
        if stats.last_reset != today {
            stats.daily_calls.clear();
            stats.last_reset = today;
        }

        *stats.daily_calls.entry(tool_name.to_string()).or_insert(0) += 1;
    }

    /// 获取用户今日调用次数
    pub async fn get_user_daily_calls(&self, user_id: &str, tool_name: &str) -> u32 {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let user_call_stats = self.user_call_stats.read().await;
        user_call_stats
            .get(user_id)
            .filter(|stats| stats.last_reset == today)
            .and_then(|stats| stats.daily_calls.get(tool_name))
            .copied()
            .unwrap_or(0)
    }

    /// 记录安全事件
    pub async fn log_security_event(&self, event: McpSecurityEvent) {
        let mut security_events = self.security_events.write().await;

        // 如果超过最大日志数量，删除最旧的事件
        if security_events.len() >= self.max_event_log_size {
            let remove_count = self.max_event_log_size / 10;
            security_events.drain(0..remove_count);
        }

        security_events.push(event);
    }

    /// 获取安全事件列表
    pub async fn get_security_events(
        &self,
        event_type: Option<McpSecurityEventType>,
        limit: usize,
    ) -> Vec<McpSecurityEvent> {
        let security_events = self.security_events.read().await;
        let mut events: Vec<McpSecurityEvent> = if let Some(event_type) = event_type {
            security_events
                .iter()
                .filter(|e| e.event_type == event_type)
                .cloned()
                .collect()
        } else {
            security_events.clone()
        };

        // 按时间倒序排列
        events.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        events.truncate(limit);
        events
    }

    /// 获取安全统计
    pub async fn get_security_stats(&self) -> McpSecurityStats {
        let security_events = self.security_events.read().await;
        let tool_permissions = self.tool_permissions.read().await;

        let mut event_type_counts = HashMap::new();
        let mut severity_counts = HashMap::new();

        for event in security_events.iter() {
            *event_type_counts
                .entry(format!("{:?}", event.event_type))
                .or_insert(0) += 1;
            *severity_counts.entry(event.severity.clone()).or_insert(0) += 1;
        }

        McpSecurityStats {
            total_events: security_events.len(),
            total_tools_protected: tool_permissions.len(),
            event_type_counts,
            severity_counts,
        }
    }

    /// 越权检测：检查用户是否尝试访问未授权的工具
    pub async fn detect_privilege_escalation(
        &self,
        user_id: &str,
        tenant_id: &str,
        tool_name: &str,
        user_roles: &[String],
    ) -> Option<McpSecurityEvent> {
        let tool_permissions = self.tool_permissions.read().await;
        let Some(permission) = tool_permissions.get(tool_name) else {
            return None;
        };

        // 检查用户是否尝试访问需要高权限的工具
        let requires_admin = permission.required_roles.iter().any(|r| {
            r == "admin" || r == "super_admin" || r.contains("admin")
        });

        let is_admin = user_roles.iter().any(|r| r == "admin" || r == "super_admin");

        if requires_admin && !is_admin {
            let event = McpSecurityEvent::new(
                McpSecurityEventType::PermissionDenied,
                user_id,
                tenant_id,
                tool_name,
                format!("Potential privilege escalation attempt by non-admin user"),
                "critical",
            )
            .with_details(serde_json::json!({
                "user_roles": user_roles,
                "required_roles": permission.required_roles,
            }));

            return Some(event);
        }

        None
    }
}

/// MCP 安全统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpSecurityStats {
    /// 总安全事件数
    pub total_events: usize,
    /// 受保护的工具总数
    pub total_tools_protected: usize,
    /// 按事件类型统计
    pub event_type_counts: HashMap<String, usize>,
    /// 按严重程度统计
    pub severity_counts: HashMap<String, usize>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_and_get_tool_permission() {
        let governance = McpSecurityGovernance::new();
        let permission = McpToolPermission::new("crm.list_customers")
            .with_required_role("crm_user")
            .with_daily_limit(100);

        governance.register_tool_permission(permission).await;

        let retrieved = governance.get_tool_permission("crm.list_customers").await;
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().daily_limit, 100);
    }

    #[tokio::test]
    async fn test_check_tool_permission_success() {
        let governance = McpSecurityGovernance::new();
        let permission = McpToolPermission::new("crm.list_customers")
            .with_required_role("crm_user");

        governance.register_tool_permission(permission).await;

        let result = governance
            .check_tool_permission("user1", "tenant1", "crm.list_customers", &["crm_user".to_string()])
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_check_tool_permission_denied() {
        let governance = McpSecurityGovernance::new();
        let permission = McpToolPermission::new("crm.list_customers")
            .with_required_role("crm_user");

        governance.register_tool_permission(permission).await;

        let result = governance
            .check_tool_permission("user1", "tenant1", "crm.list_customers", &["erp_user".to_string()])
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_record_and_get_daily_calls() {
        let governance = McpSecurityGovernance::new();
        governance.record_tool_call("user1", "crm.list_customers").await;
        governance.record_tool_call("user1", "crm.list_customers").await;

        let calls = governance.get_user_daily_calls("user1", "crm.list_customers").await;
        assert_eq!(calls, 2);
    }

    #[tokio::test]
    async fn test_log_and_get_security_events() {
        let governance = McpSecurityGovernance::new();
        let event = McpSecurityEvent::new(
            McpSecurityEventType::PermissionDenied,
            "user1",
            "tenant1",
            "crm.list_customers",
            "Permission denied",
            "high",
        );

        governance.log_security_event(event).await;

        let events = governance
            .get_security_events(Some(McpSecurityEventType::PermissionDenied), 10)
            .await;
        assert_eq!(events.len(), 1);
    }

    #[tokio::test]
    async fn test_detect_privilege_escalation() {
        let governance = McpSecurityGovernance::new();
        let permission = McpToolPermission::new("admin.delete_user")
            .with_required_role("admin");

        governance.register_tool_permission(permission).await;

        let event = governance
            .detect_privilege_escalation("user1", "tenant1", "admin.delete_user", &["user".to_string()])
            .await;
        assert!(event.is_some());
        assert_eq!(event.unwrap().severity, "critical");
    }

    #[tokio::test]
    async fn test_get_security_stats() {
        let governance = McpSecurityGovernance::new();
        let event = McpSecurityEvent::new(
            McpSecurityEventType::PermissionDenied,
            "user1",
            "tenant1",
            "crm.list_customers",
            "Permission denied",
            "high",
        );
        governance.log_security_event(event).await;

        let stats = governance.get_security_stats().await;
        assert_eq!(stats.total_events, 1);
    }
}
