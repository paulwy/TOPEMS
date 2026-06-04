# 项目管理模块实施计划

**版本**: 1.0.0  
**日期**: 2026-06-04  
**状态**: 待执行

---

## 目录

- [Phase 1: 核心整合](#phase-1-核心整合)
- [Phase 2: 费用与资源](#phase-2-费用与资源)
- [Phase 3: 甘特图增强](#phase-3-甘特图增强)
- [Phase 4: 效益分析](#phase-4-效益分析)
- [数据库迁移清单](#数据库迁移清单)
- [相关文件索引](#相关文件索引)

---

## Phase 1: 核心整合 (1-2个月)

### 1.1 数据库变更

#### 任务 1.1.1: 增强项目表

**文件**: 新建数据库迁移脚本

```sql
-- migration_001_add_project_enhancements.sql
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS project_config JSONB;
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS benefit_target JSONB;
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50);
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3;
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES rs.projects(id);
ALTER TABLE rs.projects ADD COLUMN IF NOT EXISTS workspace_id UUID;
```

**测试**: 验证字段添加成功，不影响现有数据

---

#### 任务 1.1.2: 增强里程碑表

```sql
-- migration_002_add_milestone_enhancements.sql
ALTER TABLE rs.project_milestones ADD COLUMN IF NOT EXISTS deliverable_type VARCHAR(100);
ALTER TABLE rs.project_milestones ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
ALTER TABLE rs.project_milestones ADD COLUMN IF NOT EXISTS acceptance_status VARCHAR(50);
ALTER TABLE rs.project_milestones ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(255);
ALTER TABLE rs.project_milestones ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
```

---

### 1.2 后端模型更新

#### 任务 1.2.1: 更新 Project 模型

**文件**: [services/topems-rs/backend/src/models/project.rs](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/project.rs)

需要添加的字段:
- `project_config: Option<serde_json::Value>`
- `benefit_target: Option<serde_json::Value>`
- `risk_level: Option<String>`
- `priority: Option<i32>`
- `tags: Option<Vec<String>>`
- `parent_id: Option<Uuid>`
- `workspace_id: Option<Uuid>`

---

#### 任务 1.2.2: 更新 ProjectMilestone 模型

**文件**: `services/topems-rs/backend/src/models/project_milestone.rs`

添加字段:
- `deliverable_type: Option<String>`
- `acceptance_criteria: Option<String>`
- `acceptance_status: Option<String>`
- `accepted_by: Option<String>`
- `accepted_at: Option<DateTime<Utc>>`

---

### 1.3 API 实现

#### 任务 1.3.1: 实现项目聚合 API

**文件**: `services/topems-rs/backend/src/api/project.rs`

新增端点:
- `GET /api/v1/projects/{id}/dashboard` - 仪表盘数据
- `GET /api/v1/projects/{id}/gantt` - 甘特图数据

**实现要点**:
- 从 rs 服务获取项目基本信息
- 从 erp 服务获取预算数据（如可用）
- 从 hrm 服务获取人员数据（如可用）
- 聚合数据并返回

---

### 1.4 前端页面更新

#### 任务 1.4.1: 重构项目详情页

**文件**: [frontend/src/pages/ProjectDetail.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/ProjectDetail.tsx)

**改动**:
- 添加标签页导航组件
- 将现有内容放入 [概览] 标签页
- 添加占位标签页：[甘特图]、[费用]、[人员]、[设备]、[效益]、[验收]

---

#### 任务 1.4.2: 增强项目列表页

**文件**: [frontend/src/pages/ProjectList.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/ProjectList.tsx)

**改动**:
- 添加项目类型筛选
- 优化搜索功能

---

#### 任务 1.4.3: 添加路由

**文件**: [frontend/src/App.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/App.tsx)

添加项目管理相关路由:
```
/projects/dashboard
/projects/create
/projects/{id}/gantt
/projects/{id}/expenses
/projects/{id}/benefits
```

---

## Phase 2: 费用与资源 (1个月)

### 2.1 数据库变更

#### 任务 2.1.1: 创建费用表

```sql
-- migration_003_create_project_expenses.sql
CREATE TABLE IF NOT EXISTS rs.project_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES rs.project_phases(id),
    expense_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    incurred_date DATE NOT NULL,
    reported_date DATE,
    paid_date DATE,
    budget_item_id UUID,
    resource_id UUID,
    expense_ref_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    approval_workflow_id UUID,
    attachment_ids UUID[],
    created_by VARCHAR(255),
    approved_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_expenses_project ON rs.project_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_expenses_status ON rs.project_expenses(status);
CREATE INDEX IF NOT EXISTS idx_project_expenses_date ON rs.project_expenses(incurred_date);
```

---

#### 任务 2.1.2: 创建资源表

```sql
-- migration_004_create_project_resources.sql
CREATE TABLE IF NOT EXISTS rs.project_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    resource_service VARCHAR(50) NOT NULL,
    role VARCHAR(100),
    start_date DATE,
    end_date DATE,
    allocation_percent INTEGER DEFAULT 100,
    actual_hours INTEGER DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_resources_project ON rs.project_resources(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resources_type ON rs.project_resources(resource_type);
```

---

### 2.2 后端模型和API

#### 任务 2.2.1: 创建费用模型

**文件**: `services/topems-rs/backend/src/models/project_expense.rs`

---

#### 任务 2.2.2: 创建资源模型

**文件**: `services/topems-rs/backend/src/models/project_resource.rs`

---

#### 任务 2.2.3: 实现费用管理API

**文件**: `services/topems-rs/backend/src/api/project_expense.rs`

端点:
- `GET /api/v1/projects/{id}/expenses`
- `POST /api/v1/projects/{id}/expenses`
- `PUT /api/v1/projects/{id}/expenses/{expenseId}`
- `DELETE /api/v1/projects/{id}/expenses/{expenseId}`
- `POST /api/v1/projects/{id}/expenses/{expenseId}/approve`

---

#### 任务 2.2.4: 实现资源管理API

**文件**: `services/topems-rs/backend/src/api/project_resource.rs`

端点:
- `GET /api/v1/projects/{id}/resources`
- `POST /api/v1/projects/{id}/resources`
- `PUT /api/v1/projects/{id}/resources/{resourceId}`
- `DELETE /api/v1/projects/{id}/resources/{resourceId}`

---

### 2.3 前端页面

#### 任务 2.3.1: 费用管理页面

**文件**: `frontend/src/pages/ProjectExpensesPage.tsx`

**功能**:
- 费用列表展示
- 新增/编辑费用表单
- 费用审批流程
- 费用统计图表

---

#### 任务 2.3.2: 资源管理页面

**文件**: `frontend/src/pages/ProjectResourcesPage.tsx`

**功能**:
- 人员管理（集成HRM）
- 设备管理（集成MES）
- 资源分配
- 资源负载图表

---

#### 任务 2.3.3: 费用管理组件

**文件**: `frontend/src/components/project/ExpenseList.tsx`
**文件**: `frontend/src/components/project/ExpenseForm.tsx`

---

#### 任务 2.3.4: 资源管理组件

**文件**: `frontend/src/components/project/ResourceBoard.tsx`
**文件**: `frontend/src/components/project/ResourceLoadChart.tsx`

---

## Phase 3: 甘特图增强 (1个月)

### 3.1 数据模型准备

**前提**: 已有 [project_phases](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/project_phase.rs) 表，可能需要增强

---

### 3.2 后端 API

#### 任务 3.2.1: 甘特图数据API增强

**文件**: `services/topems-rs/backend/src/api/project_phase.rs`

增强功能:
- 支持阶段依赖关系
- 支持阶段拖拽更新
- 资源分配到阶段

---

### 3.3 前端甘特图实现

#### 任务 3.3.1: 选择并集成甘特图库

**选项评估**:
- `dhtmlx-gantt` - 功能完整，商业授权
- `react-gantt-scheduler` - React原生
- `d3.js` 自定义实现 - 灵活但工作量大

**推荐**: 从简单开始，先用开源库或自定义基础版本

---

#### 任务 3.3.2: 甘特图页面

**文件**: `frontend/src/pages/ProjectGanttPage.tsx`

**功能**:
- 阶段时间轴展示
- 拖拽调整阶段时间
- 里程碑展示
- 依赖关系连线

---

#### 任务 3.3.3: 甘特图组件

**文件**: `frontend/src/components/project/GanttChart.tsx`
**文件**: `frontend/src/components/project/GanttPhase.tsx`

---

## Phase 4: 效益分析 (1个月)

### 4.1 数据库变更

#### 任务 4.1.1: 创建效益分析表

```sql
-- migration_005_create_project_benefits.sql
CREATE TABLE IF NOT EXISTS rs.project_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES rs.projects(id) ON DELETE CASCADE,
    period_type VARCHAR(50) NOT NULL,
    period_date DATE NOT NULL,
    planned_cost DECIMAL(15,2) DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    planned_progress INTEGER DEFAULT 0,
    actual_progress INTEGER DEFAULT 0,
    planned_value DECIMAL(15,2) DEFAULT 0,
    earned_value DECIMAL(15,2) DEFAULT 0,
    actual_cost_eva DECIMAL(15,2) DEFAULT 0,
    cpi DECIMAL(5,4),
    spi DECIMAL(5,4),
    cv DECIMAL(15,2),
    sv DECIMAL(15,2),
    eac DECIMAL(15,2),
    etc DECIMAL(15,2),
    roi DECIMAL(10,4),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, period_type, period_date)
);

CREATE INDEX IF NOT EXISTS idx_project_benefits_project_id ON rs.project_benefits(project_id);
CREATE INDEX IF NOT EXISTS idx_project_benefits_period ON rs.project_benefits(period_type, period_date);
```

---

### 4.2 后端实现

#### 任务 4.2.1: 效益分析模型

**文件**: `services/topems-rs/backend/src/models/project_benefit.rs`

---

#### 任务 4.2.2: 挣值分析计算引擎

**文件**: `services/topems-rs/backend/src/services/eva_calculator.rs`

计算逻辑:
- CPI = EV / AC
- SPI = EV / PV
- CV = EV - AC
- SV = EV - PV
- EAC = BAC / CPI (典型偏差)
- ETC = EAC - AC
- ROI = (总收益 - 总成本) / 总成本

---

#### 任务 4.2.3: 效益分析API

**文件**: `services/topems-rs/backend/src/api/project_benefit.rs`

端点:
- `GET /api/v1/projects/{id}/benefits` - 效益分析数据
- `POST /api/v1/projects/{id}/benefits/calculate` - 手动触发计算

---

### 4.3 前端实现

#### 任务 4.3.1: 效益分析页面

**文件**: `frontend/src/pages/ProjectBenefitsPage.tsx`

**展示内容**:
- CPI/SPI 趋势图
- 挣值分析表
- EAC/ETC 预测
- ROI 分析

---

#### 任务 4.3.2: 效益分析组件

**文件**: `frontend/src/components/project/BenefitDashboard.tsx`
**文件**: `frontend/src/components/project/EVATable.tsx`

---

#### 任务 4.3.3: 验收功能

**文件**: `frontend/src/pages/ProjectAcceptancePage.tsx`
**文件**: `frontend/src/components/project/ProjectAcceptance.tsx`

---

## 数据库迁移清单

按顺序执行:

1. `migration_001_add_project_enhancements.sql` - 增强项目表
2. `migration_002_add_milestone_enhancements.sql` - 增强里程碑表
3. `migration_003_create_project_expenses.sql` - 创建费用表
4. `migration_004_create_project_resources.sql` - 创建资源表
5. `migration_005_create_project_benefits.sql` - 创建效益分析表

---

## 相关文件索引

### 后端文件

| 文件路径 | 说明 | 状态 |
|---------|------|------|
| [services/topems-rs/backend/src/models/project.rs](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/project.rs) | 项目模型 | 需更新 |
| [services/topems-rs/backend/src/models/project_phase.rs](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/project_phase.rs) | 项目阶段 | 现有 |
| [services/topems-rs/backend/src/models/project_milestone.rs](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/project_milestone.rs) | 里程碑 | 需更新 |
| [services/topems-rs/backend/src/models/project_member.rs](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/models/project_member.rs) | 成员 | 现有 |
| services/topems-rs/backend/src/models/project_expense.rs | 费用 | 新建 |
| services/topems-rs/backend/src/models/project_resource.rs | 资源 | 新建 |
| services/topems-rs/backend/src/models/project_benefit.rs | 效益 | 新建 |
| [services/topems-rs/backend/src/api/project.rs](file:///Users/xingzhai/TOPEMS/services/topems-rs/backend/src/api/project.rs) | 项目API | 需更新 |
| services/topems-rs/backend/src/api/project_phase.rs | 阶段API | 需增强 |
| services/topems-rs/backend/src/api/project_expense.rs | 费用API | 新建 |
| services/topems-rs/backend/src/api/project_resource.rs | 资源API | 新建 |
| services/topems-rs/backend/src/api/project_benefit.rs | 效益API | 新建 |
| services/topems-rs/backend/src/services/eva_calculator.rs | EVA计算 | 新建 |

### 前端文件

| 文件路径 | 说明 | 状态 |
|---------|------|------|
| [frontend/src/pages/ProjectList.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/ProjectList.tsx) | 项目列表 | 需增强 |
| [frontend/src/pages/ProjectDetail.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/ProjectDetail.tsx) | 项目详情 | 需重构 |
| [frontend/src/pages/ProjectDashboardPage.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/pages/ProjectDashboardPage.tsx) | 驾驶舱 | 现有基础 |
| frontend/src/pages/ProjectGanttPage.tsx | 甘特图 | 新建 |
| frontend/src/pages/ProjectExpensesPage.tsx | 费用 | 新建 |
| frontend/src/pages/ProjectResourcesPage.tsx | 资源 | 新建 |
| frontend/src/pages/ProjectBenefitsPage.tsx | 效益 | 新建 |
| frontend/src/pages/ProjectAcceptancePage.tsx | 验收 | 新建 |
| frontend/src/pages/ProjectCreatePage.tsx | 创建项目 | 新建 |
| [frontend/src/App.tsx](file:///Users/xingzhai/TOPEMS/frontend/src/App.tsx) | 路由配置 | 需更新 |
| frontend/src/components/project/*.tsx | 项目组件 | 新建 |

### 其他服务集成

| 服务 | 集成点 |
|------|-------|
| topems-erp | 预算数据、资产数据 |
| topems-hrm | 人员数据、工时数据 |
| topems-mes | 设备数据、使用状态 |
| topems-flow | 审批流程 |
| topems-doc | 文档管理 |

---

## 实施检查清单

### Phase 1 检查项
- [ ] 数据库迁移脚本编写并测试
- [ ] Project 模型更新完成
- [ ] ProjectMilestone 模型更新完成
- [ ] 聚合 API 实现并测试
- [ ] 项目详情页重构完成
- [ ] 路由配置更新
- [ ] 集成测试通过

### Phase 2 检查项
- [ ] 费用表和资源表创建
- [ ] 费用和资源模型实现
- [ ] 费用管理 API 实现
- [ ] 资源管理 API 实现
- [ ] 费用管理页面完成
- [ ] 资源管理页面完成
- [ ] 与 ERP/HRM/MES 集成测试

### Phase 3 检查项
- [ ] 甘特图库选择并集成
- [ ] 甘特图数据 API 增强
- [ ] 甘特图页面实现
- [ ] 拖拽功能测试
- [ ] 性能测试（大项目场景）

### Phase 4 检查项
- [ ] 效益分析表创建
- [ ] EVA 计算引擎实现
- [ ] 效益分析 API 完成
- [ ] 效益分析页面完成
- [ ] 验收功能完成
- [ ] 端到端业务流程测试

---

**计划结束**

