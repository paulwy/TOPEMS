//! Analytics summary handlers
//! Provides mock data for BI dashboard analytics

use axum::Json;
use chrono::Utc;
use serde_json::Value;

/// Get summary dashboard analytics
pub async fn get_summary_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "key_metrics": [
                {
                    "title": "活跃项目",
                    "value": 42,
                    "unit": "个",
                    "change": 12.5,
                    "change_type": "increase",
                    "icon": "folder"
                },
                {
                    "title": "质检通过率",
                    "value": 96.8,
                    "unit": "%",
                    "change": 2.3,
                    "change_type": "increase",
                    "icon": "check-circle"
                },
                {
                    "title": "生产批次",
                    "value": 128,
                    "unit": "批",
                    "change": -5.2,
                    "change_type": "decrease",
                    "icon": "package"
                },
                {
                    "title": "实验室样本",
                    "value": 856,
                    "unit": "个",
                    "change": 18.7,
                    "change_type": "increase",
                    "icon": "flask"
                }
            ],
            "recent_activities": [
                {
                    "id": 1,
                    "type": "project",
                    "title": "新研发项目启动",
                    "time": "2小时前"
                },
                {
                    "id": 2,
                    "type": "quality",
                    "title": "质检报告已提交",
                    "time": "4小时前"
                },
                {
                    "id": 3,
                    "type": "production",
                    "title": "生产批次完成",
                    "time": "6小时前"
                }
            ],
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取汇总数据成功"
    }))
}

/// Get development analytics (研发)
pub async fn get_development_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "total_projects": 156,
            "active_projects": 42,
            "completed_projects": 98,
            "project_status_distribution": {
                "in_progress": 42,
                "pending_approval": 12,
                "completed": 98,
                "cancelled": 4
            },
            "monthly_new_projects": [
                {"month": "2026-01", "count": 8},
                {"month": "2026-02", "count": 12},
                {"month": "2026-03", "count": 15},
                {"month": "2026-04", "count": 10},
                {"month": "2026-05", "count": 18},
                {"month": "2026-06", "count": 14}
            ],
            "project_type_distribution": {
                "research": 45,
                "development": 78,
                "improvement": 33
            },
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取研发分析数据成功"
    }))
}

/// Get quality analytics (质量)
pub async fn get_quality_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "total_inspections": 1248,
            "passed_inspections": 1208,
            "failed_inspections": 40,
            "pass_rate": 96.8,
            "quality_trend": [
                {"month": "2026-01", "pass_rate": 94.2},
                {"month": "2026-02", "pass_rate": 95.1},
                {"month": "2026-03", "pass_rate": 96.3},
                {"month": "2026-04", "pass_rate": 95.8},
                {"month": "2026-05", "pass_rate": 97.1},
                {"month": "2026-06", "pass_rate": 96.8}
            ],
            "defect_types": {
                "material": 15,
                "process": 12,
                "equipment": 8,
                "other": 5
            },
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取质量分析数据成功"
    }))
}

/// Get production analytics (生产)
pub async fn get_production_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "total_production_batches": 256,
            "completed_batches": 198,
            "in_progress_batches": 58,
            "production_efficiency": 87.5,
            "daily_output": [
                {"date": "2026-06-16", "output": 1250},
                {"date": "2026-06-17", "output": 1380},
                {"date": "2026-06-18", "output": 1420},
                {"date": "2026-06-19", "output": 1290},
                {"date": "2026-06-20", "output": 1450},
                {"date": "2026-06-21", "output": 1320}
            ],
            "product_line_usage": {
                "line_a": 85.2,
                "line_b": 78.6,
                "line_c": 92.1
            },
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取生产分析数据成功"
    }))
}

/// Get laboratory analytics (实验室)
pub async fn get_laboratory_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "total_samples": 856,
            "completed_tests": 724,
            "pending_tests": 132,
            "instrument_usage_rate": 82.5,
            "test_type_distribution": {
                "chemical": 312,
                "physical": 245,
                "microbiological": 178,
                "other": 121
            },
            "turnaround_time": {
                "avg_hours": 24.5,
                "max_hours": 72.0,
                "min_hours": 4.0
            },
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取实验室分析数据成功"
    }))
}

/// Get analytics overview
pub async fn get_analytics_overview() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "development": {
                "active_projects": 42,
                "completion_rate": 62.8
            },
            "quality": {
                "pass_rate": 96.8,
                "total_inspections": 1248
            },
            "production": {
                "efficiency": 87.5,
                "active_batches": 58
            },
            "laboratory": {
                "pending_tests": 132,
                "avg_turnaround_hours": 24.5
            },
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取分析概览成功"
    }))
}

/// Get analytics report
pub async fn get_analytics_report() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "items": [
                {
                    "id": "1",
                    "name": "研发项目进度报告",
                    "category": "development",
                    "type": "project",
                    "status": "generated",
                    "generated_at": "2026-07-03T10:30:00Z",
                    "period": "weekly",
                    "description": "本周研发项目进度汇总报告"
                },
                {
                    "id": "2",
                    "name": "质量检测周报",
                    "category": "quality",
                    "type": "inspection",
                    "status": "generated",
                    "generated_at": "2026-07-03T09:00:00Z",
                    "period": "weekly",
                    "description": "本周质量检测数据分析报告"
                },
                {
                    "id": "3",
                    "name": "生产效率月报",
                    "category": "production",
                    "type": "production",
                    "status": "generating",
                    "generated_at": "2026-07-01T00:00:00Z",
                    "period": "monthly",
                    "description": "本月生产效率分析报告"
                },
                {
                    "id": "4",
                    "name": "实验室测试统计",
                    "category": "laboratory",
                    "type": "laboratory",
                    "status": "generated",
                    "generated_at": "2026-07-02T16:00:00Z",
                    "period": "daily",
                    "description": "今日实验室测试统计报告"
                },
                {
                    "id": "5",
                    "name": "供应商绩效评估",
                    "category": "srm",
                    "type": "supplier",
                    "status": "generated",
                    "generated_at": "2026-06-30T17:00:00Z",
                    "period": "monthly",
                    "description": "本月供应商绩效评估报告"
                },
                {
                    "id": "6",
                    "name": "EHS安全周报",
                    "category": "ehs",
                    "type": "safety",
                    "status": "generated",
                    "generated_at": "2026-07-03T11:00:00Z",
                    "period": "weekly",
                    "description": "本周环境健康安全报告"
                }
            ],
            "total": 6,
            "page": 1,
            "pageSize": 20
        },
        "message": "获取分析报告列表成功"
    }))
}

/// Get SRM analytics (供应商管理)
pub async fn get_srm_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "total_suppliers": 156,
            "active_suppliers": 138,
            "new_suppliers": 12,
            "supplier_rating_distribution": {
                "excellent": 45,
                "good": 78,
                "medium": 28,
                "poor": 5
            },
            "delivery_on_time_rate": 94.2,
            "quality_compliance_rate": 97.5,
            "monthly_new_suppliers": [
                {"month": "2026-01", "count": 3},
                {"month": "2026-02", "count": 5},
                {"month": "2026-03", "count": 2},
                {"month": "2026-04", "count": 4},
                {"month": "2026-05", "count": 6},
                {"month": "2026-06", "count": 3}
            ],
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取供应商管理分析数据成功"
    }))
}

/// Get EHS analytics (环境健康安全)
pub async fn get_ehs_analytics() -> Json<Value> {
    Json(serde_json::json!({
        "code": 0,
        "success": true,
        "data": {
            "total_incidents": 24,
            "safety_accidents": 8,
            "environmental_incidents": 6,
            "health_issues": 10,
            "safety_compliance_rate": 98.5,
            "training_completion_rate": 96.2,
            "incident_trend": [
                {"month": "2026-01", "count": 5},
                {"month": "2026-02", "count": 4},
                {"month": "2026-03", "count": 3},
                {"month": "2026-04", "count": 6},
                {"month": "2026-05", "count": 4},
                {"month": "2026-06", "count": 2}
            ],
            "risk_level_distribution": {
                "high": 3,
                "medium": 12,
                "low": 45
            },
            "generated_at": Utc::now().to_rfc3339()
        },
        "message": "获取环境健康安全分析数据成功"
    }))
}
