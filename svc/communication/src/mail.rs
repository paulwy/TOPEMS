//! Mail submodule - Email handlers with database support and real mail sending

#![allow(dead_code)]

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
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{
    CreateEmailTemplateRequest, EmailTemplate, SendEmailRequest, SendWithTemplateRequest,
    UpdateEmailTemplateRequest,
};

/// 简化版邮箱地址校验：local@domain，无空格，含 @，域名含点且不以点开头/结尾
pub fn validate_email(addr: &str) -> bool {
    let addr = addr.trim();
    if addr.is_empty() || addr.contains(' ') {
        return false;
    }
    let parts: Vec<&str> = addr.splitn(2, '@').collect();
    if parts.len() != 2 {
        return false;
    }
    let local = parts[0];
    let domain = parts[1];
    if local.is_empty() || domain.is_empty() {
        return false;
    }
    if !domain.contains('.') {
        return false;
    }
    if domain.starts_with('.') || domain.ends_with('.') {
        return false;
    }
    true
}

/// 提取邮箱 @ 之前的部分作为名称；无 @ 时返回去除首尾空白后的原文
pub fn extract_email_name(addr: &str) -> String {
    let addr = addr.trim();
    match addr.split_once('@') {
        Some((name, _)) => name.to_string(),
        None => addr.to_string(),
    }
}

/// 渲染简单模板：将 {{key}} 替换为对应值，缺失的占位符保持原样
pub fn render_template(template: &str, vars: &std::collections::HashMap<String, String>) -> String {
    let mut result = template.to_string();
    for (key, value) in vars {
        let placeholder = format!("{{{{{}}}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

/// 收件人去重（大小写不敏感），保留首次出现的顺序，跳过空白项
pub fn deduplicate_recipients(emails: &[String]) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();
    for email in emails {
        let normalized = email.trim().to_lowercase();
        if !normalized.is_empty() && seen.insert(normalized) {
            result.push(email.clone());
        }
    }
    result
}

/// 校验附件大小是否在允许范围内（size_bytes 与 max_mb 均须为正/非负）
pub fn validate_attachment_size(size_bytes: i64, max_mb: i64) -> bool {
    if size_bytes < 0 || max_mb <= 0 {
        return false;
    }
    match max_mb.checked_mul(1024 * 1024) {
        Some(limit) => size_bytes <= limit,
        None => false,
    }
}

/// 编码邮件主题：纯 ASCII 直接返回，否则按 RFC 2047 包裹为 UTF-8 Base64 编码字
pub fn encode_mail_subject(subject: &str) -> String {
    if subject.is_ascii() {
        return subject.to_string();
    }
    format!("=?UTF-8?B?{}?=", base64_encode(subject.as_bytes()))
}

/// 简易 Base64 编码（无外部依赖）
pub fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in input.chunks(3) {
        let b0 = chunk[0];
        let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };
        let triple = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

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

impl std::fmt::Display for EmailQueueStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmailQueueStatus::Pending => write!(f, "pending"),
            EmailQueueStatus::Sending => write!(f, "sending"),
            EmailQueueStatus::Sent => write!(f, "sent"),
            EmailQueueStatus::Failed => write!(f, "failed"),
        }
    }
}

lazy_static::lazy_static! {
    static ref EMAIL_QUEUE: DashMap<String, QueuedEmail> = DashMap::new();
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["communication:mail:read"])),
    path = "/mail/emails",
    tag = "email",
    responses(
        (status = 200, description = "List of emails", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT id, from_email, to_email, subject, sent_at, is_read
        FROM core_emails
        WHERE to_email IN (SELECT email FROM core_users WHERE id = $1)
           OR from_email IN (SELECT email FROM core_users WHERE id = $1)
        ORDER BY sent_at DESC
        LIMIT 50
        "#
    ))
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["communication:mail:write"])),
    path = "/mail/emails",
    tag = "email",
    request_body = SendEmailRequest,
    responses(
        (status = 200, description = "Email sent", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
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

    let sender_email = match sqlx::query_scalar(only_own_schema_query!(
        "public",
        "SELECT email FROM core_users WHERE id = $1"
    ))
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
                only_own_schema_query!("public", r#"
                INSERT INTO core_emails (id, from_email, to_email, subject, body, html_body, sent_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                "#),
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT e.id, e.from_email, e.to_email, e.subject, e.body, e.html_body, e.sent_at, e.is_read,
               u_from.email as from_user_email, u_to.email as to_user_email
        FROM core_emails e
        LEFT JOIN core_users u_from ON e.from_email = u_from.email
        LEFT JOIN core_users u_to ON e.to_email = u_to.email
        WHERE e.id = $1
          AND (u_from.id = $2 OR u_to.id = $2)
        "#
    ))
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
        let belongs_to_user = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
            "public",
            r#"
            SELECT EXISTS(
                SELECT 1 FROM core_emails e
                LEFT JOIN core_users u_from ON e.from_email = u_from.email
                LEFT JOIN core_users u_to ON e.to_email = u_to.email
                WHERE e.id = $1 AND (u_from.id = $2 OR u_to.id = $2)
            )
            "#
        ))
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

    match sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_emails SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"
    ))
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

    let belongs_to_user = sqlx::query_scalar::<_, bool>(only_own_schema_query!(
        "public",
        r#"
        SELECT EXISTS(
            SELECT 1 FROM core_emails e
            JOIN core_users u_to ON e.to_email = u_to.email
            WHERE e.id = $1 AND u_to.id = $2
        )
        "#
    ))
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

    match sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_emails SET is_read = TRUE, read_at = NOW() WHERE id = $1"
    ))
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT id, name, subject_template, body_template, description, created_at, updated_at
        FROM core_email_templates
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        "#
    ))
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
        only_own_schema_query!("public", r#"
        INSERT INTO core_email_templates (id, name, subject_template, body_template, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, name, subject_template, body_template, description, created_at, updated_at
        "#),
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT id, name, subject_template, body_template, description, created_at, updated_at
        FROM core_email_templates
        WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        UPDATE core_email_templates
        SET name = COALESCE($1, name),
            subject_template = COALESCE($2, subject_template),
            body_template = COALESCE($3, body_template),
            description = COALESCE($4, description),
            updated_at = NOW()
        WHERE id = $5 AND deleted_at IS NULL
        RETURNING id, name, subject_template, body_template, description, created_at, updated_at
        "#
    ))
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

    match sqlx::query(only_own_schema_query!(
        "public",
        "UPDATE core_email_templates SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"
    ))
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

    let result = sqlx::query(only_own_schema_query!(
        "public",
        r#"
        SELECT subject_template, body_template
        FROM core_email_templates
        WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
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

pub async fn send_notification_email(to: &str, subject: &str, body: &str) -> Result<(), String> {
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

// ===== 缺口#10: mail stats / send-with-template / resend =====

/// GET /mail/emails/stats
pub async fn get_stats(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("mail get_stats by user: {}", claims.username);
    let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "public",
        "SELECT COUNT(*) FROM core_emails WHERE deleted_at IS NULL"
    ))
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let sent_count = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "public",
        "SELECT COUNT(*) FROM core_emails WHERE sent_at IS NOT NULL AND deleted_at IS NULL"
    ))
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let pending_count = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "public",
        "SELECT COUNT(*) FROM core_emails WHERE sent_at IS NULL AND deleted_at IS NULL"
    ))
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let today_count = sqlx::query_scalar::<_, i64>(only_own_schema_query!("public",
        "SELECT COUNT(*) FROM core_emails WHERE sent_at::date = CURRENT_DATE AND deleted_at IS NULL"))
        .fetch_one(&pool).await.unwrap_or(0);
    let last_sent_at: Option<chrono::DateTime<chrono::Utc>> =
        sqlx::query_scalar(only_own_schema_query!(
            "public",
            "SELECT MAX(sent_at) FROM core_emails WHERE sent_at IS NOT NULL AND deleted_at IS NULL"
        ))
        .fetch_optional(&pool)
        .await
        .unwrap_or(None);
    Json(serde_json::json!({
        "success": true, "message": "ok", "code": 200,
        "data": { "total": total, "sent_count": sent_count, "failed_count": 0,
            "pending_count": pending_count, "today_count": today_count, "last_sent_at": last_sent_at }
    }))
}

/// POST /mail/emails/send-with-template
pub async fn send_with_template_by_code(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "mail send_with_template_by_code by user: {}",
        claims.username
    );
    let template_code = match payload.get("template_code").and_then(|v| v.as_str()) {
        Some(c) => c.to_string(),
        None => {
            return Json(
                serde_json::json!({"success":false,"message":"缺少 template_code","data":null,"code":400}),
            )
        }
    };
    let to_addresses: Vec<String> = payload
        .get("to_addresses")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    if to_addresses.is_empty() {
        return Json(
            serde_json::json!({"success":false,"message":"收件人不能为空","data":null,"code":400}),
        );
    }
    let cc_addresses: Option<Vec<String>> = payload
        .get("cc_addresses")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        });
    let bcc_addresses: Option<Vec<String>> = payload
        .get("bcc_addresses")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        });
    let template_data = payload
        .get("template_data")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    let result = sqlx::query(only_own_schema_query!("public",
        "SELECT subject_template, body_template FROM core_email_templates WHERE name = $1 AND deleted_at IS NULL LIMIT 1"))
        .bind(&template_code).fetch_optional(&pool).await;
    let (subject_template, body_template) = match result {
        Ok(Some(row)) => (
            row.get::<String, _>("subject_template"),
            row.get::<String, _>("body_template"),
        ),
        Ok(None) => {
            return Json(
                serde_json::json!({"success":false,"message":format!("模板 '{}' 不存在",template_code),"data":null,"code":404}),
            )
        }
        Err(e) => {
            return Json(
                serde_json::json!({"success":false,"message":format!("查询模板失败: {}",e),"data":null,"code":500}),
            )
        }
    };
    let hb = Handlebars::new();
    let subject = hb
        .render_template(&subject_template, &template_data)
        .unwrap_or_else(|_| subject_template.clone());
    let body = hb
        .render_template(&body_template, &template_data)
        .unwrap_or_else(|_| body_template);
    let to = to_addresses.join(",");
    match send_email_with_lettre(
        "system@topems.io",
        &to,
        &subject,
        &body,
        None,
        cc_addresses.as_ref(),
        bcc_addresses.as_ref(),
    ) {
        Ok(_) => {
            let email_id = Uuid::new_v4();
            let _ = sqlx::query(only_own_schema_query!("public",
                "INSERT INTO core_emails (id, from_email, to_email, subject, body, sent_at) VALUES ($1,$2,$3,$4,$5,NOW())"))
                .bind(email_id).bind("system@topems.io").bind(&to).bind(&subject).bind(&body).execute(&pool).await;
            Json(
                serde_json::json!({"success":true,"message":"模板邮件发送成功","code":200,
                "data":{"id":email_id.to_string(),"to":to,"subject":subject}}),
            )
        }
        Err(e) => Json(
            serde_json::json!({"success":false,"message":format!("发送失败: {}",e),"data":null,"code":500}),
        ),
    }
}

/// POST /mail/emails/resend
pub async fn resend_emails(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("mail resend_emails by user: {}", claims.username);
    let email_ids: Vec<String> = payload
        .get("email_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    if email_ids.is_empty() {
        return Json(
            serde_json::json!({"success":false,"message":"email_ids 不能为空","data":null,"code":400}),
        );
    }
    let mut success = 0i64;
    let mut failed = 0i64;
    let mut failed_ids: Vec<String> = Vec::new();
    for id_str in &email_ids {
        let email_id = match Uuid::parse_str(id_str) {
            Ok(id) => id,
            Err(_) => {
                failed += 1;
                failed_ids.push(id_str.clone());
                continue;
            }
        };
        match sqlx::query(only_own_schema_query!("public",
            "SELECT from_email, to_email, subject, body FROM core_emails WHERE id = $1 AND deleted_at IS NULL"))
            .bind(email_id).fetch_optional(&pool).await
        {
            Ok(Some(row)) => {
                let from_email = row.get::<String,_>("from_email");
                let to_email = row.get::<String,_>("to_email");
                let subject = row.get::<String,_>("subject");
                let body = row.get::<String,_>("body");
                match send_email_with_lettre(&from_email, &to_email, &subject, &body, None, None, None) {
                    Ok(_) => {
                        success += 1;
                        let _ = sqlx::query(only_own_schema_query!("public","UPDATE core_emails SET sent_at = NOW() WHERE id = $1"))
                            .bind(email_id).execute(&pool).await;
                    }
                    Err(_) => { failed += 1; failed_ids.push(id_str.clone()); }
                }
            }
            _ => { failed += 1; failed_ids.push(id_str.clone()); }
        }
    }
    Json(
        serde_json::json!({"success":true,"message":"重发完成","code":200,
        "data":{"total":email_ids.len(),"success":success,"failed":failed,"failed_ids":failed_ids}}),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_validate_email_valid() {
        assert!(validate_email("user@example.com"));
        assert!(validate_email("a.b@c.d.io"));
    }

    #[test]
    fn test_validate_email_missing_at() {
        assert!(!validate_email("userexample.com"));
    }

    #[test]
    fn test_validate_email_empty() {
        assert!(!validate_email(""));
        assert!(!validate_email("   "));
    }

    #[test]
    fn test_validate_email_has_space() {
        assert!(!validate_email("user @example.com"));
    }

    #[test]
    fn test_validate_email_no_dot_in_domain() {
        assert!(!validate_email("user@localhost"));
    }

    #[test]
    fn test_validate_email_empty_local_or_domain() {
        assert!(!validate_email("@example.com"));
        assert!(!validate_email("user@"));
    }

    #[test]
    fn test_validate_email_domain_dot_edges() {
        assert!(!validate_email("user@.com"));
        assert!(!validate_email("user@example.com."));
    }

    #[test]
    fn test_extract_email_name_normal() {
        assert_eq!(extract_email_name("user@example.com"), "user");
    }

    #[test]
    fn test_extract_email_name_no_at() {
        assert_eq!(extract_email_name("plainstring"), "plainstring");
    }

    #[test]
    fn test_extract_email_name_empty() {
        assert_eq!(extract_email_name(""), "");
    }

    #[test]
    fn test_extract_email_name_trimmed() {
        assert_eq!(extract_email_name("  user@example.com  "), "user");
    }

    #[test]
    fn test_extract_email_name_multiple_at() {
        assert_eq!(extract_email_name("a@b@example.com"), "a");
    }

    #[test]
    fn test_render_template_basic() {
        let mut vars = HashMap::new();
        vars.insert("name".to_string(), "Alice".to_string());
        assert_eq!(render_template("Hello {{name}}!", &vars), "Hello Alice!");
    }

    #[test]
    fn test_render_template_multiple_vars() {
        let mut vars = HashMap::new();
        vars.insert("first".to_string(), "A".to_string());
        vars.insert("second".to_string(), "B".to_string());
        assert_eq!(render_template("{{first}}-{{second}}", &vars), "A-B");
    }

    #[test]
    fn test_render_template_missing_var_left_as_is() {
        let vars = HashMap::new();
        assert_eq!(render_template("Hello {{name}}", &vars), "Hello {{name}}");
    }

    #[test]
    fn test_render_template_no_placeholders() {
        let vars = HashMap::new();
        assert_eq!(render_template("plain text", &vars), "plain text");
    }

    #[test]
    fn test_render_template_empty_template() {
        let vars = HashMap::new();
        assert_eq!(render_template("", &vars), "");
    }

    #[test]
    fn test_deduplicate_recipients_basic() {
        let input = vec![
            "a@x.com".to_string(),
            "b@x.com".to_string(),
            "a@x.com".to_string(),
        ];
        assert_eq!(
            deduplicate_recipients(&input),
            vec!["a@x.com".to_string(), "b@x.com".to_string()]
        );
    }

    #[test]
    fn test_deduplicate_recipients_case_insensitive() {
        let input = vec!["A@X.com".to_string(), "a@x.com".to_string()];
        assert_eq!(deduplicate_recipients(&input), vec!["A@X.com".to_string()]);
    }

    #[test]
    fn test_deduplicate_recipients_empty() {
        assert!(deduplicate_recipients(&[]).is_empty());
    }

    #[test]
    fn test_deduplicate_recipients_skips_empty_strings() {
        let input = vec!["".to_string(), "  ".to_string(), "a@x.com".to_string()];
        assert_eq!(deduplicate_recipients(&input), vec!["a@x.com".to_string()]);
    }

    #[test]
    fn test_deduplicate_recipients_preserves_order() {
        let input = vec![
            "b@x.com".to_string(),
            "a@x.com".to_string(),
            "b@x.com".to_string(),
            "c@x.com".to_string(),
        ];
        assert_eq!(
            deduplicate_recipients(&input),
            vec![
                "b@x.com".to_string(),
                "a@x.com".to_string(),
                "c@x.com".to_string()
            ]
        );
    }

    #[test]
    fn test_validate_attachment_size_valid() {
        assert!(validate_attachment_size(0, 10));
        assert!(validate_attachment_size(10 * 1024 * 1024, 10));
    }

    #[test]
    fn test_validate_attachment_size_too_large() {
        assert!(!validate_attachment_size(10 * 1024 * 1024 + 1, 10));
    }

    #[test]
    fn test_validate_attachment_size_negative_size() {
        assert!(!validate_attachment_size(-1, 10));
    }

    #[test]
    fn test_validate_attachment_size_zero_max() {
        assert!(!validate_attachment_size(1, 0));
    }

    #[test]
    fn test_validate_attachment_size_negative_max() {
        assert!(!validate_attachment_size(100, -5));
    }

    #[test]
    fn test_validate_attachment_size_exact_boundary() {
        assert!(validate_attachment_size(5 * 1024 * 1024, 5));
    }

    #[test]
    fn test_encode_mail_subject_ascii() {
        assert_eq!(encode_mail_subject("Hello World"), "Hello World");
    }

    #[test]
    fn test_encode_mail_subject_non_ascii() {
        let encoded = encode_mail_subject("你好");
        assert!(encoded.starts_with("=?UTF-8?B?"));
        assert!(encoded.ends_with("?="));
    }

    #[test]
    fn test_encode_mail_subject_empty() {
        assert_eq!(encode_mail_subject(""), "");
    }

    #[test]
    fn test_encode_mail_subject_mixed() {
        let encoded = encode_mail_subject("Hello 世界");
        assert!(encoded.starts_with("=?UTF-8?B?"));
        assert!(encoded.ends_with("?="));
    }

    #[test]
    fn test_encode_mail_subject_roundtrip_ascii_section() {
        let encoded = encode_mail_subject("plain ascii 123");
        assert_eq!(encoded, "plain ascii 123");
    }

    #[test]
    fn test_base64_encode_empty() {
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn test_base64_encode_known_values() {
        assert_eq!(base64_encode(b"Hello"), "SGVsbG8=");
        assert_eq!(base64_encode(b"Hi"), "SGk=");
        assert_eq!(base64_encode(b"abc"), "YWJj");
    }

    #[test]
    fn test_base64_encode_padding() {
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
    }

    #[test]
    fn test_base64_encode_consistent_with_subject() {
        let subject = "测试";
        let encoded = encode_mail_subject(subject);
        let expected_inner = base64_encode(subject.as_bytes());
        assert_eq!(encoded, format!("=?UTF-8?B?{}?=", expected_inner));
    }

    // ===== EmailQueueStatus / 队列 / mailer / handlebars 测试 =====

    #[test]
    fn test_email_queue_status_to_string_all_variants() {
        assert_eq!(EmailQueueStatus::Pending.to_string(), "pending");
        assert_eq!(EmailQueueStatus::Sending.to_string(), "sending");
        assert_eq!(EmailQueueStatus::Sent.to_string(), "sent");
        assert_eq!(EmailQueueStatus::Failed.to_string(), "failed");
    }

    #[test]
    fn test_email_queue_status_eq() {
        assert_eq!(EmailQueueStatus::Pending, EmailQueueStatus::Pending);
        assert_ne!(EmailQueueStatus::Sent, EmailQueueStatus::Failed);
    }

    #[test]
    fn test_queued_email_clone_and_debug() {
        let q = QueuedEmail {
            id: "qid".to_string(),
            from: "a@b.com".to_string(),
            to: "c@d.com".to_string(),
            subject: "s".to_string(),
            body: "b".to_string(),
            html_body: None,
            cc: None,
            bcc: None,
            attempts: 0,
            max_attempts: 3,
            created_at: chrono::Utc::now(),
            status: EmailQueueStatus::Pending,
        };
        let cloned = q.clone();
        assert_eq!(cloned.id, "qid");
        assert_eq!(cloned.status, EmailQueueStatus::Pending);
        let dbg = format!("{:?}", q);
        assert!(dbg.contains("QueuedEmail"));
    }

    #[tokio::test]
    async fn test_queue_email_returns_id_and_stats_has_keys() {
        let id = queue_email(
            "from@x.com".to_string(),
            "to@x.com".to_string(),
            "subject".to_string(),
            "body".to_string(),
            None,
            None,
            None,
        );
        assert!(!id.is_empty());
        // 队列中应能查到该条目
        let status = get_queue_status(&id);
        assert!(status.is_some());
        let stats = get_queue_stats();
        assert!(stats["total"].as_u64().is_some());
        assert!(stats["pending"].as_u64().is_some());
        assert!(stats["sent"].as_u64().is_some());
    }

    #[test]
    fn test_get_queue_status_unknown_returns_none() {
        assert!(get_queue_status("nonexistent-id-xyz").is_none());
    }

    #[test]
    fn test_get_queue_stats_structure() {
        let stats = get_queue_stats();
        // 确保所有键存在
        for key in ["pending", "sending", "sent", "failed", "total"] {
            assert!(stats.get(key).is_some(), "missing key {}", key);
        }
    }

    #[test]
    fn test_build_message_valid_addresses() {
        let msg = build_message(
            "from@example.com",
            "to@example.com",
            "Subject",
            "Body text",
            None,
            None,
            None,
        );
        assert!(msg.is_ok());
        let m = msg.unwrap();
        // lettre Message 可格式化为字节流，确保含 Subject 头
        let formatted = m.formatted();
        let as_str = String::from_utf8_lossy(&formatted);
        assert!(as_str.contains("Subject"));
    }

    #[test]
    fn test_build_message_with_cc_and_bcc() {
        let cc = vec!["cc1@x.com".to_string(), "cc2@x.com".to_string()];
        let bcc = vec!["bcc@x.com".to_string()];
        let msg = build_message(
            "from@example.com",
            "to@example.com",
            "S",
            "B",
            Some("<b>html</b>"),
            Some(&cc),
            Some(&bcc),
        );
        assert!(msg.is_ok());
    }

    #[test]
    fn test_build_message_invalid_from_returns_err() {
        let msg = build_message("not-an-email", "to@example.com", "S", "B", None, None, None);
        assert!(msg.is_err());
        assert!(msg.unwrap_err().contains("Invalid from email"));
    }

    #[test]
    fn test_build_message_invalid_to_returns_err() {
        let msg = build_message("from@example.com", "bad-to", "S", "B", None, None, None);
        assert!(msg.is_err());
        assert!(msg.unwrap_err().contains("Invalid to email"));
    }

    #[test]
    fn test_build_message_invalid_cc_returns_err() {
        let cc = vec!["bad-cc".to_string()];
        let msg = build_message(
            "from@example.com",
            "to@example.com",
            "S",
            "B",
            None,
            Some(&cc),
            None,
        );
        assert!(msg.is_err());
    }

    // env var 测试用静态 Mutex 串行化，避免并行污染
    static ENV_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[test]
    fn test_create_mailer_localhost_without_password_ok() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("SMTP_HOST", "localhost");
        std::env::set_var("SMTP_PORT", "2525");
        std::env::remove_var("SMTP_PASSWORD");
        std::env::set_var("SMTP_TLS", "none");
        let result = create_mailer();
        assert!(result.is_ok(), "localhost 模式应允许无密码");
        let _ = std::env::var("SMTP_HOST"); // 触发使用
    }

    #[test]
    fn test_create_mailer_remote_without_password_err() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("SMTP_HOST", "smtp.remote.example");
        std::env::set_var("SMTP_PORT", "587");
        std::env::remove_var("SMTP_PASSWORD");
        let result = create_mailer();
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("SMTP_PASSWORD"));
    }

    #[test]
    fn test_create_mailer_remote_with_password_ok() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("SMTP_HOST", "smtp.remote.example");
        std::env::set_var("SMTP_PORT", "465");
        std::env::set_var("SMTP_PASSWORD", "secret");
        std::env::set_var("SMTP_TLS", "tls");
        let result = create_mailer();
        assert!(result.is_ok());
        std::env::remove_var("SMTP_PASSWORD");
    }

    #[test]
    fn test_create_mailer_invalid_port_falls_back() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("SMTP_HOST", "localhost");
        std::env::set_var("SMTP_PORT", "not-a-number");
        std::env::remove_var("SMTP_PASSWORD");
        std::env::set_var("SMTP_TLS", "starttls");
        // 端口非法 → 回退 587，localhost 模式应成功
        let result = create_mailer();
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_email_with_lettre_localhost_preview() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("SMTP_HOST", "localhost");
        std::env::set_var("SMTP_PORT", "587");
        // localhost + 587 → 预览模式，直接返回 Ok
        let result = send_email_with_lettre(
            "from@example.com",
            "to@example.com",
            "Preview Subject",
            "Preview Body",
            None,
            None,
            None,
        );
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[allow(clippy::await_holding_lock)]
    async fn test_send_notification_email_localhost_preview() {
        let _guard = ENV_LOCK.lock().unwrap();
        std::env::set_var("SMTP_HOST", "localhost");
        std::env::set_var("SMTP_PORT", "587");
        let result = send_notification_email("to@example.com", "subj", "body").await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_handlebars_render_template_success() {
        use handlebars::Handlebars;
        let hb = Handlebars::new();
        let tmpl = "Hello {{name}}, you have {{count}} messages";
        let vars = serde_json::json!({"name": "Alice", "count": 3});
        let rendered = hb.render_template(tmpl, &vars).unwrap();
        assert_eq!(rendered, "Hello Alice, you have 3 messages");
    }

    #[test]
    fn test_handlebars_render_template_missing_var_leaves_empty() {
        use handlebars::Handlebars;
        let hb = Handlebars::new();
        let tmpl = "Hello {{name}}";
        let vars = serde_json::json!({});
        // handlebars 默认对缺失变量渲染为空字符串
        let rendered = hb.render_template(tmpl, &vars).unwrap();
        assert_eq!(rendered, "Hello ");
    }

    #[test]
    fn test_handlebars_render_template_invalid_syntax_err() {
        use handlebars::Handlebars;
        let hb = Handlebars::new();
        let tmpl = "Hello {{#if name}}"; // 未闭合块
        let vars = serde_json::json!({"name": "x"});
        assert!(hb.render_template(tmpl, &vars).is_err());
    }
}
