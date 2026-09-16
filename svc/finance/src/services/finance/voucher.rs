use chrono::{DateTime, Datelike, Utc};
use rust_decimal::Decimal;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared_core::error::TopemsError;

use super::FinanceService;

fn parse_period_str(s: &str) -> Result<(i32, i32), &'static str> {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() == 6 {
        let year_str: String = chars[0..4].iter().collect();
        let month_str: String = chars[4..6].iter().collect();
        let year = year_str.parse::<i32>().map_err(|_| "年份解析失败")?;
        let month = month_str.parse::<i32>().map_err(|_| "月份解析失败")?;
        Ok((year, month))
    } else if chars.len() == 7 && chars[4] == '-' {
        let year_str: String = chars[0..4].iter().collect();
        let month_str: String = chars[5..7].iter().collect();
        let year = year_str.parse::<i32>().map_err(|_| "年份解析失败")?;
        let month = month_str.parse::<i32>().map_err(|_| "月份解析失败")?;
        Ok((year, month))
    } else {
        Err("无效的期间格式，应为 YYYYMM 或 YYYY-MM")
    }
}

impl FinanceService {
    pub async fn create_voucher(
        &self,
        tenant_id: Uuid,
        req: CreateVoucherRequest,
        created_by: &str,
    ) -> Result<VoucherResponse, TopemsError> {
        let period = format!(
            "{:04}{:02}",
            req.voucher_date.year(),
            req.voucher_date.month()
        );

        self.check_period_open(tenant_id, period.clone()).await?;

        let total_debit: Decimal = req.lines.iter().map(|l| l.debit).sum();
        let total_credit: Decimal = req.lines.iter().map(|l| l.credit).sum();

        if (total_debit - total_credit).abs() > Decimal::new(1, 4) {
            return Err(TopemsError::ValidationFailed("借贷不平".to_string()));
        }

        let voucher_no = self
            .generate_voucher_no(tenant_id, req.voucher_type.clone())
            .await?;

        let voucher: Voucher = sqlx::query_as(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, template_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_no)
        .bind(req.voucher_date)
        .bind(period)
        .bind(req.voucher_type)
        .bind(total_debit)
        .bind(total_credit)
        .bind(req.description)
        .bind(created_by)
        .bind(req.template_id)
        .fetch_one(&self.db_pool)
        .await?;

        let mut lines = Vec::new();
        for (i, line) in req.lines.iter().enumerate() {
            let account = self
                .get_account_by_code(tenant_id, &line.account_code)
                .await?;

            let voucher_line = sqlx::query_as(
                only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *"),
            )
            .bind(voucher.id)
            .bind(i as i32 + 1)
            .bind(account.id)
            .bind(account.code)
            .bind(account.name)
            .bind(line.description.clone())
            .bind(line.debit)
            .bind(line.credit)
            .bind(line.project_id)
            .bind(line.department_id)
                .bind(tenant_id)
            .fetch_one(&self.db_pool)
            .await?;

            lines.push(voucher_line);
        }

        Ok(VoucherResponse {
            id: voucher.id,
            voucher_no: voucher.voucher_no,
            voucher_date: voucher.voucher_date,
            voucher_type: voucher.voucher_type,
            status: voucher.status,
            total_debit: voucher.total_debit,
            total_credit: voucher.total_credit,
            lines,
            description: voucher.description,
            created_at: voucher.created_at,
        })
    }

    pub(super) async fn generate_voucher_no(
        &self,
        tenant_id: Uuid,
        voucher_type: VoucherType,
    ) -> Result<String, TopemsError> {
        let today = Utc::now();
        let prefix = match voucher_type {
            VoucherType::General => "记",
            VoucherType::Payment => "付",
            VoucherType::Receipt => "收",
            VoucherType::Transfer => "转",
        };

        let year = today.year();
        let month = today.month();

        let period_prefix = format!("{:04}{:02}", year, month);
        let count: (i64,) = sqlx::query_as(only_own_schema_query!(
            "finance",
            "SELECT COUNT(*) FROM finance.core_finance_vouchers 
             WHERE deleted_at IS NULL AND tenant_id = $1 AND voucher_type = $2 AND period LIKE $3"
        ))
        .bind(tenant_id)
        .bind(voucher_type)
        .bind(format!("{}%", period_prefix))
        .fetch_one(&self.db_pool)
        .await?;

        Ok(format!("{}{}{:04}", prefix, period_prefix, count.0 + 1))
    }

    pub async fn submit_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
    ) -> Result<Voucher, TopemsError> {
        let before: Voucher = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2 AND status = 'draft'"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        before.status.validate_submit().map_err(|e| {
            let ModelValidationError::InvalidStatus(msg) = e;
            TopemsError::ValidationFailed(msg)
        })?;

        let voucher = sqlx::query_as(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(voucher)
    }

    pub async fn approve_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
        approved_by: &str,
    ) -> Result<Voucher, TopemsError> {
        let before: Voucher = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2 AND status = 'submitted'"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        before.status.validate_approve().map_err(|e| {
            let ModelValidationError::InvalidStatus(msg) = e;
            TopemsError::ValidationFailed(msg)
        })?;

        let voucher = sqlx::query_as(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'approved', approved_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .bind(approved_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(voucher)
    }

    pub async fn reject_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
        _rejected_by: &str,
    ) -> Result<Voucher, TopemsError> {
        let before: Voucher = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2 AND status = 'submitted'"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        before.status.validate_reject().map_err(|e| {
            let ModelValidationError::InvalidStatus(msg) = e;
            TopemsError::ValidationFailed(msg)
        })?;

        let voucher = sqlx::query_as(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(voucher)
    }

    pub async fn post_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
        posted_by: &str,
    ) -> Result<Voucher, TopemsError> {
        let voucher: Voucher = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2 AND status = 'approved'"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        voucher.status.validate_post().map_err(|e| {
            let ModelValidationError::InvalidStatus(msg) = e;
            TopemsError::ValidationFailed(msg)
        })?;

        let period_month_str = &voucher.period;
        let (p_year, p_month): (i32, i32) = match parse_period_str(period_month_str) {
            Ok(v) => v,
            Err(_) => {
                return Err(TopemsError::ValidationFailed(
                    "无效的会计期间格式".to_string(),
                ))
            }
        };
        let period_status: Option<String> = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT status FROM finance.core_finance_periods WHERE tenant_id = $1 AND year = $2 AND month = $3")
        )
        .bind(tenant_id)
        .bind(p_year)
        .bind(p_month)
        .fetch_optional(&self.db_pool)
        .await?;
        if let Some(status_str) = period_status {
            let status = match status_str.as_str() {
                "open" => PeriodStatus::Open,
                "closing" => PeriodStatus::Closing,
                "closed" => PeriodStatus::Closed,
                _ => PeriodStatus::Closed,
            };
            status
                .validate_create_entry()
                .map_err(|e| TopemsError::ValidationFailed(format!("凭证期间不允许过账：{}", e)))?;
        }

        let lines: Vec<VoucherLine> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, created_at FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no"),
        )
        .bind(voucher.id)
        .fetch_all(&self.db_pool)
        .await?;

        for line in &lines {
            let balance = self
                .calculate_account_balance(tenant_id, line.account_id)
                .await?;
            let new_balance = if line.debit > Decimal::ZERO {
                balance + line.debit - line.credit
            } else {
                balance - line.credit + line.debit
            };

            sqlx::query(
                only_own_schema_query!("finance", "INSERT INTO finance.core_finance_ledger (tenant_id, account_id, account_code, account_name, voucher_id, voucher_no, voucher_date, period, description, debit, credit, balance)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"),
            )
            .bind(tenant_id)
            .bind(line.account_id)
            .bind(line.account_code.clone())
            .bind(line.account_name.clone())
            .bind(voucher.id)
            .bind(voucher.voucher_no.clone())
            .bind(voucher.voucher_date)
            .bind(voucher.period.clone())
            .bind(line.description.clone())
            .bind(line.debit)
            .bind(line.credit)
            .bind(new_balance)
            .execute(&self.db_pool)
            .await?;
        }

        let updated_voucher = sqlx::query_as(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'posted', posted_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .bind(posted_by)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(updated_voucher)
    }

    pub(super) async fn calculate_account_balance(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<Decimal, TopemsError> {
        let result: (Option<Decimal>,) = sqlx::query_as(only_own_schema_query!(
            "finance",
            "SELECT COALESCE(SUM(debit - credit), 0) as balance FROM finance.core_finance_ledger
             WHERE deleted_at IS NULL AND tenant_id = $1 AND account_id = $2"
        ))
        .bind(tenant_id)
        .bind(account_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(result.0.unwrap_or(Decimal::ZERO))
    }

    pub async fn get_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
    ) -> Result<VoucherResponse, TopemsError> {
        let voucher: Voucher =
            sqlx::query_as(only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"))
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_one(&self.db_pool)
                .await?;

        let lines: Vec<VoucherLine> = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, created_at FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no"),
        )
        .bind(voucher.id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(VoucherResponse {
            id: voucher.id,
            voucher_no: voucher.voucher_no,
            voucher_date: voucher.voucher_date,
            voucher_type: voucher.voucher_type,
            status: voucher.status,
            total_debit: voucher.total_debit,
            total_credit: voucher.total_credit,
            lines,
            description: voucher.description,
            created_at: voucher.created_at,
        })
    }

    pub async fn list_vouchers(
        &self,
        tenant_id: Uuid,
        status: Option<VoucherStatus>,
        period: Option<String>,
    ) -> Result<Vec<Voucher>, TopemsError> {
        let mut query =
            "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1)"
                .to_string();
        let status_provided = status.is_some();
        let period_provided = period.is_some();

        if status_provided {
            query.push_str(" AND status = $2");
        }
        if period_provided {
            let param_num = if status_provided { "$3" } else { "$2" };
            query.push_str(&format!(" AND period = {}", param_num));
        }

        query.push_str(" ORDER BY voucher_date DESC");

        let mut query_builder = sqlx::query_as(&query).bind(tenant_id);
        if let Some(s) = status {
            query_builder = query_builder.bind(s);
        }
        if let Some(p) = period {
            query_builder = query_builder.bind(p);
        }

        let vouchers = query_builder.fetch_all(&self.db_pool).await?;

        Ok(vouchers)
    }

    pub async fn batch_submit_vouchers(
        &self,
        tenant_id: Uuid,
        voucher_ids: Vec<Uuid>,
    ) -> Result<BatchVoucherResponse, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for voucher_id in voucher_ids {
            match self.submit_voucher(tenant_id, voucher_id).await {
                Ok(voucher) => {
                    success_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: Some(voucher.voucher_no),
                        success: true,
                        message: "提交成功".to_string(),
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: None,
                        success: false,
                        message: e.to_string(),
                    });
                }
            }
        }

        Ok(BatchVoucherResponse {
            success_count,
            fail_count,
            results,
        })
    }

    pub async fn batch_approve_vouchers(
        &self,
        tenant_id: Uuid,
        voucher_ids: Vec<Uuid>,
        approved_by: &str,
    ) -> Result<BatchVoucherResponse, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for voucher_id in voucher_ids {
            match self
                .approve_voucher(tenant_id, voucher_id, approved_by)
                .await
            {
                Ok(voucher) => {
                    success_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: Some(voucher.voucher_no),
                        success: true,
                        message: "审批成功".to_string(),
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: None,
                        success: false,
                        message: e.to_string(),
                    });
                }
            }
        }

        Ok(BatchVoucherResponse {
            success_count,
            fail_count,
            results,
        })
    }

    pub async fn batch_post_vouchers(
        &self,
        tenant_id: Uuid,
        voucher_ids: Vec<Uuid>,
        posted_by: &str,
    ) -> Result<BatchVoucherResponse, TopemsError> {
        let mut results = Vec::new();
        let mut success_count = 0;
        let mut fail_count = 0;

        for voucher_id in voucher_ids {
            match self.post_voucher(tenant_id, voucher_id, posted_by).await {
                Ok(voucher) => {
                    success_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: Some(voucher.voucher_no),
                        success: true,
                        message: "过账成功".to_string(),
                    });
                }
                Err(e) => {
                    fail_count += 1;
                    results.push(BatchVoucherResult {
                        voucher_id,
                        voucher_no: None,
                        success: false,
                        message: e.to_string(),
                    });
                }
            }
        }

        Ok(BatchVoucherResponse {
            success_count,
            fail_count,
            results,
        })
    }

    pub async fn export_vouchers(
        &self,
        tenant_id: Uuid,
        req: ExportVoucherRequest,
    ) -> Result<ExportVoucherResponse, TopemsError> {
        let mut query = "SELECT v.*, vl.* FROM finance.core_finance_vouchers v JOIN finance.core_finance_voucher_lines vl ON v.id = vl.voucher_id WHERE v.tenant_id = $1".to_string();

        if let Some(status) = req.status {
            query.push_str(&format!(" AND v.status = '{}'", status));
        }
        if let Some(period) = req.period {
            query.push_str(&format!(" AND v.period = '{}'", period));
        }

        if !req.voucher_ids.is_empty() {
            let ids_str = req
                .voucher_ids
                .iter()
                .map(|id| format!("'{}'", id))
                .collect::<Vec<_>>()
                .join(",");
            query.push_str(&format!(" AND v.id IN ({})", ids_str));
        }

        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await?;

        let mut total_debit = Decimal::ZERO;
        let mut total_credit = Decimal::ZERO;
        let mut export_rows = Vec::new();

        for row in rows {
            let voucher_no: String = row.get("voucher_no");
            let voucher_date: DateTime<Utc> = row.get("voucher_date");
            let period: String = row.get("period");
            let voucher_type: VoucherType = row.get("voucher_type");
            let status: VoucherStatus = row.get("status");
            let line_no: i32 = row.get("line_no");
            let account_code: String = row.get("account_code");
            let account_name: String = row.get("account_name");
            let description: Option<String> = row.get("description");
            let debit: Decimal = row.get("debit");
            let credit: Decimal = row.get("credit");
            let created_by: String = row.get("created_by");

            total_debit += debit;
            total_credit += credit;

            export_rows.push(VoucherExportRow {
                voucher_no,
                voucher_date: voucher_date.to_rfc3339(),
                period,
                voucher_type: voucher_type.to_string(),
                status: status.to_string(),
                line_no,
                account_code,
                account_name,
                description,
                debit,
                credit,
                project_name: None,
                department_name: None,
                created_by,
            });
        }

        let json_data = serde_json::to_string(&export_rows).map_err(|e| {
            TopemsError::Internal(format!("Failed to serialize export data: {}", e))
        })?;

        Ok(ExportVoucherResponse {
            file_name: format!("vouchers_export_{}.json", Utc::now().timestamp()),
            format: req.format,
            total_count: export_rows.len(),
            total_debit,
            total_credit,
            file_data: json_data,
            created_at: Utc::now(),
        })
    }

    /// V39.0 Phase 7: 更新凭证（仅 draft/submitted/rejected 状态可更新）
    pub async fn update_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
        req: UpdateVoucherRequest,
        _updated_by: &str,
    ) -> Result<VoucherResponse, TopemsError> {
        let existing: Voucher =
            sqlx::query_as(only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"))
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_one(&self.db_pool)
                .await?;

        if existing.status == VoucherStatus::Posted {
            return Err(TopemsError::ValidationFailed(
                "已过账的凭证不能修改".to_string(),
            ));
        }

        let voucher_date = req.voucher_date.unwrap_or(existing.voucher_date);
        let voucher_type = req.voucher_type.unwrap_or(existing.voucher_type);
        let description = req.description.or(existing.description);

        let period = format!("{:04}{:02}", voucher_date.year(), voucher_date.month());

        if let Some(ref lines) = req.lines {
            let total_debit: Decimal = lines.iter().map(|l| l.debit).sum();
            let total_credit: Decimal = lines.iter().map(|l| l.credit).sum();

            if (total_debit - total_credit).abs() > Decimal::new(1, 4) {
                return Err(TopemsError::ValidationFailed("借贷不平".to_string()));
            }

            sqlx::query(
                only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET voucher_date = $1, period = $2, voucher_type = $3, description = $4, total_debit = $5, total_credit = $6, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $7 AND id = $8"),
            )
            .bind(voucher_date)
            .bind(&period)
            .bind(&voucher_type)
            .bind(&description)
            .bind(total_debit)
            .bind(total_credit)
            .bind(tenant_id)
            .bind(voucher_id)
            .execute(&self.db_pool)
            .await?;

            sqlx::query(only_own_schema_query!(
                "finance",
                "DELETE FROM finance.core_finance_voucher_lines WHERE voucher_id = $1"
            ))
            .bind(voucher_id)
            .execute(&self.db_pool)
            .await?;

            let mut new_lines = Vec::new();
            for (i, line) in lines.iter().enumerate() {
                let account = self
                    .get_account_by_code(tenant_id, &line.account_code)
                    .await?;

                let voucher_line = sqlx::query_as(
                    only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, tenant_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                     RETURNING *"),
                )
                .bind(voucher_id)
                .bind(i as i32 + 1)
                .bind(account.id)
                .bind(account.code)
                .bind(account.name)
                .bind(line.description.clone())
                .bind(line.debit)
                .bind(line.credit)
                .bind(line.project_id)
                .bind(line.department_id)
                .bind(tenant_id)
                .fetch_one(&self.db_pool)
                .await?;

                new_lines.push(voucher_line);
            }

            let updated: Voucher = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"),
            )
            .bind(tenant_id)
            .bind(voucher_id)
            .fetch_one(&self.db_pool)
            .await?;

            Ok(VoucherResponse {
                id: updated.id,
                voucher_no: updated.voucher_no,
                voucher_date: updated.voucher_date,
                voucher_type: updated.voucher_type,
                status: updated.status,
                total_debit: updated.total_debit,
                total_credit: updated.total_credit,
                lines: new_lines,
                description: updated.description,
                created_at: updated.created_at,
            })
        } else {
            let updated: Voucher = sqlx::query_as(
                only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET voucher_date = $1, period = $2, voucher_type = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $5 AND id = $6 RETURNING *"),
            )
            .bind(voucher_date)
            .bind(&period)
            .bind(&voucher_type)
            .bind(&description)
            .bind(tenant_id)
            .bind(voucher_id)
            .fetch_one(&self.db_pool)
            .await?;

            let existing_lines: Vec<VoucherLine> = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, created_at FROM finance.core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no"),
            )
            .bind(voucher_id)
            .fetch_all(&self.db_pool)
            .await?;

            Ok(VoucherResponse {
                id: updated.id,
                voucher_no: updated.voucher_no,
                voucher_date: updated.voucher_date,
                voucher_type: updated.voucher_type,
                status: updated.status,
                total_debit: updated.total_debit,
                total_credit: updated.total_credit,
                lines: existing_lines,
                description: updated.description,
                created_at: updated.created_at,
            })
        }
    }

    /// V39.0 Phase 7: 删除凭证（仅 draft/submitted/rejected/cancelled 状态可删除）
    pub async fn delete_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
    ) -> Result<(), TopemsError> {
        let existing: Voucher =
            sqlx::query_as(only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"))
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_optional(&self.db_pool)
                .await?
                .ok_or_else(|| TopemsError::NotFound("凭证不存在".to_string()))?;

        if existing.status == VoucherStatus::Posted {
            return Err(TopemsError::ValidationFailed(
                "已过账的凭证不能删除".to_string(),
            ));
        }

        sqlx::query(only_own_schema_query!(
            "finance",
            "DELETE FROM finance.core_finance_voucher_lines WHERE voucher_id = $1"
        ))
        .bind(voucher_id)
        .execute(&self.db_pool)
        .await?;

        sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }

    /// V39.0 Phase 7: 反过账凭证（将已过账凭证回退到 approved 状态，并删除相关总账分录）
    pub async fn unpost_voucher(
        &self,
        tenant_id: Uuid,
        voucher_id: Uuid,
    ) -> Result<Voucher, TopemsError> {
        let existing: Voucher =
            sqlx::query_as(only_own_schema_query!("finance", "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2"))
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_optional(&self.db_pool)
                .await?
                .ok_or_else(|| TopemsError::NotFound("凭证不存在".to_string()))?;

        existing.status.validate_unpost().map_err(|e| {
            let ModelValidationError::InvalidStatus(msg) = e;
            TopemsError::ValidationFailed(msg)
        })?;

        sqlx::query(only_own_schema_query!("finance", "UPDATE finance.core_finance_ledger SET deleted_at = NOW() WHERE tenant_id = $1 AND voucher_id = $2"))
            .bind(tenant_id)
            .bind(voucher_id)
            .execute(&self.db_pool)
            .await?;

        let voucher = sqlx::query_as(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET status = 'approved', posted_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1 AND id = $2 RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        Ok(voucher)
    }

    pub(super) async fn create_voucher_with_tx(
        &self,
        tx: &mut sqlx::PgConnection,
        tenant_id: Uuid,
        req: CreateVoucherRequest,
        created_by: &str,
    ) -> Result<VoucherResponse, TopemsError> {
        let period = format!(
            "{:04}{:02}",
            req.voucher_date.year(),
            req.voucher_date.month()
        );

        let total_debit: Decimal = req.lines.iter().map(|l| l.debit).sum();
        let total_credit: Decimal = req.lines.iter().map(|l| l.credit).sum();

        let voucher_no = self
            .generate_voucher_no_with_tx(tx, tenant_id, req.voucher_type.clone())
            .await?;

        let voucher: Voucher = sqlx::query_as(
            only_own_schema_query!("finance", "INSERT INTO finance.core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
             RETURNING *"),
        )
        .bind(tenant_id)
        .bind(voucher_no)
        .bind(req.voucher_date)
        .bind(period)
        .bind(req.voucher_type)
        .bind(total_debit)
        .bind(total_credit)
        .bind(req.description)
        .bind(created_by)
        .fetch_one(&mut *tx)
        .await?;

        let mut lines = Vec::new();
        for (i, line) in req.lines.iter().enumerate() {
            let account: Account = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM finance.core_finance_accounts WHERE tenant_id = $1 AND code = $2"),
            )
            .bind(tenant_id)
            .bind(&line.account_code)
            .fetch_one(&mut *tx)
            .await?;

            let voucher_line: VoucherLine = sqlx::query_as(
                only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *"),
            )
            .bind(voucher.id)
            .bind(i as i32 + 1)
            .bind(account.id)
            .bind(account.code)
            .bind(account.name)
            .bind(line.description.clone())
            .bind(line.debit)
            .bind(line.credit)
            .bind(line.project_id)
            .bind(line.department_id)
                .bind(tenant_id)
            .fetch_one(&mut *tx)
            .await?;

            lines.push(voucher_line);
        }

        Ok(VoucherResponse {
            id: voucher.id,
            voucher_no: voucher.voucher_no,
            voucher_date: voucher.voucher_date,
            voucher_type: voucher.voucher_type,
            status: voucher.status,
            total_debit: voucher.total_debit,
            total_credit: voucher.total_credit,
            lines,
            description: voucher.description,
            created_at: voucher.created_at,
        })
    }

    pub(super) async fn generate_voucher_no_with_tx(
        &self,
        tx: &mut sqlx::PgConnection,
        tenant_id: Uuid,
        voucher_type: VoucherType,
    ) -> Result<String, TopemsError> {
        let today = Utc::now();
        let prefix = match voucher_type {
            VoucherType::General => "记",
            VoucherType::Payment => "付",
            VoucherType::Receipt => "收",
            VoucherType::Transfer => "转",
        };

        let year = today.year();
        let month = today.month();
        let period_prefix = format!("{}{:02}", year, month);

        let count: (i64,) = sqlx::query_as(
            only_own_schema_query!("finance", "SELECT COUNT(*) FROM finance.core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND voucher_no LIKE $2"),
        )
        .bind(tenant_id)
        .bind(format!("{}{}%", prefix, period_prefix))
        .fetch_one(&mut *tx)
        .await?;

        Ok(format!("{}{}{:04}", prefix, period_prefix, count.0 + 1))
    }

    pub(super) async fn update_voucher_lines_with_tx(
        &self,
        tx: &mut sqlx::PgConnection,
        tenant_id: Uuid,
        voucher_id: Uuid,
        lines: Vec<VoucherLineRequest>,
        _updated_by: &str,
    ) -> Result<(), TopemsError> {
        let total_debit: Decimal = lines.iter().map(|l| l.debit).sum();
        let total_credit: Decimal = lines.iter().map(|l| l.credit).sum();

        sqlx::query(
            only_own_schema_query!("finance", "UPDATE finance.core_finance_vouchers SET total_debit = $1, total_credit = $2, updated_at = NOW() WHERE id = $3"),
        )
        .bind(total_debit)
        .bind(total_credit)
        .bind(voucher_id)
        .execute(&mut *tx)
        .await?;

        for (i, line) in lines.iter().enumerate() {
            let account: Account = sqlx::query_as(
                only_own_schema_query!("finance", "SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM finance.core_finance_accounts WHERE tenant_id = $1 AND code = $2"),
            )
            .bind(tenant_id)
            .bind(&line.account_code)
            .fetch_one(&mut *tx)
            .await?;

            sqlx::query(
                only_own_schema_query!("finance", "INSERT INTO finance.core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"),
            )
            .bind(voucher_id)
            .bind(i as i32 + 1)
            .bind(account.id)
            .bind(account.code)
            .bind(account.name)
            .bind(line.description.clone())
            .bind(line.debit)
            .bind(line.credit)
            .bind(line.project_id)
            .bind(line.department_id)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await?;
        }

        Ok(())
    }
}

use super::trial_balance::calculate_trial_balance;
use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum PostValidationError {
    InvalidVoucherStatus {
        actual: VoucherStatus,
    },
    PeriodMismatch {
        voucher_period: String,
        period_id: String,
    },
    PeriodNotOpen {
        actual: PeriodStatus,
    },
    EmptyEntries,
    TrialBalanceUnbalanced {
        debit: Decimal,
        credit: Decimal,
    },
    InvalidEntryAmount {
        index: usize,
        field: &'static str,
        amount: Decimal,
    },
    EmptyAccountCode {
        index: usize,
    },
}

impl fmt::Display for PostValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PostValidationError::InvalidVoucherStatus { actual } => {
                write!(
                    f,
                    "invalid voucher status for posting: expected Draft or Pending/Approved, actual {:?}",
                    actual
                )
            }
            PostValidationError::PeriodMismatch {
                voucher_period,
                period_id,
            } => {
                write!(
                    f,
                    "voucher period {} does not match target period {}",
                    voucher_period, period_id
                )
            }
            PostValidationError::PeriodNotOpen { actual } => {
                write!(
                    f,
                    "cannot post to non-Open period, actual status: {:?}",
                    actual
                )
            }
            PostValidationError::EmptyEntries => {
                write!(f, "voucher has no entries, cannot post")
            }
            PostValidationError::TrialBalanceUnbalanced { debit, credit } => {
                write!(
                    f,
                    "trial balance unbalanced for posting: debit {} != credit {}",
                    debit, credit
                )
            }
            PostValidationError::InvalidEntryAmount {
                index,
                field,
                amount,
            } => {
                write!(
                    f,
                    "entry at index {} has non-positive {} amount: {}",
                    index, field, amount
                )
            }
            PostValidationError::EmptyAccountCode { index } => {
                write!(f, "entry at index {} has empty account_code", index)
            }
        }
    }
}

impl std::error::Error for PostValidationError {}

#[derive(Debug, Clone)]
pub struct PostJournalEntry {
    pub voucher_no: String,
    pub voucher_date: DateTime<Utc>,
    pub account_code: String,
    pub account_name: String,
    pub description: Option<String>,
    pub debit: Decimal,
    pub credit: Decimal,
}

impl From<PostJournalEntry> for JournalEntry {
    fn from(e: PostJournalEntry) -> Self {
        JournalEntry {
            voucher_no: e.voucher_no,
            voucher_date: e.voucher_date,
            account_code: e.account_code,
            account_name: e.account_name,
            description: e.description,
            debit: e.debit,
            credit: e.credit,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PostVoucherInput {
    pub status: VoucherStatus,
    pub period_id: String,
    pub entries: Vec<PostJournalEntry>,
}

#[derive(Debug, Clone)]
pub struct PostPeriodInput {
    pub id: String,
    pub status: PeriodStatus,
}

pub fn validate_post_entry(
    voucher: &PostVoucherInput,
    period: &PostPeriodInput,
) -> Result<(), PostValidationError> {
    if !matches!(
        voucher.status,
        VoucherStatus::Draft | VoucherStatus::Submitted | VoucherStatus::Approved
    ) {
        return Err(PostValidationError::InvalidVoucherStatus {
            actual: voucher.status.clone(),
        });
    }

    if voucher.period_id != period.id {
        return Err(PostValidationError::PeriodMismatch {
            voucher_period: voucher.period_id.clone(),
            period_id: period.id.clone(),
        });
    }

    if !matches!(period.status, PeriodStatus::Open | PeriodStatus::Closing) {
        return Err(PostValidationError::PeriodNotOpen {
            actual: period.status.clone(),
        });
    }

    if voucher.entries.is_empty() {
        return Err(PostValidationError::EmptyEntries);
    }

    for (i, entry) in voucher.entries.iter().enumerate() {
        if entry.account_code.trim().is_empty() {
            return Err(PostValidationError::EmptyAccountCode { index: i });
        }
        if entry.debit < Decimal::ZERO {
            return Err(PostValidationError::InvalidEntryAmount {
                index: i,
                field: "debit",
                amount: entry.debit,
            });
        }
        if entry.credit < Decimal::ZERO {
            return Err(PostValidationError::InvalidEntryAmount {
                index: i,
                field: "credit",
                amount: entry.credit,
            });
        }
        if entry.debit == Decimal::ZERO && entry.credit == Decimal::ZERO {
            return Err(PostValidationError::InvalidEntryAmount {
                index: i,
                field: "debit_and_credit",
                amount: Decimal::ZERO,
            });
        }
    }

    let j_entries: Vec<JournalEntry> = voucher
        .entries
        .iter()
        .cloned()
        .map(JournalEntry::from)
        .collect();
    let tb = calculate_trial_balance(&j_entries);
    if !tb.is_balanced {
        return Err(PostValidationError::TrialBalanceUnbalanced {
            debit: tb.total_debits,
            credit: tb.total_credits,
        });
    }

    Ok(())
}

#[cfg(test)]
mod post_validation_tests {
    use super::super::periods::{validate_children_all_closed, PeriodValidationError};
    use super::super::trial_balance::validate_period_close_with_trial_balance;
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn entry(account_code: &str, account_name: &str, debit: i64, credit: i64) -> PostJournalEntry {
        PostJournalEntry {
            voucher_no: "记2026080001".to_string(),
            voucher_date: now(),
            account_code: account_code.to_string(),
            account_name: account_name.to_string(),
            description: None,
            debit: Decimal::new(debit, 0),
            credit: Decimal::new(credit, 0),
        }
    }

    fn voucher(
        status: VoucherStatus,
        period_id: &str,
        entries: Vec<PostJournalEntry>,
    ) -> PostVoucherInput {
        PostVoucherInput {
            status,
            period_id: period_id.to_string(),
            entries,
        }
    }

    fn period(id: &str, status: PeriodStatus) -> PostPeriodInput {
        PostPeriodInput {
            id: id.to_string(),
            status,
        }
    }

    fn balanced_entries() -> Vec<PostJournalEntry> {
        vec![
            entry("1001", "库存现金", 1000, 0),
            entry("2001", "应付账款", 0, 1000),
        ]
    }

    // ===== Rule 1: InvalidVoucherStatus =====

    #[test]
    fn test_post_err_status_posted() {
        let v = voucher(VoucherStatus::Posted, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::InvalidVoucherStatus {
                actual: VoucherStatus::Posted
            }
        ));
        assert!(format!("{}", e).contains("invalid voucher status"));
    }

    #[test]
    fn test_post_err_status_reversed() {
        let v = voucher(VoucherStatus::Reversed, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::InvalidVoucherStatus {
                actual: VoucherStatus::Reversed
            }
        ));
    }

    #[test]
    fn test_post_err_status_cancelled() {
        let v = voucher(VoucherStatus::Cancelled, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::InvalidVoucherStatus {
                actual: VoucherStatus::Cancelled
            }
        ));
    }

    #[test]
    fn test_post_err_status_rejected() {
        let v = voucher(VoucherStatus::Rejected, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::InvalidVoucherStatus {
                actual: VoucherStatus::Rejected
            }
        ));
    }

    #[test]
    fn test_post_ok_status_draft() {
        let v = voucher(VoucherStatus::Draft, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    #[test]
    fn test_post_ok_status_submitted() {
        let v = voucher(VoucherStatus::Submitted, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    #[test]
    fn test_post_ok_status_approved() {
        let v = voucher(VoucherStatus::Approved, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    // ===== Rule 2: PeriodMismatch =====

    #[test]
    fn test_post_err_period_mismatch_different_month() {
        let v = voucher(VoucherStatus::Approved, "202607", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::PeriodMismatch { ref voucher_period, ref period_id }
            if voucher_period == "202607" && period_id == "202608"
        ));
        assert!(format!("{}", e).contains("does not match"));
    }

    #[test]
    fn test_post_err_period_mismatch_different_year() {
        let v = voucher(VoucherStatus::Approved, "202508", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::PeriodMismatch { .. }
        ));
    }

    #[test]
    fn test_post_err_period_mismatch_case() {
        let v = voucher(VoucherStatus::Approved, "2026AUG", balanced_entries());
        let p = period("2026aug", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err(), "case-sensitive string comparison");
    }

    // ===== Rule 3: PeriodNotOpen =====

    #[test]
    fn test_post_err_period_closed() {
        let v = voucher(VoucherStatus::Approved, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Closed);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::PeriodNotOpen {
                actual: PeriodStatus::Closed
            }
        ));
        assert!(format!("{}", e).contains("non-Open period"));
    }

    #[test]
    fn test_post_ok_period_closing() {
        let v = voucher(VoucherStatus::Approved, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Closing);
        assert!(
            validate_post_entry(&v, &p).is_ok(),
            "Closing period allows posting"
        );
    }

    #[test]
    fn test_post_ok_period_open() {
        let v = voucher(VoucherStatus::Approved, "202608", balanced_entries());
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    // ===== Rule 4: EmptyEntries =====

    #[test]
    fn test_post_err_empty_entries() {
        let v = voucher(VoucherStatus::Approved, "202608", vec![]);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(e, PostValidationError::EmptyEntries));
        assert!(format!("{}", e).contains("no entries"));
    }

    #[test]
    fn test_post_err_single_balanced_line_ok() {
        let lines = vec![entry("1001", "现金", 500, 500)];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    // ===== Rule 5: TrialBalanceUnbalanced =====

    #[test]
    fn test_post_err_unbalanced_debit_greater() {
        let lines = vec![
            entry("1001", "现金", 1500, 0),
            entry("2001", "应付", 0, 1000),
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::TrialBalanceUnbalanced { debit, credit }
            if debit == Decimal::new(1500, 0) && credit == Decimal::new(1000, 0)
        ));
        assert!(format!("{}", e).contains("unbalanced"));
    }

    #[test]
    fn test_post_err_unbalanced_credit_greater() {
        let lines = vec![
            entry("1001", "现金", 800, 0),
            entry("2001", "应付", 0, 1200),
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::TrialBalanceUnbalanced { debit, credit }
            if debit == Decimal::new(800, 0) && credit == Decimal::new(1200, 0)
        ));
    }

    #[test]
    fn test_post_err_unbalanced_single_sided_debit() {
        let lines = vec![entry("1001", "现金", 500, 0)];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::TrialBalanceUnbalanced { .. }
        ));
    }

    #[test]
    fn test_post_err_unbalanced_off_by_one() {
        let lines = vec![
            entry("1001", "现金", 1000, 0),
            entry("2001", "应付", 0, 999),
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_err());
    }

    // ===== Rule 6: InvalidEntryAmount =====

    #[test]
    fn test_post_err_entry_zero_both() {
        let lines = vec![entry("1001", "现金", 0, 0), entry("2001", "应付", 0, 0)];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::InvalidEntryAmount { index: 0, .. }
        ));
    }

    #[test]
    fn test_post_err_entry_negative_debit() {
        let lines = vec![
            PostJournalEntry {
                voucher_no: "记001".to_string(),
                voucher_date: now(),
                account_code: "1001".to_string(),
                account_name: "现金".to_string(),
                description: None,
                debit: Decimal::new(-100, 0),
                credit: Decimal::ZERO,
            },
            entry("2001", "应付", 0, 100),
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::InvalidEntryAmount { index: 0, field, .. }
            if field == "debit"
        ));
    }

    #[test]
    fn test_post_err_entry_negative_credit() {
        let lines = vec![
            entry("1001", "现金", 100, 0),
            PostJournalEntry {
                voucher_no: "记001".to_string(),
                voucher_date: now(),
                account_code: "2001".to_string(),
                account_name: "应付".to_string(),
                description: None,
                debit: Decimal::ZERO,
                credit: Decimal::new(-50, 0),
            },
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::InvalidEntryAmount { index: 1, field, .. }
            if field == "credit"
        ));
    }

    #[test]
    fn test_post_err_entry_second_line_zero_amounts() {
        let lines = vec![entry("1001", "现金", 1000, 0), entry("2001", "应付", 0, 0)];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::InvalidEntryAmount { index: 1, .. }
        ));
    }

    // ===== Rule 7: EmptyAccountCode =====

    #[test]
    fn test_post_err_empty_account_code_first() {
        let lines = vec![
            PostJournalEntry {
                voucher_no: "记001".to_string(),
                voucher_date: now(),
                account_code: "".to_string(),
                account_name: "现金".to_string(),
                description: None,
                debit: Decimal::new(1000, 0),
                credit: Decimal::ZERO,
            },
            entry("2001", "应付", 0, 1000),
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        let e = r.unwrap_err();
        assert!(matches!(
            e,
            PostValidationError::EmptyAccountCode { index: 0 }
        ));
        assert!(format!("{}", e).contains("empty account_code"));
    }

    #[test]
    fn test_post_err_whitespace_account_code() {
        let lines = vec![
            entry("1001", "现金", 1000, 0),
            PostJournalEntry {
                voucher_no: "记001".to_string(),
                voucher_date: now(),
                account_code: "   ".to_string(),
                account_name: "应付".to_string(),
                description: None,
                debit: Decimal::ZERO,
                credit: Decimal::new(1000, 0),
            },
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::EmptyAccountCode { index: 1 }
        ));
    }

    // ===== Happy path =====

    #[test]
    fn test_post_happy_path_ok() {
        let lines = vec![
            entry("1001", "库存现金", 5000, 0),
            entry("1002", "银行存款", 3000, 0),
            entry("2001", "应付账款", 0, 4000),
            entry("3001", "实收资本", 0, 4000),
        ];
        let v = voucher(VoucherStatus::Approved, "202606", lines);
        let p = period("202606", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    #[test]
    fn test_post_happy_path_decimal_precision() {
        let lines = vec![
            PostJournalEntry {
                voucher_no: "记001".to_string(),
                voucher_date: now(),
                account_code: "1001".to_string(),
                account_name: "现金".to_string(),
                description: None,
                debit: Decimal::new(12345, 2),
                credit: Decimal::ZERO,
            },
            PostJournalEntry {
                voucher_no: "记001".to_string(),
                voucher_date: now(),
                account_code: "2001".to_string(),
                account_name: "应付".to_string(),
                description: None,
                debit: Decimal::ZERO,
                credit: Decimal::new(12345, 2),
            },
        ];
        let v = voucher(VoucherStatus::Draft, "202608", lines);
        let p = period("202608", PeriodStatus::Closing);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    #[test]
    fn test_post_happy_path_many_entries_balanced() {
        let mut lines = Vec::new();
        for i in 0..10 {
            lines.push(entry(&format!("1{:03}", 100 + i), "资产类", 100, 0));
        }
        for i in 0..10 {
            lines.push(entry(&format!("2{:03}", 200 + i), "负债类", 0, 100));
        }
        let v = voucher(VoucherStatus::Submitted, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok());
    }

    // ===== Error clone + PartialEq + std::Error =====

    #[test]
    fn test_post_validation_error_clone_and_partial_eq() {
        let a = PostValidationError::TrialBalanceUnbalanced {
            debit: Decimal::new(100, 0),
            credit: Decimal::new(200, 0),
        };
        let b = a.clone();
        assert_eq!(a, b);
        let c = PostValidationError::TrialBalanceUnbalanced {
            debit: Decimal::new(100, 0),
            credit: Decimal::new(300, 0),
        };
        assert_ne!(a, c);
    }

    #[test]
    fn test_post_validation_error_is_std_error() {
        let err: Box<dyn std::error::Error> = Box::new(PostValidationError::EmptyEntries);
        assert!(err.source().is_none());
    }

    #[test]
    fn test_post_validation_error_display_period_not_open() {
        let err = PostValidationError::PeriodNotOpen {
            actual: PeriodStatus::Closed,
        };
        let display = format!("{}", err);
        assert!(display.contains("non-Open"));
        assert!(display.contains("Closed"));
    }

    #[test]
    fn test_post_validation_error_display_invalid_amount() {
        let err = PostValidationError::InvalidEntryAmount {
            index: 3,
            field: "debit",
            amount: Decimal::new(-50, 0),
        };
        let display = format!("{}", err);
        assert!(display.contains("index 3"));
        assert!(display.contains("debit"));
        assert!(display.contains("-50"));
    }

    // ===== Integration tests =====

    #[test]
    fn test_integration_post_then_close_ok() {
        let lines = balanced_entries();
        let v = voucher(VoucherStatus::Approved, "202608", lines.clone());
        let p = period("202608", PeriodStatus::Open);
        let post_r = validate_post_entry(&v, &p);
        assert!(post_r.is_ok(), "post should succeed");

        let j_entries: Vec<JournalEntry> = lines.into_iter().map(JournalEntry::from).collect();
        let tb = calculate_trial_balance(&j_entries);
        assert!(tb.is_balanced, "trial balance should be balanced");

        let close_r = validate_period_close_with_trial_balance(&tb);
        assert!(close_r.is_ok(), "close should succeed with balanced TB");
    }

    #[test]
    fn test_integration_post_then_close_many_entries() {
        let lines = vec![
            entry("1001", "现金", 1000, 0),
            entry("1002", "银行", 2000, 0),
            entry("1122", "应收", 3000, 0),
            entry("2001", "应付", 0, 1500),
            entry("2202", "预收", 0, 2500),
            entry("3001", "实收", 0, 2000),
        ];
        let v = voucher(VoucherStatus::Approved, "202612", lines.clone());
        let p = period("202612", PeriodStatus::Closing);
        assert!(validate_post_entry(&v, &p).is_ok());

        let j_entries: Vec<JournalEntry> = lines.into_iter().map(JournalEntry::from).collect();
        let tb = calculate_trial_balance(&j_entries);
        assert!(validate_period_close_with_trial_balance(&tb).is_ok());
    }

    #[test]
    fn test_integration_unbalanced_post_rejected() {
        let lines = vec![
            entry("1001", "现金", 1000, 0),
            entry("2001", "应付", 0, 500),
        ];
        let v = voucher(VoucherStatus::Approved, "202608", lines.clone());
        let p = period("202608", PeriodStatus::Open);
        let post_r = validate_post_entry(&v, &p);
        assert!(post_r.is_err(), "unbalanced post should be rejected");
        assert!(matches!(
            post_r.unwrap_err(),
            PostValidationError::TrialBalanceUnbalanced { .. }
        ));
    }

    #[test]
    fn test_integration_closed_period_rejects_post() {
        let v = voucher(VoucherStatus::Approved, "202607", balanced_entries());
        let p = period("202607", PeriodStatus::Closed);
        let post_r = validate_post_entry(&v, &p);
        assert!(post_r.is_err());
        assert!(matches!(
            post_r.unwrap_err(),
            PostValidationError::PeriodNotOpen {
                actual: PeriodStatus::Closed
            }
        ));
    }

    #[test]
    fn test_integration_child_open_blocks_close() {
        let child_statuses = vec![
            PeriodStatus::Closed,
            PeriodStatus::Open,
            PeriodStatus::Closed,
        ];
        let r = validate_children_all_closed(&child_statuses);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PeriodValidationError::ChildPeriodNotClosed { index: 1, .. }
        ));
    }

    #[test]
    fn test_integration_all_children_closed_allows_close() {
        let child_statuses = vec![
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
        ];
        let r = validate_children_all_closed(&child_statuses);
        assert!(r.is_ok());
    }

    #[test]
    fn test_integration_posted_status_rejects_repost() {
        let lines = balanced_entries();
        let v = voucher(VoucherStatus::Posted, "202608", lines);
        let p = period("202608", PeriodStatus::Open);
        let r = validate_post_entry(&v, &p);
        assert!(r.is_err());
        assert!(matches!(
            r.unwrap_err(),
            PostValidationError::InvalidVoucherStatus {
                actual: VoucherStatus::Posted
            }
        ));
    }

    #[test]
    fn test_integration_post_ok_child_open_then_close_blocked() {
        let lines = balanced_entries();
        let v = voucher(VoucherStatus::Approved, "202606", lines.clone());
        let p = period("202606", PeriodStatus::Open);
        assert!(validate_post_entry(&v, &p).is_ok(), "post to June OK");

        let child_statuses = vec![
            PeriodStatus::Closed,
            PeriodStatus::Open,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
            PeriodStatus::Closed,
        ];
        let close_r = validate_children_all_closed(&child_statuses);
        assert!(
            close_r.is_err(),
            "closing June when Feb (index1) is Open should fail"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_period_str_yyyymm_ok() {
        let result = parse_period_str("202608");
        assert!(result.is_ok(), "YYYYMM format should parse");
        assert_eq!(result.unwrap(), (2026, 8));
    }

    #[test]
    fn test_parse_period_str_yyyy_mm_ok() {
        let result = parse_period_str("2026-08");
        assert!(result.is_ok(), "YYYY-MM format should parse");
        assert_eq!(result.unwrap(), (2026, 8));
    }

    #[test]
    fn test_parse_period_str_too_short_err() {
        let result = parse_period_str("2026");
        assert!(result.is_err(), "4 chars should be invalid");
    }

    #[test]
    fn test_parse_period_str_invalid_month_value_yyyymm() {
        let result = parse_period_str("202613");
        assert!(
            result.is_ok(),
            "YYYYMM 202613 still parses numerically (13 is valid i32)"
        );
        assert_eq!(result.unwrap(), (2026, 13));
    }

    #[test]
    fn test_parse_period_str_invalid_year_chars() {
        let result = parse_period_str("ABCD-EF");
        assert!(result.is_err(), "non-numeric year should fail");
    }
}
