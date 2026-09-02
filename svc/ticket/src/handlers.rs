use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{Duration, Utc};
use serde_json::json;
use sqlx::{PgPool, Row};
use std::str::FromStr;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::models::{
    AddCommentRequest, AutomationRule, CreateAutomationRuleRequest, CreateKnowledgeArticleRequest,
    CreateSlaPolicyRequest, CreateTicketRequest, KnowledgeArticle, KnowledgeArticleRef,
    SeverityCount, SlaEscalationEvent, SourceCount, Ticket, TicketActivity, TicketComment,
    TicketListResponse, TicketQuery, TicketSlaInfo, TicketSlaPolicy, TicketSlaStats, TicketStats,
    TicketStatus, TicketType, TypeCount, UpdateAutomationRuleRequest, UpdateKnowledgeArticleRequest,
    UpdateSlaPolicyRequest, UpdateTicketRequest,
};
use crate::sla_service::TicketSlaService;

#[derive(Clone)]
pub struct TicketService {
    pool: PgPool,
}

impl TicketService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn generate_ticket_no(&self) -> String {
        use std::sync::atomic::{AtomicU64, Ordering};
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let seq = COUNTER.fetch_add(1, Ordering::SeqCst) % 1_000_000;
        let now = Utc::now();
        format!("TK{:}{:06}", now.format("%Y%m%d"), seq)
    }

    pub async fn create_ticket(
        &self,
        tenant_id: Uuid,
        reporter_id: Option<Uuid>,
        req: CreateTicketRequest,
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

        sqlx::query(
            r#"
            INSERT INTO core_tickets
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
        .execute(&self.pool)
        .await?;

        // 自动化规则应用：按租户启用规则评估并应用变更（assignee/severity/tags）
        let rules = sqlx::query_as::<_, AutomationRule>(
            "SELECT id, tenant_id, name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at
             FROM ticket_automation_rules WHERE tenant_id = $1 AND enabled = true",
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
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
                    r#"UPDATE core_tickets SET
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
                .execute(&self.pool)
                .await?;
            }
        }

        sqlx::query(
            r#"
            INSERT INTO core_ticket_activities
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
        .execute(&self.pool)
        .await?;

        self.get_ticket(tenant_id, ticket_id).await
    }

    pub async fn get_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Ticket, sqlx::Error> {
        let ticket = sqlx::query_as::<_, Ticket>(
            r#"
            SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status,
                   source_service, source_business_id, assignee_id, reporter_id, sla_due_at,
                   resolved_at, closed_at, created_at, updated_at, tags, metadata
            FROM core_tickets
            WHERE id = $1 AND tenant_id = $2
            "#,
        )
        .bind(ticket_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(ticket)
    }

    pub async fn list_tickets(
        &self,
        tenant_id: Uuid,
        query: TicketQuery,
    ) -> Result<TicketListResponse, sqlx::Error> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(20).min(100);
        let offset = ((page - 1) * page_size) as i64;

        let rows = sqlx::query_as::<_, Ticket>(
            r#"
            SELECT id, ticket_no, tenant_id, title, description, ticket_type, severity, status,
                   source_service, source_business_id, assignee_id, reporter_id, sla_due_at,
                   resolved_at, closed_at, created_at, updated_at, tags, metadata
            FROM core_tickets
            WHERE tenant_id = $1
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR severity = $3)
              AND ($4::text IS NULL OR ticket_type = $4)
              AND ($5::uuid IS NULL OR assignee_id = $5)
              AND ($6::uuid IS NULL OR reporter_id = $6)
              AND ($7::text IS NULL OR source_service = $7)
              AND ($8::text IS NULL OR source_business_id = $8)
              AND ($9::bool IS NULL OR (sla_due_at IS NOT NULL AND sla_due_at < NOW() AND status NOT IN ('resolved', 'closed', 'cancelled')) = $9)
            ORDER BY created_at DESC
            LIMIT $10 OFFSET $11
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
        .bind(query.sla_breached)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM core_tickets
            WHERE tenant_id = $1
              AND ($2::text IS NULL OR status = $2)
              AND ($3::text IS NULL OR severity = $3)
              AND ($4::text IS NULL OR ticket_type = $4)
              AND ($5::uuid IS NULL OR assignee_id = $5)
              AND ($6::uuid IS NULL OR reporter_id = $6)
              AND ($7::text IS NULL OR source_service = $7)
              AND ($8::text IS NULL OR source_business_id = $8)
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
        .fetch_one(&self.pool)
        .await?;

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
    ) -> Result<Ticket, sqlx::Error> {
        let existing = self.get_ticket(tenant_id, ticket_id).await?;
        let now = Utc::now();

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

        sqlx::query(
            r#"
            UPDATE core_tickets SET
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
        .execute(&self.pool)
        .await?;

        if let Some(new_status) = &req.status {
            if new_status != &existing.status {
                sqlx::query(
                    r#"
                    INSERT INTO core_ticket_activities
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
                .execute(&self.pool)
                .await?;
            }
        }
        if let Some(new_assignee) = req.assignee_id {
            if Some(new_assignee) != existing.assignee_id {
                sqlx::query(
                    r#"
                    INSERT INTO core_ticket_activities
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
                .execute(&self.pool)
                .await?;
            }
        }

        self.get_ticket(tenant_id, ticket_id).await
    }

    pub async fn add_comment(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        user_id: Uuid,
        user_name: Option<String>,
        req: AddCommentRequest,
    ) -> Result<TicketComment, sqlx::Error> {
        let comment_id = Uuid::new_v4();
        let now = Utc::now();
        let is_internal = req.is_internal.unwrap_or(false);

        sqlx::query(
            r#"
            INSERT INTO core_ticket_comments
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
        .execute(&self.pool)
        .await?;

        sqlx::query("UPDATE core_tickets SET updated_at = $1 WHERE id = $2 AND tenant_id = $3")
            .bind(now)
            .bind(ticket_id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;

        sqlx::query_as::<_, TicketComment>(
            r#"
            SELECT id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at
            FROM core_ticket_comments
            WHERE id = $1
            "#,
        )
        .bind(comment_id)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn list_comments(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketComment>, sqlx::Error> {
        sqlx::query_as::<_, TicketComment>(
            r#"
            SELECT id, ticket_id, tenant_id, user_id, user_name, content, is_internal, created_at
            FROM core_ticket_comments
            WHERE ticket_id = $1 AND tenant_id = $2
            ORDER BY created_at ASC
            "#,
        )
        .bind(ticket_id)
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_activities(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketActivity>, sqlx::Error> {
        sqlx::query_as::<_, TicketActivity>(
            r#"
            SELECT id, ticket_id, tenant_id, user_id, action, from_value, to_value, created_at
            FROM core_ticket_activities
            WHERE ticket_id = $1 AND tenant_id = $2
            ORDER BY created_at ASC
            "#,
        )
        .bind(ticket_id)
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn delete_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        user_id: Option<Uuid>,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE core_tickets SET status = 'cancelled', closed_at = $1, updated_at = $1
            WHERE id = $2 AND tenant_id = $3 AND status NOT IN ('closed', 'cancelled')
            "#,
        )
        .bind(Utc::now())
        .bind(ticket_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() > 0 {
            sqlx::query(
                r#"
                INSERT INTO core_ticket_activities
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
            .execute(&self.pool)
            .await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn get_stats(&self, tenant_id: Uuid) -> Result<TicketStats, sqlx::Error> {
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM core_tickets WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&self.pool)
                .await?;

        let open: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_tickets WHERE tenant_id = $1 AND status = 'open'",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let in_progress: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_tickets WHERE tenant_id = $1 AND status = 'in_progress'",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let pending: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_tickets WHERE tenant_id = $1 AND status = 'pending'",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let resolved: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_tickets WHERE tenant_id = $1 AND status = 'resolved'",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let closed: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_tickets WHERE tenant_id = $1 AND status IN ('closed', 'cancelled')",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let sla_breached: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM core_tickets
            WHERE tenant_id = $1
              AND sla_due_at IS NOT NULL
              AND sla_due_at < NOW()
              AND status NOT IN ('resolved', 'closed', 'cancelled')
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let severity_rows = sqlx::query(
            "SELECT severity, COUNT(*) AS cnt FROM core_tickets WHERE tenant_id = $1 GROUP BY severity",
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;
        let by_severity: Vec<SeverityCount> = severity_rows
            .into_iter()
            .map(|r| SeverityCount {
                severity: r.get("severity"),
                count: r.get("cnt"),
            })
            .collect();

        let type_rows = sqlx::query(
            "SELECT ticket_type, COUNT(*) AS cnt FROM core_tickets WHERE tenant_id = $1 GROUP BY ticket_type",
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;
        let by_type: Vec<TypeCount> = type_rows
            .into_iter()
            .map(|r| TypeCount {
                ticket_type: r.get("ticket_type"),
                count: r.get("cnt"),
            })
            .collect();

        let source_rows = sqlx::query(
            "SELECT source_service, COUNT(*) AS cnt FROM core_tickets WHERE tenant_id = $1 GROUP BY source_service",
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;
        let by_source: Vec<SourceCount> = source_rows
            .into_iter()
            .map(|r| SourceCount {
                source_service: r.get("source_service"),
                count: r.get("cnt"),
            })
            .collect();

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
    security(("BearerAuth" = ["ticket:ticket:write"])),
    path = "/tickets",
    tag = "tickets",
    request_body = CreateTicketRequest,
    responses(
        (status = 200, description = "工单创建成功", body = Ticket),
        (status = 500, description = "创建工单失败")
    )
)]
pub async fn create_ticket_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTicketRequest>,
) -> Json<ApiResponse<Ticket>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let reporter_id = Uuid::parse_str(&claims.sub).ok();

    match service.create_ticket(tenant_id, reporter_id, req).await {
        Ok(ticket) => Json(ApiResponse::success(ticket, "工单创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建工单失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/tickets",
    tag = "tickets",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页条数"),
        ("status" = Option<String>, Query, description = "状态筛选"),
        ("severity" = Option<String>, Query, description = "严重程度筛选"),
        ("ticket_type" = Option<String>, Query, description = "工单类型筛选")
    ),
    responses(
        (status = 200, description = "查询成功", body = TicketListResponse),
        (status = 500, description = "查询工单失败")
    )
)]
pub async fn list_tickets_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<TicketQuery>,
) -> Json<ApiResponse<TicketListResponse>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_tickets(tenant_id, query).await {
        Ok(list) => Json(ApiResponse::success(list, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询工单失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/tickets/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "工单ID")
    ),
    responses(
        (status = 200, description = "查询成功", body = Ticket),
        (status = 404, description = "工单不存在")
    )
)]
pub async fn get_ticket_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Ticket>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.get_ticket(tenant_id, id).await {
        Ok(ticket) => Json(ApiResponse::success(ticket, "查询成功")),
        Err(e) => Json(ApiResponse::error(404, &format!("工单不存在: {}", e))),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/tickets/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "工单ID")
    ),
    request_body = UpdateTicketRequest,
    responses(
        (status = 200, description = "工单更新成功", body = Ticket),
        (status = 500, description = "更新工单失败")
    )
)]
pub async fn update_ticket_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTicketRequest>,
) -> Json<ApiResponse<Ticket>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let user_id = Uuid::parse_str(&claims.sub).ok();

    match service.update_ticket(tenant_id, id, user_id, req).await {
        Ok(ticket) => Json(ApiResponse::success(ticket, "工单更新成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新工单失败: {}", e))),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ticket:ticket:read"])),
    path = "/tickets/{id}",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "工单ID")
    ),
    responses(
        (status = 200, description = "工单已取消", body = serde_json::Value),
        (status = 404, description = "工单不存在或已关闭"),
        (status = 500, description = "取消工单失败")
    )
)]
pub async fn delete_ticket_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let user_id = Uuid::parse_str(&claims.sub).ok();

    match service.delete_ticket(tenant_id, id, user_id).await {
        Ok(true) => Json(ApiResponse::success(
            json!({"cancelled": true}),
            "工单已取消",
        )),
        Ok(false) => Json(ApiResponse::error(404, "工单不存在或已关闭")),
        Err(e) => Json(ApiResponse::error(500, &format!("取消工单失败: {}", e))),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ticket:comment:write"])),
    path = "/tickets/{id}/comments",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "工单ID")
    ),
    request_body = AddCommentRequest,
    responses(
        (status = 200, description = "评论已添加", body = TicketComment),
        (status = 401, description = "Invalid user id"),
        (status = 500, description = "添加评论失败")
    )
)]
pub async fn add_comment_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<AddCommentRequest>,
) -> Json<ApiResponse<TicketComment>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(401, "Invalid user id")),
    };
    let user_name = Some(claims.username.clone());

    match service
        .add_comment(tenant_id, id, user_id, user_name, req)
        .await
    {
        Ok(comment) => Json(ApiResponse::success(comment, "评论已添加")),
        Err(e) => Json(ApiResponse::error(500, &format!("添加评论失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:comment:read"])),
    path = "/tickets/{id}/comments",
    tag = "tickets",
    params(
        ("id" = Uuid, Path, description = "工单ID")
    ),
    responses(
        (status = 200, description = "查询成功", body = Vec<TicketComment>),
        (status = 500, description = "查询评论失败")
    )
)]
pub async fn list_comments_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<TicketComment>>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_comments(tenant_id, id).await {
        Ok(list) => Json(ApiResponse::success(list, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询评论失败: {}", e))),
    }
}

pub async fn list_activities_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<TicketActivity>>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_activities(tenant_id, id).await {
        Ok(list) => Json(ApiResponse::success(list, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询活动失败: {}", e))),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ticket:read"])),
    path = "/tickets/stats",
    tag = "tickets",
    responses(
        (status = 200, description = "查询成功", body = TicketStats),
        (status = 500, description = "查询统计失败")
    )
)]
pub async fn get_stats_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<TicketStats>> {
    let service = TicketService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.get_stats(tenant_id).await {
        Ok(stats) => Json(ApiResponse::success(stats, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询统计失败: {}", e))),
    }
}

// ==================== SLA Handlers ====================

pub async fn get_ticket_sla_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TicketSlaInfo>> {
    let ticket_service = TicketService::new(pool.clone());
    let sla_service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    let ticket = match ticket_service.get_ticket(tenant_id, id).await {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::error(404, &format!("工单不存在: {}", e))),
    };

    match sla_service.calculate_sla(&ticket).await {
        Ok(sla) => Json(ApiResponse::success(sla, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("计算SLA失败: {}", e))),
    }
}

pub async fn trigger_sla_escalation_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<SlaEscalationEvent>>> {
    let ticket_service = TicketService::new(pool.clone());
    let sla_service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    let ticket = match ticket_service.get_ticket(tenant_id, id).await {
        Ok(t) => t,
        Err(e) => return Json(ApiResponse::error(404, &format!("工单不存在: {}", e))),
    };

    match sla_service.check_and_escalate(&ticket).await {
        Ok(events) => Json(ApiResponse::success(events, "SLA 升级检查完成")),
        Err(e) => Json(ApiResponse::error(500, &format!("SLA 升级检查失败: {}", e))),
    }
}

pub async fn get_sla_stats_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<TicketSlaStats>> {
    let service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.get_sla_stats(tenant_id).await {
        Ok(stats) => Json(ApiResponse::success(stats, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询SLA统计失败: {}", e))),
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
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSlaPolicyRequest>,
) -> Json<ApiResponse<TicketSlaPolicy>> {
    let service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.create_policy(tenant_id, req).await {
        Ok(policy) => Json(ApiResponse::success(policy, "SLA策略创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建SLA策略失败: {}", e))),
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
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<TicketSlaPolicy>>> {
    let service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.list_policies(tenant_id).await {
        Ok(policies) => Json(ApiResponse::success(policies, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询SLA策略失败: {}", e))),
    }
}

pub async fn get_sla_policy_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<TicketSlaPolicy>> {
    let service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.get_policy(tenant_id, id).await {
        Ok(policy) => Json(ApiResponse::success(policy, "查询成功")),
        Err(e) => Json(ApiResponse::error(404, &format!("SLA策略不存在: {}", e))),
    }
}

pub async fn update_sla_policy_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSlaPolicyRequest>,
) -> Json<ApiResponse<TicketSlaPolicy>> {
    let service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.update_policy(tenant_id, id, req).await {
        Ok(policy) => Json(ApiResponse::success(policy, "SLA策略更新成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新SLA策略失败: {}", e))),
    }
}

pub async fn delete_sla_policy_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let service = TicketSlaService::new(pool);
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());

    match service.delete_policy(tenant_id, id).await {
        Ok(true) => Json(ApiResponse::success(
            json!({"deleted": true}),
            "SLA策略已删除",
        )),
        Ok(false) => Json(ApiResponse::error(404, "SLA策略不存在或为默认策略不可删除")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除SLA策略失败: {}", e))),
    }
}

// ==================== Database Init ====================

pub async fn init_ticket_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_tickets (
            id UUID PRIMARY KEY,
            ticket_no TEXT UNIQUE NOT NULL,
            tenant_id UUID NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            ticket_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'open',
            source_service TEXT NOT NULL,
            source_business_id TEXT,
            assignee_id UUID,
            reporter_id UUID,
            sla_due_at TIMESTAMPTZ,
            resolved_at TIMESTAMPTZ,
            closed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            tags TEXT[],
            metadata JSONB
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_tickets_tenant_status
          ON core_tickets (tenant_id, status)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_tickets_source
          ON core_tickets (source_service, source_business_id)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_tickets_sla
          ON core_tickets (sla_due_at) WHERE sla_due_at IS NOT NULL
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_ticket_comments (
            id UUID PRIMARY KEY,
            ticket_id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            user_id UUID NOT NULL,
            user_name TEXT,
            content TEXT NOT NULL,
            is_internal BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_ticket_comments_ticket
          ON core_ticket_comments (ticket_id, created_at)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_ticket_activities (
            id UUID PRIMARY KEY,
            ticket_id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            user_id UUID,
            action TEXT NOT NULL,
            from_value TEXT,
            to_value TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_ticket_activities_ticket
          ON core_ticket_activities (ticket_id, created_at)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn init_sla_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_ticket_sla_policies (
            id UUID PRIMARY KEY,
            tenant_id UUID NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            ticket_type TEXT,
            severity TEXT,
            response_hours DOUBLE PRECISION NOT NULL DEFAULT 8,
            resolution_hours DOUBLE PRECISION NOT NULL DEFAULT 72,
            escalation_levels INTEGER NOT NULL DEFAULT 3,
            escalation_hours_1 DOUBLE PRECISION,
            escalation_hours_2 DOUBLE PRECISION,
            escalation_hours_3 DOUBLE PRECISION,
            working_hours_only BOOLEAN NOT NULL DEFAULT false,
            business_hours_start TEXT,
            business_hours_end TEXT,
            weekend_excluded BOOLEAN NOT NULL DEFAULT false,
            is_default BOOLEAN NOT NULL DEFAULT false,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_ticket_sla_policies_tenant
          ON core_ticket_sla_policies (tenant_id, is_active)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_ticket_sla_escalations (
            id UUID PRIMARY KEY,
            ticket_id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            level INTEGER NOT NULL,
            escalation_time TIMESTAMPTZ NOT NULL,
            escalated_to UUID,
            reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_core_ticket_sla_escalations_ticket
          ON core_ticket_sla_escalations (ticket_id, level)
        "#,
    )
    .execute(pool)
    .await?;

    // Schema 防御：增量迁移 + 一致性自检（V69.3）
    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[ticket] Schema 防御检查失败: {:?}", e);
    }

    Ok(())
}


// ==================== Automation Rules ====================

pub async fn create_automation_rule_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateAutomationRuleRequest>,
) -> Json<ApiResponse<AutomationRule>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let id = Uuid::new_v4();
    let now = Utc::now();
    let priority = req.priority.unwrap_or(100);
    let enabled = req.enabled.unwrap_or(true);
    let result = sqlx::query_as::<_, AutomationRule>(
        r#"INSERT INTO ticket_automation_rules
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
    .fetch_one(&pool)
    .await;
    match result {
        Ok(rule) => Json(ApiResponse::success(rule, "自动化规则创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建自动化规则失败: {}", e))),
    }
}

pub async fn list_automation_rules_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<AutomationRule>>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match sqlx::query_as::<_, AutomationRule>(
        "SELECT id, tenant_id, name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at
         FROM ticket_automation_rules WHERE tenant_id = $1 ORDER BY priority ASC, created_at ASC",
    )
    .bind(tenant_id)
    .fetch_all(&pool)
    .await
    {
        Ok(rules) => Json(ApiResponse::success(rules, "自动化规则列表获取成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取自动化规则列表失败: {}", e))),
    }
}

pub async fn get_automation_rule_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AutomationRule>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match sqlx::query_as::<_, AutomationRule>(
        "SELECT id, tenant_id, name, description, condition_field, condition_value, action_type, action_value, priority, enabled, created_at, updated_at
         FROM ticket_automation_rules WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(rule)) => Json(ApiResponse::success(rule, "自动化规则获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "自动化规则不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取自动化规则失败: {}", e))),
    }
}

pub async fn update_automation_rule_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAutomationRuleRequest>,
) -> Json<ApiResponse<AutomationRule>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let now = Utc::now();
    let result = sqlx::query_as::<_, AutomationRule>(
        r#"UPDATE ticket_automation_rules SET
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
    .fetch_optional(&pool)
    .await;
    match result {
        Ok(Some(rule)) => Json(ApiResponse::success(rule, "自动化规则更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "自动化规则不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新自动化规则失败: {}", e))),
    }
}

pub async fn delete_automation_rule_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match sqlx::query("DELETE FROM ticket_automation_rules WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&pool)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            Json(ApiResponse::success(json!({"deleted": true}), "自动化规则已删除"))
        }
        Ok(_) => Json(ApiResponse::error(404, "自动化规则不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除自动化规则失败: {}", e))),
    }
}


// ==================== Knowledge Base ====================

pub async fn create_knowledge_article_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateKnowledgeArticleRequest>,
) -> Json<ApiResponse<KnowledgeArticle>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let id = Uuid::new_v4();
    let now = Utc::now();
    let keywords = req.keywords.unwrap_or_default();
    let result = sqlx::query_as::<_, KnowledgeArticle>(
        r#"INSERT INTO ticket_knowledge_articles
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
    .fetch_one(&pool)
    .await;
    match result {
        Ok(article) => Json(ApiResponse::success(article, "知识文章创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建知识文章失败: {}", e))),
    }
}

pub async fn list_knowledge_articles_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<Vec<KnowledgeArticle>>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let q = params.get("q").cloned().unwrap_or_default();
    let articles = match sqlx::query_as::<_, KnowledgeArticle>(
        "SELECT id, tenant_id, title, content, category, keywords, created_at, updated_at
         FROM ticket_knowledge_articles WHERE tenant_id = $1 ORDER BY updated_at DESC",
    )
    .bind(tenant_id)
    .fetch_all(&pool)
    .await
    {
        Ok(a) => a,
        Err(e) => return Json(ApiResponse::error(500, &format!("获取知识文章列表失败: {}", e))),
    };
    if q.trim().is_empty() {
        return Json(ApiResponse::success(articles, "知识文章列表获取成功"));
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
    Json(ApiResponse::success(sorted, "知识文章推荐结果"))
}

pub async fn get_knowledge_article_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<KnowledgeArticle>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match sqlx::query_as::<_, KnowledgeArticle>(
        "SELECT id, tenant_id, title, content, category, keywords, created_at, updated_at
         FROM ticket_knowledge_articles WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(a)) => Json(ApiResponse::success(a, "知识文章获取成功")),
        Ok(None) => Json(ApiResponse::error(404, "知识文章不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("获取知识文章失败: {}", e))),
    }
}

pub async fn update_knowledge_article_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateKnowledgeArticleRequest>,
) -> Json<ApiResponse<KnowledgeArticle>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    let now = Utc::now();
    let result = sqlx::query_as::<_, KnowledgeArticle>(
        r#"UPDATE ticket_knowledge_articles SET
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
    .fetch_optional(&pool)
    .await;
    match result {
        Ok(Some(a)) => Json(ApiResponse::success(a, "知识文章更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "知识文章不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新知识文章失败: {}", e))),
    }
}

pub async fn delete_knowledge_article_handler(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id =
        Uuid::parse_str(claims.tenant_id.as_deref().unwrap_or("")).unwrap_or_else(|_| Uuid::nil());
    match sqlx::query("DELETE FROM ticket_knowledge_articles WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
        .execute(&pool)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            Json(ApiResponse::success(json!({"deleted": true}), "知识文章已删除"))
        }
        Ok(_) => Json(ApiResponse::error(404, "知识文章不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除知识文章失败: {}", e))),
    }
}

// ==================== Routes ====================

pub fn ticket_routes() -> Router<PgPool> {
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
}
