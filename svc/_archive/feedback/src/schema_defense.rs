//! Schema 防御定义（V69.3）— 使用 shared-db 抽象
//!
//! 开发规范：新增列必须两处同步
//!   (1) 服务的 CREATE TABLE IF NOT EXISTS xxx ( ... ) 文本里加列
//!   (2) 下方 TABLE_DEFS 对应表里追加 ("col_name", "TYPE [NOT NULL] [DEFAULT ...]")

use sqlx::PgPool;
use topems_shared_db::schema::run_schema_defense;

/// 计算响应时间（小时），若响应早于或等于创建时间则返回 0
pub fn calculate_response_time_hours(created_at: i64, responded_at: i64) -> f64 {
    if responded_at <= created_at {
        return 0.0;
    }
    (responded_at - created_at) as f64 / 3600.0
}

/// 判断反馈是否违反 SLA（超出规定响应时间）
pub fn is_feedback_sla_breached(created_at: i64, sla_hours: i64, now: i64) -> bool {
    if now <= created_at {
        return false;
    }
    let elapsed_hours = (now - created_at) as f64 / 3600.0;
    elapsed_hours > sla_hours as f64
}

pub const SERVICE_SCHEMA: &str = "public";
pub const SERVICE_TAG: &str = "feedback";

/// feedback 1 张表的列定义单一事实源。不含 PRIMARY KEY 的 id 列（verify 阶段自动拼 "id"）。
pub const TABLE_DEFS: &[(&str, &[(&str, &str)])] = &[(
    "core_feedbacks",
    &[
        ("user_id", "VARCHAR(255) NOT NULL"),
        ("type", "VARCHAR(50) NOT NULL"),
        ("title", "VARCHAR(255) NOT NULL"),
        ("description", "TEXT NOT NULL"),
        ("screenshots", "TEXT[]"),
        ("satisfaction", "INTEGER DEFAULT 3"),
        ("status", "VARCHAR(50) NOT NULL DEFAULT 'pending'"),
        ("response", "TEXT"),
        ("responded_by", "VARCHAR(255)"),
        ("responded_at", "TIMESTAMPTZ"),
        ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT NOW()"),
        ("deleted_at", "TIMESTAMP"),
    ],
)];

pub async fn run_schema_migration_and_verify(pool: &PgPool) -> Result<(), sqlx::Error> {
    // 阶段 0：确保 TABLE_DEFS 中所有表的"骨架"都存在
    for (tbl, _cols_arr) in TABLE_DEFS {
        let ddl = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\".\"{}\" (id UUID PRIMARY KEY DEFAULT gen_random_uuid())",
            SERVICE_SCHEMA, tbl
        );
        sqlx::query(&ddl).execute(pool).await?;
    }
    // 阶段 1+2：调用 shared-db 抽象
    run_schema_defense(pool, SERVICE_SCHEMA, TABLE_DEFS, SERVICE_TAG).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- calculate_response_time_hours ----

    #[test]
    fn test_calculate_response_time_basic() {
        // 1 hour difference
        let hours = calculate_response_time_hours(0, 3600);
        assert!((hours - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_calculate_response_time_zero() {
        assert_eq!(calculate_response_time_hours(100, 100), 0.0);
    }

    #[test]
    fn test_calculate_response_time_negative() {
        assert_eq!(calculate_response_time_hours(200, 100), 0.0);
    }

    #[test]
    fn test_calculate_response_time_multiple_hours() {
        let hours = calculate_response_time_hours(0, 7200);
        assert!((hours - 2.0).abs() < 0.0001);
    }

    #[test]
    fn test_calculate_response_time_fractional() {
        // 30 minutes = 0.5 hours
        let hours = calculate_response_time_hours(0, 1800);
        assert!((hours - 0.5).abs() < 0.0001);
    }

    #[test]
    fn test_calculate_response_time_large() {
        let hours = calculate_response_time_hours(0, 86400);
        assert!((hours - 24.0).abs() < 0.0001);
    }

    // ---- is_feedback_sla_breached ----

    #[test]
    fn test_sla_breached() {
        // created 3 hours ago, SLA is 2 hours
        assert!(is_feedback_sla_breached(0, 2, 10800));
    }

    #[test]
    fn test_sla_not_breached() {
        // created 1 hour ago, SLA is 2 hours
        assert!(!is_feedback_sla_breached(0, 2, 3600));
    }

    #[test]
    fn test_sla_exact_boundary() {
        // exactly at SLA, not breached (uses >, not >=)
        assert!(!is_feedback_sla_breached(0, 2, 7200));
    }

    #[test]
    fn test_sla_not_breached_future() {
        // now is before created
        assert!(!is_feedback_sla_breached(100, 2, 50));
    }

    #[test]
    fn test_sla_zero_sla() {
        // SLA of 0 hours, anything after creation is breached
        assert!(is_feedback_sla_breached(0, 0, 1));
    }

    #[test]
    fn test_sla_equal_timestamps() {
        assert!(!is_feedback_sla_breached(100, 24, 100));
    }

    #[test]
    fn test_sla_large_hours() {
        assert!(!is_feedback_sla_breached(0, 720, 3600));
        assert!(is_feedback_sla_breached(0, 1, 7200));
    }
}
