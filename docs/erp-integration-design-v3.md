# ERP模块全模块整合设计方案 V3.0

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | V3.0 |
| 更新日期 | 2024-01-11 |
| 状态 | 部分实施 |

---

## 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| V3.0 | 2024-01-11 | 初始设计方案 | - |
| V3.1 | 2026-06-12 | 完成财务模块前端实施 | AI |
| V3.2 | 2026-06-12 | 完成外部ERP适配器、凭证模板、财务报表API及Hooks | AI |
| V3.3 | 2026-06-12 | 完成外部ERP连接管理、映射管理、凭证模板管理、财务报表查看页面 | AI |
| V3.4 | 2026-06-12 | 添加凭证模板管理、财务报表查看路由配置 | AI |
| V3.5 | 2026-06-12 | 集成页面添加外部ERP Tab、添加外部ERP连接列表路由 | AI |
| V3.6 | 2026-06-12 | 新增科目管理页面及路由配置 | AI |
| V3.7 | 2026-06-12 | 修复外部ERP映射页面ESLint格式问题 | AI |
| V3.8 | 2026-06-12 | 新增银行账户管理页面及路由配置 | AI |
| V3.9 | 2026-06-12 | 新增固定资产管理页面及路由配置 | AI |
| V3.10 | 2026-06-12 | 新增多公司财报合并功能（合并范围管理、合并报表查看） | AI |
| V3.11 | 2026-06-12 | 新增合并报表数据库Schema及后端API接口契约 | AI |
| V3.12 | 2026-06-12 | 新增公司架构管理页面（母子公司关系管理） | AI |
| V3.13 | 2026-06-12 | 新增期初余额管理页面及路由配置 | AI |
| V3.14 | 2026-06-12 | 新增合并报表后端API实现（Rust/Axum） | AI |

---

## 一、系统整体架构

### 1.1 模块架构全景图

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TOPEMS 企业数字平台                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              前端应用层 (Web / Mobile / Desktop)                          │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │  │   驾驶舱   │ │  审批中心  │ │  消息中心  │ │  文档中心  │ │  搜索中心  │ │  AI助手   │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      业务模块层                                           │   │
│  │                                                                                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │      HRM       │  │      CRM       │  │       PM       │  │      ERP        │      │   │
│  │  │   人力资源     │  │   客户关系      │  │    项目管理     │  │   企业资源计划   │      │   │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤      │   │
│  │  │ • 组织架构     │  │ • 客户管理      │  │ • 项目管理     │  │ • 总账凭证     │      │   │
│  │  │ • 员工管理     │  │ • 商机管理      │  │ • 合同管理     │  │ • 应收应付     │      │   │
│  │  │ • 招聘管理     │  │ • 销售预测      │  │ • 任务管理     │  │ • 固定资产     │      │   │
│  │  │ • 考勤管理     │  │ • 客户服务      │  │ • 资源管理     │  │ • 预算管理     │      │   │
│  │  │ • 薪酬管理     │  │                │  │ • 成本管理     │  │ • 银行管理     │      │   │
│  │  │ • 绩效管理     │  │                │  │ • 里程碑管理   │  │ • 费用报销     │      │   │
│  │  │ • 培训管理     │  │                │  │                │  │                │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  │                                                                                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │      SRM        │  │      QMS       │  │      LIMS      │  │      EHS        │      │   │
│  │  │   供应商管理    │  │   质量管理      │  │   实验室管理    │  │   环境健康安全  │      │   │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤      │   │
│  │  │ • 供应商档案    │  │ • 质量标准      │  │ • 样品管理     │  │ • 危险源管理   │      │   │
│  │  │ • 采购询价     │  │ • 来料检验      │  │ • 检测任务     │  │ • 隐患管理     │      │   │
│  │  │ • 采购订单     │  │ • 过程检验      │  │ • 仪器管理     │  │ • 应急管理     │      │   │
│  │  │ • 收货验货     │  │ • 出货检验      │  │ • 校准管理     │  │ • 职业健康     │      │   │
│  │  │ • 供应商评估    │  │ • 不良品管理    │  │ • 标准物质     │  │ • 环境监测     │      │   │
│  │  │                │  │ • 客户投诉      │  │ • 数据分析     │  │                │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  │                                                                                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │       RS       │  │       BI       │  │    Workflow     │  │    Integration   │      │   │
│  │  │   研发管理      │  │   商务智能      │  │   工作流引擎    │  │    系统集成     │      │   │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤      │   │
│  │  │ • 项目管理     │  │ • 数据源管理    │  │ • 流程设计     │  │ • API网关      │      │   │
│  │  │ • 配方管理     │  │ • 报表管理     │  │ • 流程审批     │  │ • 数据同步     │      │   │
│  │  │ • 实验记录     │  │ • 仪表盘      │  │ • 流程监控     │  │ • 第三方集成   │      │   │
│  │  │ • 文档管理     │  │ • 数据分析     │  │                │  │                │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      财务核心层                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │   总账报表      │  │   合并报表      │  │   资金管理      │  │   成本管理      │      │   │
│  │  │ • 凭证管理     │  │ • 多公司架构   │  │ • 银行账户     │  │ • 成本中心     │      │   │
│  │  │ • 科目体系     │  │ • 抵消规则    │  │ • 收款付款    │  │ • 作业成本     │      │   │
│  │  │ • 期末处理     │  │ • 合并报表    │  │ • 票据管理    │  │ • 标准成本     │      │   │
│  │  │ • 财务报表     │  │ • 外币折算   │  │ • 资金计划    │  │ • 差异分析     │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      数据服务层                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │   API Gateway   │  │   Message Queue │  │    Cache        │  │   File Storage  │      │   │
│  │  │   API网关      │  │   消息队列      │  │   缓存服务      │  │   文件存储      │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      外部集成层                                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │   金蝶K3/云     │  │   用友U8/NC     │  │   SAP S/4HANA  │  │   钉钉/企业微信 │      │   │
│  │  │   Kingdee       │  │   Yonyou        │  │   SAP           │  │   DingTalk      │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │   │
│  │  │   税务局对接    │  │   银行对接      │  │   海关对接       │  │   电商平台      │      │   │
│  │  │   Tax Bureau   │  │   Bank API      │  │   Customs       │  │   E-commerce    │      │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、模块间数据流转设计

### 2.1 核心业务闭环

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               模块间业务闭环设计                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│    ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│    │                            销售到收款闭环                                           │     │
│    │                                                                                  │     │
│    │    CRM ──► 商机转化 ──► 合同签订 ──► 项目立项 ──► 项目执行 ──► 验收交付 ──► 开票    │     │
│    │     │           │            │            │            │            │           │     │
│    │     ▼           ▼            ▼            ▼            ▼            ▼           ▼     │
│    │    客户        报价        合同        项目        里程碑      验收单        发票   │     │
│    │   档案       订单        评审        预算        审批        确认        应收   │     │
│    │                                                                                  │     │
│    │    ◄────────────────────────────────────────────────────────────────────────    │     │
│    │                                                                                  │     │
│    │    ERP ──► 凭证生成 ──► 应收确认 ──► 到款认领 ──► 核销处理 ──► 财务记账         │     │
│    │     │          │           │           │           │           │                 │     │
│    │     ▼          ▼           ▼           ▼           ▼           ▼                 │     │
│    │   收款       收入       应收账款     银行收款    应收核销    利润表            │     │
│    │   凭证       确认       余额减少      认领        自动核销    影响             │     │
│    └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                              │
│    ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│    │                            采购到付款闭环                                           │     │
│    │                                                                                  │     │
│    │    SRM ──► 供应商档案 ──► 询价报价 ──► 采购订单 ──► 收货入库 ──► 质量检验 ──►   │     │
│    │     │         │            │           │           │           │               │     │
│    │     ▼         ▼            ▼           ▼           ▼           ▼               │     │
│    │   供应商     准入        比价        订单        检验        检验              │     │
│    │   评估       审核        审批        确认        结果        报告              │     │
│    │                                                                                  │     │
│    │    ◄────────────────────────────────────────────────────────────────────────    │     │
│    │                                                                                  │     │
│    │    ERP ──► 凭证生成 ──► 应付确认 ──► 付款申请 ──► 付款审批 ──► 资金支付 ──►   │     │
│    │     │          │           │           │           │           │               │     │
│    │     ▼          ▼           ▼           ▼           ▼           ▼               │     │
│    │   采购       成本       应付账款     付款        审批        银行             │     │
│    │   入库       确认       余额增加      单          流程        划款             │     │
│    └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                              │
│    ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│    │                            员工到薪酬闭环                                           │     │
│    │                                                                                  │     │
│    │    HRM ──► 入职管理 ──► 考勤记录 ──► 绩效评估 ──► 工资核算 ──► 社保公积金 ──► │     │
│    │     │          │           │           │           │           │               │     │
│    │     ▼          ▼           ▼           ▼           ▼           ▼               │     │
│    │   员工       试用        打卡        考核        计件/计时    计提             │     │
│    │   档案       转正        统计        评分        工资        社保               │     │
│    │                                                                                  │     │
│    │    ◄────────────────────────────────────────────────────────────────────────    │     │
│    │                                                                                  │     │
│    │    ERP ──► 凭证生成 ──► 工资发放 ──► 社保缴纳 ──► 税务申报 ──► 成本归集       │     │
│    │     │          │           │           │           │           │               │     │
│    │     ▼          ▼           ▼           ▼           ▼           ▼               │     │
│    │   人工       工资       代发        社保        个税        部门               │     │
│    │   成本       凭证       指令        划款        申报        利润               │     │
│    └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                              │
│    ┌─────────────────────────────────────────────────────────────────────────────────┐     │
│    │                            项目到核算闭环                                           │     │
│    │                                                                                  │     │
│    │    PM ────► 项目立项 ──► 任务分解 ──► 资源分配 ──► 进度跟踪 ──► 成本归集 ──► │     │
│    │             │           │           │           │           │           │         │     │
│    │             ▼           ▼           ▼           ▼           ▼           ▼         │     │
│    │           项目        WBS        人员        工时        成本        项目        │     │
│    │           预算        任务        设备        记录        统计        利润        │     │
│    │                                                                                  │     │
│    │    ◄────────────────────────────────────────────────────────────────────────    │     │
│    │                                                                                  │     │
│    │    ERP ──► 项目成本 ──► 收入确认 ──► 毛利计算 ──► 利润分配 ──► 项目结算       │     │
│    │     │          │           │           │           │           │               │     │
│    │     ▼          ▼           ▼           ▼           ▼           ▼               │     │
│    │   项目        直接        完工        项目        奖金        项目            │     │
│    │   辅助        人工        百分比        毛利        计提        关闭           │     │
│    └─────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、各模块与财务的整合点

### 3.1 HRM模块调整

#### 3.1.1 现有数据结构

```typescript
// src/api/hrm.ts - 现有接口
export interface Employee {
  id: string;
  employee_number: string;
  name: string;
  department_id: string;
  position: string;
  // ... 其他字段
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  work_hours: number;
  // ... 其他字段
}
```

#### 3.1.2 需增加的财务字段

```typescript
// src/types/hrm-finance.ts - 新增

export interface EmployeeFinanceInfo {
  employee_id: string;
  
  // 银行账户 (用于工资发放)
  bank_card_number: string;
  bank_name: string;
  bank_branch?: string;
  
  // 薪资信息
  base_salary: number;              // 基本工资
  position_salary: number;          // 岗位工资
  skill_salary: number;            // 技能工资
  
  // 社保公积金
  social_security_base: number;    // 社保基数
  social_security_ratio: number;   // 社保比例
  housing_fund_base: number;       // 公积金基数
  housing_fund_ratio: number;      // 公积金比例
  
  // 税务信息
  tax_id?: string;                 // 纳税人识别号
  tax_level?: number;             // 个税专项附加扣除
  
  // 费用归属
  cost_center_id: string;          // 成本中心
  expense_account_id: string;      // 费用科目
}

export interface PayrollRecord {
  id: string;
  period: string;                  // 工资期间 YYYY-MM
  company_id: string;
  department_id: string;
  employee_id: string;
  
  // 应发
  base_salary: number;
  position_salary: number;
  skill_salary: number;
  overtime_pay: number;
  bonus: number;
  allowances: number;
  
  // 扣款
  absence_deduction: number;
  late_deduction: number;
  other_deductions: number;
  
  // 社保公积金
  social_security_employee: number;  // 个人社保
  housing_fund_employee: number;     // 个人公积金
  
  // 税务
  individual_income_tax: number;
  
  // 实发
  gross_salary: number;             // 应发工资
  net_salary: number;              // 实发工资
  
  // 状态
  status: 'draft' | 'calculating' | 'approved' | 'paid';
  paid_at?: string;
  
  // 关联凭证
  voucher_id?: string;
  voucher_no?: string;
}
```

#### 3.1.3 API调整

```typescript
// src/api/hrm-finance.ts - 新增

export const hrmFinanceApi = {
  // 获取员工财务信息
  getEmployeeFinanceInfo: (employeeId: string) => 
    hrmClient.get(`/api/v1/hrm/employees/${employeeId}/finance`),
  
  // 更新员工财务信息
  updateEmployeeFinanceInfo: (employeeId: string, data: Partial<EmployeeFinanceInfo>) =>
    hrmClient.put(`/api/v1/hrm/employees/${employeeId}/finance`, data),
  
  // 工资核算
  calculatePayroll: (params: {
    company_id: string;
    period: string;
    department_ids?: string[];
  }) => hrmClient.post('/api/v1/hrm/payroll/calculate', params),
  
  // 获取工资单列表
  getPayrollRecords: (params: PayrollQueryParams) =>
    hrmClient.get('/api/v1/hrm/payroll/records', { params }),
  
  // 确认工资单
  approvePayroll: (recordIds: string[]) =>
    hrmClient.post('/api/v1/hrm/payroll/approve', { record_ids: recordIds }),
  
  // 生成工资凭证
  generatePayrollVoucher: (params: {
    period: string;
    company_id: string;
    record_ids?: string[];
  }) => hrmClient.post('/api/v1/hrm/payroll/generate-voucher', params),
  
  // 导出银行报盘文件
  exportBankFile: (params: {
    period: string;
    company_id: string;
    bank_code: string;
  }) => hrmClient.getBlob('/api/v1/hrm/payroll/export-bank-file', { params }),
  
  // 更新发放状态
  updatePaymentStatus: (recordIds: string[], status: string) =>
    hrmClient.put('/api/v1/hrm/payroll/payment-status', { 
      record_ids: recordIds, 
      status 
    }),
};
```

#### 3.1.4 页面调整

```typescript
// src/pages/hrm/EmployeeFinanceTab.tsx - 新增

interface EmployeeFinanceTabProps {
  employeeId: string;
  employee: Employee;
}

// 员工财务信息标签页
export const EmployeeFinanceTab: React.FC<EmployeeFinanceTabProps> = ({ employeeId, employee }) => {
  const { data: financeInfo, isLoading } = useQuery({
    queryKey: ['employee-finance', employeeId],
    queryFn: () => hrmFinanceApi.getEmployeeFinanceInfo(employeeId),
  });

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader>银行账户信息</CardHeader>
        <CardContent>
          <Form>
            <FormItem label="开户银行">
              <Input value={financeInfo?.bank_name} />
            </FormItem>
            <FormItem label="银行卡号">
              <Input value={financeInfo?.bank_card_number} />
            </FormItem>
          </Form>
        </CardContent>
      </Card>

      {/* 薪资信息 */}
      <Card>
        <CardHeader>薪资设置</CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <FormItem label="基本工资">
              <CurrencyInput value={financeInfo?.base_salary} />
            </FormItem>
            <FormItem label="岗位工资">
              <CurrencyInput value={financeInfo?.position_salary} />
            </FormItem>
            <FormItem label="技能工资">
              <CurrencyInput value={financeInfo?.skill_salary} />
            </FormItem>
          </div>
        </CardContent>
      </Card>

      {/* 社保公积金 */}
      <Card>
        <CardHeader>社保公积金</CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <FormItem label="社保基数">
              <CurrencyInput value={financeInfo?.social_security_base} />
            </FormItem>
            <FormItem label="社保比例">
              <PercentageInput value={financeInfo?.social_security_ratio} />
            </FormItem>
            <FormItem label="公积金基数">
              <CurrencyInput value={financeInfo?.housing_fund_base} />
            </FormItem>
            <FormItem label="公积金比例">
              <PercentageInput value={financeInfo?.housing_fund_ratio} />
            </FormItem>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### 3.2 SRM模块调整

#### 3.2.1 现有数据结构

```typescript
// src/api/srm.ts - 需要新建或扩展

// 供应商基本信息
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  status: string;
}

// 采购订单
export interface PurchaseOrder {
  id: string;
  order_no: string;
  supplier_id: string;
  order_date: string;
  expected_date: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  items: PurchaseOrderItem[];
}

// 采购入库
export interface PurchaseReceive {
  id: string;
  receive_no: string;
  order_id: string;
  supplier_id: string;
  receive_date: string;
  total_amount: number;
  status: string;
}
```

#### 3.2.2 需增加的财务字段

```typescript
// src/types/srm-finance.ts - 新增

export interface SupplierFinanceInfo {
  supplier_id: string;
  
  // 银行账户
  bank_name: string;
  bank_account: string;
  account_name: string;
  
  // 财务信息
  tax_number: string;
  invoice_type: 'normal' | 'special';  // 发票类型
  
  // 付款条款
  payment_terms: string;              // 如: T/T 30天
  payment_days: number;               // 付款天数
  credit_limit: number;               // 信用额度
  
  // 应付账款
  accounts_payable: number;           // 当前应付余额
  overdue_payable: number;            // 逾期应付
  avg_payment_days: number;           // 平均付款天数
  
  // 状态
  status: 'normal' | 'blocked' | 'inactive';
  block_reason?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoice_no: string;
  supplier_id: string;
  supplier_name: string;
  
  // 关联信息
  order_id?: string;
  receive_id?: string;
  project_id?: string;
  
  // 金额
  amount: number;                     // 不含税金额
  tax_amount: number;                  // 税额
  total_amount: number;               // 含税金额
  paid_amount: number;                // 已付款
  
  // 发票信息
  invoice_date: string;
  due_date: string;
  invoice_type: 'normal' | 'special';
  
  // 状态
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  
  // 关联凭证
  voucher_id?: string;
}

export interface PaymentRequest {
  id: string;
  request_no: string;
  company_id: string;
  supplier_id: string;
  
  // 付款信息
  payment_amount: number;
  payment_method: 'bank_transfer' | 'commercial_acceptance' | 'bank_acceptance';
  bank_account_id: string;
  
  // 关联发票
  invoice_ids: string[];
  
  // 状态
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'rejected';
  
  // 审批信息
  approver_id?: string;
  approved_at?: string;
  
  // 关联凭证
  voucher_id?: string;
}
```

#### 3.2.3 API调整

```typescript
// src/api/srm-finance.ts - 新增

export const srmFinanceApi = {
  // 供应商财务信息
  getSupplierFinanceInfo: (supplierId: string) =>
    srmClient.get(`/api/v1/srm/suppliers/${supplierId}/finance`),
  
  updateSupplierFinanceInfo: (supplierId: string, data: Partial<SupplierFinanceInfo>) =>
    srmClient.put(`/api/v1/srm/suppliers/${supplierId}/finance`, data),
  
  // 采购发票
  getPurchaseInvoices: (params: PurchaseInvoiceQueryParams) =>
    srmClient.get('/api/v1/srm/invoices', { params }),
  
  createPurchaseInvoice: (data: CreatePurchaseInvoiceRequest) =>
    srmClient.post('/api/v1/srm/invoices', data),
  
  approvePurchaseInvoice: (invoiceId: string) =>
    srmClient.post(`/api/v1/srm/invoices/${invoiceId}/approve`, {}),
  
  // 应付账款
  getAccountsPayable: (params: {
    company_id: string;
    supplier_ids?: string[];
    status?: string[];
  }) => srmClient.get('/api/v1/srm/accounts-payable', { params }),
  
  // 付款申请
  getPaymentRequests: (params: PaymentRequestQueryParams) =>
    srmClient.get('/api/v1/srm/payment-requests', { params }),
  
  createPaymentRequest: (data: CreatePaymentRequest) =>
    srmClient.post('/api/v1/srm/payment-requests', data),
  
  approvePaymentRequest: (requestId: string) =>
    srmClient.post(`/api/v1/srm/payment-requests/${requestId}/approve`, {}),
  
  // 生成采购凭证
  generatePurchaseVoucher: (invoiceIds: string[]) =>
    srmClient.post('/api/v1/srm/invoices/generate-voucher', { invoice_ids: invoiceIds }),
};
```

#### 3.2.4 页面调整

```typescript
// src/pages/srm/SupplierFinanceTab.tsx - 新增

export const SupplierFinanceTab: React.FC<{ supplierId: string }> = ({ supplierId }) => {
  const { data: financeInfo } = useQuery({
    queryKey: ['supplier-finance', supplierId],
    queryFn: () => srmFinanceApi.getSupplierFinanceInfo(supplierId),
  });

  return (
    <div className="space-y-6">
      {/* 银行账户 */}
      <Card>
        <CardHeader>银行账户信息</CardHeader>
        <CardContent>
          <Form layout="vertical">
            <div className="grid grid-cols-2 gap-4">
              <FormItem label="开户银行">
                <Input value={financeInfo?.bank_name} />
              </FormItem>
              <FormItem label="银行账号">
                <Input value={financeInfo?.bank_account} />
              </FormItem>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* 付款条款 */}
      <Card>
        <CardHeader>付款条款</CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <FormItem label="付款条件">
              <Input value={financeInfo?.payment_terms} />
            </FormItem>
            <FormItem label="信用额度">
              <CurrencyInput value={financeInfo?.credit_limit} />
            </FormItem>
            <FormItem label="已用额度">
              <CurrencyInput value={financeInfo?.accounts_payable} />
            </FormItem>
          </div>
        </CardContent>
      </Card>

      {/* 应付账款概览 */}
      <Card>
        <CardHeader>应付账款概览</CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="当前应付"
              value={financeInfo?.accounts_payable}
              prefix="¥"
            />
            <StatCard
              title="逾期应付"
              value={financeInfo?.overdue_payable}
              prefix="¥"
              type="danger"
            />
            <StatCard
              title="平均付款天数"
              value={financeInfo?.avg_payment_days}
              suffix="天"
            />
            <StatCard
              title="信用状态"
              value={financeInfo?.status === 'normal' ? '正常' : '受限'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

### 3.3 PM模块调整

#### 3.3.1 现有数据结构

```typescript
// src/api/pm.ts - 现有接口
export interface Project {
  id: string;
  name: string;
  code: string;
  budget: number;
  status: string;
  // ... 其他字段
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  date: string;
  status: string;
  acceptance_criteria?: string;
}
```

#### 3.3.2 需增加的财务字段

```typescript
// src/types/pm-finance.ts - 新增

export interface ProjectFinanceInfo {
  project_id: string;
  project_name: string;
  
  // 合同信息
  contract_no?: string;
  contract_amount: number;
  tax_rate: number;
  tax_amount: number;
  
  // 开票收款
  total_invoiced: number;
  total_received: number;
  pending_invoice: number;
  pending_receipt: number;
  
  // 成本预算
  budget_amount: number;
  budget_labor: number;
  budget_material: number;
  budget_subcontract: number;
  budget_other: number;
  
  // 实际成本
  actual_cost: number;
  actual_labor: number;
  actual_material: number;
  actual_subcontract: number;
  actual_other: number;
  
  // 利润分析
  expected_profit: number;
  actual_profit: number;
  profit_margin: number;
  
  // 状态
  cost_status: 'within_budget' | 'warning' | 'exceeded';
  profit_status: 'profitable' | 'breakeven' | 'loss';
}

export interface ProjectRevenue {
  id: string;
  project_id: string;
  milestone_id?: string;
  
  // 收入确认
  revenue_type: 'milestone' | 'percentage' | 'fixed';
  description: string;
  
  amount: number;
  tax_amount: number;
  total_amount: number;
  
  // 确认条件
  confirmed_date?: string;
  confirmation_criteria?: string;
  
  // 开票
  invoice_no?: string;
  invoice_date?: string;
  invoiced_amount?: number;
  
  // 收款
  received_amount?: number;
  received_date?: string;
  
  // 状态
  status: 'pending' | 'confirmed' | 'invoiced' | 'received';
  
  // 关联凭证
  voucher_id?: string;
}

export interface ProjectCostAllocation {
  id: string;
  project_id: string;
  
  // 成本类型
  cost_type: 'labor' | 'material' | 'subcontract' | 'expense' | 'other';
  
  // 金额
  amount: number;
  
  // 来源
  source_type: 'attendance' | 'purchase' | 'expense' | 'manual';
  source_id?: string;
  
  // 归属
  department_id?: string;
  employee_id?: string;
  supplier_id?: string;
  
  // 描述
  description?: string;
  
  // 关联凭证
  voucher_id?: string;
  voucher_line_id?: string;
  
  created_at: string;
}
```

#### 3.3.3 API调整

```typescript
// src/api/pm-finance.ts - 新增

export const pmFinanceApi = {
  // 项目财务信息
  getProjectFinanceInfo: (projectId: string) =>
    pmClient.get(`/api/v1/pm/projects/${projectId}/finance`),
  
  updateProjectFinanceInfo: (projectId: string, data: Partial<ProjectFinanceInfo>) =>
    pmClient.put(`/api/v1/pm/projects/${projectId}/finance`, data),
  
  // 成本预算
  setProjectBudget: (projectId: string, data: {
    budget_labor: number;
    budget_material: number;
    budget_subcontract: number;
    budget_other: number;
  }) => pmClient.put(`/api/v1/pm/projects/${projectId}/budget`, data),
  
  // 成本归集
  getCostAllocations: (params: { project_id: string; period?: string }) =>
    pmClient.get('/api/v1/pm/cost-allocations', { params }),
  
  manualAllocateCost: (data: ProjectCostAllocation) =>
    pmClient.post('/api/v1/pm/cost-allocations', data),
  
  // 收入确认
  getProjectRevenues: (projectId: string) =>
    pmClient.get(`/api/v1/pm/projects/${projectId}/revenues`),
  
  confirmRevenue: (revenueId: string, data: { confirmed_date: string }) =>
    pmClient.post(`/api/v1/pm/revenues/${revenueId}/confirm`, data),
  
  // 发票开具
  createProjectInvoice: (data: {
    project_id: string;
    milestone_id?: string;
    amount: number;
    tax_rate: number;
  }) => pmClient.post('/api/v1/pm/revenues/generate-invoice', data),
  
  // 项目利润表
  getProjectProfitReport: (projectIds: string[]) =>
    pmClient.get('/api/v1/pm/reports/project-profit', { 
      params: { project_ids: projectIds } 
    }),
  
  // 项目成本明细
  getProjectCostDetail: (projectId: string, params: { start_date?: string; end_date?: string }) =>
    pmClient.get(`/api/v1/pm/projects/${projectId}/cost-detail`, { params }),
};
```

#### 3.3.4 页面调整

```typescript
// src/pages/pm/ProjectFinanceTab.tsx - 新增

export const ProjectFinanceTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { data: financeInfo, isLoading } = useQuery({
    queryKey: ['project-finance', projectId],
    queryFn: () => pmFinanceApi.getProjectFinanceInfo(projectId),
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'cost' | 'revenue'>('overview');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">财务概览</TabsTrigger>
          <TabsTrigger value="cost">成本明细</TabsTrigger>
          <TabsTrigger value="revenue">收入确认</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-4 gap-4">
            {/* 收入 */}
            <Card>
              <CardHeader>合同金额</CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{formatCurrency(financeInfo?.contract_amount)}
                </div>
                <div className="text-sm text-gray-500">
                  税额: ¥{formatCurrency(financeInfo?.tax_amount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>已开票</CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ¥{formatCurrency(financeInfo?.total_invoiced)}
                </div>
                <Progress 
                  value={(financeInfo?.total_invoiced / financeInfo?.contract_amount) * 100} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>已收款</CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ¥{formatCurrency(financeInfo?.total_received)}
                </div>
                <Progress 
                  value={(financeInfo?.total_received / financeInfo?.total_invoiced) * 100} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>项目利润</CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (financeInfo?.actual_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ¥{formatCurrency(financeInfo?.actual_profit)}
                </div>
                <div className="text-sm">
                  利润率: {(financeInfo?.profit_margin * 100).toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 预算执行 */}
          <Card className="mt-4">
            <CardHeader>预算执行情况</CardHeader>
            <CardContent>
              <BudgetExecutionChart
                budget={{
                  labor: financeInfo?.budget_labor,
                  material: financeInfo?.budget_material,
                  subcontract: financeInfo?.budget_subcontract,
                  other: financeInfo?.budget_other,
                }}
                actual={{
                  labor: financeInfo?.actual_labor,
                  material: financeInfo?.actual_material,
                  subcontract: financeInfo?.actual_subcontract,
                  other: financeInfo?.actual_other,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <ProjectCostTable projectId={projectId} />
        </TabsContent>

        <TabsContent value="revenue">
          <ProjectRevenueTable projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

---

### 3.4 CRM模块调整

#### 3.4.1 现有数据结构

```typescript
// src/api/crm.ts - 现有接口
export interface Customer {
  id: string;
  name: string;
  industry?: string;
  // ... 其他字段
}

export interface Opportunity {
  id: string;
  name: string;
  customer_id: string;
  value: number;
  stage: string;
}
```

#### 3.4.2 需增加的财务字段

```typescript
// src/types/crm-finance.ts - 新增

export interface CustomerFinanceInfo {
  customer_id: string;
  customer_name: string;
  
  // 银行账户
  bank_name?: string;
  bank_account?: string;
  account_name?: string;
  
  // 税务信息
  tax_number?: string;
  invoice_title?: string;
  invoice_type: 'normal' | 'special';
  
  // 信用管理
  credit_limit: number;
  credit_term_days: number;
  credit_used: number;
  
  // 应收款
  accounts_receivable: number;
  overdue_receivable: number;
  avg_collection_days: number;
  
  // 交易统计
  total_sales: number;
  total_received: number;
  last_transaction_date?: string;
  
  // 状态
  status: 'normal' | 'blocked' | 'inactive';
}

export interface SalesInvoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name: string;
  
  // 关联信息
  opportunity_id?: string;
  project_id?: string;
  contract_id?: string;
  
  // 金额
  amount: number;
  tax_amount: number;
  total_amount: number;
  received_amount: number;
  
  // 发票信息
  invoice_date: string;
  due_date: string;
  
  // 状态
  status: 'draft' | 'issued' | 'partially_received' | 'received' | 'overdue';
  overdue_days?: number;
  
  // 关联凭证
  voucher_id?: string;
}

export interface CollectionPlan {
  id: string;
  plan_no: string;
  customer_id: string;
  
  // 计划信息
  plan_amount: number;
  plan_date: string;
  actual_amount?: number;
  actual_date?: string;
  
  // 关联发票
  invoice_ids: string[];
  
  // 状态
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  
  // 备注
  remark?: string;
}
```

#### 3.4.3 API调整

```typescript
// src/api/crm-finance.ts - 新增

export const crmFinanceApi = {
  // 客户财务信息
  getCustomerFinanceInfo: (customerId: string) =>
    crmClient.get(`/api/v1/crm/customers/${customerId}/finance`),
  
  updateCustomerFinanceInfo: (customerId: string, data: Partial<CustomerFinanceInfo>) =>
    crmClient.put(`/api/v1/crm/customers/${customerId}/finance`, data),
  
  // 销售发票
  getSalesInvoices: (params: SalesInvoiceQueryParams) =>
    crmClient.get('/api/v1/crm/invoices', { params }),
  
  createSalesInvoice: (data: CreateSalesInvoiceRequest) =>
    crmClient.post('/api/v1/crm/invoices', data),
  
  // 应收款
  getAccountsReceivable: (params: {
    company_id: string;
    customer_ids?: string[];
    status?: string[];
  }) => crmClient.get('/api/v1/crm/accounts-receivable', { params }),
  
  // 收款认领
  createCollection: (data: {
    customer_id: string;
    amount: number;
    collection_date: string;
    invoice_ids?: string[];
    bank_account_id: string;
    remark?: string;
  }) => crmClient.post('/api/v1/crm/collections', data),
  
  // 收款计划
  getCollectionPlans: (params: { customer_id: string }) =>
    crmClient.get('/api/v1/crm/collection-plans', { params }),
  
  createCollectionPlan: (data: CollectionPlan) =>
    crmClient.post('/api/v1/crm/collection-plans', data),
  
  // 生成销售凭证
  generateSalesVoucher: (invoiceIds: string[]) =>
    crmClient.post('/api/v1/crm/invoices/generate-voucher', { invoice_ids: invoiceIds }),
};
```

---

### 3.5 QMS/LIMS/EHS模块调整

#### 3.5.1 质量成本整合

```typescript
// src/types/qms-finance.ts - 新增

export interface QualityCost {
  id: string;
  period: string;
  company_id: string;
  
  // 预防成本
  prevention_cost: {
    training: number;           // 培训费
    quality_planning: number;    // 质量规划
    quality_audit: number;      // 质量审核
    quality_improvement: number; // 质量改进
    total: number;
  };
  
  // 鉴定成本
  appraisal_cost: {
    inspection: number;          // 检验费
    testing: number;            // 测试费
    measurement: number;         // 计量费
    laboratory: number;          // 实验室
    total: number;
  };
  
  // 内部损失
  internal_loss_cost: {
    scrap: number;              // 报废
    rework: number;             // 返工
    downgrade: number;          // 降级
    analysis: number;           // 原因分析
    total: number;
  };
  
  // 外部损失
  external_loss_cost: {
    warranty: number;           //  warranty
    complaint: number;          // 投诉处理
    return: number;             // 退货
    penalty: number;            // 罚款
    total: number;
  };
  
  // 合计
  total_cost: number;
  
  // 关联凭证
  voucher_id?: string;
  
  created_at: string;
}

export interface QualityCostReport {
  period: string;
  company_id: string;
  
  // 成本构成
  items: {
    category: string;
    item: string;
    amount: number;
    percentage: number;
    trend: number;  // 环比趋势
  }[];
  
  // 汇总
  total_cost: number;
  cost_to_revenue: number;     // 质量成本率
  cost_to_profit: number;       // 质量损失率
  
  // 同比环比
  yoy_change: number;
  mom_change: number;
}
```

#### 3.5.2 API调整

```typescript
// src/api/qms-finance.ts - 新增

export const qmsFinanceApi = {
  // 质量成本统计
  getQualityCosts: (params: {
    period: string;
    company_id: string;
    department_id?: string;
  }) => qmsClient.get('/api/v1/qms/quality-costs', { params }),
  
  calculateQualityCost: (params: {
    period: string;
    company_id: string;
  }) => qmsClient.post('/api/v1/qms/quality-costs/calculate', params),
  
  // 质量成本报表
  getQualityCostReport: (params: {
    start_period: string;
    end_period: string;
    company_id: string;
    group_by: 'category' | 'department' | 'product';
  }) => qmsClient.get('/api/v1/qms/reports/quality-cost', { params }),
  
  // 质检费用关联
  linkInspectionCost: (data: {
    inspection_id: string;
    voucher_id: string;
    voucher_line_id: string;
    cost_amount: number;
  }) => qmsClient.post('/api/v1/qms/inspection-costs/link', data),
};
```

---

## 四、外部ERP系统集成

### 4.1 集成架构

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              外部ERP系统集成架构                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              集成中间层 (Integration Layer)                           │   │
│  │                                                                                      │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │   │   API Gateway   │  │   Message Hub   │  │  Integration    │                   │   │
│  │   │   统一入口       │  │   消息中心      │  │  Engine         │                   │   │
│  │   │                 │  │                │  │  集成引擎       │                   │   │
│  │   │ • 路由分发       │  │ • 异步消息     │  │ • 数据转换     │                   │   │
│  │   │ • 认证鉴权       │  │ • 消息队列     │  │ • 字段映射     │                   │   │
│  │   │ • 限流熔断       │  │ • 消息重试     │  │ • 规则引擎     │                   │   │
│  │   │ • 监控日志       │  │ • 死信队列     │  │ • 异常处理     │                   │   │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘                   │   │
│  │                                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              适配器层 (Adapter Layer)                               │   │
│  │                                                                                      │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │   │
│  │   │  Kingdee适配器  │  │  Yonyou适配器   │  │   SAP适配器    │  │  自定义适配器 │ │   │
│  │   │                 │  │                 │  │                │  │               │ │   │
│  │   │ • K3 Cloud API │  │ • U8 API       │  │ • RFC/BAPI    │  │ • REST API   │ │   │
│  │   │ • 金蝶云星辰    │  │ • NC Cloud API │  │ • IDoc        │  │ • WebService │ │   │
│  │   │ • 金蝶EAS      │  │               │  │ • OData       │  │ • 文件导入   │ │   │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘  └───────────────┘ │   │
│  │                                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              外部系统 (External Systems)                             │   │
│  │                                                                                      │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │   │   金蝶 K3/云     │  │   用友 U8/NC    │  │   SAP S/4HANA  │                   │   │
│  │   │                 │  │                 │  │                │                   │   │
│  │   │ • 财务总账      │  │ • 总账模块     │  │ • FI/CO模块   │                   │   │
│  │   │ • 应收应付      │  │ • 应收应付     │  │ • MM模块      │                   │   │
│  │   │ • 固定资产      │  │ • 固定资产     │  │ • SD模块      │                   │   │
│  │   │ • 工资管理      │  │ • 工资管理     │  │ • PP模块      │                   │   │
│  │   │ • 库存管理      │  │ • 库存管理     │  │               │                   │   │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘                   │   │
│  │                                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 集成接口设计

#### 4.2.1 统一集成接口

```typescript
// src/types/integration/external-erp.ts

/**
 * 外部ERP系统配置
 */
export interface ExternalErpConfig {
  id: string;
  name: string;                   // 系统名称
  type: ExternalErpType;         // 系统类型
  version: string;               // 版本
  
  // 连接信息
  endpoint: string;              // API地址
  api_key?: string;              // API Key
  username?: string;              // 用户名
  password?: string;             // 密码 (加密存储)
  client_id?: string;            // OAuth Client ID
  client_secret?: string;        // OAuth Client Secret
  
  // 连接设置
  timeout: number;               // 超时时间(ms)
  retry_times: number;           // 重试次数
  retry_delay: number;           // 重试延迟(ms)
  
  // 同步设置
  sync_enabled: boolean;          // 是否启用同步
  sync_direction: 'bidirectional' | 'import_only' | 'export_only';
  sync_interval: number;          // 同步间隔(分钟)
  last_sync_at?: string;          // 上次同步时间
  
  // 状态
  status: 'active' | 'inactive' | 'error';
  error_message?: string;
  
  created_at: string;
  updated_at: string;
}

export type ExternalErpType = 
  | 'kingdee_k3'           // 金蝶K3
  | 'kingdee_cloud'        // 金蝶云星空
  | 'kingdee_eas'          // 金蝶EAS
  | 'yonyou_u8'            // 用友U8
  | 'yonyou_nc'            // 用友NC
  | 'sap_s4'               // SAP S/4HANA
  | '用友U9'               // 用友U9
  | '浪潮GS'               // 浪潮GS
  | 'custom';              // 自定义

/**
 * 数据同步任务
 */
export interface SyncTask {
  id: string;
  config_id: string;             // 外部ERP配置ID
  task_name: string;             // 任务名称
  task_type: SyncTaskType;       // 任务类型
  
  // 同步范围
  sync_objects: SyncObject[];     // 同步对象
  
  // 同步规则
  sync_mode: 'full' | 'incremental' | 'realtime';
  conflict_strategy: 'source_wins' | 'target_wins' | 'manual';
  
  // 映射规则
  field_mappings: FieldMapping[];
  
  // 调度
  schedule_type: 'manual' | 'scheduled' | 'triggered';
  cron_expression?: string;
  trigger_event?: string;
  
  // 执行状态
  status: 'idle' | 'running' | 'completed' | 'failed';
  last_run_at?: string;
  last_run_duration?: number;
  last_run_result?: SyncResult;
  
  created_at: string;
  updated_at: string;
}

export type SyncTaskType =
  | 'customer'              // 客户
  | 'supplier'              // 供应商
  | 'employee'              // 员工
  | 'voucher'               // 凭证
  | 'invoice'               // 发票
  | 'inventory'             // 库存
  | 'asset'                 // 固定资产
  | 'bank_transaction';     // 银行交易

export interface SyncObject {
  name: string;               // 对象名称
  source_entity: string;      // 源实体
  target_entity: string;     // 目标实体
  enabled: boolean;
}

export interface FieldMapping {
  source_field: string;      // 源字段
  target_field: string;      // 目标字段
  transform_type: 'direct' | 'constant' | 'expression' | 'lookup';
  transform_value?: string;  // 转换值或表达式
  lookup_table?: string;     // 查找表
  default_value?: any;
}

export interface SyncResult {
  success: boolean;
  total_records: number;
  created_records: number;
  updated_records: number;
  deleted_records: number;
  failed_records: number;
  errors: SyncError[];
  duration: number;          // 耗时(ms)
}

export interface SyncError {
  record_id: string;
  error_type: 'validation' | 'mapping' | 'api' | 'unknown';
  error_message: string;
  source_data?: any;
}
```

#### 4.2.2 金蝶K3 Cloud API

```typescript
// src/integration/adapters/kingdee.ts

/**
 * 金蝶K3 Cloud适配器
 */
export class KingdeeAdapter implements ErpAdapter {
  private config: ExternalErpConfig;
  private httpClient: AxiosInstance;

  constructor(config: ExternalErpConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout,
    });
  }

  // 认证
  async authenticate(): Promise<string> {
    const response = await this.httpClient.post('/api/v1/auth/login', {
      username: this.config.username,
      password: this.config.password,
    });
    return response.data.access_token;
  }

  // 获取科目
  async getAccounts(params: { page: number; pageSize: number }): Promise<PaginatedResult<KingdeeAccount>> {
    const token = await this.authenticate();
    const response = await this.httpClient.get('/api/v1/bd/materials', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return this.transformAccounts(response.data);
  }

  // 获取客户
  async getCustomers(params: { page: number; pageSize: number }): Promise<PaginatedResult<KingdeeCustomer>> {
    const token = await this.authenticate();
    const response = await this.httpClient.get('/api/v1/crm/customers', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return this.transformCustomers(response.data);
  }

  // 获取供应商
  async getSuppliers(params: { page: number; pageSize: number }): Promise<PaginatedResult<KingdeeSupplier>> {
    const token = await this.authenticate();
    const response = await this.httpClient.get('/api/v1/ap/suppliers', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return this.transformSuppliers(response.data);
  }

  // 获取凭证
  async getVouchers(params: {
    start_date: string;
    end_date: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<KingdeeVoucher>> {
    const token = await this.authenticate();
    const response = await this.httpClient.get('/api/v1/gl/vouchers', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return this.transformVouchers(response.data);
  }

  // 创建凭证
  async createVoucher(voucher: CreateVoucherRequest): Promise<string> {
    const token = await this.authenticate();
    const kingdeeVoucher = this.transformToKingdeeFormat(voucher);
    const response = await this.httpClient.post('/api/v1/gl/vouchers', kingdeeVoucher, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.FVoucherId;
  }

  // 获取员工
  async getEmployees(params: { page: number; pageSize: number }): Promise<PaginatedResult<KingdeeEmployee>> {
    const token = await this.authenticate();
    const response = await this.httpClient.get('/api/v1/hr/employees', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return this.transformEmployees(response.data);
  }

  // 获取固定资产
  async getFixedAssets(params: { page: number; pageSize: number }): Promise<PaginatedResult<KingdeeAsset>> {
    const token = await this.authenticate();
    const response = await this.httpClient.get('/api/v1/fa/assets', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return this.transformAssets(response.data);
  }

  // 数据转换方法
  private transformAccounts(data: any): PaginatedResult<KingdeeAccount> {
    return {
      items: data.List.map((item: any) => ({
        id: item.FAccountID,
        code: item.FNumber,
        name: item.FName_L1,
        full_name: item.FDescription,
        account_type: this.mapAccountType(item.FAccountProperty),
        parent_id: item.FParentID,
      })),
      total: data.TotalCount,
      page: data.PageIndex,
      pageSize: data.PageSize,
    };
  }

  private transformCustomers(data: any): PaginatedResult<KingdeeCustomer> {
    return {
      items: data.List.map((item: any) => ({
        id: item.FCustomerID,
        code: item.FNumber,
        name: item.FName_L1,
        short_name: item.FShortName,
        contact: item.FContact,
        phone: item.FPhone,
        address: item.FAddress,
        tax_number: item.FTaxNum,
        bank_account: item.FBank,
      })),
      total: data.TotalCount,
      page: data.PageIndex,
      pageSize: data.PageSize,
    };
  }

  private transformVouchers(data: any): PaginatedResult<KingdeeVoucher> {
    return {
      items: data.List.map((item: any) => ({
        id: item.FVoucherId,
        voucher_no: item.FVoucherNo,
        date: item.FDate,
        period: item.FPeriod,
        creator: item.FCreatorName,
        approver: item.FApproverName,
        status: this.mapVoucherStatus(item.FDocumentStatus),
        total_amount: item.FTotalAmountFor,
        entries: item.FEntity.map((entry: any) => ({
          account_id: entry.FAccountID,
          account_code: entry.FAccountNumber,
          account_name: entry.FAccountName,
          debit: entry.FDebitAmountFor,
          credit: entry.FCreditAmountFor,
          description: entry.FExplanation,
          department: entry.FDeptID_Name,
          project: entry.FProfitCenterID_Name,
        })),
      })),
      total: data.TotalCount,
      page: data.PageIndex,
      pageSize: data.PageSize,
    };
  }

  private transformToKingdeeFormat(voucher: CreateVoucherRequest): any {
    return {
      FDate: voucher.voucher_date,
      FPeriod: voucher.period,
      FExplanation: voucher.summary,
      FEntity: voucher.items.map((item, index) => ({
        FSeq: index + 1,
        FAccountID: item.subject_id,
        FDebitAmountFor: item.debit_amount || 0,
        FCreditAmountFor: item.credit_amount || 0,
        FExplanation: item.summary,
        FDepartmentID: item.department_id,
        FProfitCenterID: item.project_id,
      })),
    };
  }
}
```

#### 4.2.3 用友U8 API

```typescript
// src/integration/adapters/yonyou.ts

/**
 * 用友U8适配器
 */
export class YonyouAdapter implements ErpAdapter {
  private config: ExternalErpConfig;
  private session: string | null = null;

  constructor(config: ExternalErpConfig) {
    this.config = config;
  }

  // 登录认证
  async authenticate(): Promise<string> {
    const response = await axios.post(`${this.config.endpoint}/u8api/login`, {
      account: this.config.username,
      password: this.config.password,
    });
    this.session = response.data.session_id;
    return this.session;
  }

  // 获取科目档案
  async getAccounts(params: { page: number; pageSize: number }): Promise<PaginatedResult<YonyouAccount>> {
    const token = await this.authenticate();
    const response = await axios.post(
      `${this.config.endpoint}/u8api/account/query`,
      {
        page: params.page,
        pagesize: params.pageSize,
      },
      { headers: { Authorization: this.session } }
    );
    return this.transformAccounts(response.data);
  }

  // 获取客户档案
  async getCustomers(params: { page: number; pageSize: number }): Promise<PaginatedResult<YonyouCustomer>> {
    const token = await this.authenticate();
    const response = await axios.post(
      `${this.config.endpoint}/u8api/customer/query`,
      { page: params.page, pagesize: params.pageSize },
      { headers: { Authorization: this.session } }
    );
    return this.transformCustomers(response.data);
  }

  // 获取凭证
  async getVouchers(params: {
    start_date: string;
    end_date: string;
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<YonyouVoucher>> {
    const token = await this.authenticate();
    const response = await axios.post(
      `${this.config.endpoint}/u8api/voucher/query`,
      {
        date_begin: params.start_date,
        date_end: params.end_date,
        page: params.page,
        pagesize: params.pageSize,
      },
      { headers: { Authorization: this.session } }
    );
    return this.transformVouchers(response.data);
  }

  // 创建凭证
  async createVoucher(voucher: CreateVoucherRequest): Promise<string> {
    const token = await this.authenticate();
    const yonyouVoucher = this.transformToYonyouFormat(voucher);
    const response = await axios.post(
      `${this.config.endpoint}/u8api/voucher/add`,
      yonyouVoucher,
      { headers: { Authorization: this.session } }
    );
    return response.data.voucher_id;
  }

  // 批量创建凭证
  async batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<BatchCreateResult> {
    const token = await this.authenticate();
    const yonyouVouchers = vouchers.map(v => this.transformToYonyouFormat(v));
    const response = await axios.post(
      `${this.config.endpoint}/u8api/voucher/batchadd`,
      { vouchers: yonyouVouchers },
      { headers: { Authorization: this.session } }
    );
    return response.data;
  }

  private transformAccounts(data: any): PaginatedResult<YonyouAccount> {
    return {
      items: data.account_list.map((item: any) => ({
        id: item.acc_id,
        code: item.acc_num,
        name: item.acc_name,
        full_name: item.acc_name_full,
        account_type: this.mapAccountType(item.acc_type),
        parent_code: item.acc_num_parent,
        level: item.acc_level,
      })),
      total: data.total_count,
      page: data.page_index,
      pageSize: data.page_size,
    };
  }

  private transformVouchers(data: any): PaginatedResult<YonyouVoucher> {
    return {
      items: data.voucher_list.map((item: any) => ({
        id: item.vouch_id,
        voucher_no: item.vouch_no,
        date: item.vouch_date,
        period: item.vouch_period,
        maker: item.maker,
        auditor: item.auditor,
        status: this.mapVoucherStatus(item.vouch_state),
        total_debit: item.debit_sum,
        total_credit: item.credit_sum,
        entries: item.entry_list.map((entry: any) => ({
          account_code: entry.acc_num,
          account_name: entry.acc_name,
          debit: entry.debit,
          credit: entry.credit,
          summary: entry.explanation,
          department: entry.dept_name,
          person: entry.person_name,
          project: entry.project_name,
        })),
      })),
      total: data.total_count,
      page: data.page_index,
      pageSize: data.page_size,
    };
  }

  private transformToYonyouFormat(voucher: CreateVoucherRequest): any {
    return {
      vouch_type: '记',
      date: voucher.voucher_date,
      period: voucher.period,
      explanation: voucher.summary,
      entry_list: voucher.items.map((item, index) => ({
        line_no: index + 1,
        acc_num: item.subject_code,
        debit: item.debit_amount || 0,
        credit: item.credit_amount || 0,
        explanation: item.summary,
        dept_num: item.department_id,
        person_name: item.employee_id,
        project_num: item.project_id,
      })),
    };
  }
}
```

#### 4.2.4 SAP S/4HANA API

```typescript
// src/integration/adapters/sap.ts

/**
 * SAP S/4HANA适配器
 */
export class SapAdapter implements ErpAdapter {
  private config: ExternalErpConfig;
  private destination: string;  // SAP RFC Destination

  constructor(config: ExternalErpConfig) {
    this.config = config;
    this.destination = config.endpoint;
  }

  // 通过SAP Gateway (OData)获取数据
  async getAccounts(params: { $skip: number; $top: number }): Promise<PaginatedResult<SapAccount>> {
    const response = await axios.get(`${this.config.endpoint}/sap/opu/odata/sap/API_GLACCOUNTHierarchy`, {
      params: {
        $select: 'GLAccount,GLAccountHierarchyName,GLAccountName',
        $skip: params.$skip,
        $top: params.$top,
      },
      headers: await this.getAuthHeaders(),
    });

    return this.transformAccounts(response.data.d.results);
  }

  // 通过BAPI创建凭证 (SAP推荐方式)
  async createVoucher(voucher: CreateVoucherRequest): Promise<string> {
    const token = await this.getAuthHeaders();
    
    // 构建BAPI参数
    const bapiParams = {
      DOCUMENTHEADER: {
        DOC_TYPE: 'SA',           // 凭证类型: SA-总账凭证
        DOC_DATE: voucher.voucher_date,
        PSTNG_DATE: voucher.voucher_date,
        FISCAL_YEAR: moment(voucher.voucher_date).year(),
        PERIOD: moment(voucher.voucher_date).month() + 1,
        HEADER_TXT: voucher.summary,
        USERNAME: this.config.username,
      },
      ACCOUNTGL: voucher.items.map((item, index) => ({
        ITEMNO_ACC: String(index * 10 + 1),
        GL_ACCOUNT: item.subject_code,
        BUS_ACTIVITY: '',
        COSTCENTER: item.department_id,
        PROFIT_CTR: item.project_id,
        VALUE_DATE: voucher.voucher_date,
        ITEM_TEXT: item.summary,
      })),
      CURRENCYAMOUNT: voucher.items.flatMap((item, index) => [
        {
          ITEMNO_ACC: String(index * 10 + 1),
          CURRENCY: 'CNY',
          AMT_DOCCUR: item.debit_amount || 0,
          AMT_BASE: item.debit_amount ? 0 : undefined,
          EXCH_RATE: 1,
        },
        {
          ITEMNO_ACC: String(index * 10 + 1),
          CURRENCY: 'CNY',
          AMT_DOCCUR: item.credit_amount ? -item.credit_amount : 0,
          AMT_BASE: item.credit_amount ? 0 : undefined,
          EXCH_RATE: 1,
        },
      ]).filter(item => item.AMT_DOCCUR !== undefined),
    };

    // 调用BAPI
    const response = await axios.post(
      `${this.config.endpoint}/sap/bc/rest/ygl/bapi_acc_document_post`,
      bapiParams,
      { headers: token }
    );

    if (response.data.RETURN.some((msg: any) => msg.TYPE === 'E')) {
      throw new Error(response.data.RETURN.find((msg: any) => msg.TYPE === 'E').MESSAGE);
    }

    // 提交事务
    await axios.post(
      `${this.config.endpoint}/sap/bc/rest/ygl/bapi_transaction_commit`,
      {},
      { headers: token }
    );

    return response.data.DOCUMENT_NO;
  }

  // 获取科目余额 (通过 IDoc)
  async getAccountBalances(params: {
    fiscal_year: string;
    chart_of_account: string;
  }): Promise<SapAccountBalance[]> {
    const response = await axios.post(
      `${this.config.endpoint}/sap/bc/rest/ygl/idoc/gl_balance`,
      {
        IDOC: {
          CONTROL_RECORD: {
            MANDT: this.config.username,
            DOCNUM: '0',
            DIRECT: '2',
            IFTYP: 'GLBLA',
          },
          DATA_RECORD: {
            GJAHR: params.fiscal_year,
            RCLNT: '100',
            BUKRS: params.chart_of_account,
          },
        },
      },
      { headers: await this.getAuthHeaders() }
    );

    return this.transformBalances(response.data.IDOC.DATA_RECORDS);
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    // SAP Basic Auth / OAuth2
    return {
      'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private transformAccounts(data: any[]): PaginatedResult<SapAccount> {
    return {
      items: data.map(item => ({
        id: item.GLAccount,
        code: item.GLAccount,
        name: item.GLAccountName,
        hierarchy: item.GLAccountHierarchyName,
        type: this.mapSapAccountType(item.GLAccountType),
      })),
      total: data.length,
      page: 1,
      pageSize: data.length,
    };
  }
}
```

### 4.3 集成API设计

```typescript
// src/api/integration.ts

/**
 * 外部ERP集成API
 */
export const integrationApi = {
  // 外部ERP配置
  getConfigs: () =>
    integrationClient.get('/api/v1/integration/configs'),
  
  getConfig: (id: string) =>
    integrationClient.get(`/api/v1/integration/configs/${id}`),
  
  createConfig: (data: ExternalErpConfig) =>
    integrationClient.post('/api/v1/integration/configs', data),
  
  updateConfig: (id: string, data: Partial<ExternalErpConfig>) =>
    integrationClient.put(`/api/v1/integration/configs/${id}`, data),
  
  deleteConfig: (id: string) =>
    integrationClient.delete(`/api/v1/integration/configs/${id}`),
  
  testConnection: (id: string) =>
    integrationClient.post(`/api/v1/integration/configs/${id}/test-connection`, {}),
  
  // 同步任务
  getSyncTasks: (configId: string) =>
    integrationClient.get(`/api/v1/integration/configs/${configId}/tasks`),
  
  createSyncTask: (configId: string, data: SyncTask) =>
    integrationClient.post(`/api/v1/integration/configs/${configId}/tasks`, data),
  
  runSyncTask: (taskId: string) =>
    integrationClient.post(`/api/v1/integration/tasks/${taskId}/run`, {}),
  
  getSyncTaskLogs: (taskId: string) =>
    integrationClient.get(`/api/v1/integration/tasks/${taskId}/logs`),
  
  // 同步历史
  getSyncHistory: (params: {
    config_id?: string;
    task_id?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => integrationClient.get('/api/v1/integration/history', { params }),
  
  // 字段映射
  getFieldMappings: (taskId: string) =>
    integrationClient.get(`/api/v1/integration/tasks/${taskId}/mappings`),
  
  updateFieldMappings: (taskId: string, mappings: FieldMapping[]) =>
    integrationClient.put(`/api/v1/integration/tasks/${taskId}/mappings`, mappings),
  
  // 批量同步
  batchSync: (taskIds: string[]) =>
    integrationClient.post('/api/v1/integration/batch-sync', { task_ids: taskIds }),
  
  // 导出映射模板
  exportMappingTemplate: (taskType: SyncTaskType) =>
    integrationClient.getBlob('/api/v1/integration/templates/mapping', {
      params: { task_type: taskType }
    }),
  
  // 导入映射配置
  importMappingConfig: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return integrationClient.post(`/api/v1/integration/tasks/${taskId}/import-mapping`, formData);
  },
};
```

### 4.4 集成页面设计

```typescript
// src/pages/integration/ExternalErpConfigPage.tsx

export const ExternalErpConfigPage: React.FC = () => {
  const { data: configs, isLoading } = useQuery({
    queryKey: ['external-erp-configs'],
    queryFn: () => integrationApi.getConfigs(),
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">外部ERP系统配置</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加系统
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>系统名称</TableHead>
                <TableHead>系统类型</TableHead>
                <TableHead>API地址</TableHead>
                <TableHead>同步方向</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>上次同步</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.items.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{config.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {config.endpoint}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {config.sync_direction === 'bidirectional' ? '双向同步' :
                       config.sync_direction === 'import_only' ? '仅导入' : '仅导出'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={config.status} />
                  </TableCell>
                  <TableCell>
                    {config.last_sync_at ?
                      formatDateTime(config.last_sync_at) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(config.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSync(config.id)}
                      >
                        <Sync className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// 同步任务配置页面
export const SyncTaskConfigPage: React.FC<{ configId: string }> = ({ configId }) => {
  const { data: tasks } = useQuery({
    queryKey: ['sync-tasks', configId],
    queryFn: () => integrationApi.getSyncTasks(configId),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>同步任务配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks?.map((task) => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{task.task_name}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge>{task.task_type}</Badge>
                      <Badge variant="outline">{task.sync_mode}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditMapping(task.id)}
                    >
                      字段映射
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRunTask(task.id)}
                    >
                      立即同步
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <SyncStatus status={task.status} result={task.last_run_result} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 五、数据流转整合矩阵

### 5.1 模块间数据流转表

| 源模块 | 目标模块 | 数据类型 | 流转方向 | 触发方式 | 说明 |
|--------|---------|---------|---------|---------|------|
| HRM | ERP | 员工档案 | HRM → ERP | 实时/批量 | 工资核算需要员工成本中心 |
| HRM | ERP | 考勤记录 | HRM → ERP | 日结/月结 | 人工成本归集 |
| HRM | ERP | 工资单 | HRM → ERP | 月结 | 生成工资凭证 |
| HRM | ERP | 社保公积金 | HRM → ERP | 月结 | 社保计提凭证 |
| CRM | ERP | 客户档案 | 双向同步 | 实时 | 应收账款的客户维度 |
| CRM | ERP | 销售发票 | CRM → ERP | 开票时 | 应收确认凭证 |
| CRM | ERP | 收款记录 | CRM → ERP | 收款时 | 收款凭证 |
| SRM | ERP | 供应商档案 | 双向同步 | 实时 | 应付账款的供应商维度 |
| SRM | ERP | 采购发票 | SRM → ERP | 收票时 | 应付确认凭证 |
| SRM | ERP | 付款记录 | SRM → ERP | 付款时 | 付款凭证 |
| PM | ERP | 项目档案 | 双向同步 | 实时 | 项目的辅助核算 |
| PM | ERP | 项目成本 | PM → ERP | 日结/月结 | 成本归集凭证 |
| PM | ERP | 里程碑验收 | PM → ERP | 验收时 | 收入确认凭证 |
| QMS | ERP | 质量成本 | QMS → ERP | 月结 | 质量成本凭证 |
| LIMS | ERP | 检测费用 | LIMS → ERP | 月结 | 检测成本凭证 |
| EHS | ERP | 安全费用 | EHS → ERP | 月结 | 安全成本凭证 |
| ERP | HRM | 工资凭证 | ERP → HRM | 过账后 | 更新工资单状态 |
| ERP | CRM | 应收凭证 | ERP → CRM | 过账后 | 更新发票状态 |
| ERP | SRM | 应付凭证 | ERP → SRM | 过账后 | 更新发票状态 |
| ERP | PM | 成本凭证 | ERP → PM | 过账后 | 更新项目成本 |
| ERP | BI | 财务数据 | ERP → BI | 实时 | 报表数据源 |

### 5.2 凭证生成规则矩阵

| 业务类型 | 源模块 | 凭证模板 | 借方科目 | 贷方科目 | 辅助核算 |
|---------|-------|---------|---------|---------|---------|
| 工资发放 | HRM | 工资凭证 | 工资薪金(按部门) | 银行存款 | 部门+员工 |
| 社保计提 | HRM | 社保凭证 | 管理费用-社保(按部门) | 其他应付款 | 部门 |
| 个税代扣 | HRM | 个税凭证 | 工资薪金 | 应交税费 | 部门 |
| 销售开票 | CRM | 销项发票 | 应收账款 | 主营业务收入 | 客户+项目 |
| 销项税额 | CRM | 销项税额 | 应收账款 | 应交税费-销项税 | 客户 |
| 收款认领 | CRM | 收款凭证 | 银行存款 | 应收账款 | 客户 |
| 采购收票 | SRM | 进项发票 | 在途物资/库存商品 | 应付账款 | 供应商+项目 |
| 进项税额 | SRM | 进项税额 | 应交税费-进项税 | 应付账款 | 供应商 |
| 付款申请 | SRM | 付款凭证 | 应付账款 | 银行存款 | 供应商 |
| 项目人工 | PM | 人工成本 | 项目成本-人工 | 应付职工薪酬 | 项目+部门 |
| 项目材料 | PM | 材料成本 | 项目成本-材料 | 原材料 | 项目 |
| 项目分包 | PM | 分包成本 | 项目成本-分包 | 应付账款 | 项目+供应商 |
| 收入确认 | PM | 收入凭证 | 应收账款 | 主营业务收入 | 项目 |
| 资产折旧 | ERP | 折旧凭证 | 管理费用-折旧 | 累计折旧 | 部门+资产 |
| 费用报销 | ERP | 报销凭证 | 管理费用(按类型) | 银行存款/应付账款 | 部门+员工 |

---

## 六、实施计划

### 6.1 阶段一: 基础整合 (6周)

| 周次 | 任务 | 模块 | 交付物 |
|------|------|------|--------|
| 1 | 科目体系扩展 | ERP | 多维度辅助核算科目 |
| 2 | HRM财务字段增加 | HRM | 员工财务信息、工资核算 |
| 3 | SRM财务字段增加 | SRM | 供应商财务信息、应付管理 |
| 4 | PM财务字段增加 | PM | 项目财务信息、成本归集 |
| 5 | CRM财务字段增加 | CRM | 客户财务信息、应收管理 |
| 6 | 凭证模板引擎 | ERP | 自动凭证生成规则配置 |

### 6.2 阶段二: 业务闭环 (6周)

| 周次 | 任务 | 模块 | 交付物 |
|------|------|------|--------|
| 7 | 销售到收款闭环 | CRM+ERP | 发票-应收-收款-凭证 |
| 8 | 采购到付款闭环 | SRM+ERP | 采购-入库-发票-付款 |
| 9 | 员工到薪酬闭环 | HRM+ERP | 考勤-工资-发放-凭证 |
| 10 | 项目到核算闭环 | PM+ERP | 成本归集-收入确认-利润 |
| 11 | 质量成本闭环 | QMS+ERP | 质量成本统计-凭证 |
| 12 | 财务报表完善 | ERP | 三大报表-辅助核算报表 |

### 6.3 阶段三: 外部集成 (6周)

| 周次 | 任务 | 模块 | 交付物 |
|------|------|------|--------|
| 13 | 金蝶适配器开发 | 集成 | KingdeeAdapter |
| 14 | 用友适配器开发 | 集成 | YonyouAdapter |
| 15 | SAP适配器开发 | 集成 | SapAdapter |
| 16 | 同步任务引擎 | 集成 | SyncEngine |
| 17 | 映射规则配置 | 集成 | 字段映射配置界面 |
| 18 | 集成测试与调优 | 集成 | 全流程测试报告 |

### 6.4 阶段四: 合并报表 (4周)

| 周次 | 任务 | 模块 | 交付物 |
|------|------|------|--------|
| 19 | 多公司架构 | ERP | 公司档案-组织架构 |
| 20 | 合并范围管理 | ERP | 合并范围配置 |
| 21 | 抵消规则引擎 | ERP | 内部交易抵消 |
| 22 | 合并报表生成 | ERP | 合并三大报表 |

---

## 七、当前实施状态

### 7.1 已完成实施

#### 财务模块整合

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| PM | 项目财务信息 | `api/pm-finance.ts` | ✅ 完成 |
| PM | 项目成本记录Hook | `hooks/usePmFinance.ts` | ✅ 完成 |
| PM | 项目详情财务Tab | `pages/PmProjectDetailPage.tsx` | ✅ 完成 |
| HRM | HRM财务API | `api/hrm-finance.ts` | ✅ 完成 |
| HRM | 员工财务Hook | `hooks/useHrmFinance.ts` | ✅ 完成 |
| CRM | 客户财务Hook | `hooks/useCrmFinance.ts` | ✅ 完成 |
| CRM | 客户财务API | `api/crm-finance.ts` | ✅ 完成 |
| CRM | 客户详情页面(含财务Tab) | `pages/CustomerDetailPage.tsx` | ✅ 完成 |
| SRM | 供应商财务API | `api/srm-finance.ts` | ✅ 完成 |
| SRM | 供应商财务Hook | `hooks/useSrmFinance.ts` | ✅ 完成 |
| SRM | 供应商详情页面(含财务Tab) | `pages/SupplierDetailPage.tsx` | ✅ 完成 |

#### 外部ERP适配器

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 外部ERP | 类型定义 | `types/external-erp.ts` | ✅ 完成 |
| 外部ERP | 适配器API | `api/external-erp.ts` | ✅ 完成 |
| 外部ERP | React Query Hooks | `hooks/useExternalErp.ts` | ✅ 完成 |
| 外部ERP | 连接管理页面 | `pages/ExternalErpConnectionsPage.tsx` | ✅ 完成 |
| 外部ERP | 映射管理页面 | `pages/ExternalErpMappingPage.tsx` | ✅ 完成 |
| 外部ERP | 映射管理路由 | `routes/professional.ts` | ✅ 完成 |
| 外部ERP | AlertDialog组件 | `components/ui/alert-dialog.tsx` | ✅ 完成 |

#### 凭证模板引擎

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 凭证模板 | 模板API | `api/voucher-template.ts` | ✅ 完成 |
| 凭证模板 | React Query Hooks | `hooks/useVoucherTemplate.ts` | ✅ 完成 |
| 凭证模板 | 模板管理页面 | `pages/VoucherTemplatePage.tsx` | ✅ 完成 |

#### 财务报表

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 财务报表 | 报表API | `api/financial-report.ts` | ✅ 完成 |
| 财务报表 | React Query Hooks | `hooks/useFinancialReport.ts` | ✅ 完成 |
| 财务报表 | 报表查看页面 | `pages/FinancialReportsPage.tsx` | ✅ 完成 |

#### 固定资产管理

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 固定资产 | 资产类别配置 | `pages/FixedAssetManagementPage.tsx` | ✅ 完成 |
| 固定资产 | 折旧方法支持 | `pages/FixedAssetManagementPage.tsx` | ✅ 完成 |
| 固定资产 | 资产状态管理 | `pages/FixedAssetManagementPage.tsx` | ✅ 完成 |
| 固定资产 | 路由配置 | `routes/erp.ts` | ✅ 完成 |

#### 科目与银行账户管理

| 页面 | 路由 | 文件 | 状态 |
|------|------|------|------|
| 客户详情 | `/crm/customers/:id` | `routes/crm.ts` | ✅ 完成 |
| 供应商详情 | `/srm/suppliers/:id` | `routes/professional.ts` | ✅ 完成 |
| 外部ERP映射管理 | `/integration/external-erp/:connectionId/mappings` | `routes/professional.ts` | ✅ 完成 |
| 凭证模板管理 | `/finance/voucher-templates` | `routes/erp.ts` | ✅ 完成 |
| 财务报表查看 | `/finance/financial-reports` | `routes/erp.ts` | ✅ 完成 |
| 科目管理 | `/finance/accounts` | `routes/erp.ts` | ✅ 完成 |
| 银行账户管理 | `/finance/bank-accounts` | `routes/erp.ts` | ✅ 完成 |
| 固定资产管理 | `/finance/fixed-assets` | `routes/erp.ts` | ✅ 完成 |
| 合并范围管理 | `/finance/consolidation/scopes` | `routes/erp.ts` | ✅ 完成 |
| 合并报表查看 | `/finance/consolidation/reports` | `routes/erp.ts` | ✅ 完成 |
| 公司架构管理 | `/finance/company-structure` | `routes/erp.ts` | ✅ 完成 |
| 期初余额管理 | `/finance/opening-balances` | `routes/erp.ts` | ✅ 完成 |

#### 期初余额管理

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 期初余额 | 期初余额页面 | `pages/OpeningBalancePage.tsx` | ✅ 完成 |
| 期初余额 | 期初余额Hook | `hooks/useFinance.ts` | ✅ 完成 |
| 期初余额 | 路由配置 | `routes/erp.ts` | ✅ 完成 |

#### 合并报表管理

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 合并报表 | 合并报表类型定义 | `types/consolidation.ts` | ✅ 完成 |
| 合并报表 | 合并报表API客户端 | `api/consolidation.ts` | ✅ 完成 |
| 合并报表 | React Query Hooks | `hooks/useConsolidation.ts` | ✅ 完成 |
| 合并报表 | 合并范围管理页面 | `pages/ConsolidationScopePage.tsx` | ✅ 完成 |
| 合并报表 | 合并报表查看页面 | `pages/ConsolidationReportsPage.tsx` | ✅ 完成 |
| 合并报表 | 合并范围管理路由 | `routes/erp.ts` | ✅ 完成 |
| 合并报表 | 合并报表查看路由 | `routes/erp.ts` | ✅ 完成 |
| 合并报表 | 数据库Schema定义 | `types/consolidation-schema.ts` | ✅ 完成 |
| 合并报表 | 后端API接口契约 | `api/consolidation-contract.ts` | ✅ 完成 |
| 合并报表 | 公司架构管理页面 | `pages/CompanyStructurePage.tsx` | ✅ 完成 |
| 合并报表 | 公司架构管理路由 | `routes/erp.ts` | ✅ 完成 |

#### 合并报表后端实现 (Rust/Axum)

| 模块 | 功能 | 文件 | 状态 |
|------|------|------|------|
| 合并报表 | 数据库迁移 | `svc/erp/migrations/20260612000001_create_consolidation_schema.sql` | ✅ 完成 |
| 合并报表 | 数据模型 | `svc/erp/src/models/consolidation.rs` | ✅ 完成 |
| 合并报表 | API路由 | `svc/erp/src/api/consolidation.rs` | ✅ 完成 |
| 合并报表 | 模块注册 | `svc/erp/src/models/mod.rs` | ✅ 完成 |
| 合并报表 | 路由注册 | `svc/erp/src/api/mod.rs` | ✅ 完成 |

### 7.2 待实施

- [ ] 数据库迁移执行（需在数据库中运行迁移SQL）
- [ ] 财务数据实际对接（当前为模拟数据）

---

## 八、风险评估与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| 外部ERP接口变更 | 高 | 中 | 建立接口版本管理，预留适配器扩展点 |
| 数据一致性 | 高 | 高 | 事务性消息队列，最终一致性保证 |
| 性能瓶颈 | 中 | 中 | 分批同步，异步处理，缓存优化 |
| 映射规则复杂 | 中 | 中 | 可视化映射配置，规则模板库 |
| 并发冲突 | 低 | 低 | 乐观锁+冲突解决策略 |
| 网络不稳定 | 高 | 低 | 离线缓存，重试机制，死信队列 |

---

## 九、总结

本设计方案完善了以下方面:

1. **全模块覆盖**: HRM、CRM、SRM、PM、QMS、LIMS、EHS等所有业务模块的财务整合
2. **数据闭环**: 建立了业务到财务的完整数据流转通道
3. **外部集成**: 金蝶、用友、SAP等主流ERP系统的标准化集成方案
4. **实施路径**: 详细的分阶段实施计划，便于分步交付

通过本方案的实施，可以实现:
- 业务数据自动生成财务凭证，减少手工录入
- 多维度辅助核算，提供精细化财务分析
- 外部ERP系统无缝对接，保护现有投资
- 多公司合并报表，支持集团化管理
