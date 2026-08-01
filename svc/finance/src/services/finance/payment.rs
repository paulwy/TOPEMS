use chrono::{Datelike, Utc};
use csv::Writer;
use rust_decimal::Decimal;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;

use super::FinanceService;

impl FinanceService {
    pub async fn create_payment(
        &self,
        tenant_id: Uuid,
        req: CreatePaymentRequest,
        created_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        let payment_date = req.payment_date.unwrap_or_else(|| Utc::now().date_naive());
        let voucher_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(
            payment_date
                .and_hms_opt(0, 0, 0)
                .expect("Failed to construct datetime from date"),
            Utc,
        );
        let period = format!("{:04}{:02}", payment_date.year(), payment_date.month());
        let currency = req.currency.unwrap_or_else(|| "CNY".to_string());

        self.check_period_open(tenant_id, period.clone()).await?;

        let total_amount: Decimal = req.items.iter().map(|i| i.payment_amount).sum();
        if (total_amount - req.total_amount).abs() > Decimal::new(1, 4) {
            return Err(TopemsError::ValidationFailed(
                "付款明细金额合计与总金额不一致".to_string(),
            ));
        }

        let mut tx = self.db_pool.begin().await?;

        let voucher_lines = vec![
            VoucherLineRequest {
                account_code: "2202".to_string(),
                description: Some(format!(
                    "付款-{}",
                    req.supplier_name.clone().unwrap_or_default()
                )),
                debit: total_amount,
                credit: Decimal::new(0, 0),
                project_id: None,
                department_id: None,
            },
            VoucherLineRequest {
                account_code: "1002".to_string(),
                description: Some(format!(
                    "付款-{}",
                    req.supplier_name.clone().unwrap_or_default()
                )),
                debit: Decimal::new(0, 0),
                credit: total_amount,
                project_id: None,
                department_id: None,
            },
        ];

        let voucher_req = CreateVoucherRequest {
            voucher_date,
            voucher_type: VoucherType::Payment,
            lines: voucher_lines,
            description: req.remark.clone(),
            template_id: None,
        };

        let voucher = self
            .create_voucher_with_tx(&mut tx, tenant_id, voucher_req, created_by)
            .await?;

        let payment_no = self.generate_payment_no(tenant_id).await?;

        let payment: Payment = sqlx::query_as(
            "INSERT INTO core_finance_payments (tenant_id, voucher_id, payment_no, supplier_id, supplier_name, payment_method, bank_account_id, bank_name, bank_account_no, total_amount, currency, payment_date, remark, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *",
        )
        .bind(tenant_id)
        .bind(voucher.id)
        .bind(&payment_no)
        .bind(req.supplier_id)
        .bind(&req.supplier_name)
        .bind(&req.payment_method)
        .bind(req.bank_account_id)
        .bind(&req.bank_name)
        .bind(&req.bank_account_no)
        .bind(req.total_amount)
        .bind(&currency)
        .bind(payment_date)
        .bind(&req.remark)
        .bind(created_by)
        .fetch_one(&mut *tx)
        .await?;

        let mut items = Vec::new();
        for (i, item) in req.items.iter().enumerate() {
            let payment_item: PaymentItem = sqlx::query_as(
                "INSERT INTO core_finance_payment_items (tenant_id, payment_id, line_no, invoice_id, invoice_no, payable_id, payable_amount, payment_amount, remark, remaining_amount)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *",
            )
            .bind(tenant_id)
            .bind(payment.id)
            .bind(i as i32 + 1)
            .bind(item.invoice_id)
            .bind(&item.invoice_no)
            .bind(item.payable_id)
            .bind(item.payable_amount)
            .bind(item.payment_amount)
            .bind(&item.remark)
            .bind(item.payable_amount - item.payment_amount)
            .fetch_one(&mut *tx)
            .await?;
            items.push(payment_item);
        }

        tx.commit().await?;

        Ok(PaymentResponse {
            id: payment.id,
            payment_no: payment.payment_no,
            supplier_id: payment.supplier_id,
            supplier_name: payment.supplier_name,
            payment_method: payment.payment_method,
            total_amount: payment.total_amount,
            currency: payment.currency,
            payment_date: payment.payment_date,
            actual_payment_date: payment.actual_payment_date,
            bank_transaction_no: payment.bank_transaction_no,
            executed_by: payment.executed_by,
            executed_at: payment.executed_at,
            status: voucher.status,
            remark: payment.remark,
            items,
            voucher_id: voucher.id,
            created_at: payment.created_at,
        })
    }

    pub async fn get_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<PaymentResponse, TopemsError> {
        let payment: Payment =
            sqlx::query_as("SELECT * FROM core_finance_payments WHERE tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(payment_id)
                .fetch_one(&self.db_pool)
                .await?;

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;

        let items: Vec<PaymentItem> = sqlx::query_as(
            "SELECT * FROM core_finance_payment_items WHERE tenant_id = $1 AND payment_id = $2 ORDER BY line_no",
        )
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(PaymentResponse {
            id: payment.id,
            payment_no: payment.payment_no,
            supplier_id: payment.supplier_id,
            supplier_name: payment.supplier_name,
            payment_method: payment.payment_method,
            total_amount: payment.total_amount,
            currency: payment.currency,
            payment_date: payment.payment_date,
            actual_payment_date: payment.actual_payment_date,
            bank_transaction_no: payment.bank_transaction_no,
            executed_by: payment.executed_by,
            executed_at: payment.executed_at,
            status: voucher.status,
            remark: payment.remark,
            items,
            voucher_id: payment.voucher_id,
            created_at: payment.created_at,
        })
    }

    pub async fn list_payments(
        &self,
        tenant_id: Uuid,
        params: PaymentQueryParams,
    ) -> Result<(Vec<PaymentResponse>, i64), TopemsError> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(20);
        let offset = (page - 1) * page_size;

        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM core_finance_payments WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&self.db_pool)
                .await?;

        let payments: Vec<Payment> = sqlx::query_as(
            "SELECT * FROM core_finance_payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(tenant_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.db_pool)
        .await?;

        let mut results = Vec::new();
        for payment in payments {
            let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
            results.push(PaymentResponse {
                id: payment.id,
                payment_no: payment.payment_no,
                supplier_id: payment.supplier_id,
                supplier_name: payment.supplier_name,
                payment_method: payment.payment_method,
                total_amount: payment.total_amount,
                currency: payment.currency,
                payment_date: payment.payment_date,
                actual_payment_date: payment.actual_payment_date,
                bank_transaction_no: payment.bank_transaction_no,
                executed_by: payment.executed_by,
                executed_at: payment.executed_at,
                status: voucher.status,
                remark: payment.remark,
                items: vec![],
                voucher_id: payment.voucher_id,
                created_at: payment.created_at,
            });
        }

        Ok((results, total.0))
    }

    pub(super) async fn get_payment_response(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<PaymentResponse, TopemsError> {
        let payment: Payment =
            sqlx::query_as("SELECT * FROM core_finance_payments WHERE tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(payment_id)
                .fetch_one(&self.db_pool)
                .await?;

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;

        let items: Vec<PaymentItem> = sqlx::query_as(
            "SELECT * FROM core_finance_payment_items WHERE tenant_id = $1 AND payment_id = $2 ORDER BY line_no",
        )
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_all(&self.db_pool)
        .await?;

        Ok(PaymentResponse {
            id: payment.id,
            payment_no: payment.payment_no,
            supplier_id: payment.supplier_id,
            supplier_name: payment.supplier_name,
            payment_method: payment.payment_method,
            total_amount: payment.total_amount,
            currency: payment.currency,
            payment_date: payment.payment_date,
            actual_payment_date: payment.actual_payment_date,
            bank_transaction_no: payment.bank_transaction_no,
            executed_by: payment.executed_by,
            executed_at: payment.executed_at,
            status: voucher.status,
            remark: payment.remark,
            items,
            voucher_id: payment.voucher_id,
            created_at: payment.created_at,
        })
    }

    pub async fn update_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        req: CreatePaymentRequest,
        updated_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        let payment: Payment =
            sqlx::query_as("SELECT * FROM core_finance_payments WHERE tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(payment_id)
                .fetch_one(&self.db_pool)
                .await?;

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
        if voucher.status != VoucherStatus::Draft {
            return Err(TopemsError::ValidationFailed(
                "仅草稿状态的付款单可编辑".to_string(),
            ));
        }

        let mut tx = self.db_pool.begin().await?;

        sqlx::query("DELETE FROM core_finance_voucher_lines WHERE voucher_id = $1")
            .bind(payment.voucher_id)
            .execute(&mut *tx)
            .await?;

        let total_amount: Decimal = req.items.iter().map(|i| i.payment_amount).sum();

        let voucher_lines = vec![
            VoucherLineRequest {
                account_code: "2202".to_string(),
                description: Some(format!(
                    "付款-{}",
                    req.supplier_name.clone().unwrap_or_default()
                )),
                debit: total_amount,
                credit: Decimal::new(0, 0),
                project_id: None,
                department_id: None,
            },
            VoucherLineRequest {
                account_code: "1002".to_string(),
                description: Some(format!(
                    "付款-{}",
                    req.supplier_name.clone().unwrap_or_default()
                )),
                debit: Decimal::new(0, 0),
                credit: total_amount,
                project_id: None,
                department_id: None,
            },
        ];

        self.update_voucher_lines_with_tx(
            &mut tx,
            tenant_id,
            payment.voucher_id,
            voucher_lines,
            updated_by,
        )
        .await?;

        sqlx::query(
            "UPDATE core_finance_payments SET supplier_id = $1, supplier_name = $2, payment_method = $3, bank_account_id = $4, bank_name = $5, bank_account_no = $6, total_amount = $7, remark = $8, updated_at = NOW() \
             WHERE tenant_id = $9 AND id = $10",
        )
        .bind(req.supplier_id)
        .bind(&req.supplier_name)
        .bind(&req.payment_method)
        .bind(req.bank_account_id)
        .bind(&req.bank_name)
        .bind(&req.bank_account_no)
        .bind(req.total_amount)
        .bind(&req.remark)
        .bind(tenant_id)
        .bind(payment_id)
        .execute(&mut *tx)
        .await?;

        sqlx::query("DELETE FROM core_finance_payment_items WHERE payment_id = $1")
            .bind(payment_id)
            .execute(&mut *tx)
            .await?;

        let mut items = Vec::new();
        for (i, item) in req.items.iter().enumerate() {
            let payment_item: PaymentItem = sqlx::query_as(
                "INSERT INTO core_finance_payment_items (tenant_id, payment_id, line_no, invoice_id, invoice_no, payable_amount, payment_amount, remark)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *",
            )
            .bind(tenant_id)
            .bind(payment_id)
            .bind(i as i32 + 1)
            .bind(item.invoice_id)
            .bind(&item.invoice_no)
            .bind(item.payable_amount)
            .bind(item.payment_amount)
            .bind(&item.remark)
            .fetch_one(&mut *tx)
            .await?;
            items.push(payment_item);
        }

        tx.commit().await?;

        self.get_payment(tenant_id, payment_id).await
    }

    pub async fn delete_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
    ) -> Result<(), TopemsError> {
        let payment: Payment =
            sqlx::query_as("SELECT * FROM core_finance_payments WHERE tenant_id = $1 AND id = $2")
                .bind(tenant_id)
                .bind(payment_id)
                .fetch_one(&self.db_pool)
                .await?;

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
        if voucher.status != VoucherStatus::Draft {
            return Err(TopemsError::ValidationFailed(
                "仅草稿状态的付款单可删除".to_string(),
            ));
        }

        sqlx::query("DELETE FROM core_finance_payments WHERE id = $1")
            .bind(payment_id)
            .execute(&self.db_pool)
            .await?;

        Ok(())
    }

    pub(super) async fn generate_payment_no(&self, tenant_id: Uuid) -> Result<String, TopemsError> {
        let today = Utc::now();
        let date_str = format!("{}{:02}{:02}", today.year(), today.month(), today.day());
        let prefix = format!("FK{}", date_str);

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM core_finance_payments WHERE tenant_id = $1 AND payment_no LIKE $2",
        )
        .bind(tenant_id)
        .bind(format!("{}%", prefix))
        .fetch_one(&self.db_pool)
        .await?;

        Ok(format!("{}{:04}", prefix, count.0 + 1))
    }

    pub async fn export_payments(
        &self,
        tenant_id: Uuid,
        req: ExportPaymentRequest,
    ) -> Result<ExportPaymentResponse, TopemsError> {
        tracing::info!(
            "开始导出付款单, tenant_id={}, format={}, status={}, start_date={}, end_date={}",
            tenant_id,
            req.format,
            req.status.as_deref().unwrap_or("None"),
            req.start_date.as_deref().unwrap_or("None"),
            req.end_date.as_deref().unwrap_or("None")
        );

        let mut query = "SELECT * FROM core_finance_payments WHERE tenant_id = $1".to_string();

        if let Some(status) = req.status {
            if !status.is_empty() {
                query.push_str(" AND status = $2");
            }
        }
        if let Some(start_date) = req.start_date {
            if !start_date.is_empty() {
                query.push_str(" AND payment_date >= $3");
            }
        }
        if let Some(end_date) = req.end_date {
            if !end_date.is_empty() {
                query.push_str(" AND payment_date <= $4");
            }
        }

        let rows = sqlx::query_as::<_, Payment>(&query)
            .bind(tenant_id)
            .fetch_all(&self.db_pool)
            .await?;

        tracing::info!("查询付款单数据成功, 共{}条记录", rows.len());

        let mut total_amount = Decimal::ZERO;
        let mut export_rows = Vec::new();

        for payment in rows {
            total_amount += payment.total_amount;

            let voucher = match self.get_voucher(tenant_id, payment.voucher_id).await {
                Ok(v) => v,
                Err(_) => {
                    tracing::warn!(
                        "无法获取付款单关联凭证, payment_id={}, voucher_id={}",
                        payment.id,
                        payment.voucher_id
                    );
                    continue;
                }
            };

            export_rows.push(serde_json::json!({
                "payment_no": payment.payment_no,
                "supplier_name": payment.supplier_name,
                "payment_method": payment.payment_method,
                "total_amount": payment.total_amount.to_string(),
                "currency": payment.currency,
                "payment_date": payment.payment_date.map(|d| d.to_string()),
                "actual_payment_date": payment.actual_payment_date.map(|d| d.to_string()),
                "bank_transaction_no": payment.bank_transaction_no,
                "status": voucher.status.to_string(),
                "created_at": payment.created_at.to_rfc3339(),
            }));
        }

        let total_count = export_rows.len();

        let file_data = match req.format {
            ExportFormat::Json => serde_json::to_string(&export_rows).map_err(|e| {
                TopemsError::Internal(format!("Failed to serialize export data: {}", e))
            })?,
            ExportFormat::Csv => {
                let mut wtr = Writer::from_writer(vec![]);
                wtr.write_record(&[
                    "付款单号",
                    "供应商",
                    "付款方式",
                    "金额",
                    "币种",
                    "付款日期",
                    "实际付款日期",
                    "银行流水号",
                    "状态",
                    "创建时间",
                ])
                .map_err(|e| TopemsError::Internal(format!("Failed to write CSV header: {}", e)))?;
                for row in &export_rows {
                    wtr.write_record(&[
                        row["payment_no"].as_str().unwrap_or(""),
                        row["supplier_name"].as_str().unwrap_or(""),
                        row["payment_method"].as_str().unwrap_or(""),
                        row["total_amount"].as_str().unwrap_or(""),
                        row["currency"].as_str().unwrap_or(""),
                        row["payment_date"].as_str().unwrap_or(""),
                        row["actual_payment_date"].as_str().unwrap_or(""),
                        row["bank_transaction_no"].as_str().unwrap_or(""),
                        row["status"].as_str().unwrap_or(""),
                        row["created_at"].as_str().unwrap_or(""),
                    ])
                    .map_err(|e| {
                        TopemsError::Internal(format!("Failed to write CSV row: {}", e))
                    })?;
                }
                String::from_utf8(wtr.into_inner().map_err(|e| {
                    TopemsError::Internal(format!("Failed to flush CSV writer: {}", e))
                })?)
                .map_err(|e| {
                    TopemsError::Internal(format!("Failed to convert CSV to string: {}", e))
                })?
            }
            _ => serde_json::to_string(&export_rows).map_err(|e| {
                TopemsError::Internal(format!("Failed to serialize export data: {}", e))
            })?,
        };

        let file_name = format!("payments_export_{}.{}", Utc::now().timestamp(), req.format);

        tracing::info!(
            "付款单导出完成, file_name={}, total_count={}, total_amount={}",
            file_name,
            total_count,
            total_amount
        );

        Ok(ExportPaymentResponse {
            file_name,
            format: req.format,
            total_count,
            total_amount,
            file_data,
            created_at: Utc::now(),
        })
    }
}
