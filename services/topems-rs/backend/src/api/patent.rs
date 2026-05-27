use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
}

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Patent {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub patent_number: Option<String>,
    pub application_date: Option<chrono::DateTime<chrono::Utc>>,
    pub grant_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub r#type: Option<String>,
    pub inventors: serde_json::Value,
    pub assignee: Option<String>,
    pub description: Option<String>,
    pub abstract: Option<String>,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePatentRequest {
    pub name: String,
    pub patent_number: Option<String>,
    pub project_id: Option<Uuid>,
    pub application_date: Option<String>,
    pub grant_date: Option<String>,
    pub status: String,
    pub r#type: Option<String>,
    pub inventors: Vec<String>,
    pub assignee: Option<String>,
    pub description: Option<String>,
    pub abstract: Option<String>,
    pub created_by: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePatentRequest {
    pub name: Option<String>,
    pub patent_number: Option<String>,
    pub application_date: Option<String>,
    pub grant_date: Option<String>,
    pub status: Option<String>,
    pub r#type: Option<String>,
    pub inventors: Option<Vec<String>>,
    pub assignee: Option<String>,
    pub description: Option<String>,
    pub abstract: Option<String>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/patents", get(list_patents).post(create_patent))
        .route(
            "/api/v1/patents/{id}",
            get(get_patent).put(update_patent).delete(delete_patent),
        )
        .route("/api/v1/patents/project/{project_id}", get(list_patents_by_project))
        .with_state(state);

    Ok(app)
}

async fn list_patents(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Patent>(
        r#"
        SELECT id, project_id, name, patent_number, application_date, grant_date,
               status, type, inventors, assignee, description, abstract,
               created_by, created_at, updated_at
        FROM patents
        WHERE ($1::text IS NULL OR name ILIKE $1 OR patent_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR project_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.search)
    .bind(&params.status)
    .bind(params.project_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(patents) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM patents
                WHERE ($1::text IS NULL OR name ILIKE $1 OR patent_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR project_id = $3)
                "#,
            )
            .bind(&params.search)
            .bind(&params.status)
            .bind(params.project_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "patents": patents,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取专利列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取专利列表失败: {}", e);
            Json(ApiResponse::error(500, "获取专利列表失败"))
        }
    }
}

async fn list_patents_by_project(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Patent>>> {
    let result = sqlx::query_as::<_, Patent>(
        r#"
        SELECT id, project_id, name, patent_number, application_date, grant_date,
               status, type, inventors, assignee, description, abstract,
               created_by, created_at, updated_at
        FROM patents
        WHERE project_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(patents) => Json(ApiResponse::success(patents, "获取项目专利列表成功")),
        Err(e) => {
            tracing::error!("获取项目专利列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目专利列表失败"))
        }
    }
}

async fn create_patent(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreatePatentRequest>,
) -> Json<ApiResponse<Patent>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Patent>(
        r#"
        INSERT INTO patents (
            id, name, patent_number, project_id, application_date, grant_date,
            status, type, inventors, assignee, description, abstract, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, project_id, name, patent_number, application_date, grant_date,
                  status, type, inventors, assignee, description, abstract,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.patent_number)
    .bind(req.project_id)
    .bind(req.application_date)
    .bind(req.grant_date)
    .bind(&req.status)
    .bind(&req.r#type)
    .bind(serde_json::to_value(req.inventors).unwrap())
    .bind(&req.assignee)
    .bind(&req.description)
    .bind(&req.abstract)
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(patent) => Json(ApiResponse::success(patent, "专利创建成功")),
        Err(e) => {
            tracing::error!("创建专利失败: {}", e);
            Json(ApiResponse::error(500, "专利创建失败"))
        }
    }
}

async fn get_patent(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Patent>> {
    let result = sqlx::query_as::<_, Patent>(
        r#"
        SELECT id, project_id, name, patent_number, application_date, grant_date,
               status, type, inventors, assignee, description, abstract,
               created_by, created_at, updated_at
        FROM patents WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(patent)) => Json(ApiResponse::success(patent, "获取专利成功")),
        Ok(None) => Json(ApiResponse::error(404, "专利不存在")),
        Err(e) => {
            tracing::error!("获取专利失败: {}", e);
            Json(ApiResponse::error(500, "获取专利失败"))
        }
    }
}

async fn update_patent(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePatentRequest>,
) -> Json<ApiResponse<Patent>> {
    let existing = sqlx::query_as::<_, Patent>(
        "SELECT id, name, patent_number, application_date, grant_date, status, type, inventors, assignee, description, abstract, created_by, created_at, updated_at FROM patents WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "专利不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询专利失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let patent_number = req.patent_number.or(existing.patent_number);
    let status = req.status.unwrap_or(existing.status);
    let inventors = req.inventors.map(|v| serde_json::to_value(v).unwrap()).unwrap_or(existing.inventors);
    let assignee = req.assignee.or(existing.assignee);
    let description = req.description.or(existing.description);
    let abstract_text = req.abstract.or(existing.abstract);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Patent>(
        r#"
        UPDATE patents SET
            name = $2, patent_number = $3, status = $4, type = $5,
            inventors = $6, assignee = $7, description = $8, abstract = $9,
            updated_at = $10
        WHERE id = $1
        RETURNING id, project_id, name, patent_number, application_date, grant_date,
                  status, type, inventors, assignee, description, abstract,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(patent_number)
    .bind(&status)
    .bind(&req.r#type)
    .bind(inventors)
    .bind(assignee)
    .bind(description)
    .bind(abstract_text)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(patent) => Json(ApiResponse::success(patent, "专利更新成功")),
        Err(e) => {
            tracing::error!("更新专利失败: {}", e);
            Json(ApiResponse::error(500, "专利更新失败"))
        }
    }
}

async fn delete_patent(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM patents WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "专利删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "专利不存在")),
        Err(e) => {
            tracing::error!("删除专利失败: {}", e);
            Json(ApiResponse::error(500, "专利删除失败"))
        }
    }
}