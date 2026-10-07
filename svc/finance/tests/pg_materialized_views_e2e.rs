//! P0 补测（2026-10-07）：PgVoucherSummaryView 物化汇总表增量维护。
//! 覆盖 handle_event 的 VoucherCreated/Posted/Reversed 分支与 rebuild 清空，
//! 用 sqlx::test 临时库 + finance schema 手动建表（DDL 对齐
//! database/migrations/20261007000022_create_finance_mv_summary_tables.sql）。

use topems_finance::domain::events::{
    FinanceDomainEvent, VoucherCreatedEvent, VoucherPostedEvent, VoucherReversedEvent,
};
use topems_finance::domain::materialized_view::MaterializedView;
use topems_finance::domain::pg_materialized_views::{PgVoucherSummary, PgVoucherSummaryView};

async fn setup_schema(pool: &sqlx::PgPool) {
    // handle_event 的 SQL 无 schema 前缀（依赖 search_path），sqlx::test 临时库
    // 默认 search_path 为 "$user", public —— 建表到 public 即可被命中。
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.mv_voucher_summary (
            id            TEXT PRIMARY KEY,
            voucher_no    TEXT NOT NULL,
            voucher_date  DATE NOT NULL,
            voucher_type  TEXT NOT NULL,
            status        TEXT NOT NULL,
            summary       TEXT NOT NULL DEFAULT '',
            total_amount  NUMERIC NOT NULL DEFAULT 0,
            created_by    TEXT NOT NULL DEFAULT '',
            created_at    TIMESTAMPTZ NOT NULL,
            posted_at     TIMESTAMPTZ,
            version       BIGINT NOT NULL DEFAULT 1,
            period        DATE,
            total_debit   NUMERIC,
            total_credit  NUMERIC,
            tenant_id     UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn created_event(voucher_id: &str, voucher_no: &str) -> FinanceDomainEvent {
    FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
        voucher_id: voucher_id.to_string(),
        voucher_no: voucher_no.to_string(),
        voucher_type: "general".into(),
        total_amount: 100.0,
        created_by: "u1".into(),
        occurred_at: chrono::Utc::now(),
    })
}

fn posted_event(voucher_id: &str, voucher_no: &str) -> FinanceDomainEvent {
    FinanceDomainEvent::VoucherPosted(VoucherPostedEvent {
        voucher_id: voucher_id.to_string(),
        voucher_no: voucher_no.to_string(),
        posted_by: "u2".into(),
        occurred_at: chrono::Utc::now(),
    })
}

fn reversed_event(voucher_id: &str, voucher_no: &str) -> FinanceDomainEvent {
    FinanceDomainEvent::VoucherReversed(VoucherReversedEvent {
        voucher_id: voucher_id.to_string(),
        voucher_no: voucher_no.to_string(),
        reversed_by: "u3".into(),
        reason: "test".into(),
        occurred_at: chrono::Utc::now(),
    })
}

#[sqlx::test(migrations = false)]
async fn voucher_created_inserts_summary_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let view = PgVoucherSummaryView::new(pool.clone());

    view.handle_event(&created_event("v-1", "VN-1"))
        .await
        .unwrap();

    let items: Vec<PgVoucherSummary> = view.list(1, 20, None).await.unwrap().0;
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].id, "v-1");
    assert_eq!(items[0].voucher_no, "VN-1");
    assert_eq!(items[0].status, "Draft");
    assert_eq!(items[0].version, 1);
    assert_eq!(items[0].total_amount, rust_decimal::Decimal::from(100));
}

#[sqlx::test(migrations = false)]
async fn voucher_posted_updates_status_and_posted_at(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let view = PgVoucherSummaryView::new(pool.clone());

    view.handle_event(&created_event("v-2", "VN-2"))
        .await
        .unwrap();
    view.handle_event(&posted_event("v-2", "VN-2"))
        .await
        .unwrap();

    let got = view.get_by_id("v-2").await.unwrap().unwrap();
    assert_eq!(got.status, "Posted");
    assert!(got.posted_at.is_some());
    assert_eq!(got.version, 2);
}

#[sqlx::test(migrations = false)]
async fn voucher_reversed_updates_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let view = PgVoucherSummaryView::new(pool.clone());

    view.handle_event(&created_event("v-3", "VN-3"))
        .await
        .unwrap();
    view.handle_event(&reversed_event("v-3", "VN-3"))
        .await
        .unwrap();

    let got = view.get_by_id("v-3").await.unwrap().unwrap();
    assert_eq!(got.status, "Reversed");
    assert_eq!(got.version, 2);
}

#[sqlx::test(migrations = false)]
async fn rebuild_clears_summary_table(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let view = PgVoucherSummaryView::new(pool.clone());

    view.handle_event(&created_event("v-4", "VN-4"))
        .await
        .unwrap();
    view.rebuild().await.unwrap();

    let items: Vec<PgVoucherSummary> = view.list(1, 20, None).await.unwrap().0;
    assert!(items.is_empty());
}

#[sqlx::test(migrations = false)]
async fn get_by_no_returns_matching_summary(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let view = PgVoucherSummaryView::new(pool.clone());

    view.handle_event(&created_event("v-5", "VN-5"))
        .await
        .unwrap();

    let got = view.get_by_no("VN-5").await.unwrap().unwrap();
    assert_eq!(got.id, "v-5");
    let none = view.get_by_no("NOT-EXIST").await.unwrap();
    assert!(none.is_none());
}
