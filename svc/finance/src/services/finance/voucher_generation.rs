use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;

use super::FinanceService;
use topems_shared_core::error::TopemsError;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct VoucherGenerationRule {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub source_type: String,
    pub source_filter: Option<Value>,
    pub mapping_config: Value,
    pub output_voucher_type: String,
    pub status: String,
    pub priority: i32,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateGenerationRuleRequest {
    pub name: String,
    pub source_type: String,
    pub source_filter: Option<Value>,
    pub mapping_config: Value,
    pub output_voucher_type: String,
    pub priority: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UpdateGenerationRuleRequest {
    pub name: Option<String>,
    pub source_type: Option<String>,
    pub source_filter: Option<Value>,
    pub mapping_config: Option<Value>,
    pub output_voucher_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<i32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GenerationResult {
    pub success_count: i32,
    pub failed_count: i32,
    pub voucher_ids: Vec<Uuid>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct GenerateVouchersRequest {
    pub rule_id: Uuid,
    pub source_ids: Option<Vec<String>>,
    pub start_date: Option<chrono::NaiveDate>,
    pub end_date: Option<chrono::NaiveDate>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct TestRuleRequest {
    pub rule_id: Uuid,
    pub source_data: Value,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct TestRuleResult {
    pub valid: bool,
    pub voucher_preview: Option<Value>,
    pub errors: Vec<String>,
}

impl FinanceService {
    pub async fn list_generation_rules(
        &self,
        tenant_id: Uuid,
        source_type: Option<String>,
        status: Option<String>,
    ) -> Result<Vec<VoucherGenerationRule>, TopemsError> {
        let mut query =
            "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1".to_string();

        if source_type.is_some() {
            query.push_str(" AND source_type = $2");
        }
        if status.is_some() {
            let idx = if source_type.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND status = ${}", idx));
        }
        query.push_str(" ORDER BY priority ASC, created_at DESC");

        let mut query_builder = sqlx::query_as::<_, VoucherGenerationRule>(&query).bind(tenant_id);
        if let Some(st) = &source_type {
            query_builder = query_builder.bind(st);
        }
        if let Some(s) = &status {
            query_builder = query_builder.bind(s);
        }

        let rules = query_builder.fetch_all(&self.db_pool).await?;
        Ok(rules)
    }

    pub async fn get_generation_rule(
        &self,
        tenant_id: Uuid,
        rule_id: Uuid,
    ) -> Result<VoucherGenerationRule, TopemsError> {
        let rule: VoucherGenerationRule = sqlx::query_as(
            "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(rule_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(rule)
    }

    pub async fn create_generation_rule(
        &self,
        tenant_id: Uuid,
        req: CreateGenerationRuleRequest,
        created_by: &str,
    ) -> Result<VoucherGenerationRule, TopemsError> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let priority = req.priority.unwrap_or(100);

        let rule: VoucherGenerationRule = sqlx::query_as(
            r#"
            INSERT INTO finance_voucher_generation_rules 
                (id, tenant_id, name, source_type, source_filter, mapping_config, 
                 output_voucher_type, status, priority, description, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $10, $11)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.source_type)
        .bind(&req.source_filter)
        .bind(&req.mapping_config)
        .bind(&req.output_voucher_type)
        .bind(priority)
        .bind(&req.description)
        .bind(now)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(rule)
    }

    pub async fn update_generation_rule(
        &self,
        tenant_id: Uuid,
        rule_id: Uuid,
        req: UpdateGenerationRuleRequest,
    ) -> Result<VoucherGenerationRule, TopemsError> {
        let existing: VoucherGenerationRule = sqlx::query_as(
            "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(rule_id)
        .fetch_one(&self.db_pool)
        .await?;

        let name = req.name.unwrap_or(existing.name);
        let source_type = req.source_type.unwrap_or(existing.source_type);
        let source_filter = req.source_filter.or(existing.source_filter);
        let mapping_config = req.mapping_config.unwrap_or(existing.mapping_config);
        let output_voucher_type = req
            .output_voucher_type
            .unwrap_or(existing.output_voucher_type);
        let status = req.status.unwrap_or(existing.status);
        let priority = req.priority.unwrap_or(existing.priority);
        let description = req.description.or(existing.description);
        let now = Utc::now();

        let rule: VoucherGenerationRule = sqlx::query_as(
            r#"
            UPDATE finance_voucher_generation_rules SET
                name = $2, source_type = $3, source_filter = $4, mapping_config = $5,
                output_voucher_type = $6, status = $7, priority = $8, description = $9, updated_at = $10
            WHERE tenant_id = $1 AND id = $11
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(&name)
        .bind(&source_type)
        .bind(&source_filter)
        .bind(&mapping_config)
        .bind(&output_voucher_type)
        .bind(&status)
        .bind(priority)
        .bind(&description)
        .bind(now)
        .bind(rule_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(rule)
    }

    pub async fn delete_generation_rule(
        &self,
        tenant_id: Uuid,
        rule_id: Uuid,
    ) -> Result<(), TopemsError> {
        let existing = sqlx::query_as::<_, VoucherGenerationRule>(
            "SELECT id, tenant_id, name, source_type, source_filter, mapping_config, output_voucher_type, status, priority, description, created_at, updated_at, created_by FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(rule_id)
        .fetch_optional(&self.db_pool)
        .await?;

        if existing.is_none() {
            return Err(TopemsError::NotFound("生成规则不存在".to_string()));
        }

        sqlx::query(
            "UPDATE finance_voucher_generation_rules SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(rule_id)
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }

    pub async fn test_rule(
        &self,
        tenant_id: Uuid,
        req: TestRuleRequest,
    ) -> Result<TestRuleResult, TopemsError> {
        let rule = self.get_generation_rule(tenant_id, req.rule_id).await?;

        let mut errors = Vec::new();

        if rule.status != "active" {
            errors.push("规则未启用".to_string());
        }

        if !req.source_data.is_object() {
            errors.push("源数据格式不正确".to_string());
        }

        let mapping = rule.mapping_config.as_object();
        if mapping.is_none() {
            errors.push("映射配置格式不正确".to_string());
        }

        let valid = errors.is_empty();

        let voucher_preview = if valid {
            Some(serde_json::json!({
                "voucher_type": rule.output_voucher_type,
                "description": format!("自动生成凭证 - {}", rule.name),
                "source_type": rule.source_type,
                "lines": [
                    {
                        "account_code": "1002",
                        "direction": "debit",
                        "amount": "source.amount"
                    },
                    {
                        "account_code": "6001",
                        "direction": "credit",
                        "amount": "source.amount"
                    }
                ]
            }))
        } else {
            None
        };

        Ok(TestRuleResult {
            valid,
            voucher_preview,
            errors,
        })
    }

    pub async fn generate_vouchers(
        &self,
        tenant_id: Uuid,
        req: GenerateVouchersRequest,
        generated_by: &str,
    ) -> Result<GenerationResult, TopemsError> {
        let rule = self.get_generation_rule(tenant_id, req.rule_id).await?;

        if rule.status != "active" {
            return Err(TopemsError::ValidationFailed("生成规则未启用".to_string()));
        }

        // Parse mapping config to get line definitions
        let mapping = rule
            .mapping_config
            .as_object()
            .ok_or_else(|| TopemsError::ValidationFailed("映射配置格式不正确".to_string()))?;

        let lines_config = mapping
            .get("lines")
            .and_then(|v| v.as_array())
            .ok_or_else(|| TopemsError::ValidationFailed("映射配置缺少 lines 数组".to_string()))?;

        if lines_config.is_empty() {
            return Err(TopemsError::ValidationFailed(
                "映射配置 lines 不能为空".to_string(),
            ));
        }

        let mut voucher_ids = Vec::new();
        let mut errors = Vec::new();
        let mut success_count = 0i32;
        let mut failed_count = 0i32;

        // Query source records based on source_type
        // Currently supports "payment" source type
        let source_rows: Vec<(Uuid, String, f64)> = match rule.source_type.as_str() {
            "payment" => {
                let mut query = String::from(
                    "SELECT id, payment_no, total_amount::float8 FROM core_finance_payments \
                     WHERE tenant_id = $1 AND status = 'approved' AND voucher_id IS NULL",
                );
                let mut source_ids_bound = false;
                let ids: Vec<Uuid> = req
                    .source_ids
                    .as_ref()
                    .map(|sids| {
                        sids.iter()
                            .filter_map(|s| Uuid::parse_str(s).ok())
                            .collect()
                    })
                    .unwrap_or_default();
                if !ids.is_empty() {
                    query.push_str(" AND id = ANY($2)");
                    source_ids_bound = true;
                }
                query.push_str(" ORDER BY payment_date ASC");

                let mut q = sqlx::query_as::<_, (Uuid, String, f64)>(&query).bind(tenant_id);
                if source_ids_bound {
                    q = q.bind(&ids);
                }
                q.fetch_all(&self.db_pool).await?
            }
            other => {
                return Err(TopemsError::ValidationFailed(format!(
                    "不支持的源类型: {}（目前仅支持 payment）",
                    other
                )));
            }
        };

        if source_rows.is_empty() {
            return Ok(GenerationResult {
                success_count: 0,
                failed_count: 0,
                voucher_ids: Vec::new(),
                errors: vec!["未找到符合条件的源数据".to_string()],
            });
        }

        let now = Utc::now();
        let period = format!("{:04}{:02}", now.format("%Y"), now.format("%m"));

        for (source_id, source_no, amount) in &source_rows {
            // Create voucher header
            let voucher_id = Uuid::new_v4();
            let voucher_no = format!(
                "GEN-{}-{}",
                now.format("%Y%m%d%H%M%S"),
                &voucher_id.to_string()[..8]
            );
            let description = format!("自动生成凭证 - {} (源: {})", rule.name, source_no);

            let voucher_type = rule.output_voucher_type.as_str();

            let insert_result = sqlx::query(
                r#"INSERT INTO core_finance_vouchers
                    (id, tenant_id, voucher_no, voucher_date, period, voucher_type,
                     total_debit, total_credit, status, description, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10)"#,
            )
            .bind(voucher_id)
            .bind(tenant_id)
            .bind(&voucher_no)
            .bind(now)
            .bind(&period)
            .bind(voucher_type)
            .bind(amount)
            .bind(amount)
            .bind(&description)
            .bind(generated_by)
            .execute(&self.db_pool)
            .await;

            if let Err(e) = insert_result {
                failed_count += 1;
                errors.push(format!("源记录 {} 创建凭证头失败: {}", source_no, e));
                continue;
            }

            // Create voucher lines based on mapping config
            let mut line_no = 1i32;
            let mut lines_ok = true;

            for line_cfg in lines_config {
                let account_code = line_cfg
                    .get("account_code")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let direction = line_cfg
                    .get("direction")
                    .and_then(|v| v.as_str())
                    .unwrap_or("debit");

                // Look up account by code
                let account: Option<(Uuid, String)> = sqlx::query_as(
                    "SELECT id, name FROM core_finance_accounts WHERE tenant_id = $1 AND code = $2",
                )
                .bind(tenant_id)
                .bind(account_code)
                .fetch_optional(&self.db_pool)
                .await
                .ok()
                .flatten();

                let (account_id, account_name) = match account {
                    Some((id, name)) => (id, name),
                    None => {
                        errors.push(format!(
                            "源记录 {} 行 {}: 账户代码 {} 不存在",
                            source_no, line_no, account_code
                        ));
                        lines_ok = false;
                        break;
                    }
                };

                let (debit, credit) = match direction {
                    "debit" => (*amount, 0.0),
                    "credit" => (0.0, *amount),
                    _ => (0.0, 0.0),
                };

                let line_result = sqlx::query(
                    r#"INSERT INTO core_finance_voucher_lines
                        (voucher_id, line_no, account_id, account_code, account_name,
                         description, debit, credit)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)"#,
                )
                .bind(voucher_id)
                .bind(line_no)
                .bind(account_id)
                .bind(account_code)
                .bind(&account_name)
                .bind(&description)
                .bind(debit)
                .bind(credit)
                .execute(&self.db_pool)
                .await;

                if let Err(e) = line_result {
                    errors.push(format!(
                        "源记录 {} 行 {} 插入失败: {}",
                        source_no, line_no, e
                    ));
                    lines_ok = false;
                    break;
                }

                line_no += 1;
            }

            if lines_ok {
                // Link source payment to voucher
                let _ = sqlx::query(
                    "UPDATE core_finance_payments SET voucher_id = $1 WHERE id = $2 AND tenant_id = $3"
                )
                .bind(voucher_id)
                .bind(source_id)
                .bind(tenant_id)
                .execute(&self.db_pool)
                .await;

                voucher_ids.push(voucher_id);
                success_count += 1;
            } else {
                // Clean up voucher without lines
                let _ = sqlx::query("DELETE FROM core_finance_vouchers WHERE id = $1")
                    .bind(voucher_id)
                    .execute(&self.db_pool)
                    .await;
                failed_count += 1;
            }
        }

        Ok(GenerationResult {
            success_count,
            failed_count,
            voucher_ids,
            errors,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use serde::{Deserialize, Serialize};
    use serde_json::{from_value, to_value, Value};
    use uuid::Uuid;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(v: &T) {
        let a = to_value(v).unwrap();
        let b: T = from_value(a.clone()).unwrap();
        let c = to_value(&b).unwrap();
        assert_eq!(a, c);
    }

    #[test]
    fn voucher_generation_rule_roundtrip() {
        let full = VoucherGenerationRule {
            id: uid(),
            tenant_id: uid(),
            name: "r1".into(),
            source_type: "order".into(),
            source_filter: Some(Value::from("{}")),
            mapping_config: Value::from("{\"a\":1}"),
            output_voucher_type: "sales".into(),
            status: "active".into(),
            priority: 1,
            description: Some("desc".into()),
            created_at: now(),
            updated_at: now(),
            created_by: Some("u".into()),
        };
        roundtrip(&full);

        let minimal = VoucherGenerationRule {
            id: uid(),
            tenant_id: uid(),
            name: "r2".into(),
            source_type: "order".into(),
            source_filter: None,
            mapping_config: Value::Null,
            output_voucher_type: "sales".into(),
            status: "inactive".into(),
            priority: 0,
            description: None,
            created_at: now(),
            updated_at: now(),
            created_by: None,
        };
        roundtrip(&minimal);
    }
}
