# TOPEMS 脚本工具说明

## 目录

- [脚本概述](#脚本概述)
- [topems.sh 统一入口脚本](#topemssh-统一入口脚本)
- [部署脚本](#部署脚本)
- [数据库脚本](#数据库脚本)
- [开发辅助脚本](#开发辅助脚本)
- [AI 模型管理](#ai-模型管理)

---

## 脚本概述

TOPEMS 项目提供了一系列脚本工具，位置在 `scripts/` 目录下：

```
scripts/
├── topems.sh                  # 统一入口脚本（主要工具）
├── deploy.sh                  # 部署脚本
├── install-deps.sh            # 依赖安装脚本
├── update_admin_password.sh   # 管理员密码重置
├── health_check.sh            # 健康检查脚本
├── ai-models.sh               # AI 模型管理
├── rollback.sh                # 回滚脚本
├── run-core-tests.sh          # 核心测试脚本
├── run-iam-tests.sh           # IAM 测试脚本
├── services.conf              # 服务配置
├── docker/
│   └── topems-docker.sh       # Docker 部署脚本
├── performance-test/
│   ├── run-all-tests.sh       # 性能测试
│   ├── database-performance-test.js
│   └── scm-performance-test.js
└── windows/
    └── ...                    # Windows 环境脚本
```

---

## topems.sh 统一入口脚本

### 位置

```
/Users/air/TOPEMS/scripts/topems.sh
```

### 功能概览

| 分类 | 命令 | 说明 |
|------|------|------|
| 服务管理 | `status`, `start`, `stop`, `restart` | 服务的启停和状态查看 |
| 编译构建 | `build`, `build-all`, `build-backend`, `build-frontend` | 编译后端/前端 |
| 测试 | `test-all`, `test-backend`, `test-frontend` | 运行测试 |
| 数据库 | `db start/stop/status/migrate/backup/restore/reset` | 数据库管理 |
| 一键操作 | `run`, `run-stop`, `restart-all` | 一键启停 |
| 开发 | `dev`, `install-deps` | 开发环境 |
| AI | `ai start/stop/status/pull` | AI 模型管理 |

### 服务列表

脚本管理以下服务：

| 服务名 | 端口 | 说明 |
|--------|------|------|
| iam | 8000 | 身份认证服务 |
| pm | 8023 | 项目管理 |
| erp | 8010 | ERP 服务 |
| hrm | 8020 | HRM 服务 |
| crm | 8029 | CRM 服务 |
| mes | 8030 | MES 服务 |
| pdm | 8031 | PDM 服务 |
| scm | 8040 | SCM 服务 |
| wms | 8041 | WMS 服务 |
| srm | 8042 | SRM 服务 |
| qms | 8050 | QMS 服务 |
| lims | 8051 | LIMS 服务 |
| ehs | 8052 | EHS 服务 |
| rs | 8053 | 资源服务 |
| bi | 8060 | BI 服务 |
| report | 8061 | 报表服务 |
| monitor | 8062 | 监控服务 |
| portal | 8063 | 门户/API 网关 |
| ai | 8064 | AI 服务 |
| mobile | 8070 | 移动服务 |
| gis | 8071 | GIS 服务 |
| integration | 8072 | 集成服务 |

### 详细命令说明

#### 服务管理

```bash
# 查看所有服务状态
./topems.sh status

# 查看单个服务状态
./topems.sh status iam

# 启动服务
./topems.sh start iam

# 强制重启服务（清理占用端口）
./topems.sh start iam --force

# 停止服务
./topems.sh stop iam

# 重启服务
./topems.sh restart iam

# 查看服务日志
./topems.sh logs iam 100
```

#### 编译构建

```bash
# 编译单个服务
./topems.sh build iam

# 编译所有后端服务
./topems.sh build-backend

# 编译前端
./topems.sh build-frontend

# 全量编译（后端+前端）
./topems.sh build-all
```

#### 测试

```bash
# 运行所有测试
./topems.sh test-all

# 运行后端测试
./topems.sh test-backend

# 运行前端测试
./topems.sh test-frontend
```

#### 数据库管理

```bash
# 启动数据库
./topems.sh db start

# 停止数据库
./topems.sh db stop

# 查看数据库状态
./topems.sh db status

# 运行数据库迁移
./topems.sh db migrate

# 备份数据库
./topems.sh db backup

# 从备份恢复（需指定备份文件）
./topems.sh db restore backups/topems_db_20240115.sql

# 重置数据库（危险操作！）
./topems.sh db reset
```

#### 一键操作

```bash
# 一键运行（启动数据库 + 所有服务）
./topems.sh run

# 一键停止（停止所有服务）
./topems.sh run-stop

# 重启所有服务
./topems.sh restart-all
```

#### 前端管理

```bash
# 启动前端
./topems.sh start web

# 停止前端
./topems.sh stop web
```

#### 开发环境

```bash
# 启动开发环境（macOS）
./topems.sh dev

# 安装依赖
./topems.sh install-deps
```

#### AI 模型管理

```bash
# 启动 Ollama
./topems.sh ai start

# 停止 Ollama
./topems.sh ai stop

# 查看 Ollama 状态
./topems.sh ai status

# 下载 AI 模型
./topems.sh ai pull llama3
```

#### 用户管理

```bash
# 重置 admin 密码为 admin123
./topems.sh reset-password

# 重置指定用户密码
./topems.sh reset-password admin newpass123
```

#### 部署

```bash
# 执行部署
./topems.sh deploy
```

---

## 部署脚本

### deploy.sh

位置: `scripts/deploy.sh`

功能: 一键部署到生产环境

```bash
# 执行部署
./scripts/deploy.sh deploy
```

### install.sh

位置: `deploy/scripts/install.sh`

功能: 生产环境安装脚本（Systemd 部署方式）

```bash
# 基本安装
./deploy/scripts/install.sh --prefix /opt/topems --user topems

# 开发模式安装
./deploy/scripts/install.sh --dev

# 跳过编译
./deploy/scripts/install.sh --skip-build
```

选项:
- `--prefix DIR`: 安装目录（默认 /opt/topems）
- `--user USER`: 服务用户（默认 topems）
- `--skip-build`: 跳过编译
- `--dev`: 开发模式

### update.sh

位置: `deploy/scripts/update.sh`

功能: 更新服务到新版本

### uninstall.sh

位置: `deploy/scripts/uninstall.sh`

功能: 卸载所有服务

---

## 数据库脚本

### setup-db.sh

位置: `deploy/scripts/setup-db.sh`

功能: 数据库初始化和备份配置

```bash
# 初始化数据库
./deploy/scripts/setup-db.sh --init

# 配置备份
./deploy/scripts/setup-db.sh --backup --schedule "0 2 * * *"
```

---

## 开发辅助脚本

### health_check.sh

位置: `scripts/health_check.sh`

功能: 检查所有服务的健康状态

```bash
./scripts/health_check.sh
```

### install-deps.sh

位置: `scripts/install-deps.sh`

功能: 安装项目依赖

```bash
# 安装所有依赖
./scripts/install-deps.sh all

# 仅安装后端依赖
./scripts/install-deps.sh backend

# 仅安装前端依赖
./scripts/install-deps.sh frontend
```

### run-core-tests.sh

位置: `scripts/run-core-tests.sh`

功能: 运行核心模块测试

### run-iam-tests.sh

位置: `scripts/run-iam-tests.sh`

功能: 运行 IAM 模块测试

---

## AI 模型管理

### ai-models.sh

位置: `scripts/ai-models.sh`

功能: 管理 Ollama AI 模型

```bash
# 启动 Ollama 服务
./scripts/ai-models.sh start

# 停止 Ollama 服务
./scripts/ai-models.sh stop

# 查看状态
./scripts/ai-models.sh status

# 下载模型
./scripts/ai-models.sh pull llama3

# 列出已安装模型
./scripts/ai-models.sh list

# 删除模型
./scripts/ai-models.sh remove llama3
```

---

## 常见问题

### 端口被占用

```bash
# 使用 --force 强制清理
./topems.sh start iam --force
```

### 服务启动失败

```bash
# 1. 查看日志
./topems.sh logs iam 100

# 2. 检查端口占用
lsof -i :8000

# 3. 重新编译
./topems.sh build iam
```

### 数据库连接失败

```bash
# 1. 检查数据库状态
./topems.sh db status

# 2. 启动数据库
./topems.sh db start

# 3. 检查 .env 配置
cat .env | grep DATABASE
```

---

## 相关文档

- [部署指南](./deployment-guide.md)
- [数据库维护指南](./database-maintenance.md)
- [故障排查指南](./troubleshooting.md)
