//! Audit Logging Middleware
//! 
//! Records audit logs for critical operations.

use std::sync::Arc;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Audit event severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AuditSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

/// Audit event categories
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuditCategory {
    Authentication,
    Authorization,
    DataAccess,
    DataModification,
    Configuration,
    System,
    Security,
    Business,
}

/// Audit event action types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    Create,
    Read,
    Update,
    Delete,
    Login,
    Logout,
    Export,
    Import,
    Approve,
    Reject,
    Execute,
    Access,
}

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub service: String,
    pub module: String,
    pub category: AuditCategory,
    pub action: AuditAction,
    pub resource_type: String,
    pub resource_id: Option<String>,
    pub severity: AuditSeverity,
    pub success: bool,
    pub error_message: Option<String>,
    pub request_id: Option<String>,
    pub session_id: Option<String>,
    pub details: Option<serde_json::Value>,
    pub before_state: Option<serde_json::Value>,
    pub after_state: Option<serde_json::Value>,
}

impl AuditLog {
    pub fn new(
        service: impl Into<String>,
        module: impl Into<String>,
        category: AuditCategory,
        action: AuditAction,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            user_id: None,
            username: None,
            ip_address: None,
            user_agent: None,
            service: service.into(),
            module: module.into(),
            category,
            action,
            resource_type: String::new(),
            resource_id: None,
            severity: AuditSeverity::Info,
            success: true,
            error_message: None,
            request_id: None,
            session_id: None,
            details: None,
            before_state: None,
            after_state: None,
        }
    }

    pub fn with_user(mut self, user_id: impl Into<String>, username: impl Into<String>) -> Self {
        self.user_id = Some(user_id.into());
        self.username = Some(username.into());
        self
    }

    pub fn with_resource(mut self, resource_type: impl Into<String>, resource_id: impl Into<String>) -> Self {
        self.resource_type = resource_type.into();
        self.resource_id = Some(resource_id.into());
        self
    }

    pub fn with_client_info(mut self, ip: impl Into<String>, user_agent: impl Into<String>) -> Self {
        self.ip_address = Some(ip.into());
        self.user_agent = Some(user_agent.into());
        self
    }

    pub fn with_severity(mut self, severity: AuditSeverity) -> Self {
        self.severity = severity;
        self
    }

    pub fn with_request_context(mut self, request_id: Option<String>, session_id: Option<String>) -> Self {
        self.request_id = request_id;
        self.session_id = session_id;
        self
    }

    pub fn with_success(mut self, success: bool, error_message: Option<String>) -> Self {
        self.success = success;
        self.error_message = error_message;
        if !success {
            self.severity = AuditSeverity::Error;
        }
        self
    }

    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }

    pub fn with_state_changes(
        mut self,
        before: Option<serde_json::Value>,
        after: Option<serde_json::Value>,
    ) -> Self {
        self.before_state = before;
        self.after_state = after;
        self
    }
}

/// Audit context for storing user information
#[derive(Debug, Clone, Default)]
pub struct AuditContext {
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: Option<String>,
    pub session_id: Option<String>,
}

impl AuditContext {
    pub fn from_request(request: &axum::extract::Request) -> Self {
        let mut ctx = Self::default();
        
        // Extract from extensions
        if let Some(user_id) = request.extensions().get::<String>() {
            ctx.user_id = Some(user_id.clone());
        }
        
        if let Some(username) = request.extensions().get::<String>() {
            ctx.username = Some(username.clone());
        }

        // Extract from headers
        let headers = request.headers();
        
        if let Some(ip) = headers.get("x-forwarded-for") {
            if let Ok(ip_str) = ip.to_str() {
                ctx.ip_address = Some(ip_str.split(',').next().unwrap_or("").trim().to_string());
            }
        } else if let Some(ip) = headers.get("x-real-ip") {
            if let Ok(ip_str) = ip.to_str() {
                ctx.ip_address = Some(ip_str.to_string());
            }
        }

        if let Some(ua) = headers.get("user-agent") {
            if let Ok(ua_str) = ua.to_str() {
                ctx.user_agent = Some(ua_str.to_string());
            }
        }

        if let Some(req_id) = headers.get("x-request-id") {
            if let Ok(id) = req_id.to_str() {
                ctx.request_id = Some(id.to_string());
            }
        }

        ctx
    }

    pub fn apply_to_log(&self, log: AuditLog) -> AuditLog {
        log.with_user(
            self.user_id.clone().unwrap_or_default(),
            self.username.clone().unwrap_or_default(),
        )
        .with_client_info(
            self.ip_address.clone().unwrap_or_default(),
            self.user_agent.clone().unwrap_or_default(),
        )
        .with_request_context(self.request_id.clone(), self.session_id.clone())
    }
}

/// Audit logger trait for different storage backends
#[async_trait]
pub trait AuditLogger: Send + Sync {
    async fn log(&self, entry: &AuditLog) -> Result<(), String>;
    async fn query(&self, filter: &AuditFilter) -> Result<Vec<AuditLog>, String>;
}

/// Filter for querying audit logs
#[derive(Debug, Clone, Default)]
pub struct AuditFilter {
    pub user_id: Option<String>,
    pub service: Option<String>,
    pub module: Option<String>,
    pub category: Option<AuditCategory>,
    pub action: Option<AuditAction>,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub severity: Option<AuditSeverity>,
    pub success: Option<bool>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

/// Database audit logger implementation
#[derive(Clone)]
pub struct DbAuditLogger {
    pool: sqlx::PgPool,
}

impl DbAuditLogger {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AuditLogger for DbAuditLogger {
    async fn log(&self, entry: &AuditLog) -> Result<(), String> {
        sqlx::query(
            r#"
            INSERT INTO sys_audit_logs (
                id, timestamp, user_id, username, ip_address, user_agent,
                service, module, category, action, resource_type, resource_id,
                severity, success, error_message, request_id, session_id,
                details, before_state, after_state
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            "#,
        )
        .bind(&entry.id)
        .bind(entry.timestamp)
        .bind(&entry.user_id)
        .bind(&entry.username)
        .bind(&entry.ip_address)
        .bind(&entry.user_agent)
        .bind(&entry.service)
        .bind(&entry.module)
        .bind(serde_json::to_string(&entry.category).unwrap_or_default())
        .bind(serde_json::to_string(&entry.action).unwrap_or_default())
        .bind(&entry.resource_type)
        .bind(&entry.resource_id)
        .bind(serde_json::to_string(&entry.severity).unwrap_or_default())
        .bind(entry.success)
        .bind(&entry.error_message)
        .bind(&entry.request_id)
        .bind(&entry.session_id)
        .bind(&entry.details)
        .bind(&entry.before_state)
        .bind(&entry.after_state)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Failed to write audit log: {}", e))?;

        Ok(())
    }

    async fn query(&self, filter: &AuditFilter) -> Result<Vec<AuditLog>, String> {
        let limit = filter.limit.unwrap_or(100) as i64;
        let offset = filter.offset.unwrap_or(0) as i64;

        let sql = format!(
            r#"
            SELECT * FROM sys_audit_logs
            ORDER BY timestamp DESC
            LIMIT {} OFFSET {}
            "#,
            limit, offset
        );

        let rows = sqlx::query(&sql)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to query audit logs: {}", e))?;

        Ok(rows
            .into_iter()
            .map(|row| {
                use sqlx::Row;
                AuditLog {
                    id: row.get("id"),
                    timestamp: row.get("timestamp"),
                    user_id: row.get("user_id"),
                    username: row.get("username"),
                    ip_address: row.get("ip_address"),
                    user_agent: row.get("user_agent"),
                    service: row.get("service"),
                    module: row.get("module"),
                    category: serde_json::from_str(&row.get::<String, _>("category")).unwrap_or(AuditCategory::System),
                    action: serde_json::from_str(&row.get::<String, _>("action")).unwrap_or(AuditAction::Access),
                    resource_type: row.get("resource_type"),
                    resource_id: row.get("resource_id"),
                    severity: serde_json::from_str(&row.get::<String, _>("severity")).unwrap_or(AuditSeverity::Info),
                    success: row.get("success"),
                    error_message: row.get("error_message"),
                    request_id: row.get("request_id"),
                    session_id: row.get("session_id"),
                    details: row.get("details"),
                    before_state: row.get("before_state"),
                    after_state: row.get("after_state"),
                }
            })
            .collect())
    }
}

/// In-memory audit logger for testing
pub struct InMemoryAuditLogger {
    logs: Arc<std::sync::Mutex<Vec<AuditLog>>>,
}

impl InMemoryAuditLogger {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(std::sync::Mutex::new(Vec::new())),
        }
    }
}

impl Default for InMemoryAuditLogger {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AuditLogger for InMemoryAuditLogger {
    async fn log(&self, entry: &AuditLog) -> Result<(), String> {
        let mut logs = self.logs.lock().unwrap();
        logs.push(entry.clone());
        Ok(())
    }

    async fn query(&self, _filter: &AuditFilter) -> Result<Vec<AuditLog>, String> {
        let logs = self.logs.lock().unwrap();
        Ok(logs.clone())
    }
}

/// Middleware for automatic audit logging
pub async fn audit_middleware(
    logger: Arc<dyn AuditLogger>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let context = AuditContext::from_request(&request);
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    let response = next.run(request).await;

    // Log the request
    let action = match method.as_str() {
        "GET" => AuditAction::Read,
        "POST" => AuditAction::Create,
        "PUT" | "PATCH" => AuditAction::Update,
        "DELETE" => AuditAction::Delete,
        _ => AuditAction::Access,
    };

    let severity = if response.status().is_success() {
        AuditSeverity::Info
    } else if response.status().is_server_error() {
        AuditSeverity::Error
    } else {
        AuditSeverity::Warning
    };

    let log = AuditLog::new("api", "http", AuditCategory::DataAccess, action)
        .with_severity(severity)
        .with_resource("endpoint", &path)
        .with_success(response.status().is_success(), None);
    
    let log = context.apply_to_log(log);

    if let Err(e) = logger.log(&log).await {
        tracing::error!("Failed to write audit log: {}", e);
    }

    response
}
