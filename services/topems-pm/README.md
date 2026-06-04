# TOPEMS-PM - 统一项目管理服务

TOPEMS-PM 是 TOPEMS 系统的项目管理核心服务，提供统一的项目管理能力，支持科研、生产、施工、设计、服务等多种项目类型。

## 功能特性

- **统一项目管理**：支持所有项目类型的标准化管理
- **项目生命周期**：从立项、实施到验收的完整流程管理
- **甘特图与进度**：可视化项目进度和里程碑管理
- **预算与费用**：项目预算控制和费用管理
- **资源分配**：人员、设备、资产等资源分配管理
- **效益分析**：挣值分析(EVA)、CPI/SPI、ROI等指标计算
- **多服务集成**：与 ERP、HRM、MES 等服务无缝集成

## 服务端口

- API 服务端口: `8024`
- 服务名: `topems-pm`

## 项目类型

| 类型 | 说明 | 关联服务 |
|------|------|---------|
| `research` | 科研项目 | LIMS |
| `production` | 生产项目 | MES |
| `construction` | 施工项目 | GIS |
| `design` | 设计项目 | PDM |
| `service` | 服务项目 | CRM |

## 数据库 Schema

使用独立的 `pm` Schema 存储项目管理数据：

- `pm.projects` - 项目基础信息
- `pm.project_phases` - 项目阶段
- `pm.project_milestones` - 项目里程碑
- `pm.project_members` - 项目成员
- `pm.project_resources` - 项目资源
- `pm.project_expenses` - 项目费用
- `pm.project_benefits` - 项目效益分析
- `pm.project_type_configs` - 项目类型配置
- `pm.service_integrations` - 服务集成配置

## API 端点

### 项目管理
- `GET /api/v1/projects` - 获取项目列表
- `POST /api/v1/projects` - 创建项目
- `GET /api/v1/projects/{id}` - 获取项目详情
- `PUT /api/v1/projects/{id}` - 更新项目
- `DELETE /api/v1/projects/{id}` - 删除项目
- `GET /api/v1/projects/{id}/dashboard` - 项目仪表盘
- `GET /api/v1/projects/{id}/gantt` - 甘特图数据

### 其他端点
- 项目阶段管理
- 里程碑管理
- 成员管理
- 资源管理
- 费用管理
- 效益分析
- 类型配置
- 服务集成

## 开发与运行

### 本地开发
```bash
cd services/topems-pm/backend
cargo run
```

### Docker 构建
```bash
docker build -t topems-pm:latest .
```

## 环境变量

参考其他 TOPEMS 服务的环境变量配置。

## 与现有服务的关系

### 与 topems-rs 的关系
- topems-rs 作为科研项目的专用服务，专注于实验、配方等科研特有功能
- topems-pm 提供统一的项目管理框架，支持所有项目类型
- 两者可以同时运行，通过 API 集成协同工作

## 设计文档

详细的设计文档请参考：
- [统一项目管理架构设计](../../docs/design/ARCHITECTURE_PROJECT_MANAGEMENT.md)
- [项目管理模块设计](../../docs/design/PROJECT_MANAGEMENT_DESIGN.md)
- [实施计划](../../docs/design/IMPLEMENTATION_PLAN.md)
