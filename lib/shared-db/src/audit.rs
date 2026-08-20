use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, utoipa::ToSchema)]
pub struct AuditLog {
    pub id: Uuid,
    pub tenant_id: Option<Uuid>,
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

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
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
            .and_then(|d| serde_json::to_string(d).ok());
        let user_uuid = request
            .user_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());

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

        let resource_filter_len = resources_filter.map(|r| r.len()).unwrap_or(0);
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
            5 + resource_filter_len,
            6 + resource_filter_len,
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
            tenant_id: None,
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_create_audit_log_request_new_defaults() {
        let req = CreateAuditLogRequest::new(
            "create".to_string(),
            "user".to_string(),
            "success".to_string(),
        );
        assert_eq!(req.action, "create");
        assert_eq!(req.entity_type, "user");
        assert_eq!(req.status, "success");
        assert!(req.entity_id.is_none());
        assert!(req.entity_ids.is_none());
        assert!(req.user_id.is_none());
        assert!(req.user_name.is_none());
        assert!(req.request_details.is_none());
        assert!(req.response_details.is_none());
        assert!(req.error_message.is_none());
        assert!(req.ip_address.is_none());
        assert!(req.user_agent.is_none());
    }

    #[test]
    fn test_with_entity_id() {
        let id = Uuid::new_v4();
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_entity_id(id);
        assert_eq!(req.entity_id, Some(id));
    }

    #[test]
    fn test_with_entity_ids() {
        let ids = json!(["id1", "id2"]);
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_entity_ids(ids.clone());
        assert_eq!(req.entity_ids, Some(ids));
    }

    #[test]
    fn test_with_user() {
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_user("user123".to_string(), "Alice".to_string());
        assert_eq!(req.user_id.as_deref(), Some("user123"));
        assert_eq!(req.user_name.as_deref(), Some("Alice"));
    }

    #[test]
    fn test_with_request_details() {
        let details = json!({"key": "value"});
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_request_details(details.clone());
        assert_eq!(req.request_details, Some(details));
    }

    #[test]
    fn test_with_response_details() {
        let details = json!({"result": "ok"});
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_response_details(details.clone());
        assert_eq!(req.response_details, Some(details));
    }

    #[test]
    fn test_with_error() {
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_error("boom".to_string());
        assert_eq!(req.error_message.as_deref(), Some("boom"));
    }

    #[test]
    fn test_with_request_info() {
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_request_info(Some("127.0.0.1".to_string()), Some("Mozilla".to_string()));
        assert_eq!(req.ip_address.as_deref(), Some("127.0.0.1"));
        assert_eq!(req.user_agent.as_deref(), Some("Mozilla"));
    }

    #[test]
    fn test_with_request_info_none() {
        let req = CreateAuditLogRequest::new("a".to_string(), "e".to_string(), "s".to_string())
            .with_request_info(None, None);
        assert!(req.ip_address.is_none());
        assert!(req.user_agent.is_none());
    }

    #[test]
    fn test_full_builder_chain() {
        let id = Uuid::new_v4();
        let ids = json!(["a", "b"]);
        let req_details = json!({"k": "v"});
        let resp_details = json!({"ok": true});
        let req = CreateAuditLogRequest::new(
            "action".to_string(),
            "entity".to_string(),
            "success".to_string(),
        )
        .with_entity_id(id)
        .with_entity_ids(ids.clone())
        .with_user("u1".to_string(), "Bob".to_string())
        .with_request_details(req_details.clone())
        .with_response_details(resp_details.clone())
        .with_error("err".to_string())
        .with_request_info(Some("1.2.3.4".to_string()), Some("agent".to_string()));
        assert_eq!(req.action, "action");
        assert_eq!(req.entity_type, "entity");
        assert_eq!(req.status, "success");
        assert_eq!(req.entity_id, Some(id));
        assert_eq!(req.entity_ids, Some(ids));
        assert_eq!(req.user_id.as_deref(), Some("u1"));
        assert_eq!(req.user_name.as_deref(), Some("Bob"));
        assert_eq!(req.request_details, Some(req_details));
        assert_eq!(req.response_details, Some(resp_details));
        assert_eq!(req.error_message.as_deref(), Some("err"));
        assert_eq!(req.ip_address.as_deref(), Some("1.2.3.4"));
        assert_eq!(req.user_agent.as_deref(), Some("agent"));
    }

    #[test]
    fn test_audit_log_query_default_fields() {
        let query = AuditLogQuery {
            action: None,
            entity_type: None,
            user_id: None,
            status: None,
            start_date: None,
            end_date: None,
            page: None,
            page_size: None,
        };
        assert!(query.action.is_none());
        assert!(query.entity_type.is_none());
        assert!(query.user_id.is_none());
        assert!(query.status.is_none());
        assert!(query.start_date.is_none());
        assert!(query.end_date.is_none());
        assert!(query.page.is_none());
        assert!(query.page_size.is_none());
    }

    #[test]
    fn test_audit_log_query_all_fields() {
        let start = Utc::now();
        let end = start + chrono::Duration::hours(1);
        let query = AuditLogQuery {
            action: Some("create".to_string()),
            entity_type: Some("user".to_string()),
            user_id: Some("u1".to_string()),
            status: Some("success".to_string()),
            start_date: Some(start),
            end_date: Some(end),
            page: Some(1),
            page_size: Some(20),
        };
        assert_eq!(query.action.as_deref(), Some("create"));
        assert_eq!(query.entity_type.as_deref(), Some("user"));
        assert_eq!(query.user_id.as_deref(), Some("u1"));
        assert_eq!(query.status.as_deref(), Some("success"));
        assert_eq!(query.start_date, Some(start));
        assert_eq!(query.end_date, Some(end));
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    #[test]
    fn test_audit_log_query_serde_roundtrip() {
        let start = Utc::now();
        let end = start + chrono::Duration::hours(2);
        let query = AuditLogQuery {
            action: Some("delete".to_string()),
            entity_type: Some("doc".to_string()),
            user_id: Some("u9".to_string()),
            status: Some("failed".to_string()),
            start_date: Some(start),
            end_date: Some(end),
            page: Some(2),
            page_size: Some(50),
        };
        let json_str = serde_json::to_string(&query).expect("serialize");
        let deserialized: AuditLogQuery = serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.action, query.action);
        assert_eq!(deserialized.entity_type, query.entity_type);
        assert_eq!(deserialized.user_id, query.user_id);
        assert_eq!(deserialized.status, query.status);
        assert_eq!(deserialized.start_date, query.start_date);
        assert_eq!(deserialized.end_date, query.end_date);
        assert_eq!(deserialized.page, query.page);
        assert_eq!(deserialized.page_size, query.page_size);
    }

    #[test]
    fn test_create_audit_log_request_serde_roundtrip() {
        let id = Uuid::new_v4();
        let ids = json!([1, 2, 3]);
        let req_details = json!({"k": "v"});
        let resp_details = json!({"ok": true});
        let req =
            CreateAuditLogRequest::new("act".to_string(), "ent".to_string(), "ok".to_string())
                .with_entity_id(id)
                .with_entity_ids(ids.clone())
                .with_user("u".to_string(), "N".to_string())
                .with_request_details(req_details.clone())
                .with_response_details(resp_details.clone())
                .with_error("e".to_string())
                .with_request_info(Some("ip".to_string()), Some("ua".to_string()));
        let json_str = serde_json::to_string(&req).expect("serialize");
        let deserialized: CreateAuditLogRequest =
            serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.action, req.action);
        assert_eq!(deserialized.entity_type, req.entity_type);
        assert_eq!(deserialized.entity_id, req.entity_id);
        assert_eq!(deserialized.entity_ids, req.entity_ids);
        assert_eq!(deserialized.user_id, req.user_id);
        assert_eq!(deserialized.user_name, req.user_name);
        assert_eq!(deserialized.request_details, req.request_details);
        assert_eq!(deserialized.response_details, req.response_details);
        assert_eq!(deserialized.status, req.status);
        assert_eq!(deserialized.error_message, req.error_message);
        assert_eq!(deserialized.ip_address, req.ip_address);
        assert_eq!(deserialized.user_agent, req.user_agent);
    }
}
