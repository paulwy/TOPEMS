#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use uuid::Uuid;

use topems_shared_core::response::ApiResponse;
use topems_shared_db::repository::ListQueryParams;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(flatten)]
    pub base: ListQueryParams,
    pub status: Option<String>,
    pub project_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Patent {
    pub id: Uuid,
    pub project_id: Option<Uuid>,
    pub name: String,
    pub patent_number: Option<String>,
    pub application_date: Option<chrono::DateTime<chrono::Utc>>,
    pub grant_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub r#type: Option<String>,
    pub inventors: serde_json::Value,
    pub assignee: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "abstract")]
    #[sqlx(rename = "abstract")]
    pub patent_abstract: Option<String>,
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
    #[serde(rename = "type")]
    pub patent_type: Option<String>,
    pub inventors: Vec<String>,
    pub assignee: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "abstract")]
    pub patent_abstract: Option<String>,
    pub created_by: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePatentRequest {
    pub name: Option<String>,
    pub patent_number: Option<String>,
    pub application_date: Option<String>,
    pub grant_date: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "type")]
    pub patent_type: Option<String>,
    pub inventors: Option<Vec<String>>,
    pub assignee: Option<String>,
    pub description: Option<String>,
    #[serde(rename = "abstract")]
    pub patent_abstract: Option<String>,
}

pub fn create_routes() -> Router<crate::modules::ApiState> {
    Router::<crate::modules::ApiState>::new()
        .route("/patents", get(list_patents).post(create_patent))
        .route(
            "/patents/{id}",
            get(get_patent).put(update_patent).delete(delete_patent),
        )
        .route(
            "/patents/project/{project_id}",
            get(list_patents_by_project),
        )
}

fn row_to_patent(row: sqlx::postgres::PgRow) -> Patent {
    Patent {
        id: row.get(0),
        project_id: row.get(1),
        name: row.get(2),
        patent_number: row.get(3),
        application_date: row.get(4),
        grant_date: row.get(5),
        status: row.get(6),
        r#type: row.get(7),
        inventors: row.get(8),
        assignee: row.get(9),
        description: row.get(10),
        patent_abstract: row.get(11),
        created_by: row.get(12),
        created_at: row.get(13),
        updated_at: row.get(14),
    }
}

pub async fn list_patents(
    State(_state): State<crate::modules::ApiState>,
    Query(params): Query<ListParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query(
        r#"
        SELECT id, project_id, name, patent_number, application_date, grant_date,
               status, type, inventors, assignee, description, abstract,
               created_by, created_at, updated_at
        FROM rs.patents
        WHERE ($1::text IS NULL OR name ILIKE $1 OR patent_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR project_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.base.search)
    .bind(&params.status)
    .bind(params.project_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let patents: Vec<Patent> = rows.into_iter().map(row_to_patent).collect();
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.patents
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR patent_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR project_id = $3)
                "#,
            )
            .bind(&params.base.search)
            .bind(&params.status)
            .bind(params.project_id)
            .fetch_one(&mut **txn)
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

pub async fn list_patents_by_project(
    State(_state): State<crate::modules::ApiState>,
    Path(project_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<Patent>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(
        r#"
        SELECT id, project_id, name, patent_number, application_date, grant_date,
               status, type, inventors, assignee, description, abstract,
               created_by, created_at, updated_at
        FROM rs.patents
        WHERE project_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let patents: Vec<Patent> = rows.into_iter().map(row_to_patent).collect();
            Json(ApiResponse::success(patents, "获取项目专利列表成功"))
        }
        Err(e) => {
            tracing::error!("获取项目专利列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目专利列表失败"))
        }
    }
}

pub async fn create_patent(
    State(_state): State<crate::modules::ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreatePatentRequest>,
) -> Json<ApiResponse<Patent>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Patent>(
        r#"
        INSERT INTO rs.patents (
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
    .bind(&req.patent_type)
    .bind(serde_json::to_value(req.inventors).unwrap_or(serde_json::Value::Array(vec![])))
    .bind(&req.assignee)
    .bind(&req.description)
    .bind(&req.patent_abstract)
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(patent) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(patent, "专利创建成功"))
        }
        Err(e) => {
            tracing::error!("创建专利失败: {}", e);
            Json(ApiResponse::error(500, "专利创建失败"))
        }
    }
}

pub async fn get_patent(
    State(_state): State<crate::modules::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Patent>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(
        r#"
        SELECT id, project_id, name, patent_number, application_date, grant_date,
               status, type, inventors, assignee, description, abstract,
               created_by, created_at, updated_at
        FROM rs.patents WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(row_to_patent(row), "获取专利成功")),
        Ok(None) => Json(ApiResponse::error(404, "专利不存在")),
        Err(e) => {
            tracing::error!("获取专利失败: {}", e);
            Json(ApiResponse::error(500, "获取专利失败"))
        }
    }
}

pub async fn update_patent(
    State(_state): State<crate::modules::ApiState>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdatePatentRequest>,
) -> Json<ApiResponse<Patent>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing_result = sqlx::query(
        "SELECT id, name, patent_number, application_date, grant_date, status, type, inventors, assignee, description, abstract, created_by, created_at, updated_at FROM rs.patents WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing_result {
        Ok(Some(r)) => row_to_patent(r),
        Ok(None) => return Json(ApiResponse::error(404, "专利不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询专利失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let patent_number = req.patent_number.or(existing.patent_number);
    let status = req.status.unwrap_or(existing.status);
    let inventors = req
        .inventors
        .and_then(|v| serde_json::to_value(v).ok())
        .unwrap_or(existing.inventors);
    let assignee = req.assignee.or(existing.assignee);
    let description = req.description.or(existing.description);
    let abstract_text = req.patent_abstract.or(existing.patent_abstract);
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE rs.patents SET
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
    .bind(&req.patent_type)
    .bind(inventors)
    .bind(assignee)
    .bind(description)
    .bind(abstract_text)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(row_to_patent(row), "专利更新成功")),
        Err(e) => {
            tracing::error!("更新专利失败: {}", e);
            Json(ApiResponse::error(500, "专利更新失败"))
        }
    }
}

pub async fn delete_patent(
    State(_state): State<crate::modules::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query("UPDATE rs.patents SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "专利删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "专利不存在")),
        Err(e) => {
            tracing::error!("删除专利失败: {}", e);
            Json(ApiResponse::error(500, "专利删除失败"))
        }
    }
}
