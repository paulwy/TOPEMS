use topems_shared_db::audit::{AuditLogQuery, AuditLogService, CreateAuditLogRequest};
use uuid::Uuid;

pub struct MobileAuditService {
    audit_service: AuditLogService,
}

impl MobileAuditService {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self {
            audit_service: AuditLogService::new(pool),
        }
    }

    pub async fn log_patrol_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let mut req = CreateAuditLogRequest::new(
            action.to_string(),
            "patrol".to_string(),
            status.to_string(),
        );
        if let Some(eid) = entity_id {
            req = req.with_entity_id(eid);
        }
        if let Some(uid) = user_id {
            req = req.with_user(uid.to_string(), String::new());
        }
        if let Some(details) = request_details {
            req = req.with_request_details(details);
        }
        if let Some(err) = error_message {
            req = req.with_error(err.to_string());
        }

        match self.audit_service.create_audit_log(&req).await {
            Ok(_) => Ok(()),
            Err(e) => {
                tracing::error!("[MobileAudit] Failed to log patrol operation: {}", e);
                Err(e)
            }
        }
    }

    pub async fn log_scan_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let mut req =
            CreateAuditLogRequest::new(action.to_string(), "scan".to_string(), status.to_string());
        if let Some(eid) = entity_id {
            req = req.with_entity_id(eid);
        }
        if let Some(uid) = user_id {
            req = req.with_user(uid.to_string(), String::new());
        }
        if let Some(details) = request_details {
            req = req.with_request_details(details);
        }
        if let Some(err) = error_message {
            req = req.with_error(err.to_string());
        }

        match self.audit_service.create_audit_log(&req).await {
            Ok(_) => Ok(()),
            Err(e) => {
                tracing::error!("[MobileAudit] Failed to log scan operation: {}", e);
                Err(e)
            }
        }
    }

    pub async fn log_task_operation(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let mut req =
            CreateAuditLogRequest::new(action.to_string(), "task".to_string(), status.to_string());
        if let Some(eid) = entity_id {
            req = req.with_entity_id(eid);
        }
        if let Some(uid) = user_id {
            req = req.with_user(uid.to_string(), String::new());
        }
        if let Some(details) = request_details {
            req = req.with_request_details(details);
        }
        if let Some(err) = error_message {
            req = req.with_error(err.to_string());
        }

        match self.audit_service.create_audit_log(&req).await {
            Ok(_) => Ok(()),
            Err(e) => {
                tracing::error!("[MobileAudit] Failed to log task operation: {}", e);
                Err(e)
            }
        }
    }

    pub async fn log_device_operation(
        &self,
        action: &str,
        entity_id: Option<&str>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), sqlx::Error> {
        let entity_uuid = entity_id.and_then(|s| Uuid::parse_str(s).ok());
        let mut req = CreateAuditLogRequest::new(
            action.to_string(),
            "device".to_string(),
            status.to_string(),
        );
        if let Some(eid) = entity_uuid {
            req = req.with_entity_id(eid);
        }
        if let Some(uid) = user_id {
            req = req.with_user(uid.to_string(), String::new());
        }
        if let Some(details) = request_details {
            req = req.with_request_details(details);
        }
        if let Some(err) = error_message {
            req = req.with_error(err.to_string());
        }

        match self.audit_service.create_audit_log(&req).await {
            Ok(_) => Ok(()),
            Err(e) => {
                tracing::error!("[MobileAudit] Failed to log device operation: {}", e);
                Err(e)
            }
        }
    }

    pub async fn query_audit_logs(
        &self,
        action: Option<&str>,
        resource: Option<&str>,
        user_id: Option<&str>,
        status: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<MobileAuditLogEntry>, sqlx::Error> {
        let page = offset / limit + 1;
        let query = AuditLogQuery {
            action: action.map(|s| s.to_string()),
            entity_type: resource.map(|s| s.to_string()),
            user_id: user_id.map(|s| s.to_string()),
            status: status.map(|s| s.to_string()),
            start_date: None,
            end_date: None,
            page: Some(page),
            page_size: Some(limit),
        };

        let resources = &["patrol", "scan", "task", "device"];
        let logs = self
            .audit_service
            .query_audit_logs(&query, Some(resources))
            .await?;

        Ok(logs
            .into_iter()
            .map(|log| MobileAuditLogEntry {
                id: log.id,
                action: log.action,
                entity_type: log.entity_type,
                entity_id: log.entity_id,
                user_id: log.user_id,
                request_details: log.request_details,
                status: log.status,
                error_message: log.error_message,
                ip_address: log.ip_address,
                user_agent: log.user_agent,
                created_at: log.created_at,
            })
            .collect())
    }
}

#[derive(Debug, Clone)]
pub struct MobileAuditLogEntry {
    pub id: Uuid,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub user_id: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
