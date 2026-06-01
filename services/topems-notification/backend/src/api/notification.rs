use axum::{
    extract::{Path, State},
    Json, Router,
};
use chrono::Utc;
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use topems_shared::ApiResponse;
use lettre::Transport;
use crate::models::*;

pub async fn create_routes(pool: PgPool) -> anyhow::Result<Router> {
    let router = Router::new()
        .route("/api/v1/notifications", axum::routing::get(list_notifications).post(create_notification))
        .route("/api/v1/notifications/{id}", axum::routing::get(get_notification).delete(delete_notification))
        .route("/api/v1/notifications/{id}/read", axum::routing::put(mark_as_read))
        .route("/api/v1/notifications/batch-read", axum::routing::put(batch_mark_as_read))
        .route("/api/v1/email-templates", axum::routing::get(list_email_templates).post(create_email_template))
        .route("/api/v1/email-templates/{id}", axum::routing::get(get_email_template).put(update_email_template).delete(delete_email_template))
        .route("/api/v1/sms-templates", axum::routing::get(list_sms_templates).post(create_sms_template))
        .route("/api/v1/sms-templates/{id}", axum::routing::get(get_sms_template).put(update_sms_template).delete(delete_sms_template))
        .route("/api/v1/email-logs", axum::routing::get(list_email_logs))
        .route("/api/v1/email-logs/{id}", axum::routing::get(get_email_log).delete(delete_email_log))
        .route("/api/v1/email/send", axum::routing::post(send_email))
        .route("/api/v1/email/send-with-template", axum::routing::post(send_email_with_template))
        .with_state(pool);

    Ok(router)
}

pub async fn list_notifications(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT json_agg(t) as data FROM (SELECT * FROM notification.notifications ORDER BY created_at DESC) t"#)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => {
            let data: Option<serde_json::Value> = row.get("data");
            let items = data.unwrap_or(json!([]));
            let total = items.as_array().map(|arr| arr.len()).unwrap_or(0);
            json!({ "items": items, "total": total })
        }
        Err(e) => {
            tracing::error!("获取通知列表失败: {}", e);
            return Json(ApiResponse::error(500, "获取通知列表失败"));
        }
    };

    Json(ApiResponse::success(result, "获取通知列表成功"))
}

pub async fn get_notification(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.notifications WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "通知不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "通知不存在")),
        Err(e) => {
            tracing::error!("获取通知失败: {}", e);
            return Json(ApiResponse::error(500, "获取通知失败"));
        }
    };

    Json(ApiResponse::success(result, "获取通知成功"))
}

pub async fn create_notification(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateNotificationRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = match sqlx::query(r#"
        INSERT INTO notification.notifications (id, user_id, title, content, notification_type, action_url, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING row_to_json(t) as data FROM notification.notifications t WHERE id = $1
        "#)
        .bind(id)
        .bind(payload.user_id)
        .bind(payload.title)
        .bind(payload.content)
        .bind(payload.notification_type)
        .bind(payload.action_url)
        .bind(payload.metadata)
        .bind(now)
        .bind(now)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            data.unwrap_or_default()
        }
        Ok(None) => return Json(ApiResponse::error(500, "创建通知失败")),
        Err(e) => {
            tracing::error!("创建通知失败: {}", e);
            return Json(ApiResponse::error(500, "创建通知失败"));
        }
    };

    Json(ApiResponse::success(result, "创建通知成功"))
}

pub async fn delete_notification(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.notifications WHERE id = $1"#)
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除通知失败: {}", e);
            return Json(ApiResponse::error(500, "删除通知失败"));
        }
    };

    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "通知不存在"));
    }

    Json(ApiResponse::success("删除成功".to_string(), "删除通知成功"))
}

pub async fn mark_as_read(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"
        UPDATE notification.notifications 
        SET status = 'read', updated_at = $2 
        WHERE id = $1 
        RETURNING row_to_json(t) as data FROM notification.notifications t WHERE id = $1
        "#)
        .bind(id)
        .bind(Utc::now())
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "通知不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "通知不存在")),
        Err(e) => {
            tracing::error!("更新通知状态失败: {}", e);
            return Json(ApiResponse::error(500, "更新通知状态失败"));
        }
    };

    Json(ApiResponse::success(result, "标记已读成功"))
}

pub async fn batch_mark_as_read(
    State(pool): State<PgPool>,
    Json(payload): Json<BatchReadRequest>,
) -> Json<ApiResponse<String>> {
    if payload.ids.is_empty() {
        return Json(ApiResponse::success("批量标记已读成功".to_string(), "批量标记已读成功"));
    }

    let query = format!(
        r#"UPDATE notification.notifications SET status = 'read', updated_at = ${} WHERE id IN ({})"#,
        payload.ids.len() + 1,
        (1..=payload.ids.len()).map(|i| format!("${}", i)).collect::<Vec<_>>().join(",")
    );

    let mut sql_query = sqlx::query(&query);
    for id in payload.ids {
        sql_query = sql_query.bind(id);
    }
    sql_query = sql_query.bind(Utc::now());

    match sql_query.execute(&pool).await {
        Ok(_) => Json(ApiResponse::success("批量标记已读成功".to_string(), "批量标记已读成功")),
        Err(e) => {
            tracing::error!("批量标记已读失败: {}", e);
            Json(ApiResponse::error(500, "批量标记已读失败"))
        }
    }
}

#[derive(serde::Deserialize)]
struct BatchReadRequest {
    ids: Vec<Uuid>,
}

pub async fn list_email_templates(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT json_agg(t) as data FROM (SELECT * FROM notification.email_templates ORDER BY created_at DESC) t"#)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => {
            let data: serde_json::Value = row.get("data");
            json!({ "items": data, "total": match data.as_array() { Some(arr) => arr.len(), None => 0 } })
        }
        Err(e) => {
            tracing::error!("获取邮件模板列表失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件模板列表失败"));
        }
    };

    Json(ApiResponse::success(result, "获取邮件模板列表成功"))
}

pub async fn get_email_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.email_templates WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "邮件模板不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "邮件模板不存在")),
        Err(e) => {
            tracing::error!("获取邮件模板失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件模板失败"));
        }
    };

    Json(ApiResponse::success(result, "获取邮件模板成功"))
}

pub async fn create_email_template(
    State(pool): State<PgPool>,
    Json(payload): Json<EmailTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = match sqlx::query(r#"
        INSERT INTO notification.email_templates (id, template_name, subject, body, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING row_to_json(t) as data FROM notification.email_templates t WHERE id = $1
        "#)
        .bind(id)
        .bind(payload.template_name)
        .bind(payload.subject)
        .bind(payload.body)
        .bind(payload.status.unwrap_or_else(|| "active".to_string()))
        .bind(now)
        .bind(now)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            data.unwrap_or_default()
        }
        Ok(None) => return Json(ApiResponse::error(500, "创建邮件模板失败")),
        Err(e) => {
            tracing::error!("创建邮件模板失败: {}", e);
            return Json(ApiResponse::error(500, "创建邮件模板失败"));
        }
    };

    Json(ApiResponse::success(result, "创建邮件模板成功"))
}

pub async fn update_email_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<EmailTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"
        UPDATE notification.email_templates 
        SET template_name = $1, subject = $2, body = $3, status = $4, updated_at = $5 
        WHERE id = $6 
        RETURNING row_to_json(t) as data FROM notification.email_templates t WHERE id = $6
        "#)
        .bind(payload.template_name)
        .bind(payload.subject)
        .bind(payload.body)
        .bind(payload.status.unwrap_or_else(|| "active".to_string()))
        .bind(Utc::now())
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "邮件模板不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "邮件模板不存在")),
        Err(e) => {
            tracing::error!("更新邮件模板失败: {}", e);
            return Json(ApiResponse::error(500, "更新邮件模板失败"));
        }
    };

    Json(ApiResponse::success(result, "更新邮件模板成功"))
}

pub async fn delete_email_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.email_templates WHERE id = $1"#)
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除邮件模板失败: {}", e);
            return Json(ApiResponse::error(500, "删除邮件模板失败"));
        }
    };

    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "邮件模板不存在"));
    }

    Json(ApiResponse::success("删除成功".to_string(), "删除邮件模板成功"))
}

#[derive(serde::Deserialize)]
struct EmailTemplateRequest {
    template_name: String,
    subject: String,
    body: String,
    status: Option<String>,
}

pub async fn list_sms_templates(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT json_agg(t) as data FROM (SELECT * FROM notification.sms_templates ORDER BY created_at DESC) t"#)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => {
            let data: serde_json::Value = row.get("data");
            json!({ "items": data, "total": match data.as_array() { Some(arr) => arr.len(), None => 0 } })
        }
        Err(e) => {
            tracing::error!("获取短信模板列表失败: {}", e);
            return Json(ApiResponse::error(500, "获取短信模板列表失败"));
        }
    };

    Json(ApiResponse::success(result, "获取短信模板列表成功"))
}

pub async fn get_sms_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.sms_templates WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "短信模板不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "短信模板不存在")),
        Err(e) => {
            tracing::error!("获取短信模板失败: {}", e);
            return Json(ApiResponse::error(500, "获取短信模板失败"));
        }
    };

    Json(ApiResponse::success(result, "获取短信模板成功"))
}

pub async fn create_sms_template(
    State(pool): State<PgPool>,
    Json(payload): Json<SmsTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = match sqlx::query(r#"
        INSERT INTO notification.sms_templates (id, template_name, content, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING row_to_json(t) as data FROM notification.sms_templates t WHERE id = $1
        "#)
        .bind(id)
        .bind(payload.template_name)
        .bind(payload.content)
        .bind(payload.status.unwrap_or_else(|| "active".to_string()))
        .bind(now)
        .bind(now)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            data.unwrap_or_default()
        }
        Ok(None) => return Json(ApiResponse::error(500, "创建短信模板失败")),
        Err(e) => {
            tracing::error!("创建短信模板失败: {}", e);
            return Json(ApiResponse::error(500, "创建短信模板失败"));
        }
    };

    Json(ApiResponse::success(result, "创建短信模板成功"))
}

pub async fn update_sms_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SmsTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"
        UPDATE notification.sms_templates 
        SET template_name = $1, content = $2, status = $3, updated_at = $4 
        WHERE id = $5 
        RETURNING row_to_json(t) as data FROM notification.sms_templates t WHERE id = $5
        "#)
        .bind(payload.template_name)
        .bind(payload.content)
        .bind(payload.status.unwrap_or_else(|| "active".to_string()))
        .bind(Utc::now())
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "短信模板不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "短信模板不存在")),
        Err(e) => {
            tracing::error!("更新短信模板失败: {}", e);
            return Json(ApiResponse::error(500, "更新短信模板失败"));
        }
    };

    Json(ApiResponse::success(result, "更新短信模板成功"))
}

pub async fn delete_sms_template(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.sms_templates WHERE id = $1"#)
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除短信模板失败: {}", e);
            return Json(ApiResponse::error(500, "删除短信模板失败"));
        }
    };

    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "短信模板不存在"));
    }

    Json(ApiResponse::success("删除成功".to_string(), "删除短信模板成功"))
}

#[derive(serde::Deserialize)]
struct SmsTemplateRequest {
    template_name: String,
    content: String,
    status: Option<String>,
}

pub async fn list_email_logs(
    State(pool): State<PgPool>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT json_agg(t) as data FROM (SELECT * FROM notification.email_logs ORDER BY created_at DESC) t"#)
        .fetch_one(&pool)
        .await
    {
        Ok(row) => {
            let data: serde_json::Value = row.get("data");
            json!({ "items": data, "total": match data.as_array() { Some(arr) => arr.len(), None => 0 } })
        }
        Err(e) => {
            tracing::error!("获取邮件日志列表失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件日志列表失败"));
        }
    };

    Json(ApiResponse::success(result, "获取邮件日志列表成功"))
}

pub async fn get_email_log(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.email_logs WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            match data {
                Some(d) => d,
                None => return Json(ApiResponse::error(404, "邮件日志不存在")),
            }
        }
        Ok(None) => return Json(ApiResponse::error(404, "邮件日志不存在")),
        Err(e) => {
            tracing::error!("获取邮件日志失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件日志失败"));
        }
    };

    Json(ApiResponse::success(result, "获取邮件日志成功"))
}

pub async fn delete_email_log(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.email_logs WHERE id = $1"#)
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除邮件日志失败: {}", e);
            return Json(ApiResponse::error(500, "删除邮件日志失败"));
        }
    };

    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "邮件日志不存在"));
    }

    Json(ApiResponse::success("删除成功".to_string(), "删除邮件日志成功"))
}

pub async fn send_email(
    State(pool): State<PgPool>,
    Json(payload): Json<SendEmailRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let from_email = std::env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| "noreply@topems.com".to_string());

    let log_result = match sqlx::query(r#"
        INSERT INTO notification.email_logs (id, from_email, to_email, cc_email, bcc_email, subject, body, status, created_at, updated_at, template_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING row_to_json(t) as data FROM notification.email_logs t WHERE id = $1
        "#)
        .bind(id)
        .bind(&from_email)
        .bind(&payload.to_email)
        .bind(&payload.cc_email)
        .bind(&payload.bcc_email)
        .bind(&payload.subject)
        .bind(&payload.body)
        .bind("pending")
        .bind(now)
        .bind(now)
        .bind(&payload.template_id)
        .bind(&payload.metadata)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            data.unwrap_or_default()
        }
        Ok(None) => return Json(ApiResponse::error(500, "创建邮件日志失败")),
        Err(e) => {
            tracing::error!("创建邮件日志失败: {}", e);
            return Json(ApiResponse::error(500, "创建邮件日志失败"));
        }
    };

    let send_result = match send_email_via_smtp(&from_email, &payload.to_email, &payload.cc_email, &payload.bcc_email, &payload.subject, &payload.body).await {
        Ok(_) => {
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'sent', sent_at = $1, updated_at = $2 WHERE id = $3"#)
                .bind(Utc::now())
                .bind(Utc::now())
                .bind(id)
                .execute(&pool)
                .await;
            "sent"
        }
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'failed', error_message = $1, updated_at = $2 WHERE id = $3"#)
                .bind(e.to_string())
                .bind(Utc::now())
                .bind(id)
                .execute(&pool)
                .await;
            return Json(ApiResponse::error(500, "发送邮件失败"));
        }
    };

    let mut result = log_result.as_object().cloned().unwrap_or_default();
    result.insert("status".to_string(), serde_json::Value::String(send_result.to_string()));

    Json(ApiResponse::success(serde_json::Value::Object(result), "发送邮件成功"))
}

pub async fn send_email_with_template(
    State(pool): State<PgPool>,
    Json(payload): Json<SendEmailWithTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let template_result = match sqlx::query(r#"SELECT subject, body FROM notification.email_templates WHERE id = $1 AND status = 'active'"#)
        .bind(payload.template_id)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let subject: String = row.get("subject");
            let body: String = row.get("body");
            (subject, body)
        }
        Ok(None) => return Json(ApiResponse::error(404, "邮件模板不存在或未启用")),
        Err(e) => {
            tracing::error!("获取邮件模板失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件模板失败"));
        }
    };

    let (mut subject, mut body) = template_result;

    if let Some(variables) = payload.variables.as_ref() {
        subject = replace_variables(&subject, variables);
        body = replace_variables(&body, variables);
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let from_email = std::env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| "noreply@topems.com".to_string());

    let log_result = match sqlx::query(r#"
        INSERT INTO notification.email_logs (id, from_email, to_email, cc_email, bcc_email, subject, body, status, created_at, updated_at, template_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING row_to_json(t) as data FROM notification.email_logs t WHERE id = $1
        "#)
        .bind(id)
        .bind(&from_email)
        .bind(&payload.to_email)
        .bind(&payload.cc_email)
        .bind(&payload.bcc_email)
        .bind(&subject)
        .bind(&body)
        .bind("pending")
        .bind(now)
        .bind(now)
        .bind(&payload.template_id)
        .bind(&payload.metadata)
        .fetch_optional(&pool)
        .await
    {
        Ok(Some(row)) => {
            let data: Option<serde_json::Value> = row.get("data");
            data.unwrap_or_default()
        }
        Ok(None) => return Json(ApiResponse::error(500, "创建邮件日志失败")),
        Err(e) => {
            tracing::error!("创建邮件日志失败: {}", e);
            return Json(ApiResponse::error(500, "创建邮件日志失败"));
        }
    };

    let send_result = match send_email_via_smtp(&from_email, &payload.to_email, &payload.cc_email, &payload.bcc_email, &subject, &body).await {
        Ok(_) => {
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'sent', sent_at = $1, updated_at = $2 WHERE id = $3"#)
                .bind(Utc::now())
                .bind(Utc::now())
                .bind(id)
                .execute(&pool)
                .await;
            "sent"
        }
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'failed', error_message = $1, updated_at = $2 WHERE id = $3"#)
                .bind(e.to_string())
                .bind(Utc::now())
                .bind(id)
                .execute(&pool)
                .await;
            return Json(ApiResponse::error(500, "发送邮件失败"));
        }
    };

    let mut result = log_result.as_object().cloned().unwrap_or_default();
    result.insert("status".to_string(), serde_json::Value::String(send_result.to_string()));

    Json(ApiResponse::success(serde_json::Value::Object(result), "发送邮件成功"))
}

async fn send_email_via_smtp(
    from_email: &str,
    to_email: &str,
    cc_email: &Option<String>,
    bcc_email: &Option<String>,
    subject: &str,
    body: &str,
) -> Result<(), anyhow::Error> {
    let smtp_host = std::env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string());
    let smtp_port: u16 = std::env::var("SMTP_PORT").unwrap_or_else(|_| "587".to_string()).parse()?;
    let smtp_username = std::env::var("SMTP_USERNAME").ok();
    let smtp_password = std::env::var("SMTP_PASSWORD").ok();
    let smtp_tls: bool = std::env::var("SMTP_TLS").unwrap_or_else(|_| "true".to_string()).parse()?;

    let mut email = lettre::Message::builder()
        .from(from_email.parse()?)
        .to(to_email.parse()?)
        .subject(subject);

    if let Some(cc) = cc_email {
        for addr in cc.split(',').filter(|s| !s.trim().is_empty()) {
            email = email.cc(addr.trim().parse()?);
        }
    }

    if let Some(bcc) = bcc_email {
        for addr in bcc.split(',').filter(|s| !s.trim().is_empty()) {
            email = email.bcc(addr.trim().parse()?);
        }
    }

    let email = email.body(body.to_string())?;

    let transport = if smtp_tls {
        lettre::transport::smtp::SmtpTransport::relay(&smtp_host)?
            .port(smtp_port)
            .credentials(lettre::transport::smtp::authentication::Credentials::new(
                smtp_username.unwrap_or_default(),
                smtp_password.unwrap_or_default(),
            ))
            .build()
    } else {
        lettre::transport::smtp::SmtpTransport::builder_dangerous(&smtp_host)
            .port(smtp_port)
            .credentials(lettre::transport::smtp::authentication::Credentials::new(
                smtp_username.unwrap_or_default(),
                smtp_password.unwrap_or_default(),
            ))
            .build()
    };

    transport.send(&email)?;

    Ok(())
}

fn replace_variables(text: &str, variables: &serde_json::Value) -> String {
    let mut result = text.to_string();
    
    if let Some(obj) = variables.as_object() {
        for (key, value) in obj {
            let placeholder = format!("{{{{{}}}}}", key);
            let value_str = match value {
                serde_json::Value::String(s) => s.clone(),
                _ => value.to_string(),
            };
            result = result.replace(&placeholder, &value_str);
        }
    }
    
    result
}
