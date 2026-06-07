# TOPEMS 脚本管理

本目录包含TOPEMS项目的管理脚本。

---

## 📋 脚本列表

| 脚本 | 说明 | 推荐度 |
|------|------|--------|
| `start-all.sh` | 一键启动所有服务（推荐） | ⭐⭐⭐⭐⭐ |
| `stop-all.sh` | 一键停止所有服务 | ⭐⭐⭐⭐⭐ |
| `manage-services.sh` | 单个服务管理（启动/停止/编译） | ⭐⭐⭐⭐⭐ |
| `init-database.sh` | 初始化数据库 | ⭐⭐⭐⭐ |
| `cleanup.sh` | 全面清理（端口/进程/缓存） | ⭐⭐⭐⭐⭐ |
| `deploy.sh` | 离线部署脚本 | ⭐⭐⭐⭐ |
| `download-images.sh` | 下载 Docker 镜像 | ⭐⭐⭐⭐ |
| `build-all-services.sh` | 构建所有服务镜像 | ⭐⭐⭐ |
| `run-clippy.sh` | 运行 Clippy 代码检查 | ⭐⭐⭐ |
| `run_ci_tests.sh` | 运行 CI 测试 | ⭐⭐⭐ |

---

## 🚀 快速开始

### 1. 数据库初始化（首次使用）

```bash
cd /Users/air/TOPEMS
./scripts/init-database.sh
```

### 2. 查看服务状态

```bash
./scripts/manage-services.sh all-status
```

### 3. 启动所有服务

```bash
./scripts/start-all.sh
```

或者使用服务管理脚本：

```bash
# 启动指定服务
./scripts/manage-services.sh start iam

# 启动所有服务
./scripts/manage-services.sh start-all

# 强制启动（清理占用端口）
./scripts/manage-services.sh start-all --force

# 查看服务状态
./scripts/manage-services.sh all-status
```

---

## 📖 详细说明

### 1. `start-all.sh`

一键启动所有TOPEMS服务。

**特点：**
- 完善的健康检查
- 支持Ctrl+C停止所有服务

**使用方法：**
```bash
./start-all.sh
```

### 2. `manage-services.sh` ⭐⭐⭐⭐⭐

强大的单个服务管理工具，支持编译、清理、强制启动等。

**命令列表：**
```bash
# 查看帮助
./manage-services.sh help

# 启动服务（可选 --force 强制清理端口）
./manage-services.sh start <服务名> [--force]

# 停止服务
./manage-services.sh stop <服务名>

# 重启服务（可选 --force）
./manage-services.sh restart <服务名> [--force]

# 编译服务
./manage-services.sh build <服务名>

# 编译所有服务
./manage-services.sh build-all

# 查看单个服务状态
./manage-services.sh status <服务名>

# 查看所有服务状态
./manage-services.sh all-status

# 查看服务日志
./manage-services.sh log <服务名>

# 列出所有可用服务
./manage-services.sh list

# 清理指定端口
./manage-services.sh clean-port <端口号>

# 停止所有服务并清理端口
./manage-services.sh clean-all

# 启动所有服务
./manage-services.sh start-all [--force]

# 停止所有服务
./manage-services.sh stop-all
```

**核心平台服务：**
| 服务名 | 端口 | 说明 | 目录 |
|--------|------|------|------|
| `iam` | 8000 | 身份认证服务 | platform/topems-iam |
| `doc` | 8001 | 文档管理服务 | platform/topems-doc |
| `pm` | 8002 | 项目管理服务 | services/topems-pm |
| `flow` | 8006 | 工作流服务 | platform/topems-flow |

**业务应用服务：**
| 服务名 | 端口 | 说明 | 目录 |
|--------|------|------|------|
| `notification` | 8003 | 通知服务 | services/notification-service |
| `integration` | 8004 | 系统集成服务 | services/topems-integration |
| `portal` | 8005 | 企业门户服务 | services/topems-portal |
| `erp` | 8010 | 企业资源计划 | services/topems-erp |
| `hrm` | 8011 | 人力资源管理 | services/topems-hrm |
| `ai` | 8013 | AI服务 | services/topems-ai |
| `crm` | 8012 | 客户关系管理 | services/topems-crm |
| `rs` | 8020 | 研发管理 | services/topems-rs |
| `lims` | 8022 | 实验室管理 | services/topems-lims |
| `pdm` | 8023 | 产品数据管理 | services/topems-pdm |
| `mes` | 8030 | 制造执行 | services/topems-mes |
| `qms` | 8031 | 质量管理 | services/topems-qms |
| `ehs` | 8032 | 安全管理 | services/topems-ehs |
| `scm` | 8040 | 供应链 | services/topems-scm |
| `srm` | 8041 | 供应商管理 | services/topems-srm |
| `wms` | 8042 | 仓库管理 | services/topems-wms |
| `gis` | 8050 | 地理信息 | services/topems-gis |
| `im` | 8051 | 即时通讯 | services/topems-im |
| `bi` | 8052 | 商业智能 | services/topems-bi |
| `report` | 8053 | 报表服务 | services/report-service |
| `mail` | 8054 | 邮件服务 | services/topems-mail |
| `mobile` | 8055 | 移动端服务 | services/topems-mobile |

### 3. `stop-all.sh` ⭐⭐⭐⭐⭐

一键停止所有服务的脚本。

**使用方法：**
```bash
./stop-all.sh
```

### 4. `cleanup.sh` ⭐⭐⭐⭐⭐

全面清理脚本，一键清理所有服务、端口、进程和缓存。

**功能：**
1. 停止所有TOPEMS服务进程
2. 清理所有服务端口
3. 清理前端端口（3000, 5173）
4. 清理临时日志文件
5. 可选：清理编译缓存（target目录）

**使用方法：**
```bash
./cleanup.sh
```

---

## � 脚本详细说明

### `run-clippy.sh`
运行 Clippy 静态代码分析工具，检查所有 Rust 项目的代码质量问题。

**使用方法：**
```bash
./scripts/run-clippy.sh
```

**功能说明：**
- 遍历所有 Rust 项目
- 运行 Clippy 检查
- 捕获错误和警告计数
- 输出详细的检查报告

### `run_ci_tests.sh`
运行持续集成测试脚本。

---

## �🔧 常见问题

### 端口被占用 `Address already in use`

**解决方案：**

#### 方案 A：使用强制启动（最快）
```bash
./scripts/manage-services.sh start-all --force
```

#### 方案 B：使用全面清理
```bash
./scripts/cleanup.sh
./scripts/manage-services.sh start-all
```

---

## 📊 完整服务端口表

| 服务类别 | 服务 | 端口 | 目录 |
|---------|------|------|------|
| **核心平台** | IAM | 8000 | platform/topems-iam |
| | DOC | 8001 | platform/topems-doc |
| | PM | 8002 | services/topems-pm |
| | FLOW | 8006 | platform/topems-flow |
| **业务服务** | Notification | 8003 | services/notification-service |
| | Integration | 8004 | services/topems-integration |
| | Portal | 8005 | services/topems-portal |
| | ERP | 8010 | services/topems-erp |
| | HRM | 8011 | services/topems-hrm |
| | AI | 8013 | services/topems-ai |
| | CRM | 8012 | services/topems-crm |
| | RS | 8020 | services/topems-rs |
| | LIMS | 8022 | services/topems-lims |
| | PDM | 8023 | services/topems-pdm |
| | MES | 8030 | services/topems-mes |
| | QMS | 8031 | services/topems-qms |
| | EHS | 8032 | services/topems-ehs |
| | SCM | 8040 | services/topems-scm |
| | SRM | 8041 | services/topems-srm |
| | WMS | 8042 | services/topems-wms |
| | GIS | 8050 | services/topems-gis |
| | IM | 8051 | services/topems-im |
| | BI | 8052 | services/topems-bi |
| | Report | 8053 | services/report-service |
| | Mail | 8054 | services/topems-mail |
| | Mobile | 8055 | services/topems-mobile |
| **前端** | Frontend | 3000 | frontend |

---

## 📝 标准开发流程

### 首次设置

```bash
# 1. 配置安全密钥（重要！）
# 在项目根目录创建 .env 文件，配置 JWT 密钥
# 详见项目根目录 README.md 的"安全配置"章节

# 2. 初始化数据库
./scripts/init-database.sh

# 3. 编译所有服务
./scripts/manage-services.sh build-all
```

⚠️ **安全提醒**：
- 生产环境**必须**配置强密钥（至少 32 字符）
- 不要使用硬编码的默认密钥
- 不要将密钥提交到版本控制系统

### 日常开发

```bash
# 1. 查看状态
./scripts/manage-services.sh all-status

# 2. 修改代码后...

# 3. 重新编译并重启单个服务
./scripts/manage-services.sh build flow
./scripts/manage-services.sh restart flow --force

# 4. 查看日志
./scripts/manage-services.sh log flow
```

---

## 📚 相关文档

- [项目根目录README](../README.md) - 总体项目说明
- [架构设计文档](../docs/architecture/overview.md) - 系统架构
- [API文档](../docs/api/README.md) - API文档

---

**版本**: 2.0.0
**最后更新**: 2026-06-04
