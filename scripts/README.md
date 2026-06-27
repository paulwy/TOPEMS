# TOPEMS 脚本工具

## 目录结构

```
scripts/
├── topems.sh                  # 【主入口】统一服务管理脚本（推荐使用）
├── services.conf              # 统一服务配置
├── README.md                  # 本文档
│
├── dev/                       # 【开发工具】本地开发相关脚本
│   ├── install-deps.sh        # 依赖安装（PostgreSQL/Redis/Rust/Node.js）
│   ├── start-local.sh         # 本地一键启动
│   ├── health-check.sh        # 健康检查 / 环境诊断
│   ├── ai-models.sh           # AI 模型管理（Ollama）
│   └── update-admin-password.sh  # 管理员密码重置
│
├── test/                      # 【测试脚本】
│   ├── run-core-tests.sh      # 核心模块权限测试
│   └── run-iam-tests.sh       # IAM 模块测试
│
├── deploy/                    # 【部署脚本】
│   ├── deploy.sh              # 部署脚本（本地 / Docker）
│   ├── rollback.sh            # 回滚脚本
│   └── docker/
│       └── topems-docker.sh   # Docker Compose 部署
│
├── tools/                     # 【工具脚本】Python 辅助工具
│   ├── scan_todos.py          # TODO/FIXME 代码扫描
│   ├── scan_api_paths.py      # 后端 API 路径扫描
│   ├── check_api_correspondence.py  # 前后端 API 对应检查
│   ├── check_api_duplicates_ci.py   # API 重复路径检查
│   └── check_component_naming.py    # 组件命名规范检查
│
├── data/                      # 【数据文件】工具脚本的输入输出
│   ├── api_path_registry.json
│   └── api_correspondence_report.json
│
├── performance/               # 【性能测试】
│   ├── run-all-tests.sh
│   ├── scm-performance-test.js
│   └── database-performance-test.js
│
└── windows/                   # 【Windows 脚本】
    └── ...
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

### 主入口（推荐）

| 命令 | 说明 |
|------|------|
| `./scripts/topems.sh` | 查看帮助 |
| `./scripts/topems.sh status [服务]` | 查看服务状态 |
| `./scripts/topems.sh start <服务>` | 启动服务 |
| `./scripts/topems.sh stop <服务>` | 停止服务 |
| `./scripts/topems.sh restart <服务>` | 重启服务 |
| `./scripts/topems.sh logs <服务> [行数]` | 查看服务日志 |
| `./scripts/topems.sh build <服务>` | 编译服务 |
| `./scripts/topems.sh start-all` | 启动所有服务（含前端） |
| `./scripts/topems.sh stop-all` | 停止所有服务（含前端） |
| `./scripts/topems.sh dev` | 启动 macOS 开发环境 |
| `./scripts/topems.sh install-deps` | 安装所有依赖 |
| `./scripts/topems.sh ai start/stop/status/pull` | AI 模型管理 |
| `./scripts/topems.sh reset-password` | 重置管理员密码 |
| `./scripts/topems.sh deploy` | 部署服务 |

### 开发工具

| 脚本 | 说明 |
|------|------|
| `./scripts/dev/start-local.sh` | 本地一键启动（前端 + 后端 + 数据库） |
| `./scripts/dev/install-deps.sh` | 依赖安装 |
| `./scripts/dev/health-check.sh` | 健康检查 / 环境诊断 |
| `./scripts/dev/ai-models.sh` | AI 模型管理 |
| `./scripts/dev/update-admin-password.sh` | 管理员密码重置 |

### 测试

| 脚本 | 说明 |
|------|------|
| `./scripts/test/run-core-tests.sh` | 核心模块权限测试 |
| `./scripts/test/run-iam-tests.sh` | IAM 模块测试 |
| `./scripts/performance/run-all-tests.sh` | 性能测试套件 |

### 部署

| 脚本 | 说明 |
|------|------|
| `./scripts/deploy/deploy.sh` | 部署脚本（默认本地，--docker 使用 Docker） |
| `./scripts/deploy/rollback.sh` | 回滚脚本 |
| `./scripts/deploy/docker/topems-docker.sh` | Docker Compose 部署 |

### 生产部署

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

### 本地快速启动

```bash
# 一键启动全部（前端 + 后端 + 数据库）
./scripts/dev/start-local.sh

# 仅启动前端
./scripts/dev/start-local.sh frontend

# 仅启动后端
./scripts/dev/start-local.sh backend

# 启动本地数据库（macOS Homebrew）
./scripts/dev/start-local.sh db

# 安装依赖
./scripts/dev/start-local.sh install

# 查看状态
./scripts/dev/start-local.sh status

# 停止所有
./scripts/dev/start-local.sh stop
```

### 部署

```bash
# 本地部署（默认）
./scripts/deploy/deploy.sh

# Docker 部署
./scripts/deploy/deploy.sh --docker

# Docker 部署启动
./scripts/deploy/deploy.sh --docker start

# 查看本地状态
./scripts/deploy/deploy.sh status

# 查看 Docker 状态
./scripts/deploy/deploy.sh --docker status
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
./scripts/dev/ai-models.sh start           # 启动 Ollama
./scripts/dev/ai-models.sh pull qwen2.5:7b-instruct  # 下载模型
./scripts/dev/ai-models.sh status         # 查看状态
./scripts/dev/ai-models.sh stop           # 停止 Ollama
```

### TODO/FIXME 代码扫描

```bash
# 基础扫描（使用默认配置）
python3 scripts/tools/scan_todos.py

# 仅显示统计概览
python3 scripts/tools/scan_todos.py --summary

# 生成 Markdown 报告并保存到文件
python3 scripts/tools/scan_todos.py --output docs/todo-scan-report.md

# 扫描指定目录
python3 scripts/tools/scan_todos.py --dir apps/web/src --dir svc/hrm/src

# 排除指定目录
python3 scripts/tools/scan_todos.py --exclude test --exclude vendor

# 只扫描特定文件类型
python3 scripts/tools/scan_todos.py --ext .rs --ext .ts
```

**支持的标记类型（按优先级从高到低）：**
- `FIXME` - 需要修复的问题
- `HACK` - 临时解决方案，需要重构
- `TODO` - 待办事项
- `XXX` - 需要注意的代码
- `NOTE` - 代码说明注释

## 支持的服务

| 服务名 | 说明 | 端口 | 端口区间 |
|--------|------|------|---------|
| **平台核心服务** | | | **8000-8009** |
| iam | 统一身份认证（unified-core） | 8000 | |
| **经营管理服务** | | | **8010-8019** |
| erp | 企业资源计划 | 8010 | |
| **协同办公服务** | | | **8020-8029** |
| hrm | 人力资源管理 | 8020 | |
| pm | 项目管理 | 8023 | |
| crm | 客户关系管理 | 8029 | |
| **生产制造服务** | | | **8030-8039** |
| mes | 生产执行系统 | 8030 | |
| pdm | 产品数据管理 | 8031 | |
| **供应链服务** | | | **8040-8049** |
| scm | 供应链管理 | 8040 | |
| wms | 仓库管理 | 8041 | |
| srm | 供应商管理 | 8042 | |
| **质量/研发服务** | | | **8050-8059** |
| qms | 质量管理 | 8050 | |
| lims | 实验室信息管理 | 8051 | |
| ehs | 环境安全 | 8052 | |
| rs | 研发管理 | 8053 | |
| **数据/门户服务** | | | **8060-8069** |
| bi | 商业智能 | 8060 | |
| report | 报表服务 | 8061 | |
| monitor | 系统监控 | 8062 | |
| portal | 企业门户 | 8063 | |
| ai | AI 服务 | 8064 | |
| **基础设施服务** | | | **8070-8079** |
| mobile | 移动端 | 8070 | |
| gis | 地理信息 | 8071 | |
| integration | 系统集成 | 8072 | |
| web | 前端应用 | 3000 | |

## 文档

- [Python CLI](../cli/README.md)
- [部署文档](../docs/deployment/README.md)
- [Windows 部署](../scripts/windows/README_WINDOWS.md)
