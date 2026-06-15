# TOPEMS CLI 工具

> Python 编写的 TOPEMS 服务管理命令行工具

## 安装

```bash
cd cli
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

pip install pyyaml click rich httpx
```

## 快速开始

```bash
# 设置环境变量
export PYTHONPATH=/path/to/TOPEMS/cli/src

# 查看帮助
python -m topems_cli --help
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

# 启动所有服务
topems start --all

# 停止服务
topems stop iam
topems stop --all
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

| 模块 | 服务 |
|------|------|
| **core** | iam, pm, notification, portal, flow, integration |
| **erp** | erp, hrm, crm |
| **plm** | rs, lims, pdm, doc |
| **mes** | mes, qms, ehs |
| **scm** | scm, srm, wms |
| **infra** | file, mail, im, gis |
| **analytics** | bi, report, ai |
| **ext** | mobile |

## 端口分配

| 服务 | 端口 |
|------|------|
| IAM | 8000 |
| PM | 8001 |
| Notification | 8002 |
| Portal | 8003 |
| Flow | 8004 |
| Integration | 8005 |
| ERP | 8010 |
| HRM | 8011 |
| CRM | 8012 |
| RS | 8020 |
| LIMS | 8022 |
| PDM | 8023 |
| DOC | 8024 |
| MES | 8030 |
| QMS | 8031 |
| EHS | 8032 |
| SCM | 8040 |
| SRM | 8041 |
| WMS | 8042 |
| File | 8050 |
| Mail | 8051 |
| IM | 8052 |
| GIS | 8053 |
| BI | 8060 |
| Report | 8061 |
| AI | 8062 |
| Mobile | 8070 |
| Frontend | 3000 |

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

- [部署文档](../docs/deployment/README.md)
- [端口规划](../docs/architecture/port-planning.md)
- [Windows 部署](../docs/deployment/windows-deployment.md)
