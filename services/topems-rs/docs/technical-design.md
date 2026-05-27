# TOPEMS-RS 技术设计文档

**文档版本**: v0.1.0
**更新日期**: 2026-05-24
**系统名称**: TOPEMS-RS 科研研发管理系统

---

## 一、系统概述

### 1.1 系统定位

TOPEMS-RS 是化工新材料企业科研研发管理系统，为企业提供完整的研发项目管理、配方管理和试验管理功能。

### 1.2 核心功能

- **项目管理**：项目立项、审批、进度跟踪、团队协作
- **配方管理**：配方创建、版本管理、工艺参数配置
- **试验管理**：试验计划、执行、结果分析
- **成果管理**：专利、论文、奖项管理

---

## 二、技术架构

### 2.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
| ------ ------ ------ ------ |
| 前端框架 | React | 18.x | UI 组件开发 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 构建工具 | Vite | 5.x | 快速构建 |
| 样式 | Tailwind CSS | 3.x | 原子化 CSS |
| 后端框架 | Axum | 0.8.x | Web 框架 |
| 语言 | Rust | 1.77+ | 后端逻辑 |
| ORM | SQLx | 0.8.x | 数据库访问 |
| 主数据库 | PostgreSQL | 16 | 业务数据存储 |
| 向量扩展 | pgvector | - | 向量检索（未来扩展） |

### 2.2 项目结构

```text
services/topems-rs/
├── backend/                    # Rust 后端
│   ├── src/
│   │   ├── api/              # API 路由
│   │   │   ├── project.rs   # 项目管理 API
│   │   │   ├── formula.rs   # 配方管理 API
│   │   │   └── experiment.rs # 试验管理 API
│   │   ├── models/          # 数据模型
│   │   │   ├── project.rs
│   │   │   ├── formula.rs
│   │   │   └── experiment.rs
│   │   ├── db/              # 数据库相关
│   │   │   └── schema.sql   # 数据库 Schema
│   │   └── main.rs          # 应用入口
│   ├── Cargo.toml
│   └── .env
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── api/             # API 客户端
│   │   │   ├── client.ts
│   │   │   └── project.ts
│   │   ├── pages/           # 页面组件
│   │   │   ├── ProjectList.tsx
│   │   │   ├── FormulaList.tsx
│   │   │   └── ExperimentList.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 三、数据库设计

### 3.1 数据库 Schema

#### 3.1.1 项目管理表 (projects)

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    project_type VARCHAR(50) NOT NULL,  -- research, development, trial
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    leader VARCHAR(100) NOT NULL,
    team_members JSONB DEFAULT '[]',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    budget DECIMAL(15, 2),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**索引**：

- `idx_projects_status` - 按状态查询
- `idx_projects_leader` - 按负责人查询
- `idx_projects_created_at` - 按创建时间排序

**业务规则**：

- 项目编码全局唯一
- 进度值范围 0-100
- 团队成员使用 JSONB 数组存储

#### 3.1.2 配方管理表 (formulas)

```sql
CREATE TABLE formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    ingredients JSONB NOT NULL DEFAULT '[]',
    process_params JSONB DEFAULT '{}',
    properties JSONB DEFAULT '{}',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**JSONB 结构示例**：

```json
// ingredients
[
  {
    "name": "聚乙烯",
    "cas_no": "9002-88-4",
    "ratio": 60.0,
    "unit": "%",
    "supplier": "中石化",
    "remarks": "优级品"
  },
  {
    "name": "增塑剂",
    "cas_no": "117-81-7",
    "ratio": 30.0,
    "unit": "%",
    "supplier": "巴斯夫"
  }
]

// process_params
{
  "temperature": "180-200°C",
  "pressure": "10-15MPa",
  "time": "30min",
  "speed": "100rpm"
}

// properties
{
  "density": "0.95 g/cm³",
  "tensile_strength": "15 MPa",
  "elongation": "300%",
  "impact_resistance": "Good"
}
```

#### 3.1.3 配方版本历史表 (formula_versions)

```sql
CREATE TABLE formula_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    ingredients JSONB NOT NULL,
    process_params JSONB,
    properties JSONB,
    change_reason TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(formula_id, version)
);
```

#### 3.1.4 试验管理表 (experiments)

```sql
CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    formula_id UUID REFERENCES formulas(id) ON DELETE SET NULL,
    experiment_type VARCHAR(50) NOT NULL,  -- performance, stability, safety, quality
    status VARCHAR(50) NOT NULL DEFAULT 'planned',
    objective TEXT NOT NULL,
    method TEXT NOT NULL,
    results JSONB DEFAULT '{}',
    conclusions TEXT,
    experimenter VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**试验类型**：

- `performance` - 性能测试
- `stability` - 稳定性测试
- `safety` - 安全性测试
- `quality` - 质量检验

**试验状态**：

- `planned` - 已计划
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

#### 3.1.5 试验记录表 (experiment_records)

```sql
CREATE TABLE experiment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL,  -- observation, measurement, note, attachment
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    recorded_by VARCHAR(100) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.1.6 研发成果表 (achievements)

```sql
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,  -- patent, paper, award, product
    title VARCHAR(255) NOT NULL,
    description TEXT,
    application_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    filing_date DATE,
    grant_date DATE,
    attachments JSONB DEFAULT '[]',
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 四、API 设计

### 4.1 统一 API 响应格式

```json
{
  "code": 200,
  "success": true,
  "data": {},
  "message": "Success",
  "timestamp": "2026-05-24T00:00:00Z"
}
```

**错误响应**：

```json
{
  "code": 404,
  "success": false,
  "data": null,
  "message": "项目不存在",
  "timestamp": "2026-05-24T00:00:00Z"
}
```

### 4.2 项目管理 API

#### 4.2.1 获取项目列表

```text
GET /api/v1/projects
```

**Query Parameters**：

- `page` (optional): 页码，默认 1
- `page_size` (optional): 每页数量，默认 20，最大 100
- `search` (optional): 搜索关键词（名称或编码模糊搜索）
- `status` (optional): 项目状态

**Response**：

```json
{
  "code": 200,
  "success": true,
  "data": {
    "projects": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  },
  "message": "获取项目列表成功"
}
```

#### 4.2.2 创建项目

```text
POST /api/v1/projects
```

**Request Body**：

```json
{
  "name": "高性能聚乙烯研发",
  "code": "RS-2026-001",
  "description": "研发新一代高性能聚乙烯材料",
  "project_type": "research",
  "leader": "张三",
  "team_members": ["李四", "王五"],
  "start_date": "2026-06-01T00:00:00Z",
  "end_date": "2026-12-31T00:00:00Z",
  "budget": 500000.00
}
```

**Response**：

```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "uuid",
    "name": "高性能聚乙烯研发",
    "code": "RS-2026-001",
    ...
  },
  "message": "项目创建成功"
}
```

#### 4.2.3 获取项目详情

```text
GET /api/v1/projects/:id
```

#### 4.2.4 更新项目

```text
PUT /api/v1/projects/:id
```

**Request Body**：

```json
{
  "name": "高性能聚乙烯研发（修改）",
  "status": "active",
  "progress": 30,
  "end_date": "2027-06-30T00:00:00Z"
}
```

#### 4.2.5 删除项目

```text
DELETE /api/v1/projects/:id
```

### 4.3 配方管理 API

#### 4.3.1 获取配方列表

```text
GET /api/v1/formulas
```

**Query Parameters**：

- `page` (optional): 页码
- `page_size` (optional): 每页数量
- `search` (optional): 搜索关键词
- `status` (optional): 配方状态
- `project_id` (optional): 关联项目 ID

#### 4.3.2 创建配方

```text
POST /api/v1/formulas
```

**Request Body**：

```json
{
  "name": "PE-001 基础配方",
  "code": "FORMULA-2026-001",
  "description": "聚乙烯基础配方",
  "project_id": "uuid",
  "ingredients": [...],
  "process_params": {...},
  "properties": {...}
}
```

#### 4.3.3 获取配方版本历史

```text
GET /api/v1/formulas/:id/versions
```

### 4.4 试验管理 API

#### 4.4.1 获取试验列表

```text
GET /api/v1/experiments
```

**Query Parameters**：

- `page` (optional): 页码
- `page_size` (optional): 每页数量
- `search` (optional): 搜索关键词
- `status` (optional): 试验状态
- `project_id` (optional): 关联项目 ID
- `experiment_type` (optional): 试验类型

#### 4.4.2 创建试验

```text
POST /api/v1/experiments
```

**Request Body**：

```json
{
  "name": "PE-001 性能测试",
  "code": "EXP-2026-001",
  "project_id": "uuid",
  "formula_id": "uuid",
  "experiment_type": "performance",
  "objective": "测试材料的拉伸强度和伸长率",
  "method": "按照 GB/T 1040.2-2006 标准执行",
  "experimenter": "李四"
}
```

#### 4.4.3 获取试验记录

```text
GET /api/v1/experiments/:id/records
```

---

## 五、前端架构

### 5.1 组件结构

```text
src/
├── api/                    # API 客户端
│   ├── client.ts          # Axios 实例和拦截器
│   └── project.ts         # 项目 API
├── pages/                 # 页面组件
│   ├── ProjectList.tsx   # 项目列表页
│   ├── FormulaList.tsx  # 配方列表页
│   └── ExperimentList.tsx # 试验列表页
├── components/           # 业务组件（待扩展）
├── hooks/                # 自定义 Hooks（待扩展）
├── store/                # 状态管理（待扩展）
└── App.tsx              # 应用入口
```

### 5.2 状态管理

使用 Zustand 进行状态管理：

```typescript
interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectRequest) => Promise<void>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}
```

### 5.3 路由设计

由于本系统是独立子系统，前端采用单页应用结构，通过 Tab 切换不同模块。

---

## 六、部署架构

### 6.1 服务端口分配

| 服务 | 端口 | 说明 |
| ------ | ------ | ------ |
| topems-rs-backend | 8005 | 后端 API |
| topems-rs-frontend | 3006 | 前端页面 |

### 6.2 环境变量

**后端 (.env)**：

```text
PORT=8005
DATABASE_URL=postgres://postgres:postgres@localhost:5432/topems_rs
RUST_LOG=info
```

**前端 (.env)**：

```text
VITE_API_URL=http://localhost:8005
```

---

## 七、下一步开发计划

### 7.1 短期计划（1-2周）

- [ ] 完善项目管理 CRUD 功能
- [ ] 实现项目详情页面
- [ ] 实现新建/编辑项目表单
- [ ] 添加项目搜索和筛选功能
- [ ] 实现配方管理完整功能
- [ ] 实现试验管理完整功能

### 7.2 中期计划（1个月）

- [ ] 实现配方版本管理
- [ ] 实现试验记录功能
- [ ] 实现成果管理功能
- [ ] 添加数据可视化（进度图表）
- [ ] 集成知识中台（TOPEMS-AI）
- [ ] 添加权限控制（接入 TOPEMS-IAM）

### 7.3 长期计划（2-3个月）

- [ ] 实现配方推荐功能（AI）
- [ ] 实现试验数据分析
- [ ] 实现与其他系统数据互通
- [ ] 性能优化和压力测试
- [ ] 移动端适配
- [ ] 离线功能支持

---

## 八、技术要点

### 8.1 JSONB 字段操作

PostgreSQL JSONB 支持丰富的查询和索引：

```sql
-- 查询包含特定成分的配方
SELECT * FROM formulas
WHERE ingredients @> '[{"name": "聚乙烯"}]';

-- 创建 GIN 索引
CREATE INDEX idx_formulas_ingredients ON formulas USING GIN (ingredients);

-- 查询特定属性的配方
SELECT * FROM formulas
WHERE properties->>'density' = '0.95 g/cm³';
```

### 8.2 异步处理

使用 Rust async/await 进行异步数据库操作：

```rust
async fn create_project(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let result = sqlx::query_as::<_, Project>(...)
        .bind(...)
        .fetch_one(&state.db)
        .await;

    match result {
        Ok(project) => Json(ApiResponse::success(project, "创建成功")),
        Err(e) => {
            tracing::error!("创建项目失败: {}", e);
            Json(ApiResponse::error(500, "创建失败"))
        }
    }
}
```

### 8.3 错误处理

统一错误处理模式：

```rust
match result {
    Ok(value) => Json(ApiResponse::success(value, "成功")),
    Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "不存在")),
    Err(e) => {
        tracing::error!("操作失败: {}", e);
        Json(ApiResponse::error(500, "服务器错误"))
    }
}
```

---

## 九、测试计划

### 9.1 单元测试

- 数据模型序列化/反序列化
- API 请求/响应处理
- 前端组件渲染

### 9.2 集成测试

- 数据库 CRUD 操作
- API 端点测试
- 前端页面功能测试

### 9.3 性能测试

- 并发请求测试
- 大数据量查询测试
- API 响应时间测试

---

**文档完成日期**: 2026-05-24
**下一版本**: v0.2.0
