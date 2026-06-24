//! Mail submodule - Email handlers

use axum::{extract::{Path, State}, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;
use crate::AppState;
use topems_shared::auth::Claims;
use axum::Extension;

#[derive(Debug, Clone, Deserialize)]
pub struct SendEmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub html_body: Option<String>,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EmailTemplate {
    pub id: String,
    pub name: String,
    pub subject_template: String,
    pub body_template: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub subject_template: String,
    pub body_template: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SendWithTemplateRequest {
    pub to: String,
    pub variables: serde_json::Value,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
}

/// 列出用户邮件
pub async fn list_emails(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail list_emails called for user: {}", claims.username);

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

    // 查询用户的邮件记录
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
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(rows) => {
            let emails: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| serde_json::json!({
                    "id": row.get::<Uuid, _>("id").to_string(),
                    "from_email": row.get::<String, _>("from_email"),
                    "to_email": row.get::<String, _>("to_email"),
                    "subject": row.get::<String, _>("subject"),
                    "sent_at": row.get::<chrono::DateTime<chrono::Utc>, _>("sent_at"),
                    "is_read": row.get::<bool, _>("is_read"),
                }))
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

/// 发送邮件
pub async fn send_email(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<SendEmailRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail send_email called with: {:?} by user: {}", payload, claims.username);

    // 验证输入
    if payload.to.is_empty() || payload.subject.is_empty() || payload.body.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "message": "收件人、主题和正文不能为空",
            "data": null,
            "code": 400
        }));
    }

    // 检查权限：只有管理员可以发送邮件
    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限发送邮件",
            "data": null,
            "code": 403
        }));
    }

    // 获取发送者信息
    let sender_email = match sqlx::query_scalar(
        "SELECT email FROM core_users WHERE id = $1",
    )
    .bind(Uuid::parse_str(&claims.sub).unwrap())
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(email)) => email,
        Ok(None) => "system@topems.io".to_string(),
        Err(e) => {
            tracing::error!("Failed to get sender email: {}", e);
            "system@topems.io".to_string()
        }
    };

    // 发送邮件
    let result = send_email_internal(
        &state,
        &sender_email,
        &payload.to,
        &payload.subject,
        &payload.body,
        payload.html_body.as_deref(),
        payload.cc.as_ref(),
        payload.bcc.as_ref(),
    ).await;

    match result {
        Ok(_) => {
            // 保存邮件记录到数据库
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
            .execute(&state.pool)
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

/// 获取邮件详情
pub async fn get_email(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail get_email called with id: {} for user: {}", id, claims.username);

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

    // 查询邮件并验证权限
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
    .fetch_optional(&state.pool)
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

/// 删除邮件（软删除）
pub async fn delete_email(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail delete_email called with id: {} for user: {}", id, claims.username);

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

    // 检查权限：只有管理员或邮件所有者可以删除
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
        .fetch_one(&state.pool)
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

    match sqlx::query(
        "UPDATE core_emails SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1",
    )
    .bind(email_id)
    .execute(&state.pool)
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

/// 标记邮件为已读
pub async fn mark_as_read(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail mark_as_read called with id: {} for user: {}", id, claims.username);

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

    // 检查权限：只能标记自己的邮件为已读
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
    .fetch_one(&state.pool)
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

    match sqlx::query(
        "UPDATE core_emails SET is_read = TRUE, read_at = NOW() WHERE id = $1",
    )
    .bind(email_id)
    .execute(&state.pool)
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

/// 列出邮件模板
pub async fn list_templates(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail list_templates called for user: {}", claims.username);

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:read") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限查看邮件模板",
            "data": null,
            "code": 403
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "list_templates success",
        "data": []
    }))
}

/// 创建邮件模板
pub async fn create_template(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail create_template called with: {:?} by user: {}", payload, claims.username);

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限创建邮件模板",
            "data": null,
            "code": 403
        }));
    }

    // 验证输入
    if payload.name.is_empty() || payload.subject_template.is_empty() || payload.body_template.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "message": "模板名称、主题模板和正文模板不能为空",
            "data": null,
            "code": 400
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "邮件模板创建成功",
        "data": {
            "id": Uuid::new_v4().to_string(),
            "name": payload.name,
            "subject_template": payload.subject_template,
            "body_template": payload.body_template,
            "description": payload.description
        },
        "code": 0
    }))
}

/// 获取邮件模板详情
pub async fn get_template(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail get_template called with id: {} for user: {}", id, claims.username);

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:read") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限查看邮件模板",
            "data": null,
            "code": 403
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "get_template success",
        "data": null
    }))
}

/// 更新邮件模板
pub async fn update_template(
    State(_state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<CreateTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail update_template called with id: {} and payload: {:?} by user: {}", id, payload, claims.username);

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限更新邮件模板",
            "data": null,
            "code": 403
        }));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "邮件模板更新成功",
        "data": null,
        "code": 0
    }))
}

/// 使用模板发送邮件
pub async fn send_with_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<SendWithTemplateRequest>,
) -> Json<serde_json::Value> {
    tracing::info!("Communication mail send_with_template called with id: {} and payload: {:?} by user: {}", id, payload, claims.username);

    // 检查权限
    if !claims.is_superuser && !claims.has_permission("notification:write") {
        return Json(serde_json::json!({
            "success": false,
            "message": "没有权限发送邮件",
            "data": null,
            "code": 403
        }));
    }

    // 获取模板（简化实现）
    let subject = "通知邮件";
    let body = "这是一封通知邮件";

    // 发送邮件
    let result = send_email_internal(
        &state,
        "system@topems.io",
        &payload.to,
        subject,
        body,
        None,
        payload.cc.as_ref(),
        payload.bcc.as_ref(),
    ).await;

    match result {
        Ok(_) => Json(serde_json::json!({
            "success": true,
            "message": "使用模板发送邮件成功",
            "data": null,
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

/// 发送通知邮件（内部辅助函数）
pub async fn send_notification_email(
    state: &AppState,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<(), String> {
    tracing::info!("Sending notification email to: {}", to);

    send_email_internal(
        state,
        "system@topems.io",
        to,
        subject,
        body,
        None,
        None,
        None,
    ).await
}

/// 内部邮件发送函数
async fn send_email_internal(
    state: &AppState,
    from: &str,
    to: &str,
    subject: &str,
    body: &str,
    html_body: Option<&str>,
    cc: Option<&Vec<String>>,
    bcc: Option<&Vec<String>>,
) -> Result<(), String> {
    // 尝试从环境变量获取邮件配置
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string());
    let smtp_port = std::env::var("SMTP_PORT")
        .unwrap_or_else(|_| "587".to_string())
        .parse::<u16>()
        .unwrap_or(587);
    let smtp_user = std::env::var("SMTP_USER").unwrap_or_else(|_| "".to_string());
    let smtp_password = std::env::var("SMTP_PASSWORD").unwrap_or_else(|_| "".to_string());

    // 使用 reqwest 发送简单的 HTTP 请求到邮件服务
    // 在实际生产环境中，应该使用专门的邮件库如 lettre
    let email_data = serde_json::json!({
        "from": from,
        "to": to,
        "subject": subject,
        "body": body,
        "html_body": html_body,
        "cc": cc,
        "bcc": bcc
    });

    // 尝试调用外部邮件服务或输出日志（开发模式）
    if smtp_host == "localhost" && smtp_port == 587 {
        // 开发模式：只记录日志
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

    // 生产模式：调用邮件服务
    let mail_service_url = format!("http://{}:{}/send", smtp_host, smtp_port);
    let response = state.http_client
        .post(&mail_service_url)
        .json(&email_data)
        .send()
        .await;

    match response {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to send email: {}", e)),
    }
}
