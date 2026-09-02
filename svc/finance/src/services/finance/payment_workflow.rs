use rust_decimal::Decimal;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::super::super::models::*;
use topems_shared::error::TopemsError;
use topems_shared_service_client::service_client::CreateInstanceRequest;

use super::FinanceService;

impl FinanceService {
    pub async fn submit_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        submitted_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        tracing::info!(
            "开始提交付款单, payment_id={}, tenant_id={}, submitted_by={}",
            payment_id,
            tenant_id,
            submitted_by
        );

        let payment = sqlx::query_as::<_, Payment>(only_own_schema_query!(
            "finance",
            "SELECT * FROM public.core_finance_payments WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_one(&self.db_pool)
        .await?;

        tracing::info!(
            "查询付款单信息成功, payment_no={}, total_amount={}, supplier_name={}",
            payment.payment_no,
            payment.total_amount,
            payment.supplier_name.as_deref().unwrap_or("")
        );

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
        if voucher.status != VoucherStatus::Draft {
            tracing::warn!(
                "付款单状态校验失败, 当前状态={}, 期望状态=Draft",
                voucher.status
            );
            return Err(TopemsError::ValidationFailed(
                "仅草稿状态的付款单可提交".to_string(),
            ));
        }

        tracing::info!(
            "付款单状态校验通过, voucher_id={}, voucher_status={}",
            voucher.id,
            voucher.status
        );

        let workflow_id = self
            .get_approval_workflow(tenant_id, payment.total_amount)
            .await?;

        tracing::info!(
            "审批流程匹配完成, total_amount={}, matched_workflow_id={}",
            payment.total_amount,
            workflow_id
                .map(|id| id.to_string())
                .unwrap_or("None".to_string())
        );

        let _workflow_instance = if let Some(wf_id) = workflow_id {
            tracing::info!(
                "开始创建工作流实例, workflow_id={}, payment_no={}",
                wf_id,
                payment.payment_no
            );

            let request = CreateInstanceRequest {
                workflow_id: wf_id,
                title: format!("付款单审批: {}", payment.payment_no),
                variables: Some(serde_json::json!({
                    "payment_id": payment.id.to_string(),
                    "payment_no": payment.payment_no,
                    "amount": payment.total_amount.to_string(),
                    "supplier_name": payment.supplier_name,
                })),
            };

            match self.workflow_client.create_instance(request).await {
                Ok(instance) => {
                    tracing::info!(
                        "工作流实例创建成功, instance_id={}, workflow_id={}, title={}",
                        instance.id,
                        instance.workflow_id,
                        instance.title
                    );

                    sqlx::query(
                        only_own_schema_query!("finance", "INSERT INTO core_finance_payment_workflow (tenant_id, payment_id, workflow_id, workflow_instance_id, current_approver, current_level, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)"),
                    )
                    .bind(tenant_id)
                    .bind(payment_id)
                    .bind(wf_id)
                    .bind(instance.id)
                    .bind(submitted_by)
                    .bind(1)
                    .bind("pending")
                    .execute(&self.db_pool)
                    .await?;

                    tracing::info!(
                        "付款单工作流关联记录创建成功, payment_id={}, workflow_instance_id={}",
                        payment_id,
                        instance.id
                    );

                    Some(instance.id)
                }
                Err(e) => {
                    tracing::error!(
                        "工作流实例创建失败, payment_id={}, workflow_id={}, error={}",
                        payment_id,
                        wf_id,
                        e
                    );
                    tracing::warn!(
                        "工作流创建失败但继续提交付款单, 将使用默认审批流程, payment_id={}",
                        payment_id
                    );
                    None
                }
            }
        } else {
            tracing::info!(
                "未匹配到审批流程配置, 将使用默认审批流程, payment_id={}",
                payment_id
            );
            None
        };

        tracing::info!(
            "开始提交凭证, voucher_id={}, payment_id={}",
            payment.voucher_id,
            payment_id
        );
        self.submit_voucher(tenant_id, payment.voucher_id).await?;
        tracing::info!(
            "凭证提交成功, voucher_id={}, payment_id={}",
            payment.voucher_id,
            payment_id
        );

        let result = self.get_payment_response(tenant_id, payment_id).await;
        tracing::info!(
            "付款单提交流程完成, payment_id={}, payment_no={}",
            payment_id,
            payment.payment_no
        );

        result
    }

    pub(super) async fn get_approval_workflow(
        &self,
        tenant_id: Uuid,
        amount: Decimal,
    ) -> Result<Option<Uuid>, TopemsError> {
        let workflow_id: Option<Uuid> = sqlx::query_scalar(only_own_schema_query!(
            "finance",
            "SELECT workflow_id FROM core_finance_payment_approval_config
             WHERE tenant_id = $1 AND is_active = true AND amount_threshold <= $2
             AND (max_amount IS NULL OR max_amount > $2)
             ORDER BY priority DESC, amount_threshold DESC LIMIT 1"
        ))
        .bind(tenant_id)
        .bind(amount)
        .fetch_optional(&self.db_pool)
        .await?;

        Ok(workflow_id)
    }

    pub async fn approve_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        approved_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        tracing::info!(
            "开始审批付款单, payment_id={}, tenant_id={}, approved_by={}",
            payment_id,
            tenant_id,
            approved_by
        );

        let payment = sqlx::query_as::<_, Payment>(only_own_schema_query!(
            "finance",
            "SELECT * FROM public.core_finance_payments WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_one(&self.db_pool)
        .await?;

        tracing::info!(
            "查询付款单信息成功, payment_no={}, total_amount={}, supplier_name={}",
            payment.payment_no,
            payment.total_amount,
            payment.supplier_name.as_deref().unwrap_or("")
        );

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
        if voucher.status != VoucherStatus::Submitted {
            tracing::warn!(
                "付款单状态校验失败, 当前状态={}, 期望状态=Submitted",
                voucher.status
            );
            return Err(TopemsError::ValidationFailed(
                "仅待审批状态的付款单可审批".to_string(),
            ));
        }

        tracing::info!(
            "付款单状态校验通过, voucher_id={}, voucher_status={}",
            voucher.id,
            voucher.status
        );

        let workflow_instance_id: Option<Uuid> = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT workflow_instance_id FROM core_finance_payment_workflow WHERE tenant_id = $1 AND payment_id = $2"),
        )
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_optional(&self.db_pool)
        .await?;

        tracing::info!(
            "查询工作流实例关联, payment_id={}, workflow_instance_id={}",
            payment_id,
            workflow_instance_id
                .map(|id| id.to_string())
                .unwrap_or("None".to_string())
        );

        let mut workflow_approved = false;
        if let Some(instance_id) = workflow_instance_id {
            tracing::info!(
                "存在工作流实例, 开始调用工作流审批, instance_id={}, payment_no={}",
                instance_id,
                payment.payment_no
            );

            match self
                .workflow_client
                .approve_instance(instance_id, None)
                .await
            {
                Ok(instance) => {
                    tracing::info!(
                        "工作流审批调用成功, instance_id={}, workflow_id={}, status={}, current_node_id={}",
                        instance.id,
                        instance.workflow_id,
                        instance.status,
                        instance.current_node_id.as_deref().unwrap_or("None")
                    );

                    if instance.status == "approved" {
                        tracing::info!(
                            "工作流审批完全通过, instance_id={}, payment_id={}",
                            instance.id,
                            payment_id
                        );
                        workflow_approved = true;
                    } else {
                        tracing::info!(
                            "工作流审批进入下一节点, instance_id={}, current_status={}, payment_id={}",
                            instance.id,
                            instance.status,
                            payment_id
                        );
                    }

                    let instance_status = instance.status;
                    sqlx::query(
                        only_own_schema_query!("finance", "UPDATE core_finance_payment_workflow SET current_approver = $1, current_level = current_level + 1, status = $2, updated_at = NOW() WHERE tenant_id = $3 AND payment_id = $4"),
                    )
                    .bind(approved_by)
                    .bind(instance_status.clone())
                    .bind(tenant_id)
                    .bind(payment_id)
                    .execute(&self.db_pool)
                    .await?;

                    tracing::info!(
                        "付款单工作流关联记录更新成功, payment_id={}, current_approver={}, current_status={}",
                        payment_id,
                        approved_by,
                        instance_status
                    );
                }
                Err(e) => {
                    tracing::error!(
                        "工作流审批调用失败, instance_id={}, payment_id={}, error={}",
                        instance_id,
                        payment_id,
                        e
                    );
                    tracing::warn!(
                        "工作流审批失败但继续处理, 将使用默认审批逻辑, payment_id={}",
                        payment_id
                    );
                }
            }
        } else {
            tracing::info!(
                "未关联工作流实例, 使用默认审批逻辑, payment_id={}",
                payment_id
            );
            workflow_approved = true;
        }

        if workflow_approved {
            tracing::info!(
                "开始审批凭证, voucher_id={}, payment_id={}, approved_by={}",
                payment.voucher_id,
                payment_id,
                approved_by
            );
            self.approve_voucher(tenant_id, payment.voucher_id, approved_by)
                .await?;
            tracing::info!(
                "凭证审批成功, voucher_id={}, payment_id={}",
                payment.voucher_id,
                payment_id
            );

            sqlx::query(
                only_own_schema_query!("finance", "UPDATE public.core_finance_payments SET approved_by = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3"),
            )
            .bind(approved_by)
            .bind(tenant_id)
            .bind(payment_id)
            .execute(&self.db_pool)
            .await?;

            tracing::info!(
                "付款单审批信息更新成功, payment_id={}, approved_by={}",
                payment_id,
                approved_by
            );
        } else {
            tracing::info!(
                "工作流未完全通过, 等待下一审批节点, payment_id={}, payment_no={}",
                payment_id,
                payment.payment_no
            );
        }

        let result = self.get_payment_response(tenant_id, payment_id).await;
        tracing::info!(
            "付款单审批流程完成, payment_id={}, payment_no={}, workflow_approved={}",
            payment_id,
            payment.payment_no,
            workflow_approved
        );

        result
    }

    pub async fn reject_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        rejected_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        tracing::info!(
            "开始拒绝付款单, payment_id={}, tenant_id={}, rejected_by={}",
            payment_id,
            tenant_id,
            rejected_by
        );

        let payment = sqlx::query_as::<_, Payment>(only_own_schema_query!(
            "finance",
            "SELECT * FROM public.core_finance_payments WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_one(&self.db_pool)
        .await?;

        tracing::info!(
            "查询付款单信息成功, payment_no={}, total_amount={}, supplier_name={}",
            payment.payment_no,
            payment.total_amount,
            payment.supplier_name.as_deref().unwrap_or("")
        );

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
        if voucher.status != VoucherStatus::Submitted {
            tracing::warn!(
                "付款单状态校验失败, 当前状态={}, 期望状态=Submitted",
                voucher.status
            );
            return Err(TopemsError::ValidationFailed(
                "仅待审批状态的付款单可拒绝".to_string(),
            ));
        }

        tracing::info!(
            "付款单状态校验通过, voucher_id={}, voucher_status={}",
            voucher.id,
            voucher.status
        );

        let workflow_instance_id: Option<Uuid> = sqlx::query_scalar(
            only_own_schema_query!("finance", "SELECT workflow_instance_id FROM core_finance_payment_workflow WHERE tenant_id = $1 AND payment_id = $2"),
        )
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_optional(&self.db_pool)
        .await?;

        tracing::info!(
            "查询工作流实例关联, payment_id={}, workflow_instance_id={}",
            payment_id,
            workflow_instance_id
                .map(|id| id.to_string())
                .unwrap_or("None".to_string())
        );

        if let Some(instance_id) = workflow_instance_id {
            tracing::info!(
                "存在工作流实例, 开始调用工作流拒绝, instance_id={}, payment_no={}",
                instance_id,
                payment.payment_no
            );

            match self
                .workflow_client
                .reject_instance(instance_id, None)
                .await
            {
                Ok(instance) => {
                    tracing::info!(
                        "工作流拒绝调用成功, instance_id={}, workflow_id={}, status={}",
                        instance.id,
                        instance.workflow_id,
                        instance.status
                    );

                    let instance_status = instance.status;
                    sqlx::query(
                        only_own_schema_query!("finance", "UPDATE core_finance_payment_workflow SET current_approver = $1, status = $2, updated_at = NOW() WHERE tenant_id = $3 AND payment_id = $4"),
                    )
                    .bind(rejected_by)
                    .bind(instance_status.clone())
                    .bind(tenant_id)
                    .bind(payment_id)
                    .execute(&self.db_pool)
                    .await?;

                    tracing::info!(
                        "付款单工作流关联记录更新成功, payment_id={}, current_approver={}, current_status={}",
                        payment_id,
                        rejected_by,
                        instance_status
                    );
                }
                Err(e) => {
                    tracing::error!(
                        "工作流拒绝调用失败, instance_id={}, payment_id={}, error={}",
                        instance_id,
                        payment_id,
                        e
                    );
                    tracing::warn!(
                        "工作流拒绝失败但继续处理, 将使用默认拒绝逻辑, payment_id={}",
                        payment_id
                    );
                }
            }
        }

        tracing::info!(
            "开始拒绝凭证, voucher_id={}, payment_id={}, rejected_by={}",
            payment.voucher_id,
            payment_id,
            rejected_by
        );
        self.reject_voucher(tenant_id, payment.voucher_id, rejected_by)
            .await?;
        tracing::info!(
            "凭证拒绝成功, voucher_id={}, payment_id={}",
            payment.voucher_id,
            payment_id
        );

        let result = self.get_payment_response(tenant_id, payment_id).await;
        tracing::info!(
            "付款单拒绝流程完成, payment_id={}, payment_no={}",
            payment_id,
            payment.payment_no
        );

        result
    }

    pub async fn execute_payment(
        &self,
        tenant_id: Uuid,
        payment_id: Uuid,
        req: ExecutePaymentRequest,
        executed_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        let payment = sqlx::query_as::<_, Payment>(only_own_schema_query!(
            "finance",
            "SELECT * FROM public.core_finance_payments WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(payment_id)
        .fetch_one(&self.db_pool)
        .await?;

        let voucher = self.get_voucher(tenant_id, payment.voucher_id).await?;
        if voucher.status != VoucherStatus::Approved {
            return Err(TopemsError::ValidationFailed(
                "仅已审批状态的付款单可执行付款".to_string(),
            ));
        }

        sqlx::query(
            only_own_schema_query!("finance", "UPDATE public.core_finance_payments SET actual_payment_date = $1, bank_transaction_no = $2, executed_by = $3, executed_at = NOW(), updated_at = NOW() WHERE tenant_id = $4 AND id = $5"),
        )
        .bind(req.actual_payment_date)
        .bind(&req.bank_transaction_no)
        .bind(executed_by)
        .bind(tenant_id)
        .bind(payment_id)
        .execute(&self.db_pool)
        .await?;

        self.get_payment_response(tenant_id, payment_id).await
    }

    pub async fn write_off_payment_item(
        &self,
        tenant_id: Uuid,
        item_id: Uuid,
        write_off_amount: Decimal,
        write_off_by: &str,
    ) -> Result<PaymentResponse, TopemsError> {
        let item: PaymentItem = sqlx::query_as::<_, PaymentItem>(only_own_schema_query!(
            "finance",
            "SELECT * FROM core_finance_payment_items WHERE tenant_id = $1 AND id = $2"
        ))
        .bind(tenant_id)
        .bind(item_id)
        .fetch_one(&self.db_pool)
        .await?;

        if write_off_amount > item.payment_amount {
            return Err(TopemsError::ValidationFailed(
                "核销金额不能超过付款金额".to_string(),
            ));
        }

        let payment_id = item.payment_id;

        sqlx::query(
            only_own_schema_query!("finance", "UPDATE core_finance_payment_items SET write_off_amount = $1, write_off_status = 'completed', write_off_date = CURRENT_DATE, write_off_by = $2, remaining_amount = $3 WHERE tenant_id = $4 AND id = $5"),
        )
        .bind(write_off_amount)
        .bind(write_off_by)
        .bind(item.payable_amount - write_off_amount)
        .bind(tenant_id)
        .bind(item_id)
        .execute(&self.db_pool)
        .await?;

        self.get_payment_response(tenant_id, payment_id).await
    }
}
