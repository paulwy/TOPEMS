use chrono::{DateTime, Datelike, Utc};
use rust_decimal::Decimal;
use sqlx::Row;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;

use super::FinanceService;

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
            "INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, template_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10)
             RETURNING *",
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
                "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *",
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
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM core_finance_vouchers 
             WHERE deleted_at IS NULL AND tenant_id = $1 AND voucher_type = $2 AND period LIKE $3",
        )
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
        let voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'draft'
             RETURNING *",
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
        let voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'approved', approved_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
             RETURNING *",
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
        let voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2 AND status = 'submitted'
             RETURNING *",
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
            "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2 AND status = 'approved'",
        )
        .bind(tenant_id)
        .bind(voucher_id)
        .fetch_one(&self.db_pool)
        .await?;

        let lines: Vec<VoucherLine> = sqlx::query_as(
            "SELECT id, tenant_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, created_at FROM core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no",
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
                "INSERT INTO core_finance_ledger (tenant_id, account_id, account_code, account_name, voucher_id, voucher_no, voucher_date, period, description, debit, credit, balance)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
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
            "UPDATE core_finance_vouchers SET status = 'posted', posted_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE tenant_id = $1 AND id = $2
             RETURNING *",
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
        let result: (Option<Decimal>,) = sqlx::query_as(
            "SELECT COALESCE(SUM(debit - credit), 0) as balance FROM core_finance_ledger
             WHERE deleted_at IS NULL AND tenant_id = $1 AND account_id = $2",
        )
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
            sqlx::query_as("SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_one(&self.db_pool)
                .await?;

        let lines: Vec<VoucherLine> = sqlx::query_as(
            "SELECT id, tenant_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, created_at FROM core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no",
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
            "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1"
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
        let mut query = "SELECT v.*, vl.* FROM core_finance_vouchers v JOIN core_finance_voucher_lines vl ON v.id = vl.voucher_id WHERE v.tenant_id = $1".to_string();

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
            sqlx::query_as("SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2")
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
                "UPDATE core_finance_vouchers SET voucher_date = $1, period = $2, voucher_type = $3, description = $4, total_debit = $5, total_credit = $6, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $7 AND id = $8",
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

            sqlx::query("DELETE FROM core_finance_voucher_lines WHERE voucher_id = $1")
                .bind(voucher_id)
                .execute(&self.db_pool)
                .await?;

            let mut new_lines = Vec::new();
            for (i, line) in lines.iter().enumerate() {
                let account = self
                    .get_account_by_code(tenant_id, &line.account_code)
                    .await?;

                let voucher_line = sqlx::query_as(
                    "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING *",
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
                .fetch_one(&self.db_pool)
                .await?;

                new_lines.push(voucher_line);
            }

            let updated: Voucher = sqlx::query_as(
                "SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2",
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
                "UPDATE core_finance_vouchers SET voucher_date = $1, period = $2, voucher_type = $3, description = $4, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $5 AND id = $6 RETURNING *",
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
                "SELECT id, tenant_id, voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id, created_at FROM core_finance_voucher_lines WHERE voucher_id = $1 ORDER BY line_no",
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
            sqlx::query_as("SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2")
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

        sqlx::query("DELETE FROM core_finance_voucher_lines WHERE voucher_id = $1")
            .bind(voucher_id)
            .execute(&self.db_pool)
            .await?;

        sqlx::query(
            "UPDATE core_finance_vouchers SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2",
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
            sqlx::query_as("SELECT id, tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by, approved_by, posted_by, voucher_number, year, month, total_amount, currency_code, submitter_id, submitter_name, maker_id, maker_name, submitted_at, approver_id, approver_name, checker_id, checker_name, approved_at, poster_id, poster_name, bookkeeper_id, bookkeeper_name, posted_at, is_reversed, reverse_voucher_id, reversed_at, attachment_count, summary, source_module, source_id, template_id, updated_by, created_at, updated_at FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(voucher_id)
                .fetch_optional(&self.db_pool)
                .await?
                .ok_or_else(|| TopemsError::NotFound("凭证不存在".to_string()))?;

        if existing.status != VoucherStatus::Posted {
            return Err(TopemsError::ValidationFailed(
                "只有已过账的凭证才能反过账".to_string(),
            ));
        }

        sqlx::query("UPDATE core_finance_ledger SET deleted_at = NOW() WHERE tenant_id = $1 AND voucher_id = $2")
            .bind(tenant_id)
            .bind(voucher_id)
            .execute(&self.db_pool)
            .await?;

        let voucher = sqlx::query_as(
            "UPDATE core_finance_vouchers SET status = 'approved', posted_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1 AND id = $2 RETURNING *",
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
            "INSERT INTO core_finance_vouchers (tenant_id, voucher_no, voucher_date, period, voucher_type, total_debit, total_credit, status, description, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9)
             RETURNING *",
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
                "SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM core_finance_accounts WHERE tenant_id = $1 AND code = $2",
            )
            .bind(tenant_id)
            .bind(&line.account_code)
            .fetch_one(&mut *tx)
            .await?;

            let voucher_line: VoucherLine = sqlx::query_as(
                "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *",
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
            "SELECT COUNT(*) FROM core_finance_vouchers WHERE deleted_at IS NULL AND tenant_id = $1 AND voucher_no LIKE $2",
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
            "UPDATE core_finance_vouchers SET total_debit = $1, total_credit = $2, updated_at = NOW() WHERE id = $3",
        )
        .bind(total_debit)
        .bind(total_credit)
        .bind(voucher_id)
        .execute(&mut *tx)
        .await?;

        for (i, line) in lines.iter().enumerate() {
            let account: Account = sqlx::query_as(
                "SELECT id, tenant_id, code, name, parent_id, account_type, level, currency, is_enabled, description, name_en, full_name, balance_direction, type, parent_code, haschildren, is_cash_flow, enable_quantity, unit, enable_foreign_currency, default_currency, is_detail, status, created_by, updated_by, created_at, updated_at FROM core_finance_accounts WHERE tenant_id = $1 AND code = $2",
            )
            .bind(tenant_id)
            .bind(&line.account_code)
            .fetch_one(&mut *tx)
            .await?;

            sqlx::query(
                "INSERT INTO core_finance_voucher_lines (voucher_id, line_no, account_id, account_code, account_name, description, debit, credit, project_id, department_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
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
            .execute(&mut *tx)
            .await?;
        }

        Ok(())
    }
}
