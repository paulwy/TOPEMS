// GIS 服务 OpenAPI 文档
#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GisLayer {
    pub id: Uuid,
    pub name: String,
    pub layer_type: String,
    pub source: Option<String>,
    pub bounds: Option<serde_json::Value>,
    pub properties: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GisFeature {
    pub id: Uuid,
    pub layer_id: Uuid,
    pub geometry: serde_json::Value,
    pub properties: serde_json::Value,
    pub style: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MapProject {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub center: Option<serde_json::Value>,
    pub zoom: Option<i32>,
    pub layers: Option<Vec<Uuid>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SpatialAnalysis {
    pub id: Uuid,
    pub analysis_type: String,
    pub parameters: serde_json::Value,
    pub results: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            GisLayer,
            GisFeature,
            MapProject,
            SpatialAnalysis,
        ),
    ),
    tags(
        (name = "layer", description = "图层管理 API"),
        (name = "feature", description = "要素管理 API"),
        (name = "project", description = "地图项目 API"),
        (name = "analysis", description = "空间分析 API"),
    ),
    info(
        title = "TOPEMS GIS API",
        version = "1.0.0",
        description = "地理信息系统 API - 包含图层管理、要素管理、空间分析等功能"
    )
)]
pub struct GisApiDoc;
