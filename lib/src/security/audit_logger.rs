use axum::{
    body::{to_bytes, Body},
    http::Request,
    middleware::Next,
    response::Response,
};
use serde_json::{json, Value};
use sqlx::{Pool, Postgres};
use std::sync::Arc;
use uuid::Uuid;

use crate::{audit::CreateAuditLogRequest, auth::Claims};

#[derive(Debug, Clone)]
pub struct AuditLoggerConfig {
    pub enabled: bool,
    pub max_request_body_size: usize,
    pub max_response_body_size: usize,
    pub skip_paths: Vec<String>,
    pub skip_methods: Vec<String>,
}

impl Default for AuditLoggerConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_request_body_size: 1024 * 1024,
            max_response_body_size: 1024 * 1024,
            skip_paths: vec![
                "/health".to_string(),
                "/api/v1/auth/login".to_string(),
                "/api/v1/auth/refresh".to_string(),
            ],
            skip_methods: vec!["OPTIONS".to_string()],
        }
    }
}

impl AuditLoggerConfig {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }

    pub fn with_max_body_size(mut self, max_size: usize) -> Self {
        self.max_request_body_size = max_size;
        self.max_response_body_size = max_size;
        self
    }

    pub fn with_skip_paths(mut self, paths: Vec<String>) -> Self {
        self.skip_paths = paths;
        self
    }

    pub fn add_skip_path(mut self, path: &str) -> Self {
        self.skip_paths.push(path.to_string());
        self
    }

    pub fn with_skip_methods(mut self, methods: Vec<String>) -> Self {
        self.skip_methods = methods;
        self
    }

    pub fn add_skip_method(mut self, method: &str) -> Self {
        self.skip_methods.push(method.to_string());
        self
    }

    fn should_skip(&self, path: &str, method: &str) -> bool {
        if self.skip_methods.contains(&method.to_string()) {
            return true;
        }
        self.skip_paths.iter().any(|p| path.starts_with(p))
    }
}

#[derive(Debug, Clone)]
pub struct AuditLoggerMiddleware {
    config: AuditLoggerConfig,
    db_pool: Arc<Pool<Postgres>>,
}

impl AuditLoggerMiddleware {
    pub fn new(config: AuditLoggerConfig, db_pool: Pool<Postgres>) -> Self {
        Self {
            config,
            db_pool: Arc::new(db_pool),
        }
    }

    pub fn config(&self) -> &AuditLoggerConfig {
        &self.config
    }
}

async fn read_body_bytes(body: Body, max_size: usize) -> (Body, Vec<u8>) {
    let bytes = to_bytes(body, max_size + 1).await.unwrap_or_default();
    let limited = if bytes.len() > max_size {
        bytes.slice(..max_size).to_vec()
    } else {
        bytes.to_vec()
    };
    (Body::from(bytes), limited)
}

fn extract_entity_info(path: &str, method: &str) -> (String, String) {
    let path_parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();

    let entity_type = path_parts
        .get(2)
        .map(|p| match *p {
            "users" => "user".to_string(),
            "roles" => "role".to_string(),
            "permissions" => "permission".to_string(),
            "dictionaries" | "dict-types" | "dict-items" => "dictionary".to_string(),
            "workflows" => "workflow".to_string(),
            "projects" => "project".to_string(),
            "documents" => "document".to_string(),
            "audit-logs" => "audit_log".to_string(),
            "plugins" => "plugin".to_string(),
            "settings" => "setting".to_string(),
            "orders" => "order".to_string(),
            "tasks" => "task".to_string(),
            "departments" => "department".to_string(),
            "employees" => "employee".to_string(),
            "instances" => "workflow_instance".to_string(),
            _ => p.to_string(),
        })
        .unwrap_or_else(|| "unknown".to_string());

    let action = match method {
        "POST" => "create".to_string(),
        "PUT" => "update".to_string(),
        "DELETE" => "delete".to_string(),
        "GET" => "read".to_string(),
        "PATCH" => "partial_update".to_string(),
        _ => method.to_lowercase(),
    };

    (entity_type, action)
}

fn extract_entity_id(path: &str) -> Option<Uuid> {
    let path_parts: Vec<&str> = path.split('/').filter(|p| !p.is_empty()).collect();

    for part in path_parts.iter().rev() {
        if let Ok(uuid) = Uuid::parse_str(part) {
            return Some(uuid);
        }
    }
    None
}

fn extract_user_info(req: &Request<Body>) -> (Option<String>, Option<String>) {
    if let Some(claims) = req.extensions().get::<Claims>() {
        (Some(claims.sub.clone()), Some(claims.username.clone()))
    } else {
        (None, None)
    }
}

fn extract_client_ip(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .map(|s| {
            s.split(',')
                .next()
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        })
        .or_else(|| {
            req.headers()
                .get("X-Real-IP")
                .and_then(|h| h.to_str().ok())
                .map(|s| s.to_string())
        })
}

fn extract_user_agent(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

fn truncate_value(value: &Value, max_size: usize) -> Value {
    let json_str = serde_json::to_string(value).unwrap_or_default();
    if json_str.len() > max_size {
        let truncated = &json_str[..max_size];
        json!({
            "truncated": true,
            "original_length": json_str.len(),
            "content": truncated
        })
    } else {
        value.clone()
    }
}

async fn save_audit_log(
    db_pool: &Pool<Postgres>,
    request: CreateAuditLogRequest,
) -> Result<(), sqlx::Error> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query(
        r#"INSERT INTO core_audit_logs (
            id, action, entity_type, entity_id, entity_ids,
            user_id, user_name, request_details, response_details,
            status, error_message, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"#,
    )
    .bind(id)
    .bind(&request.action)
    .bind(&request.entity_type)
    .bind(&request.entity_id)
    .bind(&request.entity_ids)
    .bind(&request.user_id)
    .bind(&request.user_name)
    .bind(&request.request_details)
    .bind(&request.response_details)
    .bind(&request.status)
    .bind(&request.error_message)
    .bind(&request.ip_address)
    .bind(&request.user_agent)
    .bind(now)
    .execute(db_pool)
    .await?;
    Ok(())
}

pub async fn audit_logger_middleware(
    middleware: Arc<AuditLoggerMiddleware>,
    req: Request<Body>,
    next: Next,
) -> Response {
    if !middleware.config.enabled {
        return next.run(req).await;
    }

    let path = req.uri().path().to_string();
    let method = req.method().as_str().to_string();

    if middleware.config.should_skip(&path, &method) {
        return next.run(req).await;
    }

    let (user_id, user_name) = extract_user_info(&req);
    let ip_address = extract_client_ip(&req);
    let user_agent = extract_user_agent(&req);
    let (entity_type, action) = extract_entity_info(&path, &method);
    let entity_id = extract_entity_id(&path);

    let (parts, body) = req.into_parts();
    let (new_body, request_body) =
        read_body_bytes(body, middleware.config.max_request_body_size).await;
    let req = Request::from_parts(parts, new_body);

    let request_details: Option<Value> = if !request_body.is_empty() {
        serde_json::from_slice(&request_body)
            .ok()
            .map(|v| truncate_value(&v, middleware.config.max_request_body_size))
    } else {
        None
    };

    let response = next.run(req).await;

    let status = response.status();
    let status_str = if status.is_success() {
        "success".to_string()
    } else if status.is_server_error() {
        "error".to_string()
    } else if status.is_client_error() {
        "failed".to_string()
    } else {
        "unknown".to_string()
    };

    let error_message = if status.is_client_error() || status.is_server_error() {
        Some(format!("HTTP {}", status.as_u16()))
    } else {
        None
    };

    let (response_parts, response_body) = {
        let (parts, body) = response.into_parts();
        let (body, bytes) = read_body_bytes(body, middleware.config.max_response_body_size).await;
        (parts, (body, bytes))
    };

    let (response_body, response_bytes) = response_body;
    let response_details: Option<Value> = if !response_bytes.is_empty() {
        serde_json::from_slice(&response_bytes)
            .ok()
            .map(|v| truncate_value(&v, middleware.config.max_response_body_size))
    } else {
        None
    };

    let audit_request = CreateAuditLogRequest::new(action, entity_type, status_str)
        .with_entity_id(entity_id.unwrap_or_else(Uuid::new_v4))
        .with_user(user_id.unwrap_or_default(), user_name.unwrap_or_default())
        .with_request_details(request_details.unwrap_or(json!({})))
        .with_response_details(response_details.unwrap_or(json!({})))
        .with_request_info(ip_address, user_agent);

    if let Some(msg) = error_message {
        let _ = save_audit_log(&middleware.db_pool, audit_request.with_error(msg)).await;
    } else {
        let _ = save_audit_log(&middleware.db_pool, audit_request).await;
    }

    Response::from_parts(response_parts, response_body)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = AuditLoggerConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_request_body_size, 1024 * 1024);
        assert!(config.skip_paths.contains(&"/health".to_string()));
    }

    #[test]
    fn test_should_skip() {
        let config = AuditLoggerConfig::default();
        assert!(config.should_skip("/health", "GET"));
        assert!(config.should_skip("/api/v1/auth/login", "POST"));
        assert!(!config.should_skip("/api/v1/users", "GET"));
    }

    #[test]
    fn test_extract_entity_info() {
        let (entity_type, action) = extract_entity_info("/api/v1/users", "POST");
        assert_eq!(entity_type, "user");
        assert_eq!(action, "create");

        let (entity_type, action) = extract_entity_info("/api/v1/workflows", "GET");
        assert_eq!(entity_type, "workflow");
        assert_eq!(action, "read");
    }

    #[test]
    fn test_extract_entity_id() {
        let id_str = "550e8400-e29b-41d4-a716-446655440000";
        let path = format!("/api/v1/users/{}", id_str);
        let entity_id = extract_entity_id(&path);
        assert!(entity_id.is_some());
        assert_eq!(entity_id.unwrap().to_string(), id_str);
    }

    #[test]
    fn test_truncate_value() {
        let large_value = json!({"data": "x".repeat(2000)});
        let truncated = truncate_value(&large_value, 1000);
        assert!(truncated.as_object().unwrap().contains_key("truncated"));
    }

    #[test]
    fn test_config_builders() {
        let config = AuditLoggerConfig::new()
            .with_enabled(false)
            .add_skip_path("/metrics")
            .add_skip_method("HEAD");

        assert!(!config.enabled);
        assert!(config.skip_paths.contains(&"/metrics".to_string()));
        assert!(config.skip_methods.contains(&"HEAD".to_string()));
    }
}
