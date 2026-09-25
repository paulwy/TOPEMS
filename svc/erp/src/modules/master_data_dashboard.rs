//! 主数据可视化仪表盘模块
//!
//! 从 master_data_refs.rs 拆分出来的独立模块（V48.0 AC-20 Part 1）。
//! 提供主数据治理的可视化仪表盘管理、Widget 配置、数据聚合和 KPI 摘要功能。
//!
//! 功能：
//! - 仪表盘布局 CRUD
//! - 10 种 Widget 类型（KPI卡片/柱状图/折线图/饼图/热力图/数据表格/仪表盘/趋势线/雷达图/矩形树图）
//! - 仪表盘数据聚合（各 Widget 模拟数据）
//! - KPI 摘要汇总
//! - 仪表盘刷新
//! - 仪表盘统计

use axum::{extract::Path, extract::State, Json};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

use crate::modules::ApiState;
use topems_shared::ApiResponse;

// ==================== 仪表盘类型 ====================

/// 仪表盘 Widget 类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WidgetType {
    KpiCard,
    BarChart,
    LineChart,
    PieChart,
    HeatMap,
    DataTable,
    Gauge,
    TrendLine,
    RadarChart,
    TreeMap,
}

impl WidgetType {
    fn label(&self) -> &'static str {
        match self {
            WidgetType::KpiCard => "KPI 卡片",
            WidgetType::BarChart => "柱状图",
            WidgetType::LineChart => "折线图",
            WidgetType::PieChart => "饼图",
            WidgetType::HeatMap => "热力图",
            WidgetType::DataTable => "数据表格",
            WidgetType::Gauge => "仪表盘",
            WidgetType::TrendLine => "趋势线",
            WidgetType::RadarChart => "雷达图",
            WidgetType::TreeMap => "矩形树图",
        }
    }
}

/// KPI 状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum KpiStatus {
    Good,
    Warning,
    Critical,
    Neutral,
}

impl KpiStatus {
    fn label(&self) -> &'static str {
        match self {
            KpiStatus::Good => "良好",
            KpiStatus::Warning => "警告",
            KpiStatus::Critical => "严重",
            KpiStatus::Neutral => "中性",
        }
    }
}

/// 仪表盘 Widget
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardWidget {
    pub widget_id: String,
    pub title: String,
    pub widget_type: WidgetType,
    pub data_source: String,
    pub config: serde_json::Value,
    pub position: (i32, i32),
    pub refresh_interval: i64,
    pub last_updated: String,
}

/// 仪表盘筛选器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardFilter {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
    pub label: String,
}

/// KPI 指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KpiMetric {
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub target: Option<f64>,
    pub trend: Option<f64>,
    pub trend_percentage: Option<f64>,
    pub status: KpiStatus,
}

/// 仪表盘布局
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardLayout {
    pub dashboard_id: String,
    pub name: String,
    pub description: String,
    pub widgets: Vec<DashboardWidget>,
    pub filters: Vec<DashboardFilter>,
    pub refresh_config: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

/// 仪表盘数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardData {
    pub widgets_data: HashMap<String, serde_json::Value>,
    pub summary: Vec<KpiMetric>,
    pub generated_at: String,
    pub period: String,
}

/// 仪表盘统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_dashboards: usize,
    pub total_widgets: usize,
    pub widgets_by_type: HashMap<String, usize>,
    pub avg_refresh_interval: f64,
    pub last_refreshed: Option<String>,
}

/// 仪表盘创建/更新请求
#[derive(Debug, Deserialize)]
pub struct DashboardRequest {
    pub name: String,
    pub description: Option<String>,
    pub widgets: Vec<DashboardWidgetRequest>,
    pub filters: Option<Vec<DashboardFilter>>,
    pub refresh_config: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct DashboardWidgetRequest {
    pub title: String,
    pub widget_type: String,
    pub data_source: String,
    pub config: Option<serde_json::Value>,
    pub position: Option<(i32, i32)>,
    pub refresh_interval: Option<i64>,
}

fn parse_widget_type(s: &str) -> Option<WidgetType> {
    match s.to_lowercase().as_str() {
        "kpi_card" | "kpicard" => Some(WidgetType::KpiCard),
        "bar_chart" | "barchart" => Some(WidgetType::BarChart),
        "line_chart" | "linechart" => Some(WidgetType::LineChart),
        "pie_chart" | "piechart" => Some(WidgetType::PieChart),
        "heat_map" | "heatmap" => Some(WidgetType::HeatMap),
        "data_table" | "datatable" => Some(WidgetType::DataTable),
        "gauge" => Some(WidgetType::Gauge),
        "trend_line" | "trendline" => Some(WidgetType::TrendLine),
        "radar_chart" | "radarchart" => Some(WidgetType::RadarChart),
        "tree_map" | "treemap" => Some(WidgetType::TreeMap),
        _ => None,
    }
}

// ==================== 仪表盘存储 ====================

struct GovernanceDashboardStore {
    dashboards: tokio::sync::Mutex<Vec<DashboardLayout>>,
    initialized: tokio::sync::Mutex<bool>,
}

fn get_dashboard_store() -> &'static GovernanceDashboardStore {
    static STORE: LazyLock<GovernanceDashboardStore> = LazyLock::new(|| GovernanceDashboardStore {
        dashboards: tokio::sync::Mutex::new(Vec::new()),
        initialized: tokio::sync::Mutex::new(false),
    });
    &STORE
}

async fn ensure_dashboard_initialized() {
    let store = get_dashboard_store();
    let mut initialized = store.initialized.lock().await;
    if *initialized {
        return;
    }
    let now = chrono::Utc::now();
    let rfc = |days_ago: i64| (now - chrono::Duration::days(days_ago)).to_rfc3339();

    // 预置主数据治理概览仪表盘
    let overview = DashboardLayout {
        dashboard_id: "dashboard-001".to_string(),
        name: "主数据治理概览".to_string(),
        description: "展示主数据治理的整体状况，包括质量、血缘、成熟度等核心指标".to_string(),
        widgets: vec![
            DashboardWidget {
                widget_id: "widget-001".to_string(),
                title: "数据质量评分".to_string(),
                widget_type: WidgetType::KpiCard,
                data_source: "quality_report".to_string(),
                config: serde_json::json!({ "metric": "quality_score", "target": 90.0 }),
                position: (0, 0),
                refresh_interval: 300,
                last_updated: rfc(0),
            },
            DashboardWidget {
                widget_id: "widget-002".to_string(),
                title: "主数据总量趋势".to_string(),
                widget_type: WidgetType::LineChart,
                data_source: "master_data_stats".to_string(),
                config: serde_json::json!({ "x_axis": "date", "y_axis": "total_count" }),
                position: (1, 0),
                refresh_interval: 600,
                last_updated: rfc(0),
            },
            DashboardWidget {
                widget_id: "widget-003".to_string(),
                title: "各域数据分布".to_string(),
                widget_type: WidgetType::PieChart,
                data_source: "domain_distribution".to_string(),
                config: serde_json::json!({ "group_by": "domain" }),
                position: (0, 1),
                refresh_interval: 900,
                last_updated: rfc(1),
            },
            DashboardWidget {
                widget_id: "widget-004".to_string(),
                title: "质量趋势热力图".to_string(),
                widget_type: WidgetType::HeatMap,
                data_source: "quality_trend".to_string(),
                config: serde_json::json!({ "x_axis": "date", "y_axis": "domain", "value": "score" }),
                position: (1, 1),
                refresh_interval: 1800,
                last_updated: rfc(1),
            },
        ],
        filters: vec![DashboardFilter {
            field: "domain".to_string(),
            operator: "in".to_string(),
            value: serde_json::json!(["customer", "supplier", "material"]),
            label: "数据域".to_string(),
        }],
        refresh_config: serde_json::json!({ "auto_refresh": true, "interval": 300 }),
        created_at: rfc(30),
        updated_at: rfc(0),
    };

    let mut dashboards = store.dashboards.lock().await;
    dashboards.push(overview);
    *initialized = true;
}

/// 创建仪表盘
async fn create_dashboard(req: &DashboardRequest) -> DashboardLayout {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let mut dashboards = store.dashboards.lock().await;
    let id = format!("dashboard-{:03}", dashboards.len() + 1);
    let now = chrono::Utc::now().to_rfc3339();
    let widgets: Vec<DashboardWidget> = req
        .widgets
        .iter()
        .enumerate()
        .map(|(i, w)| DashboardWidget {
            widget_id: format!("widget-{}-{:03}", dashboards.len() + 1, i + 1),
            title: w.title.clone(),
            widget_type: parse_widget_type(&w.widget_type).unwrap_or(WidgetType::KpiCard),
            data_source: w.data_source.clone(),
            config: w.config.clone().unwrap_or(serde_json::json!({})),
            position: w.position.unwrap_or((i as i32, 0)),
            refresh_interval: w.refresh_interval.unwrap_or(300),
            last_updated: now.clone(),
        })
        .collect();
    let dashboard = DashboardLayout {
        dashboard_id: id,
        name: req.name.clone(),
        description: req.description.clone().unwrap_or_default(),
        widgets,
        filters: req.filters.clone().unwrap_or_default(),
        refresh_config: req
            .refresh_config
            .clone()
            .unwrap_or(serde_json::json!({ "auto_refresh": false })),
        created_at: now.clone(),
        updated_at: now,
    };
    dashboards.push(dashboard.clone());
    dashboard
}

/// 获取仪表盘
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/dashboard",
    responses(
        (status = 200, description = "get_dashboard OK")
    ),
    tag = "ERP/master_data_dashboard"
)]
pub async fn get_dashboard(dashboard_id: &str) -> Option<DashboardLayout> {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let dashboards = store.dashboards.lock().await;
    dashboards
        .iter()
        .find(|d| d.dashboard_id == dashboard_id)
        .cloned()
}

/// 更新仪表盘
async fn update_dashboard(dashboard_id: &str, req: &DashboardRequest) -> Option<DashboardLayout> {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let mut dashboards = store.dashboards.lock().await;
    let dashboard = dashboards
        .iter_mut()
        .find(|d| d.dashboard_id == dashboard_id)?;
    dashboard.name = req.name.clone();
    if let Some(ref desc) = req.description {
        dashboard.description = desc.clone();
    }
    let now = chrono::Utc::now().to_rfc3339();
    let widgets: Vec<DashboardWidget> = req
        .widgets
        .iter()
        .enumerate()
        .map(|(i, w)| DashboardWidget {
            widget_id: format!("widget-{}-{:03}", dashboard_id, i + 1),
            title: w.title.clone(),
            widget_type: parse_widget_type(&w.widget_type).unwrap_or(WidgetType::KpiCard),
            data_source: w.data_source.clone(),
            config: w.config.clone().unwrap_or(serde_json::json!({})),
            position: w.position.unwrap_or((i as i32, 0)),
            refresh_interval: w.refresh_interval.unwrap_or(300),
            last_updated: now.clone(),
        })
        .collect();
    dashboard.widgets = widgets;
    if let Some(ref filters) = req.filters {
        dashboard.filters = filters.clone();
    }
    if let Some(ref rc) = req.refresh_config {
        dashboard.refresh_config = rc.clone();
    }
    dashboard.updated_at = now;
    Some(dashboard.clone())
}

/// 删除仪表盘
async fn delete_dashboard(dashboard_id: &str) -> bool {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let mut dashboards = store.dashboards.lock().await;
    let before = dashboards.len();
    dashboards.retain(|d| d.dashboard_id != dashboard_id);
    dashboards.len() < before
}

/// 获取仪表盘数据（聚合各 widget 数据）
async fn get_dashboard_data(dashboard_id: &str) -> Option<DashboardData> {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let dashboards = store.dashboards.lock().await;
    let dashboard = dashboards
        .iter()
        .find(|d| d.dashboard_id == dashboard_id)?
        .clone();
    drop(dashboards);

    let mut widgets_data: HashMap<String, serde_json::Value> = HashMap::new();
    for widget in &dashboard.widgets {
        let data = match widget.widget_type {
            WidgetType::KpiCard => serde_json::json!({
                "value": (widget.refresh_interval as f64 * 0.3).round(),
                "target": 90.0,
                "status": "good",
            }),
            WidgetType::BarChart => serde_json::json!({
                "categories": ["客户", "供应商", "物料", "产品"],
                "values": [1280, 860, 2100, 1540],
            }),
            WidgetType::LineChart => serde_json::json!({
                "x_axis": ["1月", "2月", "3月", "4月", "5月", "6月"],
                "y_axis": [1200, 1350, 1420, 1380, 1500, 1620],
            }),
            WidgetType::PieChart => serde_json::json!({
                "labels": ["客户", "供应商", "物料", "产品"],
                "values": [1280, 860, 2100, 1540],
            }),
            WidgetType::HeatMap => serde_json::json!({
                "rows": ["customer", "supplier", "material"],
                "cols": ["Q1", "Q2", "Q3", "Q4"],
                "values": [[85, 88, 90, 92], [80, 82, 85, 88], [90, 91, 93, 95]],
            }),
            WidgetType::DataTable => serde_json::json!({
                "columns": ["域", "总数", "合格率", "责任人"],
                "rows": [
                    ["customer", "1280", "92.5%", "张三"],
                    ["supplier", "860", "88.0%", "李四"],
                    ["material", "2100", "95.0%", "王五"],
                ],
            }),
            WidgetType::Gauge => serde_json::json!({
                "value": 88.5,
                "min": 0,
                "max": 100,
                "thresholds": [60, 80],
            }),
            WidgetType::TrendLine => serde_json::json!({
                "current": 88.5,
                "previous": 85.2,
                "change": 3.3,
                "direction": "up",
            }),
            WidgetType::RadarChart => serde_json::json!({
                "axes": ["完整性", "准确性", "一致性", "及时性", "唯一性"],
                "values": [90, 85, 88, 82, 95],
            }),
            WidgetType::TreeMap => serde_json::json!({
                "name": "主数据",
                "children": [
                    { "name": "客户", "value": 1280 },
                    { "name": "供应商", "value": 860 },
                    { "name": "物料", "value": 2100 },
                    { "name": "产品", "value": 1540 },
                ],
            }),
        };
        widgets_data.insert(widget.widget_id.clone(), data);
    }

    let summary = vec![
        KpiMetric {
            name: "数据质量评分".to_string(),
            value: 88.5,
            unit: "分".to_string(),
            target: Some(90.0),
            trend: Some(3.3),
            trend_percentage: Some(3.87),
            status: KpiStatus::Warning,
        },
        KpiMetric {
            name: "主数据总量".to_string(),
            value: 5780.0,
            unit: "条".to_string(),
            target: None,
            trend: Some(280.0),
            trend_percentage: Some(5.09),
            status: KpiStatus::Good,
        },
        KpiMetric {
            name: "活跃数据域".to_string(),
            value: 8.0,
            unit: "个".to_string(),
            target: Some(10.0),
            trend: None,
            trend_percentage: None,
            status: KpiStatus::Neutral,
        },
        KpiMetric {
            name: "待处理质量问题".to_string(),
            value: 12.0,
            unit: "项".to_string(),
            target: Some(0.0),
            trend: Some(-5.0),
            trend_percentage: Some(-29.41),
            status: KpiStatus::Critical,
        },
    ];

    Some(DashboardData {
        widgets_data,
        summary,
        generated_at: chrono::Utc::now().to_rfc3339(),
        period: "最近30天".to_string(),
    })
}

/// 获取 KPI 摘要
async fn get_kpi_summary() -> Vec<KpiMetric> {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let dashboard_ids: Vec<String> = store
        .dashboards
        .lock()
        .await
        .iter()
        .map(|d| d.dashboard_id.clone())
        .collect();
    let mut all_kpis: Vec<KpiMetric> = Vec::new();
    for id in dashboard_ids {
        if let Some(data) = get_dashboard_data(&id).await {
            all_kpis.extend(data.summary);
        }
    }
    // 去重：保留同名 KPI 的第一个
    let mut seen: HashSet<String> = HashSet::new();
    all_kpis.retain(|k| seen.insert(k.name.clone()));
    all_kpis
}

/// 刷新仪表盘数据
async fn refresh_dashboard(dashboard_id: &str) -> Option<DashboardData> {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    {
        let mut dashboards = store.dashboards.lock().await;
        let dashboard = dashboards
            .iter_mut()
            .find(|d| d.dashboard_id == dashboard_id)?;
        let now = chrono::Utc::now().to_rfc3339();
        for widget in &mut dashboard.widgets {
            widget.last_updated = now.clone();
        }
        dashboard.updated_at = now;
    }
    get_dashboard_data(dashboard_id).await
}

/// 获取仪表盘统计
async fn get_dashboard_stats() -> DashboardStats {
    ensure_dashboard_initialized().await;
    let store = get_dashboard_store();
    let dashboards = store.dashboards.lock().await.clone();

    let total_widgets: usize = dashboards.iter().map(|d| d.widgets.len()).sum();
    let mut widgets_by_type: HashMap<String, usize> = HashMap::new();
    for d in &dashboards {
        for w in &d.widgets {
            *widgets_by_type
                .entry(w.widget_type.label().to_string())
                .or_insert(0) += 1;
        }
    }
    let avg_refresh_interval = if total_widgets > 0 {
        dashboards
            .iter()
            .flat_map(|d| d.widgets.iter())
            .map(|w| w.refresh_interval as f64)
            .sum::<f64>()
            / total_widgets as f64
    } else {
        0.0
    };
    let last_refreshed = dashboards
        .iter()
        .flat_map(|d| d.widgets.iter().map(|w| w.last_updated.clone()))
        .max();

    DashboardStats {
        total_dashboards: dashboards.len(),
        total_widgets,
        widgets_by_type,
        avg_refresh_interval,
        last_refreshed,
    }
}

// ==================== 仪表盘 Handlers ====================

/// GET /dashboard/{dashboard_id} — 获取仪表盘
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/dashboard/{dashboard_id}",
    tag = "Master Data",
    operation_id = "get_dashboard_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_dashboard_handler(
    State(state): State<ApiState>,
    Path(dashboard_id): Path<String>,
) -> Json<ApiResponse<DashboardLayout>> {
    let _ = &state;
    match get_dashboard(&dashboard_id).await {
        Some(dashboard) => Json(ApiResponse::success(dashboard, "仪表盘获取成功")),
        None => Json(ApiResponse::error(404, "未找到仪表盘")),
    }
}

/// POST /dashboard — 创建仪表盘
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/api/erp/master-data-refs/dashboard",
    tag = "Master Data",
    operation_id = "create_dashboard_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn create_dashboard_handler(
    State(state): State<ApiState>,
    Json(req): Json<DashboardRequest>,
) -> Json<ApiResponse<DashboardLayout>> {
    let _ = &state;
    let dashboard = create_dashboard(&req).await;
    Json(ApiResponse::success(dashboard, "仪表盘创建成功"))
}

/// PUT /dashboard/{dashboard_id} — 更新仪表盘
#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/api/erp/master-data-refs/dashboard/{dashboard_id}",
    tag = "Master Data",
    operation_id = "update_dashboard_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn update_dashboard_handler(
    State(state): State<ApiState>,
    Path(dashboard_id): Path<String>,
    Json(req): Json<DashboardRequest>,
) -> Json<ApiResponse<DashboardLayout>> {
    let _ = &state;
    match update_dashboard(&dashboard_id, &req).await {
        Some(dashboard) => Json(ApiResponse::success(dashboard, "仪表盘更新成功")),
        None => Json(ApiResponse::error(404, "未找到仪表盘")),
    }
}

/// DELETE /dashboard/{dashboard_id} — 删除仪表盘
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/api/erp/master-data-refs/dashboard/{dashboard_id}",
    tag = "Master Data",
    operation_id = "delete_dashboard_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn delete_dashboard_handler(
    State(state): State<ApiState>,
    Path(dashboard_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    if delete_dashboard(&dashboard_id).await {
        Json(ApiResponse::success(
            serde_json::json!({ "dashboard_id": dashboard_id, "deleted": true }),
            "仪表盘删除成功",
        ))
    } else {
        Json(ApiResponse::error(404, "未找到仪表盘"))
    }
}

/// GET /dashboard/{dashboard_id}/data — 获取仪表盘数据
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/dashboard/{dashboard_id}/data",
    tag = "Master Data",
    operation_id = "get_dashboard_data_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_dashboard_data_handler(
    State(state): State<ApiState>,
    Path(dashboard_id): Path<String>,
) -> Json<ApiResponse<DashboardData>> {
    let _ = &state;
    match get_dashboard_data(&dashboard_id).await {
        Some(data) => Json(ApiResponse::success(data, "仪表盘数据获取成功")),
        None => Json(ApiResponse::error(404, "未找到仪表盘")),
    }
}

/// GET /dashboard/kpi/summary — 获取 KPI 摘要
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/dashboard/kpi/summary",
    tag = "Master Data",
    operation_id = "get_kpi_summary_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_kpi_summary_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<KpiMetric>>> {
    let _ = &state;
    let kpis = get_kpi_summary().await;
    Json(ApiResponse::success(kpis, "KPI 摘要获取成功"))
}

/// POST /dashboard/{dashboard_id}/refresh — 刷新仪表盘
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/api/erp/master-data-refs/dashboard/{dashboard_id}/refresh",
    tag = "Master Data",
    operation_id = "refresh_dashboard_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn refresh_dashboard_handler(
    State(state): State<ApiState>,
    Path(dashboard_id): Path<String>,
) -> Json<ApiResponse<DashboardData>> {
    let _ = &state;
    match refresh_dashboard(&dashboard_id).await {
        Some(data) => Json(ApiResponse::success(data, "仪表盘刷新成功")),
        None => Json(ApiResponse::error(404, "未找到仪表盘")),
    }
}

/// GET /dashboard/stats — 获取仪表盘统计
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/erp/master-data-refs/dashboard/stats",
    tag = "Master Data",
    operation_id = "get_dashboard_stats_handler",
    responses((status = 200, description = "OK")),
)]
pub async fn get_dashboard_stats_handler(
    State(state): State<ApiState>,
) -> Json<ApiResponse<DashboardStats>> {
    let _ = &state;
    let stats = get_dashboard_stats().await;
    Json(ApiResponse::success(stats, "仪表盘统计获取成功"))
}
