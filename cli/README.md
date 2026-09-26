# TOPEMS CLI 工具

> Python 编写的 TOPEMS 服务管理命令行工具

## 安装

```bash
cd cli
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 以 editable 模式安装（自动安装 pyyaml/click/rich/httpx 依赖，并注册 topems 命令）
pip install -e .
```

## 快速开始

```bash
# 查看帮助（pip install -e . 后无需手动设置 PYTHONPATH）
python -m topems_cli --help

# 或直接使用入口脚本
./bin/topems --help
```

## 命令

### 状态管理

```bash
# 查看所有服务状态
topems status --all

# 查看特定服务
topems status iam
topems status pm hrm crm

# 按模块查看
topems status -m core
topems status -m erp
topems status -m plm

# JSON 输出
topems status --all --json
```

### 启动/停止服务

```bash
# 启动单个服务
topems start iam

# 启动多个服务
topems start iam pm hrm

# 按模块启动
topems start -m core
topems start -m erp

# 启动所有服务（含前端）
topems start --all

# 仅启动后端，不启动前端
topems start --all --no-frontend

# 停止服务
topems stop iam
topems stop --all        # 同时停止前端
```

### 自动修复功能

启动服务时会自动检查 PostgreSQL 数据库状态，如果检测到问题会自动尝试修复：

- **PostgreSQL 未启动**：自动启动数据库服务
- **残留锁文件**：自动删除 `postmaster.pid` 文件
- **连接超时**：自动重试连接

```bash
$ topems start --all
检查数据库连接...
警告: PostgreSQL 未就绪: localhost:5432 - no response
尝试修复 PostgreSQL (1/3)...
已修复: 已删除残留的pid文件: /opt/homebrew/var/postgresql@18/postmaster.pid
PostgreSQL 启动成功
✓ PostgreSQL 已恢复: PostgreSQL 运行正常
```

### 日志查看

```bash
# 查看服务日志
topems logs iam

# 实时跟踪日志
topems logs -f iam

# 最近行数
topems logs -n 100 iam
```

### 测试

```bash
# 运行所有测试
topems test --all

# 运行特定服务测试
topems test iam
topems test pm hrm

# 运行特定类型的测试
topems test --type unit
topems test --type integration
```

### 构建

```bash
# 构建所有服务
topems build all
topems build all --release

# 构建单个服务
topems build service iam
topems build service iam --release

# 构建共享库
topems build lib
topems build lib --release

# 构建前端
topems build frontend
topems build frontend --dev

# 清理构建产物
topems build clean
```

### 清理

```bash
# 清理编译缓存
topems cleanup cache

# 自动修复 Rust 警告
topems cleanup warnings

# 清理日志
topems cleanup logs

# 清理所有（缓存+日志）
topems cleanup all

# 停止并清理服务
topems cleanup services
```

### 数据库

```bash
# 查看数据库状态
topems db status

# 列出所有数据库
topems db list

# 列出所有表
topems db tables

# 初始化数据库
topems db init

# 运行迁移
topems db migrate
topems db migrate --service iam

# 备份数据库
topems db backup
topems db backup backup_20240101.sql

# 恢复数据库
topems db restore backup_20240101.sql

# 删除数据库（危险）
topems db drop
```

### Docker（可选）

仅在 Docker 可用时显示。

```bash
# 查看容器状态
topems docker status

# 启动/停止容器
topems docker start
topems docker stop

# 查看日志
topems docker logs iam

# 进入容器
topems docker exec iam bash
```

## 服务模块

> 与 `config/services.yaml` 的 `module_groups` 保持一致

| 模块 | 服务 |
|------|------|
| **core** | unified-core (iam) |
| **erp** | erp, finance, ai |
| **collaboration** | hrm, pm, crm |
| **manufacturing** | mes, pdm |
| **supply-chain** | scm, wms, srm |
| **quality-rd** | qms, lims, ehs, rd |
| **analytics** | bi, portal |
| **infrastructure** | mobile, gis, integration |
| **master-data** | master-data |
| **extension** | search, communication, billing, ticket, feedback |

## 端口分配

> 与 `scripts/topems.sh` 的 `SERVICES_CONFIG` 保持一致

| 服务 | 端口 | 说明 |
|------|------|------|
| unified-core (iam) | 8000 | 统一核心服务 |
| erp | 8010 | 企业资源计划 |
| finance | 8011 | 财务管理 |
| ai | 8013 | AI 服务 |
| hrm | 8020 | 人力资源 |
| pm | 8023 | 项目管理 |
| crm | 8029 | 客户关系 |
| mes | 8030 | 制造执行 |
| pdm | 8031 | 产品数据 |
| scm | 8040 | 供应链 |
| wms | 8041 | 仓储管理 |
| srm | 8042 | 供应商管理 |
| qms | 8050 | 质量管理 |
| lims | 8051 | 实验室管理 |
| ehs | 8052 | 环境安全 |
| rd | 8053 | 研发管理 |
| bi | 8060 | 商业智能 |
| portal | 8063 | 企业门户 |
| mobile | 8070 | 移动端 |
| gis | 8071 | 地理信息 |
| integration | 8072 | 系统集成 |
| search | 8082 | 搜索服务 |
| communication | 8084 | 通讯服务 |
| billing | 8085 | 计费服务 |
| ticket | 8086 | 工单服务 |
| feedback | 8087 | 反馈服务 |
| lowcode | 8088 | 低代码平台 |
| master-data | 8090 | 主数据 |
| Frontend | 3000 | 前端 |

## 配置文件

服务配置由 `config/services.yaml` 统一管理。

## 环境变量

```bash
# 数据库
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=topems
export POSTGRES_PASSWORD=topems_secret
export POSTGRES_DB=topems

# Redis
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

## 文档

- [部署文档](../docs/admin/README.md)
- [端口规划](../docs/architecture/port-planning.md)
- Windows 部署（待补充）
