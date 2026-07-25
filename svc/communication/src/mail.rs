//! Mail submodule - Email handlers with database support and real mail sending

use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use dashmap::DashMap;
use handlebars::Handlebars;
use lettre::{
    message::{Mailbox, Message},
    transport::smtp::{
        authentication::Credentials, client::Tls, client::TlsParameters, SmtpTransport,
    },
    Transport,
};
use sqlx::{PgPool, Row};
use topems_shared::auth::Claims;
use uuid::Uuid;

use crate::models::{
    CreateEmailTemplateRequest, EmailTemplate, SendEmailRequest, SendWithTemplateRequest,
    UpdateEmailTemplateRequest,
};

#[derive(Debug, Clone)]
pub struct QueuedEmail {
    pub id: String,
    pub from: String,
    pub to: String,
    pub subject: String,
    pub body: String,
    pub html_body: Option<String>,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
    pub attempts: usize,
    pub max_attempts: usize,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub status: EmailQueueStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EmailQueueStatus {
    Pending,
    Sending,
    Sent,
    Failed,
}

impl ToString for EmailQueueStatus {
    fn to_string(&self) -> String {
        match self {
            EmailQueueStatus::Pending => "pending".to_string(),
            EmailQueueStatus::Sending => "sending".to_string(),
            EmailQueueStatus::Sent => "sent".to_string(),
            EmailQueueStatus::Failed => "failed".to_string(),
        }
    }
}

lazy_static::lazy_static! {
    static ref EMAIL_QUEUE: DashMap<String, QueuedEmail> = DashMap::new();
}

pub async fn list_emails(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail list_emails called for user: {}",
        claims.username
    );

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        SELECT id, from_email, to_email, subject, sent_at, is_read
        FROM core_emails
        WHERE to_email IN (SELECT email FROM core_users WHERE id = $1)
           OR from_email IN (SELECT email FROM core_users WHERE id = $1)
        ORDER BY sent_at DESC
        LIMIT 50
        "#,
    )
    .bind(user_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let emails: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id").to_string(),
                        "from_email": row.get::<String, _>("from_email"),
                        "to_email": row.get::<String, _>("to_email"),
                        "subject": row.get::<String, _>("subject"),
                        "sent_at": row.get::<chrono::DateTime<chrono::Utc>, _>("sent_at"),
                        "is_read": row.get::<bool, _>("is_read"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "list_emails success",
                "data": emails
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list emails: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("Failed to list emails: {}", e),
                "data": []
            }))
        }
    }
}

pub async fn send_email(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SendEmailRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail send_email called with: {:?} by user: {}",
        payload,
        claims.username
    );

    if payload.to.is_empty() || payload.subject.is_empty() || payload.body.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "message": "收件人、主题和正文不能为空",
            "data": null,
            "code": 400
        }));
    }

    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限发送邮件",
            "data": null,
            "code": 403
        }));
    }

    let sender_email = match sqlx::query_scalar("SELECT email FROM core_users WHERE id = $1")
        .bind(Uuid::parse_str(&claims.sub).unwrap_or_default())
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(email)) => email,
        Ok(None) => "system@topems.io".to_string(),
        Err(e) => {
            tracing::error!("Failed to get sender email: {}", e);
            "system@topems.io".to_string()
        }
    };

    let result = send_email_with_lettre(
        &sender_email,
        &payload.to,
        &payload.subject,
        &payload.body,
        payload.html_body.as_deref(),
        payload.cc.as_ref(),
        payload.bcc.as_ref(),
    );

    match result {
        Ok(_) => {
            let email_id = Uuid::new_v4();
            let _ = sqlx::query(
                r#"
                INSERT INTO core_emails (id, from_email, to_email, subject, body, html_body, sent_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                "#,
            )
            .bind(email_id)
            .bind(&sender_email)
            .bind(&payload.to)
            .bind(&payload.subject)
            .bind(&payload.body)
            .bind(&payload.html_body)
            .execute(&pool)
            .await;

            Json(serde_json::json!({
                "success": true,
                "message": "邮件发送成功",
                "data": {
                    "email_id": email_id.to_string(),
                    "to": payload.to,
                    "subject": payload.subject
                },
                "code": 0
            }))
        }
        Err(e) => {
            tracing::error!("Failed to send email: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("邮件发送失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn get_email(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail get_email called with id: {} for user: {}",
        id,
        claims.username
    );

    let email_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid email ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的邮件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        SELECT e.id, e.from_email, e.to_email, e.subject, e.body, e.html_body, e.sent_at, e.is_read,
               u_from.email as from_user_email, u_to.email as to_user_email
        FROM core_emails e
        LEFT JOIN core_users u_from ON e.from_email = u_from.email
        LEFT JOIN core_users u_to ON e.to_email = u_to.email
        WHERE e.id = $1
          AND (u_from.id = $2 OR u_to.id = $2)
        "#,
    )
    .bind(email_id)
    .bind(user_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "get_email success",
            "data": {
                "id": row.get::<Uuid, _>("id").to_string(),
                "from_email": row.get::<String, _>("from_email"),
                "to_email": row.get::<String, _>("to_email"),
                "subject": row.get::<String, _>("subject"),
                "body": row.get::<String, _>("body"),
                "html_body": row.get::<Option<String>, _>("html_body"),
                "sent_at": row.get::<chrono::DateTime<chrono::Utc>, _>("sent_at"),
                "is_read": row.get::<bool, _>("is_read"),
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "邮件不存在或没有权限查看",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to get email: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取邮件失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn delete_email(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail delete_email called with id: {} for user: {}",
        id,
        claims.username
    );

    let email_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid email ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的邮件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        let belongs_to_user = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM core_emails e
                LEFT JOIN core_users u_from ON e.from_email = u_from.email
                LEFT JOIN core_users u_to ON e.to_email = u_to.email
                WHERE e.id = $1 AND (u_from.id = $2 OR u_to.id = $2)
            )
            "#,
        )
        .bind(email_id)
        .bind(user_id)
        .fetch_one(&pool)
        .await
        .unwrap_or(false);

        if !belongs_to_user {
            return Json(serde_json::json!({
                "success": false,
                "message": "没有权限删除此邮件",
                "data": null,
                "code": 403
            }));
        }
    }

    match sqlx::query("UPDATE core_emails SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1")
        .bind(email_id)
        .execute(&pool)
        .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "邮件删除成功",
            "data": null,
            "code": 0
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "邮件不存在",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to delete email: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("邮件删除失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn mark_as_read(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail mark_as_read called with id: {} for user: {}",
        id,
        claims.username
    );

    let email_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid email ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的邮件ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let belongs_to_user = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM core_emails e
            JOIN core_users u_to ON e.to_email = u_to.email
            WHERE e.id = $1 AND u_to.id = $2
        )
        "#,
    )
    .bind(email_id)
    .bind(user_id)
    .fetch_one(&pool)
    .await
    .unwrap_or(false);

    if !belongs_to_user {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限标记此邮件",
            "data": null,
            "code": 403
        }));
    }

    match sqlx::query("UPDATE core_emails SET is_read = TRUE, read_at = NOW() WHERE id = $1")
        .bind(email_id)
        .execute(&pool)
        .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "邮件已标记为已读",
            "data": null,
            "code": 0
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "邮件不存在",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to mark email as read: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("标记邮件失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn list_templates(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail list_templates called for user: {}",
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:read") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限查看邮件模板",
            "data": null,
            "code": 403
        }));
    }

    let result = sqlx::query(
        r#"
        SELECT id, name, subject_template, body_template, description, created_at, updated_at
        FROM core_email_templates
        WHERE is_deleted = FALSE
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let templates: Vec<EmailTemplate> = rows
                .into_iter()
                .map(|row| EmailTemplate {
                    id: row.get::<Uuid, _>("id").to_string(),
                    name: row.get::<String, _>("name"),
                    subject_template: row.get::<String, _>("subject_template"),
                    body_template: row.get::<String, _>("body_template"),
                    description: row.get::<Option<String>, _>("description"),
                    created_at: row
                        .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .to_rfc3339(),
                    updated_at: row
                        .get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
                        .to_rfc3339(),
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "list_templates success",
                "data": templates
            }))
        }
        Err(e) => {
            tracing::error!("Failed to list templates: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取模板列表失败: {}", e),
                "data": []
            }))
        }
    }
}

pub async fn create_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateEmailTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail create_template called with: {:?} by user: {}",
        payload,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限创建邮件模板",
            "data": null,
            "code": 403
        }));
    }

    if payload.name.is_empty()
        || payload.subject_template.is_empty()
        || payload.body_template.is_empty()
    {
        return Json(serde_json::json!({
            "success": false,
            "message": "模板名称、主题模板和正文模板不能为空",
            "data": null,
            "code": 400
        }));
    }

    let id = Uuid::new_v4();
    let result = sqlx::query(
        r#"
        INSERT INTO core_email_templates (id, name, subject_template, body_template, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, name, subject_template, body_template, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.subject_template)
    .bind(&payload.body_template)
    .bind(&payload.description)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => Json(serde_json::json!({
            "success": true,
            "message": "邮件模板创建成功",
            "data": EmailTemplate {
                id: row.get::<Uuid, _>("id").to_string(),
                name: row.get::<String, _>("name"),
                subject_template: row.get::<String, _>("subject_template"),
                body_template: row.get::<String, _>("body_template"),
                description: row.get::<Option<String>, _>("description"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            },
            "code": 0
        })),
        Err(e) => {
            tracing::error!("Failed to create template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("创建模板失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn get_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail get_template called with id: {} for user: {}",
        id,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:read") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限查看邮件模板",
            "data": null,
            "code": 403
        }));
    }

    let template_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid template ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的模板ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        SELECT id, name, subject_template, body_template, description, created_at, updated_at
        FROM core_email_templates
        WHERE id = $1 AND is_deleted = FALSE
        "#,
    )
    .bind(template_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "get_template success",
            "data": EmailTemplate {
                id: row.get::<Uuid, _>("id").to_string(),
                name: row.get::<String, _>("name"),
                subject_template: row.get::<String, _>("subject_template"),
                body_template: row.get::<String, _>("body_template"),
                description: row.get::<Option<String>, _>("description"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            }
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "模板不存在",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to get template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("获取模板失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn update_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateEmailTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail update_template called with id: {} and payload: {:?} by user: {}",
        id,
        payload,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限更新邮件模板",
            "data": null,
            "code": 403
        }));
    }

    let template_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid template ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的模板ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        UPDATE core_email_templates
        SET name = COALESCE($1, name),
            subject_template = COALESCE($2, subject_template),
            body_template = COALESCE($3, body_template),
            description = COALESCE($4, description),
            updated_at = NOW()
        WHERE id = $5 AND is_deleted = FALSE
        RETURNING id, name, subject_template, body_template, description, created_at, updated_at
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.subject_template)
    .bind(&payload.body_template)
    .bind(&payload.description)
    .bind(template_id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(row)) => Json(serde_json::json!({
            "success": true,
            "message": "邮件模板更新成功",
            "data": EmailTemplate {
                id: row.get::<Uuid, _>("id").to_string(),
                name: row.get::<String, _>("name"),
                subject_template: row.get::<String, _>("subject_template"),
                body_template: row.get::<String, _>("body_template"),
                description: row.get::<Option<String>, _>("description"),
                created_at: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at").to_rfc3339(),
            },
            "code": 0
        })),
        Ok(None) => Json(serde_json::json!({
            "success": false,
            "message": "模板不存在",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to update template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("更新模板失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn delete_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail delete_template called with id: {} for user: {}",
        id,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:admin") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限删除邮件模板",
            "data": null,
            "code": 403
        }));
    }

    let template_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid template ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的模板ID",
                "data": null,
                "code": 400
            }));
        }
    };

    match sqlx::query(
        "UPDATE core_email_templates SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 AND is_deleted = FALSE",
    )
    .bind(template_id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(serde_json::json!({
            "success": true,
            "message": "邮件模板删除成功",
            "data": null,
            "code": 0
        })),
        Ok(_) => Json(serde_json::json!({
            "success": false,
            "message": "模板不存在",
            "data": null,
            "code": 404
        })),
        Err(e) => {
            tracing::error!("Failed to delete template: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": format!("删除模板失败: {}", e),
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn send_with_template(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<SendWithTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "Communication mail send_with_template called with id: {} and payload: {:?} by user: {}",
        id,
        payload,
        claims.username
    );

    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限发送邮件",
            "data": null,
            "code": 403
        }));
    }

    let template_id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid template ID: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的模板ID",
                "data": null,
                "code": 400
            }));
        }
    };

    let result = sqlx::query(
        r#"
        SELECT subject_template, body_template
        FROM core_email_templates
        WHERE id = $1 AND is_deleted = FALSE
        "#,
    )
    .bind(template_id)
    .fetch_optional(&pool)
    .await;

    let (subject_template, body_template) = match result {
        Ok(Some(row)) => (
            row.get::<String, _>("subject_template"),
            row.get::<String, _>("body_template"),
        ),
        Ok(None) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "模板不存在",
                "data": null,
                "code": 404
            }));
        }
        Err(e) => {
            tracing::error!("Failed to get template: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": format!("获取模板失败: {}", e),
                "data": null,
                "code": 500
            }));
        }
    };

    let handlebars = Handlebars::new();
    let subject = handlebars
        .render_template(&subject_template, &payload.variables)
        .unwrap_or_else(|_| subject_template.clone());
    let body = handlebars
        .render_template(&body_template, &payload.variables)
        .unwrap_or_else(|_| body_template);

    let result = send_email_with_lettre(
        "system@topems.io",
        &payload.to,
        &subject,
        &body,
        None,
        payload.cc.as_ref(),
        payload.bcc.as_ref(),
    );

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "使用模板发送邮件成功",
            "data": {
                "to": payload.to,
                "subject": subject
            },
            "code": 0
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("邮件发送失败: {}", e),
            "data": null,
            "code": 500
        })),
    }
}

pub async fn send_notification_email(
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), String> {
    tracing::info!("Sending notification email to: {}", to);

    send_email_with_lettre("system@topems.io", to, subject, body, None, None, None)
}

fn build_message(
    from: &str,
    to: &str,
    subject: &str,
    body: &str,
    html_body: Option<&str>,
    cc: Option<&Vec<String>>,
    bcc: Option<&Vec<String>>,
) -> Result<Message, String> {
    let from_addr = Mailbox::new(
        Some(from.to_string()),
        from.parse()
            .map_err(|e| format!("Invalid from email: {}", e))?,
    );
    let to_addr = Mailbox::new(
        Some(to.to_string()),
        to.parse().map_err(|e| format!("Invalid to email: {}", e))?,
    );

    let mut message_builder = Message::builder()
        .from(from_addr)
        .to(to_addr)
        .subject(subject);

    if let Some(cc_list) = cc {
        for cc_email in cc_list {
            let cc_addr = Mailbox::new(
                Some(cc_email.to_string()),
                cc_email
                    .parse()
                    .map_err(|e| format!("Invalid CC email: {}", e))?,
            );
            message_builder = message_builder.cc(cc_addr);
        }
    }

    if let Some(bcc_list) = bcc {
        for bcc_email in bcc_list {
            let bcc_addr = Mailbox::new(
                Some(bcc_email.to_string()),
                bcc_email
                    .parse()
                    .map_err(|e| format!("Invalid BCC email: {}", e))?,
            );
            message_builder = message_builder.bcc(bcc_addr);
        }
    }

    if let Some(html) = html_body {
        message_builder
            .body(format!("{}\n\n{}", body, html))
            .map_err(|e| format!("Failed to build message: {}", e))
    } else {
        message_builder
            .body(body.to_string())
            .map_err(|e| format!("Failed to build message: {}", e))
    }
}

fn create_mailer() -> Result<SmtpTransport, String> {
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string());
    let smtp_port = std::env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse::<u16>()
        .unwrap_or(587);
    let smtp_user = std::env::var("SMTP_USER").unwrap_or_else(|_| "".to_string());
    // 安全策略：非 localhost 模式下必须显式配置 SMTP_PASSWORD，否则拒绝创建 mailer
    let smtp_password = match std::env::var("SMTP_PASSWORD") {
        Ok(p) => p,
        Err(_) => {
            if smtp_host != "localhost" {
                return Err(
                    "SMTP_PASSWORD 未配置：非 localhost 模式下要求显式配置邮箱密码".to_string(),
                );
            }
            tracing::warn!("SMTP_PASSWORD 未配置 - localhost 模式下邮件发送可能失败");
            String::new()
        }
    };
    let smtp_tls = std::env::var("SMTP_TLS").unwrap_or_else(|_| "starttls".to_string());

    let tls_config = match smtp_tls.as_str() {
        "none" => Tls::None,
        "starttls" => {
            if let Ok(params) = TlsParameters::new(smtp_host.clone()) {
                Tls::Opportunistic(params)
            } else {
                Tls::None
            }
        }
        "tls" => {
            if let Ok(params) = TlsParameters::new(smtp_host.clone()) {
                Tls::Wrapper(params)
            } else {
                Tls::None
            }
        }
        _ => {
            if let Ok(params) = TlsParameters::new(smtp_host.clone()) {
                Tls::Opportunistic(params)
            } else {
                Tls::None
            }
        }
    };

    Ok(SmtpTransport::builder_dangerous(smtp_host)
        .port(smtp_port)
        .tls(tls_config)
        .credentials(Credentials::new(smtp_user, smtp_password))
        .build())
}

fn send_email_with_lettre(
    from: &str,
    to: &str,
    subject: &str,
    body: &str,
    html_body: Option<&str>,
    cc: Option<&Vec<String>>,
    bcc: Option<&Vec<String>>,
) -> Result<(), String> {
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string());
    let smtp_port = std::env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse::<u16>()
        .unwrap_or(587);

    if smtp_host == "localhost" && smtp_port == 587 {
        tracing::info!("=== 邮件预览 ===");
        tracing::info!("发件人: {}", from);
        tracing::info!("收件人: {}", to);
        tracing::info!("主题: {}", subject);
        tracing::info!("正文: {}", body);
        if let Some(cc_list) = cc {
            tracing::info!("抄送: {:?}", cc_list);
        }
        if let Some(bcc_list) = bcc {
            tracing::info!("密送: {:?}", bcc_list);
        }
        tracing::info!("================");
        return Ok(());
    }

    let message = build_message(from, to, subject, body, html_body, cc, bcc)?;
    let max_retries = std::env::var("SMTP_MAX_RETRIES")
        .unwrap_or_else(|_| "3".to_string())
        .parse::<usize>()
        .unwrap_or(3);
    let retry_delay_ms = std::env::var("SMTP_RETRY_DELAY_MS")
        .unwrap_or_else(|_| "2000".to_string())
        .parse::<u64>()
        .unwrap_or(2000);

    for attempt in 1..=max_retries {
        let mailer = create_mailer()?;
        match mailer.send(&message) {
            Ok(_) => {
                tracing::info!(
                    "Email sent successfully to: {} (attempt {}/{})",
                    to,
                    attempt,
                    max_retries
                );
                return Ok(());
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to send email to {} (attempt {}/{}): {}",
                    to,
                    attempt,
                    max_retries,
                    e
                );
                if attempt < max_retries {
                    std::thread::sleep(std::time::Duration::from_millis(
                        retry_delay_ms * attempt as u64,
                    ));
                } else {
                    tracing::error!("Failed to send email after {} attempts: {}", max_retries, e);
                    return Err(format!(
                        "Failed to send email after {} attempts: {}",
                        max_retries, e
                    ));
                }
            }
        }
    }

    Err("Max retries exceeded".to_string())
}

pub fn send_email_async(
    from: String,
    to: String,
    subject: String,
    body: String,
    html_body: Option<String>,
    cc: Option<Vec<String>>,
    bcc: Option<Vec<String>>,
) {
    tokio::spawn(async move {
        match send_email_with_lettre(
            &from,
            &to,
            &subject,
            &body,
            html_body.as_deref(),
            cc.as_ref(),
            bcc.as_ref(),
        ) {
            Ok(_) => tracing::info!("Async email sent successfully to: {}", to),
            Err(e) => tracing::error!("Async email sending failed: {}", e),
        }
    });
}

pub fn queue_email(
    from: String,
    to: String,
    subject: String,
    body: String,
    html_body: Option<String>,
    cc: Option<Vec<String>>,
    bcc: Option<Vec<String>>,
) -> String {
    let id = Uuid::new_v4().to_string();
    let queued_email = QueuedEmail {
        id: id.clone(),
        from,
        to,
        subject,
        body,
        html_body,
        cc,
        bcc,
        attempts: 0,
        max_attempts: 3,
        created_at: chrono::Utc::now(),
        status: EmailQueueStatus::Pending,
    };

    EMAIL_QUEUE.insert(id.clone(), queued_email);
    tracing::info!("Email queued: {}", id);

    process_queue();

    id
}

pub fn process_queue() {
    tokio::spawn(async move {
        let pending_emails: Vec<(String, QueuedEmail)> = EMAIL_QUEUE
            .iter()
            .filter(|entry| entry.status == EmailQueueStatus::Pending)
            .map(|entry| (entry.id.clone(), entry.clone()))
            .collect();

        for (id, mut email) in pending_emails {
            if let Some(mut entry) = EMAIL_QUEUE.get_mut(&id) {
                entry.status = EmailQueueStatus::Sending;
                entry.attempts += 1;
            }

            email.attempts += 1;
            email.status = EmailQueueStatus::Sending;

            match send_email_with_lettre(
                &email.from,
                &email.to,
                &email.subject,
                &email.body,
                email.html_body.as_deref(),
                email.cc.as_ref(),
                email.bcc.as_ref(),
            ) {
                Ok(_) => {
                    if let Some(mut entry) = EMAIL_QUEUE.get_mut(&id) {
                        entry.status = EmailQueueStatus::Sent;
                    }
                    tracing::info!("Email queued {} sent successfully", id);
                }
                Err(e) => {
                    if let Some(mut entry) = EMAIL_QUEUE.get_mut(&id) {
                        if entry.attempts >= entry.max_attempts {
                            entry.status = EmailQueueStatus::Failed;
                            tracing::error!(
                                "Email queued {} failed after {} attempts: {}",
                                id,
                                entry.attempts,
                                e
                            );
                        } else {
                            entry.status = EmailQueueStatus::Pending;
                            tracing::warn!(
                                "Email queued {} failed attempt {}/{}: {}",
                                id,
                                entry.attempts,
                                entry.max_attempts,
                                e
                            );
                        }
                    }
                }
            }
        }
    });
}

pub fn get_queue_status(id: &str) -> Option<EmailQueueStatus> {
    EMAIL_QUEUE.get(id).map(|entry| entry.status.clone())
}

pub fn get_queue_stats() -> serde_json::Value {
    let pending = EMAIL_QUEUE
        .iter()
        .filter(|e| e.status == EmailQueueStatus::Pending)
        .count();
    let sending = EMAIL_QUEUE
        .iter()
        .filter(|e| e.status == EmailQueueStatus::Sending)
        .count();
    let sent = EMAIL_QUEUE
        .iter()
        .filter(|e| e.status == EmailQueueStatus::Sent)
        .count();
    let failed = EMAIL_QUEUE
        .iter()
        .filter(|e| e.status == EmailQueueStatus::Failed)
        .count();

    serde_json::json!({
        "pending": pending,
        "sending": sending,
        "sent": sent,
        "failed": failed,
        "total": EMAIL_QUEUE.len()
    })
}
