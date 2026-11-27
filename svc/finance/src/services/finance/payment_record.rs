use rust_decimal::Decimal;
use serde_json::{json, Value};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

/// 从 JSON 数值解析为 Decimal（仅入参解析，落库保持 Decimal 精度）
fn decimal_from_value(v: Option<&Value>) -> Option<Decimal> {
    v.and_then(|v| v.as_f64())
        .and_then(Decimal::from_f64_retain)
}

/// 付款记录生命周期：active → inactive / archived / written_off；
/// inactive → active / archived；archived、written_off 为终态。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PaymentRecordStatus {
    Active,
    Inactive,
    Archived,
    WrittenOff,
}

impl PaymentRecordStatus {
    fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Archived => "archived",
            Self::WrittenOff => "written_off",
        }
    }

    fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "archived" => Some(Self::Archived),
            "written_off" => Some(Self::WrittenOff),
            _ => None,
        }
    }

    /// 仅停用态可软删；active 需先停用，archived/written_off 为终态台账。
    fn deletable_from() -> &'static [&'static str] {
        &["inactive"]
    }

    fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Active => matches!(target, Self::Inactive | Self::Archived | Self::WrittenOff),
            Self::Inactive => matches!(target, Self::Active | Self::Archived),
            Self::Archived | Self::WrittenOff => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "付款记录状态不允许从 {} 流转到 {}",
                self.as_str(),
                target.as_str()
            ))
        }
    }
}

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
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let offset = (page - 1) * page_size;

        let mut sql =
            "SELECT id, tenant_id, payment_no, supplier_id, supplier_name, invoice_no, invoice_date, payment_date, amount, currency, paid_amount, payment_method, status, description, created_by, created_at, updated_at FROM finance.erp_payment_records WHERE deleted_at IS NULL AND (tenant_id = $1::uuid)"
                .to_string();
        let mut count_sql =
            "SELECT COUNT(*) FROM finance.erp_payment_records WHERE deleted_at IS NULL AND (tenant_id = $1::uuid)"
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

        let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(tenant_id);
        let mut count_query =
            sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_sql)).bind(tenant_id);

        if let Some(ref s) = status {
            query = query.bind(s);
            count_query = count_query.bind(s);
        }
        if let Some(sid) = supplier_id {
            query = query.bind(sid);
            count_query = count_query.bind(sid);
        }

        query = query.bind(page_size).bind(offset);

        let mut scope = self.read_scope(txn).await?;

        let rows = query.fetch_all(&mut scope).await?;
        let total = count_query.fetch_one(&mut scope).await.unwrap_or(0);

        let items: Vec<Value> = rows
            .iter()
            .map(|row| {
                let id: Uuid = sqlx::Row::get(row, "id");
                let payment_no: Option<String> = sqlx::Row::try_get(row, "payment_no").ok();
                let supplier_name: Option<String> = sqlx::Row::try_get(row, "supplier_name").ok();
                let amount: Option<Decimal> = sqlx::Row::try_get(row, "amount").ok();
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
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let mut scope = self.read_scope(txn).await?;

        let row = sqlx::query(only_own_schema_query!("finance", "SELECT id, tenant_id, payment_no, supplier_id, supplier_name, invoice_no, invoice_date, payment_date, amount, currency, paid_amount, payment_method, status, description, created_by, created_at, updated_at FROM finance.erp_payment_records WHERE deleted_at IS NULL AND (tenant_id = $1::uuid) AND id = $2"))
            .bind(tenant_id)
            .bind(payment_id)
            .fetch_optional(&mut scope)
            .await?
            .ok_or_else(|| TopemsError::NotFound("付款记录不存在".to_string()))?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let payment_no: Option<String> = sqlx::Row::try_get(&row, "payment_no").ok();
        let supplier_name: Option<String> = sqlx::Row::try_get(&row, "supplier_name").ok();
        let amount: Option<Decimal> = sqlx::Row::try_get(&row, "amount").ok();
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
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let tenant_id = super::require_tenant(tenant_id)?;
        let created_by = Uuid::parse_str(created_by)
            .map_err(|_| TopemsError::ValidationFailed("无效的操作人ID".to_string()))?;
        let supplier_name = req
            .get("supplier_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let amount = decimal_from_value(req.get("amount")).unwrap_or(Decimal::ZERO);
        let payment_no = req.get("payment_no").and_then(|v| v.as_str()).unwrap_or("");

        let mut scope = self.write_scope(txn).await?;

        let row = sqlx::query(
            only_own_schema_query!("finance", "INSERT INTO finance.erp_payment_records (tenant_id, payment_no, supplier_name, amount, status, created_by)
             VALUES ($1, $2, $3, $4, 'active', $5)
             RETURNING id, payment_no, supplier_name, amount, status::text AS status, created_at"),
        )
        .bind(tenant_id)
        .bind(payment_no)
        .bind(supplier_name)
        .bind(amount)
        .bind(created_by)
        .fetch_one(&mut scope)
        .await?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let payment_no: String = sqlx::Row::get(&row, "payment_no");
        let supplier_name: String = sqlx::Row::get(&row, "supplier_name");
        let amount: Decimal = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        scope.commit().await?;

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
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        let supplier_name = req.get("supplier_name").and_then(|v| v.as_str());
        let amount = decimal_from_value(req.get("amount"));
        let target_status = match req.get("status").and_then(|v| v.as_str()) {
            Some(raw) => Some(PaymentRecordStatus::from_db_str(raw).ok_or_else(|| {
                TopemsError::ValidationFailed(
                    "status 仅支持 active/inactive/archived/written_off".to_string(),
                )
            })?),
            None => None,
        };

        let mut scope = self.write_scope(txn).await?;

        let current_row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT status::text AS status FROM finance.erp_payment_records
             WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| TopemsError::NotFound("付款记录不存在".to_string()))?;
        let current_raw: Option<String> = sqlx::Row::get(&current_row, "status");
        let current_status = current_raw
            .as_deref()
            .and_then(PaymentRecordStatus::from_db_str)
            .ok_or_else(|| {
                TopemsError::ValidationFailed("付款记录当前状态不在规范集合内".to_string())
            })?;
        if let Some(target) = target_status {
            if let Err(message) = current_status.can_transition_to(target) {
                return Err(TopemsError::ValidationFailed(message));
            }
        }

        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE finance.erp_payment_records
             SET supplier_name = COALESCE($1, supplier_name),
                 amount = COALESCE($2, amount),
                 status = COALESCE($3, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $4 AND id = $5 AND status = $6 AND deleted_at IS NULL
             RETURNING id, payment_no, supplier_name, amount, status, updated_at"
        ))
        .bind(supplier_name)
        .bind(amount)
        .bind(target_status.map(PaymentRecordStatus::as_str))
        .bind(tenant_id)
        .bind(payment_id)
        .bind(current_status.as_str())
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| {
            TopemsError::ValidationFailed("付款记录状态已被并发修改，更新失败".to_string())
        })?;

        let id: Uuid = sqlx::Row::get(&row, "id");
        let payment_no: String = sqlx::Row::get(&row, "payment_no");
        let supplier_name: String = sqlx::Row::get(&row, "supplier_name");
        let amount: Decimal = sqlx::Row::get(&row, "amount");
        let status: String = sqlx::Row::get(&row, "status");

        scope.commit().await?;

        Ok(json!({
            "id": id.to_string(),
            "payment_no": payment_no,
            "supplier_name": supplier_name,
            "amount": amount,
            "status": status,
            "updated_at": sqlx::Row::get::<chrono::DateTime<chrono::Utc>, _>(&row, "updated_at"),
        }))
    }

    pub async fn delete_payment_record(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<(), TopemsError> {
        let mut scope = self.write_scope(txn).await?;

        let current_row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT status::text AS status FROM finance.erp_payment_records
             WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| TopemsError::NotFound("付款记录不存在".to_string()))?;
        let current_raw: Option<String> = sqlx::Row::get(&current_row, "status");
        let current_status = current_raw
            .as_deref()
            .and_then(PaymentRecordStatus::from_db_str)
            .ok_or_else(|| {
                TopemsError::ValidationFailed("付款记录当前状态不在规范集合内".to_string())
            })?;
        if !PaymentRecordStatus::deletable_from().contains(&current_status.as_str()) {
            return Err(TopemsError::ValidationFailed(
                "仅停用状态的付款记录可删除；启用记录需先停用，归档/核销记录保留台账".to_string(),
            ));
        }

        let result = sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE finance.erp_payment_records SET deleted_at = NOW()
             WHERE tenant_id = $1 AND id = $2 AND status = ANY($3) AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .bind(PaymentRecordStatus::deletable_from())
        .execute(&mut scope)
        .await?;

        if result.rows_affected() == 0 {
            return Err(TopemsError::ValidationFailed(
                "付款记录状态已被并发修改，删除失败".to_string(),
            ));
        }

        scope.commit().await?;

        Ok(())
    }

    pub async fn write_off_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        payable_id: Uuid,
        write_off_amount: f64,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    ) -> Result<Value, TopemsError> {
        if !write_off_amount.is_finite() || write_off_amount <= 0.0 {
            return Err(TopemsError::ValidationFailed(
                "核销金额必须大于 0".to_string(),
            ));
        }

        let mut scope = self.write_scope(txn).await?;

        let current_row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT status::text AS status FROM finance.erp_payment_records
             WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_optional(&mut scope)
        .await?
        .ok_or_else(|| TopemsError::NotFound("付款记录不存在".to_string()))?;
        let current_raw: Option<String> = sqlx::Row::get(&current_row, "status");
        let current_status = current_raw
            .as_deref()
            .and_then(PaymentRecordStatus::from_db_str)
            .ok_or_else(|| {
                TopemsError::ValidationFailed("付款记录当前状态不在规范集合内".to_string())
            })?;
        if let Err(message) = current_status.can_transition_to(PaymentRecordStatus::WrittenOff) {
            return Err(TopemsError::ValidationFailed(message));
        }

        // 该 legacy 核销（finance.erp_payment_records）只把记录状态改成 written_off，
        // 从不更新应付余额、也不写核销明细——于是回「核销成功」而账上应付一分未减，
        // 付款记录已核销 + 应付仍挂账 = 账实不符（对账时最难查的一类）。
        // 真正落账的核销是 write_off_payment_item（finance.core_finance_payment_items，
        // 写 write_off_amount / remaining_amount / write_off_status）。
        tracing::warn!(
            tenant_id = %tenant_id,
            payment_id = %payment_id,
            payable_id = %payable_id,
            write_off_amount = write_off_amount,
            current_status = current_status.as_str(),
            "legacy erp_payment_records 核销未实现应付落账，已拒绝"
        );
        Err(TopemsError::ServiceUnavailable(
            "付款核销落账尚未实现（X-Stub）：未更新应付余额，已拒绝；请改用付款明细核销 /payment-items/{id}/write-off".to_string(),
        ))
    }

    pub async fn batch_write_off_payments(
        &self,
        tenant_id: Uuid,
        items: Vec<Value>,
        txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
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
                    match self
                        .write_off_payment(tenant_id, pid, rid, amount, txn)
                        .await
                    {
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

#[cfg(test)]
mod tests {
    use super::PaymentRecordStatus;

    #[test]
    fn payment_record_status_roundtrips() {
        use PaymentRecordStatus::*;
        for status in [Active, Inactive, Archived, WrittenOff] {
            assert_eq!(
                PaymentRecordStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(PaymentRecordStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn payment_record_transition_matrix() {
        use PaymentRecordStatus::*;
        assert!(Active.can_transition_to(Inactive).is_ok());
        assert!(Active.can_transition_to(Archived).is_ok());
        assert!(Active.can_transition_to(WrittenOff).is_ok());
        assert!(Inactive.can_transition_to(Active).is_ok());
        assert!(Inactive.can_transition_to(WrittenOff).is_err());
        assert!(Archived.can_transition_to(Active).is_err());
        assert!(WrittenOff.can_transition_to(Active).is_err());
        assert!(WrittenOff.can_transition_to(WrittenOff).is_ok());
        assert_eq!(PaymentRecordStatus::deletable_from(), &["inactive"]);
    }
}
