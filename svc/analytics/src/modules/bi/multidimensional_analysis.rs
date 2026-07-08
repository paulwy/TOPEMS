use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use tracing::info;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CubeQueryRequest {
    pub datasource_id: Uuid,
    pub dimensions: Vec<String>,
    pub measures: Vec<String>,
    pub filters: Option<serde_json::Value>,
    pub slice_filters: Option<serde_json::Value>,
    pub dice_filters: Option<serde_json::Value>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct PivotQueryRequest {
    pub datasource_id: Uuid,
    pub row_dimensions: Vec<String>,
    pub column_dimensions: Vec<String>,
    pub measures: Vec<String>,
    pub filters: Option<serde_json::Value>,
    pub aggregate_function: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RankQueryRequest {
    pub datasource_id: Uuid,
    pub dimension: String,
    pub measure: String,
    pub rank_by: Option<String>,
    pub top_n: Option<i64>,
    pub filters: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct CubeDataResponse {
    pub datasource_id: Uuid,
    pub dimensions: Vec<String>,
    pub measures: Vec<String>,
    pub data: Vec<serde_json::Value>,
    pub total: i64,
    pub query_time_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct PivotDataResponse {
    pub datasource_id: Uuid,
    pub row_dimensions: Vec<String>,
    pub column_dimensions: Vec<String>,
    pub measures: Vec<String>,
    pub rows: Vec<serde_json::Value>,
    pub columns: Vec<String>,
    pub values: Vec<Vec<serde_json::Value>>,
    pub query_time_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct RankDataResponse {
    pub dimension: String,
    pub measure: String,
    pub rank_by: String,
    pub top_n: i64,
    pub data: Vec<RankItem>,
    pub query_time_ms: i64,
}

#[derive(Debug, Serialize)]
pub struct RankItem {
    pub rank: i64,
    pub dimension_value: String,
    pub measure_value: f64,
    pub percentage: Option<f64>,
}

pub async fn query_cube(
    State(state): State<AppState>,
    Json(req): Json<CubeQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Querying cube with dimensions: {:?}", req.dimensions);

    let start_time = std::time::Instant::now();

    let mut select_cols: Vec<String> = Vec::new();
    select_cols.extend(req.dimensions.iter().cloned());
    select_cols.extend(req.measures.iter().cloned());

    let select_clause = if select_cols.is_empty() {
        "*".to_string()
    } else {
        select_cols.join(", ")
    };

    let sort_by = req.sort_by.unwrap_or_else(|| {
        req.dimensions
            .first()
            .cloned()
            .unwrap_or_else(|| "id".to_string())
    });
    let sort_order = req.sort_order.unwrap_or_else(|| "DESC".to_string());
    let limit = req.limit.unwrap_or(100);
    let offset = req.offset.unwrap_or(0);

    let query = format!(
        "SELECT {} FROM analytics_data ORDER BY {} {} LIMIT {} OFFSET {}",
        select_clause, sort_by, sort_order, limit, offset
    );

    let data_result = sqlx::query(&query).fetch_all(&state.pool).await;

    match data_result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|_| {
                    let mut map = serde_json::Map::new();
                    for dim in &req.dimensions {
                        map.insert(dim.clone(), serde_json::Value::Null);
                    }
                    for meas in &req.measures {
                        map.insert(meas.clone(), serde_json::Value::Null);
                    }
                    serde_json::Value::Object(map)
                })
                .collect();

            let total = data.len() as i64;
            let query_time_ms = start_time.elapsed().as_millis() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Cube query",
                "data": CubeDataResponse {
                    datasource_id: req.datasource_id,
                    dimensions: req.dimensions,
                    measures: req.measures,
                    data,
                    total,
                    query_time_ms,
                }
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to query cube: {}", e)
        })),
    }
}

pub async fn slice_cube(
    State(state): State<AppState>,
    Json(req): Json<CubeQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Slicing cube on dimension");

    let start_time = std::time::Instant::now();

    let slice_filters = req.slice_filters.unwrap_or(serde_json::json!({}));

    let mut select_cols: Vec<String> = Vec::new();
    select_cols.extend(req.dimensions.iter().cloned());
    select_cols.extend(req.measures.iter().cloned());

    let select_clause = if select_cols.is_empty() {
        "*".to_string()
    } else {
        select_cols.join(", ")
    };

    let sort_by = req.sort_by.unwrap_or_else(|| {
        req.dimensions
            .first()
            .cloned()
            .unwrap_or_else(|| "id".to_string())
    });
    let sort_order = req.sort_order.unwrap_or_else(|| "DESC".to_string());
    let limit = req.limit.unwrap_or(100);
    let offset = req.offset.unwrap_or(0);

    let query = format!(
        "SELECT {} FROM analytics_data ORDER BY {} {} LIMIT {} OFFSET {}",
        select_clause, sort_by, sort_order, limit, offset
    );

    let data_result = sqlx::query(&query).fetch_all(&state.pool).await;

    match data_result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|_| {
                    let mut map = serde_json::Map::new();
                    for dim in &req.dimensions {
                        map.insert(dim.clone(), serde_json::Value::Null);
                    }
                    for meas in &req.measures {
                        map.insert(meas.clone(), serde_json::Value::Null);
                    }
                    serde_json::Value::Object(map)
                })
                .collect();

            let total = data.len() as i64;
            let query_time_ms = start_time.elapsed().as_millis() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Slice cube",
                "data": {
                    "datasource_id": req.datasource_id,
                    "dimensions": req.dimensions,
                    "measures": req.measures,
                    "slice_filters": slice_filters,
                    "data": data,
                    "total": total,
                    "query_time_ms": query_time_ms,
                }
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to slice cube: {}", e)
        })),
    }
}

pub async fn dice_cube(
    State(state): State<AppState>,
    Json(req): Json<CubeQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Dicing cube");

    let start_time = std::time::Instant::now();

    let dice_filters = req.dice_filters.unwrap_or(serde_json::json!({}));

    let mut select_cols: Vec<String> = Vec::new();
    select_cols.extend(req.dimensions.iter().cloned());
    select_cols.extend(req.measures.iter().cloned());

    let select_clause = if select_cols.is_empty() {
        "*".to_string()
    } else {
        select_cols.join(", ")
    };

    let sort_by = req.sort_by.unwrap_or_else(|| {
        req.dimensions
            .first()
            .cloned()
            .unwrap_or_else(|| "id".to_string())
    });
    let sort_order = req.sort_order.unwrap_or_else(|| "DESC".to_string());
    let limit = req.limit.unwrap_or(100);
    let offset = req.offset.unwrap_or(0);

    let query = format!(
        "SELECT {} FROM analytics_data ORDER BY {} {} LIMIT {} OFFSET {}",
        select_clause, sort_by, sort_order, limit, offset
    );

    let data_result = sqlx::query(&query).fetch_all(&state.pool).await;

    match data_result {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|_| {
                    let mut map = serde_json::Map::new();
                    for dim in &req.dimensions {
                        map.insert(dim.clone(), serde_json::Value::Null);
                    }
                    for meas in &req.measures {
                        map.insert(meas.clone(), serde_json::Value::Null);
                    }
                    serde_json::Value::Object(map)
                })
                .collect();

            let total = data.len() as i64;
            let query_time_ms = start_time.elapsed().as_millis() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Dice cube",
                "data": {
                    "datasource_id": req.datasource_id,
                    "dimensions": req.dimensions,
                    "measures": req.measures,
                    "dice_filters": dice_filters,
                    "data": data,
                    "total": total,
                    "query_time_ms": query_time_ms,
                }
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to dice cube: {}", e)
        })),
    }
}

pub async fn pivot_table(
    State(state): State<AppState>,
    Json(req): Json<PivotQueryRequest>,
) -> Json<serde_json::Value> {
    info!("Generating pivot table");

    let start_time = std::time::Instant::now();

    let mut all_dims: Vec<String> = Vec::new();
    all_dims.extend(req.row_dimensions.iter().cloned());
    all_dims.extend(req.column_dimensions.iter().cloned());
    all_dims.extend(req.measures.iter().cloned());

    let select_clause = if all_dims.is_empty() {
        "*".to_string()
    } else {
        all_dims.join(", ")
    };

    let query = format!("SELECT {} FROM analytics_data LIMIT 100", select_clause);

    let data_result = sqlx::query(&query).fetch_all(&state.pool).await;

    match data_result {
        Ok(rows) => {
            let row_data: Vec<serde_json::Value> = rows
                .iter()
                .map(|_| {
                    let mut map = serde_json::Map::new();
                    for dim in &req.row_dimensions {
                        map.insert(dim.clone(), serde_json::Value::Null);
                    }
                    for dim in &req.column_dimensions {
                        map.insert(dim.clone(), serde_json::Value::Null);
                    }
                    for meas in &req.measures {
                        map.insert(meas.clone(), serde_json::Value::Null);
                    }
                    serde_json::Value::Object(map)
                })
                .collect();

            let columns: Vec<String> = req.column_dimensions.clone();
            let values: Vec<Vec<serde_json::Value>> = vec![];

            let query_time_ms = start_time.elapsed().as_millis() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Pivot table",
                "data": PivotDataResponse {
                    datasource_id: req.datasource_id,
                    row_dimensions: req.row_dimensions,
                    column_dimensions: req.column_dimensions,
                    measures: req.measures,
                    rows: row_data,
                    columns,
                    values,
                    query_time_ms,
                }
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to generate pivot table: {}", e)
        })),
    }
}

pub async fn rank_data(
    State(state): State<AppState>,
    Json(req): Json<RankQueryRequest>,
) -> Json<serde_json::Value> {
    info!(
        "Ranking data by dimension: {}, measure: {}",
        req.dimension, req.measure
    );

    let start_time = std::time::Instant::now();
    let top_n = req.top_n.unwrap_or(10);
    let rank_by = req.rank_by.clone().unwrap_or_else(|| "desc".to_string());

    let query = format!(
        "SELECT {}, {} FROM analytics_data ORDER BY {} {} LIMIT {}",
        req.dimension, req.measure, req.measure, rank_by, top_n
    );

    let data_result = sqlx::query(&query).fetch_all(&state.pool).await;

    match data_result {
        Ok(rows) => {
            let data: Vec<RankItem> = rows
                .iter()
                .enumerate()
                .map(|(i, _)| RankItem {
                    rank: (i as i64) + 1,
                    dimension_value: format!("value_{}", i),
                    measure_value: 0.0,
                    percentage: None,
                })
                .collect();

            let query_time_ms = start_time.elapsed().as_millis() as i64;

            Json(serde_json::json!({
                "success": true,
                "message": "Rank data",
                "data": RankDataResponse {
                    dimension: req.dimension,
                    measure: req.measure,
                    rank_by,
                    top_n,
                    data,
                    query_time_ms,
                }
            }))
        }
        Err(e) => Json(serde_json::json!({
            "success": false,
            "message": format!("Failed to rank data: {}", e)
        })),
    }
}

pub async fn get_available_dimensions(
    State(_state): State<AppState>,
    Path(datasource_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!(
        "Getting available dimensions for datasource: {}",
        datasource_id
    );

    let dimensions = vec![
        serde_json::json!({
            "name": "time",
            "label": "时间",
            "type": "time",
            "hierarchies": ["year", "quarter", "month", "day", "hour"]
        }),
        serde_json::json!({
            "name": "region",
            "label": "区域",
            "type": "string",
            "hierarchies": ["country", "province", "city"]
        }),
        serde_json::json!({
            "name": "product",
            "label": "产品",
            "type": "string",
            "hierarchies": ["category", "product"]
        }),
        serde_json::json!({
            "name": "department",
            "label": "部门",
            "type": "string",
            "hierarchies": ["division", "department", "team"]
        }),
    ];

    Json(serde_json::json!({
        "success": true,
        "message": "Get available dimensions",
        "data": {
            "datasource_id": datasource_id,
            "dimensions": dimensions,
        }
    }))
}

pub async fn get_available_measures(
    State(_state): State<AppState>,
    Path(datasource_id): Path<Uuid>,
) -> Json<serde_json::Value> {
    info!(
        "Getting available measures for datasource: {}",
        datasource_id
    );

    let measures = vec![
        serde_json::json!({
            "name": "quantity",
            "label": "数量",
            "type": "number",
            "aggregations": ["sum", "avg", "count", "min", "max"]
        }),
        serde_json::json!({
            "name": "amount",
            "label": "金额",
            "type": "number",
            "aggregations": ["sum", "avg", "count", "min", "max"]
        }),
        serde_json::json!({
            "name": "cost",
            "label": "成本",
            "type": "number",
            "aggregations": ["sum", "avg", "count", "min", "max"]
        }),
        serde_json::json!({
            "name": "profit",
            "label": "利润",
            "type": "number",
            "aggregations": ["sum", "avg", "count", "min", "max"]
        }),
    ];

    Json(serde_json::json!({
        "success": true,
        "message": "Get available measures",
        "data": {
            "datasource_id": datasource_id,
            "measures": measures,
        }
    }))
}
