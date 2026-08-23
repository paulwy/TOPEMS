// GIS 服务审计日志（P0-R2 治理：复用 shared-db AuditLogService）
#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared_db::audit::{AuditLog, AuditLogQuery, AuditLogService};
use uuid::Uuid;

/// GIS 审计资源类型常量
pub mod resources {
    pub const FACTORY_MAP: &str = "factory_map";
    pub const DEVICE_LOCATION: &str = "device_location";
    pub const PIPELINE: &str = "pipeline";
    pub const WAREHOUSE_LOCATION: &str = "warehouse_location";
    pub const BUSINESS_LOCATION: &str = "business_location";
    pub const MAP_MARKER: &str = "map_marker";
    pub const GEODATA: &str = "geodata";

    /// GIS 服务可查询的全部资源类型
    pub const ALL: &[&str] = &[
        FACTORY_MAP,
        DEVICE_LOCATION,
        PIPELINE,
        WAREHOUSE_LOCATION,
        BUSINESS_LOCATION,
        MAP_MARKER,
        GEODATA,
    ];
}

pub struct GisAuditService {
    audit_service: AuditLogService,
}

impl GisAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self {
            audit_service: AuditLogService::new(pool),
        }
    }

    /// 底层共享审计服务（供需要 query_audit_logs 等场景直接访问）
    pub fn shared(&self) -> &AuditLogService {
        &self.audit_service
    }

    pub async fn log_map_operation(
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
                resources::FACTORY_MAP,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_device_location_operation(
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
                resources::DEVICE_LOCATION,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_pipeline_operation(
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
                resources::PIPELINE,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_warehouse_location_operation(
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
                resources::WAREHOUSE_LOCATION,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_business_location_operation(
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
                resources::BUSINESS_LOCATION,
                entity_id,
                user_id,
                request_details,
                status,
                error_message,
            )
            .await
            .map(|_| ())
    }

    pub async fn log_marker_operation(
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
                resources::MAP_MARKER,
                entity_id,
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
    ) -> Result<Vec<GisAuditLogEntry>, sqlx::Error> {
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

        Ok(logs.into_iter().map(GisAuditLogEntry::from).collect())
    }
}

/// GIS 审计日志条目（兼容旧 API 字段名）
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct GisAuditLogEntry {
    pub id: Uuid,
    pub action: String,
    #[sqlx(rename = "resource_type")]
    pub entity_type: String,
    #[sqlx(rename = "resource_id")]
    pub entity_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    #[sqlx(rename = "details")]
    pub request_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<AuditLog> for GisAuditLogEntry {
    fn from(log: AuditLog) -> Self {
        let user_uuid = log.user_id.as_deref().and_then(|s| Uuid::parse_str(s).ok());
        Self {
            id: log.id,
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            user_id: user_uuid,
            request_details: log.request_details,
            status: log.status,
            error_message: log.error_message,
            ip_address: log.ip_address,
            created_at: log.created_at,
        }
    }
}
