//! Business Tools module for unified-core service.
//!
//! Provides unified business tools that connect to real services
//! (CRM, ERP, Finance, HR, MES, EHS, WMS, QMS, PM, LIMS, BI, APS,
//! CS, SCM, IoT, OA) via the shared-service-client.
//!
//! Each business tool wraps a specific service and provides
//! domain-specific operations with unified request/response handling.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use crate::shared::service_client::{ServiceClientError, ServiceRegistry, ServiceResponse};

// ===== Business Tool Errors =====

#[derive(Debug, Error)]
pub enum BusinessToolError {
    #[error("Tool not found: {0}")]
    ToolNotFound(String),

    #[error("Service client error: {0}")]
    ServiceClientError(#[from] ServiceClientError),

    #[error("Operation failed: {0}")]
    OperationFailed(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Not implemented: {0}")]
    NotImplemented(String),
}

// ===== Unified Business Request/Response =====

/// Unified request for all business tools.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessRequest {
    /// Unique request ID for tracing.
    #[serde(default = "default_request_id")]
    pub request_id: String,
    /// Tool name (e.g., "crm", "erp").
    pub tool: String,
    /// Operation name (e.g., "create_customer", "get_order").
    pub operation: String,
    /// Request parameters.
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,
    /// Request body data.
    #[serde(default)]
    pub data: Option<serde_json::Value>,
    /// Tenant ID for multi-tenant support.
    #[serde(default)]
    pub tenant_id: Option<String>,
    /// User ID for audit.
    #[serde(default)]
    pub user_id: Option<String>,
}

fn default_request_id() -> String {
    Uuid::new_v4().to_string()
}

impl BusinessRequest {
    /// Create a new business request.
    pub fn new(tool: impl Into<String>, operation: impl Into<String>) -> Self {
        Self {
            request_id: Uuid::new_v4().to_string(),
            tool: tool.into(),
            operation: operation.into(),
            params: HashMap::new(),
            data: None,
            tenant_id: None,
            user_id: None,
        }
    }

    /// Add a parameter.
    pub fn with_param(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.params.insert(key.into(), value);
        self
    }

    /// Set the request body data.
    pub fn with_data(mut self, data: serde_json::Value) -> Self {
        self.data = Some(data);
        self
    }

    /// Set the tenant ID.
    pub fn with_tenant(mut self, tenant_id: impl Into<String>) -> Self {
        self.tenant_id = Some(tenant_id.into());
        self
    }

    /// Set the user ID.
    pub fn with_user(mut self, user_id: impl Into<String>) -> Self {
        self.user_id = Some(user_id.into());
        self
    }
}

/// Unified response for all business tools.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessResponse<T = serde_json::Value> {
    /// Whether the operation was successful.
    pub success: bool,
    /// Tool name.
    pub tool: String,
    /// Operation name.
    pub operation: String,
    /// Request ID for tracing.
    pub request_id: String,
    /// Response data.
    pub data: Option<T>,
    /// Error message (if failed).
    pub error: Option<String>,
    /// Error code (if failed).
    pub error_code: Option<String>,
    /// Response time in milliseconds.
    pub duration_ms: u64,
    /// Metadata (pagination, etc.).
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

impl<T> BusinessResponse<T> {
    /// Create a successful response.
    pub fn success(
        tool: String,
        operation: String,
        request_id: String,
        data: T,
        duration_ms: u64,
    ) -> Self {
        Self {
            success: true,
            tool,
            operation,
            request_id,
            data: Some(data),
            error: None,
            error_code: None,
            duration_ms,
            metadata: HashMap::new(),
        }
    }

    /// Create an error response.
    pub fn error(
        tool: String,
        operation: String,
        request_id: String,
        message: String,
        error_code: Option<String>,
        duration_ms: u64,
    ) -> Self {
        Self {
            success: false,
            tool,
            operation,
            request_id,
            data: None,
            error: Some(message),
            error_code,
            duration_ms,
            metadata: HashMap::new(),
        }
    }

    /// Add metadata.
    pub fn with_metadata(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.metadata.insert(key.into(), value);
        self
    }
}

// ===== Business Tool Trait =====

/// Trait for all business tools.
#[async_trait]
pub trait BusinessTool: Send + Sync {
    /// Get the tool name.
    fn name(&self) -> &str;

    /// Get the tool description.
    fn description(&self) -> &str;

    /// Get the list of supported operations.
    fn operations(&self) -> Vec<String>;

    /// Execute an operation.
    async fn execute(
        &self,
        request: BusinessRequest,
    ) -> Result<BusinessResponse, BusinessToolError>;

    /// Check if the tool is healthy.
    async fn health_check(&self) -> Result<bool, BusinessToolError>;
}

// ===== Base Business Tool =====

/// Base implementation for business tools that use the service client.
pub struct BaseBusinessTool {
    name: String,
    description: String,
    service_name: String,
    operations: Vec<String>,
    service_registry: Arc<ServiceRegistry>,
}

impl BaseBusinessTool {
    /// Create a new base business tool.
    pub fn new(
        name: impl Into<String>,
        description: impl Into<String>,
        service_name: impl Into<String>,
        operations: Vec<String>,
        service_registry: Arc<ServiceRegistry>,
    ) -> Self {
        Self {
            name: name.into(),
            description: description.into(),
            service_name: service_name.into(),
            operations,
            service_registry,
        }
    }

    /// Get the service name.
    pub fn service_name(&self) -> &str {
        &self.service_name
    }

    /// Get the tool name.
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Get the tool description.
    pub fn description(&self) -> &str {
        &self.description
    }

    /// Get the service registry.
    pub fn service_registry(&self) -> &Arc<ServiceRegistry> {
        &self.service_registry
    }

    /// Execute a GET request to the underlying service.
    pub async fn get<T: serde::de::DeserializeOwned + Send + 'static>(
        &self,
        path: &str,
        query: Option<&HashMap<String, String>>,
    ) -> Result<ServiceResponse<T>, BusinessToolError> {
        let client = self
            .service_registry
            .get_client(&self.service_name)
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        let response = client
            .get::<T>(path, query)
            .await
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        Ok(response)
    }

    /// Execute a POST request to the underlying service.
    pub async fn post<T: serde::de::DeserializeOwned + Send + 'static, B: Serialize + Sync>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, BusinessToolError> {
        let client = self
            .service_registry
            .get_client(&self.service_name)
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        let response = client
            .post::<T, B>(path, body)
            .await
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        Ok(response)
    }

    /// Execute a PUT request to the underlying service.
    pub async fn put<T: serde::de::DeserializeOwned + Send + 'static, B: Serialize + Sync>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<ServiceResponse<T>, BusinessToolError> {
        let client = self
            .service_registry
            .get_client(&self.service_name)
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        let response = client
            .put::<T, B>(path, body)
            .await
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        Ok(response)
    }

    /// Execute a DELETE request to the underlying service.
    pub async fn delete<T: serde::de::DeserializeOwned + Send + 'static>(
        &self,
        path: &str,
    ) -> Result<ServiceResponse<T>, BusinessToolError> {
        let client = self
            .service_registry
            .get_client(&self.service_name)
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        let response = client
            .delete::<T>(path)
            .await
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        Ok(response)
    }
}

// ===== Business Tool Registry =====

/// Registry for managing multiple business tools.
#[derive(Clone)]
pub struct BusinessToolRegistry {
    tools: Arc<std::sync::Mutex<HashMap<String, Arc<dyn BusinessTool>>>>,
}

impl BusinessToolRegistry {
    /// Create a new empty business tool registry.
    pub fn new() -> Self {
        Self {
            tools: Arc::new(std::sync::Mutex::new(HashMap::new())),
        }
    }

    /// Register a business tool.
    pub fn register(&self, tool: Arc<dyn BusinessTool>) -> Result<(), BusinessToolError> {
        let mut tools = self
            .tools
            .lock()
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        tools.insert(tool.name().to_string(), tool);
        Ok(())
    }

    /// Get a business tool by name.
    pub fn get(&self, name: &str) -> Result<Arc<dyn BusinessTool>, BusinessToolError> {
        let tools = self
            .tools
            .lock()
            .map_err(|e| BusinessToolError::OperationFailed(e.to_string()))?;
        tools
            .get(name)
            .cloned()
            .ok_or_else(|| BusinessToolError::ToolNotFound(name.to_string()))
    }

    /// Check if a tool is registered.
    pub fn has(&self, name: &str) -> bool {
        let tools = self.tools.lock().unwrap();
        tools.contains_key(name)
    }

    /// Remove a tool from the registry.
    pub fn remove(&self, name: &str) -> Option<Arc<dyn BusinessTool>> {
        let mut tools = self.tools.lock().unwrap();
        tools.remove(name)
    }

    /// List all registered tool names.
    pub fn list(&self) -> Vec<String> {
        let tools = self.tools.lock().unwrap();
        tools.keys().cloned().collect()
    }

    /// Get the number of registered tools.
    pub fn count(&self) -> usize {
        let tools = self.tools.lock().unwrap();
        tools.len()
    }

    /// Execute a business request.
    pub async fn execute(
        &self,
        request: BusinessRequest,
    ) -> Result<BusinessResponse, BusinessToolError> {
        let tool = self.get(&request.tool)?;
        tool.execute(request).await
    }

    /// Run health checks on all tools.
    pub async fn health_check_all(&self) -> HashMap<String, bool> {
        let tools = {
            let tools = self.tools.lock().unwrap();
            tools.clone()
        };

        let mut results = HashMap::new();
        for (name, tool) in tools {
            let healthy = tool.health_check().await.unwrap_or(false);
            results.insert(name, healthy);
        }
        results
    }
}

impl Default for BusinessToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ===== Default Business Tools =====

/// Create default business tools for all services.
pub fn create_default_tools(service_registry: Arc<ServiceRegistry>) -> Vec<Arc<dyn BusinessTool>> {
    vec![
        // CRM - Customer Relationship Management
        Arc::new(CrmTool::new(service_registry.clone())),
        // ERP - Enterprise Resource Planning
        Arc::new(ErpTool::new(service_registry.clone())),
        // Finance
        Arc::new(FinanceTool::new(service_registry.clone())),
        // HR - Human Resources
        Arc::new(HrTool::new(service_registry.clone())),
        // MES - Manufacturing Execution System
        Arc::new(MesTool::new(service_registry.clone())),
        // EHS - Environment, Health & Safety
        Arc::new(EhsTool::new(service_registry.clone())),
        // WMS - Warehouse Management System
        Arc::new(WmsTool::new(service_registry.clone())),
        // QMS - Quality Management System
        Arc::new(QmsTool::new(service_registry.clone())),
        // PM - Project Management
        Arc::new(PmTool::new(service_registry.clone())),
        // LIMS - Laboratory Information Management System
        Arc::new(LimsTool::new(service_registry.clone())),
        // BI - Business Intelligence
        Arc::new(BiTool::new(service_registry.clone())),
        // APS - Advanced Planning & Scheduling
        Arc::new(ApsTool::new(service_registry.clone())),
        // CS - Customer Service
        Arc::new(CsTool::new(service_registry.clone())),
        // SCM - Supply Chain Management
        Arc::new(ScmTool::new(service_registry.clone())),
        // IoT - Internet of Things
        Arc::new(IotTool::new(service_registry.clone())),
        // OA - Office Automation
        Arc::new(OaTool::new(service_registry.clone())),
    ]
}

/// Create a business tool registry with all default tools.
pub fn create_default_registry(
    service_registry: Arc<ServiceRegistry>,
) -> Result<BusinessToolRegistry, BusinessToolError> {
    let registry = BusinessToolRegistry::new();
    for tool in create_default_tools(service_registry) {
        registry.register(tool)?;
    }
    Ok(registry)
}

// ===== Macro for generating business tools =====

macro_rules! define_business_tool {
    ($name:ident, $tool_name:expr, $service_name:expr, $description:expr, $operations:expr) => {
        pub struct $name {
            base: BaseBusinessTool,
        }

        impl $name {
            pub fn new(service_registry: Arc<ServiceRegistry>) -> Self {
                Self {
                    base: BaseBusinessTool::new(
                        $tool_name,
                        $description,
                        $service_name,
                        $operations.iter().map(|s| s.to_string()).collect(),
                        service_registry,
                    ),
                }
            }
        }

        #[async_trait]
        impl BusinessTool for $name {
            fn name(&self) -> &str {
                self.base.name()
            }

            fn description(&self) -> &str {
                self.base.description()
            }

            fn operations(&self) -> Vec<String> {
                self.base.operations.clone()
            }

            async fn execute(
                &self,
                request: BusinessRequest,
            ) -> Result<BusinessResponse, BusinessToolError> {
                let start = std::time::Instant::now();
                let tool_name = self.base.name().to_string();
                let operation = request.operation.clone();
                let request_id = request.request_id.clone();

                // Route operation to service endpoint
                let path = format!("/api/{}/{}", $service_name, operation);

                let result = if request.data.is_some() {
                    self.base
                        .post::<serde_json::Value, _>(&path, request.data.as_ref().unwrap())
                        .await
                } else {
                    let query: HashMap<String, String> = request
                        .params
                        .iter()
                        .map(|(k, v)| (k.clone(), v.to_string()))
                        .collect();
                    self.base
                        .get::<serde_json::Value>(&path, Some(&query))
                        .await
                };

                let duration_ms = start.elapsed().as_millis() as u64;

                match result {
                    Ok(service_response) => {
                        if service_response.success {
                            Ok(BusinessResponse::success(
                                tool_name,
                                operation,
                                request_id,
                                service_response.data.unwrap_or(serde_json::Value::Null),
                                duration_ms,
                            ))
                        } else {
                            Ok(BusinessResponse::error(
                                tool_name,
                                operation,
                                request_id,
                                service_response
                                    .error
                                    .unwrap_or_else(|| "Unknown error".to_string()),
                                Some(format!("SERVICE_{}", service_response.status)),
                                duration_ms,
                            ))
                        }
                    }
                    Err(e) => Ok(BusinessResponse::error(
                        tool_name,
                        operation,
                        request_id,
                        e.to_string(),
                        Some("CLIENT_ERROR".to_string()),
                        duration_ms,
                    )),
                }
            }

            async fn health_check(&self) -> Result<bool, BusinessToolError> {
                let result = self.base.get::<serde_json::Value>("/health", None).await;
                Ok(result.is_ok())
            }
        }
    };
}

// Define all business tools using the macro
define_business_tool!(
    CrmTool,
    "crm",
    "crm",
    "Customer Relationship Management - 客户关系管理",
    [
        "create_customer",
        "get_customer",
        "list_customers",
        "update_customer",
        "delete_customer",
        "create_lead",
        "get_lead",
        "list_leads",
        "create_opportunity",
        "get_opportunity",
        "list_opportunities"
    ]
);

define_business_tool!(
    ErpTool,
    "erp",
    "erp",
    "Enterprise Resource Planning - 企业资源计划",
    [
        "create_order",
        "get_order",
        "list_orders",
        "update_order",
        "delete_order",
        "create_product",
        "get_product",
        "list_products",
        "update_product",
        "delete_product",
        "create_inventory",
        "get_inventory",
        "list_inventory"
    ]
);

define_business_tool!(
    FinanceTool,
    "finance",
    "finance",
    "Financial Management - 财务管理",
    [
        "create_invoice",
        "get_invoice",
        "list_invoices",
        "update_invoice",
        "delete_invoice",
        "create_payment",
        "get_payment",
        "list_payments",
        "create_expense",
        "get_expense",
        "list_expenses",
        "get_financial_report"
    ]
);

define_business_tool!(
    HrTool,
    "hr",
    "hr",
    "Human Resources - 人力资源",
    [
        "create_employee",
        "get_employee",
        "list_employees",
        "update_employee",
        "delete_employee",
        "create_department",
        "get_department",
        "list_departments",
        "create_attendance",
        "get_attendance",
        "list_attendance",
        "create_leave",
        "get_leave",
        "list_leaves"
    ]
);

define_business_tool!(
    MesTool,
    "mes",
    "mes",
    "Manufacturing Execution System - 制造执行系统",
    [
        "create_work_order",
        "get_work_order",
        "list_work_orders",
        "update_work_order",
        "delete_work_order",
        "create_production",
        "get_production",
        "list_productions",
        "create_quality_check",
        "get_quality_check",
        "list_quality_checks",
        "get_oee_report"
    ]
);

define_business_tool!(
    EhsTool,
    "ehs",
    "ehs",
    "Environment, Health & Safety - 环境健康安全",
    [
        "create_incident",
        "get_incident",
        "list_incidents",
        "update_incident",
        "delete_incident",
        "create_audit",
        "get_audit",
        "list_audits",
        "create_training",
        "get_training",
        "list_trainings",
        "get_compliance_report"
    ]
);

define_business_tool!(
    WmsTool,
    "wms",
    "wms",
    "Warehouse Management System - 仓库管理系统",
    [
        "create_warehouse",
        "get_warehouse",
        "list_warehouses",
        "update_warehouse",
        "delete_warehouse",
        "create_inbound",
        "get_inbound",
        "list_inbounds",
        "create_outbound",
        "get_outbound",
        "list_outbounds",
        "get_stock",
        "list_stocks"
    ]
);

define_business_tool!(
    QmsTool,
    "qms",
    "qms",
    "Quality Management System - 质量管理系统",
    [
        "create_inspection",
        "get_inspection",
        "list_inspections",
        "update_inspection",
        "delete_inspection",
        "create_nonconformance",
        "get_nonconformance",
        "list_nonconformances",
        "create_capa",
        "get_capa",
        "list_capas",
        "get_quality_report"
    ]
);

define_business_tool!(
    PmTool,
    "pm",
    "pm",
    "Project Management - 项目管理",
    [
        "create_project",
        "get_project",
        "list_projects",
        "update_project",
        "delete_project",
        "create_task",
        "get_task",
        "list_tasks",
        "update_task",
        "delete_task",
        "create_milestone",
        "get_milestone",
        "list_milestones",
        "get_project_report"
    ]
);

define_business_tool!(
    LimsTool,
    "lims",
    "lims",
    "Laboratory Information Management System - 实验室信息管理",
    [
        "create_sample",
        "get_sample",
        "list_samples",
        "update_sample",
        "delete_sample",
        "create_test",
        "get_test",
        "list_tests",
        "create_result",
        "get_result",
        "list_results",
        "get_lab_report"
    ]
);

define_business_tool!(
    BiTool,
    "bi",
    "bi",
    "Business Intelligence - 商业智能",
    [
        "get_dashboard",
        "list_dashboards",
        "create_report",
        "get_report",
        "list_reports",
        "update_report",
        "delete_report",
        "get_kpi",
        "list_kpis",
        "get_analytics",
        "export_report"
    ]
);

define_business_tool!(
    ApsTool,
    "aps",
    "aps",
    "Advanced Planning & Scheduling - 高级计划与排程",
    [
        "create_plan",
        "get_plan",
        "list_plans",
        "update_plan",
        "delete_plan",
        "create_schedule",
        "get_schedule",
        "list_schedules",
        "update_schedule",
        "delete_schedule",
        "get_capacity",
        "get_gantt_chart"
    ]
);

define_business_tool!(
    CsTool,
    "cs",
    "cs",
    "Customer Service - 客户服务",
    [
        "create_ticket",
        "get_ticket",
        "list_tickets",
        "update_ticket",
        "delete_ticket",
        "create_response",
        "get_response",
        "list_responses",
        "get_knowledge_base",
        "search_knowledge_base",
        "get_sla_report"
    ]
);

define_business_tool!(
    ScmTool,
    "scm",
    "scm",
    "Supply Chain Management - 供应链管理",
    [
        "create_supplier",
        "get_supplier",
        "list_suppliers",
        "update_supplier",
        "delete_supplier",
        "create_purchase_order",
        "get_purchase_order",
        "list_purchase_orders",
        "create_shipment",
        "get_shipment",
        "list_shipments",
        "get_supply_chain_report"
    ]
);

define_business_tool!(
    IotTool,
    "iot",
    "iot",
    "Internet of Things - 物联网",
    [
        "create_device",
        "get_device",
        "list_devices",
        "update_device",
        "delete_device",
        "get_device_data",
        "list_device_data",
        "create_alert",
        "get_alert",
        "list_alerts",
        "get_sensor_reading",
        "list_sensor_readings"
    ]
);

define_business_tool!(
    OaTool,
    "oa",
    "oa",
    "Office Automation - 办公自动化",
    [
        "create_document",
        "get_document",
        "list_documents",
        "update_document",
        "delete_document",
        "create_approval",
        "get_approval",
        "list_approvals",
        "create_meeting",
        "get_meeting",
        "list_meetings",
        "create_notice",
        "get_notice",
        "list_notices"
    ]
);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_business_request_new() {
        let request = BusinessRequest::new("crm", "create_customer");
        assert_eq!(request.tool, "crm");
        assert_eq!(request.operation, "create_customer");
        assert!(!request.request_id.is_empty());
    }

    #[test]
    fn test_business_request_with_param() {
        let request =
            BusinessRequest::new("crm", "get_customer").with_param("id", serde_json::json!("123"));
        assert_eq!(request.params.get("id").unwrap(), "123");
    }

    #[test]
    fn test_business_response_success() {
        let response: BusinessResponse<serde_json::Value> = BusinessResponse::success(
            "crm".to_string(),
            "create_customer".to_string(),
            "req-123".to_string(),
            serde_json::json!({"id": "123"}),
            100,
        );
        assert!(response.success);
        assert_eq!(response.tool, "crm");
        assert_eq!(response.operation, "create_customer");
        assert_eq!(response.request_id, "req-123");
        assert_eq!(response.duration_ms, 100);
    }

    #[test]
    fn test_business_response_error() {
        let response: BusinessResponse<serde_json::Value> = BusinessResponse::error(
            "crm".to_string(),
            "create_customer".to_string(),
            "req-123".to_string(),
            "Invalid input".to_string(),
            Some("INVALID_INPUT".to_string()),
            50,
        );
        assert!(!response.success);
        assert_eq!(response.error.as_ref().unwrap(), "Invalid input");
        assert_eq!(response.error_code.as_ref().unwrap(), "INVALID_INPUT");
    }

    #[test]
    fn test_business_tool_registry_new() {
        let registry = BusinessToolRegistry::new();
        assert_eq!(registry.count(), 0);
        assert!(registry.list().is_empty());
    }

    #[test]
    fn test_default_tools_count() {
        let service_registry = Arc::new(ServiceRegistry::new());
        let tools = create_default_tools(service_registry);
        assert_eq!(tools.len(), 16);
    }
}
