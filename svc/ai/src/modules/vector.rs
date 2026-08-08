use axum::{
    extract::{Path, State},
    Extension, Json,
};
use std::time::Instant;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::modules::models::*;
use crate::shared::AppState;

pub struct VectorApi;

impl VectorApi {
    /// POST /api/vectors/store - 存储文档向量
    pub async fn store(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<StoreVectorRequest>,
    ) -> Json<ApiResponse<StoreVectorResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let vector_req = crate::services::vector::SaveVectorRequest {
            document_id: req.document_id,
            chunk_id: req.chunk_id,
            chunk_index: req.chunk_index,
            content: req.content.clone(),
            embedding: req.embedding.clone(),
        };

        match state
            .vector_service
            .save_vectors(&[vector_req], tenant_id)
            .await
        {
            Ok(_) => Json(ApiResponse::success(
                StoreVectorResponse {
                    vector_id: Uuid::new_v4(),
                    message: "向量存储成功".to_string(),
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<StoreVectorResponse>::error(
                500,
                &e.to_string(),
            )),
        }
    }

    /// POST /api/vectors/search - 向量相似度搜索
    pub async fn search(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<VectorSearchRequest>,
    ) -> Json<ApiResponse<VectorSearchResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let start = Instant::now();

        // 注意：这里需要生成查询向量
        // 实际应用中需要调用嵌入模型 API
        let query_embedding: Vec<f32> = vec![0.0; 768]; // 示例向量

        let top_k = req.top_k.unwrap_or(10);

        match state
            .vector_service
            .search_similar(&query_embedding, top_k, tenant_id)
            .await
        {
            Ok(results) => {
                let query_time_ms = start.elapsed().as_millis() as u64;

                Json(ApiResponse::success(
                    VectorSearchResponse {
                        results,
                        query_time_ms,
                    },
                    "Success",
                ))
            }
            Err(e) => Json(ApiResponse::<VectorSearchResponse>::error(
                500,
                &e.to_string(),
            )),
        }
    }

    /// GET /api/vectors/{id} - 获取向量信息
    pub async fn get(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        Extension(claims): Extension<Claims>,
    ) -> Json<ApiResponse<crate::services::vector::VectorEmbedding>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        match state.vector_service.get_vector(id, tenant_id).await {
            Ok(Some(vec)) => Json(ApiResponse::success(vec, "Success")),
            Ok(None) => Json(
                ApiResponse::<crate::services::vector::VectorEmbedding>::error(404, "向量不存在"),
            ),
            Err(e) => Json(
                ApiResponse::<crate::services::vector::VectorEmbedding>::error(500, &e.to_string()),
            ),
        }
    }

    /// DELETE /api/vectors/{id} - 删除向量
    pub async fn delete(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        Extension(claims): Extension<Claims>,
    ) -> Json<ApiResponse<String>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        match state.vector_service.delete_vector(id, tenant_id).await {
            Ok(true) => Json(ApiResponse::success("向量已删除".to_string(), "Success")),
            Ok(false) => Json(ApiResponse::<String>::error(404, "向量不存在")),
            Err(e) => Json(ApiResponse::<String>::error(500, &e.to_string())),
        }
    }

    /// POST /api/vectors/batch-store - 批量存储向量
    pub async fn batch_store(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<BatchStoreVectorsRequest>,
    ) -> Json<ApiResponse<BatchStoreVectorsResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let vectors: Vec<crate::services::vector::SaveVectorRequest> = req
            .vectors
            .into_iter()
            .map(|v| crate::services::vector::SaveVectorRequest {
                document_id: v.document_id,
                chunk_id: v.chunk_id,
                chunk_index: v.chunk_index,
                content: v.content,
                embedding: v.embedding,
            })
            .collect();

        match state.vector_service.save_vectors(&vectors, tenant_id).await {
            Ok(_) => Json(ApiResponse::success(
                BatchStoreVectorsResponse {
                    stored_count: vectors.len() as i32,
                    message: format!("成功存储 {} 个向量", vectors.len()),
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<BatchStoreVectorsResponse>::error(
                500,
                &e.to_string(),
            )),
        }
    }

    /// POST /api/vectors/hybrid-search - 混合检索（向量+关键词）
    pub async fn hybrid_search(
        State(state): State<AppState>,
        Extension(claims): Extension<Claims>,
        Json(req): Json<HybridSearchRequest>,
    ) -> Json<ApiResponse<HybridSearchResponse>> {
        let tenant_id = crate::modules::qa::get_tenant_id(&claims);
        let start = Instant::now();

        // 注意：这里需要生成查询向量
        let query_embedding: Vec<f32> = vec![0.0; 768]; // 示例向量

        let top_k = req.top_k.unwrap_or(10);
        let vector_weight = req.vector_weight.unwrap_or(0.7);
        let keyword_weight = req.keyword_weight.unwrap_or(0.3);

        match state
            .vector_service
            .hybrid_search(
                &query_embedding,
                &req.query,
                top_k,
                vector_weight,
                keyword_weight,
                tenant_id,
            )
            .await
        {
            Ok(results) => {
                let query_time_ms = start.elapsed().as_millis() as u64;

                Json(ApiResponse::success(
                    HybridSearchResponse {
                        results,
                        query_time_ms,
                    },
                    "Success",
                ))
            }
            Err(e) => Json(ApiResponse::<HybridSearchResponse>::error(
                500,
                &e.to_string(),
            )),
        }
    }

    /// GET /api/vectors/stats - 获取向量统计信息
    pub async fn stats(State(state): State<AppState>) -> Json<ApiResponse<VectorStats>> {
        match state.vector_service.get_stats().await {
            Ok(stats) => Json(ApiResponse::success(
                VectorStats {
                    total_documents: stats.total_documents,
                    total_chunks: stats.total_chunks,
                    total_vectors: stats.total_vectors,
                    vector_dimension: stats.vector_dimension,
                },
                "Success",
            )),
            Err(e) => Json(ApiResponse::<VectorStats>::error(500, &e.to_string())),
        }
    }

    /// POST /api/vectors/clear - 清空所有向量数据
    pub async fn clear_all(State(state): State<AppState>) -> Json<ApiResponse<String>> {
        match state.vector_service.clear_all().await {
            Ok(_) => Json(ApiResponse::success(
                "所有向量数据已清空".to_string(),
                "Success",
            )),
            Err(e) => Json(ApiResponse::<String>::error(500, &e.to_string())),
        }
    }
}
