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
            tenant_id: None,
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

    pub fn with_tenant_id(mut self, tenant_id: Uuid) -> Self {
        self.tenant_id = Some(tenant_id);
        self
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
        // request_details/response_details: JSONB 直接写（不再手动 serde_json::to_string）
        // user_id: 字符串 → UUID（解析失败写 NULL，兼容未知格式）
        let user_uuid = request
            .user_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());

        // status: VARCHAR(20) 直接写字符串（"success"/"failed" 等）
        // ip_address: VARCHAR(45) 直接写 TEXT，不再强制 INET cast
        let record = sqlx::query_as::<_, AuditLogRecord>(
            r#"
            INSERT INTO public.audit_logs (
                tenant_id, action, entity_type, entity_id, entity_ids,
                user_id, user_name, request_details, response_details,
                status, error_message, ip_address, user_agent
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
            RETURNING
                id,
                tenant_id,
                action,
                entity_type,
                entity_id,
                entity_ids,
                user_id::TEXT,
                user_name,
                request_details,
                response_details,
                status,
                error_message,
                ip_address,
                user_agent,
                created_at
            "#,
        )
        .bind(request.tenant_id)
        .bind(&request.action)
        .bind(&request.entity_type)
        .bind(request.entity_id)
        .bind(request.entity_ids.as_ref())
        .bind(user_uuid)
        .bind(request.user_name.as_deref())
        .bind(request.request_details.as_ref())
        .bind(request.response_details.as_ref())
        .bind(&request.status)
        .bind(request.error_message.as_deref())
        .bind(request.ip_address.as_deref())
        .bind(request.user_agent.as_deref())
        .fetch_one(&self.pool)
        .await?;

        Ok(record.into_audit_log())
    }

    /// 通用审计操作便捷方法（P0-R2 治理）
    ///
    /// 封装常见的 audit 写入模式，避免各 svc 复制粘贴相同 SQL。
    /// 内部构造 `CreateAuditLogRequest` 后调用 `create_audit_log`。
    ///
    /// # 参数
    /// - `action`: 动作（"create" / "update" / "delete" / ...）
    /// - `entity_type`: 资源类型（"supplier" / "factory_map" / "patrol" / ...）
    /// - `entity_id`: 资源 UUID（可选）
    /// - `user_id`: 用户 ID 字符串（可选，内部尝试解析为 Uuid）
    /// - `request_details`: 请求详情 JSON（可选）
    /// - `status`: 状态（"success" / "failed" / ...）
    /// - `error_message`: 错误信息（可选）
    pub async fn log_operation(
        &self,
        action: &str,
        entity_type: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        request_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<AuditLog, sqlx::Error> {
        let mut req = CreateAuditLogRequest::new(
            action.to_string(),
            entity_type.to_string(),
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
        self.create_audit_log(&req).await
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
            format!("AND entity_type IN ({})", placeholders.join(", "))
        } else {
            String::new()
        };

        let resource_filter_len = resources_filter.map(|r| r.len()).unwrap_or(0);
        let sql = format!(
            r#"
            SELECT 
                id, tenant_id, action, entity_type, entity_id, entity_ids,
                user_id::text, user_name, request_details, response_details,
                status, error_message, ip_address, user_agent, created_at
            FROM public.audit_logs
            WHERE ($1::text IS NULL OR action = $1)
              AND ($2::text IS NULL OR entity_type = $2)
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

impl AuditLogRecord {
    fn into_audit_log(self) -> AuditLog {
        AuditLog {
            id: self.id,
            tenant_id: self.tenant_id,
            action: self.action,
            entity_type: self.entity_type,
            entity_id: self.entity_id,
            entity_ids: self.entity_ids,
            user_id: self.user_id,
            user_name: self.user_name,
            request_details: self.request_details,
            response_details: self.response_details,
            status: self.status,
            error_message: self.error_message,
            ip_address: self.ip_address,
            user_agent: self.user_agent,
            created_at: self.created_at,
        }
    }
}

// =========================================================================
// SchemaAwareAuditLogService — per-schema Cluster-A audit sink (P1-3)
//
// Unified 12-column INSERT + Query service for scoped audit_logs tables:
//   - plugin_crm, plugin_mes    (plugin_ prefixed schemas)
//   - hrm, rs, erp              (schema-qualified plain names)
//   - wms, erp (alt)            (search_path set; no schema qualifier)
//
// NOT supported:
//   - scm.audit_logs: CDC-style columnar change log (table_name /
//     record_id / old_values / new_values / changed_at) — structurally
//     different, not an audit event log.
//   - plugin_srm.audit_logs: same CDC column style as scm, for suppliers.
//   - iam.audit_logs / middleware access_log: different column signatures
//     entirely.
//
// All methods are idempotent: ensure_table() uses CREATE TABLE IF NOT
// EXISTS, and the SQL mirrors public.audit_logs (Task A, V100 15-col
// Cluster-A standard) byte for byte so the services can share the same
// Rust AuditLog / CreateAuditLogRequest types with the public sink.
// =========================================================================

#[derive(Debug, Clone)]
pub struct SchemaAwareAuditLogService {
    pool: PgPool,
    /// Optional schema prefix. `None` means the service expects the
    /// connection search_path to be set (used by wms / erp which write bare
    /// `audit_logs` table names). `Some("plugin_crm")` means write
    /// `plugin_crm.audit_logs`.
    schema_prefix: Option<String>,
}

impl SchemaAwareAuditLogService {
    pub fn new(pool: &PgPool, schema_prefix: Option<&str>) -> Self {
        Self {
            pool: pool.clone(),
            schema_prefix: schema_prefix.map(|s| s.to_string()),
        }
    }

    /// Render `{prefix}.audit_logs` or bare `audit_logs`.
    fn table(&self) -> String {
        match &self.schema_prefix {
            Some(p) => format!("{}.audit_logs", p),
            None => "audit_logs".to_string(),
        }
    }

    /// Ensure the target audit_logs table exists with the full 15-column
    /// Cluster-A standard signature. Returns the CREATE DDL so the caller
    /// can log it for schema/init traceability. Safe to re-run.
    pub async fn ensure_table(&self) -> Result<String, sqlx::Error> {
        let tbl = self.table();
        let indexes_prefix = match &self.schema_prefix {
            Some(p) => p.replace(['.', '-'], "_"),
            None => "bare".to_string(),
        };
        let ddl = format!(
            r#"
            CREATE TABLE IF NOT EXISTS {tbl} (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID NULL,
                action VARCHAR(255) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id UUID NULL,
                entity_ids JSONB NULL,
                user_id UUID NULL,
                user_name TEXT NULL,
                request_details JSONB NULL,
                response_details JSONB NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'success',
                error_message TEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_{indexes_prefix}_audit_logs_action
                ON {tbl}(action);
            CREATE INDEX IF NOT EXISTS idx_{indexes_prefix}_audit_logs_entity_type
                ON {tbl}(entity_type);
            CREATE INDEX IF NOT EXISTS idx_{indexes_prefix}_audit_logs_user_id
                ON {tbl}(user_id);
            CREATE INDEX IF NOT EXISTS idx_{indexes_prefix}_audit_logs_created_at
                ON {tbl}(created_at DESC);
            "#,
            tbl = tbl,
            indexes_prefix = indexes_prefix,
        );
        // Split on semicolons and execute each non-empty statement so sqlx
        // (single-statement executor) doesn't barf on compound strings.
        for stmt in ddl.split(';') {
            let trimmed = stmt.trim();
            if trimmed.is_empty() {
                continue;
            }
            sqlx::query(trimmed).execute(&self.pool).await?;
        }
        Ok(ddl)
    }

    /// 12-column INSERT matching public.create_audit_log semantics. Returns
    /// the full AuditLog (with DB-generated id and timestamps).
    pub async fn create_audit_log(
        &self,
        request: &CreateAuditLogRequest,
    ) -> Result<AuditLog, sqlx::Error> {
        let tbl = self.table();
        let user_uuid = request
            .user_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok());

        let sql = format!(
            r#"
            INSERT INTO {tbl} (
                tenant_id, action, entity_type, entity_id, entity_ids,
                user_id, user_name, request_details, response_details,
                status, error_message, ip_address, user_agent
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING
                id, tenant_id, action, entity_type, entity_id, entity_ids,
                user_id::TEXT, user_name, request_details, response_details,
                status, error_message, ip_address, user_agent, created_at
            "#,
            tbl = tbl,
        );
        let record = sqlx::query_as::<_, AuditLogRecord>(&sql)
            .bind(request.tenant_id)
            .bind(&request.action)
            .bind(&request.entity_type)
            .bind(request.entity_id)
            .bind(request.entity_ids.as_ref())
            .bind(user_uuid)
            .bind(request.user_name.as_deref())
            .bind(request.request_details.as_ref())
            .bind(request.response_details.as_ref())
            .bind(&request.status)
            .bind(request.error_message.as_deref())
            .bind(request.ip_address.as_deref())
            .bind(request.user_agent.as_deref())
            .fetch_one(&self.pool)
            .await?;

        Ok(record.into_audit_log())
    }

    /// Convenience wrapper matching public.AuditLogService::log_operation.
    ///
    /// Accepts the 13th optional `tenant_id` (for MES approval audit and
    /// other multi-tenant-aware sinks that used to write it explicitly in
    /// raw SQL, like the old 7-col approval INSERT).
    pub async fn log_operation(
        &self,
        action: &str,
        entity_type: &str,
        entity_id: Option<Uuid>,
        user_id: Option<&str>,
        user_name: Option<&str>,
        entity_ids: Option<serde_json::Value>,
        request_details: Option<serde_json::Value>,
        response_details: Option<serde_json::Value>,
        status: &str,
        error_message: Option<&str>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
        tenant_id: Option<Uuid>,
    ) -> Result<AuditLog, sqlx::Error> {
        let mut req = CreateAuditLogRequest::new(
            action.to_string(),
            entity_type.to_string(),
            status.to_string(),
        );
        if let Some(tid) = tenant_id {
            req = req.with_tenant_id(tid);
        }
        if let Some(eid) = entity_id {
            req = req.with_entity_id(eid);
        }
        if let Some(uid) = user_id {
            req = req.with_user(uid.to_string(), user_name.unwrap_or("").to_string());
        }
        if let Some(eids) = entity_ids {
            req = req.with_entity_ids(eids);
        }
        if let Some(rd) = request_details {
            req = req.with_request_details(rd);
        }
        if let Some(rd) = response_details {
            req = req.with_response_details(rd);
        }
        if let Some(err) = error_message {
            req = req.with_error(err.to_string());
        }
        req.ip_address = ip_address.map(|s| s.to_string());
        req.user_agent = user_agent.map(|s| s.to_string());
        self.create_audit_log(&req).await
    }

    /// Paginated list query matching public sink. Optional resources_filter
    /// narrows entity_type IN (…) — same semantics.
    pub async fn query_audit_logs(
        &self,
        query: &AuditLogQuery,
        resources_filter: Option<&[&str]>,
    ) -> Result<Vec<AuditLog>, sqlx::Error> {
        let tbl = self.table();
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
            format!("AND entity_type IN ({})", placeholders.join(", "))
        } else {
            String::new()
        };
        let resource_filter_len = resources_filter.map(|r| r.len()).unwrap_or(0);
        let sql = format!(
            r#"
            SELECT
                id, tenant_id, action, entity_type, entity_id, entity_ids,
                user_id::text, user_name, request_details, response_details,
                status, error_message, ip_address, user_agent, created_at
            FROM {tbl}
            WHERE ($1::text IS NULL OR action = $1)
              AND ($2::text IS NULL OR entity_type = $2)
              AND ($3::text IS NULL OR user_id::text = $3)
              AND ($4::text IS NULL OR status = $4)
              {extra}
            ORDER BY created_at DESC
            LIMIT ${limit_placeholder} OFFSET ${offset_placeholder}
            "#,
            tbl = tbl,
            extra = resource_filter_sql,
            limit_placeholder = 5 + resource_filter_len,
            offset_placeholder = 6 + resource_filter_len,
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

    // --- Task A Bug Fix: AuditLogRecord 15 字段直通（验证不再写死 None 4 字段）---

    #[test]
    fn test_audit_log_record_into_audit_log_preserves_all_fields() {
        use chrono::Utc;
        let id = Uuid::new_v4();
        let tenant_id = Some(Uuid::new_v4());
        let entity_ids = Some(json!(["a", "b", "c"]));
        let request_details = Some(json!({"q": "hello"}));
        let response_details = Some(json!({"answer": 42}));
        let created_at = Utc::now();

        let record = AuditLogRecord {
            id,
            tenant_id,
            action: "update".to_string(),
            entity_type: "document".to_string(),
            entity_id: Some(Uuid::new_v4()),
            entity_ids: entity_ids.clone(),
            user_id: Some("u-789".to_string()),
            user_name: Some("Charlie".to_string()),
            request_details: request_details.clone(),
            response_details: response_details.clone(),
            status: "success".to_string(),
            error_message: None,
            ip_address: Some("10.0.0.2".to_string()),
            user_agent: Some("curl/8.0".to_string()),
            created_at,
        };

        let log = record.into_audit_log();

        assert_eq!(log.id, id);
        assert_eq!(log.tenant_id, tenant_id);
        assert_eq!(log.action, "update");
        assert_eq!(log.entity_type, "document");
        assert!(log.entity_id.is_some());
        assert_eq!(log.entity_ids, entity_ids);
        assert_eq!(log.user_id.as_deref(), Some("u-789"));
        assert_eq!(log.user_name.as_deref(), Some("Charlie"));
        assert_eq!(log.request_details, request_details);
        assert_eq!(log.response_details, response_details);
        assert_eq!(log.status, "success");
        assert!(log.error_message.is_none());
        assert_eq!(log.ip_address.as_deref(), Some("10.0.0.2"));
        assert_eq!(log.user_agent.as_deref(), Some("curl/8.0"));
        assert_eq!(log.created_at, created_at);
    }

    #[test]
    fn test_create_audit_log_request_builder_all_12_columns_present() {
        // 验证 12 列 INSERT 签名对应的 CreateAuditLogRequest 12 列全都能非空构造
        // （这是 A-4 Bug Fix 的核心：4 列之前虽在 struct 里但 INSERT 没写）
        let req = CreateAuditLogRequest::new("upsert".into(), "factory".into(), "success".into())
            .with_entity_ids(json!(["f1", "f2", "f3"]))
            .with_user("uid-1".into(), "FactoryAdmin".into())
            .with_request_details(json!({"temp": 25.5}))
            .with_response_details(json!({"affected": 3}))
            .with_request_info(Some("192.168.1.10".into()), Some("bot/1.0".into()));

        // 12 列: action, entity_type, entity_id(NULL ok), entity_ids, user_id,
        //       user_name, request_details, response_details, status,
        //       error_message(NULL ok), ip_address, user_agent
        assert!(req.entity_id.is_none()); // 允许为空
        assert!(req.entity_ids.is_some());
        assert!(req.user_id.is_some());
        assert!(req.user_name.is_some());
        assert!(req.request_details.is_some());
        assert!(req.response_details.is_some());
        assert!(req.error_message.is_none()); // 允许为空
        assert!(req.ip_address.is_some());
        assert!(req.user_agent.is_some());
        assert_eq!(req.action, "upsert");
        assert_eq!(req.entity_type, "factory");
        assert_eq!(req.status, "success");
    }
}
