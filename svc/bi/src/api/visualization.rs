#![allow(clippy::needless_borrows_for_generic_args)]

use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::visualization::*;
use crate::services::permission::{check_permission, BIPermission};
use topems_shared::{ApiResponse, Claims};

/// 创建可视化图表
pub async fn create_visualization(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateVisualization>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataViewWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let visualization_id = Uuid::new_v4();
    let result = sqlx::query(
        "INSERT INTO visualizations (id, name, description, visualization_type, data_source_id, query_config, chart_config, style_config, interaction_config, created_by, created_at, updated_at, is_active, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
    )
    .bind(visualization_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.visualization_type)
    .bind(&payload.data_source_id)
    .bind(&payload.query_config)
    .bind(&payload.chart_config)
    .bind(&payload.style_config)
    .bind(&payload.interaction_config)
    .bind(payload.created_by)
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(true)
    .bind(payload.is_public.unwrap_or(false))
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            json!({
                "visualization_id": visualization_id,
                "name": payload.name,
                "visualization_type": payload.visualization_type,
                "created_at": Utc::now().to_rfc3339(),
            }),
            "创建可视化图表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("创建可视化图表失败: {}", e),
        )),
    }
}

/// 获取可视化列表
pub async fn list_visualizations(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VisualizationQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataViewRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let visualizations = sqlx::query_as::<_, Visualization>(
        "SELECT * FROM visualizations 
         WHERE is_active = true
         AND (is_public = true OR created_by = $1)
         AND ($2::text IS NULL OR name LIKE '%' || $2 || '%')
         AND ($3::visualization_type IS NULL OR visualization_type = $3)
         ORDER BY created_at DESC 
         LIMIT $4 OFFSET $5",
    )
    .bind(claims.sub)
    .bind(&params.name)
    .bind(&params.visualization_type)
    .bind(params.limit.unwrap_or(20))
    .bind(params.offset.unwrap_or(0))
    .fetch_all(&pool)
    .await;

    match visualizations {
        Ok(visualizations_list) => Json(ApiResponse::success(
            json!({
                "visualizations": visualizations_list,
                "total": visualizations_list.len(),
            }),
            "获取可视化列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("查询可视化失败: {}", e))),
    }
}

/// 获取可视化详情
pub async fn get_visualization(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataViewRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let visualization = sqlx::query_as::<_, Visualization>(
        "SELECT * FROM visualizations WHERE id = $1 AND is_active = true",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match visualization {
        Ok(Some(visualization_data)) => Json(ApiResponse::success(
            json!({
                "visualization": visualization_data,
            }),
            "获取可视化详情成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "可视化图表不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询可视化失败: {}", e))),
    }
}

/// 更新可视化图表
pub async fn update_visualization(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateVisualization>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataViewWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        "UPDATE visualizations SET 
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         visualization_type = COALESCE($4, visualization_type),
         data_source_id = COALESCE($5, data_source_id),
         query_config = COALESCE($6, query_config),
         chart_config = COALESCE($7, chart_config),
         style_config = COALESCE($8, style_config),
         interaction_config = COALESCE($9, interaction_config),
         is_active = COALESCE($10, is_active),
         is_public = COALESCE($11, is_public),
         updated_at = $12
         WHERE id = $1",
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.visualization_type)
    .bind(&payload.data_source_id)
    .bind(&payload.query_config)
    .bind(&payload.chart_config)
    .bind(&payload.style_config)
    .bind(&payload.interaction_config)
    .bind(&payload.is_active)
    .bind(&payload.is_public)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            json!({
                "visualization_id": id,
                "updated_at": Utc::now().to_rfc3339(),
            }),
            "更新可视化图表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("更新可视化图表失败: {}", e),
        )),
    }
}

/// 删除可视化图表
pub async fn delete_visualization(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataViewWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result =
        sqlx::query("UPDATE visualizations SET is_active = false, updated_at = $2 WHERE id = $1")
            .bind(id)
            .bind(Utc::now())
            .execute(&pool)
            .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            json!({
                "visualization_id": id,
                "deleted_at": Utc::now().to_rfc3339(),
            }),
            "删除可视化图表成功",
        )),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("删除可视化图表失败: {}", e),
        )),
    }
}

/// 获取可视化数据
pub async fn get_visualization_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<GetVisualizationData>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DataViewRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 查询可视化配置
    let visualization = sqlx::query_as::<_, Visualization>(
        "SELECT * FROM visualizations WHERE id = $1 AND is_active = true",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match visualization {
        Ok(Some(visualization_config)) => {
            // 检查缓存
            if payload.use_cache.unwrap_or(true) {
                let cached_data = sqlx::query_as::<_, VisualizationData>(
                    "SELECT * FROM visualization_data 
                     WHERE visualization_id = $1 
                     AND cached = true 
                     AND cache_expires_at > $2 
                     ORDER BY generated_at DESC LIMIT 1",
                )
                .bind(id)
                .bind(Utc::now())
                .fetch_optional(&pool)
                .await;

                if let Ok(Some(cached)) = cached_data {
                    return Json(ApiResponse::success(
                        json!({
                            "visualization_id": id,
                            "visualization_type": visualization_config.visualization_type,
                            "data": cached.data,
                            "metadata": cached.metadata,
                            "generated_at": cached.generated_at.to_rfc3339(),
                            "cached": true,
                        }),
                        "获取可视化数据成功（缓存）",
                    ));
                }
            }

            // 执行查询生成数据（简化实现）
            let generated_data =
                generate_visualization_data(&visualization_config.visualization_type);

            // 保存缓存数据
            let data_id = Uuid::new_v4();
            let cache_ttl = payload.cache_ttl_seconds.unwrap_or(3600);
            let cache_expires_at = Utc::now() + chrono::Duration::seconds(cache_ttl);

            sqlx::query(
                "INSERT INTO visualization_data (id, visualization_id, data, metadata, generated_at, cached, cache_expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)"
            )
            .bind(data_id)
            .bind(id)
            .bind(&generated_data)
            .bind(json!({"parameters": payload.parameters}))
            .bind(Utc::now())
            .bind(true)
            .bind(cache_expires_at)
            .execute(&pool)
            .await
            .ok();

            Json(ApiResponse::success(
                json!({
                    "visualization_id": id,
                    "visualization_type": visualization_config.visualization_type,
                    "data": generated_data,
                    "metadata": {
                        "parameters": payload.parameters,
                        "time_range": payload.time_range,
                    },
                    "generated_at": Utc::now().to_rfc3339(),
                    "cached": false,
                }),
                "获取可视化数据成功",
            ))
        }
        Ok(None) => Json(ApiResponse::error(404, "可视化图表不存在")),
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("获取可视化数据失败: {}", e),
        )),
    }
}

/// 生成可视化数据（简化实现）
fn generate_visualization_data(visualization_type: &VisualizationType) -> serde_json::Value {
    match visualization_type {
        VisualizationType::Line | VisualizationType::Area => {
            json!({
                "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
                "datasets": [{
                    "label": "趋势数据",
                    "data": [120, 150, 180, 220, 280, 350],
                    "borderColor": "#3B82F6",
                    "backgroundColor": "rgba(59, 130, 246, 0.1)",
                }]
            })
        }
        VisualizationType::Bar => {
            json!({
                "labels": ["类别A", "类别B", "类别C", "类别D"],
                "datasets": [{
                    "label": "柱状图数据",
                    "data": [100, 200, 150, 250],
                    "backgroundColor": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
                }]
            })
        }
        VisualizationType::Pie => {
            json!({
                "labels": ["部分A", "部分B", "部分C", "部分D"],
                "datasets": [{
                    "data": [30, 25, 20, 25],
                    "backgroundColor": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"],
                }]
            })
        }
        VisualizationType::Scatter => {
            json!({
                "datasets": [{
                    "label": "散点数据",
                    "data": [
                        {"x": 10, "y": 20},
                        {"x": 15, "y": 30},
                        {"x": 20, "y": 25},
                        {"x": 25, "y": 40},
                        {"x": 30, "y": 35},
                    ],
                }]
            })
        }
        VisualizationType::Radar => {
            json!({
                "labels": ["维度A", "维度B", "维度C", "维度D", "维度E"],
                "datasets": [{
                    "label": "雷达图数据",
                    "data": [80, 90, 75, 85, 70],
                }]
            })
        }
        VisualizationType::Gauge => {
            json!({
                "value": 75,
                "min": 0,
                "max": 100,
                "title": "指标值",
            })
        }
        VisualizationType::Metric => {
            json!({
                "value": 1250,
                "unit": "个",
                "change": 15.5,
                "change_type": "increase",
                "target": 1500,
            })
        }
        VisualizationType::Table => {
            json!({
                "columns": [
                    {"name": "ID", "type": "number"},
                    {"name": "名称", "type": "string"},
                    {"name": "数值", "type": "number"},
                    {"name": "状态", "type": "string"},
                ],
                "rows": [
                    {"ID": 1, "名称": "项目A", "数值": 100, "状态": "活跃"},
                    {"ID": 2, "名称": "项目B", "数值": 200, "状态": "完成"},
                    {"ID": 3, "名称": "项目C", "数值": 150, "状态": "进行中"},
                ]
            })
        }
        _ => json!({"data": "示例数据"}),
    }
}

/// 可视化查询参数
#[derive(Debug, Deserialize)]
pub struct VisualizationQueryParams {
    pub name: Option<String>,
    pub visualization_type: Option<VisualizationType>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}
