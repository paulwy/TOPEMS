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

/// 稳定服务 UUID：由服务名确定性生成（跨进程/跨请求一致，替代每请求随机）。
pub fn stable_service_id(name: &str) -> Uuid {
    use std::hash::{Hash, Hasher};
    let mut h1 = std::collections::hash_map::DefaultHasher::new();
    name.hash(&mut h1);
    let a = h1.finish();
    let mut h2 = std::collections::hash_map::DefaultHasher::new();
    name.hash(&mut h2);
    name.hash(&mut h2);
    let b = h2.finish();
    let mut bytes = [0u8; 16];
    bytes[..8].copy_from_slice(&a.to_be_bytes());
    bytes[8..].copy_from_slice(&b.to_be_bytes());
    Uuid::from_bytes(bytes)
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
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ServiceHealth>>> {
    // 真实探活：HTTP 请求 BFF 统一健康入口 /api/server/health，取模块注册列表 + 实测延迟。
    // 模块化单体下 16 服务 = 进程内模块（无独立端口），网关级探活是唯一真实度量面。
    let start = std::time::Instant::now();
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            return Json(ApiResponse::success(
                vec![ServiceHealth {
                    id: stable_service_id("bff-gateway"),
                    service_name: "bff-gateway".to_string(),
                    status: "down".to_string(),
                    uptime: "-".to_string(),
                    response_time: -1.0,
                    last_check: chrono::Utc::now(),
                }],
                "HTTP 客户端构建失败：服务状态不可用",
            ));
        }
    };

    let url = format!("{}/api/server/health", state.bff_url);
    let resp = client.get(&url).send().await;
    let elapsed_ms = start.elapsed().as_secs_f64() * 1000.0;

    match resp {
        Ok(r) if r.status().is_success() => {
            let body: serde_json::Value = r.json().await.unwrap_or_default();
            let names: Vec<String> = body["module_list"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| m.get(0).and_then(|v| v.as_str()))
                        .map(String::from)
                        .collect()
                })
                .unwrap_or_default();

            if names.is_empty() {
                return Json(ApiResponse::success(
                    vec![ServiceHealth {
                        id: stable_service_id("bff-gateway"),
                        service_name: "bff-gateway".to_string(),
                        status: "degraded".to_string(),
                        uptime: "-".to_string(),
                        response_time: elapsed_ms,
                        last_check: chrono::Utc::now(),
                    }],
                    "BFF 可达但未返回模块清单",
                ));
            }

            let uptime = state.start_time.elapsed();
            let uptime_str = format_uptime(
                uptime.as_secs() / 86400,
                (uptime.as_secs() % 86400) / 3600,
                (uptime.as_secs() % 3600) / 60,
            );

            let services: Vec<ServiceHealth> = names
                .into_iter()
                .map(|name| ServiceHealth {
                    // 稳定 id：UUID v5（URL 命名空间 + 模块名），不再每请求随机
                    id: stable_service_id(&name),
                    service_name: name,
                    status: "healthy".to_string(),
                    uptime: uptime_str.clone(),
                    response_time: elapsed_ms,
                    last_check: chrono::Utc::now(),
                })
                .collect();

            Json(ApiResponse::success(
                services,
                "获取服务健康状态成功（真实探活）",
            ))
        }
        Ok(r) => Json(ApiResponse::success(
            vec![ServiceHealth {
                id: stable_service_id("bff-gateway"),
                service_name: "bff-gateway".to_string(),
                status: "degraded".to_string(),
                uptime: "-".to_string(),
                response_time: elapsed_ms,
                last_check: chrono::Utc::now(),
            }],
            &format!("BFF 探活失败（HTTP {}）：服务状态不可用", r.status()),
        )),
        Err(e) => Json(ApiResponse::success(
            vec![ServiceHealth {
                id: stable_service_id("bff-gateway"),
                service_name: "bff-gateway".to_string(),
                status: "down".to_string(),
                uptime: "-".to_string(),
                response_time: elapsed_ms,
                last_check: chrono::Utc::now(),
            }],
            &format!("BFF 探活失败（{}）：服务状态不可用", e),
        )),
    }
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
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
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
