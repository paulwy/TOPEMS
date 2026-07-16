use axum::{extract::State, Json};
use sqlx::Row;
use topems_shared::ApiResponse;

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
