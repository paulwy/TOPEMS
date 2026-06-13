// GIS 服务审计日志
#![allow(dead_code)]

use sqlx::PgPool;
use uuid::Uuid;

pub struct GisAuditService {
    pool: PgPool,
}

impl GisAuditService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO gis.audit_logs (action, resource_type, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("factory_map")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO gis.audit_logs (action, resource_type, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("device_location")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO gis.audit_logs (action, resource_type, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("pipeline")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO gis.audit_logs (action, resource_type, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("warehouse_location")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO gis.audit_logs (action, resource_type, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("business_location")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let details_str = request_details
            .map(|d| serde_json::to_string(&d).ok())
            .flatten();
        let user_uuid = user_id.and_then(|s| Uuid::parse_str(s).ok());

        sqlx::query(
            r#"
            INSERT INTO gis.audit_logs (action, resource_type, resource_id, user_id, details, status, error_message)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(action)
        .bind("map_marker")
        .bind(entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(status)
        .bind(error_message)
        .execute(&self.pool)
        .await?;

        Ok(())
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
        let logs = sqlx::query_as::<_, GisAuditLogEntry>(
            r#"
            SELECT
                id, action, resource_type, resource_id,
                user_id, details as request_details, status, error_message,
                ip_address, created_at
            FROM gis.audit_logs
            WHERE ($1::text IS NULL OR action = $1)
              AND ($2::text IS NULL OR resource_type = $2)
              AND ($3::text IS NULL OR user_id::text = $3)
              AND ($4::text IS NULL OR status = $4)
              AND resource_type IN ('factory_map', 'device_location', 'pipeline', 'warehouse_location', 'business_location', 'map_marker', 'geodata')
            ORDER BY created_at DESC
            LIMIT $5 OFFSET $6
            "#,
        )
        .bind(action)
        .bind(resource)
        .bind(user_id)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(logs)
    }
}

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
