use rust_decimal::Decimal;
use serde_json::{json, Value};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::modules::collection_status::{normalize_collection_status, CollectionStatus};

use super::FinanceService;
use topems_shared_core::error::TopemsError;

/// 从 JSON 数值解析为 Decimal（仅入参解析，落库保持 Decimal 精度）
fn decimal_from_value(v: Option<&Value>) -> Option<Decimal> {
    v.and_then(|v| v.as_f64())
        .and_then(Decimal::from_f64_retain)
}

impl FinanceService {
    pub async fn list_collections(
        &self,
        tenant_id: Uuid,
        page: i64,
        page_size: i64,
        status: Option<String>,
        customer_id: Option<Uuid>,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let offset = (page - 1) * page_size;

        let mut sql =
            "SELECT id, tenant_id, collection_no, customer_id, customer_name, invoice_no, amount, currency, collected_amount, payment_method, COALESCE(status, 'pending') AS status, collection_date, reference_no, remark, created_by, created_at, updated_at FROM finance.erp_collection_records WHERE deleted_at IS NULL AND (tenant_id = $1::uuid)"
                .to_string();
        let mut count_sql =
            "SELECT COUNT(*) FROM finance.erp_collection_records WHERE deleted_at IS NULL AND (tenant_id = $1::uuid)".to_string();

        let mut cond = Vec::new();
        if status.is_some() {
            cond.push("COALESCE(status, 'pending') = $2".to_string());
        }
        if customer_id.is_some() {
            let idx = if status.is_some() { 3 } else { 2 };
            cond.push(format!("customer_id = ${}", idx));
        }

        if !cond.is_empty() {
            let cond_str = cond.join(" AND ");
            sql.push_str(" AND ");
            sql.push_str(&cond_str);
            count_sql.push_str(" AND ");
            count_sql.push_str(&cond_str);
        }

        sql.push_str(" ORDER BY created_at DESC LIMIT $");
        let limit_idx = if status.is_some() && customer_id.is_some() {
            4
        } else if status.is_some() || customer_id.is_some() {
            3
        } else {
            2
        };
        sql.push_str(&limit_idx.to_string());
        sql.push_str(" OFFSET $");
        sql.push_str(&(limit_idx + 1).to_string());

        let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(tenant_id);
        let mut count_query =
            sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql)).bind(tenant_id);

        if let Some(ref s) = status {
            query = query.bind(s);
            count_query = count_query.bind(s);
        }
        if let Some(cid) = customer_id {
            query = query.bind(cid);
            count_query = count_query.bind(cid);
        }

        query = query.bind(page_size).bind(offset);

        let mut scope = self.read_scope(txn).await?;
        let rows = query.fetch_all(&mut scope).await?;
        let total = count_query.fetch_one(&mut scope).await.unwrap_or(0);

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let collection_no: Option<String> = sqlx::Row::try_get(row, "collection_no").ok();
                let customer_name: Option<String> = sqlx::Row::try_get(row, "customer_name").ok();
                let amount: Option<Decimal> = sqlx::Row::try_get(row, "amount").ok();
                let status: Option<String> = sqlx::Row::try_get(row, "status").ok();
                let created_at: Option<chrono::DateTime<chrono::Utc>> =
                    sqlx::Row::try_get(row, "created_at").ok();
                json!({
                    "id": id.to_string(),
                    "collection_no": collection_no,
                    "customer_name": customer_name,
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

    pub async fn get_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope(txn).await?;
        let row =
            sqlx::query(only_own_schema_query!("finance", "SELECT id, tenant_id, collection_no, customer_id, customer_name, invoice_no, amount, currency, collected_amount, payment_method, COALESCE(status, 'pending') AS status, collection_date, reference_no, remark, created_by, created_at, updated_at FROM finance.erp_collection_records WHERE deleted_at IS NULL AND (tenant_id = $1::uuid) AND id = $2"))
                .bind(tenant_id)
                .bind(collection_id)
                .fetch_optional(&mut scope)
                .await?
                .ok_or_else(|| TopemsError::NotFound("收款记录不存在".to_string()))?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let collection_no: Option<String> = sqlx::Row::try_get(&row, "collection_no").ok();
        let customer_name: Option<String> = sqlx::Row::try_get(&row, "customer_name").ok();
        let amount: Option<Decimal> = sqlx::Row::try_get(&row, "amount").ok();
        let status: Option<String> = sqlx::Row::try_get(&row, "status").ok();

        Ok(json!({
            "id": id.to_string(),
            "collection_no": collection_no,
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn create_collection(
        &self,
        tenant_id: Uuid,
        req: Value,
        created_by: &str,
        executor: &mut topems_shared_db::scope::ScopedTxn<'_>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let created_by = Uuid::parse_str(created_by)
            .map_err(|_| TopemsError::ValidationFailed("无效的操作人ID".to_string()))?;
        let customer_name = req
            .get("customer_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let amount = decimal_from_value(req.get("amount")).unwrap_or(Decimal::ZERO);
        let collection_no = req
            .get("collection_no")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let row = sqlx::query(
            only_own_schema_query!("finance", "INSERT INTO finance.erp_collection_records (tenant_id, collection_no, customer_name, amount, status, created_by)
             VALUES ($1, $2, $3, $4, 'pending', $5)
             RETURNING id, collection_no, customer_name, amount, status::text AS status, created_at"),
        )
        .bind(tenant_id)
        .bind(collection_no)
        .bind(customer_name)
        .bind(amount)
        .bind(created_by)
        .fetch_one(executor)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let collection_no: String = sqlx::Row::get(&row, "collection_no");
        let customer_name: String = sqlx::Row::get(&row, "customer_name");
        let amount: Decimal = sqlx::Row::get(&row, "amount");
        let status: Option<String> = sqlx::Row::get(&row, "status");

        Ok(json!({
            "id": id.to_string(),
            "collection_no": collection_no,
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn update_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
        req: Value,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let customer_name = req.get("customer_name").and_then(|v| v.as_str());
        let amount = decimal_from_value(req.get("amount"));
        let status = match req
            .get("status")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            Some(raw) => match normalize_collection_status(Some(raw)) {
                Some(CollectionStatus::Pending) => Some(CollectionStatus::Pending.as_str()),
                Some(CollectionStatus::Confirmed) => Some(CollectionStatus::Confirmed.as_str()),
                _ => {
                    return Err(TopemsError::ValidationFailed(
                        "status 仅支持 pending/confirmed；核销请走 write-off 接口".to_string(),
                    ))
                }
            },
            None => None,
        };

        let mut scope = self.write_scope(txn).await?;
        let current = sqlx::query_scalar::<_, Option<String>>(only_own_schema_query!(
            "finance",
            "SELECT COALESCE(status, 'pending') FROM finance.erp_collection_records \
             WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(collection_id)
        .fetch_optional(&mut scope)
        .await?;
        let current = match current {
            Some(Some(raw)) => raw,
            Some(None) => CollectionStatus::Pending.as_str().to_string(),
            None => return Err(TopemsError::ResourceNotFound("收款记录不存在".to_string())),
        };
        let Some(current_status) = normalize_collection_status(Some(&current)) else {
            return Err(TopemsError::ValidationFailed(
                "收款记录状态不在规范集合内".to_string(),
            ));
        };
        if !current_status.is_editable() {
            return Err(TopemsError::ValidationFailed(
                "收款记录已确认或已核销，不可编辑".to_string(),
            ));
        }

        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE finance.erp_collection_records
             SET customer_name = COALESCE($1, customer_name),
                 amount = COALESCE($2, amount),
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $4 AND id = $5 AND deleted_at IS NULL
               AND COALESCE(status, 'pending') = $6
             RETURNING id, collection_no, customer_name, amount, COALESCE(status, 'pending') AS status, updated_at"
        ))
        .bind(customer_name)
        .bind(amount)
        .bind(status)
        .bind(tenant_id)
        .bind(collection_id)
        .bind(current_status.as_str())
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| {
            TopemsError::ValidationFailed("收款记录状态已变化，请刷新后重试".to_string())
        })?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let collection_no: String = sqlx::Row::get(&row, "collection_no");
        let customer_name: String = sqlx::Row::get(&row, "customer_name");
        let amount: Decimal = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        scope.commit().await?;

        Ok(json!({
            "id": id.to_string(),
            "collection_no": collection_no,
            "customer_name": customer_name,
            "amount": amount,
            "status": status,
        }))
    }

    pub async fn delete_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<(), TopemsError> {
        let mut scope = self.write_scope(txn).await?;
        let current = sqlx::query_scalar::<_, Option<String>>(only_own_schema_query!(
            "finance",
            "SELECT COALESCE(status, 'pending') FROM finance.erp_collection_records \
             WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(collection_id)
        .fetch_optional(&mut scope)
        .await?;
        let current = match current {
            Some(Some(raw)) => raw,
            Some(None) => CollectionStatus::Pending.as_str().to_string(),
            None => return Err(TopemsError::ResourceNotFound("收款记录不存在".to_string())),
        };
        let Some(current_status) = normalize_collection_status(Some(&current)) else {
            return Err(TopemsError::ValidationFailed(
                "收款记录状态不在规范集合内".to_string(),
            ));
        };
        if !current_status.is_deletable() {
            return Err(TopemsError::ValidationFailed(
                "收款记录已确认或已核销，不可删除".to_string(),
            ));
        }

        let result = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE finance.erp_collection_records SET deleted_at = NOW() \
             WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL \
               AND COALESCE(status, 'pending') = $3"
        ))
        .bind(tenant_id)
        .bind(collection_id)
        .bind(current_status.as_str())
        .execute(&mut scope)
        .await?;

        if result.rows_affected() == 0 {
            return Err(TopemsError::ValidationFailed(
                "收款记录状态已变化或已删除，请刷新后重试".to_string(),
            ));
        }

        scope.commit().await?;

        Ok(())
    }

    pub async fn write_off_collection(
        &self,
        tenant_id: Uuid,
        collection_id: Uuid,
        receivable_id: Uuid,
        write_off_amount: f64,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let mut scope = self.write_scope(txn).await?;
        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE finance.erp_collection_records
             SET status = 'written_off', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2
               AND COALESCE(status, 'pending') IN ('pending', 'confirmed')
               AND deleted_at IS NULL
             RETURNING id, collection_no, COALESCE(status, 'pending') AS status"
        ))
        .bind(tenant_id)
        .bind(collection_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| {
            TopemsError::ValidationFailed("收款记录不存在、已删除或当前状态不可核销".to_string())
        })?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let status: String = sqlx::Row::get(&row, "status");

        scope.commit().await?;

        // 核销当前对收款记录本身落账（status='written_off'）。
        // receivable_id / write_off_amount 为前端契约入参：finance 侧暂无应收
        // 台账表（erp_receivables）与核销金额列可承接，此处不再静默丢弃，
        // 而是回显已接收值，便于前端与调用方确认参数已到服务层；
        // 待应收台账立项后在此补充应收单核销回写。
        Ok(json!({
            "id": id.to_string(),
            "status": status,
            "receivable_id": receivable_id.to_string(),
            "write_off_amount": write_off_amount,
            "message": "核销成功"
        }))
    }

    pub async fn batch_write_off(
        &self,
        tenant_id: Uuid,
        items: Vec<Value>,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for item in items {
            let collection_id_str = item
                .get("collection_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let receivable_id_str = item
                .get("receivable_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let amount = item.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);

            match (
                Uuid::parse_str(collection_id_str),
                Uuid::parse_str(receivable_id_str),
            ) {
                (Ok(cid), Ok(rid)) => {
                    match self
                        .write_off_collection(tenant_id, cid, rid, amount, txn)
                        .await
                    {
                        Ok(data) => {
                            success_count += 1;
                            results.push(json!({
                                "success": true,
                                "collection_id": cid.to_string(),
                                "data": data
                            }));
                        }
                        Err(e) => {
                            fail_count += 1;
                            results.push(json!({
                                "success": false,
                                "collection_id": cid.to_string(),
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
