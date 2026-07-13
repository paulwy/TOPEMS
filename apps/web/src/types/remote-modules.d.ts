declare module 'topems_core/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_core/pages/PermissionManagement' {
  const PermissionManagement: React.ComponentType;
  export default PermissionManagement;
}

declare module 'topems_core/pages/FlowDesignerPage' {
  const FlowDesignerPage: React.ComponentType;
  export default FlowDesignerPage;
}

declare module 'topems_core/pages/FlowMonitorPage' {
  const FlowMonitorPage: React.ComponentType;
  export default FlowMonitorPage;
}

declare module 'topems_core/pages/FlowTemplatePage' {
  const FlowTemplatePage: React.ComponentType;
  export default FlowTemplatePage;
}

declare module 'topems_core/pages/DocumentCenterPage' {
  const DocumentCenterPage: React.ComponentType;
  export default DocumentCenterPage;
}

declare module 'topems_core/pages/ReportListPage' {
  const ReportListPage: React.ComponentType;
  export default ReportListPage;
}

declare module 'topems_core/pages/ReportViewerPage' {
  const ReportViewerPage: React.ComponentType;
  export default ReportViewerPage;
}

declare module 'topems_hrm/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_hrm/pages/DashboardPage' {
  const DashboardPage: React.ComponentType;
  export default DashboardPage;
}

declare module 'topems_hrm/pages/AttendancePage' {
  const AttendancePage: React.ComponentType;
  export default AttendancePage;
}

declare module 'topems_hrm/pages/PayrollPage' {
  const PayrollPage: React.ComponentType;
  export default PayrollPage;
}

declare module 'topems_hrm/pages/PerformancePage' {
  const PerformancePage: React.ComponentType;
  export default PerformancePage;
}

declare module 'topems_hrm/pages/TrainingPage' {
  const TrainingPage: React.ComponentType;
  export default TrainingPage;
}

declare module 'topems_hrm/pages/RecruitmentPage' {
  const RecruitmentPage: React.ComponentType;
  export default RecruitmentPage;
}

declare module 'topems_crm/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_crm/pages/DashboardPage' {
  const DashboardPage: React.ComponentType;
  export default DashboardPage;
}

declare module 'topems_crm/pages/CustomerManagementPage' {
  const CustomerManagementPage: React.ComponentType;
  export default CustomerManagementPage;
}

declare module 'topems_crm/pages/CustomerDetailPage' {
  const CustomerDetailPage: React.ComponentType;
  export default CustomerDetailPage;
}

declare module 'topems_crm/pages/ContactManagementPage' {
  const ContactManagementPage: React.ComponentType;
  export default ContactManagementPage;
}

declare module 'topems_crm/pages/OpportunityManagementPage' {
  const OpportunityManagementPage: React.ComponentType;
  export default OpportunityManagementPage;
}

declare module 'topems_crm/pages/OpportunityDetailPage' {
  const OpportunityDetailPage: React.ComponentType;
  export default OpportunityDetailPage;
}

declare module 'topems_crm/pages/CustomerScoringPage' {
  const CustomerScoringPage: React.ComponentType;
  export default CustomerScoringPage;
}

declare module 'topems_crm/pages/SalesForecastPage' {
  const SalesForecastPage: React.ComponentType;
  export default SalesForecastPage;
}

declare module 'topems_crm/pages/InteractionManagementPage' {
  const InteractionManagementPage: React.ComponentType;
  export default InteractionManagementPage;
}

declare module 'topems_crm/pages/BillingPage' {
  const BillingPage: React.ComponentType;
  export default BillingPage;
}

declare module 'topems_finance/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_finance/pages/DashboardPage' {
  const DashboardPage: React.ComponentType;
  export default DashboardPage;
}

declare module 'topems_finance/pages/FinanceAccountPage' {
  const FinanceAccountPage: React.ComponentType;
  export default FinanceAccountPage;
}

declare module 'topems_finance/pages/FinanceVoucherPage' {
  const FinanceVoucherPage: React.ComponentType;
  export default FinanceVoucherPage;
}

declare module 'topems_finance/pages/FinanceLedgerPage' {
  const FinanceLedgerPage: React.ComponentType;
  export default FinanceLedgerPage;
}

declare module 'topems_finance/pages/FinanceReceivablePayablePage' {
  const FinanceReceivablePayablePage: React.ComponentType;
  export default FinanceReceivablePayablePage;
}

declare module 'topems_finance/pages/FinanceReceiptPage' {
  const FinanceReceiptPage: React.ComponentType;
  export default FinanceReceiptPage;
}

declare module 'topems_finance/pages/FinancePaymentPage' {
  const FinancePaymentPage: React.ComponentType;
  export default FinancePaymentPage;
}

declare module 'topems_finance/pages/FinanceReportsPage' {
  const FinanceReportsPage: React.ComponentType;
  export default FinanceReportsPage;
}

declare module 'topems_finance/pages/FinancialReportsPage' {
  const FinancialReportsPage: React.ComponentType;
  export default FinancialReportsPage;
}

declare module 'topems_finance/pages/FinanceBudgetPage' {
  const FinanceBudgetPage: React.ComponentType;
  export default FinanceBudgetPage;
}

declare module 'topems_finance/pages/FinanceExpensePage' {
  const FinanceExpensePage: React.ComponentType;
  export default FinanceExpensePage;
}

declare module 'topems_finance/pages/FinanceInvoicePage' {
  const FinanceInvoicePage: React.ComponentType;
  export default FinanceInvoicePage;
}

declare module 'topems_finance/pages/FinanceTaxPage' {
  const FinanceTaxPage: React.ComponentType;
  export default FinanceTaxPage;
}

declare module 'topems_finance/pages/FinanceAssetPage' {
  const FinanceAssetPage: React.ComponentType;
  export default FinanceAssetPage;
}

declare module 'topems_finance/pages/FinanceCostPage' {
  const FinanceCostPage: React.ComponentType;
  export default FinanceCostPage;
}

declare module 'topems_pm/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_pm/pages/DashboardPage' {
  const DashboardPage: React.ComponentType;
  export default DashboardPage;
}

declare module 'topems_pm/pages/ProjectListPage' {
  const ProjectListPage: React.ComponentType;
  export default ProjectListPage;
}

declare module 'topems_pm/pages/ProjectDetailPage' {
  const ProjectDetailPage: React.ComponentType;
  export default ProjectDetailPage;
}

declare module 'topems_pm/pages/ProjectTaskPage' {
  const ProjectTaskPage: React.ComponentType;
  export default ProjectTaskPage;
}

declare module 'topems_pm/pages/GanttChartPage' {
  const GanttChartPage: React.ComponentType;
  export default GanttChartPage;
}

declare module 'topems_pm/pages/MilestonePage' {
  const MilestonePage: React.ComponentType;
  export default MilestonePage;
}

declare module 'topems_pm/pages/RiskManagementPage' {
  const RiskManagementPage: React.ComponentType;
  export default RiskManagementPage;
}

declare module 'topems_pm/pages/ContractListPage' {
  const ContractListPage: React.ComponentType;
  export default ContractListPage;
}

declare module 'topems_pm/pages/ProjectReportPage' {
  const ProjectReportPage: React.ComponentType;
  export default ProjectReportPage;
}

declare module 'topems_mes/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_mes/pages/DashboardPage' {
  const DashboardPage: React.ComponentType;
  export default DashboardPage;
}

declare module 'topems_mes/pages/ProductionOrderManagementPage' {
  const ProductionOrderManagementPage: React.ComponentType;
  export default ProductionOrderManagementPage;
}

declare module 'topems_mes/pages/ProductionProcessPage' {
  const ProductionProcessPage: React.ComponentType;
  export default ProductionProcessPage;
}

declare module 'topems_mes/pages/ProductionRecordPage' {
  const ProductionRecordPage: React.ComponentType;
  export default ProductionRecordPage;
}

declare module 'topems_mes/pages/WorkStationPage' {
  const WorkStationPage: React.ComponentType;
  export default WorkStationPage;
}

declare module 'topems_mes/pages/MobileWorkstationPage' {
  const MobileWorkstationPage: React.ComponentType;
  export default MobileWorkstationPage;
}

declare module 'topems_mes/pages/EquipmentManagementPage' {
  const EquipmentManagementPage: React.ComponentType;
  export default EquipmentManagementPage;
}

declare module 'topems_mes/pages/EquipmentMaintenancePage' {
  const EquipmentMaintenancePage: React.ComponentType;
  export default EquipmentMaintenancePage;
}

declare module 'topems_mes/pages/LimsSamplePage' {
  const LimsSamplePage: React.ComponentType;
  export default LimsSamplePage;
}

declare module 'topems_mes/pages/LimsTaskPage' {
  const LimsTaskPage: React.ComponentType;
  export default LimsTaskPage;
}

declare module 'topems_mes/pages/QmsCheckPage' {
  const QmsCheckPage: React.ComponentType;
  export default QmsCheckPage;
}

declare module 'topems_mes/pages/EhsCheckPage' {
  const EhsCheckPage: React.ComponentType;
  export default EhsCheckPage;
}

declare module 'topems_scm/bootstrap' {
  export interface MountOptions {
    basename?: string;
    initialPath?: string;
  }
  export const mount: (container: HTMLElement, options?: MountOptions) => void;
  export const unmount: (container: HTMLElement) => void;
}

declare module 'topems_scm/pages/DashboardPage' {
  const DashboardPage: React.ComponentType;
  export default DashboardPage;
}

declare module 'topems_scm/pages/SupplierManagementPage' {
  const SupplierManagementPage: React.ComponentType;
  export default SupplierManagementPage;
}

declare module 'topems_scm/pages/PurchaseOrderPage' {
  const PurchaseOrderPage: React.ComponentType;
  export default PurchaseOrderPage;
}

declare module 'topems_scm/pages/PurchaseReceiptPage' {
  const PurchaseReceiptPage: React.ComponentType;
  export default PurchaseReceiptPage;
}

declare module 'topems_scm/pages/InventoryPage' {
  const InventoryPage: React.ComponentType;
  export default InventoryPage;
}

declare module 'topems_scm/pages/WarehousePage' {
  const WarehousePage: React.ComponentType;
  export default WarehousePage;
}

declare module 'topems_scm/pages/InOutBoundPage' {
  const InOutBoundPage: React.ComponentType;
  export default InOutBoundPage;
}

declare module 'topems_scm/pages/InventoryCheckPage' {
  const InventoryCheckPage: React.ComponentType;
  export default InventoryCheckPage;
}

declare module 'topems_scm/pages/InventoryAlertPage' {
  const InventoryAlertPage: React.ComponentType;
  export default InventoryAlertPage;
}
