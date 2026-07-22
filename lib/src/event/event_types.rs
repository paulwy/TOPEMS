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

    // Permission Events
    PermissionChanged,
    PositionCreated,
    PositionUpdated,
    PositionDeleted,

    // ERP Sales Events
    SalesOrderCreated,
    SalesOrderApproved,
    PaymentReceived,

    // ERP Purchase Events
    PurchaseOrderCreated,
    PurchaseOrderApproved,
    PaymentMade,

    // MES Production Events
    ProductionOrderCreated,
    WorkOrderCompleted,
    MaterialConsumed,

    // WMS Inventory Events
    StockInbound,
    StockOutbound,
    StockAdjusted,
    InventoryUpdated,
    StockTransferred,
    StockTakeCompleted,

    // QMS Extended Events
    QualityIssueResolved,

    // HRM Extended Events
    EmployeeOnboarded,
    EmployeeOffboarded,

    // Workflow Events
    WorkflowStarted,
    WorkflowApproved,
    WorkflowRejected,

    // CRM Events
    CustomerCreated,
    AfterSalesTicketCreated,
    ReturnProcessed,
    ReturnCompleted,
    OpportunityWon,

    // PM Extended Events
    PmProjectCompleted,
    PmProjectSettled,

    // PDM Events
    PdmMaterialCreated,
    PdmMaterialUpdated,
    PdmBomCreated,
    PdmBomUpdated,
    PdmDocumentReleased,

    // SCM Events
    ScmPurchasePlanCreated,
    ScmSupplierEvaluated,
    ScmDemandForecastGenerated,
    ScmShipmentReceived,

    // SRM Events
    SrmSupplierRegistered,
    SrmSupplierApproved,
    SrmRfqCreated,
    SrmBidSubmitted,

    // RD Events
    RdProjectCreated,
    RdRequirementCreated,
    RdCodeCommit,
    RdReleaseCreated,

    // AI Events
    AiModelTrained,
    AiPredictionCompleted,
    AiImageAnalyzed,
    AiDocumentProcessed,

    // Finance Events
    FinanceInvoiceCreated,
    FinancePaymentMade,
    FinanceReceiptReceived,
    FinanceBudgetCreated,

    // GIS Events
    GisDataImported,
    GisLocationTracked,
    GisGeofenceTriggered,

    // Portal Events
    PortalNotificationPublished,
    PortalMenuUpdated,
    PortalPageCreated,

    // Doc Events
    DocDocumentUploaded,
    DocDocumentApproved,
    DocDocumentVersionCreated,

    HealthCheck,

    // 缓存基础设施事件（V20.0 跨层架构优化）
    CacheInvalidated,

    // 权限元数据变更事件（V21.0 统一权限中心）
    PermissionMetadataChanged,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub event_id: Uuid,
    pub event_type: EventType,
    pub source: String,
    pub payload: serde_json::Value,
    pub occurred_at: DateTime<Utc>,
    pub trace_id: Option<String>,
    // V20.0: Saga 事务上下文，用于分布式事务编排
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saga_id: Option<Uuid>,
    // V20.0: Saga 步骤标识，标识当前事件属于哪个 Saga 步骤
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saga_step_id: Option<Uuid>,
}

impl Event {
    pub fn new(event_type: EventType, source: &str, payload: serde_json::Value) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            event_type,
            source: source.to_string(),
            payload,
            occurred_at: Utc::now(),
            trace_id: None,
            saga_id: None,
            saga_step_id: None,
        }
    }

    pub fn with_trace_id(mut self, trace_id: Option<String>) -> Self {
        self.trace_id = trace_id;
        self
    }

    /// V20.0: 附加 Saga 事务上下文
    pub fn with_saga_context(mut self, saga_id: Uuid, step_id: Uuid) -> Self {
        self.saga_id = Some(saga_id);
        self.saga_step_id = Some(step_id);
        self
    }

    pub fn parse_payload<T: serde::de::DeserializeOwned>(&self) -> Result<T, String> {
        serde_json::from_value::<T>(self.payload.clone())
            .map_err(|e| format!("解析事件 payload 失败: {}", e))
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

// --- Permission Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionChangedPayload {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub permissions_added: Vec<String>,
    pub permissions_removed: Vec<String>,
    pub changed_at: DateTime<Utc>,
}

/// V21.0: 权限元数据变更事件
///
/// 当 IAM 服务的权限定义发生变更时（新增/修改/删除权限），
/// 通过此事件通知所有服务更新本地权限元数据缓存。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionMetadataChangedPayload {
    /// 变更类型：created / updated / deleted / bulk_imported
    pub change_type: String,
    /// 受影响的权限代码列表
    pub permission_codes: Vec<String>,
    /// 变更后的权限元数据（删除时为 None）
    pub metadata: Option<crate::permission::PermissionMetadata>,
    /// 变更操作人
    pub changed_by: Option<Uuid>,
    /// 变更时间
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionCreatedPayload {
    pub position_id: Uuid,
    pub tenant_id: Uuid,
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionUpdatedPayload {
    pub position_id: Uuid,
    pub tenant_id: Uuid,
    pub changes: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionDeletedPayload {
    pub position_id: Uuid,
    pub tenant_id: Uuid,
}

// --- PM Extended Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectCompletedPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub completed_by: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmProjectSettledPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub settled_amount: Option<f64>,
    pub settled_by: Option<String>,
    pub settled_at: Option<DateTime<Utc>>,
}

// --- ERP Sales Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderCreatedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub total_amount: Option<f64>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesOrderApprovedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub total_amount: Option<f64>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentReceivedPayload {
    pub payment_id: Uuid,
    pub payment_no: String,
    pub order_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub amount: f64,
    pub payment_method: Option<String>,
    pub received_at: Option<DateTime<Utc>>,
}

// --- ERP Purchase Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseOrderCreatedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub total_amount: Option<f64>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseOrderApprovedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub total_amount: Option<f64>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMadePayload {
    pub payment_id: Uuid,
    pub payment_no: String,
    pub order_id: Option<Uuid>,
    pub supplier_id: Option<Uuid>,
    pub amount: f64,
    pub payment_method: Option<String>,
    pub paid_at: Option<DateTime<Utc>>,
}

// --- MES Production Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionOrderCreatedPayload {
    pub order_id: Uuid,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<f64>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrderCompletedPayload {
    pub work_order_id: Uuid,
    pub work_order_no: String,
    pub production_order_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub completed_quantity: Option<f64>,
    pub completed_by: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialConsumedPayload {
    pub consumption_id: Uuid,
    pub work_order_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub consumed_at: Option<DateTime<Utc>>,
}

// --- WMS Inventory Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockInboundPayload {
    pub inbound_id: Uuid,
    pub inbound_no: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub material_id: Option<Uuid>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub reference_order_id: Option<Uuid>,
    pub received_by: Option<String>,
    pub received_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockOutboundPayload {
    pub outbound_id: Uuid,
    pub outbound_no: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub material_id: Option<Uuid>,
    pub material_name: Option<String>,
    pub quantity: f64,
    pub reference_order_id: Option<Uuid>,
    pub issued_by: Option<String>,
    pub issued_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockAdjustedPayload {
    pub adjustment_id: Uuid,
    pub warehouse_id: Option<Uuid>,
    pub material_id: Option<Uuid>,
    pub material_name: Option<String>,
    pub adjustment_quantity: f64,
    pub reason: Option<String>,
    pub adjusted_by: Option<String>,
    pub adjusted_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryUpdatedPayload {
    pub inventory_id: Uuid,
    pub warehouse_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub old_quantity: f64,
    pub new_quantity: f64,
    pub delta: f64,
    pub change_type: String, // create/update/delete
    pub changed_by: Uuid,
    pub changed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockTransferredPayload {
    pub transfer_id: Uuid,
    pub transfer_no: String,
    pub from_warehouse_id: Uuid,
    pub to_warehouse_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub quantity: f64,
    pub status: String, // shipped/received/completed
    pub transferred_by: Uuid,
    pub transferred_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockTakeCompletedPayload {
    pub stock_take_id: Uuid,
    pub stock_take_no: String,
    pub warehouse_id: Uuid,
    pub total_items: i64,
    pub counted_items: i64,
    pub discrepancy_items: i64,
    pub accuracy_rate: f64,
    pub completed_by: Uuid,
    pub completed_at: String,
}

// --- QMS Extended Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityIssueResolvedPayload {
    pub issue_id: Uuid,
    pub issue_no: String,
    pub title: String,
    pub resolution: Option<String>,
    pub resolved_by: Option<String>,
    pub resolved_at: Option<DateTime<Utc>>,
}

// --- HRM Extended Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeOnboardedPayload {
    pub employee_id: Uuid,
    pub name: String,
    pub email: String,
    pub employee_number: Option<String>,
    pub department_id: Option<Uuid>,
    pub position_id: Option<Uuid>,
    pub onboard_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmployeeOffboardedPayload {
    pub employee_id: Uuid,
    pub name: String,
    pub email: String,
    pub department_id: Option<Uuid>,
    pub offboard_date: Option<DateTime<Utc>>,
    pub reason: Option<String>,
}

// --- Workflow Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStartedPayload {
    pub workflow_id: Uuid,
    pub workflow_name: String,
    pub instance_id: Uuid,
    pub business_type: Option<String>,
    pub business_id: Option<Uuid>,
    pub business_key: Option<String>,
    pub started_by: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowApprovedPayload {
    pub workflow_id: Uuid,
    pub workflow_name: String,
    pub instance_id: Uuid,
    pub business_type: Option<String>,
    pub business_id: Option<Uuid>,
    pub business_key: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRejectedPayload {
    pub workflow_id: Uuid,
    pub workflow_name: String,
    pub instance_id: Uuid,
    pub business_type: Option<String>,
    pub business_id: Option<Uuid>,
    pub business_key: Option<String>,
    pub rejected_by: Option<String>,
    pub rejected_at: Option<DateTime<Utc>>,
    pub reject_reason: Option<String>,
}

// --- CRM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerCreatedPayload {
    pub customer_id: Uuid,
    pub customer_name: String,
    pub customer_code: Option<String>,
    pub customer_type: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub source: Option<String>,
    pub created_by: Option<Uuid>,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AfterSalesTicketCreatedPayload {
    pub ticket_id: Uuid,
    pub ticket_no: String,
    pub title: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub priority: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnProcessedPayload {
    pub return_id: Uuid,
    pub return_no: String,
    pub order_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub quantity: Option<f64>,
    pub status: String,
    pub processed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReturnCompletedPayload {
    pub return_id: Uuid,
    pub return_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub refund_amount: f64,
    pub return_type: String,
    pub status: String,
    pub completed_by: Option<Uuid>,
    pub completed_at: String,
    pub tenant_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpportunityWonPayload {
    pub opportunity_id: Uuid,
    pub opportunity_name: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub amount: Option<f64>,
    pub won_by: Option<String>,
    pub won_at: Option<DateTime<Utc>>,
}

// --- PDM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdmMaterialCreatedPayload {
    pub material_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub material_type: Option<String>,
    pub specification: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdmMaterialUpdatedPayload {
    pub material_id: Uuid,
    pub material_code: String,
    pub updates: serde_json::Value,
    pub updated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdmBomCreatedPayload {
    pub bom_id: Uuid,
    pub bom_code: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub version: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdmBomUpdatedPayload {
    pub bom_id: Uuid,
    pub bom_code: String,
    pub updates: serde_json::Value,
    pub updated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdmDocumentReleasedPayload {
    pub document_id: Uuid,
    pub document_no: String,
    pub document_name: String,
    pub version: Option<String>,
    pub released_by: Option<String>,
    pub released_at: Option<DateTime<Utc>>,
}

// --- SCM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmPurchasePlanCreatedPayload {
    pub plan_id: Uuid,
    pub plan_no: String,
    pub plan_name: String,
    pub period: Option<String>,
    pub total_amount: Option<f64>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmSupplierEvaluatedPayload {
    pub evaluation_id: Uuid,
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub score: Option<f64>,
    pub grade: Option<String>,
    pub evaluated_by: Option<String>,
    pub evaluated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmDemandForecastGeneratedPayload {
    pub forecast_id: Uuid,
    pub forecast_no: String,
    pub period: String,
    pub total_demand: Option<f64>,
    pub confidence: Option<f64>,
    pub generated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScmShipmentReceivedPayload {
    pub shipment_id: Uuid,
    pub shipment_no: String,
    pub supplier_id: Option<Uuid>,
    pub supplier_name: Option<String>,
    pub quantity: Option<f64>,
    pub received_by: Option<String>,
    pub received_at: Option<DateTime<Utc>>,
}

// --- SRM Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmSupplierRegisteredPayload {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub contact_person: Option<String>,
    pub contact_email: Option<String>,
    pub registered_by: Option<String>,
    pub registered_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmSupplierApprovedPayload {
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub approval_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmRfqCreatedPayload {
    pub rfq_id: Uuid,
    pub rfq_no: String,
    pub title: String,
    pub deadline: Option<DateTime<Utc>>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SrmBidSubmittedPayload {
    pub bid_id: Uuid,
    pub bid_no: String,
    pub rfq_id: Uuid,
    pub supplier_id: Uuid,
    pub supplier_name: String,
    pub amount: Option<f64>,
    pub submitted_at: Option<DateTime<Utc>>,
}

// --- RD Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RdProjectCreatedPayload {
    pub project_id: Uuid,
    pub project_name: String,
    pub project_code: Option<String>,
    pub owner_id: Option<Uuid>,
    pub owner_name: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RdRequirementCreatedPayload {
    pub requirement_id: Uuid,
    pub requirement_no: String,
    pub title: String,
    pub priority: Option<String>,
    pub project_id: Option<Uuid>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RdCodeCommitPayload {
    pub commit_id: String,
    pub repository: String,
    pub branch: String,
    pub message: String,
    pub author: Option<String>,
    pub committed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RdReleaseCreatedPayload {
    pub release_id: Uuid,
    pub release_no: String,
    pub version: String,
    pub project_id: Option<Uuid>,
    pub released_by: Option<String>,
    pub released_at: Option<DateTime<Utc>>,
}

// --- AI Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiModelTrainedPayload {
    pub model_id: Uuid,
    pub model_name: String,
    pub accuracy: Option<f64>,
    pub epochs: Option<i32>,
    pub trained_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiPredictionCompletedPayload {
    pub prediction_id: Uuid,
    pub model_id: Uuid,
    pub model_name: String,
    pub prediction_result: serde_json::Value,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiImageAnalyzedPayload {
    pub analysis_id: Uuid,
    pub image_url: Option<String>,
    pub analysis_result: serde_json::Value,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiDocumentProcessedPayload {
    pub process_id: Uuid,
    pub document_id: Option<Uuid>,
    pub document_name: Option<String>,
    pub process_type: Option<String>,
    pub extracted_data: serde_json::Value,
    pub processed_at: Option<DateTime<Utc>>,
}

// --- Finance Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceInvoiceCreatedPayload {
    pub invoice_id: Uuid,
    pub invoice_no: String,
    pub customer_id: Option<Uuid>,
    pub customer_name: Option<String>,
    pub amount: f64,
    pub invoice_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancePaymentMadePayload {
    pub payment_id: Uuid,
    pub payment_no: String,
    pub invoice_id: Option<Uuid>,
    pub amount: f64,
    pub paid_by: Option<String>,
    pub paid_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceReceiptReceivedPayload {
    pub receipt_id: Uuid,
    pub receipt_no: String,
    pub customer_id: Option<Uuid>,
    pub amount: f64,
    pub received_by: Option<String>,
    pub received_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinanceBudgetCreatedPayload {
    pub budget_id: Uuid,
    pub budget_no: String,
    pub budget_name: String,
    pub amount: f64,
    pub period: Option<String>,
    pub created_by: Option<String>,
}

// --- GIS Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GisDataImportedPayload {
    pub import_id: Uuid,
    pub data_type: String,
    pub record_count: Option<i32>,
    pub imported_by: Option<String>,
    pub imported_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GisLocationTrackedPayload {
    pub track_id: Uuid,
    pub asset_id: Option<Uuid>,
    pub asset_name: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub tracked_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GisGeofenceTriggeredPayload {
    pub geofence_id: Uuid,
    pub geofence_name: String,
    pub asset_id: Option<Uuid>,
    pub asset_name: Option<String>,
    pub trigger_type: String,
    pub triggered_at: Option<DateTime<Utc>>,
}

// --- Portal Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortalNotificationPublishedPayload {
    pub notification_id: Uuid,
    pub title: String,
    pub message: String,
    pub target_users: Vec<Uuid>,
    pub published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortalMenuUpdatedPayload {
    pub menu_id: Uuid,
    pub menu_name: String,
    pub updates: serde_json::Value,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortalPageCreatedPayload {
    pub page_id: Uuid,
    pub page_name: String,
    pub page_path: String,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

// --- Doc Events ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocDocumentUploadedPayload {
    pub document_id: Uuid,
    pub document_name: String,
    pub file_path: String,
    pub file_size: Option<u64>,
    pub uploaded_by: Option<String>,
    pub uploaded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocDocumentApprovedPayload {
    pub document_id: Uuid,
    pub document_name: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub approval_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocDocumentVersionCreatedPayload {
    pub document_id: Uuid,
    pub document_name: String,
    pub version: String,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

impl std::fmt::Display for EventType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

// --- V20.0: 缓存失效事件 ---
// 用于多实例部署下 L1 缓存的失效广播

/// 缓存失效事件 Payload
///
/// 当某个服务实例主动失效缓存时（如 update/delete 操作后），
/// 通过 RabbitMQ Fanout Exchange 广播到所有同服务实例，
/// 各实例收到事件后主动删除本地 L1 缓存对应条目，
/// 保证多实例 L1 缓存一致性。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheInvalidatedPayload {
    /// 发起失效的服务名称（如 "erp", "hrm"）
    pub source_service: String,
    /// 实例标识（hostname:pid），避免自身重复处理
    pub source_instance: String,
    /// 缓存键前缀，支持批量失效（如 "tenant_id:erp:dict:*"）
    pub cache_key_pattern: String,
    /// 失效级别：specific=精确键 / pattern=通配符匹配 / all=清空全部
    pub invalidation_level: String,
    /// 失效原因（如 "record_updated", "manual_flush"）
    pub reason: Option<String>,
    /// 失效发生时间
    pub invalidated_at: DateTime<Utc>,
}
