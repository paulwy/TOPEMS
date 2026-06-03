use anyhow::Result;
use axum::{
    extract::{Path, State, Query},
    Json, Router,
};
use chrono::Utc;
use serde_json::json;
use sqlx::Row;
use uuid::Uuid;

use topems_shared::ApiResponse;
use lettre::Transport;
use crate::models::*;

use super::ApiState;

#[derive(Debug, serde::Deserialize)]
pub struct ListQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    notification_type: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let router = Router::new()
        .route("/api/v1/notifications", axum::routing::get(list_notifications).post(create_notification))
        .route("/api/v1/notifications/unread", axum::routing::get(get_unread_notifications))
        .route("/api/v1/notifications/unread-count", axum::routing::get(get_unread_count))
        .route("/api/v1/notifications/read-all", axum::routing::put(mark_all_as_read))
        .route("/api/v1/notifications/{id}", axum::routing::get(get_notification).delete(delete_notification))
        .route("/api/v1/notifications/{id}/read", axum::routing::put(mark_as_read))
        .route("/api/v1/notifications/batch-read", axum::routing::put(batch_mark_as_read))
        .route("/api/v1/email-templates", axum::routing::get(list_email_templates).post(create_email_template))
        .route("/api/v1/email-templates/{id}", axum::routing::get(get_email_template).put(update_email_template).delete(delete_email_template))
        .route("/api/v1/sms-templates", axum::routing::get(list_sms_templates).post(create_sms_template))
        .route("/api/v1/sms-templates/{id}", axum::routing::get(get_sms_template).put(update_sms_template).delete(delete_sms_template))
        .route("/api/v1/email-logs", axum::routing::get(list_email_logs))
        .route("/api/v1/email-logs/{id}", axum::routing::get(get_email_log).delete(delete_email_log))
        .route("/api/v1/email-logs/{id}/resend", axum::routing::post(resend_email))
        .route("/api/v1/email/send", axum::routing::post(send_email))
        .route("/api/v1/email/send-with-template", axum::routing::post(send_email_with_template))
        .route("/api/v1/email/batch-send", axum::routing::post(batch_send_email))
        .route("/api/v1/email/stats", axum::routing::get(get_email_stats));

    Ok(router)
}

fn convert_notification_to_response(n: &Notification) -> NotificationResponse {
    NotificationResponse {
        id: n.id.to_string(),
        user_id: n.user_id.to_string(),
        notification_type: n.notification_type.clone(),
        title: n.title.clone(),
        content: n.content.clone().unwrap_or_default(),
        data: n.metadata.clone(),
        is_read: n.status == "read",
        priority: 0,
        created_at: n.created_at.to_rfc3339(),
        read_at: if n.status == "read" { Some(n.updated_at.to_rfc3339()) } else { None },
    }
}

pub async fn list_notifications(
    State(state): State<ApiState>,
    Query(query): Query<ListQuery>,
) -> Json<ApiResponse<NotificationListResponse>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;
    
    let mut sql = String::from("SELECT * FROM notifications");
    let mut count_sql = String::from("SELECT COUNT(*) FROM notifications");
    let mut unread_count_sql = String::from("SELECT COUNT(*) FROM notifications WHERE status = 'unread'");
    
    if let Some(nt) = &query.notification_type {
        sql.push_str(&format!(" WHERE notification_type = '{}'", nt));
        count_sql.push_str(&format!(" WHERE notification_type = '{}'", nt));
        unread_count_sql.push_str(&format!(" AND notification_type = '{}'", nt));
    }
    
    sql.push_str(" ORDER BY created_at DESC LIMIT $1 OFFSET $2");
    
    let notifications = match sqlx::query_as::<_, Notification>(&sql)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    {
        Ok(notifs) => notifs,
        Err(e) => {
            tracing::error!("获取通知列表失败: {}", e);
            return Json(ApiResponse::error(500, "获取通知列表失败"));
        }
    };
    
    let total: i64 = match sqlx::query_scalar(&count_sql)
        .fetch_one(&state.db)
        .await
    {
        Ok(count) => count,
        Err(e) => {
            tracing::error!("获取总数失败: {}", e);
            0
        }
    };
    
    let unread_count: i64 = match sqlx::query_scalar(&unread_count_sql)
        .fetch_one(&state.db)
        .await
    {
        Ok(count) => count,
        Err(e) => {
            tracing::error!("获取未读数量失败: {}", e);
            0
        }
    };
    
    let response_notifications: Vec<NotificationResponse> = notifications
        .iter()
        .map(convert_notification_to_response)
        .collect();
    
    let result = NotificationListResponse {
        notifications: response_notifications,
        total: total as i32,
        page,
        page_size,
        unread_count: unread_count as i32,
    };

    Json(ApiResponse::success(result, "获取通知列表成功"))
}

pub async fn get_unread_notifications(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<NotificationResponse>>> {
    let notifications = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notifications WHERE status = 'unread' ORDER BY created_at DESC"
    )
        .fetch_all(&state.db)
        .await
    {
        Ok(notifs) => notifs,
        Err(e) => {
            tracing::error!("获取未读通知失败: {}", e);
            return Json(ApiResponse::error(500, "获取未读通知失败"));
        }
    };
    
    let response_notifications: Vec<NotificationResponse> = notifications
        .iter()
        .map(convert_notification_to_response)
        .collect();

    Json(ApiResponse::success(response_notifications, "获取未读通知成功"))
}

pub async fn get_unread_count(
    State(state): State<ApiState>,
) -> Json<ApiResponse<i32>> {
    let count: i64 = match sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE status = 'unread'")
        .fetch_one(&state.db)
        .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("获取未读数量失败: {}", e);
            return Json(ApiResponse::error(500, "获取未读数量失败"));
        }
    };

    Json(ApiResponse::success(count as i32, "获取未读数量成功"))
}

pub async fn mark_all_as_read(
    State(state): State<ApiState>,
) -> Json<ApiResponse<i32>> {
    let result = match sqlx::query("UPDATE notifications SET status = 'read', updated_at = $1 WHERE status = 'unread'")
        .bind(Utc::now())
        .execute(&state.db)
        .await
    {
        Ok(r) => r.rows_affected() as i32,
        Err(e) => {
            tracing::error!("标记全部已读失败: {}", e);
            return Json(ApiResponse::error(500, "标记全部已读失败"));
        }
    };

    Json(ApiResponse::success(result, "标记全部已读成功"))
}

pub async fn get_notification(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<NotificationResponse>> {
    let notification = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notifications WHERE id = $1"
    )
        .bind(id)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(n)) => n,
        Ok(None) => return Json(ApiResponse::error(404, "通知不存在")),
        Err(e) => {
            tracing::error!("获取通知失败: {}", e);
            return Json(ApiResponse::error(500, "获取通知失败"));
        }
    };

    let response = convert_notification_to_response(&notification);
    Json(ApiResponse::success(response, "获取通知成功"))
}

pub async fn create_notification(
    State(state): State<ApiState>,
    Json(payload): Json<CreateNotificationRequest>,
) -> Json<ApiResponse<NotificationResponse>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let _ = match sqlx::query(
        r#"
        INSERT INTO notifications (id, user_id, title, content, notification_type, action_url, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#
    )
        .bind(id)
        .bind(payload.user_id)
        .bind(payload.title)
        .bind(payload.content)
        .bind(payload.notification_type)
        .bind(payload.action_url)
        .bind(payload.metadata)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await
    {
        Ok(_) => (),
        Err(e) => {
            tracing::error!("创建通知失败: {}", e);
            return Json(ApiResponse::error(500, "创建通知失败"));
        }
    };
    
    let notification = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notifications WHERE id = $1"
    )
        .bind(id)
        .fetch_one(&state.db)
        .await
    {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("获取创建后的通知失败: {}", e);
            return Json(ApiResponse::error(500, "获取创建后的通知失败"));
        }
    };

    let response = convert_notification_to_response(&notification);
    Json(ApiResponse::success(response, "创建通知成功"))
}

pub async fn delete_notification(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notifications WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<NotificationResponse>> {
    let _ = match sqlx::query(
        "UPDATE notifications SET status = 'read', updated_at = $1 WHERE id = $2"
    )
        .bind(Utc::now())
        .bind(id)
        .execute(&state.db)
        .await
    {
        Ok(_) => (),
        Err(e) => {
            tracing::error!("更新通知状态失败: {}", e);
            return Json(ApiResponse::error(500, "更新通知状态失败"));
        }
    };
    
    let notification = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notifications WHERE id = $1"
    )
        .bind(id)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(n)) => n,
        Ok(None) => return Json(ApiResponse::error(404, "通知不存在")),
        Err(e) => {
            tracing::error!("获取更新后的通知失败: {}", e);
            return Json(ApiResponse::error(500, "获取更新后的通知失败"));
        }
    };

    let response = convert_notification_to_response(&notification);
    Json(ApiResponse::success(response, "标记已读成功"))
}

pub async fn batch_mark_as_read(
    State(state): State<ApiState>,
    Json(payload): Json<BatchReadRequest>,
) -> Json<ApiResponse<String>> {
    if payload.ids.is_empty() {
        return Json(ApiResponse::success("批量标记已读成功".to_string(), "批量标记已读成功"));
    }

    let query = format!(
        r#"UPDATE notifications SET status = 'read', updated_at = ${} WHERE id IN ({})"#,
        payload.ids.len() + 1,
        (1..=payload.ids.len()).map(|i| format!("${}", i)).collect::<Vec<_>>().join(",")
    );

    let mut sql_query = sqlx::query(&query);
    for id in payload.ids {
        sql_query = sql_query.bind(id);
    }
    sql_query = sql_query.bind(Utc::now());

    match sql_query.execute(&state.db).await {
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
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT json_agg(t) as data FROM (SELECT * FROM notification.email_templates ORDER BY created_at DESC) t"#)
        .fetch_one(&state.db)
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.email_templates WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
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
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
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
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.email_templates WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
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
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT json_agg(t) as data FROM (SELECT * FROM notification.sms_templates ORDER BY created_at DESC) t"#)
        .fetch_one(&state.db)
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.sms_templates WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
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
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
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
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.sms_templates WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
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

#[derive(Debug, serde::Deserialize)]
pub struct EmailLogQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    status: Option<String>,
    to_email: Option<String>,
}

pub async fn list_email_logs(
    State(state): State<ApiState>,
    Query(query): Query<EmailLogQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut where_clause = String::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync>> = Vec::new();
    let mut param_idx = 1;

    if let Some(status) = query.status {
        where_clause.push_str(&format!(" WHERE status = ${}", param_idx));
        params.push(Box::new(status));
        param_idx += 1;
    }

    if let Some(to_email) = query.to_email {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE ");
        } else {
            where_clause.push_str(" AND ");
        }
        where_clause.push_str(&format!("to_email LIKE ${}", param_idx));
        params.push(Box::new(format!("%{}%", to_email)));
        param_idx += 1;
    }

    let count_query = format!("SELECT COUNT(*) FROM notification.email_logs{}", where_clause);
    let count: i64 = match sqlx::query_scalar(&count_query)
        .fetch_one(&state.db)
        .await
    {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("获取邮件日志总数失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件日志列表失败"));
        }
    };

    let query_str = format!(
        "SELECT * FROM notification.email_logs{} ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
        where_clause, param_idx, param_idx + 1
    );

    let result = match sqlx::query(&query_str)
        .fetch_all(&state.db)
        .await
    {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    let id: Uuid = row.get("id");
                    let from_email: String = row.get("from_email");
                    let to_email: String = row.get("to_email");
                    let cc_email: Option<String> = row.get("cc_email");
                    let bcc_email: Option<String> = row.get("bcc_email");
                    let subject: String = row.get("subject");
                    let body: String = row.get("body");
                    let status: String = row.get("status");
                    let error_message: Option<String> = row.get("error_message");
                    let sent_at: Option<chrono::DateTime<chrono::Utc>> = row.get("sent_at");
                    let template_id: Option<Uuid> = row.get("template_id");
                    let metadata: Option<serde_json::Value> = row.get("metadata");
                    let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");
                    let updated_at: chrono::DateTime<chrono::Utc> = row.get("updated_at");

                    json!({
                        "id": id.to_string(),
                        "from_email": from_email,
                        "to_email": to_email,
                        "cc_email": cc_email,
                        "bcc_email": bcc_email,
                        "subject": subject,
                        "body": body,
                        "status": status,
                        "error_message": error_message,
                        "sent_at": sent_at.map(|dt| dt.to_rfc3339()),
                        "template_id": template_id.map(|id| id.to_string()),
                        "metadata": metadata,
                        "created_at": created_at.to_rfc3339(),
                        "updated_at": updated_at.to_rfc3339(),
                    })
                })
                .collect();

            json!({
                "items": items,
                "total": count,
                "page": page,
                "page_size": page_size,
                "total_pages": (count + page_size as i64 - 1) / page_size as i64,
            })
        }
        Err(e) => {
            tracing::error!("获取邮件日志列表失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件日志列表失败"));
        }
    };

    Json(ApiResponse::success(result, "获取邮件日志列表成功"))
}

pub async fn get_email_log(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = match sqlx::query(r#"SELECT row_to_json(t) as data FROM (SELECT * FROM notification.email_logs WHERE id = $1) t"#)
        .bind(id)
        .fetch_optional(&state.db)
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = match sqlx::query(r#"DELETE FROM notification.email_logs WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
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
    State(state): State<ApiState>,
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
        .fetch_optional(&state.db)
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
                .execute(&state.db)
                .await;
            "sent"
        }
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'failed', error_message = $1, updated_at = $2 WHERE id = $3"#)
                .bind(e.to_string())
                .bind(Utc::now())
                .bind(id)
                .execute(&state.db)
                .await;
            return Json(ApiResponse::error(500, "发送邮件失败"));
        }
    };

    let mut result = log_result.as_object().cloned().unwrap_or_default();
    result.insert("status".to_string(), serde_json::Value::String(send_result.to_string()));

    Json(ApiResponse::success(serde_json::Value::Object(result), "发送邮件成功"))
}

pub async fn send_email_with_template(
    State(state): State<ApiState>,
    Json(payload): Json<SendEmailWithTemplateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let template_result = match sqlx::query(r#"SELECT subject, body FROM notification.email_templates WHERE id = $1 AND status = 'active'"#)
        .bind(payload.template_id)
        .fetch_optional(&state.db)
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
        .fetch_optional(&state.db)
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
                .execute(&state.db)
                .await;
            "sent"
        }
        Err(e) => {
            tracing::error!("发送邮件失败: {}", e);
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'failed', error_message = $1, updated_at = $2 WHERE id = $3"#)
                .bind(e.to_string())
                .bind(Utc::now())
                .bind(id)
                .execute(&state.db)
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

pub async fn resend_email(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let log_result = match sqlx::query!(
        r#"SELECT from_email, to_email, cc_email, bcc_email, subject, body FROM notification.email_logs WHERE id = $1"#,
        id
    )
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => return Json(ApiResponse::error(404, "邮件日志不存在")),
        Err(e) => {
            tracing::error!("获取邮件日志失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件日志失败"));
        }
    };

    let send_result = match send_email_via_smtp(
        &log_result.from_email,
        &log_result.to_email,
        &log_result.cc_email,
        &log_result.bcc_email,
        &log_result.subject,
        &log_result.body,
    ).await {
        Ok(_) => {
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'sent', sent_at = $1, error_message = NULL, updated_at = $2 WHERE id = $3"#)
                .bind(Utc::now())
                .bind(Utc::now())
                .bind(id)
                .execute(&state.db)
                .await;
            "sent"
        }
        Err(e) => {
            tracing::error!("重发邮件失败: {}", e);
            let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'failed', error_message = $1, updated_at = $2 WHERE id = $3"#)
                .bind(e.to_string())
                .bind(Utc::now())
                .bind(id)
                .execute(&state.db)
                .await;
            return Json(ApiResponse::error(500, format!("重发邮件失败: {}", e)));
        }
    };

    Json(ApiResponse::success(json!({ "id": id.to_string(), "status": send_result }), "重发邮件成功"))
}

#[derive(Debug, serde::Deserialize)]
pub struct BatchSendEmailRequest {
    pub to_emails: Vec<String>,
    pub cc_email: Option<String>,
    pub bcc_email: Option<String>,
    pub subject: String,
    pub body: String,
    pub template_id: Option<Uuid>,
    pub metadata: Option<serde_json::Value>,
}

pub async fn batch_send_email(
    State(state): State<ApiState>,
    Json(payload): Json<BatchSendEmailRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if payload.to_emails.is_empty() {
        return Json(ApiResponse::error(400, "收件人列表不能为空"));
    }

    let from_email = std::env::var("SMTP_FROM_EMAIL").unwrap_or_else(|_| "noreply@topems.com".to_string());
    let mut success_count = 0;
    let mut fail_count = 0;
    let mut results = Vec::new();

    for to_email in payload.to_emails {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let _ = sqlx::query(r#"
            INSERT INTO notification.email_logs (id, from_email, to_email, cc_email, bcc_email, subject, body, status, created_at, updated_at, template_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#)
            .bind(id)
            .bind(&from_email)
            .bind(&to_email)
            .bind(&payload.cc_email)
            .bind(&payload.bcc_email)
            .bind(&payload.subject)
            .bind(&payload.body)
            .bind("pending")
            .bind(now)
            .bind(now)
            .bind(&payload.template_id)
            .bind(&payload.metadata)
            .execute(&state.db)
            .await;

        match send_email_via_smtp(&from_email, &to_email, &payload.cc_email, &payload.bcc_email, &payload.subject, &payload.body).await {
            Ok(_) => {
                let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'sent', sent_at = $1, updated_at = $2 WHERE id = $3"#)
                    .bind(Utc::now())
                    .bind(Utc::now())
                    .bind(id)
                    .execute(&state.db)
                    .await;
                success_count += 1;
                results.push(json!({ "email": to_email, "status": "sent", "message": "发送成功" }));
            }
            Err(e) => {
                let _ = sqlx::query(r#"UPDATE notification.email_logs SET status = 'failed', error_message = $1, updated_at = $2 WHERE id = $3"#)
                    .bind(e.to_string())
                    .bind(Utc::now())
                    .bind(id)
                    .execute(&state.db)
                    .await;
                fail_count += 1;
                results.push(json!({ "email": to_email, "status": "failed", "message": e.to_string() }));
            }
        }
    }

    Json(ApiResponse::success(
        json!({
            "total": payload.to_emails.len(),
            "success_count": success_count,
            "fail_count": fail_count,
            "results": results,
        }),
        format!("批量发送完成，成功 {} 封，失败 {} 封", success_count, fail_count)
    ))
}

pub async fn get_email_stats(
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let today = chrono::Local::now().date_naive();
    let start_of_today = chrono::NaiveDateTime::new(today, chrono::NaiveTime::MIN);
    let end_of_today = chrono::NaiveDateTime::new(today, chrono::NaiveTime::MAX);

    let stats = match sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN created_at >= $1 AND created_at <= $2 THEN 1 ELSE 0 END) as today_count
        FROM notification.email_logs
        "#,
        start_of_today,
        end_of_today
    )
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("获取邮件统计失败: {}", e);
            return Json(ApiResponse::error(500, "获取邮件统计失败"));
        }
    };

    Json(ApiResponse::success(
        json!({
            "total": stats.total,
            "sent_count": stats.sent_count,
            "failed_count": stats.failed_count,
            "pending_count": stats.pending_count,
            "today_count": stats.today_count,
        }),
        "获取邮件统计成功"
    ))
}