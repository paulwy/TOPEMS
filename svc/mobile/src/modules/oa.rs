#![allow(dead_code)]
//! 移动端 OA 办公协同（缺口#14）
//! meetings / calendar/events / tasks / announcements / oa/stats

use axum::extract::{Path, Query, State};
use axum::Json;
use chrono::{DateTime, Datelike, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::{response::ApiResponse, TopemsError};
use uuid::Uuid;

/// 默认租户：mobile.oa_* 的 tenant_id 列已是 uuid，绑 String 会报
/// `operator does not exist: uuid = text`，故统一用默认租户 UUID。
fn tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap_or(Uuid::nil())
}

// ===== 模型 =====

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OaMeeting {
    pub id: Uuid,
    pub tenant_id: Uuid,
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
    pub tenant_id: Uuid,
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
    pub tenant_id: Uuid,
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
    pub tenant_id: Uuid,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:meetings:read"])),
    path = "/meetings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "meetings"
)]
pub async fn list_meetings(
    State(pool): State<PgPool>,
    Query(q): Query<MeetingQuery>,
) -> ApiResponse<serde_json::Value> {
    let tid = tenant_id();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_meetings WHERE tenant_id = $1 \
         AND ($2::text IS NULL OR status = $2) \
         ORDER BY start_time DESC LIMIT $3 OFFSET $4"
    ))
    .bind(tid)
    .bind(q.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "mobile",
                "SELECT COUNT(*) FROM mobile.oa_meetings WHERE tenant_id = $1"
            ))
            .bind(tid)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                serde_json::json!({"items": rows, "total": total, "page": page, "page_size": page_size}),
                "ok",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:meetings:read"])),
    path = "/meetings/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "meetings"
)]
pub async fn get_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OaMeeting> {
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_meetings WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => ApiResponse::success(m, "ok"),
        Ok(None) => ApiResponse::not_found("会议不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

pub async fn create_meeting(
    State(pool): State<PgPool>,
    Json(req): Json<CreateMeetingRequest>,
) -> ApiResponse<OaMeeting> {
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
        "INSERT INTO mobile.oa_meetings (id, tenant_id, title, description, type, status, start_time, end_time, location, video_url, attendees, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,'scheduled',$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING *"
    ))
    .bind(id)
    .bind(tid)
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
        Ok(m) => ApiResponse::success(m, "创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建失败", e)),
    }
}

pub async fn update_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<OaMeeting> {
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
        "UPDATE mobile.oa_meetings SET title = COALESCE($1, title), description = COALESCE($2, description), \
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
        Ok(Some(m)) => ApiResponse::success(m, "更新成功"),
        Ok(None) => ApiResponse::not_found("会议不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

pub async fn delete_meeting(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> ApiResponse<()> {
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM mobile.oa_meetings WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除成功"),
        Ok(_) => ApiResponse::not_found("会议不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:meetings:write"])),
    path = "/meetings/{id}/join",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "meetings"
)]
pub async fn join_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OaMeeting> {
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.oa_meetings SET status = 'in_progress', updated_at = NOW() WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => ApiResponse::success(m, "已加入会议"),
        Ok(None) => ApiResponse::not_found("会议不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("操作失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:meetings:write"])),
    path = "/meetings/{id}/leave",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "meetings"
)]
pub async fn leave_meeting(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OaMeeting> {
    match sqlx::query_as::<_, OaMeeting>(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.oa_meetings SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(m)) => ApiResponse::success(m, "已离开会议"),
        Ok(None) => ApiResponse::not_found("会议不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("操作失败", e)),
    }
}

// ===== Calendar Events =====

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:calendar:read"])),
    path = "/calendar/events",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "calendar"
)]
pub async fn list_calendar_events(
    State(pool): State<PgPool>,
    Query(_q): Query<CalendarEventQuery>,
) -> ApiResponse<Vec<OaCalendarEvent>> {
    let tid = tenant_id();
    match sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_calendar_events WHERE tenant_id = $1 ORDER BY start_time DESC LIMIT 100"
    ))
    .bind(tid)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => ApiResponse::success(rows, "ok"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

// ===== schedule 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

async fn fetch_events_in_range(
    pool: &PgPool,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> Result<Vec<OaCalendarEvent>, sqlx::Error> {
    let tid = tenant_id();
    sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_calendar_events WHERE tenant_id = $1 AND start_time >= $2 AND start_time < $3 ORDER BY start_time ASC"
    ))
    .bind(tid)
    .bind(start)
    .bind(end)
    .fetch_all(pool)
    .await
}

/// 事件详情（前端 GET /schedule/events/{id}）
pub async fn get_schedule_event(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> ApiResponse<Option<OaCalendarEvent>> {
    let tid = tenant_id();
    match sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_calendar_events WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tid)
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(row) => ApiResponse::success(row, "ok"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

/// 今日事件（前端 GET /schedule/events/today）
pub async fn list_today_events(State(pool): State<PgPool>) -> ApiResponse<Vec<OaCalendarEvent>> {
    let now = chrono::Utc::now();
    let start = DateTime::<Utc>::from_naive_utc_and_offset(
        now.date_naive().and_hms_opt(0, 0, 0).unwrap(),
        Utc,
    );
    let end = start + chrono::Duration::days(1);
    match fetch_events_in_range(&pool, start, end).await {
        Ok(rows) => ApiResponse::success(rows, "ok"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

/// 本周事件（前端 GET /schedule/events/week）
pub async fn list_week_events(State(pool): State<PgPool>) -> ApiResponse<Vec<OaCalendarEvent>> {
    let now = chrono::Utc::now();
    let today = now.date_naive();
    let weekday = today.weekday().num_days_from_monday();
    let monday = today - chrono::Duration::days(i64::from(weekday));
    let start =
        DateTime::<Utc>::from_naive_utc_and_offset(monday.and_hms_opt(0, 0, 0).unwrap(), Utc);
    let end = start + chrono::Duration::days(7);
    match fetch_events_in_range(&pool, start, end).await {
        Ok(rows) => ApiResponse::success(rows, "ok"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[derive(Debug, Deserialize)]
pub struct MonthEventParams {
    pub year: Option<i32>,
    pub month: Option<i32>,
}

/// 本月事件（前端 GET /schedule/events/month?year=&month=）
pub async fn list_month_events(
    State(pool): State<PgPool>,
    Query(params): Query<MonthEventParams>,
) -> ApiResponse<Vec<OaCalendarEvent>> {
    let now = chrono::Utc::now();
    let year = params.year.unwrap_or(now.year());
    let month = params
        .month
        .unwrap_or(i32::try_from(now.month()).unwrap_or(1))
        .clamp(1, 12);
    let start = DateTime::<Utc>::from_naive_utc_and_offset(
        chrono::NaiveDate::from_ymd_opt(year, u32::try_from(month.clamp(1, 12)).unwrap_or(1), 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        Utc,
    );
    let end = if month == 12 {
        DateTime::<Utc>::from_naive_utc_and_offset(
            chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            Utc,
        )
    } else {
        DateTime::<Utc>::from_naive_utc_and_offset(
            chrono::NaiveDate::from_ymd_opt(
                year,
                u32::try_from((month + 1).clamp(1, 12)).unwrap_or(1),
                1,
            )
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
            Utc,
        )
    };
    match fetch_events_in_range(&pool, start, end).await {
        Ok(rows) => ApiResponse::success(rows, "ok"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[derive(Debug, Deserialize)]
pub struct MyEventsParams {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// 我的事件（前端 GET /schedule/events/my → 查表全量分页）
pub async fn list_my_events(
    State(pool): State<PgPool>,
    Query(params): Query<MyEventsParams>,
) -> ApiResponse<serde_json::Value> {
    let tid = tenant_id();
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let start_filter = params.start_date.unwrap_or_default();
    let end_filter = params.end_date.unwrap_or_default();

    let events: Vec<OaCalendarEvent> =
        match sqlx::query_as::<_, OaCalendarEvent>(only_own_schema_query!(
            "mobile",
            "SELECT * FROM mobile.oa_calendar_events WHERE tenant_id = $1
             AND ($2::text = '' OR start_time::date >= $2::date)
             AND ($3::text = '' OR start_time::date <= $3::date)
             ORDER BY start_time DESC LIMIT $4 OFFSET $5"
        ))
        .bind(tid)
        .bind(&start_filter)
        .bind(&end_filter)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                return ApiResponse::from(TopemsError::internal("查询失败", e));
            }
        };

    ApiResponse::success(
        serde_json::json!({ "items": events, "total": events.len() }),
        "ok",
    )
}

/// 我参与的事件（前端 GET /schedule/events/attending → 空列表占位，需 attendees 表）
pub async fn list_attending_events() -> ApiResponse<Vec<OaCalendarEvent>> {
    ApiResponse::success(Vec::new(), "ok")
}

/// 更新事件状态（前端 PUT /schedule/events/{id}/status → 占位兜底）
pub async fn update_event_status(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(payload): Json<serde_json::Value>,
) -> ApiResponse<()> {
    let tid = tenant_id();
    let status = payload
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("confirmed");
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.oa_calendar_events SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tid)
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(_) => ApiResponse::success(
            (),
            &("事件状态已更新（占位：status=".to_owned() + status + "）"),
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

/// 添加参与者（前端 POST /schedule/events/{id}/attendees → 占位兜底）
pub async fn add_event_attendee(
    State(pool): State<PgPool>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(_payload): Json<serde_json::Value>,
) -> ApiResponse<()> {
    let tid = tenant_id();
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.oa_calendar_events SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tid)
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(_) => ApiResponse::success((), "参与者已添加（占位实现，待 attendees 表）"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

/// 移除参与者（前端 DELETE /schedule/events/{id}/attendees/{userId} → 占位兜底）
pub async fn remove_event_attendee(
    State(pool): State<PgPool>,
    axum::extract::Path((id, _user_id)): axum::extract::Path<(Uuid, String)>,
) -> ApiResponse<()> {
    let tid = tenant_id();
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.oa_calendar_events SET updated_at = NOW() WHERE tenant_id = $1 AND id = $2"
    ))
    .bind(tid)
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(_) => ApiResponse::success((), "参与者已移除（占位实现，待 attendees 表）"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

pub async fn create_calendar_event(
    State(pool): State<PgPool>,
    Json(req): Json<CreateCalendarEventRequest>,
) -> ApiResponse<OaCalendarEvent> {
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
        "INSERT INTO mobile.oa_calendar_events (id, tenant_id, title, description, type, start_time, end_time, all_day, location, is_reminder, reminder_minutes, color, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW()) RETURNING *"
    ))
    .bind(id)
    .bind(tid)
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
        Ok(e) => ApiResponse::success(e, "创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mobile:calendar:write"])),
    path = "/calendar/events/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "calendar"
)]
pub async fn update_calendar_event(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<OaCalendarEvent> {
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
        "UPDATE mobile.oa_calendar_events SET title = COALESCE($1, title), description = COALESCE($2, description), \
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
        Ok(Some(e)) => ApiResponse::success(e, "更新成功"),
        Ok(None) => ApiResponse::not_found("事件不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

pub async fn delete_calendar_event(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM mobile.oa_calendar_events WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除成功"),
        Ok(_) => ApiResponse::not_found("事件不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}

// ===== Tasks =====

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:tasks:read"])),
    path = "/tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tasks"
)]
pub async fn list_oa_tasks(
    State(pool): State<PgPool>,
    Query(q): Query<OaTaskQuery>,
) -> ApiResponse<serde_json::Value> {
    let tid = tenant_id();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_tasks WHERE tenant_id = $1 \
         AND ($2::text IS NULL OR status = $2) \
         AND ($3::text IS NULL OR priority = $3) \
         ORDER BY created_at DESC LIMIT $4 OFFSET $5"
    ))
    .bind(tid)
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
                "SELECT COUNT(*) FROM mobile.oa_tasks WHERE tenant_id = $1"
            ))
            .bind(tid)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                serde_json::json!({"items": rows, "total": total, "page": page, "page_size": page_size}),
                "ok",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:tasks:read"])),
    path = "/tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tasks"
)]
pub async fn get_oa_task(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> ApiResponse<OaTask> {
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_tasks WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => ApiResponse::success(t, "ok"),
        Ok(None) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

pub async fn create_oa_task(
    State(pool): State<PgPool>,
    Json(req): Json<CreateOaTaskRequest>,
) -> ApiResponse<OaTask> {
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
        "INSERT INTO mobile.oa_tasks (id, tenant_id, title, description, priority, status, assignee, due_date, tags, project_id, created_at, updated_at) \
         VALUES ($1,$2,$3,$4,$5,'todo',$6,$7,$8,$9,NOW(),NOW()) RETURNING *"
    ))
    .bind(id)
    .bind(tid)
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
        Ok(t) => ApiResponse::success(t, "创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建失败", e)),
    }
}

pub async fn update_oa_task(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<OaTask> {
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
        "UPDATE mobile.oa_tasks SET title = COALESCE($1, title), description = COALESCE($2, description), \
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
        Ok(Some(t)) => ApiResponse::success(t, "更新成功"),
        Ok(None) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新失败", e)),
    }
}

pub async fn delete_oa_task(State(pool): State<PgPool>, Path(id): Path<Uuid>) -> ApiResponse<()> {
    match sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM mobile.oa_tasks WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(r) if r.rows_affected() > 0 => ApiResponse::success((), "删除成功"),
        Ok(_) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:tasks:write"])),
    path = "/tasks/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "tasks"
)]
pub async fn complete_oa_task(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OaTask> {
    match sqlx::query_as::<_, OaTask>(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.oa_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => ApiResponse::success(t, "任务已完成"),
        Ok(None) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("操作失败", e)),
    }
}

// ===== Announcements =====

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:announcements:read"])),
    path = "/announcements",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "announcements"
)]
pub async fn list_announcements(
    State(pool): State<PgPool>,
    Query(q): Query<AnnouncementQuery>,
) -> ApiResponse<serde_json::Value> {
    let tid = tenant_id();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    match sqlx::query_as::<_, OaAnnouncement>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_announcements WHERE tenant_id = $1 \
         AND ($2::text IS NULL OR priority = $2) \
         ORDER BY published_at DESC LIMIT $3 OFFSET $4"
    ))
    .bind(tid)
    .bind(q.priority)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "mobile",
                "SELECT COUNT(*) FROM mobile.oa_announcements WHERE tenant_id = $1"
            ))
            .bind(tid)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);
            ApiResponse::success(
                serde_json::json!({"items": rows, "total": total, "page": page, "page_size": page_size}),
                "ok",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:announcements:read"])),
    path = "/announcements/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "announcements"
)]
pub async fn get_announcement(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<OaAnnouncement> {
    match sqlx::query_as::<_, OaAnnouncement>(only_own_schema_query!(
        "mobile",
        "SELECT * FROM mobile.oa_announcements WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(a)) => ApiResponse::success(a, "ok"),
        Ok(None) => ApiResponse::not_found("公告不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:announcements:write"])),
    path = "/announcements/{id}/read",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "announcements"
)]
pub async fn mark_announcement_read(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let user_id = "default_user".to_string();
    let _ = sqlx::query(only_own_schema_query!(
        "mobile",
        "INSERT INTO mobile.oa_announcement_reads (announcement_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
    ))
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await;
    ApiResponse::success((), "已标记已读")
}

// ===== OA Stats =====

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:task:read"])),
    path = "/oa/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "task"
)]
pub async fn get_oa_stats(State(pool): State<PgPool>) -> ApiResponse<serde_json::Value> {
    let tid = tenant_id();
    let meetings_today = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM mobile.oa_meetings WHERE tenant_id = $1 AND start_time::date = CURRENT_DATE"
    ))
    .bind(tid)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let pending_tasks = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM mobile.oa_tasks WHERE tenant_id = $1 AND status != 'completed'"
    ))
    .bind(tid)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    let total_announcements = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "mobile",
        "SELECT COUNT(*) FROM mobile.oa_announcements WHERE tenant_id = $1"
    ))
    .bind(tid)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    ApiResponse::success(
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
    )
}
