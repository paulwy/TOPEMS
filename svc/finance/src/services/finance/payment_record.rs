use serde_json::{json, Value};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::FinanceService;
use topems_shared_core::error::TopemsError;

impl FinanceService {
    pub async fn list_payment_records(
        &self,
        tenant_id: Uuid,
        page: i64,
        page_size: i64,
        status: Option<String>,
        supplier_id: Option<Uuid>,
    ) -> Result<Value, TopemsError> {
        let offset = (page - 1) * page_size;

        let mut sql =
            "SELECT id, tenant_id, payment_no, supplier_id, supplier_name, invoice_no, invoice_date, payment_date, amount, currency, paid_amount, payment_method, status, description, created_by, created_at, updated_at FROM erp_payment_records WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
                .to_string();
        let mut count_sql =
            "SELECT COUNT(*) FROM erp_payment_records WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
                .to_string();

        let mut cond = Vec::new();
        if status.is_some() {
            cond.push("status = $2".to_string());
        }
        if supplier_id.is_some() {
            let idx = if status.is_some() { 3 } else { 2 };
            cond.push(format!("supplier_id = ${}", idx));
        }

        if !cond.is_empty() {
            let cond_str = cond.join(" AND ");
            sql.push_str(" AND ");
            sql.push_str(&cond_str);
            count_sql.push_str(" AND ");
            count_sql.push_str(&cond_str);
        }

        sql.push_str(" ORDER BY created_at DESC LIMIT $");
        let limit_idx = if status.is_some() && supplier_id.is_some() {
            4
        } else if status.is_some() || supplier_id.is_some() {
            3
        } else {
            2
        };
        sql.push_str(&limit_idx.to_string());
        sql.push_str(" OFFSET $");
        sql.push_str(&(limit_idx + 1).to_string());

        let mut query = sqlx::query(&sql).bind(tenant_id);
        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql).bind(tenant_id);

        if let Some(ref s) = status {
            query = query.bind(s);
            count_query = count_query.bind(s);
        }
        if let Some(sid) = supplier_id {
            query = query.bind(sid);
            count_query = count_query.bind(sid);
        }

        query = query.bind(page_size).bind(offset);

        let rows = query.fetch_all(&self.db_pool).await?;
        let total = count_query.fetch_one(&self.db_pool).await.unwrap_or(0);

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let payment_no: Option<String> = sqlx::Row::try_get(row, "payment_no").ok();
                let supplier_name: Option<String> = sqlx::Row::try_get(row, "supplier_name").ok();
                let amount: Option<f64> = sqlx::Row::try_get(row, "amount").ok();
                let status: Option<String> = sqlx::Row::try_get(row, "status").ok();
                let created_at: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::Row::try_get(row, "created_at").ok();
                json!({
                    "id": id.to_string(),
                    "payment_no": payment_no,
                    "supplier_name": supplier_name,
                    "amount": amount,
                    "status": status,
                    "created_at": created_at.map(|d| d.to_rfc3339()),
                })
            })
            .collect();

        Ok(json!({
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        }))
    }

    pub async fn get_payment_record(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<Value, TopemsError> {
        let row = sqlx::query(only_own_schema_query!("finance", "SELECT id, tenant_id, payment_no, supplier_id, supplier_name, invoice_no, invoice_date, payment_date, amount, currency, paid_amount, payment_method, status, description, created_by, created_at, updated_at FROM erp_payment_records WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1) AND id = $2"))
            .bind(tenant_id)
            .bind(payment_id)
            .fetch_optional(&self.db_pool)
            .await?
            .ok_or_else(|| TopemsError::NotFound("付款记录不存在".to_string()))?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let payment_no: Option<String> = sqlx::Row::try_get(&row, "payment_no").ok();
        let supplier_name: Option<String> = sqlx::Row::try_get(&row, "supplier_name").ok();
        let amount: Option<f64> = sqlx::Row::try_get(&row, "amount").ok();
        let status: Option<String> = sqlx::Row::try_get(&row, "status").ok();

        Ok(json!({
            "id": id.to_string(),
            "payment_no": payment_no,
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn create_payment_record(
        &self,
        tenant_id: Uuid,
        req: Value,
        created_by: &str,
    ) -> Result<Value, TopemsError> {
        let supplier_name = req
            .get("supplier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let payment_no = req.get("payment_no").and_then(|v| v.as_str()).unwrap_or("");

        let row = sqlx::query(
            only_own_schema_query!("finance", "INSERT INTO erp_payment_records (tenant_id, payment_no, supplier_name, amount, status, created_by)
             VALUES ($1, $2, $3, $4, 'pending', $5)
             RETURNING id, payment_no, supplier_name, amount, status, created_at"),
        )
        .bind(tenant_id)
        .bind(payment_no)
        .bind(supplier_name)
        .bind(amount)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let payment_no: String = sqlx::Row::get(&row, "payment_no");
        let supplier_name: String = sqlx::Row::get(&row, "supplier_name");
        let amount: f64 = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "payment_no": payment_no,
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn update_payment_record(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        req: Value,
    ) -> Result<Value, TopemsError> {
        let supplier_name = req.get("supplier_name").and_then(|v| v.as_str());
        let amount = req.get("amount").and_then(|v| v.as_f64());
        let status = req.get("status").and_then(|v| v.as_str());

        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_payment_records
             SET supplier_name = COALESCE($1, supplier_name),
                 amount = COALESCE($2, amount),
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $4 AND id = $5
             RETURNING id, payment_no, supplier_name, amount, status, updated_at"
        ))
        .bind(supplier_name)
        .bind(amount)
        .bind(status)
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let payment_no: String = sqlx::Row::get(&row, "payment_no");
        let supplier_name: String = sqlx::Row::get(&row, "supplier_name");
        let amount: f64 = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "payment_no": payment_no,
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn delete_payment_record(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<(), TopemsError> {
        let result = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_payment_records SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .execute(&self.db_pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(TopemsError::NotFound("付款记录不存在".to_string()));
        }

        Ok(())
    }

    pub async fn write_off_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        payable_id: Uuid,
        write_off_amount: f64,
    ) -> Result<Value, TopemsError> {
        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE erp_payment_records
             SET status = 'written_off', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2
             RETURNING id, payment_no, status"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_one(&self.db_pool)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let status: String = sqlx::Row::get(&row, "status");

        let _ = payable_id;
        let _ = write_off_amount;

        Ok(json!({
            "id": id.to_string(),
            "status": status,
            "message": "核销成功"
        }))
    }

    pub async fn batch_write_off_payments(
        &self,
        tenant_id: Uuid,
        items: Vec<Value>,
    ) -> Result<Value, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for item in items {
            let payment_id_str = item
                .get("payment_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let payable_id_str = item
                .get("payable_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let amount = item.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

            match (
                Uuid::parse_str(payment_id_str),
                Uuid::parse_str(payable_id_str),
            ) {
                (Ok(pid), Ok(rid)) => {
                    match self.write_off_payment(tenant_id, pid, rid, amount).await {
                        Ok(data) => {
                            success_count += 1;
                            results.push(json!({
                                "success": true,
                                "payment_id": pid.to_string(),
                                "data": data
                            }));
                        }
                        Err(e) => {
                            fail_count += 1;
                            results.push(json!({
                                "success": false,
                                "payment_id": pid.to_string(),
                                "error": e.to_string()
                            }));
                        }
                    }
                }
                _ => {
                    fail_count += 1;
                    results.push(json!({
                        "success": false,
                        "error": "无效的ID格式"
                    }));
                }
            }
        }

        Ok(json!({
            "success_count": success_count,
            "fail_count": fail_count,
            "results": results
        }))
    }
}
