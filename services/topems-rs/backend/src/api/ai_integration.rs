use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::env;
use std::sync::Arc;
use uuid::Uuid;

use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AiAnalysis {
    pub id: Uuid,
    pub entity_type: String,
    pub entity_id: Uuid,
    pub analysis_type: String,
    pub prompt: String,
    pub response: String,
    pub ai_service_url: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAnalysisRequest {
    pub entity_type: String,
    pub entity_id: Uuid,
    pub analysis_type: String,
    pub prompt: String,
    pub created_by: String,
}

#[derive(Debug, Deserialize)]
pub struct AiChatRequest {
    pub query: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AiChatResponse {
    pub answer: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

#[derive(Debug, Deserialize)]
struct ListQueryParams {
    page: Option<i32>,
    page_size: Option<i32>,
}

pub fn create_routes() -> axum::Router<super::ApiState> {
    axum::Router::<super::ApiState>::new()
        .route("/api/v1/ai/analyses", axum::routing::get(list_analyses))
        .route("/api/v1/ai/analyses", axum::routing::post(create_analysis))
        .route("/api/v1/ai/analyses/{id}", axum::routing::get(get_analysis))
        .route("/api/v1/ai/chat", axum::routing::post(ai_chat))
        .route(
            "/api/v1/entities/{entity_type}/{entity_id}/analyses",
            axum::routing::get(get_entity_analyses),
        )
}

async fn list_analyses(
    State(state): State<super::ApiState>,
    axum::extract::Query(params): axum::extract::Query<ListQueryParams>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = ((page - 1) * page_size) as i64;

    let result: Result<Vec<AiAnalysis>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, analysis_type, prompt, response, ai_service_url, created_by, created_at
         FROM rs.ai_analyses
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2"
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    let total: Result<i64, sqlx::Error> = sqlx::query_scalar("SELECT COUNT(*) FROM rs.ai_analyses")
        .fetch_one(&state.db)
        .await;

    match (result, total) {
        (Ok(items), Ok(total_count)) => {
            let response = ApiResponse::success(
                PaginatedResponse {
                    items,
                    total: total_count,
                    page,
                    page_size,
                },
                "AI分析列表获取成功",
            );
            (StatusCode::OK, Json(response))
        }
        (_, Err(e)) | (Err(e), _) => {
            let response = ApiResponse::<PaginatedResponse<AiAnalysis>>::error(
                500,
                &format!("获取AI分析列表失败: {}", e),
            );
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

async fn create_analysis(
    State(state): State<super::ApiState>,
    Json(request): Json<CreateAnalysisRequest>,
) -> impl IntoResponse {
    let ai_service_url = env::var("AI_SERVICE_URL")
        .ok()
        .or_else(|| Some("http://localhost:8004".to_string()));

    let ai_response = match call_ai_service(&request.prompt, &ai_service_url).await {
        Ok(resp) => resp,
        Err(e) => {
            let response = ApiResponse::<AiAnalysis>::error(500, &format!("AI服务调用失败: {}", e));
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(response));
        }
    };

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result: Result<AiAnalysis, sqlx::Error> = sqlx::query_as(
        "INSERT INTO rs.ai_analyses (
            id, entity_type, entity_id, analysis_type, prompt, response, ai_service_url, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, entity_type, entity_id, analysis_type, prompt, response, ai_service_url, created_by, created_at"
    )
    .bind(id)
    .bind(&request.entity_type)
    .bind(request.entity_id)
    .bind(&request.analysis_type)
    .bind(&request.prompt)
    .bind(&ai_response)
    .bind(&ai_service_url)
    .bind(&request.created_by)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(analysis) => {
            let response = ApiResponse::success(analysis, "AI分析创建成功");
            (StatusCode::CREATED, Json(response))
        }
        Err(e) => {
            let response = ApiResponse::<AiAnalysis>::error(500, &format!("创建AI分析失败: {}", e));
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

async fn get_analysis(State(state): State<super::ApiState>, Path(id): Path<Uuid>) -> impl IntoResponse {
    let result: Result<Option<AiAnalysis>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, analysis_type, prompt, response, ai_service_url, created_by, created_at
         FROM rs.ai_analyses WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(analysis)) => {
            let response = ApiResponse::success(analysis, "获取AI分析成功");
            (StatusCode::OK, Json(response))
        }
        Ok(None) => {
            let response = ApiResponse::<AiAnalysis>::error(404, "AI分析不存在");
            (StatusCode::NOT_FOUND, Json(response))
        }
        Err(e) => {
            let response = ApiResponse::<AiAnalysis>::error(500, &format!("获取AI分析失败: {}", e));
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

async fn ai_chat(Json(request): Json<AiChatRequest>) -> impl IntoResponse {
    let ai_service_url = env::var("AI_SERVICE_URL")
        .ok()
        .or_else(|| Some("http://localhost:8004".to_string()));

    match call_ai_service(&request.query, &ai_service_url).await {
        Ok(answer) => {
            let response = ApiResponse::success(AiChatResponse { answer }, "AI聊天成功");
            (StatusCode::OK, Json(response))
        }
        Err(e) => {
            let response = ApiResponse::<AiChatResponse>::error(500, &format!("AI聊天失败: {}", e));
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

async fn get_entity_analyses(
    State(state): State<super::ApiState>,
    Path((entity_type, entity_id)): Path<(String, Uuid)>,
) -> impl IntoResponse {
    let result: Result<Vec<AiAnalysis>, sqlx::Error> = sqlx::query_as(
        "SELECT id, entity_type, entity_id, analysis_type, prompt, response, ai_service_url, created_by, created_at
         FROM rs.ai_analyses
         WHERE entity_type = $1 AND entity_id = $2
         ORDER BY created_at DESC"
    )
    .bind(entity_type)
    .bind(entity_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(analyses) => {
            let response = ApiResponse::success(analyses, "获取实体AI分析列表成功");
            (StatusCode::OK, Json(response))
        }
        Err(e) => {
            let response = ApiResponse::<Vec<AiAnalysis>>::error(
                500,
                &format!("获取实体AI分析列表失败: {}", e),
            );
            (StatusCode::INTERNAL_SERVER_ERROR, Json(response))
        }
    }
}

async fn call_ai_service(prompt: &str, ai_service_url: &Option<String>) -> Result<String, String> {
    let url = ai_service_url.as_deref().unwrap_or("http://localhost:8004");
    let client = Client::new();

    let request_body = serde_json::json!({
        "query": prompt
    });

    match client
        .post(&format!("{}/api/v1/ai/chat", url))
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => match resp.json::<serde_json::Value>().await {
            Ok(json) => {
                if let Some(answer) = json["data"]["answer"].as_str() {
                    Ok(answer.to_string())
                } else if let Some(answer) = json["answer"].as_str() {
                    Ok(answer.to_string())
                } else if let Some(data) = json["data"].as_str() {
                    Ok(data.to_string())
                } else {
                    Ok("AI服务返回了响应，但格式不符合预期".to_string())
                }
            }
            Err(e) => Err(format!("解析AI响应失败: {}", e)),
        },
        Ok(resp) => Err(format!("AI服务返回错误: {}", resp.status())),
        Err(e) => Err(format!("调用AI服务失败: {}", e)),
    }
}
