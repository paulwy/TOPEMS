# 后端API vs 前端功能 对比分析报告

## 一、总体统计

| 指标 | 数量 | 说明 |
|------|------|------|
| 后端服务模块数 | 25个 | unified-core, analytics, qms, ehs, ai, wms, quality-assurance, lims, pdm, manufacturing, mes, erp, crm, rs, mobile, integration, pm, scm, hrm, monitor, report, gis, shared, srm, config-center |
| 后端总API路由数 | 1,530个 | 仅统计 `/api/` 前缀的业务接口 |
| 前端总API函数数 | 1,394个 | 前端API封装函数 |
| 前端总页面数 | 231个 | 页面组件 |
| 前端总路由数 | 199条 | 前端路由 |

### 模块状态分布

| 状态 | 数量 | 模块列表 |
|------|------|----------|
| 🔴 严重缺失 | 4个 | manufacturing, erp, mes, shared |
| 🟡 部分缺失 | 4个 | unified-core, analytics, mobile, monitor |
| 🟢 基本完整 | 16个 | qms, ehs, lims, ai, wms, quality-assurance, rs, crm, integration, pdm, hrm, scm, pm, gis, report, srm |
| ⚪ 无业务API | 1个 | config-center |

---

## 二、后端模块 vs 前端模块 对比总表

| 模块名称 | 描述 | 后端API | 前端API | 前端页面 | 覆盖率 | 状态 | 前端对应模块 |
|---------|------|---------|---------|----------|--------|------|-------------|
| **manufacturing** | 制造执行（生产管理） | 62 | 1 | 9 | 2% | 🔴 严重缺失 | mes |
| **erp** | 企业资源计划 | 50 | 7 | 1 | 14% | 🔴 严重缺失 | erp, addressbook, financial-report, voucher-template |
| **mes** | 制造执行系统 | 44 | 1 | 9 | 2% | 🔴 严重缺失 | mes |
| **shared** | 共享服务 | 7 | 0 | 16 | 0% | 🔴 严重缺失 | shared, common |
| **unified-core** | 统一核心服务 | 339 | 106 | 13 | 31% | 🟡 部分缺失 | iam, workflow, notification, doc, im, financial-report |
| **analytics** | BI分析与报表 | 179 | 73 | 7 | 41% | 🟡 部分缺失 | bi |
| **mobile** | 移动端服务 | 44 | 9 | 9 | 20% | 🟡 部分缺失 | mobile |
| **monitor** | 监控告警 | 28 | 10 | 3 | 36% | 🟡 部分缺失 | monitor |
| qms | 质量管理系统 | 131 | 103 | 6 | 79% | 🟢 基本完整 | qms |
| ehs | 环境健康安全 | 101 | 161 | 7 | 159% | 🟢 基本完整 | ehs |
| lims | 实验室信息管理 | 79 | 90 | 8 | 114% | 🟢 基本完整 | lims |
| ai | AI智能服务 | 64 | 34 | 2 | 53% | 🟢 基本完整 | ai |
| wms | 仓储管理系统 | 55 | 123 | 8 | 224% | 🟢 基本完整 | wms |
| quality-assurance | 质量保证 | 50 | 103 | 6 | 206% | 🟢 基本完整 | qms |
| rs | 研发管理 | 42 | 48 | 22 | 114% | 🟢 基本完整 | rs |
| crm | 客户关系管理 | 40 | 66 | 16 | 165% | 🟢 基本完整 | crm |
| integration | 集成中心 | 40 | 43 | 9 | 108% | 🟢 基本完整 | integration |
| pdm | 产品数据管理 | 37 | 43 | 8 | 116% | 🟢 基本完整 | pdm |
| hrm | 人力资源管理 | 34 | 44 | 19 | 129% | 🟢 基本完整 | hrm, hrm-finance |
| scm | 供应链管理 | 29 | 80 | 6 | 276% | 🟢 基本完整 | scm |
| pm | 项目管理 | 23 | 140 | 10 | 609% | 🟢 基本完整 | pm |
| gis | 地理信息系统 | 19 | 41 | 4 | 216% | 🟢 基本完整 | gis |
| report | 报表服务 | 18 | 31 | 4 | 172% | 🟢 基本完整 | report |
| srm | 供应商关系管理 | 15 | 37 | 7 | 247% | 🟢 基本完整 | srm |
| config-center | 配置中心 | 0 | 0 | 17 | — | ⚪ 无业务API | admin, system |

> **说明**：覆盖率 = 前端API函数数 / 后端API路由数。部分模块前端API数量 > 后端，是因为前端有额外的封装、Mock数据或更细粒度的函数划分。

---

## 三、🔴 严重缺失的模块（完全缺失）

### 1. manufacturing — 制造执行（生产管理）

- **后端API数量**: 62个
- **前端API数量**: 1个
- **前端页面数量**: 9个
- **前端对应模块**: mes

**主要功能模块（全部缺失前端API对接）**:

| 功能模块 | API数量 | 示例路径 |
|---------|---------|----------|
| production-order 生产订单 | 8 | `/api/mfg/production-order` |
| process 工艺流程 | 6 | `/api/mfg/process` |
| equipment 设备管理 | 5 | `/api/mfg/equipment` |
| record 生产记录 | 5 | `/api/mfg/record` |
| product 产品管理 | 5 | `/api/pdm/product` |
| work-station 工位管理 | 4 | `/api/mfg/work-station` |
| material 物料管理 | 4 | `/api/pdm/material` |
| configuration 配置管理 | 4 | `/api/mfg/configuration` |
| document 文档管理 | 4 | `/api/mfg/pdm/document` |
| version 版本管理 | 4 | `/api/pdm/version` |

**缺失的关键功能**:
- 生产订单的创建、发布、启动、完成、取消全流程
- 工艺流程配置与管理
- 生产设备与工位管理
- 生产数据记录与追溯
- PDM集成（产品/物料/文档/版本）

---

### 2. erp — 企业资源计划

- **后端API数量**: 50个
- **前端API数量**: 7个
- **前端页面数量**: 1个
- **前端对应模块**: erp, addressbook, financial-report, voucher-template

**主要功能模块**:

| 功能模块 | API数量 | 前端状态 | 示例路径 |
|---------|---------|----------|----------|
| reports 财务报表 | 11 | ❌ 缺失 | `/api/erp/reports/balance-sheet` |
| vouchers 凭证管理 | 6 | ❌ 缺失 | `/api/erp/vouchers` |
| addressbook 通讯录 | 5 | ⚠️ 部分 | `/api/erp/addressbook` |
| db 数据库管理 | 5 | ❌ 缺失 | `/api/erp/db/tables` |
| audit-logs 审计日志 | 2 | ❌ 缺失 | `/api/erp/audit-logs` |
| dict-items 字典项 | 2 | ❌ 缺失 | `/api/erp/dict-items` |
| vehicles 车辆管理 | 2 | ❌ 缺失 | `/api/erp/vehicles` |
| budgets 预算管理 | 1 | ❌ 缺失 | `/api/erp/budgets` |
| expenses 费用管理 | 1 | ❌ 缺失 | `/api/erp/expenses` |
| bank-transactions 银行交易 | 1 | ❌ 缺失 | `/api/erp/bank-transactions` |
| consolidation 合并报表 | 1 | ❌ 缺失 | `/api/erp/consolidation` |
| assets 资产管理 | 1 | ⚠️ 部分 | `/api/erp/assets` |

**已有的前端页面（但缺少API对接）**:
- 资产、设备、预算、办公用品、会议室、车辆、公告等页面框架已存在
- 但这些页面大多引用自其他模块（如SRM采购、CRM客户），ERP自身核心功能缺失

**缺失的核心功能**:
- 财务报表系统（资产负债表、利润表、现金流量表等）
- 会计凭证管理
- 数据库/元数据管理
- 审计日志
- 数据字典管理

---

### 3. mes — 制造执行系统

- **后端API数量**: 44个
- **前端API数量**: 1个
- **前端页面数量**: 9个
- **前端对应模块**: mes

**主要功能模块（全部缺失前端API对接）**:

| 功能模块 | API数量 | 示例路径 |
|---------|---------|----------|
| orders 生产订单 | 7 | `/api/mes/orders` |
| wips 在制品 | 5 | `/api/mes/wips` |
| equipment-oee 设备OEE | 4 | `/api/mes/equipment-oee` |
| schedules 排程计划 | 4 | `/api/mes/schedules` |
| workstations 工位管理 | 4 | `/api/mes/workstations` |
| equipment 设备管理 | 3 | `/api/mes/equipment` |
| processes 工序流程 | 3 | `/api/mes/processes` |
| records 生产记录 | 3 | `/api/mes/records` |
| traceability 追溯管理 | 3 | `/api/mes/traceability/forward/{order_id}` |
| boms 物料清单 | 2 | `/api/mes/boms` |
| material-issues 物料领用 | 1 | `/api/mes/material-issues` |
| material-returns 物料退库 | 1 | `/api/mes/material-returns` |
| quality-records 质量记录 | 1 | `/api/mes/quality-records` |

**缺失的关键功能**:
- 生产订单管理（从ERP导入、发布、启动、完成、取消）
- 在制品（WIP）跟踪
- 设备OEE统计与效率分析
- 生产排程与甘特图
- 物料BOM管理
- 生产追溯（正向/反向）
- 物料领用与退库

> **注意**: manufacturing 和 mes 两个后端服务存在功能重叠，建议前端统一为一个 MES 模块整合两者功能。

---

### 4. shared — 共享服务

- **后端API数量**: 7个
- **前端API数量**: 0个
- **前端页面数量**: 16个
- **前端对应模块**: shared, common

**功能模块**:

| 功能模块 | API数量 | 示例路径 |
|---------|---------|----------|
| sequences 序列号生成 | 3 | `/api/shared/sequences` |
| mappings 映射管理 | 2 | `/api/shared/mappings` |
| sync 数据同步 | 2 | `/api/shared/sync` |

**说明**: 这是基础服务模块，虽然API数量少，但作为系统基础支撑，建议补齐前端对接。

---

## 四、🟡 部分缺失的模块

### 1. unified-core — 统一核心服务 ⭐ 重点关注

- **后端API数量**: 339个（最大模块）
- **前端API数量**: 106个
- **前端页面数量**: 13个
- **覆盖率**: 31%
- **前端对应模块**: iam, workflow, notification, doc, im, financial-report

**子系统详细分析**:

| 子系统 | 后端API | 前端模块 | 前端API | 页面数 | 状态 |
|-------|---------|----------|---------|--------|------|
| IAM身份认证 | 45 | iam | 51 | 1 | 🟢 完整 |
| 即时通讯 | 46 | im | 35 | 0 | 🟡 部分 |
| 工作流引擎 | 84 | workflow | 4 | 8 | 🔴 严重缺失 |
| 文件服务 | 32 | doc | 10 | 0 | 🔴 严重缺失 |
| 插件市场 | 24 | plugin | 0 | 1 | 🔴 完全缺失 |
| 财务核心 | 23 | financial-report | 2 | 0 | 🔴 严重缺失 |
| 通知系统 | 20 | notification | 4 | 4 | 🟡 部分 |
| 文档管理 | 17 | doc | 10 | 0 | 🟡 部分 |
| AI能力中心 | 16 | ai | 34 | 2 | 🟢 完整 |
| 租户管理 | 11 | admin | 0 | 14 | 🔴 完全缺失 |
| 计费系统 | 8 | crm | 66 | 16 | 🟢 完整 |
| 数据同步 | 9 | integration | 43 | 9 | 🟢 完整 |

**严重缺失的子系统**:

1. **工作流引擎** (84个API):
   - 工作流定义管理 (workflows)
   - 流程实例管理 (instances)
   - 审批任务管理 (approval-tasks)
   - 审批流管理 (approvals)
   - 流程模板管理 (templates)
   - 流程设置 (settings)
   - 流程历史 (history)
   - 流程记录 (records)
   - 流程统计 (statistics)
   - 流程性能 (performance)

2. **文件服务** (32个API):
   - 文件上传/下载/删除
   - 文件版本管理
   - 文件搜索
   - 文件元数据管理
   - 文件分享

3. **插件市场** (24个API):
   - 插件市场浏览
   - 插件安装/卸载
   - 插件配置
   - 插件更新

4. **财务核心** (23个API):
   - 账户管理
   - 交易记录
   - 账单管理

5. **租户管理** (11个API):
   - 租户CRUD
   - 租户配置
   - 租户状态管理

---

### 2. analytics — BI分析与报表

- **后端API数量**: 179个
- **前端API数量**: 73个
- **前端页面数量**: 7个
- **覆盖率**: 41%
- **前端对应模块**: bi

**已实现的功能**:
- Dashboard仪表板管理
- Widget组件管理
- DataSource数据源管理
- Comparison对比分析
- Report自助报表
- Analytics数据概览

**缺失的功能模块**:

| 功能模块 | API数量 | 示例路径 |
|---------|---------|----------|
| permission 行级权限 | 9 | `/api/bi/permission/rule` |
| drilldown 数据钻取 | 8 | `/api/bi/drilldown/path` |
| multidim 多维分析 | 7 | `/api/bi/multidim/cube` |
| prediction 预测分析 | 5 | `/api/bi/prediction/methods` |
| visualization 可视化 | 5 | `/api/bi/visualization` |
| analysis 数据分析 | 3 | `/api/bi/analysis` |
| schedule 定时调度 | 4 | `/api/analytics/schedule` |
| sync-records 同步记录 | 6 | `/api/bi/sync-records` |

**缺失的关键高级功能**:
- 行级数据权限控制（9个API）
- 数据钻取（上钻/下钻/历史）（8个API）
- 多维分析（Cube/Slice/Dice/透视表/排名）（7个API）
- 预测分析（移动平均/指数平滑/趋势分析）（5个API）
- 可视化图表生成（折线/柱状/饼图/仪表）（5个API）
- 定时报表调度

---

### 3. mobile — 移动端服务

- **后端API数量**: 44个
- **前端API数量**: 9个
- **前端页面数量**: 9个
- **覆盖率**: 20%
- **前端对应模块**: mobile

**已实现的功能**: 基础页面框架（9个页面）

**缺失的功能模块**:

| 功能模块 | API数量 | 示例路径 |
|---------|---------|----------|
| approvals 移动审批 | 8 | `/api/mobile/approvals/pending` |
| push 推送通知 | 7 | `/api/mobile/push/devices` |
| photos 照片管理 | 5 | `/api/mobile/photos/upload` |
| auth 移动认证 | 4 | `/api/mobile/auth/login` |
| barcode 条码扫描 | 4 | `/api/mobile/barcode/scan` |
| media 媒体资源 | 3 | `/api/mobile/media/photos` |
| user 用户中心 | 1 | `/api/mobile/user/avatar` |

**缺失的关键功能**:
- 移动审批流程（待审批/已审批/审批详情）
- 设备推送通知管理
- 照片上传与管理
- 移动端专属登录认证
- 条码扫描功能

---

### 4. monitor — 监控告警

- **后端API数量**: 28个
- **前端API数量**: 10个
- **前端页面数量**: 3个
- **覆盖率**: 36%
- **前端对应模块**: monitor

**已实现的功能**: 基础监控页面（3个页面）

**说明**: 监控模块虽然API数量不算多，但作为系统运维的重要支撑，建议补齐告警规则、告警历史、通知渠道等功能。

---

## 五、🟢 基本完整的模块（16个）

以下模块前后端功能基本匹配，部分模块前端API数量甚至超过后端，说明前端有更细粒度的封装或额外功能：

| 排名 | 模块 | 后端API | 前端API | 页面数 | 备注 |
|-----|------|---------|---------|--------|------|
| 1 | qms 质量管理 | 131 | 103 | 6 | 核心功能完整 |
| 2 | ehs 环境健康安全 | 101 | 161 | 7 | 前端功能丰富 |
| 3 | lims 实验室管理 | 79 | 90 | 8 | 核心功能完整 |
| 4 | ai AI智能服务 | 64 | 34 | 2 | 核心对话/文档Q&A完整 |
| 5 | wms 仓储管理 | 55 | 123 | 8 | 前端功能丰富 |
| 6 | quality-assurance 质量保证 | 50 | 103 | 6 | 与QMS合并 |
| 7 | rs 研发管理 | 42 | 48 | 22 | 页面最丰富 |
| 8 | crm 客户关系 | 40 | 66 | 16 | 功能完整 |
| 9 | integration 集成中心 | 40 | 43 | 9 | 功能完整 |
| 10 | pdm 产品数据 | 37 | 43 | 8 | 功能完整 |
| 11 | hrm 人力资源 | 34 | 44 | 19 | 功能完整 |
| 12 | scm 供应链 | 29 | 80 | 6 | 前端功能丰富 |
| 13 | pm 项目管理 | 23 | 140 | 10 | API数量最多（前端封装细） |
| 14 | gis 地理信息 | 19 | 41 | 4 | 功能完整 |
| 15 | report 报表服务 | 18 | 31 | 4 | 功能完整 |
| 16 | srm 供应商管理 | 15 | 37 | 7 | 功能完整 |

---

## 六、建议优先级

### 🔴🔴 最高优先级（严重缺失 + API数量多 + 核心业务）

| 优先级 | 模块 | API数量 | 理由 |
|-------|------|---------|------|
| P0 | **unified-core 子系统** | ~200个缺失 | 系统核心支撑，工作流、文件服务、插件市场、租户管理等都是平台级能力 |
| P0 | **manufacturing + mes** | 106个 | 制造执行是核心业务模块，两个服务功能高度重叠，建议前端统一整合 |
| P0 | **analytics 高级功能** | ~50个缺失 | BI是数据驱动的核心，多维分析、钻取、预测等高级功能价值高 |
| P1 | **erp 财务核心** | ~30个缺失 | 企业资源计划是核心系统，财务报表、凭证管理是基础功能 |

### 🔴 高优先级（严重缺失）

| 优先级 | 模块 | API数量 | 理由 |
|-------|------|---------|------|
| P1 | **mobile 移动端** | 35个缺失 | 移动端是重要入口，审批、推送、扫码等都是高频功能 |
| P2 | **monitor 监控** | 18个缺失 | 运维支撑功能，保障系统稳定运行 |
| P2 | **shared 共享服务** | 7个 | 基础服务，开发成本低但作为基础支撑应该补齐 |

### 🟡 中优先级（部分缺失但功能重要）

| 优先级 | 模块 | 理由 |
|-------|------|------|
| P2 | **ai 高级功能** | 向量搜索、多模态分析、智能推荐、数据连接器等是AI能力的延伸 |

### 🟢 低优先级（基本完整）

16个模块已基本完整，可根据业务需求进行功能迭代和优化。

---

## 七、关键发现与建议

### 1. 制造模块重叠问题
- `manufacturing` (62 API) 和 `mes` (44 API) 两个后端服务功能高度重叠
- 前端只有一个 `mes` 模块，但API对接严重不足（仅1个API）
- **建议**: 前端统一为一个 MES 模块，整合两个后端服务的功能

### 2. unified-core 是最大缺口
- 339个API中只有106个有前端对接
- 工作流引擎（84 API）是最大的单一功能缺口
- 文件服务、插件市场、租户管理、财务核心都缺失严重
- **建议**: 作为平台级核心能力，优先补齐

### 3. BI高级功能缺失
- 基础的Dashboard/Widget/DataSource已实现
- 但高级分析能力（多维分析、数据钻取、预测分析）全部缺失
- **建议**: 按业务需求分期实现，优先实现多维分析和数据钻取

### 4. 前端页面框架已搭但API未对接
- 多个模块（如MES、Mobile、ERP）有页面框架但缺少实际API调用
- **建议**: 优先完成已有页面的API对接，让页面可用

### 5. 前端API数量超过后端的现象
- 多个模块（ehs、wms、pm、scm等）前端API函数数 > 后端API路由数
- 原因可能是：前端封装更细粒度、有额外的本地计算/Mock、或API设计粒度不同
- **建议**: 不影响功能完整性判断，但需注意实际后端能力的边界

---

*报告生成时间: 2026-06-26*
*数据来源: svc/routes_extracted.json + frontend_analysis.json*
