// Mobile 服务审计日志（P0-R2 治理：用 log_operation() 替代重复 builder 链）
use topems_shared_db::audit::{AuditLog, AuditLogQuery, AuditLogService};
use uuid::Uuid;

/// Mobile 审计资源类型常量
pub mod resources {
    pub const PATROL: &str = "patrol";
    pub const SCAN: &str = "scan";
    pub const TASK: &str = "task";
    pub const DEVICE: &str = "device";

    /// Mobile 服务可查询的全部资源类型
    pub const ALL: &[&str] = &[PATROL, SCAN, TASK, DEVICE];
}

pub struct MobileAuditService {
    audit_service: AuditLogService,
}

impl MobileAuditService {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self {
            audit_service: AuditLogService::new(pool),
        }
    }

    /// 底层共享审计服务（供需要直接访问的场景）
    pub fn shared(&self) -> &AuditLogService {
        &self.audit_service
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
        self.audit_service
            .log_operation(
                action,
                resources::PATROL,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
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
        self.audit_service
            .log_operation(
                action,
                resources::SCAN,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
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
        self.audit_service
            .log_operation(
                action,
                resources::TASK,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
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
        self.audit_service
            .log_operation(
                action,
                resources::DEVICE,
                entity_uuid,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
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
        let page = if limit > 0 { offset / limit + 1 } else { 1 };
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

        let logs = self
            .audit_service
            .query_audit_logs(&query, Some(resources::ALL))
            .await?;

        Ok(logs.into_iter().map(MobileAuditLogEntry::from).collect())
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

impl From<AuditLog> for MobileAuditLogEntry {
    fn from(log: AuditLog) -> Self {
        Self {
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
        }
    }
}
