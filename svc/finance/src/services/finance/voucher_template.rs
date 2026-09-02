#![allow(unused_imports)]

use chrono::{DateTime, Utc};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::FinanceService;
use topems_shared_core::error::TopemsError;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct VoucherTemplate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub voucher_type: String,
    pub default_debit_account: Option<String>,
    pub default_credit_account: Option<String>,
    pub is_default: bool,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow, utoipa::ToSchema)]
pub struct VoucherTemplateLine {
    pub id: Uuid,
    pub template_id: Uuid,
    pub description: Option<String>,
    pub account_code: String,
    pub direction: String,
    pub amount_formula: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Deserialize, utoipa::ToSchema)]
pub struct CreateVoucherTemplateRequest {
    pub name: String,
    pub description: Option<String>,
    pub voucher_type: String,
    pub default_debit_account: Option<String>,
    pub default_credit_account: Option<String>,
    pub lines: Vec<CreateVoucherTemplateLineRequest>,
}

#[derive(Debug, Clone, serde::Deserialize, utoipa::ToSchema)]
pub struct CreateVoucherTemplateLineRequest {
    pub description: Option<String>,
    pub account_code: String,
    pub direction: String,
    pub amount_formula: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Clone, serde::Deserialize, utoipa::ToSchema)]
pub struct UpdateVoucherTemplateRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub voucher_type: Option<String>,
    pub default_debit_account: Option<String>,
    pub default_credit_account: Option<String>,
    pub is_default: Option<bool>,
    pub status: Option<String>,
    pub lines: Option<Vec<CreateVoucherTemplateLineRequest>>,
}

#[derive(Debug, Clone, serde::Serialize, utoipa::ToSchema)]
pub struct VoucherTemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub voucher_type: String,
    pub default_debit_account: Option<String>,
    pub default_credit_account: Option<String>,
    pub is_default: bool,
    pub status: String,
    pub lines: Vec<VoucherTemplateLine>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Deserialize, utoipa::ToSchema)]
pub struct ApplyTemplateRequest {
    pub template_id: Uuid,
    pub voucher_date: Option<chrono::NaiveDate>,
    pub description: Option<String>,
    pub custom_amounts: Option<std::collections::HashMap<String, rust_decimal::Decimal>>,
}

impl FinanceService {
    pub async fn list_voucher_templates(
        &self,
        tenant_id: Uuid,
        voucher_type: Option<String>,
        status: Option<String>,
    ) -> Result<Vec<VoucherTemplateResponse>, TopemsError> {
        let mut query =
            "SELECT id, tenant_id, name, code, description, template_type, is_active, created_by, created_at, updated_at FROM finance_voucher_templates WHERE deleted_at IS NULL AND tenant_id = $1"
                .to_string();
        let _params: Vec<&(dyn sqlx::Encode<'_, sqlx::Postgres> + Send + Sync)> = Vec::new();

        if voucher_type.is_some() {
            query.push_str(" AND voucher_type = $2");
        }
        if status.is_some() {
            let idx = if voucher_type.is_some() { 3 } else { 2 };
            query.push_str(&format!(" AND status = ${}", idx));
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut query_builder = sqlx::query_as::<_, VoucherTemplate>(&query).bind(tenant_id);
        if let Some(vt) = &voucher_type {
            query_builder = query_builder.bind(vt);
        }
        if let Some(s) = &status {
            query_builder = query_builder.bind(s);
        }

        let templates = query_builder.fetch_all(&self.db_pool).await?;

        let mut result = Vec::new();
        for template in templates {
            let lines = self.get_template_lines(template.id).await?;
            result.push(VoucherTemplateResponse {
                id: template.id,
                name: template.name,
                description: template.description,
                voucher_type: template.voucher_type,
                default_debit_account: template.default_debit_account,
                default_credit_account: template.default_credit_account,
                is_default: template.is_default,
                status: template.status,
                lines,
                created_at: template.created_at,
                updated_at: template.updated_at,
            });
        }

        Ok(result)
    }

    pub async fn get_voucher_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
    ) -> Result<VoucherTemplateResponse, TopemsError> {
        let template: VoucherTemplate = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, name, code, description, template_type, is_active, created_by, created_at, updated_at FROM finance_voucher_templates WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"),
        )
        .bind(tenant_id)
        .bind(template_id)
        .fetch_one(&self.db_pool)
        .await?;

        let lines = self.get_template_lines(template.id).await?;

        Ok(VoucherTemplateResponse {
            id: template.id,
            name: template.name,
            description: template.description,
            voucher_type: template.voucher_type,
            default_debit_account: template.default_debit_account,
            default_credit_account: template.default_credit_account,
            is_default: template.is_default,
            status: template.status,
            lines,
            created_at: template.created_at,
            updated_at: template.updated_at,
        })
    }

    async fn get_template_lines(
        &self,
        template_id: Uuid,
    ) -> Result<Vec<VoucherTemplateLine>, TopemsError> {
        let lines: Vec<VoucherTemplateLine> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, template_id, account_id, account_code, account_name, description, debit_amount, credit_amount, sort_order, created_at FROM finance_voucher_template_lines WHERE template_id = $1 ORDER BY sort_order, created_at"),
        )
        .bind(template_id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(lines)
    }

    pub async fn create_voucher_template(
        &self,
        tenant_id: Uuid,
        req: CreateVoucherTemplateRequest,
        created_by: &str,
    ) -> Result<VoucherTemplateResponse, TopemsError> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let template: VoucherTemplate = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"
            INSERT INTO finance_voucher_templates 
                (id, tenant_id, name, description, voucher_type, 
                 default_debit_account, default_credit_account, is_default, 
                 status, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'active', $8, $8, $9)
            RETURNING *
            "#
        ))
        .bind(id)
        .bind(tenant_id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.voucher_type)
        .bind(&req.default_debit_account)
        .bind(&req.default_credit_account)
        .bind(now)
        .bind(created_by)
        .fetch_one(&self.db_pool)
        .await?;

        let mut lines = Vec::new();
        for (i, line_req) in req.lines.iter().enumerate() {
            let line_id = Uuid::new_v4();
            let sort_order = line_req.sort_order.unwrap_or(i as i32 + 1);

            let line: VoucherTemplateLine = sqlx::query_as(
                only_own_schema_query!("finance", r#"
                INSERT INTO finance_voucher_template_lines 
                    (id, template_id, description, account_code, direction, amount_formula, sort_order, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
                "#),
            )
            .bind(line_id)
            .bind(template.id)
            .bind(&line_req.description)
            .bind(&line_req.account_code)
            .bind(&line_req.direction)
            .bind(&line_req.amount_formula)
            .bind(sort_order)
            .bind(now)
            .fetch_one(&self.db_pool)
            .await?;

            lines.push(line);
        }

        Ok(VoucherTemplateResponse {
            id: template.id,
            name: template.name,
            description: template.description,
            voucher_type: template.voucher_type,
            default_debit_account: template.default_debit_account,
            default_credit_account: template.default_credit_account,
            is_default: template.is_default,
            status: template.status,
            lines,
            created_at: template.created_at,
            updated_at: template.updated_at,
        })
    }

    pub async fn update_voucher_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
        req: UpdateVoucherTemplateRequest,
    ) -> Result<VoucherTemplateResponse, TopemsError> {
        let existing: VoucherTemplate = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, name, code, description, template_type, is_active, created_by, created_at, updated_at FROM finance_voucher_templates WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"),
        )
        .bind(tenant_id)
        .bind(template_id)
        .fetch_one(&self.db_pool)
        .await?;

        let name = req.name.unwrap_or(existing.name);
        let description = req.description.or(existing.description);
        let voucher_type = req.voucher_type.unwrap_or(existing.voucher_type);
        let default_debit_account = req.default_debit_account.or(existing.default_debit_account);
        let default_credit_account = req
            .default_credit_account
            .or(existing.default_credit_account);
        let is_default = req.is_default.unwrap_or(existing.is_default);
        let status = req.status.unwrap_or(existing.status);
        let now = Utc::now();

        let template: VoucherTemplate = sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"
            UPDATE finance_voucher_templates SET
                name = $2, description = $3, voucher_type = $4,
                default_debit_account = $5, default_credit_account = $6,
                is_default = $7, status = $8, updated_at = $9
            WHERE tenant_id = $1 AND id = $10
            RETURNING *
            "#
        ))
        .bind(tenant_id)
        .bind(&name)
        .bind(&description)
        .bind(&voucher_type)
        .bind(&default_debit_account)
        .bind(&default_credit_account)
        .bind(is_default)
        .bind(&status)
        .bind(now)
        .bind(template_id)
        .fetch_one(&self.db_pool)
        .await?;

        if let Some(lines_req) = req.lines {
            sqlx::query(only_own_schema_query!(
                "finance",
                "DELETE FROM finance_voucher_template_lines WHERE template_id = $1"
            ))
            .bind(template_id)
            .execute(&self.db_pool)
            .await?;

            for (i, line_req) in lines_req.iter().enumerate() {
                let line_id = Uuid::new_v4();
                let sort_order = line_req.sort_order.unwrap_or(i as i32 + 1);

                sqlx::query(
                    only_own_schema_query!("finance", r#"
                    INSERT INTO finance_voucher_template_lines 
                        (id, template_id, description, account_code, direction, amount_formula, sort_order, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    "#),
                )
                .bind(line_id)
                .bind(template_id)
                .bind(&line_req.description)
                .bind(&line_req.account_code)
                .bind(&line_req.direction)
                .bind(&line_req.amount_formula)
                .bind(sort_order)
                .bind(now)
                .execute(&self.db_pool)
                .await?;
            }
        }

        let lines = self.get_template_lines(template_id).await?;

        Ok(VoucherTemplateResponse {
            id: template.id,
            name: template.name,
            description: template.description,
            voucher_type: template.voucher_type,
            default_debit_account: template.default_debit_account,
            default_credit_account: template.default_credit_account,
            is_default: template.is_default,
            status: template.status,
            lines,
            created_at: template.created_at,
            updated_at: template.updated_at,
        })
    }

    pub async fn delete_voucher_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
    ) -> Result<(), TopemsError> {
        let existing = sqlx::query_as::<_, VoucherTemplate>(
            only_own_schema_query!("finance", "id, tenant_id, name, code, description, template_type, is_active, created_by, created_at, updated_at FROM finance_voucher_templates WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"),
        )
        .bind(tenant_id)
        .bind(template_id)
        .fetch_optional(&self.db_pool)
        .await?;

        if existing.is_none() {
            return Err(TopemsError::NotFound("凭证模板不存在".to_string()));
        }

        sqlx::query(only_own_schema_query!(
            "finance",
            "DELETE FROM finance_voucher_template_lines WHERE template_id = $1"
        ))
        .bind(template_id)
        .execute(&self.db_pool)
        .await?;

        sqlx::query(only_own_schema_query!("finance", "UPDATE finance_voucher_templates SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"))
            .bind(tenant_id)
            .bind(template_id)
            .execute(&self.db_pool)
            .await?;

        Ok(())
    }

    pub async fn set_default_template(
        &self,
        tenant_id: Uuid,
        template_id: Uuid,
    ) -> Result<VoucherTemplateResponse, TopemsError> {
        let template: VoucherTemplate = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, name, code, description, template_type, is_active, created_by, created_at, updated_at FROM finance_voucher_templates WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"),
        )
        .bind(tenant_id)
        .bind(template_id)
        .fetch_one(&self.db_pool)
        .await?;

        sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance_voucher_templates SET is_default = false WHERE tenant_id = $1 AND voucher_type = $2"),
        )
        .bind(tenant_id)
        .bind(&template.voucher_type)
        .execute(&self.db_pool)
        .await?;

        sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance_voucher_templates SET is_default = true, updated_at = NOW() WHERE tenant_id = $1 AND id = $2"),
        )
        .bind(tenant_id)
        .bind(template_id)
        .execute(&self.db_pool)
        .await?;

        self.get_voucher_template(tenant_id, template_id).await
    }

    pub async fn apply_template(
        &self,
        tenant_id: Uuid,
        req: ApplyTemplateRequest,
    ) -> Result<serde_json::Value, TopemsError> {
        let template = self
            .get_voucher_template(tenant_id, req.template_id)
            .await?;

        let voucher_date = req
            .voucher_date
            .unwrap_or_else(|| chrono::Utc::now().date_naive());

        let mut lines = Vec::new();
        let mut total_debit = rust_decimal::Decimal::ZERO;
        let mut total_credit = rust_decimal::Decimal::ZERO;

        for line in &template.lines {
            let amount = if let Some(ref custom_amounts) = req.custom_amounts {
                custom_amounts
                    .get(&line.id.to_string())
                    .copied()
                    .unwrap_or(rust_decimal::Decimal::ZERO)
            } else {
                rust_decimal::Decimal::ZERO
            };

            let (debit, credit) = if line.direction == "debit" {
                (amount, rust_decimal::Decimal::ZERO)
            } else {
                (rust_decimal::Decimal::ZERO, amount)
            };

            total_debit += debit;
            total_credit += credit;

            lines.push(serde_json::json!({
                "account_code": line.account_code,
                "description": line.description,
                "direction": line.direction,
                "debit": debit,
                "credit": credit,
                "sort_order": line.sort_order,
            }));
        }

        Ok(serde_json::json!({
            "template_id": template.id,
            "template_name": template.name,
            "voucher_type": template.voucher_type,
            "voucher_date": voucher_date,
            "description": req.description,
            "total_debit": total_debit,
            "total_credit": total_credit,
            "lines": lines,
        }))
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
    fn voucher_template_roundtrip() {
        let full = VoucherTemplate {
            id: uid(),
            tenant_id: uid(),
            name: "sales-tpl".into(),
            description: Some("desc".into()),
            voucher_type: "sales".into(),
            default_debit_account: Some("1001".into()),
            default_credit_account: Some("6001".into()),
            is_default: true,
            status: "active".into(),
            created_at: now(),
            updated_at: now(),
            created_by: Some("u".into()),
        };
        roundtrip(&full);

        let minimal = VoucherTemplate {
            id: uid(),
            tenant_id: uid(),
            name: "x".into(),
            description: None,
            voucher_type: "x".into(),
            default_debit_account: None,
            default_credit_account: None,
            is_default: false,
            status: "inactive".into(),
            created_at: now(),
            updated_at: now(),
            created_by: None,
        };
        roundtrip(&minimal);
    }

    #[test]
    fn voucher_template_line_roundtrip() {
        let full = VoucherTemplateLine {
            id: uid(),
            template_id: uid(),
            description: Some("line desc".into()),
            account_code: "1001".into(),
            direction: "debit".into(),
            amount_formula: Some("total".into()),
            sort_order: 1,
            created_at: now(),
        };
        roundtrip(&full);

        let minimal = VoucherTemplateLine {
            id: uid(),
            template_id: uid(),
            description: None,
            account_code: "6001".into(),
            direction: "credit".into(),
            amount_formula: None,
            sort_order: 0,
            created_at: now(),
        };
        roundtrip(&minimal);
    }
}
