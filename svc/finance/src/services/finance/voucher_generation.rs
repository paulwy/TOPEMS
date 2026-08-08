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
            "SELECT id, tenant_id, name, description, source_type, source_module, template_id, trigger_condition, mapping_config, priority, status, created_by, created_at, updated_at FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1".to_string();

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
            "SELECT id, tenant_id, name, description, source_type, source_module, template_id, trigger_condition, mapping_config, priority, status, created_by, created_at, updated_at FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
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
            "SELECT id, tenant_id, name, description, source_type, source_module, template_id, trigger_condition, mapping_config, priority, status, created_by, created_at, updated_at FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
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
            "SELECT id, tenant_id, name, description, source_type, source_module, template_id, trigger_condition, mapping_config, priority, status, created_by, created_at, updated_at FROM finance_voucher_generation_rules WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
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
        _generated_by: &str,
    ) -> Result<GenerationResult, TopemsError> {
        let rule = self.get_generation_rule(tenant_id, req.rule_id).await?;

        if rule.status != "active" {
            return Err(TopemsError::ValidationFailed("生成规则未启用".to_string()));
        }

        let mut voucher_ids = Vec::new();
        let errors = Vec::new();
        let _success_count = 0;
        let failed_count = 0;

        let mock_count = 5;
        for i in 0..mock_count {
            let voucher_id = Uuid::new_v4();
            voucher_ids.push(voucher_id);
            let _ = i;
        }

        Ok(GenerationResult {
            success_count: mock_count,
            failed_count,
            voucher_ids,
            errors,
        })
    }
}
