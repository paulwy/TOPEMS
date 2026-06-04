# 统一项目管理架构设计

## 架构选择

**推荐方案：独立项目管理服务 `topems-pm`**

---

## 服务架构

```
                            ┌─────────────────────────────────┐
                            │          Frontend UI             │
                            │    (统一项目管理门户)             │
                            └────────────────┬────────────────┘
                                             │
                                             │
                            ┌────────────────▼────────────────┐
                            │         API Gateway              │
                            │     Nginx (路由聚合)             │
                            └────────────────┬────────────────┘
                                             │
         ┌───────────────────────────────────┼───────────────────────────────────┐
         │                                   │                                   │
         │                    ┌──────────────▼──────────────┐                    │
         │                    │     topems-pm (8024)        │                    │
         │                    │    统一项目管理服务（核心）  │                    │
         │                    └──────────────┬──────────────┘                    │
         │                                   │                                   │
         │            ┌──────────────────────┼──────────────────────┐           │
         │            │                      │                      │           │
         │  ┌─────────▼─────────┐  ┌────────▼────────┐  ┌────────▼────────┐  │
         │  │   topems-rs       │  │   topems-erp    │  │   topems-hrm    │  │
         │  │   (研发管理)      │  │   (预算/合同)   │  │   (人员管理)    │  │
         │  └───────────────────┘  └─────────────────┘  └─────────────────┘  │
         │            │                      │                      │           │
         │  ┌─────────▼─────────┐  ┌────────▼────────┐  ┌────────▼────────┐  │
         │  │   topems-mes      │  │   topems-flow   │  │   topems-doc   │  │
         │  │   (生产/设备)     │  │   (工作流)       │  │   (文档)        │  │
         │  └───────────────────┘  └─────────────────┘  └─────────────────┘  │
         │                                                                     │
         │  ┌───────────────────────────────────────────────────────────┐   │
         │  │                      PostgreSQL                            │   │
         │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
         │  │  │   pm    │  │   rs    │  │   erp   │  │   hrm   │ ...   │   │
         │  │  │ schema  │  │ schema  │  │ schema  │  │ schema  │       │   │
         │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │   │
         │  └───────────────────────────────────────────────────────────┘   │
         └─────────────────────────────────────────────────────────────────────┘
```

---

## topems-pm 服务职责

### 核心职责
1. **项目生命周期管理**
   - 立项申请与审批
   - 项目实施管理
   - 项目验收与归档

2. **通用项目模型**
   - 支持所有项目类型（科研/生产/施工/设计/服务）
   - 通过 `project_type` 和 `project_config` 实现差异化

3. **进度与甘特图**
   - 阶段管理与依赖关系
   - 里程碑管理
   - 可视化甘特图

4. **预算与费用**
   - 项目预算规划
   - 费用报销与审批
   - 预算偏差分析

5. **资源管理**
   - 人员分配（来自 HRM）
   - 设备分配（来自 MES）
   - 资源负载跟踪

6. **效益分析**
   - 挣值分析（EVA）
   - CPI/SPI 指标
   - ROI 计算

### 数据模型设计

#### Schema: `pm`

```sql
-- 项目核心表
CREATE TABLE pm.projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    project_type VARCHAR(50) NOT NULL, -- rs/production/construction/design/service
    status VARCHAR(50) NOT NULL,
    leader VARCHAR(255),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    budget DECIMAL(15,2),
    progress INTEGER DEFAULT 0,
    project_config JSONB,
    benefit_target JSONB,
    risk_level VARCHAR(50),
    priority INTEGER DEFAULT 3,
    tags TEXT[],
    parent_id UUID REFERENCES pm.projects(id),
    workspace_id UUID,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_type ON pm.projects(project_type);
CREATE INDEX idx_projects_status ON pm.projects(status);

-- 项目阶段表
CREATE TABLE pm.project_phases (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    planned_duration_days INTEGER,
    actual_duration_days INTEGER,
    status VARCHAR(50),
    progress INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 1,
    predecessor_id UUID REFERENCES pm.project_phases(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目里程碑表
CREATE TABLE pm.project_milestones (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES pm.project_phases(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    status VARCHAR(50),
    deliverable_type VARCHAR(100),
    acceptance_criteria TEXT,
    acceptance_status VARCHAR(50),
    accepted_by VARCHAR(255),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目成员表
CREATE TABLE pm.project_members (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    allocation_percent INTEGER DEFAULT 100,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目资源表
CREATE TABLE pm.project_resources (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- person/equipment/asset
    resource_id UUID NOT NULL,
    resource_service VARCHAR(50), -- hrm/mes/erp
    role VARCHAR(100),
    start_date DATE,
    end_date DATE,
    allocation_percent INTEGER DEFAULT 100,
    actual_hours INTEGER DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目费用表
CREATE TABLE pm.project_expenses (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES pm.project_phases(id),
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目效益分析表
CREATE TABLE pm.project_benefits (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES pm.projects(id) ON DELETE CASCADE,
    period_type VARCHAR(50) NOT NULL, -- weekly/monthly/quarterly
    period_date DATE NOT NULL,
    planned_cost DECIMAL(15,2) DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    planned_progress INTEGER DEFAULT 0,
    actual_progress INTEGER DEFAULT 0,
    planned_value DECIMAL(15,2) DEFAULT 0, -- PV
    earned_value DECIMAL(15,2) DEFAULT 0, -- EV
    actual_cost_eva DECIMAL(15,2) DEFAULT 0, -- AC
    cpi DECIMAL(5,4),
    spi DECIMAL(5,4),
    cv DECIMAL(15,2),
    sv DECIMAL(15,2),
    eac DECIMAL(15,2),
    etc DECIMAL(15,2),
    roi DECIMAL(10,4),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, period_type, period_date)
);

-- 项目类型关联配置表
CREATE TABLE pm.project_type_configs (
    id UUID PRIMARY KEY,
    project_type VARCHAR(50) NOT NULL UNIQUE,
    service_name VARCHAR(50), -- rs/erp/mes/hrm
    default_status VARCHAR(50),
    default_phases JSONB,
    required_fields TEXT[],
    custom_fields JSONB,
    workflow_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 服务集成配置表
CREATE TABLE pm.service_integrations (
    id UUID PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    api_base_url VARCHAR(255),
    api_key VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API 设计

### 项目管理 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/projects` | GET | 获取项目列表（支持筛选） |
| `/api/v1/projects` | POST | 创建新项目 |
| `/api/v1/projects/:id` | GET | 获取项目详情 |
| `/api/v1/projects/:id` | PUT | 更新项目 |
| `/api/v1/projects/:id` | DELETE | 删除项目 |
| `/api/v1/projects/:id/dashboard` | GET | 项目仪表盘（聚合数据） |
| `/api/v1/projects/:id/gantt` | GET | 甘特图数据 |
| `/api/v1/projects/:id/benefits` | GET | 效益分析数据 |
| `/api/v1/projects/:id/phases` | GET/POST | 阶段管理 |
| `/api/v1/projects/:id/milestones` | GET/POST | 里程碑管理 |
| `/api/v1/projects/:id/members` | GET/POST | 成员管理 |
| `/api/v1/projects/:id/resources` | GET/POST | 资源管理 |
| `/api/v1/projects/:id/expenses` | GET/POST | 费用管理 |
| `/api/v1/projects/:id/approve` | POST | 提交审批 |
| `/api/v1/projects/:id/acceptance` | POST | 提交验收 |

---

## 服务集成模式

### 数据聚合策略

1. **按需拉取** - 项目详情页加载时，从相关服务拉取
2. **事件同步** - 重要数据变更时，通过事件总线同步
3. **缓存层** - 对变化不频繁的数据进行缓存

### 服务间通信

```
项目创建流程示例：

1. 用户在 PM 服务创建项目
2. PM 服务触发事件：project.created
3. 相关服务订阅事件：
   - RS: 初始化研发配置
   - ERP: 初始化预算账户
   - FLOW: 启动审批工作流
4. 各服务更新自己的数据，通过 API 回调 PM
```

---

## 前端路由设计

```
/projects                    # 项目列表（全部类型）
/projects/dashboard          # 项目驾驶舱
/projects/create             # 创建项目（选择类型）
/projects/rs                 # 研发项目列表
/projects/production         # 生产项目列表
/projects/construction       # 施工项目列表
/projects/design             # 设计项目列表
/projects/service            # 服务项目列表
/projects/:id                # 项目详情（通用，根据类型显示不同功能）
/projects/:id/gantt          # 甘特图
/projects/:id/budget         # 预算
/projects/:id/expenses       # 费用
...
```

---

## 迁移策略（从现有 topems-rs 迁移）

### Phase 1: 新建 topems-pm 服务
1. 创建新服务结构
2. 实现数据库 schema
3. 实现核心 API

### Phase 2: 数据迁移
1. 从 `rs.projects` 迁移到 `pm.projects`
2. 更新外键引用
3. 同步相关数据

### Phase 3: API 路由切换
1. 保持 rs 服务的旧 API 兼容（临时）
2. 前端路由指向 PM 服务
3. 逐步弃用旧 API

---

## 总结

| 方面 | 方案 A (独立服务) | 方案 B (RS聚合) |
|-----|------------------|---------------|
| 架构清晰度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 服务解耦 | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 实现复杂度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 扩展性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 推荐度 | ✅ 首选 | 🟡 备选 |

---

**版本**: 1.0.0
**最后更新**: 2026-06-04
