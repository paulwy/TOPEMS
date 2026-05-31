# TOPEMS 脚本说明

本目录包含 TOPEMS 项目的开发、部署和运维脚本。

---

## 📋 脚本分类

### 🔧 核心启动与停止脚本

| 脚本 | 说明 | 推荐度 |
|------|------|--------|
| `start-all.sh` | 一键启动所有服务（含HRM） | ⭐⭐⭐⭐⭐ |
| `stop-all.sh` | 一键停止所有服务（新增） | ⭐⭐⭐⭐⭐ |
| `start-local.sh` | 交互式本地启动 | ⭐⭐⭐⭐ |
| `start-local-quick.sh` | 快速查看服务状态并启动 | ⭐⭐⭐⭐⭐ |

### 🛠️ 服务管理脚本

| 脚本 | 说明 | 推荐度 |
|------|------|--------|
| `manage-services.sh` | 单个服务管理（启动/停止/编译/清理） | ⭐⭐⭐⭐⭐ |
| `monitor-services.sh` | 服务监控脚本 | ⭐⭐⭐ |

### ⚙️ 配置与初始化

| 脚本 | 说明 | 推荐度 |
|------|------|--------|
| `configure-services.sh` | 创建所有服务配置文件 | ⭐⭐⭐⭐ |
| `init-database.sh` | 初始化数据库 | ⭐⭐⭐⭐ |
| `cleanup.sh` | 全面清理脚本（端口/进程/缓存） | ⭐⭐⭐⭐⭐ |

---

## 🚀 快速开始

### 1. 数据库初始化（首次使用）

```bash
cd /Users/air/TOPEMS/scripts
./init-database.sh
```

### 2. 配置服务

```bash
./configure-services.sh
```

### 3. 查看服务状态

```bash
./start-local-quick.sh
```

### 4. 启动所有服务

```bash
cd ..
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

一键启动所有TOPEMS服务，包括：
- 数据库（PostgreSQL & Redis）
- 平台服务（IAM, DOC, AI, FLOW）
- 业务服务（RS, LIMS, QMS, EHS, ERP, HRM, GIS, PDM, SRM, IM）
- 前端

**特点：**
- 使用已编译的 release 版本，启动快
- 完善的健康检查
- 包含 HRM 服务（端口 8010）
- 支持 Ctrl+C 停止所有服务

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

**可用服务：**
| 服务名 | 端口 | 说明 |
|--------|------|------|
| `iam` | 8002 | 身份认证服务 |
| `doc` | 8001 | 文档管理服务 |
| `ai` | 8003 | AI 服务 |
| `flow` | 8004 | 工作流服务 |
| `rs` | 8005 | 研发管理服务 |
| `lims` | 8006 | 实验室管理服务 |
| `erp` | 8009 | 企业资源管理 |
| `hrm` | 8010 | 人力资源管理 |
| `gis` | 8011 | 地理信息服务 |
| `qms` | 8012 | 质量管理服务 |
| `pdm` | 8015 | 产品数据管理 |
| `ehs` | 8016 | 环境安全管理 |
| `srm` | 8018 | 供应商管理 |
| `im` | 8017 | 即时通讯服务 |

### 2. `stop-all.sh` ⭐⭐⭐⭐⭐

一键停止所有服务的脚本，包含：
- 停止所有后端服务（清理端口）
- 停止前端服务
- 停止 Docker 容器（PostgreSQL & Redis）
- 清理残留进程

**使用方法：**
```bash
./stop-all.sh
```

### 3. `cleanup.sh` ⭐⭐⭐⭐⭐

全面清理脚本，一键清理所有服务、端口、进程和缓存。

**功能：**
1. 停止所有 TOPEMS 服务进程
2. 清理所有服务端口（8001-8018）
3. 清理前端端口（3000, 3001, 5173）
4. 清理临时日志文件
5. 可选：清理编译缓存（target目录）
6. 可选：停止数据库容器

**使用方法：**
```bash
./cleanup.sh
```

按照提示选择是否清理缓存和数据库。

### 4. `start-local-quick.sh`

快速查看服务状态的脚本，适合日常开发。

**功能：**
- 自动检测正在运行的服务
- 彩色状态显示
- 交互式启动前端

### 6. `start-local.sh`

交互式本地启动脚本，适合新手使用。

---

## 🔧 常见问题与解决方案

### 问题 1：端口被占用 `Address already in use`

**原因：** 之前启动的服务没有正常停止，或其他进程占用了端口。

**解决方案（按推荐度排序）：**

#### 方案 A：使用强制启动（最快）⭐⭐⭐⭐⭐
```bash
# 强制启动单个服务
./scripts/manage-services.sh start rs --force

# 或强制启动所有服务
./scripts/manage-services.sh start-all --force
```

#### 方案 B：使用全面清理 ⭐⭐⭐⭐⭐
```bash
./scripts/cleanup.sh
# 然后重新启动
./scripts/manage-services.sh build-all
./scripts/manage-services.sh start-all
```

#### 方案 C：清理指定端口
```bash
# 查看占用
lsof -i :8005

# 使用管理脚本清理
./scripts/manage-services.sh clean-port 8005
```

### 问题 2：如何确保编译是最新的？

**解决方案：**

#### 方案 A：使用 build 命令（推荐）
```bash
# 编译单个服务
./scripts/manage-services.sh build lims

# 编译所有服务
./scripts/manage-services.sh build-all
```

#### 方案 B：启动时自动编译
如果可执行文件不存在，`start` 命令会自动触发编译。

#### 方案 C：清理缓存后重新编译
```bash
./scripts/cleanup.sh  # 选择清理缓存
./scripts/manage-services.sh build-all
```

### 问题 3：如何确保没有错误？

**建议的完整流程：**

```bash
# 1. 全面清理
./scripts/cleanup.sh

# 2. 编译所有服务（确保无编译错误）
./scripts/manage-services.sh build-all

# 3. 检查数据库运行
cd docker
docker-compose ps  # 确保 postgres 和 redis 运行

# 4. 启动服务
cd ..
./scripts/manage-services.sh start-all --force

# 5. 查看状态
./scripts/manage-services.sh all-status

# 6. 如有问题，查看日志
./scripts/manage-services.sh log <服务名>
```

---

## 🔧 配置文件

### 服务配置

每个服务目录下的 `.env` 文件包含服务配置：
- `PORT` - 服务监听端口
- `DATABASE_URL` - 数据库连接字符串
- `REDIS_URL` - Redis 连接地址
- `RUST_LOG` - 日志级别

### 环境变量

**数据库配置（默认）：**
```
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://localhost:6379
```

---

## 📊 服务端口映射

| 服务 | 端口 | 状态 |
|------|------|------|
| PostgreSQL | 5432 | ✅ |
| Redis | 6379 | ✅ |
| DOC | 8001 | ✅ |
| IAM | 8002 | ✅ |
| AI | 8003 | ✅ |
| FLOW | 8004 | ✅ |
| RS | 8005 | ✅ |
| LIMS | 8006 | ✅ |
| ERP | 8009 | ✅ |
| HRM | 8010 | ✅ |
| GIS | 8011 | ✅ |
| QMS | 8012 | ✅ |
| PDM | 8015 | ✅ |
| EHS | 8016 | ✅ |
| IM | 8017 | ✅ |
| SRM | 8018 | ✅ |
| 前端 | 3000 | ✅ |

---

## 🐛 故障排查

### 问题：服务启动失败

**解决方法：**
```bash
# 查看服务日志
./scripts/manage-services.sh log <服务名>

# 检查数据库连接
psql -d topems -U topems
```

### 问题：数据库连接失败

**解决方法：**
```bash
# 检查数据库是否运行
docker ps | grep postgres

# 重启数据库
docker stop topems-postgres
docker start topems-postgres
```

---

## 📝 标准开发流程

### 首次设置（一次性）

```bash
# 1. 初始化数据库
./scripts/init-database.sh

# 2. 创建配置
./scripts/configure-services.sh

# 3. 编译所有服务
./scripts/manage-services.sh build-all
```

### 日常开发

```bash
# 1. 查看状态
./scripts/manage-services.sh all-status

# 2. 修改代码后...

# 3. 重新编译并重启单个服务
./scripts/manage-services.sh build lims
./scripts/manage-services.sh restart lims --force

# 4. 查看日志
./scripts/manage-services.sh log lims
```

### 完全重置（遇到问题时）

```bash
# 1. 全面清理
./scripts/cleanup.sh

# 2. 重新编译
./scripts/manage-services.sh build-all

# 3. 启动
./scripts/manage-services.sh start-all --force
```

---

## 📚 相关文档

- 项目根目录 README.md - 总体项目说明
- docs/my/TOPEMS 2.0 总体架构设计（完整版）.md - 架构文档

---

## ⚠️ 注意事项

1. 所有脚本需要在项目根目录运行（或使用正确的相对路径）
2. 确保数据库和 Redis 容器正在运行
3. 首次使用请先运行 `init-database.sh`
4. 服务日志存储在 `/tmp/topems-*.log`
5. 生产环境请修改默认密码！
6. 遇到端口问题，优先使用 `cleanup.sh` 或 `--force` 参数

---

## 📞 帮助

如有问题，请查看：
1. 脚本帮助信息（`./<脚本名> help`）
2. 服务日志文件
3. 项目根目录的 README.md
4. 尝试 `./scripts/cleanup.sh` 清理后重新开始
