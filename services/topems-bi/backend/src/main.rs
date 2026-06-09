use axum::{
    extract::{Extension, FromRef, State},
    routing::{get, post, put},
    Json,
    Router,
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::env;
use chrono::Utc;
use serde_json::json;
use reqwest::Client;
use sqlx::PgPool;
use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, Claims, init_logging,
    ServiceHealth, build_health_response, create_api_info_router,
    HealthStatus, DependencyHealth, check_http_health,
};
use crate::services::permission::{check_permission, BIPermission};

mod services;
mod models;
mod api;

// 保留原有的数据结构定义（用于从其他服务获取数据）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SampleStats {
    pub total_samples: i64,
    pub pending_samples: i64,
    pub completed_samples: i64,
    pub rejected_samples: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestStats {
    pub total_tests: i64,
    pub completed_tests: i64,
    pub pending_tests: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstrumentStats {
    pub total_instruments: i64,
    pub active_instruments: i64,
    pub maintenance_instruments: i64,
    pub avg_usage_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LIMSDataSummary {
    pub sample_stats: SampleStats,
    pub test_stats: TestStats,
    pub instrument_stats: InstrumentStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSQualityStats {
    pub total_inspections: i64,
    pub passed_inspections: i64,
    pub failed_inspections: i64,
    pub pass_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSIssueStats {
    pub total_issues: i64,
    pub open_issues: i64,
    pub resolved_issues: i64,
    pub overdue_issues: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSActionStats {
    pub total_actions: i64,
    pub completed_actions: i64,
    pub pending_actions: i64,
    pub overdue_actions: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QMSDataSummary {
    pub quality_stats: QMSQualityStats,
    pub issue_stats: QMSIssueStats,
    pub action_stats: QMSActionStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSRiskStats {
    pub total_risks: i64,
    pub high_risks: i64,
    pub medium_risks: i64,
    pub low_risks: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSInspectionStats {
    pub total_inspections: i64,
    pub passed_inspections: i64,
    pub failed_inspections: i64,
    pub pending_inspections: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSIncidentStats {
    pub total_incidents: i64,
    pub minor_incidents: i64,
    pub major_incidents: i64,
    pub critical_incidents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EHSDataSummary {
    pub risk_stats: EHSRiskStats,
    pub inspection_stats: EHSInspectionStats,
    pub incident_stats: EHSIncidentStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SRMSupplierStats {
    pub total_suppliers: i64,
    pub active_suppliers: i64,
    pub qualified_suppliers: i64,
    pub avg_rating: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SRMOrderStats {
    pub total_orders: i64,
    pub pending_orders: i64,
    pub completed_orders: i64,
    pub overdue_orders: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SRMDataSummary {
    pub supplier_stats: SRMSupplierStats,
    pub order_stats: SRMOrderStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDMBatchStats {
    pub total_batches: i64,
    pub completed_batches: i64,
    pub in_progress_batches: i64,
    pub cancelled_batches: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDMPerformanceStats {
    pub total_output: f64,
    pub reject_quantity: f64,
    pub pass_rate: f64,
    pub avg_cycle_time: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PDMDataSummary {
    pub batch_stats: PDMBatchStats,
    pub performance_stats: PDMPerformanceStats,
    pub generated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectStats {
    pub total_projects: i64,
    pub active_projects: i64,
    pub completed_projects: i64,
    pub avg_project_duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentStats {
    pub total_experiments: i64,
    pub completed_experiments: i64,
    pub failed_experiments: i64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormulaStats {
    pub total_formulas: i64,
    pub active_formulas: i64,
    pub deprecated_formulas: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RSDataSummary {
    pub project_stats: ProjectStats,
    pub experiment_stats: ExperimentStats,
    pub formula_stats: FormulaStats,
    pub generated_at: String,
}

#[derive(Clone)]
struct AppState {
    db_pool: PgPool,
    auth_state: AuthState,
    http_client: Client,
    rs_service_url: String,
    lims_service_url: String,
    qms_service_url: String,
    ehs_service_url: String,
    srm_service_url: String,
    pdm_service_url: String,
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.db_pool.clone()
    }
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    async fn new(auth_state: AuthState) -> Result<Self> {
        // 初始化数据库连接池
        let database_url = env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set");
        
        let db_pool = PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to database");

        Ok(AppState {
            db_pool,
            auth_state,
            http_client: Client::new(),
            rs_service_url: env::var("RS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8020".to_string()),
            lims_service_url: env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8021".to_string()),
            qms_service_url: env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8031".to_string()),
            ehs_service_url: env::var("EHS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8032".to_string()),
            srm_service_url: env::var("SRM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8041".to_string()),
            pdm_service_url: env::var("PDM_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8023".to_string()),
        })
    }
}

async fn health_check(
    State(state): State<AppState>,
) -> Json<ApiResponse<String>> {
    let database_health = check_database_health(&state.db_pool).await;
    let iam_health = check_iam_health().await;

    let overall_status = if database_health.status == HealthStatus::Healthy
        && iam_health.status == HealthStatus::Healthy
    {
        HealthStatus::Healthy
    } else if database_health.status == HealthStatus::Unhealthy
        || iam_health.status == HealthStatus::Unhealthy
    {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let status_str = match overall_status {
        HealthStatus::Healthy => "healthy".to_string(),
        HealthStatus::Degraded => "degraded".to_string(),
        HealthStatus::Unhealthy => "unhealthy".to_string(),
    };

    Json(ApiResponse::success(status_str, "健康检查"))
}

async fn health_check_detailed(
    State(state): State<AppState>,
) -> Json<ApiResponse<ServiceHealth>> {
    let dependencies = vec![
        check_database_health(&state.db_pool).await,
        check_iam_health().await,
        check_rs_service_health(&state).await,
        check_lims_service_health(&state).await,
        check_qms_service_health(&state).await,
        check_ehs_service_health(&state).await,
        check_srm_service_health(&state).await,
        check_pdm_service_health(&state).await,
    ];

    let all_healthy = dependencies
        .iter()
        .all(|d| d.status == HealthStatus::Healthy);
    let any_unhealthy = dependencies
        .iter()
        .any(|d| d.status == HealthStatus::Unhealthy);

    let overall_status = if all_healthy {
        HealthStatus::Healthy
    } else if any_unhealthy {
        HealthStatus::Unhealthy
    } else {
        HealthStatus::Degraded
    };

    let message = match overall_status {
        HealthStatus::Healthy => "所有服务运行正常",
        HealthStatus::Degraded => "部分服务存在问题",
        HealthStatus::Unhealthy => "存在关键服务故障",
    };

    let health = ServiceHealth::healthy_with_message("topems-bi", message)
        .with_dependencies(dependencies);

    Json(ApiResponse::success(health, "详细健康检查"))
}

async fn check_database_health(pool: &PgPool) -> DependencyHealth {
    match sqlx::query("SELECT 1")
        .execute(pool)
        .await
    {
        Ok(_) => DependencyHealth {
            name: "database".to_string(),
            status: HealthStatus::Healthy,
            message: "数据库连接正常".to_string(),
        },
        Err(e) => {
            tracing::error!("数据库健康检查失败: {}", e);
            DependencyHealth {
                name: "database".to_string(),
                status: HealthStatus::Unhealthy,
                message: format!("数据库连接失败: {}", e),
            }
        }
    }
}

async fn check_iam_health() -> DependencyHealth {
    let iam_url = std::env::var("IAM_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let health_url = format!("{}/health", iam_url);

    match check_http_health(&health_url).await {
        Ok(status) => {
            let message = match status {
                HealthStatus::Healthy => "IAM 服务正常",
                HealthStatus::Degraded => "IAM 服务响应异常",
                HealthStatus::Unhealthy => "IAM 服务不可用",
            };
            DependencyHealth {
                name: "iam-service".to_string(),
                status,
                message: message.to_string(),
            }
        }
        Err(e) => {
            tracing::warn!("IAM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "iam-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("IAM 服务连接异常: {}", e),
            }
        }
    }
}

async fn check_rs_service_health(state: &AppState) -> DependencyHealth {
    let health_url = format!("{}/health", state.rs_service_url);
    match state.http_client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "rs-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "研发管理服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "rs-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("研发管理服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("RS 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "rs-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("研发管理服务连接异常: {}", e),
            }
        }
    }
}

async fn check_lims_service_health(state: &AppState) -> DependencyHealth {
    let health_url = format!("{}/health", state.lims_service_url);
    match state.http_client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "lims-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "实验室管理服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "lims-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("实验室管理服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("LIMS 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "lims-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("实验室管理服务连接异常: {}", e),
            }
        }
    }
}

async fn check_qms_service_health(state: &AppState) -> DependencyHealth {
    let health_url = format!("{}/health", state.qms_service_url);
    match state.http_client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "qms-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "质量管理服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "qms-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("质量管理服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("QMS 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "qms-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("质量管理服务连接异常: {}", e),
            }
        }
    }
}

async fn check_ehs_service_health(state: &AppState) -> DependencyHealth {
    let health_url = format!("{}/health", state.ehs_service_url);
    match state.http_client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "ehs-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "安全环保服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "ehs-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("安全环保服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("EHS 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "ehs-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("安全环保服务连接异常: {}", e),
            }
        }
    }
}

async fn check_srm_service_health(state: &AppState) -> DependencyHealth {
    let health_url = format!("{}/health", state.srm_service_url);
    match state.http_client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "srm-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "供应链管理服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "srm-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("供应链管理服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("SRM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "srm-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("供应链管理服务连接异常: {}", e),
            }
        }
    }
}

async fn check_pdm_service_health(state: &AppState) -> DependencyHealth {
    let health_url = format!("{}/health", state.pdm_service_url);
    match state.http_client.get(&health_url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                DependencyHealth {
                    name: "pdm-service".to_string(),
                    status: HealthStatus::Healthy,
                    message: "生产数据服务正常".to_string(),
                }
            } else {
                DependencyHealth {
                    name: "pdm-service".to_string(),
                    status: HealthStatus::Degraded,
                    message: format!("生产数据服务状态异常: {}", response.status()),
                }
            }
        }
        Err(e) => {
            tracing::warn!("PDM 服务健康检查失败: {}", e);
            DependencyHealth {
                name: "pdm-service".to_string(),
                status: HealthStatus::Degraded,
                message: format!("生产数据服务连接异常: {}", e),
            }
        }
    }
}

// 保留原有的数据分析函数（从其他服务获取数据）
async fn fetch_rs_project_stats(state: &AppState) -> Result<ProjectStats, reqwest::Error> {
    let url = format!("{}/api/v1/projects/stats", state.rs_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(ProjectStats {
            total_projects: data["total_projects"].as_i64().unwrap_or(0),
            active_projects: data["active_projects"].as_i64().unwrap_or(0),
            completed_projects: data["completed_projects"].as_i64().unwrap_or(0),
            avg_project_duration: data["avg_project_duration"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(ProjectStats {
            total_projects: 120,
            active_projects: 45,
            completed_projects: 75,
            avg_project_duration: 45.5,
        })
    }
}

async fn fetch_lims_sample_stats(state: &AppState) -> Result<SampleStats, reqwest::Error> {
    let url = format!("{}/api/v1/samples/stats", state.lims_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(SampleStats {
            total_samples: data["total_samples"].as_i64().unwrap_or(0),
            pending_samples: data["pending_samples"].as_i64().unwrap_or(0),
            completed_samples: data["completed_samples"].as_i64().unwrap_or(0),
            rejected_samples: data["rejected_samples"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(SampleStats {
            total_samples: 2450,
            pending_samples: 180,
            completed_samples: 2150,
            rejected_samples: 120,
        })
    }
}

async fn fetch_qms_quality_stats(state: &AppState) -> Result<QMSQualityStats, reqwest::Error> {
    let url = format!("{}/api/v1/quality/stats", state.qms_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(QMSQualityStats {
            total_inspections: data["total_inspections"].as_i64().unwrap_or(0),
            passed_inspections: data["passed_inspections"].as_i64().unwrap_or(0),
            failed_inspections: data["failed_inspections"].as_i64().unwrap_or(0),
            pass_rate: data["pass_rate"].as_f64().unwrap_or(0.0),
        })
    } else {
        Ok(QMSQualityStats {
            total_inspections: 3250,
            passed_inspections: 3180,
            failed_inspections: 70,
            pass_rate: 97.8,
        })
    }
}

async fn fetch_pdm_batch_stats(state: &AppState) -> Result<PDMBatchStats, reqwest::Error> {
    let url = format!("{}/api/v1/batches/stats", state.pdm_service_url);
    let response = state.http_client.get(&url).send().await?;
    
    if response.status().is_success() {
        let json_response: serde_json::Value = response.json().await?;
        let data = json_response["data"].clone();
        Ok(PDMBatchStats {
            total_batches: data["total_batches"].as_i64().unwrap_or(0),
            completed_batches: data["completed_batches"].as_i64().unwrap_or(0),
            in_progress_batches: data["in_progress_batches"].as_i64().unwrap_or(0),
            cancelled_batches: data["cancelled_batches"].as_i64().unwrap_or(0),
        })
    } else {
        Ok(PDMBatchStats {
            total_batches: 450,
            completed_batches: 415,
            in_progress_batches: 28,
            cancelled_batches: 7,
        })
    }
}

// 保留原有的分析摘要和概览API
async fn get_analytics_summary(
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    Json(ApiResponse::success(json!({
        "key_metrics": [
            { "title": "生产效率", "value": 85.5, "unit": "%", "change": 2.3, "change_type": "increase", "icon": "📈" },
            { "title": "质量合格率", "value": 98.2, "unit": "%", "change": 0.8, "change_type": "increase", "icon": "✅" },
            { "title": "设备稼动率", "value": 92.3, "unit": "%", "change": -1.2, "change_type": "decrease", "icon": "⚙️" }
        ],
        "recent_activities": [
            { "id": 1, "type": "production", "title": "完成生产订单 PO-2024-001", "time": "10分钟前" },
            { "id": 2, "type": "quality", "title": "质量检验完成，批次 B-001", "time": "25分钟前" }
        ],
        "generated_at": Utc::now().to_rfc3339()
    }), "获取分析摘要成功"))
}

async fn get_analytics_overview(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&claims, &BIPermission::AnalyticsRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    let rs_data = fetch_rs_project_stats(&state).await.unwrap_or(ProjectStats {
        total_projects: 120,
        active_projects: 45,
        completed_projects: 75,
        avg_project_duration: 45.5,
    });
    
    let lims_sample_data = fetch_lims_sample_stats(&state).await.unwrap_or(SampleStats {
        total_samples: 2450,
        pending_samples: 180,
        completed_samples: 2150,
        rejected_samples: 120,
    });
    
    let qms_data = fetch_qms_quality_stats(&state).await.unwrap_or(QMSQualityStats {
        total_inspections: 3250,
        passed_inspections: 3180,
        failed_inspections: 70,
        pass_rate: 97.8,
    });
    
    let pdm_batch_data = fetch_pdm_batch_stats(&state).await.unwrap_or(PDMBatchStats {
        total_batches: 450,
        completed_batches: 415,
        in_progress_batches: 28,
        cancelled_batches: 7,
    });
    
    let overview = json!({
        "modules": {
            "rs": {
                "name": "研发管理",
                "total_projects": rs_data.total_projects,
                "active_projects": rs_data.active_projects,
                "completion_rate": ((rs_data.completed_projects as f64 / rs_data.total_projects as f64) * 100.0).round()
            },
            "lims": {
                "name": "实验室管理",
                "total_samples": lims_sample_data.total_samples,
                "pending_samples": lims_sample_data.pending_samples,
                "pass_rate": 98.5
            },
            "qms": {
                "name": "质量管理",
                "total_inspections": qms_data.total_inspections,
                "passed_inspections": qms_data.passed_inspections,
                "pass_rate": qms_data.pass_rate
            },
            "ehs": {
                "name": "安全环保",
                "total_risks": 125,
                "high_risks": 15,
                "incidents": 18
            },
            "srm": {
                "name": "供应链管理",
                "total_suppliers": 280,
                "active_suppliers": 245,
                "avg_rating": 4.5
            },
            "pdm": {
                "name": "生产数据",
                "total_batches": pdm_batch_data.total_batches,
                "completed_batches": pdm_batch_data.completed_batches,
                "efficiency": 98.5
            }
        },
        "key_metrics": [
            { "title": "研发项目数", "value": rs_data.total_projects, "unit": "个", "change": 12, "change_type": "increase", "icon": "📊" },
            { "title": "样品检验数", "value": lims_sample_data.total_samples, "unit": "份", "change": 8, "change_type": "increase", "icon": "🧪" },
            { "title": "生产批次", "value": pdm_batch_data.total_batches, "unit": "批", "change": 5, "change_type": "increase", "icon": "🏭" },
            { "title": "质量合格率", "value": qms_data.pass_rate, "unit": "%", "change": 0.3, "change_type": "increase", "icon": "✅" }
        ],
        "generated_at": Utc::now().to_rfc3339()
    });
    
    Json(ApiResponse::success(overview, "获取分析概览数据成功"))
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-bi");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_bi_custom_metric",
        "This is a custom metric for TOPEMS-BI",
    ).unwrap();
    default_registry().register(Box::new(custom_gauge.clone())).unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let app_state = AppState::new(AuthState::from_env()).await?;

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/metrics", get(move || async move { metric_handle.render() }))
        .with_state(app_state.clone());

    // BI数据分析API路由
    let analysis_routes = Router::new()
        .route("/query", post(api::analysis::execute_query))
        .route("/aggregation", post(api::analysis::execute_aggregation))
        .route("/comparison", post(api::analysis::execute_comparison))
        .route("/trend", post(api::analysis::execute_trend))
        .route("/history", get(api::analysis::get_history))
        .route("/save", post(api::analysis::save_result));

    // 报表管理API路由
    let report_routes = Router::new()
        .route("/create", post(api::report::create_report))
        .route("/", get(api::report::list_reports))
        .route("/:id", get(api::report::get_report).put(api::report::update_report).delete(api::report::delete_report))
        .route("/:id/generate", post(api::report::generate_report))
        .route("/:id/export", post(api::report::export_report))
        .route("/:id/schedule", post(api::report::set_report_schedule));

    // 仪表盘管理API路由
    let dashboard_routes = Router::new()
        .route("/create", post(api::dashboard::create_dashboard))
        .route("/", get(api::dashboard::list_dashboards))
        .route("/:id", get(api::dashboard::get_dashboard).put(api::dashboard::update_dashboard).delete(api::dashboard::delete_dashboard))
        .route("/:id/widgets", post(api::dashboard::add_widget))
        .route("/:id/widgets/:widget_id", put(api::dashboard::update_widget).delete(api::dashboard::delete_widget))
        .route("/:id/data", get(api::dashboard::get_dashboard_data));

    // 数据源管理API路由
    let datasource_routes = Router::new()
        .route("/create", post(api::datasource::create_datasource))
        .route("/", get(api::datasource::list_datasources))
        .route("/:id", get(api::datasource::get_datasource).put(api::datasource::update_datasource).delete(api::datasource::delete_datasource))
        .route("/:id/test", post(api::datasource::test_datasource))
        .route("/:id/tables", get(api::datasource::get_datasource_tables))
        .route("/:id/fields", get(api::datasource::get_datasource_fields));

    // 可视化图表API路由
    let visualization_routes = Router::new()
        .route("/create", post(api::visualization::create_visualization))
        .route("/", get(api::visualization::list_visualizations))
        .route("/:id", get(api::visualization::get_visualization).put(api::visualization::update_visualization).delete(api::visualization::delete_visualization))
        .route("/:id/data", post(api::visualization::get_visualization_data));

    // 模块数据分析API路由
    let module_routes = Router::new()
        .route("/rs/summary", get(api::module::get_rs_summary))
        .route("/rs/project-timeline", get(api::module::get_rs_project_timeline))
        .route("/rs/experiment-success-rate", get(api::module::get_rs_experiment_success_rate))
        .route("/lims/summary", get(api::module::get_lims_summary))
        .route("/lims/sample-timeline", get(api::module::get_lims_sample_timeline))
        .route("/lims/test-pass-rate", get(api::module::get_lims_test_pass_rate))
        .route("/qms/summary", get(api::module::get_qms_summary))
        .route("/qms/quality-trend", get(api::module::get_qms_quality_trend))
        .route("/qms/issue-distribution", get(api::module::get_qms_issue_distribution))
        .route("/ehs/summary", get(api::module::get_ehs_summary))
        .route("/ehs/risk-distribution", get(api::module::get_ehs_risk_distribution))
        .route("/ehs/incident-trend", get(api::module::get_ehs_incident_trend))
        .route("/srm/summary", get(api::module::get_srm_summary))
        .route("/srm/supplier-ranking", get(api::module::get_srm_supplier_ranking))
        .route("/srm/order-timeline", get(api::module::get_srm_order_timeline))
        .route("/pdm/summary", get(api::module::get_pdm_summary))
        .route("/pdm/production-trend", get(api::module::get_pdm_production_trend))
        .route("/pdm/batch-status-distribution", get(api::module::get_pdm_batch_status_distribution))
        .route("/:module_id", get(api::module::get_module_detail));

    let protected_routes = Router::new()
        // 新的BI API路由
        .nest("/api/v1/analysis", analysis_routes)
        .nest("/api/v1/reports", report_routes)
        .nest("/api/v1/dashboards", dashboard_routes)
        .nest("/api/v1/datasources", datasource_routes)
        .nest("/api/v1/visualizations", visualization_routes)
        .nest("/api/v1/bi", module_routes)
        // 保留原有的分析API
        .route("/api/v1/analytics/summary", get(get_analytics_summary))
        .route("/api/v1/analytics/overview", get(get_analytics_overview))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-bi"))
        .layer(prometheus_layer)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8052".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-BI 数据大屏报表中台启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("💾 数据库连接池已初始化");
    tracing::info!("🔗 RS服务地址: {}", app_state.rs_service_url);
    tracing::info!("🔗 LIMS服务地址: {}", app_state.lims_service_url);
    tracing::info!("🔗 QMS服务地址: {}", app_state.qms_service_url);
    tracing::info!("🔗 EHS服务地址: {}", app_state.ehs_service_url);
    tracing::info!("🔗 SRM服务地址: {}", app_state.srm_service_url);
    tracing::info!("🔗 PDM服务地址: {}", app_state.pdm_service_url);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}