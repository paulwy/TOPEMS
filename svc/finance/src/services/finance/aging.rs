use serde_json::{json, Value};
use uuid::Uuid;

use super::FinanceService;
use topems_shared_core::error::TopemsError;

impl FinanceService {
    pub async fn calculate_receivable_aging(&self, tenant_id: Uuid) -> Result<Value, TopemsError> {
        self.get_receivable_aging(tenant_id).await
    }

    pub async fn calculate_payable_aging(&self, tenant_id: Uuid) -> Result<Value, TopemsError> {
        self.get_payable_aging(tenant_id).await
    }

    pub async fn get_aging_summary(&self, tenant_id: Uuid) -> Result<Value, TopemsError> {
        let receivable_aging = self.get_receivable_aging(tenant_id).await?;
        let payable_aging = self.get_payable_aging(tenant_id).await?;

        let receivable_total = receivable_aging
            .get("total_overdue_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let payable_total = payable_aging
            .get("total_overdue_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        Ok(json!({
            "receivable": receivable_aging,
            "payable": payable_aging,
            "net_overdue": receivable_total - payable_total,
            "summary": {
                "total_receivable_overdue": receivable_total,
                "total_payable_overdue": payable_total,
                "net_position": receivable_total - payable_total
            }
        }))
    }

    pub async fn get_aging_detail(
        &self,
        tenant_id: Uuid,
        direction: &str,
        bucket: Option<String>,
    ) -> Result<Value, TopemsError> {
        let table = match direction {
            "receivable" => "erp_receivables",
            "payable" => "erp_payables",
            _ => "erp_receivables",
        };

        let mut sql = format!(
            "SELECT id, tenant_id, payable_no, supplier_id, supplier_name, invoice_no, invoice_date, due_date, amount, currency, paid_amount, status, description, created_by, created_at, updated_at FROM {} WHERE tenant_id = $1 AND status = 'unpaid'",
            table
        );

        if let Some(ref b) = bucket {
            let date_condition = match b.as_str() {
                "0-30天" => "due_date >= CURRENT_DATE - INTERVAL '30 days'",
                "31-60天" => {
                    "due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days'"
                }
                "61-90天" => {
                    "due_date < CURRENT_DATE - INTERVAL '60 days' AND due_date >= CURRENT_DATE - INTERVAL '90 days'"
                }
                "90天以上" => "due_date < CURRENT_DATE - INTERVAL '90 days'",
                _ => "1=1",
            };
            sql.push_str(" AND ");
            sql.push_str(date_condition);
        }

        sql.push_str(" ORDER BY due_date ASC LIMIT 100");

        let rows = sqlx::query(&sql)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await?;

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let amount: Option<f64> = sqlx::Row::try_get(row, "amount").ok();
                let due_date: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::Row::try_get(row, "due_date").ok();
                let name: Option<String> = if table == "erp_receivables" {
                    sqlx::Row::try_get(row, "customer_name").ok()
                } else {
                    sqlx::Row::try_get(row, "supplier_name").ok()
                };
                json!({
                    "id": id.to_string(),
                    "name": name,
                    "amount": amount,
                    "due_date": due_date.map(|d| d.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!({
            "direction": direction,
            "bucket": bucket,
            "items": items,
            "total": items.len()
        }))
    }

    pub async fn get_aging_trend(
        &self,
        tenant_id: Uuid,
        direction: &str,
        months: i32,
    ) -> Result<Value, TopemsError> {
        let table = match direction {
            "receivable" => "erp_receivables",
            "payable" => "erp_payables",
            _ => "erp_receivables",
        };

        let mut trend_data = Vec::new();

        for i in 0..months {
            let month_offset = months - i - 1;
            let month_end = format!(
                "DATE_TRUNC('month', CURRENT_DATE - INTERVAL '{} month') + INTERVAL '1 month' - INTERVAL '1 day'",
                month_offset
            );
            let month_label = format!("{}月前", month_offset);

            let sql = format!(
                "SELECT
                    COALESCE(SUM(CASE WHEN due_date >= {} - INTERVAL '30 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0) as bucket_0_30,
                    COALESCE(SUM(CASE WHEN due_date < {} - INTERVAL '30 days' AND due_date >= {} - INTERVAL '60 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0) as bucket_31_60,
                    COALESCE(SUM(CASE WHEN due_date < {} - INTERVAL '60 days' AND due_date >= {} - INTERVAL '90 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0) as bucket_61_90,
                    COALESCE(SUM(CASE WHEN due_date < {} - INTERVAL '90 days' AND status = 'unpaid' THEN amount ELSE 0 END), 0) as bucket_90_plus
                 FROM {} WHERE tenant_id = $1 AND created_at <= {}",
                month_end, month_end, month_end,
                month_end, month_end,
                month_end,
                table, month_end
            );

            let row = sqlx::query(&sql)
                .bind(tenant_id)
                .fetch_one(&self.db_pool)
                .await?;

            let bucket_0_30: f64 = sqlx::Row::try_get(&row, "bucket_0_30").unwrap_or(0.0);
            let bucket_31_60: f64 = sqlx::Row::try_get(&row, "bucket_31_60").unwrap_or(0.0);
            let bucket_61_90: f64 = sqlx::Row::try_get(&row, "bucket_61_90").unwrap_or(0.0);
            let bucket_90_plus: f64 = sqlx::Row::try_get(&row, "bucket_90_plus").unwrap_or(0.0);

            trend_data.push(json!({
                "period": month_label,
                "buckets": {
                    "0-30天": bucket_0_30,
                    "31-60天": bucket_31_60,
                    "61-90天": bucket_61_90,
                    "90天以上": bucket_90_plus
                },
                "total": bucket_0_30 + bucket_31_60 + bucket_61_90 + bucket_90_plus
            }));
        }

        Ok(json!({
            "direction": direction,
            "months": months,
            "trend": trend_data
        }))
    }
}
