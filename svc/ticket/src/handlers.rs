use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Extension, Json, Router,
};
use chrono::{Duration, Utc};
use serde_json::json;
use sqlx::Row;
use std::str::FromStr;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::locale::Locale;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;

use crate::models::{
    AddCommentRequest, AutomationRule, CreateAutomationRuleRequest, CreateKnowledgeArticleRequest,
    CreateSlaPolicyRequest, CreateTicketRequest, KnowledgeArticle, KnowledgeArticleRef,
    SeverityCount, SlaEscalationEvent, SourceCount, Ticket, TicketActivity, TicketComment,
    TicketExportRequest, TicketExportResult, TicketListResponse, TicketQuery, TicketSlaInfo,
    TicketSlaPolicy, TicketSlaStats, TicketStats, TicketStatus, TicketType, TypeCount,
    UpdateAutomationRuleRequest, UpdateKnowledgeArticleRequest, UpdateSlaPolicyRequest,
    UpdateTicketRequest,
};
use crate::sla_service::TicketSlaService;

#[derive(Clone)]
pub struct TicketService {
    db: Db,
}

impl TicketService {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn generate_ticket_no(&self) -> String {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let seq = COUNTER.fetch_add(1, Ordering::SeqCst) % 1_000_000;
        let now = Utc::now();
        format!("TK{:}{:06}", now.format("%Y%m%d"), seq)
    }

    #[allow(clippy::as_conversions)]
    pub async fn create_ticket(
        &self,
        tenant_id: Uuid,
        reporter_id: Option<Uuid>,
        req: CreateTicketRequest,
        locale: &str,
        txn_arc: &RlsTxnCell,
    ) -> Result<Ticket, sqlx::Error> {
        let ticket_no = self.generate_ticket_no();
        let ticket_type = req.ticket_type.clone();
        let severity = req.severity.clone().unwrap_or_else(|| "medium".to_string());

        if TicketType::from_str(&ticket_type).is_err() {
            return Err(sqlx::Error::Decode(
                format!("Invalid ticket_type: {}", ticket_type).into(),
            ));
        }

        let sla_due_at = req
            .sla_hours
            .map(|h| Utc::now() + Duration::hours(h as i64));
        let ticket_id = Uuid::new_v4();
        let now = Utc::now();
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;

        sqlx::query(
            r#"
            INSERT INTO ticket.core_tickets
              (id, ticket_no, tenant_id, title, description, ticket_type, severity, status,
               source_service, source_business_id, assignee_id, reporter_id, sla_due_at,
               created_at, updated_at, tags, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            "#,
        )
        .bind(ticket_id)
        .bind(&ticket_no)
        .bind(tenant_id)
        .bind(&req.title)
        .bind(&req.description)
        .bind(&ticket_type)
        .bind(&severity)
        .bind(TicketStatus::Open.as_str())
        .bind(&req.source_service)
        .bind(&req.source_business_id)
        .bind(req.assignee_id)
        .bind(reporter_id)
        .bind(sla_due_at)
        .bind(now)
        .bind(now)
        .bind(&req.tags)
        .bind(&req.metadata)
        .execute(&mut scope)
        .await?;

        // 自动化规则应用：按租户启用规则评估并应用变更（assignee/severity/tags）
        let rules = sqlx::query_as::<_, AutomationRule>(
            "SELECT id, tenant_id, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at
             FROM ticket.ticket_automation_rules WHERE enabled = true",
        )
        .bind(locale)
        .fetch_all(&mut scope)
        .await?;

        if !rules.is_empty() {
            let rule_tuples: Vec<(String, String, String, String, i32, bool)> = rules
                .iter()
                .map(|r| {
                    (
                        r.condition_field.clone(),
                        r.condition_value.clone(),
                        r.action_type.clone(),
                        r.action_value.clone(),
                        r.priority,
                        r.enabled,
                    )
                })
                .collect();
            let title = req.title.clone();
            let effects = crate::models::evaluate_automation_rules(
                &rule_tuples,
                &severity,
                &ticket_type,
                &title,
            );
            if !effects.is_empty() {
                sqlx::query(
                    r#"UPDATE ticket.core_tickets SET
                       assignee_id = COALESCE($2, assignee_id),
                       severity = COALESCE($3, severity),
                       tags = CASE WHEN $4::text[] IS NOT NULL
                                   THEN array_cat(COALESCE(tags, '{}'), $4::text[])
                                   ELSE tags END,
                       updated_at = $5
                       WHERE id = $1"#,
                )
                .bind(ticket_id)
                .bind(effects.assignee_id)
                .bind(&effects.severity)
                .bind(&effects.add_tags)
                .bind(now)
                .execute(&mut scope)
                .await?;
            }
        }

        sqlx::query(
            r#"
            INSERT INTO ticket.core_ticket_activities
              (id, ticket_id, tenant_id, user_id, action, to_value, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(ticket_id)
        .bind(tenant_id)
        .bind(reporter_id)
        .bind("created")
        .bind(TicketStatus::Open.as_str())
        .bind(now)
        .execute(&mut scope)
        .await?;

        scope.commit().await?;
        drop(guard);
        self.get_ticket(tenant_id, ticket_id, txn_arc).await
    }

    pub async fn get_ticket(
        &self,
        _tenant_id: Uuid,
        ticket_id: Uuid,
        txn_arc: &RlsTxnCell,
    ) -> Result<Ticket, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;
        let ticket = sqlx::query_as::<_, Ticket>(
            r#"
            SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status,
                   source_service, source_business_id, assignee_id, reporter_id, sla_due_at,
                   resolved_at, closed_at, created_at, updated_at, tags, metadata
            FROM ticket.core_tickets
            WHERE id = $1
            "#,
        )
        .bind(ticket_id)
        .fetch_one(&mut scope)
        .await?;

        scope.commit().await?;
        Ok(ticket)
    }

    #[allow(clippy::as_conversions)]
    pub async fn list_tickets(
        &self,
        tenant_id: Uuid,
        query: TicketQuery,
        txn_arc: &RlsTxnCell,
    ) -> Result<TicketListResponse, sqlx::Error> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(20).min(100);
        let offset = ((page - 1) * page_size) as i64;
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;

        let rows = sqlx::query_as::<_, Ticket>(
            r#"
            SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status,
                   source_service, source_business_id, assignee_id, reporter_id, sla_due_at,
                   resolved_at, closed_at, created_at, updated_at, tags, metadata
            FROM ticket.core_tickets
              WHERE ($1::text IS NULL OR status = $1)
              AND ($2::text IS NULL OR severity = $2)
              AND ($3::text IS NULL OR ticket_type = $3)
              AND ($4::uuid IS NULL OR assignee_id = $4)
              AND ($5::uuid IS NULL OR reporter_id = $5)
              AND ($6::text IS NULL OR source_service = $6)
              AND ($7::text IS NULL OR source_business_id = $7)
              AND ($8::bool IS NULL OR (sla_due_at IS NOT NULL AND sla_due_at < NOW() AND status NOT IN ('resolved', 'closed', 'cancelled')) = $8)
              AND ($9::text IS NULL OR ticket_no ILIKE '%' || $9 || '%' OR title ILIKE '%' || $9 || '%'
                   OR description ILIKE '%' || $9 || '%')
            ORDER BY created_at DESC
            LIMIT $10 OFFSET $11
            "#,
        )
        .bind(&query.status)
        .bind(&query.severity)
        .bind(&query.ticket_type)
        .bind(query.assignee_id)
        .bind(query.reporter_id)
        .bind(&query.source_service)
        .bind(&query.source_business_id)
        .bind(query.sla_breached)
        .bind(&query.q)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut scope)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM ticket.core_tickets
            WHERE tenant_id = $1
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR severity = $3)
              AND ($4::text IS NULL OR ticket_type = $4)
              AND ($5::uuid IS NULL OR assignee_id = $5)
              AND ($6::uuid IS NULL OR reporter_id = $6)
              AND ($7::text IS NULL OR source_service = $7)
              AND ($8::text IS NULL OR source_business_id = $8)
              AND ($9::text IS NULL OR ticket_no ILIKE '%' || $9 || '%' OR title ILIKE '%' || $9 || '%'
                   OR description ILIKE '%' || $9 || '%')
            "#,
        )
        .bind(tenant_id)
        .bind(&query.status)
        .bind(&query.severity)
        .bind(&query.ticket_type)
        .bind(query.assignee_id)
        .bind(query.reporter_id)
        .bind(&query.source_service)
        .bind(&query.source_business_id)
        .bind(&query.q)
        .fetch_one(&mut scope)
        .await?;

        scope.commit().await?;
        Ok(TicketListResponse {
            items: rows,
            total,
            page,
            page_size,
        })
    }

    pub async fn update_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        user_id: Option<Uuid>,
        req: UpdateTicketRequest,
        txn_arc: &RlsTxnCell,
    ) -> Result<Ticket, TopemsError> {
        let existing = self.get_ticket(tenant_id, ticket_id, txn_arc).await?;
        let now = Utc::now();

        // 状态机白名单：仅允许合法状态值与合法状态转移，非法转移直接拒绝。
        if let Some(new_status) = req.status.as_deref() {
            // 先校验状态值本身是否为已知枚举
            TicketStatus::from_str(new_status)?;
            // 再校验 from -> to 是否为合法转移（同状态转移恒允许）
            if new_status != existing.status.as_str()
                && !crate::util::is_valid_ticket_status_transition(&existing.status, new_status)
            {
                return Err(TopemsError::ValidationFailed(format!(
                    "非法工单状态转移: {} -> {}",
                    existing.status, new_status
                )));
            }
        }

        let resolved_at =
            if req.status.as_deref() == Some("resolved") && existing.resolved_at.is_none() {
                Some(now)
            } else {
                existing.resolved_at
            };
        let closed_at = if req.status.as_deref() == Some("closed") && existing.closed_at.is_none() {
            Some(now)
        } else {
            existing.closed_at
        };
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()).into());
        };
        let mut scope = self.db.scope_with(txn).await?;

        sqlx::query(
            r#"
            UPDATE ticket.core_tickets SET
              title = COALESCE($1, title),
              description = COALESCE($2, description),
              severity = COALESCE($3, severity),
              status = COALESCE($4, status),
              assignee_id = COALESCE($5, assignee_id),
              tags = COALESCE($6, tags),
              metadata = COALESCE($7, metadata),
              resolved_at = $8,
              closed_at = $9,
              updated_at = $10
            WHERE id = $11 AND tenant_id = $12
            "#,
        )
        .bind(&req.title)
        .bind(&req.description)
        .bind(&req.severity)
        .bind(&req.status)
        .bind(req.assignee_id)
        .bind(&req.tags)
        .bind(&req.metadata)
        .bind(resolved_at)
        .bind(closed_at)
        .bind(now)
        .bind(ticket_id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await?;

        if let Some(new_status) = &req.status {
            if new_status != &existing.status {
                sqlx::query(
                    r#"
                    INSERT INTO ticket.core_ticket_activities
                      (id, ticket_id, tenant_id, user_id, action, from_value, to_value, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(ticket_id)
                .bind(tenant_id)
                .bind(user_id)
                .bind("status_changed")
                .bind(&existing.status)
                .bind(new_status)
                .bind(now)
                .execute(&mut scope)
                .await?;
            }
        }
        if let Some(new_assignee) = req.assignee_id {
            if Some(new_assignee) != existing.assignee_id {
                sqlx::query(
                    r#"
                    INSERT INTO ticket.core_ticket_activities
                      (id, ticket_id, tenant_id, user_id, action, from_value, to_value, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(ticket_id)
                .bind(tenant_id)
                .bind(user_id)
                .bind("assigned")
                .bind(existing.assignee_id.map(|x| x.to_string()))
                .bind(new_assignee.to_string())
                .bind(now)
                .execute(&mut scope)
                .await?;
            }
        }

        scope.commit().await?;
        drop(guard);
        self.get_ticket(tenant_id, ticket_id, txn_arc)
            .await
            .map_err(Into::into)
    }

    pub async fn add_comment(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        user_id: Uuid,
        user_name: Option<String>,
        req: AddCommentRequest,
        txn_arc: &RlsTxnCell,
    ) -> Result<TicketComment, sqlx::Error> {
        let comment_id = Uuid::new_v4();
        let now = Utc::now();
        let is_internal = req.is_internal.unwrap_or(false);
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;

        sqlx::query(
            r#"
            INSERT INTO ticket.core_ticket_comments
              (id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(comment_id)
        .bind(ticket_id)
        .bind(tenant_id)
        .bind(user_id)
        .bind(&user_name)
        .bind(&req.content)
        .bind(is_internal)
        .bind(now)
        .execute(&mut scope)
        .await?;

        sqlx::query(
            "UPDATE ticket.core_tickets SET updated_at = $1 WHERE id = $2 AND tenant_id = $3",
        )
        .bind(now)
        .bind(ticket_id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await?;

        let comment = sqlx::query_as::<_, TicketComment>(
            r#"
            SELECT id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at
            FROM ticket.core_ticket_comments
            WHERE id = $1
            "#,
        )
        .bind(comment_id)
        .fetch_one(&mut scope)
        .await?;

        scope.commit().await?;
        Ok(comment)
    }

    pub async fn list_comments(
        &self,
        _tenant_id: Uuid,
        ticket_id: Uuid,
        txn_arc: &RlsTxnCell,
    ) -> Result<Vec<TicketComment>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;
        let comments = sqlx::query_as::<_, TicketComment>(
            r#"
            SELECT id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at
            FROM ticket.core_ticket_comments
            WHERE ticket_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(ticket_id)
        .fetch_all(&mut scope)
        .await?;

        scope.commit().await?;
        Ok(comments)
    }

    pub async fn list_activities(
        &self,
        _tenant_id: Uuid,
        ticket_id: Uuid,
        txn_arc: &RlsTxnCell,
    ) -> Result<Vec<TicketActivity>, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;
        let activities = sqlx::query_as::<_, TicketActivity>(
            r#"
            SELECT id, ticket_id, tenant_id, user_id, action, from_value, to_value, created_at
            FROM ticket.core_ticket_activities
            WHERE ticket_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(ticket_id)
        .fetch_all(&mut scope)
        .await?;

        scope.commit().await?;
        Ok(activities)
    }

    pub async fn delete_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        user_id: Option<Uuid>,
        txn_arc: &RlsTxnCell,
    ) -> Result<bool, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;
        let result = sqlx::query(
            r#"
            UPDATE ticket.core_tickets SET status = 'cancelled', closed_at = $1, updated_at = $1
            WHERE id = $2 AND tenant_id = $3 AND status NOT IN ('closed', 'cancelled')
            "#,
        )
        .bind(Utc::now())
        .bind(ticket_id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await?;

        if result.rows_affected() > 0 {
            sqlx::query(
                r#"
                INSERT INTO ticket.core_ticket_activities
                  (id, ticket_id, tenant_id, user_id, action, to_value, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(ticket_id)
            .bind(tenant_id)
            .bind(user_id)
            .bind("cancelled")
            .bind("cancelled")
            .bind(Utc::now())
            .execute(&mut scope)
            .await?;
            scope.commit().await?;
            Ok(true)
        } else {
            scope.rollback().await?;
            Ok(false)
        }
    }

    pub async fn get_stats(
        &self,
        tenant_id: Uuid,
        txn_arc: &RlsTxnCell,
    ) -> Result<TicketStats, sqlx::Error> {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return Err(sqlx::Error::Protocol("RLS 事务缺失：请求事务未注入".into()));
        };
        let mut scope = self.db.scope_with(txn).await?;
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM ticket.core_tickets WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&mut scope)
                .await?;

        let open: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM ticket.core_tickets WHERE tenant_id = $1 AND status = 'open'",
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let in_progress: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM ticket.core_tickets WHERE tenant_id = $1 AND status = 'in_progress'",
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let pending: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM ticket.core_tickets WHERE tenant_id = $1 AND status = 'pending'",
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let resolved: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM ticket.core_tickets WHERE tenant_id = $1 AND status = 'resolved'",
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let closed: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM ticket.core_tickets WHERE tenant_id = $1 AND status IN ('closed', 'cancelled')",
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let sla_breached: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM ticket.core_tickets
            WHERE tenant_id = $1
              AND sla_due_at IS NOT NULL
              AND sla_due_at < NOW()
              AND status NOT IN ('resolved', 'closed', 'cancelled')
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await?;

        let severity_rows = sqlx::query(
            "SELECT severity, COUNT(*) AS cnt FROM ticket.core_tickets WHERE tenant_id = $1 GROUP BY severity",
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        let by_severity: Vec<SeverityCount> = severity_rows
            .into_iter()
            .map(|r| SeverityCount {
                severity: r.get("severity"),
                count: r.get("cnt"),
            })
            .collect();

        let type_rows = sqlx::query(
            "SELECT ticket_type, COUNT(*) AS cnt FROM ticket.core_tickets WHERE tenant_id = $1 GROUP BY ticket_type",
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        let by_type: Vec<TypeCount> = type_rows
            .into_iter()
            .map(|r| TypeCount {
                ticket_type: r.get("ticket_type"),
                count: r.get("cnt"),
            })
            .collect();

        let source_rows = sqlx::query(
            "SELECT source_service, COUNT(*) AS cnt FROM ticket.core_tickets WHERE tenant_id = $1 GROUP BY source_service",
        )
        .bind(tenant_id)
        .fetch_all(&mut scope)
        .await?;
        let by_source: Vec<SourceCount> = source_rows
            .into_iter()
            .map(|r| SourceCount {
                source_service: r.get("source_service"),
                count: r.get("cnt"),
            })
            .collect();

        scope.commit().await?;
        Ok(TicketStats {
            total,
            open,
            in_progress,
            pending,
            resolved,
            closed,
            sla_breached,
            by_severity,
            by_type,
            by_source,
        })
    }
}

// ==================== HTTP Handlers ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets",
    tag = "tickets",
    request_body = CreateTicketRequest,
    responses(
        (status = 200, description = "OK", body = Ticket),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateTicketRequest>,
) -> ApiResponse<Ticket> {
    let service = TicketService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let reporter_id = Uuid::parse_str(&claims.sub).ok();
    let locale = Locale::from_headers(&headers).as_sql();

    match service
        .create_ticket(tenant_id, reporter_id, req, locale, &txn_arc)
        .await
    {
        Ok(ticket) => ApiResponse::success(ticket, "工单创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建工单失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = TicketListResponse),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_tickets_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<TicketQuery>,
) -> ApiResponse<TicketListResponse> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_tickets(tenant_id, query, &txn_arc).await {
        Ok(list) => ApiResponse::success(list, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询工单失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Ticket),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Ticket> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(ticket) => ApiResponse::success(ticket, "查询成功"),
        Err(e) => ApiResponse::from({
            tracing::warn!("工单不存在: {}", e);
            TopemsError::ResourceNotFound("工单不存在".to_string())
        }),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}",
    tag = "tickets",
    request_body = UpdateTicketRequest,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Ticket),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTicketRequest>,
) -> ApiResponse<Ticket> {
    let service = TicketService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let user_id = Uuid::parse_str(&claims.sub).ok();

    match service
        .update_ticket(tenant_id, id, user_id, req, &txn_arc)
        .await
    {
        Ok(ticket) => ApiResponse::success(ticket, "工单更新成功"),
        // 状态机白名单拒绝（非法状态值/非法转移）→ 400
        Err(TopemsError::ValidationFailed(msg)) => ApiResponse::bad_request(&msg),
        // 假 UUID 探测：get_ticket 走 fetch_one RowNotFound → 记录不存在 → 404
        Err(TopemsError::DatabaseRecordNotFound(_)) => ApiResponse::not_found("工单不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新工单失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let service = TicketService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let user_id = Uuid::parse_str(&claims.sub).ok();

    match service
        .delete_ticket(tenant_id, id, user_id, &txn_arc)
        .await
    {
        Ok(true) => ApiResponse::success(json!({"cancelled": true}), "工单已取消"),
        Ok(false) => ApiResponse::not_found("工单不存在或已关闭"),
        Err(e) => ApiResponse::from(TopemsError::internal("取消工单失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/comments",
    tag = "tickets",
    request_body = AddCommentRequest,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = TicketComment),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn add_comment_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AddCommentRequest>,
) -> ApiResponse<TicketComment> {
    let service = TicketService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(u) => u,
        Err(_) => return ApiResponse::unauthorized("Invalid user id"),
    };
    let user_name = Some(claims.username.clone());

    match service
        .add_comment(tenant_id, id, user_id, user_name, req, &txn_arc)
        .await
    {
        Ok(comment) => ApiResponse::success(comment, "评论已添加"),
        Err(e) => ApiResponse::from(TopemsError::internal("添加评论失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}/comments",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Vec<TicketComment>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_comments_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<TicketComment>> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_comments(tenant_id, id, &txn_arc).await {
        Ok(list) => ApiResponse::success(list, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询评论失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}/activities",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Vec<TicketActivity>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_activities_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<TicketActivity>> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_activities(tenant_id, id, &txn_arc).await {
        Ok(list) => ApiResponse::success(list, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询活动失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/stats",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = TicketStats),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_stats_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<TicketStats> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.get_stats(tenant_id, &txn_arc).await {
        Ok(stats) => ApiResponse::success(stats, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询统计失败", e)),
    }
}

// ==================== SLA Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}/sla",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = TicketSlaInfo),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_ticket_sla_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<TicketSlaInfo> {
    let ticket_service = TicketService::new(db.clone());
    let sla_service = TicketSlaService::new(db.clone());
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    let ticket = match ticket_service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(t) => t,
        Err(e) => {
            return ApiResponse::from({
                tracing::warn!("工单不存在: {}", e);
                TopemsError::ResourceNotFound("工单不存在".to_string())
            })
        }
    };

    match sla_service.calculate_sla(&ticket, &txn_arc).await {
        Ok(sla) => ApiResponse::success(sla, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("计算SLA失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/sla",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Vec<SlaEscalationEvent>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn trigger_sla_escalation_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<SlaEscalationEvent>> {
    let ticket_service = TicketService::new(db.clone());
    let sla_service = TicketSlaService::new(db.clone());
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let ticket = match ticket_service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(t) => t,
        Err(e) => {
            return ApiResponse::from({
                tracing::warn!("工单不存在: {}", e);
                TopemsError::ResourceNotFound("工单不存在".to_string())
            })
        }
    };

    match sla_service.check_and_escalate(&ticket, &txn_arc).await {
        Ok(events) => ApiResponse::success(events, "SLA 升级检查完成"),
        Err(e) => ApiResponse::from(TopemsError::internal("SLA 升级检查失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/sla-stats",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = TicketSlaStats),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_sla_stats_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<TicketSlaStats> {
    let service = TicketSlaService::new(db);
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or(""))
                .unwrap_or_else(|_| Uuid::nil()),
        )
    };

    match service.get_sla_stats(opt_tenant_id, &txn_arc).await {
        Ok(stats) => ApiResponse::success(stats, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询SLA统计失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket:write"])),
    path = "/sla-policies",
    tag = "sla",
    request_body = CreateSlaPolicyRequest,
    responses(
        (status = 200, description = "SLA策略创建成功", body = TicketSlaPolicy),
        (status = 500, description = "创建SLA策略失败")
    )
)]
pub async fn create_sla_policy_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateSlaPolicyRequest>,
) -> ApiResponse<TicketSlaPolicy> {
    let service = TicketSlaService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let locale = Locale::from_headers(&headers).as_sql();

    match service
        .create_policy(tenant_id, req, locale, &txn_arc)
        .await
    {
        Ok(policy) => ApiResponse::success(policy, "SLA策略创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建SLA策略失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/sla-policies",
    tag = "sla",
    responses(
        (status = 200, description = "查询成功", body = Vec<TicketSlaPolicy>),
        (status = 500, description = "查询SLA策略失败")
    )
)]
pub async fn list_sla_policies_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> ApiResponse<Vec<TicketSlaPolicy>> {
    let service = TicketSlaService::new(db);
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or(""))
                .unwrap_or_else(|_| Uuid::nil()),
        )
    };
    let locale = Locale::from_headers(&headers).as_sql();

    match service.list_policies(opt_tenant_id, locale, &txn_arc).await {
        Ok(policies) => ApiResponse::success(policies, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询SLA策略失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:sla:read"])),
    path = "/sla-policies/{id}",
    responses(
        (status = 200, description = "Get SLA policy", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sla"
)]
pub async fn get_sla_policy_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> ApiResponse<TicketSlaPolicy> {
    let service = TicketSlaService::new(db);
    let opt_tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        Some(
            Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or(""))
                .unwrap_or_else(|_| Uuid::nil()),
        )
    };
    let locale = Locale::from_headers(&headers).as_sql();

    match service
        .get_policy(opt_tenant_id, id, locale, &txn_arc)
        .await
    {
        Ok(policy) => ApiResponse::success(policy, "查询成功"),
        Err(e) => ApiResponse::from({
            tracing::warn!("SLA策略不存在: {}", e);
            TopemsError::ResourceNotFound("SLA策略不存在".to_string())
        }),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:sla:write"])),
    path = "/sla-policies/{id}",
    responses(
        (status = 200, description = "Update SLA policy", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sla"
)]
pub async fn update_sla_policy_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateSlaPolicyRequest>,
) -> ApiResponse<TicketSlaPolicy> {
    let service = TicketSlaService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let locale = Locale::from_headers(&headers).as_sql();

    match service
        .update_policy(tenant_id, id, req, locale, &txn_arc)
        .await
    {
        Ok(policy) => ApiResponse::success(policy, "SLA策略更新成功"),
        // 假 UUID 探测：结尾 get_policy 走 fetch_one RowNotFound → 内层 404（HTTP200）
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("SLA策略不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新SLA策略失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:sla:write"])),
    path = "/sla-policies/{id}",
    responses(
        (status = 200, description = "Delete SLA policy", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "sla"
)]
pub async fn delete_sla_policy_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let service = TicketSlaService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    match service.delete_policy(tenant_id, id, &txn_arc).await {
        Ok(true) => ApiResponse::success(json!({"deleted": true}), "SLA策略已删除"),
        Ok(false) => ApiResponse::not_found("SLA策略不存在或为默认策略不可删除"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除SLA策略失败", e)),
    }
}

// ==================== Automation Rules ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket:write"])),
    path = "/automation-rules",
    tag = "tickets",
    request_body = CreateAutomationRuleRequest,
    responses(
        (status = 200, description = "自动化规则创建成功", body = AutomationRule),
        (status = 500, description = "创建自动化规则失败")
    )
)]
pub async fn create_automation_rule_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAutomationRuleRequest>,
) -> ApiResponse<AutomationRule> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let priority = req.priority.unwrap_or(100);
    let enabled = req.enabled.unwrap_or(true);
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, AutomationRule>(
        r#"INSERT INTO ticket.ticket_automation_rules
        (id, tenant_id, name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
        RETURNING id, tenant_id, name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.condition_field)
    .bind(&req.condition_value)
    .bind(&req.action_type)
    .bind(&req.action_value)
    .bind(priority)
    .bind(enabled)
    .bind(now)
    .fetch_one(&mut scope)
    .await;
    match result {
        Ok(rule) => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(rule, "自动化规则创建成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("创建自动化规则失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/automation-rules",
    tag = "tickets",
    responses(
        (status = 200, description = "自动化规则列表获取成功", body = Vec<AutomationRule>),
        (status = 500, description = "获取自动化规则列表失败")
    )
)]
pub async fn list_automation_rules_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    headers: HeaderMap,
) -> ApiResponse<Vec<AutomationRule>> {
    let locale = Locale::from_headers(&headers).as_sql();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query_as::<_, AutomationRule>(
        "SELECT id, tenant_id, CASE WHEN $1 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at
         FROM ticket.ticket_automation_rules ORDER BY priority ASC, created_at ASC",
    )
    .bind(locale)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rules) => {
            let _ = scope.commit().await;
            ApiResponse::success(rules, "自动化规则列表获取成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("获取自动化规则列表失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/automation-rules/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "规则ID")
    ),
    responses(
        (status = 200, description = "规则详情获取成功", body = AutomationRule),
        (status = 500, description = "获取规则详情失败")
    )
)]
pub async fn get_automation_rule_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> ApiResponse<AutomationRule> {
    let locale = Locale::from_headers(&headers).as_sql();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query_as::<_, AutomationRule>(
        "SELECT id, tenant_id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at
         FROM ticket.ticket_automation_rules WHERE id = $1",
    )
    .bind(id)
    .bind(locale)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(rule)) => {
            let _ = scope.commit().await;
            ApiResponse::success(rule, "自动化规则获取成功")
        }
        Ok(None) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("自动化规则不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("获取自动化规则失败", e))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket:write"])),
    path = "/automation-rules/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "规则ID")
    ),
    request_body = UpdateAutomationRuleRequest,
    responses(
        (status = 200, description = "自动化规则更新成功", body = AutomationRule),
        (status = 500, description = "更新自动化规则失败")
    )
)]
pub async fn update_automation_rule_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAutomationRuleRequest>,
) -> ApiResponse<AutomationRule> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, AutomationRule>(
        r#"UPDATE ticket.ticket_automation_rules SET
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        condition_field = COALESCE($5, condition_field),
        condition_value = COALESCE($6, condition_value),
        action_type = COALESCE($7, action_type),
        action_value = COALESCE($8, action_value),
        priority = COALESCE($9, priority),
        enabled = COALESCE($10, enabled),
        updated_at = $11
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.condition_field)
    .bind(&req.condition_value)
    .bind(&req.action_type)
    .bind(&req.action_value)
    .bind(req.priority)
    .bind(req.enabled)
    .bind(now)
    .fetch_optional(&mut scope)
    .await;
    match result {
        Ok(Some(rule)) => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(rule, "自动化规则更新成功")
        }
        Ok(None) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("自动化规则不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("更新自动化规则失败", e))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/automation-rules/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "规则ID")
    ),
    responses(
        (status = 200, description = "自动化规则已删除", body = serde_json::Value),
        (status = 500, description = "删除自动化规则失败")
    )
)]
pub async fn delete_automation_rule_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query("DELETE FROM ticket.ticket_automation_rules WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(json!({"deleted": true}), "自动化规则已删除")
        }
        Ok(_) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("自动化规则不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("删除自动化规则失败", e))
        }
    }
}

// ==================== Knowledge Base ====================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:ticket:write"])),
    path = "/knowledge-articles",
    tag = "tickets",
    request_body = CreateKnowledgeArticleRequest,
    responses(
        (status = 200, description = "知识文章创建成功", body = KnowledgeArticle),
        (status = 500, description = "创建知识文章失败")
    )
)]
pub async fn create_knowledge_article_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateKnowledgeArticleRequest>,
) -> ApiResponse<KnowledgeArticle> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let id = Uuid::new_v4();
    let now = Utc::now();
    let keywords = req.keywords.unwrap_or_default();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, KnowledgeArticle>(
        r#"INSERT INTO ticket.ticket_knowledge_articles
        (id, tenant_id, title, content, category, keywords, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
        RETURNING id, tenant_id, title, content, category, keywords, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.category)
    .bind(&keywords)
    .bind(now)
    .fetch_one(&mut scope)
    .await;
    match result {
        Ok(article) => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(article, "知识文章创建成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("创建知识文章失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/knowledge-articles",
    tag = "tickets",
    responses(
        (status = 200, description = "知识文章列表获取成功", body = Vec<KnowledgeArticle>),
        (status = 500, description = "获取知识文章列表失败")
    )
)]
pub async fn list_knowledge_articles_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<Vec<KnowledgeArticle>> {
    let _tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let q = params.get("q").cloned().unwrap_or_default();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let articles = match sqlx::query_as::<_, KnowledgeArticle>(
        "SELECT id, tenant_id, title, content, category, keywords, created_at, updated_at
         FROM ticket.ticket_knowledge_articles ORDER BY updated_at DESC",
    )
    .fetch_all(&mut scope)
    .await
    {
        Ok(a) => {
            let _ = scope.commit().await;
            a
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("获取知识文章列表失败", e));
        }
    };
    if q.trim().is_empty() {
        return ApiResponse::success(articles, "知识文章列表获取成功");
    }
    let refs: Vec<KnowledgeArticleRef> = articles
        .iter()
        .map(|a| KnowledgeArticleRef {
            title: a.title.clone(),
            content: a.content.clone(),
            keywords: a.keywords.clone(),
        })
        .collect();
    let ranked = crate::models::rank_articles_against_query(&q, &refs);
    let sorted: Vec<KnowledgeArticle> = ranked
        .into_iter()
        .map(|(idx, _)| articles[idx].clone())
        .collect();
    ApiResponse::success(sorted, "知识文章推荐结果")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/knowledge-articles/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "文章ID")
    ),
    responses(
        (status = 200, description = "文章详情获取成功", body = KnowledgeArticle),
        (status = 500, description = "获取文章详情失败")
    )
)]
pub async fn get_knowledge_article_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<KnowledgeArticle> {
    let _tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query_as::<_, KnowledgeArticle>(
        "SELECT id, tenant_id, title, content, category, keywords, created_at, updated_at
         FROM ticket.ticket_knowledge_articles WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(a)) => {
            let _ = scope.commit().await;
            ApiResponse::success(a, "知识文章获取成功")
        }
        Ok(None) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("知识文章不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("获取知识文章失败", e))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket:write"])),
    path = "/knowledge-articles/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "文章ID")
    ),
    request_body = UpdateKnowledgeArticleRequest,
    responses(
        (status = 200, description = "知识文章更新成功", body = KnowledgeArticle),
        (status = 500, description = "更新知识文章失败")
    )
)]
pub async fn update_knowledge_article_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateKnowledgeArticleRequest>,
) -> ApiResponse<KnowledgeArticle> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let result = sqlx::query_as::<_, KnowledgeArticle>(
        r#"UPDATE ticket.ticket_knowledge_articles SET
        title = COALESCE($3, title),
        content = COALESCE($4, content),
        category = COALESCE($5, category),
        keywords = COALESCE($6, keywords),
        updated_at = $7
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, tenant_id, title, content, category, keywords, created_at, updated_at"#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.category)
    .bind(&req.keywords)
    .bind(now)
    .fetch_optional(&mut scope)
    .await;
    match result {
        Ok(Some(a)) => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(a, "知识文章更新成功")
        }
        Ok(None) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("知识文章不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("更新知识文章失败", e))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/knowledge-articles/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "文章ID")
    ),
    responses(
        (status = 200, description = "知识文章已删除", body = serde_json::Value),
        (status = 500, description = "删除知识文章失败")
    )
)]
pub async fn delete_knowledge_article_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query(
        "DELETE FROM ticket.ticket_knowledge_articles WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(json!({"deleted": true}), "知识文章已删除")
        }
        Ok(_) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("知识文章不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("删除知识文章失败", e))
        }
    }
}

// ==================== 评论/活动 by-id（web 契约收口） ====================

#[derive(serde::Deserialize, utoipa::ToSchema)]
pub struct UpdateCommentRequest {
    content: Option<String>,
    is_internal: Option<bool>,
}

/// 写操作必须携带有效租户：缺失或为零租户时返回 400，禁止把业务数据写入零 UUID 区间。
fn require_tenant_id<T>(claims: &Claims) -> Result<Uuid, ApiResponse<T>> {
    match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) if !t.is_nil() => Ok(t),
        _ => Err(ApiResponse::error(400, "缺少租户上下文：拒绝工单写操作")),
    }
}

/// PUT /tickets/{id}/comments/{comment_id} —— 更新评论内容
#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/comments/{comment_id}",
    tag = "tickets",
    request_body = UpdateCommentRequest,
    params(("id" = Uuid, Path, description = ""), ("comment_id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = TicketComment),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_comment_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path((ticket_id, comment_id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateCommentRequest>,
) -> ApiResponse<TicketComment> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query(
        "UPDATE ticket.core_ticket_comments SET content = COALESCE($1, content), \
         is_internal = COALESCE($2, is_internal) \
         WHERE id = $3 AND ticket_id = $4 AND tenant_id = $5",
    )
    .bind(&req.content)
    .bind(req.is_internal)
    .bind(comment_id)
    .bind(ticket_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(res) if res.rows_affected() > 0 => {}
        Ok(_) => {
            let _ = scope.rollback().await;
            return ApiResponse::not_found("评论不存在");
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("更新评论失败", e));
        }
    }
    match sqlx::query_as::<_, TicketComment>(
        "SELECT id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at \
         FROM ticket.core_ticket_comments WHERE id = $1",
    )
    .bind(comment_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(comment) => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(comment, "评论已更新")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("查询评论失败", e))
        }
    }
}

/// DELETE /tickets/{id}/comments/{comment_id} —— 删除评论
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/comments/{comment_id}",
    tag = "tickets",
    params(("id" = Uuid, Path, description = ""), ("comment_id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_comment_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path((ticket_id, comment_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query(
        "DELETE FROM ticket.core_ticket_comments \
         WHERE id = $1 AND ticket_id = $2 AND tenant_id = $3",
    )
    .bind(comment_id)
    .bind(ticket_id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                return ApiResponse::from(TopemsError::internal("提交失败", e));
            }
            ApiResponse::success(json!({"deleted": true}), "评论已删除")
        }
        Ok(_) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("评论不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("删除评论失败", e))
        }
    }
}

/// GET /tickets/{id}/activities/{activity_id} —— 单条活动
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}/activities/{activity_id}",
    tag = "tickets",
    params(("id" = Uuid, Path, description = ""), ("activity_id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = TicketActivity),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_activity_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
    Path((ticket_id, activity_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<TicketActivity> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    match sqlx::query_as::<_, TicketActivity>(
        "SELECT id, ticket_id, tenant_id, user_id, action, from_value, to_value, created_at \
         FROM ticket.core_ticket_activities \
         WHERE id = $1 AND ticket_id = $2",
    )
    .bind(activity_id)
    .bind(ticket_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(activity)) => {
            let _ = scope.commit().await;
            ApiResponse::success(activity, "查询成功")
        }
        Ok(None) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("活动不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            ApiResponse::from(TopemsError::internal("查询活动失败", e))
        }
    }
}

/// GET /tickets/{id}/activities/timeline —— 活动时间线（复用活动列表查询）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}/activities/timeline",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Vec<TicketActivity>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_activities_timeline_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(ticket_id): Path<Uuid>,
) -> ApiResponse<Vec<TicketActivity>> {
    let service = TicketService::new(db);
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    match service
        .list_activities(tenant_id, ticket_id, &txn_arc)
        .await
    {
        Ok(list) => ApiResponse::success(list, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询活动失败", e)),
    }
}

// ==================== 工单动作（web 契约收口） ====================

/// POST /tickets/{id}/assign —— 指派处理人
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/assign",
    tag = "tickets",
    request_body = serde_json::Value,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Ticket),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn assign_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> ApiResponse<Ticket> {
    let service = TicketService::new(db.clone());
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    if let Err(e) = service.get_ticket(tenant_id, id, &txn_arc).await {
        return match e {
            sqlx::Error::RowNotFound => ApiResponse::not_found("工单不存在"),
            other => ApiResponse::from(TopemsError::internal("查询工单失败", other)),
        };
    }
    let assignee_id = body
        .get("assignee_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());
    if let Some(a) = assignee_id {
        let mut guard = txn_arc.lock().await;
        let Some(txn) = guard.as_mut() else {
            return ApiResponse::from(TopemsError::internal(
                "数据库事务上下文缺失",
                "请求事务未注入",
            ));
        };
        let mut scope = match db.scope_with(txn).await {
            Ok(s) => s,
            Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
        };
        if let Err(e) = sqlx::query(
            "UPDATE ticket.core_tickets SET assignee_id = $1, updated_at = $2 \
             WHERE id = $3 AND tenant_id = $4",
        )
        .bind(a)
        .bind(Utc::now())
        .bind(id)
        .bind(tenant_id)
        .execute(&mut scope)
        .await
        {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("指派工单失败", e));
        }
        if let Err(e) = scope.commit().await {
            return ApiResponse::from(TopemsError::internal("提交失败", e));
        }
    }
    match service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(t) => ApiResponse::success(t, "工单已指派"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询工单失败", e)),
    }
}

/// POST /tickets/{id}/resolve —— 标记解决
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/resolve",
    tag = "tickets",
    request_body = serde_json::Value,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Ticket),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn resolve_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(_body): Json<serde_json::Value>,
) -> ApiResponse<Ticket> {
    let service = TicketService::new(db.clone());
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    if let Err(e) = service.get_ticket(tenant_id, id, &txn_arc).await {
        return match e {
            sqlx::Error::RowNotFound => ApiResponse::not_found("工单不存在"),
            other => ApiResponse::from(TopemsError::internal("查询工单失败", other)),
        };
    }
    let now = Utc::now();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    if let Err(e) = sqlx::query(
        "UPDATE ticket.core_tickets SET status = 'resolved', \
         resolved_at = COALESCE(resolved_at, $1), updated_at = $1 \
         WHERE id = $2 AND tenant_id = $3",
    )
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("解决工单失败", e));
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    match service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(t) => ApiResponse::success(t, "工单已解决"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询工单失败", e)),
    }
}

/// POST /tickets/{id}/close —— 关闭工单
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/close",
    tag = "tickets",
    request_body = serde_json::Value,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Ticket),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn close_ticket_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(_body): Json<serde_json::Value>,
) -> ApiResponse<Ticket> {
    let service = TicketService::new(db.clone());
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    if let Err(e) = service.get_ticket(tenant_id, id, &txn_arc).await {
        return match e {
            sqlx::Error::RowNotFound => ApiResponse::not_found("工单不存在"),
            other => ApiResponse::from(TopemsError::internal("查询工单失败", other)),
        };
    }
    let now = Utc::now();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    if let Err(e) = sqlx::query(
        "UPDATE ticket.core_tickets SET status = 'closed', \
         closed_at = COALESCE(closed_at, $1), updated_at = $1 \
         WHERE id = $2 AND tenant_id = $3",
    )
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    {
        let _ = scope.rollback().await;
        return ApiResponse::from(TopemsError::internal("关闭工单失败", e));
    }
    if let Err(e) = scope.commit().await {
        return ApiResponse::from(TopemsError::internal("提交失败", e));
    }
    match service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(t) => ApiResponse::success(t, "工单已关闭"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询工单失败", e)),
    }
}

// ==================== 工单 SLA 子路径（web 契约收口） ====================

/// GET /tickets/{id}/sla/escalations —— SLA 升级历史
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/{id}/sla/escalations",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = Vec<SlaEscalationEvent>),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_sla_escalations_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Vec<SlaEscalationEvent>> {
    let ticket_service = TicketService::new(db.clone());
    let sla_service = TicketSlaService::new(db.clone());
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    if let Err(e) = ticket_service.get_ticket(tenant_id, id, &txn_arc).await {
        return match e {
            sqlx::Error::RowNotFound => ApiResponse::not_found("工单不存在"),
            other => ApiResponse::from(TopemsError::internal("查询工单失败", other)),
        };
    }
    match sla_service
        .get_escalation_history(tenant_id, id, &txn_arc)
        .await
    {
        Ok(events) => ApiResponse::success(events, "SLA升级历史"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询SLA升级失败", e)),
    }
}

/// POST /tickets/{id}/sla/calculate —— 重算工单 SLA
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:write"])),
    path = "/tickets/{id}/sla/calculate",
    tag = "tickets",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = TicketSlaInfo),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn calculate_ticket_sla_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<TicketSlaInfo> {
    let ticket_service = TicketService::new(db.clone());
    let sla_service = TicketSlaService::new(db.clone());
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let ticket = match ticket_service.get_ticket(tenant_id, id, &txn_arc).await {
        Ok(t) => t,
        Err(sqlx::Error::RowNotFound) => return ApiResponse::not_found("工单不存在"),
        Err(e) => return ApiResponse::from(TopemsError::internal("查询工单失败", e)),
    };
    match sla_service.calculate_sla(&ticket, &txn_arc).await {
        Ok(info) => ApiResponse::success(info, "SLA计算完成"),
        Err(e) => ApiResponse::from(TopemsError::internal("计算SLA失败", e)),
    }
}

// ==================== 仪表盘（web 契约收口） ====================

/// GET /tickets/dashboard/summary —— 汇总（按状态实时聚合 core_tickets）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/summary",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_summary_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(_claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let rows = match sqlx::query(
        "SELECT status, count(*)::bigint AS c FROM ticket.core_tickets \
         WHERE deleted_at IS NULL GROUP BY status",
    )
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => {
            let _ = scope.commit().await;
            rows
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询看板汇总失败", e));
        }
    };
    let mut open = 0i64;
    let mut in_progress = 0i64;
    let mut pending = 0i64;
    let mut resolved = 0i64;
    let mut closed = 0i64;
    let mut total = 0i64;
    for r in &rows {
        let status: String = r.get("status");
        let c: i64 = r.get("c");
        total += c;
        match status.as_str() {
            "open" => open = c,
            "in_progress" => in_progress = c,
            "pending" => pending = c,
            "resolved" => resolved = c,
            "closed" => closed = c,
            _ => {}
        }
    }
    ApiResponse::success(
        json!({
            "total": total, "open": open, "in_progress": in_progress, "pending": pending,
            "resolved_today": resolved, "closed_today": closed, "sla_breached": 0,
            "avg_resolution_hours": 0.0, "avg_response_hours": 0.0,
            "new_this_week": 0, "resolved_this_week": resolved,
        }),
        "看板汇总",
    )
}

/// GET /tickets/dashboard/trend —— 趋势序列（待 analytics 聚合：P2-8 degraded 占位）
///
/// 诚实降级：data.items 为空数组（无虚构数据），同时显式返回
/// `degraded: true` 与 `degraded_reason`，前端可据此展示「待 analytics 聚合」提示。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/trend",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_trend_handler() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        json!({
            "items": [],
            "degraded": true,
            "degraded_reason": "待 analytics 聚合：趋势序列尚未接入，当前为空数据占位",
        }),
        "趋势（degraded：待 analytics 聚合）",
    )
}

/// GET /tickets/dashboard/sla-overview —— SLA 概览（待 analytics 聚合：P2-8 degraded 占位）
///
/// 诚实降级：各统计字段保持零值（不虚构 SLA 数据），新增可选 `degraded` /
/// `degraded_reason` 字段向后兼容（前端忽略未知字段即可）。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/sla-overview",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_sla_overview_handler() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        json!({
            "total": 0, "on_time": 0, "breached": 0, "breach_rate": 0.0,
            "avg_resolution_minutes": 0, "avg_response_minutes": 0,
            "degraded": true,
            "degraded_reason": "待 analytics 聚合：SLA 统计尚未接入，当前为零值占位",
        }),
        "SLA概览（degraded：待 analytics 聚合）",
    )
}

/// GET /tickets/dashboard/assignee-load —— 处理人负载（待 analytics 聚合：P2-8 degraded 占位）
///
/// 诚实降级：data.items 为空数组（无虚构负载数据），同时显式返回
/// `degraded: true` 与 `degraded_reason`，前端可据此展示「待 analytics 聚合」提示。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/assignee-load",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_assignee_load_handler() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        json!({
            "items": [],
            "degraded": true,
            "degraded_reason": "待 analytics 聚合：处理人负载尚未接入，当前为空数据占位",
        }),
        "处理人负载（degraded：待 analytics 聚合）",
    )
}

/// GET /tickets/dashboard/my —— 我的工单概览（实时聚合 core_tickets）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/my",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_my_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let tenant_id = match require_tenant_id(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let me = Uuid::parse_str(&claims.sub).unwrap_or(Uuid::nil());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::internal(
            "数据库事务上下文缺失",
            "请求事务未注入",
        ));
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => return ApiResponse::from(TopemsError::internal("数据库连接失败", e)),
    };
    let rows = match sqlx::query(
        "SELECT status, count(*)::bigint AS c FROM ticket.core_tickets \
         WHERE deleted_at IS NULL AND tenant_id = $1 AND assignee_id = $2 GROUP BY status",
    )
    .bind(tenant_id)
    .bind(me)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => {
            let _ = scope.commit().await;
            rows
        }
        Err(e) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询我的看板失败", e));
        }
    };
    let mut open = 0i64;
    let mut in_progress = 0i64;
    for r in &rows {
        let status: String = r.get("status");
        let c: i64 = r.get("c");
        match status.as_str() {
            "open" => open = c,
            "in_progress" => in_progress = c,
            _ => {}
        }
    }
    ApiResponse::success(
        json!({
            "my_open": open, "my_in_progress": in_progress, "my_overdue": 0,
            "my_recent": { "items": [], "total": 0, "page": 1, "page_size": 20 },
        }),
        "我的看板",
    )
}

// ==================== 我的工单 / 检索 / 导出 / 分组看板（web 契约收口）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/my",
    tag = "tickets",
    params(("page" = Option<i64>, Query, description = "页码"), ("page_size" = Option<i64>, Query, description = "每页条数")),
    responses(
        (status = 200, description = "OK", body = TicketListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn my_tickets_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Query(mut query): Query<TicketQuery>,
) -> ApiResponse<TicketListResponse> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let Ok(user_id) = Uuid::parse_str(&claims.sub) else {
        return ApiResponse::unauthorized("Invalid user id");
    };
    // “我的工单”= 指派给我 + 我提的，后者用 reporter 覆盖时会漏掉指派件，这里以指派为准
    query.assignee_id = Some(user_id);
    match service.list_tickets(tenant_id, query, &txn_arc).await {
        Ok(list) => ApiResponse::success(list, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询我的工单失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/search",
    tag = "tickets",
    params(("q" = String, Query, description = "关键词：工单号/标题/描述")),
    responses(
        (status = 200, description = "OK", body = TicketListResponse),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn search_tickets_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<TicketQuery>,
) -> ApiResponse<TicketListResponse> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    if query.q.as_deref().unwrap_or("").trim().is_empty() {
        return ApiResponse::bad_request("q 不能为空");
    }
    match service.list_tickets(tenant_id, query, &txn_arc).await {
        Ok(list) => ApiResponse::success(list, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("搜索工单失败", e)),
    }
}

/// RFC3986 百分号编码（data URI 用，避免为导出临时引依赖）
fn percent_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len() * 2);
    for b in input.as_bytes() {
        let c = char::from(*b);
        if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.' | '~') {
            out.push(c);
        } else {
            out.push('%');
            out.push_str(&format!("{b:02X}"));
        }
    }
    out
}

fn csv_field(v: &str) -> String {
    if v.contains(',') || v.contains('"') || v.contains('\n') {
        format!("\"{}\"", v.replace('"', "\"\""))
    } else {
        v.to_string()
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/export",
    tag = "tickets",
    request_body = TicketExportRequest,
    responses(
        (status = 200, description = "OK", body = TicketExportResult),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn export_tickets_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<TicketExportRequest>,
) -> ApiResponse<TicketExportResult> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let mut query = req.params.unwrap_or_default();
    let format = req.format.unwrap_or_else(|| "csv".to_string());

    // 上限 5000 行（100/页 × 50 页），避免一次性拉爆内存
    const PAGE: i64 = 100;
    const MAX_PAGES: i64 = 50;
    let mut rows: Vec<Ticket> = Vec::new();
    let mut page = 1;
    while page <= MAX_PAGES {
        query.page = Some(page);
        query.page_size = Some(PAGE);
        match service
            .list_tickets(tenant_id, query.clone(), &txn_arc)
            .await
        {
            Ok(list) => {
                let total = list.total;
                let got = i64::try_from(list.items.len()).unwrap_or(i64::MAX);
                rows.extend(list.items);
                if got < PAGE || i64::try_from(rows.len()).unwrap_or(i64::MAX) >= total {
                    break;
                }
            }
            Err(e) => return ApiResponse::from(TopemsError::internal("导出工单失败", e)),
        }
        page += 1;
    }

    let mut csv =
        String::from("ticket_no,title,status,severity,ticket_type,assignee_id,created_at\n");
    for t in &rows {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{}\n",
            csv_field(&t.ticket_no),
            csv_field(&t.title),
            csv_field(t.status.as_str()),
            csv_field(t.severity.as_str()),
            csv_field(t.ticket_type.as_str()),
            t.assignee_id.map(|v| v.to_string()).unwrap_or_default(),
            t.created_at.to_rfc3339(),
        ));
    }
    let filename = format!("tickets-{}.csv", Utc::now().format("%Y%m%d%H%M%S"));
    let url = format!("data:text/csv;charset=utf-8,{}", percent_encode(&csv));
    ApiResponse::success(
        TicketExportResult {
            format,
            filename,
            total: i64::try_from(rows.len()).unwrap_or(i64::MAX),
            url,
        },
        "导出完成",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/by-severity",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = Vec<SeverityCount>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_by_severity_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<SeverityCount>> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match service.get_stats(tenant_id, &txn_arc).await {
        Ok(stats) => ApiResponse::success(stats.by_severity, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("按严重度统计失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/by-type",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = Vec<TypeCount>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_by_type_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<TypeCount>> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match service.get_stats(tenant_id, &txn_arc).await {
        Ok(stats) => ApiResponse::success(stats.by_type, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("按类型统计失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/dashboard/by-source",
    tag = "tickets",
    responses(
        (status = 200, description = "OK", body = Vec<SourceCount>),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn dashboard_by_source_handler(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<Vec<SourceCount>> {
    let service = TicketService::new(db);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match service.get_stats(tenant_id, &txn_arc).await {
        Ok(stats) => ApiResponse::success(stats.by_source, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("按来源统计失败", e)),
    }
}

// ==================== Routes ====================

pub fn ticket_routes() -> Router<Db> {
    Router::new()
        .route(
            "/tickets",
            post(create_ticket_handler).get(list_tickets_handler),
        )
        .route("/tickets/stats", get(get_stats_handler))
        .route("/tickets/sla-stats", get(get_sla_stats_handler))
        .route(
            "/tickets/{id}",
            get(get_ticket_handler)
                .put(update_ticket_handler)
                .delete(delete_ticket_handler),
        )
        .route(
            "/tickets/{id}/comments",
            get(list_comments_handler).post(add_comment_handler),
        )
        .route("/tickets/{id}/activities", get(list_activities_handler))
        .route(
            "/tickets/{id}/sla",
            get(get_ticket_sla_handler).post(trigger_sla_escalation_handler),
        )
        .route(
            "/sla-policies",
            get(list_sla_policies_handler).post(create_sla_policy_handler),
        )
        .route(
            "/sla-policies/{id}",
            get(get_sla_policy_handler)
                .put(update_sla_policy_handler)
                .delete(delete_sla_policy_handler),
        )
        .route(
            "/automation-rules",
            get(list_automation_rules_handler).post(create_automation_rule_handler),
        )
        .route(
            "/automation-rules/{id}",
            get(get_automation_rule_handler)
                .put(update_automation_rule_handler)
                .delete(delete_automation_rule_handler),
        )
        .route(
            "/knowledge-articles",
            get(list_knowledge_articles_handler).post(create_knowledge_article_handler),
        )
        .route(
            "/knowledge-articles/{id}",
            get(get_knowledge_article_handler)
                .put(update_knowledge_article_handler)
                .delete(delete_knowledge_article_handler),
        )
        // ---- 评论 by-id（web 契约收口）----
        .route(
            "/tickets/{id}/comments/{comment_id}",
            put(update_comment_handler).delete(delete_comment_handler),
        )
        // ---- 活动 by-id / 时间线（web 契约收口）----
        .route(
            "/tickets/{id}/activities/{activity_id}",
            get(get_activity_handler),
        )
        .route(
            "/tickets/{id}/activities/timeline",
            get(list_activities_timeline_handler),
        )
        // ---- 工单动作（web 契约收口）----
        .route("/tickets/{id}/assign", post(assign_ticket_handler))
        .route("/tickets/{id}/resolve", post(resolve_ticket_handler))
        .route("/tickets/{id}/close", post(close_ticket_handler))
        // ---- 工单 SLA 子路径（web 契约收口）----
        .route(
            "/tickets/{id}/sla/escalations",
            get(list_sla_escalations_handler),
        )
        .route(
            "/tickets/{id}/sla/calculate",
            post(calculate_ticket_sla_handler),
        )
        // ---- 仪表盘（web 契约收口）----
        .route("/tickets/dashboard/summary", get(dashboard_summary_handler))
        .route("/tickets/dashboard/trend", get(dashboard_trend_handler))
        .route(
            "/tickets/dashboard/sla-overview",
            get(dashboard_sla_overview_handler),
        )
        .route(
            "/tickets/dashboard/assignee-load",
            get(dashboard_assignee_load_handler),
        )
        .route("/tickets/dashboard/my", get(dashboard_my_handler))
        // ---- 我的工单 / 检索 / 导出 / 分组看板（web 契约收口）----
        .route("/tickets/my", get(my_tickets_handler))
        .route("/tickets/search", get(search_tickets_handler))
        .route("/tickets/export", post(export_tickets_handler))
        .route(
            "/tickets/dashboard/by-severity",
            get(dashboard_by_severity_handler),
        )
        .route("/tickets/dashboard/by-type", get(dashboard_by_type_handler))
        .route(
            "/tickets/dashboard/by-source",
            get(dashboard_by_source_handler),
        )
}
