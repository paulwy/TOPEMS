use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::Utc;
use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared::{ApiResponse, Claims};
use crate::models::dashboard::*;
use crate::services::permission::{check_permission, BIPermission};

/// 创建仪表盘
pub async fn create_dashboard(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateDashboard>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let dashboard_id = Uuid::new_v4();
    let result = sqlx::query(
        "INSERT INTO dashboards (id, name, description, layout, filters, refresh_interval, created_by, created_at, updated_at, is_active, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"
    )
    .bind(dashboard_id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.layout)
    .bind(&payload.filters)
    .bind(payload.refresh_interval)
    .bind(payload.created_by)
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(true)
    .bind(payload.is_public.unwrap_or(false))
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "dashboard_id": dashboard_id,
            "name": payload.name,
            "created_at": Utc::now().to_rfc3339(),
        }), "创建仪表盘成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("创建仪表盘失败: {}", e))),
    }
}

/// 获取仪表盘列表
pub async fn list_dashboards(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<DashboardQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let dashboards = sqlx::query_as::<_, Dashboard>(
        "SELECT * FROM dashboards 
         WHERE is_active = true
         AND (is_public = true OR created_by = $1)
         AND ($2::text IS NULL OR name LIKE '%' || $2 || '%')
         ORDER BY created_at DESC 
         LIMIT $3 OFFSET $4"
    )
    .bind(claims.sub)
    .bind(&params.name)
    .bind(params.limit.unwrap_or(20))
    .bind(params.offset.unwrap_or(0))
    .fetch_all(&pool)
    .await;

    match dashboards {
        Ok(dashboards_list) => {
            Json(ApiResponse::success(json!({
                "dashboards": dashboards_list,
                "total": dashboards_list.len(),
            }), "获取仪表盘列表成功"))
        },
        Err(e) => Json(ApiResponse::error(500, &format!("查询仪表盘失败: {}", e))),
    }
}

/// 获取仪表盘详情
pub async fn get_dashboard(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let dashboard = sqlx::query_as::<_, Dashboard>(
        "SELECT * FROM dashboards WHERE id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match dashboard {
        Ok(Some(dashboard_data)) => {
            // 查询仪表盘组件
            let widgets = sqlx::query_as::<_, DashboardWidget>(
                "SELECT * FROM dashboard_widgets WHERE dashboard_id = $1 AND is_active = true ORDER BY position"
            )
            .bind(id)
            .fetch_all(&pool)
            .await;

            Json(ApiResponse::success(json!({
                "dashboard": dashboard_data,
                "widgets": widgets.unwrap_or_default(),
            }), "获取仪表盘详情成功"))
        },
        Ok(None) => Json(ApiResponse::error(404, "仪表盘不存在")),
        Err(e) => Json(ApiResponse::error(500, &format!("查询仪表盘失败: {}", e))),
    }
}

/// 更新仪表盘
pub async fn update_dashboard(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateDashboard>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query(
        "UPDATE dashboards SET 
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         layout = COALESCE($4, layout),
         filters = COALESCE($5, filters),
         refresh_interval = COALESCE($6, refresh_interval),
         is_active = COALESCE($7, is_active),
         is_public = COALESCE($8, is_public),
         updated_at = $9
         WHERE id = $1"
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(&payload.layout)
    .bind(&payload.filters)
    .bind(&payload.refresh_interval)
    .bind(&payload.is_active)
    .bind(&payload.is_public)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "dashboard_id": id,
            "updated_at": Utc::now().to_rfc3339(),
        }), "更新仪表盘成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新仪表盘失败: {}", e))),
    }
}

/// 删除仪表盘
pub async fn delete_dashboard(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query(
        "UPDATE dashboards SET is_active = false, updated_at = $2 WHERE id = $1"
    )
    .bind(id)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "dashboard_id": id,
            "deleted_at": Utc::now().to_rfc3339(),
        }), "删除仪表盘成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除仪表盘失败: {}", e))),
    }
}

/// 添加仪表盘组件
pub async fn add_widget(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddDashboardWidget>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let widget_id = Uuid::new_v4();
    let position_json = serde_json::to_value(&payload.position).unwrap_or_default();
    let size_json = serde_json::to_value(&payload.size).unwrap_or_default();

    let result = sqlx::query(
        "INSERT INTO dashboard_widgets (id, dashboard_id, widget_type, title, description, position, size, config, data_source_id, visualization_id, refresh_interval, created_at, updated_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"
    )
    .bind(widget_id)
    .bind(id)
    .bind(&payload.widget_type)
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(&position_json)
    .bind(&size_json)
    .bind(&payload.config)
    .bind(&payload.data_source_id)
    .bind(&payload.visualization_id)
    .bind(payload.refresh_interval)
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(true)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "widget_id": widget_id,
            "dashboard_id": id,
            "widget_type": payload.widget_type,
            "created_at": Utc::now().to_rfc3339(),
        }), "添加组件成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("添加组件失败: {}", e))),
    }
}

/// 更新仪表盘组件
pub async fn update_widget(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((dashboard_id, widget_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateDashboardWidget>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let position_json = payload.position.map(|p| serde_json::to_value(p).unwrap_or_default());
    let size_json = payload.size.map(|s| serde_json::to_value(s).unwrap_or_default());

    let result = sqlx::query(
        "UPDATE dashboard_widgets SET 
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         position = COALESCE($5, position),
         size = COALESCE($6, size),
         config = COALESCE($7, config),
         data_source_id = COALESCE($8, data_source_id),
         visualization_id = COALESCE($9, visualization_id),
         refresh_interval = COALESCE($10, refresh_interval),
         is_active = COALESCE($11, is_active),
         updated_at = $12
         WHERE id = $1 AND dashboard_id = $2"
    )
    .bind(widget_id)
    .bind(dashboard_id)
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(&position_json)
    .bind(&size_json)
    .bind(&payload.config)
    .bind(&payload.data_source_id)
    .bind(&payload.visualization_id)
    .bind(&payload.refresh_interval)
    .bind(&payload.is_active)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "widget_id": widget_id,
            "dashboard_id": dashboard_id,
            "updated_at": Utc::now().to_rfc3339(),
        }), "更新组件成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("更新组件失败: {}", e))),
    }
}

/// 删除仪表盘组件
pub async fn delete_widget(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path((dashboard_id, widget_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query(
        "UPDATE dashboard_widgets SET is_active = false, updated_at = $3 WHERE id = $1 AND dashboard_id = $2"
    )
    .bind(widget_id)
    .bind(dashboard_id)
    .bind(Utc::now())
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(json!({
            "widget_id": widget_id,
            "dashboard_id": dashboard_id,
            "deleted_at": Utc::now().to_rfc3339(),
        }), "删除组件成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("删除组件失败: {}", e))),
    }
}

/// 获取仪表盘数据
pub async fn get_dashboard_data(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Query(params): Query<DashboardDataQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::DashboardRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    // 查询仪表盘组件
    let widgets = sqlx::query_as::<_, DashboardWidget>(
        "SELECT * FROM dashboard_widgets WHERE dashboard_id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    match widgets {
        Ok(widgets_list) => {
            // 为每个组件生成数据（简化实现）
            let widgets_data: Vec<serde_json::Value> = widgets_list.iter().map(|widget| {
                json!({
                    "widget_id": widget.id,
                    "widget_type": widget.widget_type,
                    "title": widget.title,
                    "data": generate_widget_data(&widget.widget_type),
                    "metadata": {
                        "refresh_interval": widget.refresh_interval,
                        "last_updated": Utc::now().to_rfc3339(),
                    }
                })
            }).collect();

            Json(ApiResponse::success(json!({
                "dashboard_id": id,
                "widgets": widgets_data,
                "generated_at": Utc::now().to_rfc3339(),
                "filters": params.filters,
            }), "获取仪表盘数据成功"))
        },
        Err(e) => Json(ApiResponse::error(500, &format!("获取仪表盘数据失败: {}", e))),
    }
}

/// 生成组件数据（简化实现）
fn generate_widget_data(widget_type: &WidgetType) -> serde_json::Value {
    match widget_type {
        WidgetType::Chart | WidgetType::Line | WidgetType::Bar | WidgetType::Pie => {
            json!({
                "labels": ["1月", "2月", "3月", "4月", "5月", "6月"],
                "datasets": [{
                    "label": "数据",
                    "data": [100, 120, 150, 180, 220, 250],
                }]
            })
        },
        WidgetType::Metric => {
            json!({
                "value": 1250,
                "unit": "个",
                "change": 15.5,
                "change_type": "increase",
            })
        },
        WidgetType::Table => {
            json!({
                "columns": ["ID", "名称", "数值"],
                "rows": [
                    [1, "项目A", 100],
                    [2, "项目B", 200],
                    [3, "项目C", 300],
                ]
            })
        },
        _ => json!({"data": "示例数据"}),
    }
}

/// 仪表盘查询参数
#[derive(Debug, Deserialize)]
pub struct DashboardQueryParams {
    pub name: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

/// 仪表盘数据查询参数
#[derive(Debug, Deserialize)]
pub struct DashboardDataQueryParams {
    pub filters: Option<serde_json::Value>,
}