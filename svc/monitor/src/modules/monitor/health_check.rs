use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;
use uuid::Uuid;

use crate::AppState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Serialize)]
pub struct ServiceHealth {
    pub id: Uuid,
    pub service_name: String,
    pub status: String,
    pub uptime: String,
    pub response_time: f64,
    pub last_check: chrono::DateTime<chrono::Utc>,
}

// ==================== 纯函数（无副作用，便于单元测试） ====================

/// 根据多个服务的状态汇总整体健康度。
/// - 任一 "down" => "down"
/// - 任一 "degraded" 且无 "down" => "degraded"
/// - 否则 => "healthy"
/// - 空列表 => "healthy"
pub fn determine_health(statuses: &[&str]) -> &'static str {
    if statuses.is_empty() {
        return "healthy";
    }
    if statuses.contains(&"down") {
        return "down";
    }
    if statuses.contains(&"degraded") {
        return "degraded";
    }
    "healthy"
}

/// 按响应时间（毫秒）分级服务状态。
/// - rt < 100  => "healthy"
/// - rt < 500  => "degraded"
/// - rt >= 500 => "slow"
pub fn classify_response_time(rt_ms: f64) -> &'static str {
    if rt_ms < 100.0 {
        "healthy"
    } else if rt_ms < 500.0 {
        "degraded"
    } else {
        "slow"
    }
}

/// 将天/时/分格式化为运行时长字符串，如 "2d 5h 30m"。
pub fn format_uptime(days: u64, hours: u64, minutes: u64) -> String {
    format!("{}d {}h {}m", days, hours, minutes)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(get_service_health))
        .route("/infrastructure", get(get_infrastructure_health))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/health",
    tag = "health",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_service_health(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<ServiceHealth>>> {
    let services = vec![
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-iam".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 5h 30m".to_string(),
            response_time: 12.5,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-crm".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 12h 15m".to_string(),
            response_time: 25.8,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-hrm".to_string(),
            status: "healthy".to_string(),
            uptime: "3d 8h 45m".to_string(),
            response_time: 18.2,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-pm".to_string(),
            status: "degraded".to_string(),
            uptime: "5h 30m".to_string(),
            response_time: 150.3,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-erp".to_string(),
            status: "healthy".to_string(),
            uptime: "4d 2h 10m".to_string(),
            response_time: 32.5,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-wms".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 18h 0m".to_string(),
            response_time: 28.7,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-scm".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 6h 30m".to_string(),
            response_time: 45.2,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-lims".to_string(),
            status: "healthy".to_string(),
            uptime: "6h 45m".to_string(),
            response_time: 35.8,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-qms".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 10h 0m".to_string(),
            response_time: 22.4,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-ehs".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 4h 20m".to_string(),
            response_time: 38.6,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-pdm".to_string(),
            status: "healthy".to_string(),
            uptime: "3d 15h 0m".to_string(),
            response_time: 42.1,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-rd".to_string(),
            status: "healthy".to_string(),
            uptime: "8h 10m".to_string(),
            response_time: 55.3,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-srm".to_string(),
            status: "healthy".to_string(),
            uptime: "2d 3h 45m".to_string(),
            response_time: 30.9,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-mes".to_string(),
            status: "healthy".to_string(),
            uptime: "1d 16h 30m".to_string(),
            response_time: 48.5,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-bi".to_string(),
            status: "healthy".to_string(),
            uptime: "5d 2h 0m".to_string(),
            response_time: 65.2,
            last_check: chrono::Utc::now(),
        },
        ServiceHealth {
            id: Uuid::new_v4(),
            service_name: "topems-ai".to_string(),
            status: "healthy".to_string(),
            uptime: "4h 50m".to_string(),
            response_time: 120.5,
            last_check: chrono::Utc::now(),
        },
    ];

    Json(ApiResponse::success(services, "获取服务健康状态成功"))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- determine_health ----

    #[test]
    fn test_determine_health_all_healthy() {
        assert_eq!(
            determine_health(&["healthy", "healthy", "healthy"]),
            "healthy"
        );
    }

    #[test]
    fn test_determine_health_with_degraded() {
        assert_eq!(
            determine_health(&["healthy", "degraded", "healthy"]),
            "degraded"
        );
    }

    #[test]
    fn test_determine_health_with_down() {
        assert_eq!(determine_health(&["healthy", "down", "degraded"]), "down");
    }

    #[test]
    fn test_determine_health_empty() {
        assert_eq!(determine_health(&[]), "healthy");
    }

    #[test]
    fn test_determine_health_single_down() {
        assert_eq!(determine_health(&["down"]), "down");
    }

    #[test]
    fn test_determine_health_single_degraded() {
        assert_eq!(determine_health(&["degraded"]), "degraded");
    }

    #[test]
    fn test_determine_health_unknown_status() {
        assert_eq!(determine_health(&["unknown"]), "healthy");
    }

    // ---- classify_response_time ----

    #[test]
    fn test_classify_response_time_healthy() {
        assert_eq!(classify_response_time(50.0), "healthy");
        assert_eq!(classify_response_time(99.99), "healthy");
    }

    #[test]
    fn test_classify_response_time_degraded() {
        assert_eq!(classify_response_time(100.0), "degraded");
        assert_eq!(classify_response_time(499.9), "degraded");
    }

    #[test]
    fn test_classify_response_time_slow() {
        assert_eq!(classify_response_time(500.0), "slow");
        assert_eq!(classify_response_time(1000.0), "slow");
    }

    #[test]
    fn test_classify_response_time_zero() {
        assert_eq!(classify_response_time(0.0), "healthy");
    }

    #[test]
    fn test_classify_response_time_boundary_100() {
        assert_eq!(classify_response_time(100.0), "degraded");
        assert_eq!(classify_response_time(99.99), "healthy");
    }

    #[test]
    fn test_classify_response_time_boundary_500() {
        assert_eq!(classify_response_time(499.99), "degraded");
        assert_eq!(classify_response_time(500.0), "slow");
    }

    #[test]
    fn test_classify_response_time_negative() {
        assert_eq!(classify_response_time(-10.0), "healthy");
    }

    // ---- format_uptime ----

    #[test]
    fn test_format_uptime_normal() {
        assert_eq!(format_uptime(2, 5, 30), "2d 5h 30m");
    }

    #[test]
    fn test_format_uptime_zeros() {
        assert_eq!(format_uptime(0, 0, 0), "0d 0h 0m");
    }

    #[test]
    fn test_format_uptime_large_values() {
        assert_eq!(format_uptime(365, 23, 59), "365d 23h 59m");
    }

    #[test]
    fn test_format_uptime_only_minutes() {
        assert_eq!(format_uptime(0, 0, 45), "0d 0h 45m");
    }

    #[test]
    fn test_format_uptime_only_hours() {
        assert_eq!(format_uptime(0, 8, 0), "0d 8h 0m");
    }
}

#[derive(Debug, Serialize)]
pub struct InfrastructureHealth {
    pub component: String,
    pub status: String,
    pub value: String,
    pub detail: String,
}

/// 基础架构健康四格：API 网关 / 消息队列 / 数据库 / 缓存。
/// - api_gateway：模块化单体网关进程（本服务），uptime 实测
/// - message_queue：项目未部署消息队列组件（Kafka/RabbitMQ 等），如实标记 absent
/// - database：PostgreSQL SELECT 1 实测（响应耗时）
/// - cache：进程内缓存（portal 聚合 / GraphQL 查询缓存），未启用 Redis
#[utoipa::path(
    get,
    security(("BearerAuth" = ["monitor:read"])),
    path = "/api/monitor/infrastructure",
    tag = "health",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_infrastructure_health(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<InfrastructureHealth>>> {
    // 数据库探活（真实执行 SELECT 1）
    let db_start = std::time::Instant::now();
    let db_ok = sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await
        .is_ok();
    let db_ms = db_start.elapsed().as_millis() as u64;

    // 网关进程运行时长（实测）
    let uptime = state.start_time.elapsed();
    let uptime_str = format_uptime(
        uptime.as_secs() / 86400,
        (uptime.as_secs() % 86400) / 3600,
        (uptime.as_secs() % 3600) / 60,
    );

    let items = vec![
        InfrastructureHealth {
            component: "api_gateway".to_string(),
            status: "healthy".to_string(),
            value: format!("运行 {} · 模块化单体网关", uptime_str),
            detail: "monolith 网关进程存活".to_string(),
        },
        InfrastructureHealth {
            component: "message_queue".to_string(),
            status: "absent".to_string(),
            value: "未部署".to_string(),
            detail: "项目未部署消息队列组件（Kafka/RabbitMQ 等）".to_string(),
        },
        InfrastructureHealth {
            component: "database".to_string(),
            status: if db_ok { "healthy" } else { "error" }.to_string(),
            value: format!("PostgreSQL · {}ms", db_ms),
            detail: if db_ok {
                "SELECT 1 探活通过".to_string()
            } else {
                "SELECT 1 探活失败".to_string()
            },
        },
        InfrastructureHealth {
            component: "cache".to_string(),
            status: "healthy".to_string(),
            value: "内存缓存".to_string(),
            detail: "portal 聚合 / GraphQL 查询缓存（进程内，未启用 Redis）".to_string(),
        },
    ];

    Json(ApiResponse::success(items, "获取基础架构健康状态成功"))
}
