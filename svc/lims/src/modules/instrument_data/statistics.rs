use axum::{extract::State, Json};
use sqlx::Row;
use topems_shared_core::response::ApiResponse;

use super::models::{InstrumentDataStatistics, ProtocolStat};

pub async fn get_instrument_data_statistics(
    State(state): State<crate::shared::AppState>,
) -> Json<ApiResponse<InstrumentDataStatistics>> {
    let total_data: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_instrument_data")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let today_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qa_lims_instrument_data WHERE created_at >= CURRENT_DATE",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let success_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_instrument_data WHERE status = 'parsed'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let failed_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qa_lims_instrument_data WHERE status = 'parse_failed'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let pending_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qa_lims_instrument_data WHERE status = 'pending' OR status = 'collected'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let total_tasks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_collection_tasks")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let running_tasks: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_collection_tasks WHERE status = 'active'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let total_rules: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM qa_lims_parse_rules")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let protocol_rows = sqlx::query(
        r#"
        SELECT protocol, COUNT(*) as count 
        FROM qa_lims_instrument_data 
        GROUP BY protocol 
        ORDER BY count DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let protocol_distribution: Vec<ProtocolStat> = protocol_rows
        .into_iter()
        .map(|row| ProtocolStat {
            protocol: row.get("protocol"),
            count: row.get("count"),
        })
        .collect();

    let stats = InstrumentDataStatistics {
        total_data_count: total_data,
        today_count,
        success_count,
        failed_count,
        pending_count,
        total_tasks,
        running_tasks,
        total_rules,
        protocol_distribution: Some(protocol_distribution),
        instrument_distribution: None,
    };

    Json(ApiResponse::success(stats, "获取统计数据成功"))
}

// ============================================================================
// 仪器数据统计纯函数
// ============================================================================

/// 计算解析成功率（0.0 ~ 1.0），分母为 0 时返回 0
pub fn compute_parse_success_rate(success_count: i64, total_count: i64) -> f64 {
    if total_count <= 0 {
        return 0.0;
    }
    let sc = success_count.max(0) as f64;
    let tc = total_count as f64;
    (sc / tc * 10000.0).round() / 10000.0
}

/// 给定协议分布，计算占比最高的协议名 + 占比（0.0~1.0）
/// 分布为空时返回 None
pub fn top_protocol<'a>(distribution: &'a [ProtocolStat]) -> Option<(&'a str, f64)> {
    let total: i64 = distribution.iter().map(|p| p.count).sum();
    if total <= 0 {
        return None;
    }
    let top = distribution.iter().max_by_key(|p| p.count)?;
    let ratio = (top.count as f64 / total as f64 * 10000.0).round() / 10000.0;
    Some((top.protocol.as_str(), ratio))
}

/// 从分布向量计算每个协议的百分比（0~100，保留 2 位小数）
pub fn protocol_percentages(distribution: &[ProtocolStat]) -> Vec<(String, f64)> {
    let total: i64 = distribution.iter().map(|p| p.count).sum();
    if total <= 0 {
        return distribution
            .iter()
            .map(|p| (p.protocol.clone(), 0.0))
            .collect();
    }
    distribution
        .iter()
        .map(|p| {
            let pct = (p.count as f64 / total as f64 * 10000.0).round() / 100.0;
            (p.protocol.clone(), pct)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk(protocol: &str, count: i64) -> ProtocolStat {
        ProtocolStat {
            protocol: protocol.to_string(),
            count,
        }
    }

    #[test]
    fn test_parse_success_rate_happy() {
        let r = compute_parse_success_rate(80, 100);
        assert!((r - 0.8).abs() < 1e-9);
    }

    #[test]
    fn test_parse_success_rate_zero_total() {
        assert!((compute_parse_success_rate(0, 0) - 0.0).abs() < 1e-9);
        assert!((compute_parse_success_rate(5, 0) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_parse_success_rate_negative_success_capped_zero() {
        assert!((compute_parse_success_rate(-10, 100) - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_parse_success_rate_perfect() {
        assert!((compute_parse_success_rate(50, 50) - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_top_protocol_basic() {
        let dist = vec![mk("JSON", 40), mk("HL7", 35), mk("ASTM", 25)];
        let (proto, ratio) = top_protocol(&dist).unwrap();
        assert_eq!(proto, "JSON");
        assert!((ratio - 0.4).abs() < 1e-9);
    }

    #[test]
    fn test_top_protocol_empty_none() {
        let dist: Vec<ProtocolStat> = vec![];
        assert_eq!(top_protocol(&dist), None);
    }

    #[test]
    fn test_top_protocol_zero_counts_none() {
        let dist = vec![mk("JSON", 0), mk("HL7", 0)];
        assert_eq!(top_protocol(&dist), None);
    }

    #[test]
    fn test_protocol_percentages_normal() {
        let dist = vec![mk("JSON", 25), mk("HL7", 25)];
        let pct = protocol_percentages(&dist);
        assert_eq!(pct.len(), 2);
        for (_, p) in &pct {
            assert!((*p - 50.0).abs() < 1e-2);
        }
    }

    #[test]
    fn test_protocol_percentages_empty_returns_zeros() {
        let dist = vec![mk("JSON", 0), mk("HL7", 0)];
        let pct = protocol_percentages(&dist);
        assert!(pct.iter().all(|(_, p)| *p == 0.0));
    }
}
