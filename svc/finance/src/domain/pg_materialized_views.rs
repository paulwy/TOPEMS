use async_trait::async_trait;
use rust_decimal::prelude::FromPrimitive;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};

use super::events::FinanceDomainEvent;
use super::materialized_view::MaterializedView;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgVoucherSummary {
    pub id: String,
    pub voucher_no: String,
    pub voucher_date: chrono::NaiveDate,
    pub voucher_type: String,
    pub status: String,
    pub summary: String,
    pub total_amount: rust_decimal::Decimal,
    pub created_by: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub posted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub version: i64,
}

pub struct PgVoucherSummaryView {
    pool: PgPool,
}

impl PgVoucherSummaryView {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        status: Option<String>,
    ) -> Result<(Vec<PgVoucherSummary>, i64), String> {
        let offset = ((page - 1) * page_size).max(0);

        let count_row = if let Some(s) = &status {
            sqlx::query("SELECT COUNT(*) as count FROM mv_voucher_summary WHERE status = $1")
                .bind(s)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            sqlx::query("SELECT COUNT(*) as count FROM mv_voucher_summary")
                .fetch_one(&self.pool)
                .await
                .map_err(|e| e.to_string())?
        };
        let total: i64 = count_row.try_get("count").map_err(|e| e.to_string())?;

        let rows = if let Some(s) = &status {
            sqlx::query(
                "SELECT * FROM mv_voucher_summary WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
            )
            .bind(s)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query(
                "SELECT * FROM mv_voucher_summary ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        };

        let mut items = Vec::new();
        for row in rows {
            items.push(Self::row_to_voucher(&row)?);
        }
        Ok((items, total))
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<PgVoucherSummary>, String> {
        let result = sqlx::query("SELECT * FROM mv_voucher_summary WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        match result {
            Some(row) => Ok(Some(Self::row_to_voucher(&row)?)),
            None => Ok(None),
        }
    }

    pub async fn get_by_no(&self, no: &str) -> Result<Option<PgVoucherSummary>, String> {
        let result = sqlx::query("SELECT * FROM mv_voucher_summary WHERE voucher_no = $1")
            .bind(no)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        match result {
            Some(row) => Ok(Some(Self::row_to_voucher(&row)?)),
            None => Ok(None),
        }
    }

    fn row_to_voucher(row: &sqlx::postgres::PgRow) -> Result<PgVoucherSummary, String> {
        Ok(PgVoucherSummary {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            voucher_no: row.try_get("voucher_no").map_err(|e| e.to_string())?,
            voucher_date: row.try_get("voucher_date").map_err(|e| e.to_string())?,
            voucher_type: row.try_get("voucher_type").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            summary: row.try_get("summary").unwrap_or_default(),
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            created_by: row.try_get("created_by").unwrap_or_default(),
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            posted_at: row.try_get("posted_at").map_err(|e| e.to_string())?,
            version: row.try_get("version").map_err(|e| e.to_string())?,
        })
    }
}

#[async_trait]
impl MaterializedView for PgVoucherSummaryView {
    fn view_name(&self) -> &str {
        "voucher_summary"
    }

    async fn handle_event(&self, event: &FinanceDomainEvent) -> Result<(), String> {
        match event {
            FinanceDomainEvent::VoucherCreated(e) => {
                let total = rust_decimal::Decimal::from_f64(e.total_amount)
                    .unwrap_or(rust_decimal::Decimal::ZERO);
                sqlx::query(
                    "INSERT INTO mv_voucher_summary 
                     (id, voucher_no, voucher_date, voucher_type, status, summary, total_amount, created_by, created_at, version)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
                     ON CONFLICT (id) DO UPDATE SET
                         voucher_no = EXCLUDED.voucher_no,
                         voucher_date = EXCLUDED.voucher_date,
                         voucher_type = EXCLUDED.voucher_type,
                         status = EXCLUDED.status,
                         total_amount = EXCLUDED.total_amount,
                         created_by = EXCLUDED.created_by,
                         created_at = EXCLUDED.created_at,
                         version = mv_voucher_summary.version + 1",
                )
                .bind(&e.voucher_id)
                .bind(&e.voucher_no)
                .bind(e.occurred_at.date_naive())
                .bind(&e.voucher_type)
                .bind("Draft")
                .bind("")
                .bind(total)
                .bind(&e.created_by)
                .bind(e.occurred_at)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
            }
            FinanceDomainEvent::VoucherPosted(e) => {
                sqlx::query(
                    "UPDATE mv_voucher_summary 
                     SET status = $1, posted_at = $2, version = version + 1
                     WHERE id = $3",
                )
                .bind("Posted")
                .bind(e.occurred_at)
                .bind(&e.voucher_id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
            }
            FinanceDomainEvent::VoucherReversed(e) => {
                sqlx::query(
                    "UPDATE mv_voucher_summary 
                     SET status = $1, version = version + 1
                     WHERE id = $2",
                )
                .bind("Reversed")
                .bind(&e.voucher_id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
            }
            _ => {}
        }
        Ok(())
    }

    async fn rebuild(&self) -> Result<(), String> {
        sqlx::query("DELETE FROM mv_voucher_summary")
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgReceivableAging {
    pub id: String,
    pub customer_id: String,
    pub customer_name: String,
    pub total_amount: rust_decimal::Decimal,
    pub current_amount: rust_decimal::Decimal,
    pub bucket_30_amount: rust_decimal::Decimal,
    pub bucket_60_amount: rust_decimal::Decimal,
    pub bucket_90_amount: rust_decimal::Decimal,
    pub bucket_180_amount: rust_decimal::Decimal,
    pub over_180_amount: rust_decimal::Decimal,
    pub status: String,
    pub version: i64,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub struct PgReceivableAgingView {
    pool: PgPool,
}

impl PgReceivableAgingView {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(
        &self,
        page: i64,
        page_size: i64,
        status: Option<String>,
    ) -> Result<(Vec<PgReceivableAging>, i64), String> {
        let offset = ((page - 1) * page_size).max(0);

        let count_row = if let Some(s) = &status {
            sqlx::query("SELECT COUNT(*) as count FROM mv_receivable_aging WHERE status = $1")
                .bind(s)
                .fetch_one(&self.pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            sqlx::query("SELECT COUNT(*) as count FROM mv_receivable_aging")
                .fetch_one(&self.pool)
                .await
                .map_err(|e| e.to_string())?
        };
        let total: i64 = count_row.try_get("count").map_err(|e| e.to_string())?;

        let rows = if let Some(s) = &status {
            sqlx::query(
                "SELECT * FROM mv_receivable_aging WHERE status = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3",
            )
            .bind(s)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query(
                "SELECT * FROM mv_receivable_aging ORDER BY updated_at DESC LIMIT $1 OFFSET $2",
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        };

        let mut items = Vec::new();
        for row in rows {
            items.push(Self::row_to_aging(&row)?);
        }
        Ok((items, total))
    }

    pub async fn get_by_id(&self, id: &str) -> Result<Option<PgReceivableAging>, String> {
        let result = sqlx::query("SELECT * FROM mv_receivable_aging WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        match result {
            Some(row) => Ok(Some(Self::row_to_aging(&row)?)),
            None => Ok(None),
        }
    }

    fn row_to_aging(row: &sqlx::postgres::PgRow) -> Result<PgReceivableAging, String> {
        Ok(PgReceivableAging {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            customer_id: row.try_get("customer_id").map_err(|e| e.to_string())?,
            customer_name: row.try_get("customer_name").unwrap_or_default(),
            total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
            current_amount: row.try_get("current_amount").map_err(|e| e.to_string())?,
            bucket_30_amount: row.try_get("bucket_30_amount").map_err(|e| e.to_string())?,
            bucket_60_amount: row.try_get("bucket_60_amount").map_err(|e| e.to_string())?,
            bucket_90_amount: row.try_get("bucket_90_amount").map_err(|e| e.to_string())?,
            bucket_180_amount: row
                .try_get("bucket_180_amount")
                .map_err(|e| e.to_string())?,
            over_180_amount: row.try_get("over_180_amount").map_err(|e| e.to_string())?,
            status: row.try_get("status").map_err(|e| e.to_string())?,
            version: row.try_get("version").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        })
    }

    pub async fn total_by_bucket(&self) -> Result<Vec<super::value_objects::AgingBucket>, String> {
        let row = sqlx::query(
            "SELECT SUM(current_amount) as current, 
                    SUM(bucket_30_amount) as b30,
                    SUM(bucket_60_amount) as b60,
                    SUM(bucket_90_amount) as b90,
                    SUM(bucket_180_amount) as b180,
                    SUM(over_180_amount) as over180
             FROM mv_receivable_aging",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let current: Option<rust_decimal::Decimal> =
            row.try_get("current").map_err(|e| e.to_string())?;
        let b30: Option<rust_decimal::Decimal> = row.try_get("b30").map_err(|e| e.to_string())?;
        let b60: Option<rust_decimal::Decimal> = row.try_get("b60").map_err(|e| e.to_string())?;
        let b90: Option<rust_decimal::Decimal> = row.try_get("b90").map_err(|e| e.to_string())?;
        let b180: Option<rust_decimal::Decimal> = row.try_get("b180").map_err(|e| e.to_string())?;
        let over180: Option<rust_decimal::Decimal> =
            row.try_get("over180").map_err(|e| e.to_string())?;

        let to_f64 = |d: Option<rust_decimal::Decimal>| -> f64 {
            d.unwrap_or(rust_decimal::Decimal::ZERO)
                .to_string()
                .parse()
                .unwrap_or(0.0)
        };

        Ok(vec![
            super::value_objects::AgingBucket {
                label: "当前".to_string(),
                min_days: 0,
                max_days: Some(0),
                amount: to_f64(current),
            },
            super::value_objects::AgingBucket {
                label: "1-30天".to_string(),
                min_days: 1,
                max_days: Some(30),
                amount: to_f64(b30),
            },
            super::value_objects::AgingBucket {
                label: "31-60天".to_string(),
                min_days: 31,
                max_days: Some(60),
                amount: to_f64(b60),
            },
            super::value_objects::AgingBucket {
                label: "61-90天".to_string(),
                min_days: 61,
                max_days: Some(90),
                amount: to_f64(b90),
            },
            super::value_objects::AgingBucket {
                label: "91-180天".to_string(),
                min_days: 91,
                max_days: Some(180),
                amount: to_f64(b180),
            },
            super::value_objects::AgingBucket {
                label: "180天以上".to_string(),
                min_days: 181,
                max_days: None,
                amount: to_f64(over180),
            },
        ])
    }
}

#[async_trait]
impl MaterializedView for PgReceivableAgingView {
    fn view_name(&self) -> &str {
        "receivable_aging"
    }

    async fn handle_event(&self, event: &FinanceDomainEvent) -> Result<(), String> {
        match event {
            FinanceDomainEvent::ReceivableCreated(e) => {
                let amount = rust_decimal::Decimal::from_f64(e.amount)
                    .unwrap_or(rust_decimal::Decimal::ZERO);
                sqlx::query(
                    "INSERT INTO mv_receivable_aging 
                     (id, customer_id, customer_name, total_amount, current_amount, 
                      bucket_30_amount, bucket_60_amount, bucket_90_amount, bucket_180_amount, over_180_amount, 
                      status, version, updated_at)
                     VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, 0, $6, 1, NOW())
                     ON CONFLICT (id) DO UPDATE SET
                         customer_id = EXCLUDED.customer_id,
                         total_amount = EXCLUDED.total_amount,
                         current_amount = EXCLUDED.current_amount,
                         status = EXCLUDED.status,
                         version = mv_receivable_aging.version + 1,
                         updated_at = NOW()",
                )
                .bind(&e.receivable_id)
                .bind(&e.customer_id)
                .bind("")
                .bind(amount)
                .bind(amount)
                .bind("Unsettled")
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
            }
            FinanceDomainEvent::ReceivableSettled(e) => {
                let remaining = rust_decimal::Decimal::from_f64(e.remaining_amount)
                    .unwrap_or(rust_decimal::Decimal::ZERO);
                let status = if e.remaining_amount <= 0.01 {
                    "Settled"
                } else {
                    "PartiallySettled"
                };
                sqlx::query(
                    "UPDATE mv_receivable_aging 
                     SET total_amount = $1, status = $2, version = version + 1, updated_at = NOW()
                     WHERE id = $3",
                )
                .bind(remaining)
                .bind(status)
                .bind(&e.receivable_id)
                .execute(&self.pool)
                .await
                .map_err(|e| e.to_string())?;
            }
            FinanceDomainEvent::AgingCalculated(e) => {
                if e.entity_type == "receivable" {
                    for bucket in &e.buckets {
                        let amount = rust_decimal::Decimal::from_f64(bucket.amount)
                            .unwrap_or(rust_decimal::Decimal::ZERO);
                        let bucket_col = match (bucket.min_days, bucket.max_days) {
                            (0, Some(0)) => "current_amount",
                            (_, Some(30)) => "bucket_30_amount",
                            (_, Some(60)) => "bucket_60_amount",
                            (_, Some(90)) => "bucket_90_amount",
                            (_, Some(180)) => "bucket_180_amount",
                            (181, None) => "over_180_amount",
                            _ => continue,
                        };
                        let query = format!(
                            "UPDATE mv_receivable_aging SET {} = $1, version = version + 1, updated_at = NOW() WHERE status != 'Settled'",
                            bucket_col
                        );
                        sqlx::query(&query)
                            .bind(amount)
                            .execute(&self.pool)
                            .await
                            .map_err(|e| e.to_string())?;
                    }
                }
            }
            _ => {}
        }
        Ok(())
    }

    async fn rebuild(&self) -> Result<(), String> {
        sqlx::query("DELETE FROM mv_receivable_aging")
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
