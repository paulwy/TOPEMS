use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum EventType {
    HrmEmployeeCreated,
    HrmEmployeeUpdated,
    HrmEmployeeDeleted,
    HrmDepartmentCreated,
    HrmDepartmentUpdated,
    HrmDepartmentDeleted,

    PmProjectCreated,
    PmProjectUpdated,
    PmTaskCreated,
    PmTaskUpdated,
    PmTaskDeleted,

    // LIMS Events
    LimsSampleRegistered,
    LimsSampleUpdated,
    LimsInspectionTaskCreated,
    LimsInspectionTaskUpdated,
    LimsInspectionResultSubmitted,
    LimsInspectionAbnormalDetected,

    // QMS Events
    QmsInspectionCompleted,
    QmsCorrectiveActionCreated,
    QmsCorrectiveActionUpdated,
    QmsQualityIssueCreated,

    // EHS Events
    EhsHazardReported,
    EhsHazardRectified,
    EhsHazardVerified,
    EhsAccidentReported,
    EhsAccidentInvestigated,

    // LIMS Events Extended
    LimsRecordCompleted,
    LimsReagentAlert,

    // Integration Events
    QmsToLimsSyncTriggered,
    EhsToQmsTriggered,
    LimsToEhsTriggered,

    // ERP Events
    ErpSalesOrderCreated,
    ErpSalesOrderUpdated,
    ErpSalesOrderCompleted,
    ErpPurchaseOrderCreated,
    ErpPurchaseOrderApproved,
    ErpInventoryAdjusted,
    ErpInvoiceGenerated,

    // SCM Events
    ScmSupplierAdmitted,
    ScmSupplierUpdated,
    ScmPurchaseContractSigned,
    ScmDeliveryAppointmentScheduled,
    ScmGoodsReceived,

    // CRM Events
    CrmCustomerCreated,
    CrmCustomerUpdated,
    CrmOpportunityCreated,
    CrmOpportunityStageChanged,
    CrmContactCreated,
    CrmInteractionRecorded,

    // Finance Events
    FinanceBillGenerated,
    FinancePaymentCompleted,
    FinanceBudgetApproved,
    FinanceAccountingPeriodClosed,
    FinanceJournalEntryCreated,

    HealthCheck,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub event_id: Uuid,
    pub event_type: EventType,
    pub event_version: u32, // 事件版本号，默认为 1
    pub source: String,
    pub payload: serde_json::Value,
    pub occurred_at: DateTime<Utc>,
}

impl Event {
    pub fn new(event_type: EventType, source: &str, payload: serde_json::Value) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type,
            event_version: 1, // 默认版本 1
            source: source.to_string(),
            payload,
            occurred_at: Utc::now(),
        }
    }

    pub fn with_version(
        event_type: EventType,
        source: &str,
        payload: serde_json::Value,
        version: u32,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type,
            event_version: version,
            source: source.to_string(),
            payload,
            occurred_at: Utc::now(),
        }
    }
}

// --- HRM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployeeCreatedPayload {
    pub employee_id: Uuid,
    pub name: String,
    pub email: String,
    pub department_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmEmployeeUpdatedPayload {
    pub employee_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentCreatedPayload {
    pub department_id: Uuid,
    pub department_name: String,
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentUpdatedPayload {
    pub department_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HrmDepartmentDeletedPayload {
    pub department_id: Uuid,
    pub department_name: String,
    pub deleted_by: Option<Uuid>,
}

// --- PM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectCreatedPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub owner_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskCreatedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub task_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectUpdatedPayload {
    pub project_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskUpdatedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmTaskDeletedPayload {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub deleted_by: Option<Uuid>,
}

// --- LIMS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsSampleRegisteredPayload {
    pub sample_id: Uuid,
    pub sample_no: String,
    pub sample_name: String,
    pub sample_type: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsInspectionResultSubmittedPayload {
    pub task_id: Uuid,
    pub task_no: String,
    pub sample_id: Uuid,
    pub sample_no: String,
    pub conclusion: String,
    pub result: serde_json::Value,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsInspectionAbnormalDetectedPayload {
    pub task_id: Uuid,
    pub task_no: String,
    pub sample_id: Uuid,
    pub sample_no: String,
    pub test_item: String,
    pub abnormal_data: serde_json::Value,
    pub conclusion: String,
}

// --- QMS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QmsInspectionCompletedPayload {
    pub inspection_id: Uuid,
    pub inspection_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub result: String,
    pub qualification_rate: Option<f64>,
    pub inspector: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QmsCorrectiveActionCreatedPayload {
    pub action_id: Uuid,
    pub issue_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub assigned_to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QmsQualityIssueCreatedPayload {
    pub issue_id: Uuid,
    pub issue_no: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub created_by: Option<String>,
    pub related_inspection_id: Option<Uuid>,
}

// --- EHS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhsHazardReportedPayload {
    pub hazard_id: Uuid,
    pub hazard_no: String,
    pub title: String,
    pub category: String,
    pub level: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub reported_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EhsAccidentReportedPayload {
    pub accident_id: Uuid,
    pub accident_no: String,
    pub title: String,
    pub severity: String,
    pub location: Option<String>,
    pub occurred_at: Option<String>,
}

// --- LIMS Events Extended ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsRecordCompletedPayload {
    pub record_id: Uuid,
    pub record_no: String,
    pub task_id: Uuid,
    pub task_no: String,
    pub sample_id: Uuid,
    pub sample_no: String,
    pub conclusion: String,
    pub test_data: serde_json::Value,
    pub related_inspection_no: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimsReagentAlertPayload {
    pub reagent_id: Uuid,
    pub reagent_no: String,
    pub reagent_name: String,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub description: Option<String>,
    pub current_stock: Option<i32>,
    pub min_stock: Option<i32>,
    pub expiry_date: Option<String>,
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

// --- ERP Events Payloads ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpSalesOrderCreatedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub customer_id: Uuid,
    pub customer_name: Option<String>,
    pub total_amount: f64,
    pub currency: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpSalesOrderUpdatedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpSalesOrderCompletedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub completion_date: String,
    pub delivered_quantity: f64,
    pub total_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpPurchaseOrderCreatedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub total_amount: f64,
    pub currency: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpPurchaseOrderApprovedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub approved_by: Uuid,
    pub approved_at: String,
    pub approval_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpInventoryAdjustedPayload {
    pub adjustment_id: Uuid,
    pub warehouse_id: Uuid,
    pub product_id: Uuid,
    pub product_no: String,
    pub adjustment_type: String,
    pub quantity: i32,
    pub reason: Option<String>,
    pub adjusted_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErpInvoiceGeneratedPayload {
    pub invoice_id: Uuid,
    pub invoice_no: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub customer_id: Uuid,
    pub total_amount: f64,
    pub tax_amount: Option<f64>,
    pub currency: Option<String>,
}

// --- SCM Events Payloads ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmSupplierAdmittedPayload {
    pub supplier_id: Uuid,
    pub supplier_no: String,
    pub supplier_name: String,
    pub category: Option<String>,
    pub qualification_level: Option<String>,
    pub admitted_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmSupplierUpdatedPayload {
    pub supplier_id: Uuid,
    pub supplier_no: String,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmPurchaseContractSignedPayload {
    pub contract_id: Uuid,
    pub contract_no: String,
    pub supplier_id: Uuid,
    pub supplier_name: Option<String>,
    pub contract_amount: f64,
    pub effective_date: String,
    pub expiry_date: Option<String>,
    pub signed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmDeliveryAppointmentScheduledPayload {
    pub appointment_id: Uuid,
    pub appointment_no: String,
    pub supplier_id: Uuid,
    pub warehouse_id: Uuid,
    pub scheduled_date: String,
    pub expected_quantity: i32,
    pub product_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmGoodsReceivedPayload {
    pub receipt_id: Uuid,
    pub receipt_no: String,
    pub warehouse_id: Uuid,
    pub supplier_id: Uuid,
    pub product_id: Uuid,
    pub product_no: String,
    pub received_quantity: i32,
    pub quality_status: Option<String>,
    pub received_by: Option<String>,
}

// --- CRM Events Payloads ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrmCustomerCreatedPayload {
    pub customer_id: Uuid,
    pub customer_no: String,
    pub customer_name: String,
    pub customer_type: Option<String>,
    pub industry: Option<String>,
    pub contact_name: Option<String>,
    pub contact_email: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrmCustomerUpdatedPayload {
    pub customer_id: Uuid,
    pub customer_no: String,
    pub updated_fields: Vec<String>,
    pub old_data: Option<serde_json::Value>,
    pub new_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrmOpportunityCreatedPayload {
    pub opportunity_id: Uuid,
    pub opportunity_no: String,
    pub opportunity_name: String,
    pub customer_id: Uuid,
    pub customer_name: Option<String>,
    pub estimated_amount: Option<f64>,
    pub stage: String,
    pub probability: Option<f64>,
    pub owner_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrmOpportunityStageChangedPayload {
    pub opportunity_id: Uuid,
    pub opportunity_no: String,
    pub old_stage: String,
    pub new_stage: String,
    pub changed_by: Option<String>,
    pub changed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrmContactCreatedPayload {
    pub contact_id: Uuid,
    pub contact_name: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub position: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrmInteractionRecordedPayload {
    pub interaction_id: Uuid,
    pub customer_id: Uuid,
    pub customer_name: Option<String>,
    pub contact_id: Option<Uuid>,
    pub interaction_type: String,
    pub subject: String,
    pub content: Option<String>,
    pub interaction_date: String,
    pub recorded_by: Option<String>,
}

// --- Finance Events Payloads ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceBillGeneratedPayload {
    pub bill_id: Uuid,
    pub bill_no: String,
    pub bill_type: String,
    pub amount: f64,
    pub currency: Option<String>,
    pub due_date: Option<String>,
    pub related_order_id: Option<Uuid>,
    pub generated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancePaymentCompletedPayload {
    pub payment_id: Uuid,
    pub payment_no: String,
    pub bill_id: Uuid,
    pub bill_no: String,
    pub amount: f64,
    pub currency: Option<String>,
    pub payment_method: String,
    pub paid_at: String,
    pub paid_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceBudgetApprovedPayload {
    pub budget_id: Uuid,
    pub budget_no: String,
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub fiscal_year: String,
    pub total_amount: f64,
    pub currency: Option<String>,
    pub approved_by: Uuid,
    pub approved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceAccountingPeriodClosedPayload {
    pub period_id: Uuid,
    pub period_name: String,
    pub start_date: String,
    pub end_date: String,
    pub fiscal_year: String,
    pub closed_by: Option<String>,
    pub closed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceJournalEntryCreatedPayload {
    pub entry_id: Uuid,
    pub entry_no: String,
    pub period_id: Option<Uuid>,
    pub period_name: Option<String>,
    pub entry_type: String,
    pub total_debit: f64,
    pub total_credit: f64,
    pub currency: Option<String>,
    pub description: Option<String>,
    pub created_by: Option<String>,
}
