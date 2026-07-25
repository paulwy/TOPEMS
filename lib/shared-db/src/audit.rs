use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuditLogRequest {
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub entity_ids: Option<serde_json::Value>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub request_details: Option<serde_json::Value>,
    pub response_details: Option<serde_json::Value>,
    pub status: String,
    pub error_message: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogQuery {
    pub action: Option<String>,
    pub entity_type: Option<String>,
    pub user_id: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

impl CreateAuditLogRequest {
    pub fn new(action: String, entity_type: String, status: String) -> Self {
        Self {
            action,
            entity_type,
            entity_id: None,
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: None,
            status,
            error_message: None,
            ip_address: None,
            user_agent: None,
        }
    }

    pub fn with_entity_id(mut self, entity_id: Uuid) -> Self {
        self.entity_id = Some(entity_id);
        self
    }

    pub fn with_entity_ids(mut self, entity_ids: serde_json::Value) -> Self {
        self.entity_ids = Some(entity_ids);
        self
    }

    pub fn with_user(mut self, user_id: String, user_name: String) -> Self {
        self.user_id = Some(user_id);
        self.user_name = Some(user_name);
        self
    }

    pub fn with_request_details(mut self, details: serde_json::Value) -> Self {
        self.request_details = Some(details);
        self
    }

    pub fn with_response_details(mut self, details: serde_json::Value) -> Self {
        self.response_details = Some(details);
        self
    }

    pub fn with_error(mut self, error_message: String) -> Self {
        self.error_message = Some(error_message);
        self
    }

    pub fn with_request_info(
        mut self,
        ip_address: Option<String>,
        user_agent: Option<String>,
    ) -> Self {
        self.ip_address = ip_address;
        self.user_agent = user_agent;
        self
    }
}

#[derive(Debug, Clone)]
pub struct AuditLogService {
    pool: PgPool,
}

impl AuditLogService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_audit_log(
        &self,
        request: &CreateAuditLogRequest,
    ) -> Result<AuditLog, sqlx::Error> {
        let details_str = request
            .request_details
            .as_ref()
            .map(|d| serde_json::to_string(d).ok())
            .flatten();
        let user_uuid = request.user_id.as_deref().and_then(|s| Uuid::parse_str(s).ok());

        let record = sqlx::query_as::<_, AuditLogRecord>(
            r#"
            INSERT INTO public.audit_logs (action, resource, resource_id, user_id, details, status, error_message, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, action, resource as entity_type, resource_id as entity_id, user_id::text, details as request_details, status, error_message, ip_address, user_agent, created_at
            "#,
        )
        .bind(&request.action)
        .bind(&request.entity_type)
        .bind(request.entity_id)
        .bind(user_uuid)
        .bind(details_str)
        .bind(&request.status)
        .bind(request.error_message.as_deref())
        .bind(request.ip_address.as_deref())
        .bind(request.user_agent.as_deref())
        .fetch_one(&self.pool)
        .await?;

        Ok(record.into_audit_log())
    }

    pub async fn query_audit_logs(
        &self,
        query: &AuditLogQuery,
        resources_filter: Option<&[&str]>,
    ) -> Result<Vec<AuditLog>, sqlx::Error> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(20);
        let limit = page_size;
        let offset = (page - 1) * page_size;

        let resource_filter_sql = if let Some(resources) = resources_filter {
            let placeholders: Vec<String> = resources
                .iter()
                .enumerate()
                .map(|(i, _)| format!("${}", i + 5))
                .collect();
            format!("AND resource IN ({})", placeholders.join(", "))
        } else {
            String::new()
        };

        let sql = format!(
            r#"
            SELECT 
                id, action, resource as entity_type, resource_id as entity_id, 
                user_id::text, details as request_details, status, error_message, 
                ip_address, user_agent, created_at
            FROM public.audit_logs
            WHERE ($1::text IS NULL OR action = $1)
              AND ($2::text IS NULL OR resource = $2)
              AND ($3::text IS NULL OR user_id::text = $3)
              AND ($4::text IS NULL OR status = $4)
              {}
            ORDER BY created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            resource_filter_sql,
            if resources_filter.is_some() { 5 + resources_filter.unwrap().len() } else { 5 },
            if resources_filter.is_some() { 6 + resources_filter.unwrap().len() } else { 6 },
        );

        let mut q = sqlx::query_as::<_, AuditLogRecord>(&sql)
            .bind(query.action.as_deref())
            .bind(query.entity_type.as_deref())
            .bind(query.user_id.as_deref())
            .bind(query.status.as_deref());

        if let Some(resources) = resources_filter {
            for res in resources {
                q = q.bind(*res);
            }
        }

        q = q.bind(limit).bind(offset);

        let records = q.fetch_all(&self.pool).await?;
        Ok(records.into_iter().map(|r| r.into_audit_log()).collect())
    }
}

#[derive(Debug, Clone, FromRow)]
struct AuditLogRecord {
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
    pub created_at: DateTime<Utc>,
}

impl AuditLogRecord {
    fn into_audit_log(self) -> AuditLog {
        AuditLog {
            id: self.id,
            action: self.action,
            entity_type: self.entity_type,
            entity_id: self.entity_id,
            entity_ids: None,
            user_id: self.user_id,
            user_name: None,
            request_details: self.request_details,
            response_details: None,
            status: self.status,
            error_message: self.error_message,
            ip_address: self.ip_address,
            user_agent: self.user_agent,
            created_at: self.created_at,
        }
    }
}
