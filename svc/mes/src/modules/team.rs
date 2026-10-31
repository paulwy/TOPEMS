use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{delete, get},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, sqlx::FromRow)]
struct TeamRow {
    id: Uuid,
    team_code: String,
    team_name: String,
    team_type: Option<String>,
    work_station_id: Option<Uuid>,
    leader_id: Option<String>,
    leader_name: Option<String>,
    member_count: Option<i32>,
    status: Option<String>,
    description: Option<String>,
    created_at: Option<DateTime<Utc>>,
    updated_at: Option<DateTime<Utc>>,
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/teams", get(list_teams).post(create_team))
        .route(
            "/teams/{id}",
            get(get_team).put(update_team).delete(delete_team),
        )
        .route(
            "/teams/{id}/members",
            get(get_team_members).post(add_team_member),
        )
        .route(
            "/teams/{id}/members/{member_id}",
            delete(remove_team_member),
        )
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListTeamsQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTeamRequest {
    pub team_code: String,
    pub team_name: String,
    pub team_type: Option<String>,
    pub work_station_id: Option<String>,
    pub leader_id: Option<String>,
    pub leader_name: Option<String>,
    pub description: Option<String>,
    pub members: Option<Vec<TeamMemberCreateRequest>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TeamMemberCreateRequest {
    pub employee_id: String,
    pub employee_name: String,
    pub employee_code: Option<String>,
    pub position: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTeamRequest {
    pub team_name: Option<String>,
    pub team_type: Option<String>,
    pub work_station_id: Option<String>,
    pub leader_id: Option<String>,
    pub leader_name: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TeamResponse {
    pub id: String,
    pub team_code: String,
    pub team_name: String,
    pub team_type: Option<String>,
    pub work_station_id: Option<String>,
    pub work_station_name: Option<String>,
    pub leader_id: Option<String>,
    pub leader_name: Option<String>,
    pub member_count: i32,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListTeamsResponse {
    pub teams: Vec<TeamResponse>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct TeamMemberResponse {
    pub id: String,
    pub team_id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub employee_code: Option<String>,
    pub position: Option<String>,
    pub join_date: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListTeamMembersResponse {
    pub members: Vec<TeamMemberResponse>,
}

fn naive_to_utc<T: Into<Option<DateTime<Utc>>>>(dt: T) -> DateTime<Utc> {
    dt.into().unwrap_or_else(Utc::now)
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:team:read"])),
    path = "/teams",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Team"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn list_teams(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListTeamsQuery>,
) -> ApiResponse<ListTeamsResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE t.deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND t.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (t.team_code ILIKE $1 OR t.team_name ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (t.team_code ILIKE ${} OR t.team_name ILIKE ${})",
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    // tenant 隔离（读路径 Claims bind，nil=全见）
    let tenant_ph = params.len() + 1;
    let tenant_filter = format!(
        "(${}::uuid = '00000000-0000-0000-0000-000000000000'::uuid OR t.tenant_id = ${}::uuid)",
        tenant_ph, tenant_ph
    );
    if where_clause.is_empty() {
        where_clause.push_str(&format!(" WHERE {}", tenant_filter));
    } else {
        where_clause.push_str(&format!(" AND {}", tenant_filter));
    }
    let tenant_uuid = get_tenant_id(&claims);

    let count_sql = format!("SELECT COUNT(*) as total FROM teams t{}", where_clause);

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        count_query = count_query.bind(p.as_str().unwrap_or(""));
    }
    count_query = count_query.bind(tenant_uuid);

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count teams: {}", e);
            return ApiResponse::server_error("获取班组列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            t.id, t.team_code, t.team_name, t.team_type, t.work_station_id,
            t.leader_id, t.leader_name, t.member_count, t.status, t.description,
            t.created_at, t.updated_at,
            COALESCE(ws.station_name, '') as work_station_name
        FROM teams t
        LEFT JOIN work_stations ws ON t.work_station_id = ws.id
        {}
        ORDER BY t.created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        // tenant 隔离占 1 位，LIMIT/OFFSET 顺延 N+1/N+2（无筛选时 LIMIT $1 会复用 tenant_uuid → uuid 类型错误 → 500）
        params.len() + 2,
        params.len() + 3
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        // params 仅由本函数 push 的 String 变体组成，as_str 恒有值；兜底空串仅为消除 unwrap（杜绝 panic），正常路径行为不变
        fetch_query = fetch_query.bind(p.as_str().unwrap_or(""));
    }
    fetch_query = fetch_query.bind(tenant_uuid).bind(page_size).bind(offset);

    let teams = match fetch_query.fetch_all(&state.pool).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to fetch teams: {}", e);
            return ApiResponse::server_error("获取班组列表失败");
        }
    };

    let teams: Vec<TeamResponse> = teams
        .into_iter()
        .map(|r| TeamResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            team_code: r.try_get::<String, _>("team_code").unwrap_or_default(),
            team_name: r.try_get::<String, _>("team_name").unwrap_or_default(),
            team_type: r.try_get::<Option<String>, _>("team_type").ok().flatten(),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            work_station_name: {
                let ws_name: String = r
                    .try_get::<String, _>("work_station_name")
                    .unwrap_or_default();
                if ws_name.is_empty() {
                    None
                } else {
                    Some(ws_name)
                }
            },
            leader_id: r
                .try_get::<Option<Uuid>, _>("leader_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            leader_name: r.try_get::<Option<String>, _>("leader_name").ok().flatten(),
            member_count: r
                .try_get::<Option<i32>, _>("member_count")
                .ok()
                .flatten()
                .unwrap_or(0),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "active".to_string()),
            description: r.try_get::<Option<String>, _>("description").ok().flatten(),
            created_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
            updated_at: (r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten())
            .unwrap_or_default(),
        })
        .collect();

    ApiResponse::success(
        ListTeamsResponse {
            teams,
            total: total.unwrap_or(0),
            page: page as i32,
            page_size: page_size as i32,
        },
        "获取班组列表成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:team:read"])),
    path = "/teams/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Team"
)]
pub async fn get_team(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<TeamResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            t.id, t.team_code, t.team_name, t.team_type, t.work_station_id,
            t.leader_id, t.leader_name, t.member_count, t.status, t.description,
            t.created_at, t.updated_at,
            ws.station_name as work_station_name
        FROM teams t
        LEFT JOIN work_stations ws ON t.work_station_id = ws.id
        WHERE t.id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch team: {}", e);
            return ApiResponse::server_error("获取班组失败");
        }
    };

    match result {
        Some(r) => {
            let team = TeamResponse {
                id: r.id.to_string(),
                team_code: r.team_code,
                team_name: r.team_name,
                team_type: r.team_type,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: Some(r.work_station_name),
                leader_id: r.leader_id.map(|u| u.to_string()),
                leader_name: r.leader_name,
                member_count: r.member_count,
                status: r.status,
                description: r.description,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            ApiResponse::success(team, "获取班组成功")
        }
        None => ApiResponse::not_found("班组不存在"),
    }
}

pub async fn create_team(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTeamRequest>,
) -> ApiResponse<TeamResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let now = Utc::now();

    let work_station_id: Option<Uuid> = req
        .work_station_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let leader_id: Option<Uuid> = req.leader_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query!(
        r#"
        INSERT INTO teams (
            team_code, team_name, team_type, work_station_id,
            leader_id, leader_name, member_count, status, description,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'active', $7, $8, $8)
        RETURNING 
            id, team_code, team_name, team_type, work_station_id,
            leader_id, leader_name, member_count, status, description,
            created_at, updated_at
        "#,
        req.team_code,
        req.team_name,
        req.team_type,
        work_station_id,
        leader_id,
        req.leader_name,
        req.description,
        Utc::now(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create team: {}", e);
            return ApiResponse::server_error("创建班组失败");
        }
    };

    if let Some(members) = req.members {
        for member in members {
            let emp_uuid = Uuid::parse_str(&member.employee_id).ok();
            let emp_uuid_arg = emp_uuid.as_ref().map(|u| u.to_string());
            let _ = sqlx::query!(
                r#"
                    INSERT INTO team_members (
                        team_id, employee_id, employee_name, employee_code, position, join_date
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    "#,
                result.id,
                emp_uuid_arg.as_deref(),
                member.employee_name,
                member.employee_code,
                member.position,
                now,
            )
            .execute(&state.pool)
            .await;
        }

        let _ = sqlx::query!(
            r#"
            UPDATE teams SET member_count = (
                SELECT COUNT(*) FROM team_members WHERE team_id = $1
            ), updated_at = $2 WHERE id = $1 AND tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000')
            "#,
            result.id,
            now,
        )
        .execute(&state.pool)
        .await;
    }

    let team = TeamResponse {
        id: result.id.to_string(),
        team_code: result.team_code,
        team_name: result.team_name,
        team_type: result.team_type,
        work_station_id: result.work_station_id.map(|u| u.to_string()),
        work_station_name: None,
        leader_id: result.leader_id.map(|u| u.to_string()),
        leader_name: result.leader_name,
        member_count: result.member_count,
        status: result.status,
        description: result.description,
        created_at: result.created_at,
        updated_at: result.updated_at,
    };

    ApiResponse::success(team, "班组创建成功")
}

pub async fn update_team(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateTeamRequest>,
) -> ApiResponse<TeamResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let work_station_id: Option<Uuid> = req
        .work_station_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    // leader_id 列为 uuid：必须按 Uuid 绑定，直接绑 String 会推断为 text 导致 COALESCE 类型不匹配
    let leader_id: Option<Uuid> = req.leader_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, TeamRow>(
        r#"
        UPDATE teams SET
            team_name = COALESCE($2, team_name),
            team_type = COALESCE($3, team_type),
            work_station_id = COALESCE($4, work_station_id),
            leader_id = COALESCE($5::uuid, leader_id),
            leader_name = COALESCE($6, leader_name),
            status = COALESCE($7, status),
            description = COALESCE($8, description),
            updated_at = $9
        WHERE id = $1 AND tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000')
        RETURNING 
            id, team_code, team_name, team_type, work_station_id,
            leader_id, leader_name, member_count, status, description,
            created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.team_name)
    .bind(req.team_type)
    .bind(work_station_id)
    .bind(leader_id)
    .bind(req.leader_name)
    .bind(req.status)
    .bind(req.description)
    .bind(Utc::now())
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update team: {}", e);
            return ApiResponse::server_error("更新班组失败");
        }
    };

    match result {
        Some(r) => {
            let team = TeamResponse {
                id: r.id.to_string(),
                team_code: r.team_code,
                team_name: r.team_name,
                team_type: r.team_type,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                work_station_name: None,
                leader_id: r.leader_id,
                leader_name: r.leader_name,
                member_count: r.member_count.unwrap_or(0),
                status: r.status.unwrap_or_else(|| "active".to_string()),
                description: Some(r.description).unwrap_or_default(),
                created_at: r.created_at.unwrap_or_else(Utc::now),
                updated_at: r.updated_at.unwrap_or_else(Utc::now),
            };
            ApiResponse::success(team, "班组更新成功")
        }
        None => ApiResponse::not_found("班组不存在"),
    }
}

pub async fn delete_team(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE teams SET deleted_at = NOW()
        WHERE id = $1 AND tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000')
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete team: {}", e);
            return ApiResponse::server_error("删除班组失败");
        }
    };

    if result.rows_affected() > 0 {
        ApiResponse::success("".to_string(), "班组删除成功")
    } else {
        ApiResponse::not_found("班组不存在")
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:team:read"])),
    path = "/teams/{id}/members",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Team"
)]
pub async fn get_team_members(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<ListTeamMembersResponse> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, team_id, employee_id, employee_name, employee_code,
            position, join_date, status
        FROM team_members
        WHERE team_id = $1 AND status = 'active'
        ORDER BY join_date DESC
        "#,
        id,
    )
    .fetch_all(&state.pool)
    .await;

    let members = match result {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("Failed to fetch team members: {}", e);
            return ApiResponse::server_error("获取班组成员失败");
        }
    };

    let members: Vec<TeamMemberResponse> = members
        .into_iter()
        .map(|r| TeamMemberResponse {
            id: r.id.to_string(),
            team_id: r.team_id.to_string(),
            employee_id: r.employee_id.to_string(),
            employee_name: r.employee_name,
            employee_code: r.employee_code,
            position: r.position,
            join_date: r.join_date.map(|d| d.to_rfc3339()),
            status: r.status.unwrap_or_else(|| "active".to_string()),
        })
        .collect();

    ApiResponse::success(ListTeamMembersResponse { members }, "获取班组成员成功")
}

pub async fn add_team_member(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<TeamMemberCreateRequest>,
) -> ApiResponse<TeamMemberResponse> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let _now = Utc::now();

    let employee_uuid = Uuid::parse_str(&req.employee_id).ok();
    let employee_uuid_arg = employee_uuid.as_ref().map(|u| u.to_string());

    let result = sqlx::query!(
        r#"
        INSERT INTO team_members (
            team_id, employee_id, employee_name, employee_code, position, join_date
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
            id, team_id, employee_id, employee_name, employee_code,
            position, join_date, status
        "#,
        id,
        employee_uuid_arg.as_deref(),
        req.employee_name,
        req.employee_code,
        req.position,
        Utc::now(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to add team member: {}", e);
            return ApiResponse::server_error("添加班组成员失败");
        }
    };

    let _ = sqlx::query!(
        r#"
        UPDATE teams SET member_count = (
            SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND status = 'active'
        ), updated_at = $2 WHERE id = $1 AND tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000')
        "#,
        id,
        Utc::now(),
    )
    .execute(&state.pool)
    .await;

    let member = TeamMemberResponse {
        id: result.id.to_string(),
        team_id: result.team_id.to_string(),
        employee_id: result.employee_id.to_string(),
        employee_name: result.employee_name,
        employee_code: result.employee_code,
        position: result.position,
        join_date: result.join_date.map(|d| d.to_rfc3339()),
        status: result.status.unwrap_or_else(|| "active".to_string()),
    };

    ApiResponse::success(member, "班组成员添加成功")
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:team:write"])),
    path = "/teams/{id}/members/{member_id}",
    params(
("id" = String, Path, description = "id"),
("member_id" = String, Path, description = "member_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "Team"
)]
pub async fn remove_team_member(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, member_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<String> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE team_members SET status = 'inactive'
        WHERE id = $1 AND team_id = $2
        "#,
        member_id,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to remove team member: {}", e);
            return ApiResponse::server_error("移除班组成员失败");
        }
    };

    if result.rows_affected() > 0 {
        let _ = sqlx::query!(
            r#"
            UPDATE teams SET member_count = (
                SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND status = 'active'
            ), updated_at = $2 WHERE id = $1 AND tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::uuid, '00000000-0000-0000-0000-000000000000')
            "#,
            id,
            Utc::now(),
        )
        .execute(&state.pool)
        .await;

        ApiResponse::success("".to_string(), "班组成员移除成功")
    } else {
        ApiResponse::not_found("班组成员不存在")
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 7, 1, 9, 45, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.date_naive(), dt.date_naive());
        assert_eq!(utc.time(), dt.time());
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    #[test]
    fn datetime_to_string_some_rfc3339() {
        let dt = Utc.with_ymd_and_hms(2024, 3, 1, 0, 0, 0).unwrap();
        let s = datetime_to_string(Some(dt));
        assert!(s.starts_with("2024-03-01T00:00:00"), "got {}", s);
    }

    #[test]
    fn datetime_to_string_none_valid() {
        let s = datetime_to_string(None);
        assert!(s.is_empty());
    }
}
