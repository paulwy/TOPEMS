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
