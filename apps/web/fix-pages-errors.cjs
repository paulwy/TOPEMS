const fs = require('fs');
const path = require('path');

// Fix 1: "default" badge color -> "secondary" in workflow pages
const workflowFiles = [
  'src/pages/workflow/WorkflowApprovalsPage.tsx',
  'src/pages/workflow/WorkflowInstancesPage.tsx',
  'src/pages/workflow/WorkflowMonitorPage.tsx',
];
for (const f of workflowFiles) {
  const p = path.resolve(f);
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;
  // Replace color="default" with color="secondary"
  s = s.replace(/color=["']default["']/g, (m) => { count++; return 'color="secondary"'; });
  // Also handle variant="default" -> variant="neutral" for V51Badge
  s = s.replace(/variant=["']default["']/g, (m) => { count++; return 'variant="neutral"'; });
  if (count > 0) {
    fs.writeFileSync(p, s, 'utf8');
    console.log(f + ': ' + count + ' color/variant fixes');
  }
}

// Fix 2: as Type -> as unknown as Type for specific types
const asFixes = [
  // [file, type pattern to fix]
  ['src/pages/admin/DictionaryManagementPage.tsx', /as DictItem\b/g, 'as unknown as DictItem'],
  ['src/pages/admin/RoleManagementPage.tsx', /as Role\b/g, 'as unknown as Role'],
  ['src/pages/admin/UserManagementPage.tsx', /as User\b/g, 'as unknown as User'],
  ['src/pages/erp/BudgetManagementPage.tsx', /as Budget\[\]/g, 'as unknown as Budget[]'],
  ['src/pages/erp/BudgetManagementPage.tsx', /as Expense\[\]/g, 'as unknown as Expense[]'],
  ['src/pages/erp/InventoryManagementPage.tsx', /as Inventory\[\]/g, 'as unknown as Inventory[]'],
  ['src/pages/mes/MaterialBOMPage.tsx', /as MaterialBom\[\]/g, 'as unknown as MaterialBom[]'],
  ['src/pages/mes/MaterialRequirementPage.tsx', /as MaterialRequirement\[\]/g, 'as unknown as MaterialRequirement[]'],
  ['src/pages/mes/ProcessRoutePage.tsx', /as ProcessRoute\b/g, 'as unknown as ProcessRoute'],
  ['src/pages/monitor/MonitorAlertRulesPage.tsx', /as AlertRule\[\]/g, 'as unknown as AlertRule[]'],
  ['src/pages/monitor/MonitorAlertRulesPage.tsx', /as CrudApiAdapter<Record<string, unknown>>/g, 'as unknown as CrudApiAdapter<Record<string, unknown>>'],
  ['src/pages/pm/PmProjectListPage.tsx', /as \(rows: Record<string, unknown>\[\], total: number\) => ReactNode/g, 'as unknown as (rows: Record<string, unknown>[], total: number) => ReactNode'],
  ['src/pages/report/ReportListPage.tsx', /as \(rows: Record<string, unknown>\[\], total: number\) => ReactNode/g, 'as unknown as (rows: Record<string, unknown>[], total: number) => ReactNode'],
  ['src/pages/srm/BiddingPage.tsx', /as Bidding\b/g, 'as unknown as Bidding'],
  ['src/pages/srm/InquiryQuotationPage.tsx', /as Inquiry\b/g, 'as unknown as Inquiry'],
  ['src/pages/srm/SrmContractPage.tsx', /as CreateSupplierContractRequest\b/g, 'as unknown as CreateSupplierContractRequest'],
  ['src/pages/srm/SrmEvaluationPage.tsx', /as CreateSupplierEvaluationRequest\b/g, 'as unknown as CreateSupplierEvaluationRequest'],
  ['src/pages/srm/SrmScoringDimensionPage.tsx', /as ScoringDimension\[\]/g, 'as unknown as ScoringDimension[]'],
  ['src/pages/srm/SrmScoringDimensionPage.tsx', /as CreateScoringDimensionRequest\b/g, 'as unknown as CreateScoringDimensionRequest'],
  ['src/pages/workflow/WorkflowApprovalsPage.tsx', /as ApprovalTask\b/g, 'as unknown as ApprovalTask'],
  ['src/pages/workflow/WorkflowInstancesPage.tsx', /as WorkflowInstance\b/g, 'as unknown as WorkflowInstance'],
  ['src/pages/workflow/WorkflowTemplatePage.tsx', /as FlowTemplateRecord\b/g, 'as unknown as FlowTemplateRecord'],
];

let totalAs = 0;
for (const [f, pattern, replacement] of asFixes) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;
  s = s.replace(pattern, () => { count++; return replacement; });
  if (count > 0) {
    fs.writeFileSync(p, s, 'utf8');
    totalAs += count;
    console.log(f + ': ' + count + ' as-conversion fixes');
  }
}
console.log('TOTAL as fixes:', totalAs);

// Fix 3: params possibly undefined - add ?. or null checks
// For useSearchParams, params can be undefined. Add ?. where needed.
const paramsFiles = [
  'src/pages/doc/KnowledgeBasePage.tsx',
  'src/pages/erp/ReceivablePayablePage.tsx',
  'src/pages/workflow/WorkflowTemplatePage.tsx',
];
for (const f of paramsFiles) {
  const p = path.resolve(f);
  let s = fs.readFileSync(p, 'utf8');
  let count = 0;
  // Replace params.get( with params?.get(
  s = s.replace(/params\.get\(/g, (m) => { count++; return 'params?.get('; });
  // Replace params.xxx with params?.xxx (but not params?. already)
  s = s.replace(/(?<!\?)params\.(\w+)/g, (m, prop) => {
    if (prop === 'get') return m; // already handled above
    count++;
    return 'params?.' + prop;
  });
  if (count > 0) {
    fs.writeFileSync(p, s, 'utf8');
    console.log(f + ': ' + count + ' params fixes');
  }
}

console.log('done');
