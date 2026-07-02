use super::error::EventResult;
use super::event_types::{
    CrmContactCreatedPayload,
    // CRM Events
    CrmCustomerCreatedPayload,
    CrmCustomerUpdatedPayload,
    CrmInteractionRecordedPayload,
    CrmOpportunityCreatedPayload,
    CrmOpportunityStageChangedPayload,
    EhsAccidentReportedPayload,
    EhsHazardReportedPayload,
    ErpInventoryAdjustedPayload,
    ErpInvoiceGeneratedPayload,
    ErpPurchaseOrderApprovedPayload,
    ErpPurchaseOrderCreatedPayload,
    ErpSalesOrderCompletedPayload,
    // ERP Events
    ErpSalesOrderCreatedPayload,
    ErpSalesOrderUpdatedPayload,
    Event,
    EventType,
    FinanceAccountingPeriodClosedPayload,
    // Finance Events
    FinanceBillGeneratedPayload,
    FinanceBudgetApprovedPayload,
    FinanceJournalEntryCreatedPayload,
    FinancePaymentCompletedPayload,
    HrmDepartmentCreatedPayload,
    HrmDepartmentDeletedPayload,
    HrmDepartmentUpdatedPayload,
    HrmEmployeeCreatedPayload,
    LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload,
    LimsSampleRegisteredPayload,
    PmProjectCreatedPayload,
    PmProjectUpdatedPayload,
    PmTaskCreatedPayload,
    PmTaskDeletedPayload,
    PmTaskUpdatedPayload,
    QmsCorrectiveActionCreatedPayload,
    QmsInspectionCompletedPayload,
    ScmDeliveryAppointmentScheduledPayload,
    ScmGoodsReceivedPayload,
    ScmPurchaseContractSignedPayload,
    // SCM Events
    ScmSupplierAdmittedPayload,
    ScmSupplierUpdatedPayload,
};
use redis::Client;
use serde::Serialize;
use std::env;
use tracing::info;

/// Redis 事件发布者
pub struct EventPublisher {
    redis_client: Client,
    service_name: String,
}

impl EventPublisher {
    /// 创建新的事件发布者
    pub fn new(service_name: &str) -> EventResult<Self> {
        let redis_url =
            env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());

        let redis_client = Client::open(redis_url)?;

        Ok(Self {
            redis_client,
            service_name: service_name.to_string(),
        })
    }

    /// 发布事件
    pub async fn publish_event(
        &self,
        event_type: EventType,
        payload: impl Serialize,
    ) -> EventResult<()> {
        let payload_json = serde_json::to_value(&payload)?;
        let event = Event::new(event_type, &self.service_name, payload_json);

        let channel_name = format!("topems:events:{}", event_type);
        let event_json = serde_json::to_string(&event)?;

        let mut con = self.redis_client.get_multiplexed_async_connection().await?;

        let _: () = redis::cmd("PUBLISH")
            .arg(&channel_name)
            .arg(&event_json)
            .query_async(&mut con)
            .await?;

        info!(
            "事件发布成功 - 类型: {:?}, 事件ID: {}, 频道: {}",
            event_type, event.event_id, channel_name
        );

        Ok(())
    }

    /// 发布 HRM 员工创建事件
    pub async fn publish_hrm_employee_created(
        &self,
        employee_id: uuid::Uuid,
        name: &str,
        email: &str,
        department_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmEmployeeCreatedPayload {
            employee_id,
            name: name.to_string(),
            email: email.to_string(),
            department_id,
        };
        self.publish_event(EventType::HrmEmployeeCreated, payload)
            .await
    }

    /// 发布 PM 项目创建事件
    pub async fn publish_pm_project_created(
        &self,
        project_id: uuid::Uuid,
        project_name: &str,
        owner_id: uuid::Uuid,
    ) -> EventResult<()> {
        let payload = PmProjectCreatedPayload {
            project_id,
            project_name: project_name.to_string(),
            owner_id,
        };
        self.publish_event(EventType::PmProjectCreated, payload)
            .await
    }

    pub async fn publish_pm_project_updated(
        &self,
        project_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = PmProjectUpdatedPayload {
            project_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::PmProjectUpdated, payload)
            .await
    }

    pub async fn publish_pm_task_created(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        task_name: &str,
    ) -> EventResult<()> {
        let payload = PmTaskCreatedPayload {
            task_id,
            project_id,
            task_name: task_name.to_string(),
        };
        self.publish_event(EventType::PmTaskCreated, payload).await
    }

    pub async fn publish_pm_task_updated(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = PmTaskUpdatedPayload {
            task_id,
            project_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::PmTaskUpdated, payload).await
    }

    pub async fn publish_pm_task_deleted(
        &self,
        task_id: uuid::Uuid,
        project_id: uuid::Uuid,
        deleted_by: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = PmTaskDeletedPayload {
            task_id,
            project_id,
            deleted_by,
        };
        self.publish_event(EventType::PmTaskDeleted, payload).await
    }

    pub async fn publish_hrm_department_created(
        &self,
        department_id: uuid::Uuid,
        department_name: &str,
        parent_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentCreatedPayload {
            department_id,
            department_name: department_name.to_string(),
            parent_id,
        };
        self.publish_event(EventType::HrmDepartmentCreated, payload)
            .await
    }

    pub async fn publish_hrm_department_updated(
        &self,
        department_id: uuid::Uuid,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentUpdatedPayload {
            department_id,
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::HrmDepartmentUpdated, payload)
            .await
    }

    pub async fn publish_hrm_department_deleted(
        &self,
        department_id: uuid::Uuid,
        department_name: &str,
        deleted_by: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = HrmDepartmentDeletedPayload {
            department_id,
            department_name: department_name.to_string(),
            deleted_by,
        };
        self.publish_event(EventType::HrmDepartmentDeleted, payload)
            .await
    }

    // --- LIMS Events ---

    pub async fn publish_lims_sample_registered(
        &self,
        sample_id: uuid::Uuid,
        sample_no: &str,
        sample_name: &str,
        sample_type: Option<&str>,
        source: Option<&str>,
    ) -> EventResult<()> {
        let payload = LimsSampleRegisteredPayload {
            sample_id,
            sample_no: sample_no.to_string(),
            sample_name: sample_name.to_string(),
            sample_type: sample_type.map(|s| s.to_string()),
            source: source.map(|s| s.to_string()),
        };
        self.publish_event(EventType::LimsSampleRegistered, payload)
            .await
    }

    pub async fn publish_lims_inspection_result_submitted(
        &self,
        task_id: uuid::Uuid,
        task_no: &str,
        sample_id: uuid::Uuid,
        sample_no: &str,
        conclusion: &str,
        result: serde_json::Value,
        recorded_by: &str,
    ) -> EventResult<()> {
        let payload = LimsInspectionResultSubmittedPayload {
            task_id,
            task_no: task_no.to_string(),
            sample_id,
            sample_no: sample_no.to_string(),
            conclusion: conclusion.to_string(),
            result,
            recorded_by: recorded_by.to_string(),
        };
        self.publish_event(EventType::LimsInspectionResultSubmitted, payload)
            .await
    }

    pub async fn publish_lims_inspection_abnormal_detected(
        &self,
        task_id: uuid::Uuid,
        task_no: &str,
        sample_id: uuid::Uuid,
        sample_no: &str,
        test_item: &str,
        abnormal_data: serde_json::Value,
        conclusion: &str,
    ) -> EventResult<()> {
        let payload = LimsInspectionAbnormalDetectedPayload {
            task_id,
            task_no: task_no.to_string(),
            sample_id,
            sample_no: sample_no.to_string(),
            test_item: test_item.to_string(),
            abnormal_data,
            conclusion: conclusion.to_string(),
        };
        self.publish_event(EventType::LimsInspectionAbnormalDetected, payload)
            .await
    }

    // --- QMS Events ---

    pub async fn publish_qms_inspection_completed(
        &self,
        inspection_id: uuid::Uuid,
        inspection_no: &str,
        product_id: Option<uuid::Uuid>,
        product_name: Option<&str>,
        result: &str,
        qualification_rate: Option<f64>,
        inspector: &str,
    ) -> EventResult<()> {
        let payload = QmsInspectionCompletedPayload {
            inspection_id,
            inspection_no: inspection_no.to_string(),
            product_id,
            product_name: product_name.map(|s| s.to_string()),
            result: result.to_string(),
            qualification_rate,
            inspector: inspector.to_string(),
        };
        self.publish_event(EventType::QmsInspectionCompleted, payload)
            .await
    }

    pub async fn publish_qms_corrective_action_created(
        &self,
        action_id: uuid::Uuid,
        issue_id: uuid::Uuid,
        title: &str,
        description: Option<&str>,
        assigned_to: &str,
    ) -> EventResult<()> {
        let payload = QmsCorrectiveActionCreatedPayload {
            action_id,
            issue_id,
            title: title.to_string(),
            description: description.map(|s| s.to_string()),
            assigned_to: assigned_to.to_string(),
        };
        self.publish_event(EventType::QmsCorrectiveActionCreated, payload)
            .await
    }

    // --- EHS Events ---

    pub async fn publish_ehs_hazard_reported(
        &self,
        hazard_id: uuid::Uuid,
        hazard_no: &str,
        title: &str,
        category: &str,
        level: &str,
        location: Option<&str>,
        description: Option<&str>,
        reported_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = EhsHazardReportedPayload {
            hazard_id,
            hazard_no: hazard_no.to_string(),
            title: title.to_string(),
            category: category.to_string(),
            level: level.to_string(),
            location: location.map(|s| s.to_string()),
            description: description.map(|s| s.to_string()),
            reported_by: reported_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::EhsHazardReported, payload)
            .await
    }

    pub async fn publish_ehs_accident_reported(
        &self,
        accident_id: uuid::Uuid,
        accident_no: &str,
        title: &str,
        severity: &str,
        location: Option<&str>,
        occurred_at: Option<&str>,
    ) -> EventResult<()> {
        let payload = EhsAccidentReportedPayload {
            accident_id,
            accident_no: accident_no.to_string(),
            title: title.to_string(),
            severity: severity.to_string(),
            location: location.map(|s| s.to_string()),
            occurred_at: occurred_at.map(|s| s.to_string()),
        };
        self.publish_event(EventType::EhsAccidentReported, payload)
            .await
    }

    // --- ERP Events ---

    pub async fn publish_erp_sales_order_created(
        &self,
        order_id: uuid::Uuid,
        order_no: &str,
        customer_id: uuid::Uuid,
        customer_name: Option<&str>,
        total_amount: f64,
        currency: Option<&str>,
        created_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = ErpSalesOrderCreatedPayload {
            order_id,
            order_no: order_no.to_string(),
            customer_id,
            customer_name: customer_name.map(|s| s.to_string()),
            total_amount,
            currency: currency.map(|s| s.to_string()),
            created_by: created_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ErpSalesOrderCreated, payload)
            .await
    }

    pub async fn publish_erp_sales_order_updated(
        &self,
        order_id: uuid::Uuid,
        order_no: &str,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = ErpSalesOrderUpdatedPayload {
            order_id,
            order_no: order_no.to_string(),
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::ErpSalesOrderUpdated, payload)
            .await
    }

    pub async fn publish_erp_sales_order_completed(
        &self,
        order_id: uuid::Uuid,
        order_no: &str,
        completion_date: &str,
        delivered_quantity: f64,
        total_amount: f64,
    ) -> EventResult<()> {
        let payload = ErpSalesOrderCompletedPayload {
            order_id,
            order_no: order_no.to_string(),
            completion_date: completion_date.to_string(),
            delivered_quantity,
            total_amount,
        };
        self.publish_event(EventType::ErpSalesOrderCompleted, payload)
            .await
    }

    pub async fn publish_erp_purchase_order_created(
        &self,
        order_id: uuid::Uuid,
        order_no: &str,
        supplier_id: uuid::Uuid,
        supplier_name: Option<&str>,
        total_amount: f64,
        currency: Option<&str>,
        created_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = ErpPurchaseOrderCreatedPayload {
            order_id,
            order_no: order_no.to_string(),
            supplier_id,
            supplier_name: supplier_name.map(|s| s.to_string()),
            total_amount,
            currency: currency.map(|s| s.to_string()),
            created_by: created_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ErpPurchaseOrderCreated, payload)
            .await
    }

    pub async fn publish_erp_purchase_order_approved(
        &self,
        order_id: uuid::Uuid,
        order_no: &str,
        approved_by: uuid::Uuid,
        approved_at: &str,
        approval_status: &str,
    ) -> EventResult<()> {
        let payload = ErpPurchaseOrderApprovedPayload {
            order_id,
            order_no: order_no.to_string(),
            approved_by,
            approved_at: approved_at.to_string(),
            approval_status: approval_status.to_string(),
        };
        self.publish_event(EventType::ErpPurchaseOrderApproved, payload)
            .await
    }

    pub async fn publish_erp_inventory_adjusted(
        &self,
        adjustment_id: uuid::Uuid,
        warehouse_id: uuid::Uuid,
        product_id: uuid::Uuid,
        product_no: &str,
        adjustment_type: &str,
        quantity: i32,
        reason: Option<&str>,
        adjusted_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = ErpInventoryAdjustedPayload {
            adjustment_id,
            warehouse_id,
            product_id,
            product_no: product_no.to_string(),
            adjustment_type: adjustment_type.to_string(),
            quantity,
            reason: reason.map(|s| s.to_string()),
            adjusted_by: adjusted_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ErpInventoryAdjusted, payload)
            .await
    }

    pub async fn publish_erp_invoice_generated(
        &self,
        invoice_id: uuid::Uuid,
        invoice_no: &str,
        order_id: Option<uuid::Uuid>,
        order_no: Option<&str>,
        customer_id: uuid::Uuid,
        total_amount: f64,
        tax_amount: Option<f64>,
        currency: Option<&str>,
    ) -> EventResult<()> {
        let payload = ErpInvoiceGeneratedPayload {
            invoice_id,
            invoice_no: invoice_no.to_string(),
            order_id,
            order_no: order_no.map(|s| s.to_string()),
            customer_id,
            total_amount,
            tax_amount,
            currency: currency.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ErpInvoiceGenerated, payload)
            .await
    }

    // --- SCM Events ---

    pub async fn publish_scm_supplier_admitted(
        &self,
        supplier_id: uuid::Uuid,
        supplier_no: &str,
        supplier_name: &str,
        category: Option<&str>,
        qualification_level: Option<&str>,
        admitted_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = ScmSupplierAdmittedPayload {
            supplier_id,
            supplier_no: supplier_no.to_string(),
            supplier_name: supplier_name.to_string(),
            category: category.map(|s| s.to_string()),
            qualification_level: qualification_level.map(|s| s.to_string()),
            admitted_by: admitted_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ScmSupplierAdmitted, payload)
            .await
    }

    pub async fn publish_scm_supplier_updated(
        &self,
        supplier_id: uuid::Uuid,
        supplier_no: &str,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = ScmSupplierUpdatedPayload {
            supplier_id,
            supplier_no: supplier_no.to_string(),
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::ScmSupplierUpdated, payload)
            .await
    }

    pub async fn publish_scm_purchase_contract_signed(
        &self,
        contract_id: uuid::Uuid,
        contract_no: &str,
        supplier_id: uuid::Uuid,
        supplier_name: Option<&str>,
        contract_amount: f64,
        effective_date: &str,
        expiry_date: Option<&str>,
        signed_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = ScmPurchaseContractSignedPayload {
            contract_id,
            contract_no: contract_no.to_string(),
            supplier_id,
            supplier_name: supplier_name.map(|s| s.to_string()),
            contract_amount,
            effective_date: effective_date.to_string(),
            expiry_date: expiry_date.map(|s| s.to_string()),
            signed_by: signed_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ScmPurchaseContractSigned, payload)
            .await
    }

    pub async fn publish_scm_delivery_appointment_scheduled(
        &self,
        appointment_id: uuid::Uuid,
        appointment_no: &str,
        supplier_id: uuid::Uuid,
        warehouse_id: uuid::Uuid,
        scheduled_date: &str,
        expected_quantity: i32,
        product_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = ScmDeliveryAppointmentScheduledPayload {
            appointment_id,
            appointment_no: appointment_no.to_string(),
            supplier_id,
            warehouse_id,
            scheduled_date: scheduled_date.to_string(),
            expected_quantity,
            product_id,
        };
        self.publish_event(EventType::ScmDeliveryAppointmentScheduled, payload)
            .await
    }

    pub async fn publish_scm_goods_received(
        &self,
        receipt_id: uuid::Uuid,
        receipt_no: &str,
        warehouse_id: uuid::Uuid,
        supplier_id: uuid::Uuid,
        product_id: uuid::Uuid,
        product_no: &str,
        received_quantity: i32,
        quality_status: Option<&str>,
        received_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = ScmGoodsReceivedPayload {
            receipt_id,
            receipt_no: receipt_no.to_string(),
            warehouse_id,
            supplier_id,
            product_id,
            product_no: product_no.to_string(),
            received_quantity,
            quality_status: quality_status.map(|s| s.to_string()),
            received_by: received_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::ScmGoodsReceived, payload)
            .await
    }

    // --- CRM Events ---

    pub async fn publish_crm_customer_created(
        &self,
        customer_id: uuid::Uuid,
        customer_no: &str,
        customer_name: &str,
        customer_type: Option<&str>,
        industry: Option<&str>,
        contact_name: Option<&str>,
        contact_email: Option<&str>,
        created_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = CrmCustomerCreatedPayload {
            customer_id,
            customer_no: customer_no.to_string(),
            customer_name: customer_name.to_string(),
            customer_type: customer_type.map(|s| s.to_string()),
            industry: industry.map(|s| s.to_string()),
            contact_name: contact_name.map(|s| s.to_string()),
            contact_email: contact_email.map(|s| s.to_string()),
            created_by: created_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::CrmCustomerCreated, payload)
            .await
    }

    pub async fn publish_crm_customer_updated(
        &self,
        customer_id: uuid::Uuid,
        customer_no: &str,
        updated_fields: Vec<String>,
        old_data: Option<serde_json::Value>,
        new_data: Option<serde_json::Value>,
    ) -> EventResult<()> {
        let payload = CrmCustomerUpdatedPayload {
            customer_id,
            customer_no: customer_no.to_string(),
            updated_fields,
            old_data,
            new_data,
        };
        self.publish_event(EventType::CrmCustomerUpdated, payload)
            .await
    }

    pub async fn publish_crm_opportunity_created(
        &self,
        opportunity_id: uuid::Uuid,
        opportunity_no: &str,
        opportunity_name: &str,
        customer_id: uuid::Uuid,
        customer_name: Option<&str>,
        estimated_amount: Option<f64>,
        stage: &str,
        probability: Option<f64>,
        owner_id: Option<uuid::Uuid>,
    ) -> EventResult<()> {
        let payload = CrmOpportunityCreatedPayload {
            opportunity_id,
            opportunity_no: opportunity_no.to_string(),
            opportunity_name: opportunity_name.to_string(),
            customer_id,
            customer_name: customer_name.map(|s| s.to_string()),
            estimated_amount,
            stage: stage.to_string(),
            probability,
            owner_id,
        };
        self.publish_event(EventType::CrmOpportunityCreated, payload)
            .await
    }

    pub async fn publish_crm_opportunity_stage_changed(
        &self,
        opportunity_id: uuid::Uuid,
        opportunity_no: &str,
        old_stage: &str,
        new_stage: &str,
        changed_by: Option<&str>,
        changed_at: &str,
    ) -> EventResult<()> {
        let payload = CrmOpportunityStageChangedPayload {
            opportunity_id,
            opportunity_no: opportunity_no.to_string(),
            old_stage: old_stage.to_string(),
            new_stage: new_stage.to_string(),
            changed_by: changed_by.map(|s| s.to_string()),
            changed_at: changed_at.to_string(),
        };
        self.publish_event(EventType::CrmOpportunityStageChanged, payload)
            .await
    }

    pub async fn publish_crm_contact_created(
        &self,
        contact_id: uuid::Uuid,
        contact_name: &str,
        customer_id: Option<uuid::Uuid>,
        customer_name: Option<&str>,
        email: Option<&str>,
        phone: Option<&str>,
        position: Option<&str>,
    ) -> EventResult<()> {
        let payload = CrmContactCreatedPayload {
            contact_id,
            contact_name: contact_name.to_string(),
            customer_id,
            customer_name: customer_name.map(|s| s.to_string()),
            email: email.map(|s| s.to_string()),
            phone: phone.map(|s| s.to_string()),
            position: position.map(|s| s.to_string()),
        };
        self.publish_event(EventType::CrmContactCreated, payload)
            .await
    }

    pub async fn publish_crm_interaction_recorded(
        &self,
        interaction_id: uuid::Uuid,
        customer_id: uuid::Uuid,
        customer_name: Option<&str>,
        contact_id: Option<uuid::Uuid>,
        interaction_type: &str,
        subject: &str,
        content: Option<&str>,
        interaction_date: &str,
        recorded_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = CrmInteractionRecordedPayload {
            interaction_id,
            customer_id,
            customer_name: customer_name.map(|s| s.to_string()),
            contact_id,
            interaction_type: interaction_type.to_string(),
            subject: subject.to_string(),
            content: content.map(|s| s.to_string()),
            interaction_date: interaction_date.to_string(),
            recorded_by: recorded_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::CrmInteractionRecorded, payload)
            .await
    }

    // --- Finance Events ---

    pub async fn publish_finance_bill_generated(
        &self,
        bill_id: uuid::Uuid,
        bill_no: &str,
        bill_type: &str,
        amount: f64,
        currency: Option<&str>,
        due_date: Option<&str>,
        related_order_id: Option<uuid::Uuid>,
        generated_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = FinanceBillGeneratedPayload {
            bill_id,
            bill_no: bill_no.to_string(),
            bill_type: bill_type.to_string(),
            amount,
            currency: currency.map(|s| s.to_string()),
            due_date: due_date.map(|s| s.to_string()),
            related_order_id,
            generated_by: generated_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::FinanceBillGenerated, payload)
            .await
    }

    pub async fn publish_finance_payment_completed(
        &self,
        payment_id: uuid::Uuid,
        payment_no: &str,
        bill_id: uuid::Uuid,
        bill_no: &str,
        amount: f64,
        currency: Option<&str>,
        payment_method: &str,
        paid_at: &str,
        paid_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = FinancePaymentCompletedPayload {
            payment_id,
            payment_no: payment_no.to_string(),
            bill_id,
            bill_no: bill_no.to_string(),
            amount,
            currency: currency.map(|s| s.to_string()),
            payment_method: payment_method.to_string(),
            paid_at: paid_at.to_string(),
            paid_by: paid_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::FinancePaymentCompleted, payload)
            .await
    }

    pub async fn publish_finance_budget_approved(
        &self,
        budget_id: uuid::Uuid,
        budget_no: &str,
        department_id: Option<uuid::Uuid>,
        department_name: Option<&str>,
        fiscal_year: &str,
        total_amount: f64,
        currency: Option<&str>,
        approved_by: uuid::Uuid,
        approved_at: &str,
    ) -> EventResult<()> {
        let payload = FinanceBudgetApprovedPayload {
            budget_id,
            budget_no: budget_no.to_string(),
            department_id,
            department_name: department_name.map(|s| s.to_string()),
            fiscal_year: fiscal_year.to_string(),
            total_amount,
            currency: currency.map(|s| s.to_string()),
            approved_by,
            approved_at: approved_at.to_string(),
        };
        self.publish_event(EventType::FinanceBudgetApproved, payload)
            .await
    }

    pub async fn publish_finance_accounting_period_closed(
        &self,
        period_id: uuid::Uuid,
        period_name: &str,
        start_date: &str,
        end_date: &str,
        fiscal_year: &str,
        closed_by: Option<&str>,
        closed_at: &str,
    ) -> EventResult<()> {
        let payload = FinanceAccountingPeriodClosedPayload {
            period_id,
            period_name: period_name.to_string(),
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
            fiscal_year: fiscal_year.to_string(),
            closed_by: closed_by.map(|s| s.to_string()),
            closed_at: closed_at.to_string(),
        };
        self.publish_event(EventType::FinanceAccountingPeriodClosed, payload)
            .await
    }

    pub async fn publish_finance_journal_entry_created(
        &self,
        entry_id: uuid::Uuid,
        entry_no: &str,
        period_id: Option<uuid::Uuid>,
        period_name: Option<&str>,
        entry_type: &str,
        total_debit: f64,
        total_credit: f64,
        currency: Option<&str>,
        description: Option<&str>,
        created_by: Option<&str>,
    ) -> EventResult<()> {
        let payload = FinanceJournalEntryCreatedPayload {
            entry_id,
            entry_no: entry_no.to_string(),
            period_id,
            period_name: period_name.map(|s| s.to_string()),
            entry_type: entry_type.to_string(),
            total_debit,
            total_credit,
            currency: currency.map(|s| s.to_string()),
            description: description.map(|s| s.to_string()),
            created_by: created_by.map(|s| s.to_string()),
        };
        self.publish_event(EventType::FinanceJournalEntryCreated, payload)
            .await
    }
}
