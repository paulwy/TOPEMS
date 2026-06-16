# TOPEMS 导航与页面布局设计方案

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0.0 |
| **创建日期** | 2026-06-15 |
| **设计原则** | 分层导航 + 严格页面拆分 + 柔和渐变风格 |
| **状态** | 待审批 |

---

## 一、设计目标

1. **首页综合定位**：保持综合首页，通过分区卡片归类展示
2. **严格页面拆分**：每个页面只展示一个核心功能
3. **柔和渐变风格**：使用柔和渐变色，避免强烈对比
4. **完整公共组件**：新增树状目录、进度条、甘特图、步骤器等
5. **统一布局规范**：页面必须元素、导航关系、响应式适配统一设计

---

## 二、首页设计

### 2.1 首页分区结构

首页保持综合定位，通过分区卡片归类展示：

```
┌─────────────────────────────────────────────────────┐
│  👋 欢迎回来，用户！上午好                            │
├─────────────────────────────────────────────────────┤
│  📊 今日概览（4个统计卡片）                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │待审批│ │待处理│ │在线服务│ │文件数量│            │
│  └─────┘ └─────┘ └─────┘ └─────┘                    │
├─────────────────────────────────────────────────────┤
│  🚀 快捷入口（可折叠）                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ 📄文档  │ │ 🤖AI    │ │ 🔄工作流│ │ 📋项目  │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
├─────────────────────────────────────────────────────┤
│  📋 待办事项（Tab切换）                              │
│  ┌─────────────────────────────────────────────────┐│
│  │ 待审批 │ 待处理 │ 待跟进 │                       ││
│  ├─────────────────────────────────────────────────┤│
│  │ 任务列表...                                     ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  🏢 模块导航（分组卡片）                             │
│  ┌─────────────────────────────────────────────────┐│
│  │ 核心业务: HRM │ CRM │ PM │ Finance │ Flow │ BI ││
│  │ 运营管理: 资产 │ 设备 │ 行政 │ 车辆 │ 会议室    ││
│  │ 研发创新: LIMS │ RS │ PDM                        ││
│  │ 质量安全: QMS │ EHS │ GIS                        ││
│  │ 协作沟通: IM │ Mail │ Docs │ AI                 ││
│  │ 系统管理: 用户 │ 角色 │ 权限 │ 通知 │ 集成      ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  🟢 服务状态监测（紧凑卡片）                         │
│  ┌─────────────────────────────────────────────────┐│
│  │ ✅IAM ✅HRM ✅CRM ✅PM ✅ERP ✅Flow ✅AI ✅Doc   ││
│  │ ✅RS  ✅LIMS ✅QMS ✅EHS ✅GIS ✅IM  ✅Mail ✅BI  ││
│  │ ⚠️SRM ✅PDM ✅MES ✅WMS ✅SCM ✅Portal           ││
│  │ 🔄30秒刷新 │ 23在线 1异常                       ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  📈 最近活动                                        │
│  ┌─────────────────────────────────────────────────┐│
│  │ 活动列表...                                     ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 2.2 首页入口简化

将原来的 **6个入口** 简化为 **1个入口**：

| 原入口 | 新入口 | 说明 |
|--------|--------|------|
| `/dashboard` | `/dashboard` | 首页唯一入口 |
| `/dashboard/recent` | 首页内"最近活动"区 | 合并到首页 |
| `/dashboard/shortcuts` | 首页内"快捷入口"区 | 合并到首页 |
| `/dashboard/tasks` | 首页内"待办事项"Tab | 合并到首页 |
| `/dashboard/followups` | 首页内"待办事项"Tab | 合并到首页 |
| `/flow/approvals` | 首页内"待办事项"Tab | 合并到首页 |

### 2.3 服务状态监测设计

**位置：** 模块导航下方，紧凑卡片形式

**状态指示：**
- ✅ 正常 - 绿色柔和渐变 `#22c55e → #16a34a`
- ⚠️ 异常 - 橙色柔和渐变 `#f59e0b → #d97706`
- ❌ 离线 - 红色柔和渐变 `#ef4444 → #dc2626`

**交互功能：**
- 自动刷新（30秒间隔）
- 手动刷新按钮
- 异常服务高亮提示
- 点击服务卡片可查看详情

---

## 三、导航分组配置

### 3.1 Header全局导航

```typescript
const topNavItems = [
  { label: "首页", path: "/dashboard" },  // 唯一入口，不展开
  {
    label: "人力",
    path: "/hrm",
    isGroup: true,
    children: [
      { label: "概览", path: "/hrm" },
      { label: "人事管理", children: [
        { label: "员工列表", path: "/hrm/employees" },
        { label: "合同管理", path: "/hrm/contracts" },
      ]},
      { label: "组织管理", children: [
        { label: "公司管理", path: "/hrm/companies" },
        { label: "部门管理", path: "/hrm/departments" },
        { label: "岗位管理", path: "/hrm/positions" },
      ]},
      { label: "考勤管理", children: [
        { label: "考勤记录", path: "/hrm/attendance" },
        { label: "请假管理", path: "/hrm/leave" },
      ]},
      { label: "薪酬绩效", children: [
        { label: "薪酬管理", path: "/hrm/payroll" },
        { label: "绩效管理", path: "/hrm/performance" },
      ]},
      { label: "人才发展", children: [
        { label: "招聘管理", path: "/hrm/recruitment" },
        { label: "培训管理", path: "/hrm/training" },
      ]},
    ],
  },
  {
    label: "客户",
    path: "/crm",
    isGroup: true,
    children: [
      { label: "概览", path: "/crm" },
      { label: "客户关系", children: [
        { label: "客户列表", path: "/crm/customers" },
        { label: "商机列表", path: "/crm/opportunities" },
        { label: "联系人", path: "/crm/contacts" },
        { label: "交互记录", path: "/crm/interactions" },
      ]},
      { label: "销售分析", children: [
        { label: "客户评分", path: "/crm/scoring" },
        { label: "销售预测", path: "/crm/forecast" },
      ]},
    ],
  },
  {
    label: "项目",
    path: "/pm",
    isGroup: true,
    children: [
      { label: "概览", path: "/pm" },
      { label: "项目管理", children: [
        { label: "项目列表", path: "/pm/projects" },
      ]},
      { label: "合同与报表", children: [
        { label: "合同列表", path: "/pm/contracts" },
        { label: "模板库", path: "/pm/templates" },
        { label: "项目报表", path: "/pm/reports" },
      ]},
    ],
  },
  {
    label: "数据",
    path: "/bi",
    isGroup: true,
    children: [
      { label: "概览", path: "/bi/dashboard" },
      { label: "数据可视化", children: [
        { label: "分析仪表盘", path: "/bi/dashboard" },
        { label: "报表中心", path: "/bi/reports" },
        { label: "可视化编辑", path: "/bi/visualizations" },
      ]},
      { label: "数据管理", children: [
        { label: "数据源", path: "/bi/datasources" },
        { label: "对比分析", path: "/bi/comparison" },
      ]},
    ],
  },
  {
    label: "运营",
    path: "/assets",
    isGroup: true,
    children: [
      { label: "概览", path: "/assets" },
      { label: "资产设备", children: [
        { label: "资产台账", path: "/assets" },
        { label: "设备管理", path: "/equipment" },
      ]},
      { label: "行政综合", children: [
        { label: "行政管理", path: "/administration" },
        { label: "办公用品", path: "/office-supplies" },
        { label: "车辆管理", path: "/vehicles" },
        { label: "会议室", path: "/meeting-rooms" },
      ]},
    ],
  },
  {
    label: "工作流",
    path: "/flow",
    isGroup: true,
    children: [
      { label: "概览", path: "/flow" },
      { label: "流程审批", children: [
        { label: "审批中心", path: "/flow/approvals" },
        { label: "实例管理", path: "/flow/instances" },
        { label: "版本历史", path: "/flow/history" },
      ]},
      { label: "流程统计", children: [
        { label: "流程设计器", path: "/workflow-designer" },
        { label: "流程统计", path: "/flow/statistics" },
      ]},
    ],
  },
  {
    label: "协作",
    path: "/im",
    isGroup: true,
    children: [
      { label: "概览", path: "/im" },
      { label: "沟通协作", children: [
        { label: "即时通讯", path: "/im" },
        { label: "邮件", path: "/mail" },
        { label: "文件管理", path: "/docs" },
      ]},
      { label: "AI助手", children: [
        { label: "AI助手", path: "/ai" },
        { label: "知识库", path: "/knowledge-base" },
      ]},
    ],
  },
  {
    label: "更多",
    isGroup: true,
    children: [
      { label: "研发创新", children: [
        { label: "LIMS", path: "/lims" },
        { label: "RS研发", path: "/rs" },
        { label: "PDM", path: "/pdm" },
      ]},
      { label: "质量安全", children: [
        { label: "QMS", path: "/qms" },
        { label: "EHS", path: "/ehs" },
      ]},
      { label: "供应链", children: [
        { label: "SRM", path: "/srm" },
      ]},
      { label: "地理信息", children: [
        { label: "GIS", path: "/gis" },
      ]},
      { label: "系统管理", children: [
        { label: "概览", path: "/iam" },
        { label: "用户管理", path: "/iam/users" },
        { label: "角色管理", path: "/iam/roles" },
        { label: "权限配置", path: "/iam/permissions" },
        { label: "通知管理", path: "/notifications" },
        { label: "系统集成", path: "/integration" },
      ]},
      { label: "帮助", children: [
        { label: "帮助中心", path: "/help" },
        { label: "使用文档", path: "/docs/guide" },
      ]},
    ],
  },
];
```

### 3.2 模块Tab配置

每个模块入口页展示模块Tab，用于模块内页面切换：

```typescript
const moduleTabsConfig = [
  {
    module: "hrm",
    tabs: [
      { label: "概览", path: "/hrm", pinned: true },
      { label: "员工", path: "/hrm/employees" },
      { label: "部门", path: "/hrm/departments" },
      { label: "岗位", path: "/hrm/positions" },
      { label: "考勤", path: "/hrm/attendance" },
      { label: "薪酬", path: "/hrm/payroll" },
      { label: "绩效", path: "/hrm/performance" },
      { label: "招聘", path: "/hrm/recruitment" },
      { label: "培训", path: "/hrm/training" },
      { label: "合同", path: "/hrm/contracts" },
    ],
  },
  {
    module: "crm",
    tabs: [
      { label: "概览", path: "/crm", pinned: true },
      { label: "客户", path: "/crm/customers" },
      { label: "商机", path: "/crm/opportunities" },
      { label: "联系人", path: "/crm/contacts" },
      { label: "交互", path: "/crm/interactions" },
      { label: "评分", path: "/crm/scoring" },
      { label: "预测", path: "/crm/forecast" },
    ],
  },
  // ... 其他模块
];
```

---

## 四、页面拆分设计

### 4.1 页面拆分原则

| 原则 | 说明 |
|------|------|
| **一页一功能** | 每个页面只展示一个核心功能 |
| **列表独立** | 列表页独立，不与详情页混合 |
| **详情独立** | 详情页独立，通过Tab组织多维度内容 |
| **表单独立** | 创建/编辑表单独立，不与列表页混合 |
| **仪表盘独立** | 数据仪表盘独立，不与列表页混合 |

### 4.2 页面类型分类

| 类型 | 图标 | 主色调 | 风格特点 | 适用场景 |
|------|------|--------|----------|----------|
| **列表型** | 📋 | 蓝色渐变 | 清爽简洁，数据密集 | 数据列表页 |
| **详情型** | 📄 | 紫色渐变 | 优雅精致，信息丰富 | 详情展示页 |
| **表单型** | 📝 | 绿色渐变 | 专业高效，引导明确 | 创建/编辑页 |
| **仪表盘型** | 📊 | 橙色渐变 | 活力动感，数据驱动 | 数据看板 |
| **特殊交互型** | ⚡ | 红色渐变 | 个性鲜明，交互丰富 | GIS/IM/设计器 |

### 4.3 核心模块页面拆分

#### HRM 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| HRM仪表盘 | `/hrm` | HRM模块概览统计 | 仪表盘型 |
| 员工列表 | `/hrm/employees` | 员工数据列表 | 列表型 |
| 员工详情 | `/hrm/employees/:id` | 单个员工详细信息 | 详情型 |
| 创建员工 | `/hrm/employees/create` | 新建员工表单 | 表单型 |
| 编辑员工 | `/hrm/employees/:id/edit` | 编辑员工表单 | 表单型 |
| 部门列表 | `/hrm/departments` | 部门数据列表 | 列表型 |
| 部门详情 | `/hrm/departments/:id` | 部门详细信息 | 详情型 |
| 岗位列表 | `/hrm/positions` | 岗位数据列表 | 列表型 |
| 公司列表 | `/hrm/companies` | 公司数据列表 | 列表型 |
| 考勤列表 | `/hrm/attendance` | 考勤记录列表 | 列表型 |
| 请假列表 | `/hrm/leave` | 请假记录列表 | 列表型 |
| 薪酬列表 | `/hrm/payroll` | 薪酬记录列表 | 列表型 |
| 绩效列表 | `/hrm/performance` | 绩效记录列表 | 列表型 |
| 招聘列表 | `/hrm/recruitment` | 招聘职位列表 | 列表型 |
| 培训列表 | `/hrm/training` | 培训课程列表 | 列表型 |
| 合同列表 | `/hrm/contracts` | 合同记录列表 | 列表型 |

#### CRM 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| CRM仪表盘 | `/crm` | CRM模块概览统计 | 仪表盘型 |
| 客户列表 | `/crm/customers` | 客户数据列表 | 列表型 |
| 客户详情 | `/crm/customers/:id` | 客户详细信息 | 详情型 |
| 商机列表 | `/crm/opportunities` | 商机数据列表 | 列表型 |
| 联系人列表 | `/crm/contacts` | 联系人数据列表 | 列表型 |
| 交互记录列表 | `/crm/interactions` | 交互记录列表 | 列表型 |
| 客户评分列表 | `/crm/scoring` | 客户评分列表 | 列表型 |
| 销售预测列表 | `/crm/forecast` | 销售预测列表 | 列表型 |

#### PM 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| PM仪表盘 | `/pm` | PM模块概览统计 | 仪表盘型 |
| 项目列表 | `/pm/projects` | 项目数据列表 | 列表型 |
| 项目详情 | `/pm/projects/:id` | 项目详细信息 | 详情型 |
| 创建项目 | `/pm/projects/create` | 新建项目表单 | 表单型 |
| 合同列表 | `/pm/contracts` | 合同数据列表 | 列表型 |
| 合同详情 | `/pm/contracts/:id` | 合同详细信息 | 详情型 |
| 模板列表 | `/pm/templates` | 项目模板列表 | 列表型 |
| 报表列表 | `/pm/reports` | 项目报表列表 | 列表型 |

#### Finance 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| Finance仪表盘 | `/finance` | 财务概览统计 | 仪表盘型 |
| 凭证列表 | `/finance/vouchers` | 凭证数据列表 | 列表型 |
| 应收应付列表 | `/finance/receivable-payable` | 应收应付列表 | 列表型 |
| 预算列表 | `/finance/budget` | 预算数据列表 | 列表型 |
| 固定资产列表 | `/finance/fixed-assets` | 固定资产列表 | 列表型 |
| 银行账户列表 | `/finance/bank-accounts` | 银行账户列表 | 列表型 |

#### Flow 模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| Flow仪表盘 | `/flow` | 流程概览统计 | 仪表盘型 |
| 审批列表 | `/flow/approvals` | 待审批列表 | 列表型 |
| 实例列表 | `/flow/instances` | 流程实例列表 | 列表型 |
| 实例详情 | `/flow/instances/:id` | 实例详细信息 | 详情型 |
| 版本历史列表 | `/flow/history` | 版本历史列表 | 列表型 |
| 流程设计器 | `/workflow-designer` | 流程设计编辑器 | 特殊交互型 |
| 流程统计列表 | `/flow/statistics` | 流程统计列表 | 列表型 |

#### 运营模块（ERP）

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| 运营仪表盘 | `/assets` | 运营概览统计 | 仪表盘型 |
| 资产列表 | `/assets` | 资产台账列表 | 列表型 |
| 资产详情 | `/assets/:id` | 资产详细信息 | 详情型 |
| 设备列表 | `/equipment` | 设备管理列表 | 列表型 |
| 设备详情 | `/equipment/:id` | 设备详细信息 | 详情型 |
| 行政管理列表 | `/administration` | 行政管理列表 | 列表型 |
| 办公用品列表 | `/office-supplies` | 办公用品列表 | 列表型 |
| 车辆列表 | `/vehicles` | 车辆管理列表 | 列表型 |
| 会议室列表 | `/meeting-rooms` | 会议室预约列表 | 列表型 |

#### 研发创新模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| LIMS仪表盘 | `/lims` | 实验室概览统计 | 仪表盘型 |
| 样品列表 | `/lims/samples` | 样品管理列表 | 列表型 |
| 样品详情 | `/lims/samples/:id` | 样品详细信息 | 详情型 |
| 检测记录列表 | `/lims/tests` | 检测记录列表 | 列表型 |
| 试剂列表 | `/lims/reagents` | 试剂管理列表 | 列表型 |
| 仪器列表 | `/lims/instruments` | 仪器管理列表 | 列表型 |
| RS仪表盘 | `/rs` | 研发概览统计 | 仪表盘型 |
| 项目列表 | `/rs/projects` | 研发项目列表 | 列表型 |
| 项目详情 | `/rs/projects/:id` | 研发项目详情 | 详情型 |
| 配方列表 | `/rs/formulas` | 配方管理列表 | 列表型 |
| 材料列表 | `/rs/materials` | 材料管理列表 | 列表型 |
| PDM仪表盘 | `/pdm` | 产品数据概览 | 仪表盘型 |
| 产品列表 | `/pdm/products` | 产品管理列表 | 列表型 |
| 产品详情 | `/pdm/products/:id` | 产品详细信息 | 详情型 |

#### 质量安全模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| QMS仪表盘 | `/qms` | 质量概览统计 | 仪表盘型 |
| 质量审核列表 | `/qms/audits` | 质量审核列表 | 列表型 |
| 质量标准列表 | `/qms/standards` | 质量标准列表 | 列表型 |
| 不合格品列表 | `/qms/nonconformances` | 不合格品列表 | 列表型 |
| EHS仪表盘 | `/ehs` | 安全环保概览 | 仪表盘型 |
| 风险评估列表 | `/ehs/risks` | 风险评估列表 | 列表型 |
| 应急预案列表 | `/ehs/emergencies` | 应急预案列表 | 列表型 |
| 安全培训列表 | `/ehs/training` | 安全培训列表 | 列表型 |

#### 供应链模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| SRM仪表盘 | `/srm` | 供应商概览统计 | 仪表盘型 |
| 供应商列表 | `/srm/suppliers` | 供应商管理列表 | 列表型 |
| 供应商详情 | `/srm/suppliers/:id` | 供应商详细信息 | 详情型 |
| 采购订单列表 | `/srm/orders` | 采购订单列表 | 列表型 |

#### GIS模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| GIS仪表盘 | `/gis` | GIS概览统计 | 仪表盘型 |
| 地图监控 | `/gis/map` | 地图实时监控 | 特殊交互型 |
| 设备点位列表 | `/gis/devices` | 设备点位列表 | 列表型 |
| 管线列表 | `/gis/pipelines` | 管线管理列表 | 列表型 |
| 区域列表 | `/gis/areas` | 区域管理列表 | 列表型 |

#### 协作模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| IM仪表盘 | `/im` | 即时通讯概览 | 仪表盘型 |
| 聊天列表 | `/im/chats` | 聊天会话列表 | 列表型 |
| 聊天详情 | `/im/chats/:id` | 聊天会话详情 | 特殊交互型 |
| Mail仪表盘 | `/mail` | 邮件概览统计 | 仪表盘型 |
| 邮件列表 | `/mail/inbox` | 邮件收件箱 | 列表型 |
| 邮件详情 | `/mail/:id` | 邮件详细信息 | 详情型 |
| 写邮件 | `/mail/compose` | 编写邮件表单 | 表单型 |
| Docs仪表盘 | `/docs` | 文件概览统计 | 仪表盘型 |
| 文件列表 | `/docs/files` | 文件管理列表 | 列表型 |
| 文件详情 | `/docs/files/:id` | 文件详细信息 | 详情型 |

#### AI模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| AI仪表盘 | `/ai` | AI概览统计 | 仪表盘型 |
| AI聊天 | `/ai/chat` | AI对话交互 | 特殊交互型 |
| 文档生成列表 | `/ai/documents` | 文档生成列表 | 列表型 |
| 文本分析列表 | `/ai/analysis` | 文本分析列表 | 列表型 |
| 数据补全列表 | `/ai/completion` | 数据补全列表 | 列表型 |
| 编码生成列表 | `/ai/code` | 编码生成列表 | 列表型 |
| 知识库列表 | `/knowledge-base` | 知识库列表 | 列表型 |
| 知识库详情 | `/knowledge-base/:id` | 知识库详情 | 详情型 |

#### 系统管理模块（IAM）

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| IAM仪表盘 | `/iam` | 系统概览统计 | 仪表盘型 |
| 用户列表 | `/iam/users` | 用户管理列表 | 列表型 |
| 用户详情 | `/iam/users/:id` | 用户详细信息 | 详情型 |
| 创建用户 | `/iam/users/create` | 新建用户表单 | 表单型 |
| 编辑用户 | `/iam/users/:id/edit` | 编辑用户表单 | 表单型 |
| 角色列表 | `/iam/roles` | 角色管理列表 | 列表型 |
| 角色详情 | `/iam/roles/:id` | 角色详细信息 | 详情型 |
| 权限列表 | `/iam/permissions` | 权限配置列表 | 列表型 |
| 通知列表 | `/notifications` | 通知管理列表 | 列表型 |
| 集成列表 | `/integration` | 系统集成列表 | 列表型 |

#### 帮助模块

| 页面名称 | 路径 | 功能 | 页面类型 |
|----------|------|------|----------|
| 帮助中心 | `/help` | 帮助中心首页 | 仪表盘型 |
| 使用文档 | `/docs/guide` | 使用文档列表 | 列表型 |
| 文档详情 | `/docs/guide/:id` | 文档详细内容 | 详情型 |

---

### 4.4 页面统计汇总

| 模块 | 仪表盘 | 列表页 | 详情页 | 表单页 | 特殊交互 | 总计 |
|------|--------|--------|--------|--------|----------|------|
| HRM | 1 | 10 | 2 | 2 | 0 | 15 |
| CRM | 1 | 6 | 1 | 0 | 0 | 8 |
| PM | 1 | 4 | 2 | 1 | 0 | 8 |
| Finance | 1 | 5 | 0 | 0 | 0 | 6 |
| Flow | 1 | 4 | 1 | 0 | 1 | 7 |
| 运营(ERP) | 1 | 6 | 2 | 0 | 0 | 9 |
| 研发(LIMS/RS/PDM) | 3 | 9 | 3 | 0 | 0 | 15 |
| 质量(QMS/EHS) | 2 | 7 | 0 | 0 | 0 | 9 |
| 供应链(SRM) | 1 | 2 | 1 | 0 | 0 | 4 |
| GIS | 1 | 3 | 0 | 0 | 1 | 5 |
| 协作(IM/Mail/Docs) | 3 | 5 | 3 | 1 | 1 | 13 |
| AI | 1 | 5 | 1 | 0 | 1 | 8 |
| 系统管理(IAM) | 1 | 6 | 2 | 2 | 0 | 11 |
| 帮助 | 1 | 1 | 1 | 0 | 0 | 3 |
| **总计** | **17** | **68** | **16** | **6** | **3** | **104** |

---

## 五、页面布局统一设计

### 5.1 页面必须元素清单

| 元素 | 类型 | 位置 | 说明 |
|------|------|------|------|
| **返回按钮** | 导航 | 页面头部左侧 | 详情页、表单页必须有 |
| **页面标题** | 信息 | 页面头部中央 | 所有页面必须有 |
| **面包屑** | 导航 | 页面头部上方 | 非首页必须有 |
| **搜索框** | 功能 | 列表页头部 | 列表页必须有 |
| **帮助按钮** | 功能 | 页面头部右侧 | 所有页面必须有 |
| **主题切换** | 功能 | Header右侧 | 全局必须有 |
| **操作按钮组** | 功能 | 页面头部右侧 | 根据页面类型配置 |
| **Tab标签页** | 导航 | 页面头部下方 | 模块入口页必须有 |

### 5.2 Header导航菜单与页面关系

```
┌─────────────────────────────────────────────────────┐
│ [Logo] │ 首页 │ 人力 │ 客户 │ ... │ 🔔 │ 🌙 │ 👤 │  ← Header全局导航
│                     └─────────────────── 下拉 ─────┘│
├─────────────────────────────────────────────────────┤
│ 首页 > 人力 > 员工管理                               │  ← 面包屑（页面级）
├─────────────────────────────────────────────────────┤
│ ← 返回 │ 员工列表               🔍 │ ➕ │ ❓ │      │  ← 页面头部
├─────────────────────────────────────────────────────┤
│ 概览 │ 员工 │ 部门 │ 岗位 │ 考勤 │ 薪酬 │ ...      │  ← 模块Tab（模块级）
├─────────────────────────────────────────────────────┤
│                                                      │
│                    页面内容                          │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 5.3 三级导航体系

| 级别 | 名称 | 位置 | 功能 |
|------|------|------|------|
| **L1** | Header全局导航 | 页面顶部固定 | 模块间切换、全局功能 |
| **L2** | 模块Tab导航 | Header下方 | 模块内页面切换 |
| **L3** | 页面内部导航 | 页面内容区 | 详情页Tab、表单步骤等 |

### 5.4 页面进入逻辑

| 场景 | 进入方式 | 页面状态 |
|------|----------|----------|
| **从Header进入** | 点击模块菜单 | 进入模块仪表盘页 |
| **从Tab进入** | 点击模块Tab | 进入对应列表页 |
| **从列表进入详情** | 点击数据行 | 进入详情页，显示返回按钮 |
| **从详情进入编辑** | 点击编辑按钮 | 进入编辑表单，显示返回按钮 |
| **从列表进入创建** | 点击新建按钮 | 进入创建表单，显示返回按钮 |
| **返回上一页** | 点击返回按钮 | 返回来源页面，保持筛选状态 |

### 5.5 搜索功能规范

| 页面类型 | 搜索位置 | 搜索范围 |
|----------|----------|----------|
| **列表页** | 页面头部右侧 | 当前列表数据 |
| **全局搜索** | Header搜索框 | 全系统数据（快捷入口） |
| **详情页** | 详情页内Tab | 当前详情页关联数据 |

### 5.6 帮助功能规范

| 帮助类型 | 触发方式 | 内容 |
|----------|----------|------|
| **页面帮助** | 点击❓按钮 | 当前页面使用指南 |
| **字段帮助** | 字段旁Tooltip | 字段说明 |
| **全局帮助** | Header帮助入口 | 系统帮助中心 |

### 5.7 主题切换规范

| 位置 | 触发方式 | 效果 |
|------|----------|------|
| **Header右侧** | 点击☀️/🌙图标 | 全局主题切换 |
| **自动跟随** | 系统设置 | 跟随系统主题 |
| **记忆保存** | localStorage | 下次访问保持选择 |

---

## 六、响应式设计规范

### 6.1 桌面端布局（≥1200px）

```
┌─────────────────────────────────────────────────────┐
│ Header: 完整导航 + 搜索 + 通知 + 主题 + 用户        │
├─────────────────────────────────────────────────────┤
│ 面包屑 + 页面头部 + Tab                             │
├─────────────────────────────────────────────────────┤
│ 内容区: 多列布局，侧边栏可选                        │
└─────────────────────────────────────────────────────┘
```

**特点：**
- Header完整展示所有导航项
- 模块Tab横向排列
- 列表页支持多列筛选
- 详情页支持主内容+侧边栏双栏布局

### 6.2 平板端布局（768-1199px）

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo + 核心导航 + 更多▼ + 功能按钮          │
├─────────────────────────────────────────────────────┤
│ 面包屑 + 页面头部                                   │
├─────────────────────────────────────────────────────┤
│ Tab: 可滚动                                         │
├─────────────────────────────────────────────────────┤
│ 内容区: 双列布局                                    │
└─────────────────────────────────────────────────────┘
```

**特点：**
- Header折叠部分导航到"更多"菜单
- 模块Tab可横向滚动
- 列表页筛选区折叠
- 详情页单栏布局

### 6.3 移动端布局（<768px）

```
┌─────────────────────────────────────────────────────┐
│ Header: Logo + ☰菜单 + 🔔 + 👤                      │
├─────────────────────────────────────────────────────┤
│ 页面标题 + 操作按钮                                 │
├─────────────────────────────────────────────────────┤
│ 内容区: 单列布局                                    │
├─────────────────────────────────────────────────────┤
│ 底部导航: 首页 │ 消息 │ 我的                        │
└─────────────────────────────────────────────────────┘
```

**特点：**
- Header折叠为汉堡菜单
- 隐藏面包屑和模块Tab
- 列表页筛选区折叠到抽屉
- 详情页全屏展示
- 底部固定导航栏

### 6.4 响应式组件适配

| 组件 | 桌面端 | 平板端 | 移动端 |
|------|--------|--------|--------|
| **Header** | 完整导航 | 折叠导航 | 汉堡菜单 |
| **面包屑** | 完整显示 | 简化显示 | 隐藏 |
| **模块Tab** | 横向排列 | 可滚动 | 隐藏 |
| **搜索框** | 展开输入 | 展开输入 | 点击图标展开 |
| **筛选栏** | 展开显示 | 折叠显示 | 抽屉显示 |
| **表格** | 多列显示 | 关键列显示 | 卡片列表 |
| **侧边栏** | 固定显示 | 可折叠 | 隐藏 |

---

## 七、柔和渐变颜色系统

### 7.1 主色调渐变

| 颜色名称 | 渐变值 | 用途 |
|----------|--------|------|
| **Primary** | `linear-gradient(135deg, #3b82f6 → #2563eb)` | 品牌色、主要按钮 |
| **Secondary** | `linear-gradient(135deg, #8b5cf6 → #7c3aed)` | 次要操作、详情页 |
| **Success** | `linear-gradient(135deg, #22c55e → #16a34a)` | 成功状态 |
| **Warning** | `linear-gradient(135deg, #f59e0b → #d97706)` | 警告状态 |
| **Error** | `linear-gradient(135deg, #ef4444 → #dc2626)` | 错误状态 |
| **Info** | `linear-gradient(135deg, #0ea5e9 → #0284c7)` | 信息状态 |

### 7.2 模块专属渐变色

| 模块 | 渐变色 | 说明 |
|------|--------|------|
| **HRM** | `linear-gradient(135deg, #3b82f6 → #60a5fa)` | 蓝色系，稳重专业 |
| **CRM** | `linear-gradient(135deg, #22c55e → #4ade80)` | 绿色系，活力增长 |
| **PM** | `linear-gradient(135deg, #f59e0b → #fbbf24)` | 橙色系，项目管理 |
| **Finance** | `linear-gradient(135deg, #6366f1 → #818cf8)` | 紫色系，财务专业 |
| **Flow** | `linear-gradient(135deg, #14b8a6 → #2dd4bf)` | 青色系，流程流转 |
| **BI** | `linear-gradient(135deg, #ec4899 → #f472b6)` | 粉色系，数据分析 |
| **GIS** | `linear-gradient(135deg, #10b981 → #34d399)` | 绿色系，地理空间 |
| **IM** | `linear-gradient(135deg, #f43f5e → #fb7185)` | 红色系，即时通讯 |

### 7.3 背景渐变

| 场景 | 渐变值 |
|------|--------|
| **页面背景** | `linear-gradient(to bottom right, #f8fafc → #f1f5f9)` |
| **卡片背景** | `linear-gradient(to bottom, #ffffff → #fafafa)` |
| **深色背景** | `linear-gradient(to bottom right, #111827 → #1f2937)` |

### 7.4 过渡色系

用于相邻模块间的视觉过渡：

```
HRM(蓝) → CRM(绿): 过渡色 #4ade80 (浅绿)
CRM(绿) → PM(橙): 过渡色 #fbbf24 (浅橙)
PM(橙) → Finance(紫): 过渡色 #818cf8 (浅紫)
```

---

## 八、公共组件设计

### 8.1 树状目录 TreeView

**用途：** 展示层级结构，如组织架构、文件目录、权限树

**组件结构：**
```tsx
interface TreeViewProps {
  data: TreeNode[];
  selected?: string;
  expanded?: string[];
  onSelect?: (node: TreeNode) => void;
  onExpand?: (nodeId: string) => void;
  showIcons?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
}

interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  badge?: string | number;
  disabled?: boolean;
}
```

**视觉设计：**
- 节点展开/折叠动画过渡
- 选中节点高亮渐变背景
- 层级缩进柔和递进
- 图标与文字对齐

### 8.2 进度条 ProgressBar

**用途：** 展示任务进度、流程状态、数据加载

**组件结构：**
```tsx
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'linear' | 'circular' | 'segmented';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  striped?: boolean;
}
```

**视觉设计：**
- 渐变填充色
- 流动动画效果
- 分段进度支持多状态
- 圆形进度带中心数值

### 8.3 甘特图 GanttChart

**用途：** 项目管理、时间规划、任务排期

**组件结构：**
```tsx
interface GanttChartProps {
  tasks: GanttTask[];
  startDate: Date;
  endDate: Date;
  viewMode?: 'day' | 'week' | 'month';
  showDependencies?: boolean;
  showProgress?: boolean;
  onTaskClick?: (task: GanttTask) => void;
  onTaskDrag?: (task: GanttTask, newStart: Date, newEnd: Date) => void;
}

interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress?: number;
  color?: string;
  dependencies?: string[];
  assignee?: string;
}
```

**视觉设计：**
- 任务条渐变色
- 时间轴柔和分隔
- 依赖关系连线动画
- 今日线高亮标记

### 8.4 步骤器 Stepper

**用途：** 流程步骤、表单填写进度、审批流程

**组件结构：**
```tsx
interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'outlined' | 'gradient';
  showLabels?: boolean;
  showDescriptions?: boolean;
  onStepClick?: (step: number) => void;
}

interface StepItem {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  status?: 'pending' | 'active' | 'completed' | 'error';
}
```

**视觉设计：**
- 步骤圆点渐变填充
- 连接线柔和过渡
- 当前步骤脉冲动画
- 完成步骤勾选图标

### 8.5 补充公共组件

| 组件 | 用途 | 说明 |
|------|------|------|
| **Timeline** | 时间线 | 展示事件序列、历史记录 |
| **Breadcrumb** | 面包屑 | 页面层级导航 |
| **EmptyState** | 空状态 | 无数据时的友好提示 |
| **LoadingState** | 加载状态 | 数据加载时的骨架屏 |
| **StatusBadge** | 状态徽章 | 多彩状态指示 |
| **MetricCard** | 指标卡片 | 数据统计展示 |
| **FilterBar** | 筛选栏 | 数据筛选组件 |
| **ActionBar** | 操作栏 | 页面操作按钮组 |
| **PageHeader** | 页面头部 | 标题、面包屑、操作区 |
| **ConfirmDialog** | 确认对话框 | 操作确认弹窗 |
| **NotificationToast** | 通知提示 | 操作反馈消息 |

---

## 九、实施计划

### 9.1 阶段规划

| 阶段 | 任务 | 时间 | 优先级 |
|------|------|------|--------|
| **阶段1** | 导航配置更新 | Week 1 | P0 |
| | - 首页入口简化 | | P0 |
| | - Header导航更新 | | P0 |
| | - 模块Tab配置 | | P0 |
| **阶段2** | 页面布局统一 | Week 2 | P0 |
| | - 页面头部组件 | | P0 |
| | - 面包屑组件 | | P0 |
| | - 响应式适配 | | P0 |
| **阶段3** | 公共组件开发 | Week 3-4 | P1 |
| | - TreeView组件 | | P1 |
| | - ProgressBar组件 | | P1 |
| | - GanttChart组件 | | P1 |
| | - Stepper组件 | | P1 |
| **阶段4** | 颜色系统应用 | Week 5 | P1 |
| | - 渐变色应用 | | P1 |
| | - 模块专属色 | | P1 |
| | - 过渡色应用 | | P1 |
| **阶段5** | 模块页面重构 | Week 6-10 | P2 |
| | - HRM模块 | | P2 |
| | - CRM模块 | | P2 |
| | - PM模块 | | P2 |
| | - 其他模块 | | P2 |

---

## 十、验收标准

### 10.1 导航验收

- [ ] 首页入口简化为唯一入口
- [ ] Header导航分组清晰
- [ ] 模块Tab配置完整
- [ ] 三级导航体系完整

### 10.2 页面布局验收

- [ ] 页面必须元素齐全
- [ ] 页面进入逻辑正确
- [ ] 返回功能正常
- [ ] 搜索功能正常
- [ ] 帮助功能正常
- [ ] 主题切换正常

### 10.3 响应式验收

- [ ] 桌面端布局正常
- [ ] 平板端布局正常
- [ ] 移动端布局正常
- [ ] 组件响应式适配

### 10.4 公共组件验收

- [ ] TreeView组件可用
- [ ] ProgressBar组件可用
- [ ] GanttChart组件可用
- [ ] Stepper组件可用
- [ ] 补充组件可用

---

**文档审批**

| 角色 | 签名 | 日期 |
|------|------|------|
| 前端负责人 | - | 2026-06-15 |
| UI设计师 | - | - |
| QA负责人 | - | - |

---

*本文档由 TOPEMS 前端团队维护*
*版本: v1.0.0*
*最后更新: 2026-06-15*