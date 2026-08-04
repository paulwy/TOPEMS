export const getMockFinanceDashboard = () => ({
  total_vouchers: 12486,
  draft_vouchers: 324,
  submitted_vouchers: 156,
  approved_vouchers: 11280,
  posted_vouchers: 10800,
  total_payments: 8560,
  pending_payments: 412,
  total_receivables: 2456000,
  overdue_receivables: 186400,
  total_payables: 1892000,
  overdue_payables: 94500,
  pending_approvals: 87,
});

export const getMockEhsDashboard = () => ({
  total_accidents: 156,
  pending_hazards: 23,
  training_rate: 87.5,
  drill_count: 12,
  accident_trend: [
    { name: '1月', value: 14 }, { name: '2月', value: 12 },
    { name: '3月', value: 18 }, { name: '4月', value: 15 },
    { name: '5月', value: 10 }, { name: '6月', value: 8 },
  ],
  hazard_types: [
    { name: '机械伤害', value: 45 }, { name: '电气危险', value: 28 },
    { name: '化学泄漏', value: 22 }, { name: '火灾隐患', value: 18 },
    { name: '其他', value: 15 },
  ],
  training_trend: [
    { name: '安全培训', value: 92 }, { name: '应急演练', value: 85 },
    { name: '设备操作', value: 78 }, { name: '消防知识', value: 88 },
  ],
});

export const getMockLimsDashboard = () => ({
  pending_samples: 342,
  in_progress_tasks: 56,
  instrument_usage: 78.3,
  pass_rate: 94.6,
  test_items: [
    { name: '重金属检测', value: 125 }, { name: '微生物检测', value: 98 },
    { name: '化学成分分析', value: 76 }, { name: '物理性能测试', value: 68 },
  ],
  task_completion: [
    { name: '已完成', value: 234 }, { name: '进行中', value: 56 },
    { name: '待开始', value: 42 }, { name: '已逾期', value: 8 },
  ],
  instrument_status: [
    { name: '气相色谱仪', value: 85 }, { name: '液相色谱仪', value: 72 },
    { name: '原子吸收光谱', value: 68 }, { name: '电子显微镜', value: 90 },
  ],
});

export const getMockCrmDashboard = () => ({
  total_opportunities: 384,
  won_amount: 5680000,
  conversion_rate: 24.6,
  average_cycle: 18.5,
  opportunity_stages: [
    { name: '初步接触', value: 120 }, { name: '需求确认', value: 95 },
    { name: '方案报价', value: 72 }, { name: '商务谈判', value: 56 },
    { name: '赢单', value: 32 },
  ],
  monthly_performance: [
    { name: '1月', value: 420000 }, { name: '2月', value: 380000 },
    { name: '3月', value: 560000 }, { name: '4月', value: 610000 },
    { name: '5月', value: 490000 }, { name: '6月', value: 720000 },
  ],
  industries: [
    { name: '制造业', value: 145 }, { name: '建筑业', value: 98 },
    { name: '能源电力', value: 76 }, { name: '交通运输', value: 45 },
    { name: '其他', value: 20 },
  ],
});

export const getMockWmsDashboard = () => ({
  total_inventory: 15680,
  pending_inbound: 342,
  pending_outbound: 256,
  location_utilization: 82.4,
  inbound_trend: [
    { name: '周一', value: 1250 }, { name: '周二', value: 1480 },
    { name: '周三', value: 1320 }, { name: '周四', value: 1560 },
    { name: '周五', value: 1180 }, { name: '周六', value: 820 }, { name: '周日', value: 680 },
  ],
  inventory_categories: [
    { name: '原材料', value: 6800 }, { name: '半成品', value: 3200 },
    { name: '成品', value: 4500 }, { name: '辅料', value: 1180 },
  ],
  outbound_trend: [
    { name: '周一', value: 980 }, { name: '周二', value: 1120 },
    { name: '周三', value: 1060 }, { name: '周四', value: 1340 },
    { name: '周五', value: 1260 }, { name: '周六', value: 580 }, { name: '周日', value: 420 },
  ],
});

export const getMockHrmDashboard = () => ({
  total_employees: 1246,
  new_hires: 38,
  on_leave: 24,
  avg_salary: 8560,
  department_distribution: [
    { name: '技术部', value: 386 }, { name: '生产部', value: 324 },
    { name: '销售部', value: 198 }, { name: '行政部', value: 142 },
    { name: '财务部', value: 86 }, { name: '其他', value: 110 },
  ],
  hire_trend: [
    { name: '1月', value: 12 }, { name: '2月', value: 18 },
    { name: '3月', value: 25 }, { name: '4月', value: 15 },
    { name: '5月', value: 22 }, { name: '6月', value: 38 },
  ],
  education_distribution: [
    { name: '博士', value: 28 }, { name: '硕士', value: 186 },
    { name: '本科', value: 624 }, { name: '大专', value: 312 },
    { name: '高中及以下', value: 96 },
  ],
});

export const getMockPdmDashboard = () => ({
  ongoing_projects: 36,
  pending_reviews: 12,
  bom_changes: 48,
  completion_rate: 78.6,
  project_distribution: [
    { name: '新产品开发', value: 14 }, { name: '产品升级', value: 10 },
    { name: '工艺改进', value: 8 }, { name: '技术预研', value: 4 },
  ],
  document_types: [
    { name: '设计文档', value: 156 }, { name: '工艺文件', value: 98 },
    { name: '检验标准', value: 68 }, { name: 'BOM清单', value: 45 },
  ],
  change_trend: [
    { name: '1月', value: 32 }, { name: '2月', value: 45 },
    { name: '3月', value: 38 }, { name: '4月', value: 52 },
    { name: '5月', value: 48 }, { name: '6月', value: 62 },
  ],
});

export const getMockQmsDashboard = () => ({
  total_standards: 245,
  total_inspections: 1862,
  total_issues: 324,
  total_actions: 286,
  pass_rate: 96.8,
  defect_rate: 3.2,
  on_time_delivery_rate: 94.5,
  customer_complaint_count: 18,
  quality_cost_total: 568000,
  quality_cost_ratio: 4.2,
  spc_chart_count: 56,
  fmea_count: 42,
  eightd_count: 28,
  audit_plan_count: 16,
  trend_data: [
    { date: '2026-06-01', pass_rate: 96.2, defect_count: 28, issue_count: 42 },
    { date: '2026-06-08', pass_rate: 97.1, defect_count: 22, issue_count: 38 },
    { date: '2026-06-15', pass_rate: 96.8, defect_count: 25, issue_count: 35 },
    { date: '2026-06-22', pass_rate: 97.5, defect_count: 18, issue_count: 28 },
    { date: '2026-06-29', pass_rate: 98.1, defect_count: 15, issue_count: 22 },
  ],
  top_issues: [
    { category: '外观缺陷', count: 86, percentage: 26.5 },
    { category: '尺寸偏差', count: 68, percentage: 21.0 },
    { category: '功能异常', count: 52, percentage: 16.0 },
    { category: '材料问题', count: 48, percentage: 14.8 },
    { category: '装配错误', count: 36, percentage: 11.1 },
    { category: '其他', count: 34, percentage: 10.6 },
  ],
  department_performance: [
    { department: '装配车间', pass_rate: 97.2, issue_count: 85 },
    { department: '焊接车间', pass_rate: 95.8, issue_count: 62 },
    { department: '机加工车间', pass_rate: 98.4, issue_count: 48 },
    { department: '包装车间', pass_rate: 99.1, issue_count: 25 },
    { department: '来料检验', pass_rate: 96.5, issue_count: 104 },
  ],
});

export const getMockMesDashboard = () => ({
  total_orders: 256,
  in_progress_orders: 48,
  completed_orders: 186,
  today_output: 12480,
  pass_rate: 97.2,
  oee: 85.6,
  order_progress: [
    { order_id: '1', order_number: 'WO-2026-0612', product_name: '产品A', plannedQuantity: 500, completed_quantity: 380, progress: 76, status: '进行中' },
    { order_id: '2', order_number: 'WO-2026-0613', product_name: '产品B', plannedQuantity: 200, completed_quantity: 200, progress: 100, status: '已完成' },
    { order_id: '3', order_number: 'WO-2026-0614', product_name: '产品C', plannedQuantity: 1000, completed_quantity: 520, progress: 52, status: '进行中' },
  ],
  workstation_status: [
    { work_station_id: '1', work_station_name: '工位A', status: '运行', current_order: 'WO-2026-0612', current_product: '产品A', output_today: 380, operator: '张工' },
    { work_station_id: '2', work_station_name: '工位B', status: '待机', current_order: undefined, current_product: undefined, output_today: 0, operator: '李工' },
    { work_station_id: '3', work_station_name: '工位C', status: '运行', current_order: 'WO-2026-0614', current_product: '产品C', output_today: 520, operator: '王工' },
  ],
  quality_trend: [
    { date: '2026-06-23', pass_rate: 96.8, total_quantity: 11800, good_quantity: 11422 },
    { date: '2026-06-24', pass_rate: 97.2, total_quantity: 12100, good_quantity: 11761 },
    { date: '2026-06-25', pass_rate: 96.5, total_quantity: 12400, good_quantity: 11966 },
    { date: '2026-06-26', pass_rate: 97.8, total_quantity: 12200, good_quantity: 11932 },
    { date: '2026-06-27', pass_rate: 98.1, total_quantity: 12480, good_quantity: 12243 },
  ],
  equipment_status: [
    { equipment_id: '1', equipment_name: 'CNC加工中心', equipment_code: 'EQ-CNC-001', status: '运行', oee: 88.5 },
    { equipment_id: '2', equipment_name: '激光切割机', equipment_code: 'EQ-LSR-002', status: '运行', oee: 82.3 },
    { equipment_id: '3', equipment_name: '自动焊接机器人', equipment_code: 'EQ-WLD-003', status: '维护', oee: 0 },
    { equipment_id: '4', equipment_name: '注塑机', equipment_code: 'EQ-IMJ-004', status: '运行', oee: 91.2 },
  ],
});

export const getMockPmDashboard = () => ({
  total_projects: 68,
  draft_projects: 8,
  pending_projects: 12,
  active_projects: 38,
  completed_projects: 10,
  cancelled_projects: 0,
  total_contracts: 42,
  pending_contracts: 6,
  active_contracts: 28,
  completed_contracts: 8,
  total_budget: 12800000,
  spent_budget: 8640000,
  budget_usage_rate: 67.5,
  on_time_projects: 32,
  delayed_projects: 6,
  average_progress: 56.8,
  high_risk_projects: 4,
  medium_risk_projects: 12,
  low_risk_projects: 22,
});