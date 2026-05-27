# TOPEMS 项目状态总结

## 📋 项目概览

**更新日期**: 2026-05-24  
**当前状态**: ✅ 核心功能已完成，数据库持久化已配置

---

## ✅ 已完成工作

### 1. 数据库持久化配置

**完成时间**: 2026-05-24  
**状态**: ✅ 完成

- 配置了 PostgreSQL 数据库作为持久化存储
- 创建了完整的数据库初始化脚本 (`infrastructure/docker/init.sql`)
- 修改了服务代码，支持在内存模式和数据库模式之间切换
- 文档管理服务和身份认证服务现在默认使用数据库模式
- 创建了环境变量配置文件 `.env`

**数据库 Schema 包含**:

- `doc` - 文档管理模块（文件夹、文件、文件版本、权限）
- `iam` - 身份认证模块（用户、角色、权限、审计日志）
- `ai` - 智能知识库模块（文档、标签）
- `flow` - 工作流模块（工作流定义、实例、审批任务）
- `lims` - LIMS 实验室管理模块
- `rs` - RS 研发管理模块
- `qms` - QMS 质量管理模块
- `ehs` - EHS 环境健康安全模块
- `srm` - SRM 供应商关系管理模块
- `pdm` - PDM 生产数据管理模块
- `integration` - 系统集成模块

**默认账号**:

- 管理员: `admin` / `admin123`

### 2. 核心服务开发

**状态**: ✅ 全部运行正常

| 服务 | 端口 | 状态 | 功能 |
| ------ ------ ------ |
| IAM (身份认证) | 8002 | ✅ 运行中 | 用户认证、权限管理、JWT 令牌 |
| DOC (文档管理) | 8001 | ✅ 运行中 | 文件上传、下载、预览、文件夹管理 |
| AI (智能知识库) | 8003 | ✅ 运行中 | 知识库管理、AI 对话 |
| FLOW (工作流) | 8004 | ✅ 运行中 | 工作流定义、流程审批 |
| 前端门户 | 3000 / 3005 | ✅ 运行中 | 用户界面 |

### 3. 文档预览功能

**状态**: ✅ 完成

- 支持图片预览
- 支持 PDF 预览
- 支持 DOCX 文件预览（使用 docx-preview 库）
- 支持 Markdown / 纯文本预览
- 修复了容器渲染问题
- 添加了详细的调试日志

### 4. 开发工具和脚本

**状态**: ✅ 完成

- `start.sh` - 一键启动所有服务
- `stop.sh` - 一键停止所有服务
- `start-dev.sh` - 开发模式启动脚本
- `docker-*.sh` - Docker 相关脚本
- 完整的环境变量配置示例

---

## 🚀 快速开始

### 前置要求

1. **Rust** (1.70+) - 使用 `rustup` 安装
2. **Node.js** (18+) - 使用 `nvm` 或 Homebrew 安装
3. **PostgreSQL** (14+) - 使用 Homebrew 安装 (`brew install postgresql@16`)

### 启动系统

#### 方式 1: 使用启动脚本（推荐）

```bash
# 进入项目目录
cd /Users/xingzhai/TOPEMS

# 启动所有服务
./start.sh
```

#### 方式 2: 手动启动

```bash
# 1. 确保 PostgreSQL 正在运行
brew services start postgresql@16

# 2. 创建并初始化数据库（如果还没有）
createdb topems
psql -d topems -f infrastructure/docker/init.sql

# 3. 在不同终端中分别启动各个服务

# IAM 服务 (端口 8002)
cd platform/topems-iam/backend
cargo run

# 文档服务 (端口 8001)
cd platform/topems-doc/backend
cargo run

# AI 服务 (端口 8003)
cd services/topems-ai/backend
cargo run

# 工作流服务 (端口 8004)
cd platform/topems-flow/backend
cargo run

# 前端 (端口 3000)
cd frontend
npm run dev
```

### 停止系统

```bash
cd /Users/xingzhai/TOPEMS
./stop.sh
```

---

## 🌐 访问地址

| 服务 | 地址 | 说明 |
| ------ ------ ------ |
| 前端门户 | <http://localhost:3000> | 主用户界面 |
| IAM 健康检查 | <http://localhost:8002/health> | 身份认证服务状态 |
| DOC 健康检查 | <http://localhost:8001/health> | 文档管理服务状态 |
| AI 健康检查 | <http://localhost:8003/health> | 智能知识库服务状态 |
| FLOW 健康检查 | <http://localhost:8004/health> | 工作流服务状态 |

---

## 👤 测试账号

| 用户名 | 密码 | 角色 | 说明 |
| ------ ------ ------ |
| admin | admin123 | 管理员 | 完整系统权限 |
| testuser | Test123456 | 普通用户 | 基本操作权限 |
| guestuser | Guest123 | 访客 | 只读权限 |

---

## 📝 配置说明

### 环境变量配置

主要配置文件：`.env`

**关键配置项**:

```env
# 数据库配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=topems
POSTGRES_PASSWORD=topems_secret
POSTGRES_DB=topems

# 存储模式
USE_MEMORY_STORAGE=false  # 设置为 true 启用内存模式，false 使用数据库

# JWT 配置
JWT_SECRET=topems_secret_key_2024_development
JWT_EXPIRATION=86400

# AI 配置（可选）
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 生产环境配置

复制 `.env.production.example` 为 `.env.production` 并修改配置：

```bash
cp .env.production.example .env.production
```

**生产环境注意事项**:

- 必须更改 `JWT_SECRET` 为强随机密钥
- 必须更改数据库密码
- 配置正确的数据库和 Redis 主机地址
- 配置 HTTPS 和正确的 CORS 策略
- 设置日志级别为 `info` 或 `warn`
- 禁用 `RUST_BACKTRACE`

---

## 📊 当前架构

```text
TOPEMS/
├── frontend/                    # 前端门户 (React + TypeScript + Vite)
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   ├── components/         # 通用组件
│   │   ├── api/                # API 客户端
│   │   └── ...
│   └── ...
├── platform/                    # 核心平台服务
│   ├── topems-iam/             # 身份认证服务 (Rust + Axum)
│   ├── topems-doc/             # 文档管理服务 (Rust + Axum)
│   ├── topems-flow/            # 工作流服务 (Rust + Axum)
│   └── ...
├── services/                    # 业务服务
│   ├── topems-ai/              # 智能知识库服务 (Rust + Axum)
│   └── ...
├── infrastructure/              # 基础设施
│   └── docker/                 # Docker 配置
├── docs/                        # 项目文档
├── .env                        # 环境变量配置
├── start.sh                    # 启动脚本
└── stop.sh                     # 停止脚本
```

---

## 🔍 故障排查

### 服务无法启动

1. **检查端口占用**

   ```bash
   lsof -ti :8001 :8002 :8003 :8004 :3000
   ```

2. **查看服务日志**

   ```bash
   # 查看特定服务日志
   tail -f logs/iam.log
   tail -f logs/doc.log
   tail -f logs/ai.log
   tail -f logs/flow.log
   tail -f logs/frontend.log
   ```

3. **检查数据库连接**

   ```bash
   # 测试数据库连接
   psql -h localhost -p 5432 -U topems -d topems
   ```

### 文档预览问题

1. **DOCX 预览失败**
   - 检查浏览器控制台是否有错误
   - 确认文件大小在限制范围内（默认 100MB）

2. **PDF 预览失败**
   - 确认文件本身不是损坏的
   - 尝试下载文件后在本地查看

### 数据库连接失败

1. **检查 PostgreSQL 是否运行**

   ```bash
   brew services list
   ```

2. **检查数据库是否存在**

   ```bash
   psql -lqt | grep topems
   ```

3. **重新初始化数据库**

   ```bash
   dropdb topems
   createdb topems
   psql -d topems -f infrastructure/docker/init.sql
   ```

---

## 📈 下一步建议

### 高优先级

- [ ] 完善剩余服务（LIMS、RS、QMS、EHS、SRM、PDM）
- [ ] 添加完整的单元测试和集成测试
- [ ] 配置 CI/CD 流水线
- [ ] 添加 API 认证和限流

### 中优先级

- [ ] 配置 Redis 缓存
- [ ] 添加文件病毒扫描
- [ ] 实现文件 OCR 功能
- [ ] 添加操作审计日志

### 低优先级

- [ ] 添加系统监控和告警
- [ ] 优化数据库查询性能
- [ ] 国际化（多语言）支持
- [ ] 暗色主题支持

---

## 📞 技术支持

如有问题，请查看：

1. 项目文档: `/Users/xingzhai/TOPEMS/docs/`
2. 代码注释
3. 服务日志: `/Users/xingzhai/TOPEMS/logs/`

---

## 📄 许可证

TOPEMS - 企业级智慧研发管理平台
