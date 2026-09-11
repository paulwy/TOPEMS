#![allow(dead_code)]
//! 移动端 OA 办公协同（缺口#14）
//! meetings / calendar/events / tasks / announcements / oa/stats

use axum::extract::{Path, Query, State};
use axum::Json;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

fn tenant_id() -> String {
    "default".to_string()
}

// ===== 模型 =====

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OaMeeting {
    pub id: Uuid,
    pub tenant_id: String,
    pub title: String,
    pub description: Option<String>,
    pub r#type: String,
    pub status: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub location: Option<String>,
    pub video_url: Option<String>,
    pub organizer: Option<String>,
    pub organizer_name: Option<String>,
    pub attendees: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMeetingRequest {
    pub title: String,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub location: Option<String>,
    pub video_url: Option<String>,
    pub attendee_ids: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct MeetingQuery {
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OaCalendarEvent {
    pub id: Uuid,
    pub tenant_id: String,
    pub title: String,
    pub description: Option<String>,
    pub r#type: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub all_day: bool,
    pub location: Option<String>,
    pub is_reminder: bool,
    pub reminder_minutes: Option<i32>,
    pub color: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCalendarEventRequest {
    pub title: String,
    pub description: Option<String>,
    pub r#type: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub all_day: Option<bool>,
    pub location: Option<String>,
    pub is_reminder: Option<bool>,
    pub reminder_minutes: Option<i32>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CalendarEventQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub r#type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OaTask {
    pub id: Uuid,
    pub tenant_id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub assignee: Option<String>,
    pub assignee_name: Option<String>,
    pub creator: Option<String>,
    pub creator_name: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub tags: Option<serde_json::Value>,
    pub project_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOaTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub tags: Option<Vec<String>>,
    pub project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OaTaskQuery {
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub project_id: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OaAnnouncement {
    pub id: Uuid,
    pub tenant_id: String,
    pub title: String,
    pub content: String,
    pub priority: String,
    pub author: Option<String>,
    pub author_name: Option<String>,
    pub published_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AnnouncementQuery {
    pub priority: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

// ===== Meetings =====

pub async fn list_meetings(
    State(pool): State<PgPool>,
    Query(q): Query<MeetingQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid = tenant_id();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_meetings WHERE tenant_id = $1 \
         AND ($2::text IS NULL OR status = $2) \
         ORDER BY start_time DESC LIMIT $3 OFFSET $4"
    ))
    .bind(&tid)
    .bind(q.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "mobile",
                "SELECT COUNT(*) FROM oa_meetings WHERE tenant_id = $1"
            ))
            .bind(&tid)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                serde_json::json!({"items": rows, "total": total, "page": page, "page_size": page_size}),
                "ok",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn get_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OaMeeting>> {
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_meetings WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "ok")),
        Ok(None) => Json(ApiResponse::error(404, "会议不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn create_meeting(
    State(pool): State<PgPool>,
    Json(req): Json<CreateMeetingRequest>,
) -> Json<ApiResponse<OaMeeting>> {
    let tid = tenant_id();
    let id = Uuid::new_v4();
    let start = DateTime::parse_from_rfc3339(&req.start_time)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc);
    let end = DateTime::parse_from_rfc3339(&req.end_time)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc);
    let attendees = req
        .attendee_ids
        .map(|ids| serde_json::json!(ids.iter().map(|uid| serde_json::json!({"user_id": uid, "role": "guest", "response": "pending"})).collect::<Vec<_>>()))
        .unwrap_or(serde_json::json!([]));
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "INSERT INTO oa_meetings (id, tenant_id, title, description, type, status, start_time, end_time, location, video_url, attendees, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,'scheduled',$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *"
    ))
    .bind(id)
    .bind(&tid)
    .bind(&req.title)
    .bind(req.description)
    .bind(req.r#type.unwrap_or_else(|| "internal".to_string()))
    .bind(start)
    .bind(end)
    .bind(req.location)
    .bind(req.video_url)
    .bind(attendees)
    .fetch_one(&pool)
    .await
    {
        Ok(m) => Json(ApiResponse::success(m, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建失败: {}", e))),
    }
}

pub async fn update_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<OaMeeting>> {
    let title = req.get("title").and_then(|v| v.as_str().map(String::from));
    let description = req
        .get("description")
        .and_then(|v| v.as_str().map(String::from));
    let status = req.get("status").and_then(|v| v.as_str().map(String::from));
    let location = req
        .get("location")
        .and_then(|v| v.as_str().map(String::from));
    let video_url = req
        .get("video_url")
        .and_then(|v| v.as_str().map(String::from));
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "UPDATE oa_meetings SET title = COALESCE($1, title), description = COALESCE($2, description), \
         status = COALESCE($3, status), location = COALESCE($4, location), video_url = COALESCE($5, video_url), \
         updated_at = NOW() WHERE id = $6 RETURNING *"
    ))
    .bind(title)
    .bind(description)
    .bind(status)
    .bind(location)
    .bind(video_url)
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "会议不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新失败: {}", e))),
    }
}

pub async fn delete_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM oa_meetings WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "会议不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除失败: {}", e))),
    }
}

pub async fn join_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OaMeeting>> {
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "UPDATE oa_meetings SET status = 'in_progress', updated_at = NOW() WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "已加入会议")),
        Ok(None) => Json(ApiResponse::error(404, "会议不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("操作失败: {}", e))),
    }
}

pub async fn leave_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OaMeeting>> {
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "UPDATE oa_meetings SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => Json(ApiResponse::success(m, "已离开会议")),
        Ok(None) => Json(ApiResponse::error(404, "会议不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("操作失败: {}", e))),
    }
}

// ===== Calendar Events =====

pub async fn list_calendar_events(
    State(pool): State<PgPool>,
    Query(_q): Query<CalendarEventQuery>,
) -> Json<ApiResponse<Vec<OaCalendarEvent>>> {
    let tid = tenant_id();
    match sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_calendar_events WHERE tenant_id = $1 ORDER BY start_time DESC LIMIT 100"
    ))
    .bind(&tid)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => Json(ApiResponse::success(rows, "ok")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn create_calendar_event(
    State(pool): State<PgPool>,
    Json(req): Json<CreateCalendarEventRequest>,
) -> Json<ApiResponse<OaCalendarEvent>> {
    let tid = tenant_id();
    let id = Uuid::new_v4();
    let start = DateTime::parse_from_rfc3339(&req.start_time)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc);
    let end = DateTime::parse_from_rfc3339(&req.end_time)
        .unwrap_or_else(|_| Utc::now().into())
        .with_timezone(&Utc);
    match sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
        "mobile",
        "INSERT INTO oa_calendar_events (id, tenant_id, title, description, type, start_time, end_time, all_day, location, is_reminder, reminder_minutes, color, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *"
    ))
    .bind(id)
    .bind(&tid)
    .bind(&req.title)
    .bind(req.description)
    .bind(req.r#type.unwrap_or_else(|| "reminder".to_string()))
    .bind(start)
    .bind(end)
    .bind(req.all_day.unwrap_or(false))
    .bind(req.location)
    .bind(req.is_reminder.unwrap_or(false))
    .bind(req.reminder_minutes)
    .bind(req.color)
    .fetch_one(&pool)
    .await
    {
        Ok(e) => Json(ApiResponse::success(e, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建失败: {}", e))),
    }
}

pub async fn update_calendar_event(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<OaCalendarEvent>> {
    let title = req.get("title").and_then(|v| v.as_str().map(String::from));
    let description = req
        .get("description")
        .and_then(|v| v.as_str().map(String::from));
    let location = req
        .get("location")
        .and_then(|v| v.as_str().map(String::from));
    let color = req.get("color").and_then(|v| v.as_str().map(String::from));
    match sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
        "mobile",
        "UPDATE oa_calendar_events SET title = COALESCE($1, title), description = COALESCE($2, description), \
         location = COALESCE($3, location), color = COALESCE($4, color), updated_at = NOW() WHERE id = $5 RETURNING *"
    ))
    .bind(title)
    .bind(description)
    .bind(location)
    .bind(color)
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(e)) => Json(ApiResponse::success(e, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "事件不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新失败: {}", e))),
    }
}

pub async fn delete_calendar_event(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM oa_calendar_events WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "事件不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除失败: {}", e))),
    }
}

// ===== Tasks =====

pub async fn list_oa_tasks(
    State(pool): State<PgPool>,
    Query(q): Query<OaTaskQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid = tenant_id();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_tasks WHERE tenant_id = $1 \
         AND ($2::text IS NULL OR status = $2) \
         AND ($3::text IS NULL OR priority = $3) \
         ORDER BY created_at DESC LIMIT $4 OFFSET $5"
    ))
    .bind(&tid)
    .bind(q.status)
    .bind(q.priority)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "mobile",
                "SELECT COUNT(*) FROM oa_tasks WHERE tenant_id = $1"
            ))
            .bind(&tid)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                serde_json::json!({"items": rows, "total": total, "page": page, "page_size": page_size}),
                "ok",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn get_oa_task(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OaTask>> {
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_tasks WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => Json(ApiResponse::success(t, "ok")),
        Ok(None) => Json(ApiResponse::error(404, "任务不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn create_oa_task(
    State(pool): State<PgPool>,
    Json(req): Json<CreateOaTaskRequest>,
) -> Json<ApiResponse<OaTask>> {
    let tid = tenant_id();
    let id = Uuid::new_v4();
    let due = req.due_date.and_then(|d| {
        DateTime::parse_from_rfc3339(&d)
            .ok()
            .map(|dt| dt.with_timezone(&Utc))
    });
    let tags = req
        .tags
        .map(|t| serde_json::json!(t))
        .unwrap_or(serde_json::json!([]));
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "INSERT INTO oa_tasks (id, tenant_id, title, description, priority, status, assignee, due_date, tags, project_id, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,'todo',$6,$7,$8,$9,NOW(),NOW()) RETURNING *"
    ))
    .bind(id)
    .bind(&tid)
    .bind(&req.title)
    .bind(req.description)
    .bind(req.priority.unwrap_or_else(|| "medium".to_string()))
    .bind(req.assignee)
    .bind(due)
    .bind(tags)
    .bind(req.project_id)
    .fetch_one(&pool)
    .await
    {
        Ok(t) => Json(ApiResponse::success(t, "创建成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建失败: {}", e))),
    }
}

pub async fn update_oa_task(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<OaTask>> {
    let title = req.get("title").and_then(|v| v.as_str().map(String::from));
    let description = req
        .get("description")
        .and_then(|v| v.as_str().map(String::from));
    let status = req.get("status").and_then(|v| v.as_str().map(String::from));
    let priority = req
        .get("priority")
        .and_then(|v| v.as_str().map(String::from));
    let assignee = req
        .get("assignee")
        .and_then(|v| v.as_str().map(String::from));
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "UPDATE oa_tasks SET title = COALESCE($1, title), description = COALESCE($2, description), \
         status = COALESCE($3, status), priority = COALESCE($4, priority), assignee = COALESCE($5, assignee), \
         updated_at = NOW() WHERE id = $6 RETURNING *"
    ))
    .bind(title)
    .bind(description)
    .bind(status)
    .bind(priority)
    .bind(assignee)
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => Json(ApiResponse::success(t, "更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "任务不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新失败: {}", e))),
    }
}

pub async fn delete_oa_task(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM oa_tasks WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "任务不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除失败: {}", e))),
    }
}

pub async fn complete_oa_task(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OaTask>> {
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "UPDATE oa_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => Json(ApiResponse::success(t, "任务已完成")),
        Ok(None) => Json(ApiResponse::error(404, "任务不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("操作失败: {}", e))),
    }
}

// ===== Announcements =====

pub async fn list_announcements(
    State(pool): State<PgPool>,
    Query(q): Query<AnnouncementQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let tid = tenant_id();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    match sqlx::query_as::<_, OaAnnouncement>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_announcements WHERE tenant_id = $1 \
         AND ($2::text IS NULL OR priority = $2) \
         ORDER BY published_at DESC LIMIT $3 OFFSET $4"
    ))
    .bind(&tid)
    .bind(q.priority)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "mobile",
                "SELECT COUNT(*) FROM oa_announcements WHERE tenant_id = $1"
            ))
            .bind(&tid)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                serde_json::json!({"items": rows, "total": total, "page": page, "page_size": page_size}),
                "ok",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn get_announcement(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OaAnnouncement>> {
    match sqlx::query_as::<_, OaAnnouncement>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM oa_announcements WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(a)) => Json(ApiResponse::success(a, "ok")),
        Ok(None) => Json(ApiResponse::error(404, "公告不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询失败: {}", e))),
    }
}

pub async fn mark_announcement_read(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let user_id = "default_user".to_string();
    let _ = sqlx::query(only_own_schema_query!(
        "mobile",
        "INSERT INTO oa_announcement_reads (announcement_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
    ))
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await;
    Json(ApiResponse::success((), "已标记已读"))
}

// ===== OA Stats =====

pub async fn get_oa_stats(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    let tid = tenant_id();
    let meetings_today = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM oa_meetings WHERE tenant_id = $1 AND start_time::date = CURRENT_DATE"
    ))
    .bind(&tid)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let pending_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM oa_tasks WHERE tenant_id = $1 AND status != 'completed'"
    ))
    .bind(&tid)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let total_announcements = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM oa_announcements WHERE tenant_id = $1"
    ))
    .bind(&tid)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    Json(ApiResponse::success(
        serde_json::json!({
            "total_meetings_today": meetings_today,
            "upcoming_meetings": meetings_today,
            "meetings_this_week": meetings_today,
            "pending_tasks": pending_tasks,
            "completed_tasks_today": 0,
            "unread_announcements": total_announcements,
            "calendar_events_today": 0,
            "by_priority": [
                {"priority": "high", "count": 0},
                {"priority": "medium", "count": 0},
                {"priority": "low", "count": 0}
            ]
        }),
        "ok",
    ))
}
