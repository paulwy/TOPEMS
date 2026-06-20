# TOPEMS 脚本工具

## 目录结构

```
scripts/
├── topems.sh                 # 统一入口脚本（推荐使用）
├── install-deps.sh           # 本地依赖安装
├── ai-models.sh             # AI 模型管理
├── update_admin_password.sh  # 管理员密码重置
├── deploy.sh                # 部署脚本（默认本地，--docker 使用 Docker）
├── services.conf             # 统一服务配置文件
├── docker/                   # Docker 方案配置
│   └── docker-compose.yml
└── windows/                 # Windows 部署脚本
```

## 统一服务配置

所有脚本通过 `services.conf` 共享统一的服务配置：

```bash
# 格式: 服务名 服务路径 二进制名 端口
iam         svc/unified-core       unified-core        8000
pm          svc/pm                 topems-pm           8001
manufacturing   svc/manufacturing     topems-manufacturing   8023
```

## 快速参考

### 主脚本（推荐）

| 脚本 | 说明 |
|------|------|
| `topems.sh` | 统一入口脚本（服务启停、日志、重置密码等） |

### 工具脚本

| 脚本 | 说明 |
|------|------|
| `install-deps.sh` | 依赖安装（PostgreSQL/Redis/Rust/Node.js） |
| `ai-models.sh` | AI 模型管理（Ollama 启动/模型下载） |
| `update_admin_password.sh` | 管理员密码重置 |

### 部署脚本

| 脚本 | 说明 |
|------|------|
| `deploy.sh` | 部署脚本（默认本地，--docker 使用 Docker） |

### 生产部署脚本

生产环境部署请使用 `deploy/scripts/` 目录下的脚本：

| 脚本 | 说明 |
|------|------|
| `deploy/scripts/setup-db.sh` | 数据库初始化 |
| `deploy/scripts/install.sh` | Linux 生产环境安装 |
| `deploy/scripts/update.sh` | Linux 生产环境更新 |
| `deploy/scripts/uninstall.sh` | Linux 生产环境卸载 |
| `deploy/scripts/manage.sh` | systemd 服务管理 |

## 常用命令

### 服务管理（使用 topems.sh）

```bash
# 查看帮助
./scripts/topems.sh

# 服务管理
./scripts/topems.sh status [服务]     # 查看服务状态
./scripts/topems.sh start <服务>       # 启动服务
./scripts/topems.sh stop <服务>        # 停止服务
./scripts/topems.sh restart <服务>     # 重启服务
./scripts/topems.sh logs <服务> [行数] # 查看服务日志
./scripts/topems.sh build <服务>       # 编译服务

# 批量操作
./scripts/topems.sh start-all          # 启动所有服务（含前端）
./scripts/topems.sh stop-all           # 停止所有服务（含前端）

# 开发环境
./scripts/topems.sh dev                # 启动 macOS 开发环境
./scripts/topems.sh install-deps       # 安装所有依赖

# 示例
./scripts/topems.sh status                    # 查看所有服务状态
./scripts/topems.sh start iam                 # 启动 IAM 服务
./scripts/topems.sh start web                 # 启动前端
./scripts/topems.sh logs hrm 100             # 查看 HRM 最近 100 行日志
```

### 部署

```bash
# 本地部署（默认）
./scripts/deploy.sh

# Docker 部署
./scripts/deploy.sh --docker

# Docker 部署启动
./scripts/deploy.sh --docker start

# 查看本地状态
./scripts/deploy.sh status

# 查看 Docker 状态
./scripts/deploy.sh --docker status
```

### 数据库

```bash
# 初始化数据库（生产环境）
./deploy/scripts/setup-db.sh --create-user --create-db --init-schema

# 重置管理员密码
./scripts/topems.sh reset-password              # 重置为 admin/admin123
./scripts/topems.sh reset-password admin mynewpassword  # 重置为自定义密码
```

### AI 模型

```bash
./scripts/ai-models.sh start           # 启动 Ollama
./scripts/ai-models.sh pull qwen2.5:7b-instruct  # 下载模型
./scripts/ai-models.sh status         # 查看状态
./scripts/ai-models.sh stop           # 停止 Ollama
```

## 支持的服务

| 服务名 | 说明 | 端口 |
|--------|------|------|
| iam | 统一身份认证 | 8000 |
| pm | 项目管理 | 8001 |
| erp | 企业资源计划 | 8010 |
| hrm | 人力资源管理 | 8011 |
| crm | 客户关系管理 | 8012 |
| integration | 系统集成 | 8005 |
| manufacturing | 制造执行 | 8023 |
| quality-assurance | 质量管控 | 8032 |
| rs | 研发管理 | 8020 |
| scm | 供应链管理 | 8040 |
| srm | 供应商管理 | 8041 |
| wms | 仓库管理 | 8042 |
| ai | AI 服务 | 8062 |
| analytics | 数据分析 | 8060 |
| gis | 地理信息 | 8053 |
| mobile | 移动端 | 8070 |
| monitor | 系统监控 | 8064 |
| portal | 企业门户 | 8066 |
| web | 前端应用 | 3000 |

## 文档

- [Python CLI](../cli/README.md)
- [部署文档](../docs/deployment/README.md)
- [Windows 部署](../scripts/windows/README_WINDOWS.md)
