# TOPEMS 脚本工具

## 目录结构

```
scripts/
├── topems.sh              # 统一入口脚本（调用 Python CLI）
├── manage-services.sh      # 本地开发服务管理
├── start-macos-dev.sh     # macOS 开发环境一键启动
├── start-all-plugins.sh   # 插件化服务启动
├── install-deps.sh         # 本地依赖安装
├── ai-models.sh           # AI 模型管理
├── update_admin_password.sh # 管理员密码重置
├── cleanup-classname.sh    # UI className 迁移工具
├── deploy.sh              # 部署脚本（默认本地，--docker 使用 Docker）
├── services.conf           # 统一服务配置文件
├── docker/                # Docker 方案配置
│   └── docker-compose.yml
└── windows/              # Windows 部署脚本
```

## 统一服务配置

所有脚本通过 `services.conf` 共享统一的服务配置：

```bash
# 格式: 服务名 服务路径 二进制名 端口
iam         svc/unified-core       unified-core        8000
pm          svc/pm                 topems-pm           8046
manufacturing   svc/manufacturing     topems-manufacturing   8030
```

## Python CLI（推荐）

主要功能已迁移到 Python CLI 工具：

```bash
cd ../cli
pip install pyyaml click rich httpx

python -m topems_cli --help
```

## 快速参考

### 本地开发脚本

| 脚本 | 说明 |
|------|------|
| `topems.sh` | 统一入口（调用 Python CLI） |
| `manage-services.sh` | 服务启停管理（start/stop/status/logs/build） |
| `start-macos-dev.sh` | macOS 开发环境一键启动 |
| `start-all-plugins.sh` | 插件化服务启动 |
| `install-deps.sh` | 依赖安装（PostgreSQL/Redis/Rust/Node.js） |

### 工具脚本

| 脚本 | 说明 |
|------|------|
| `ai-models.sh` | AI 模型管理（Ollama 启动/模型下载） |
| `update_admin_password.sh` | 管理员密码重置 |
| `cleanup-classname.sh` | UI className 迁移到 MUI sx |

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

### 服务管理

```bash
# 使用 manage-services.sh
./scripts/manage-services.sh status          # 查看所有服务状态
./scripts/manage-services.sh start iam        # 启动单个服务
./scripts/manage-services.sh stop iam         # 停止单个服务
./scripts/manage-services.sh logs iam 100     # 查看日志
./scripts/manage-services.sh start-all       # 启动所有服务
./scripts/manage-services.sh start-core       # 启动核心服务

# 使用 Python CLI
python -m topems_cli status --all
python -m topems_cli start -m core
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
./scripts/update_admin_password.sh admin mynewpassword
```

### AI 模型

```bash
./scripts/ai-models.sh start           # 启动 Ollama
./scripts/ai-models.sh pull qwen2.5:7b-instruct  # 下载模型
./scripts/ai-models.sh status         # 查看状态
```

## 文档

- [Python CLI](../cli/README.md)
- [部署文档](../docs/deployment/README.md)
- [Windows 部署](../scripts/windows/README_WINDOWS.md)
