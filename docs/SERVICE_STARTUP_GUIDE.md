# TOPEMS 服务启动指南

## 📍 快速启动命令

### 核心服务 (已运行)
这些服务已经在运行，无需重新启动：
- ✅ IAM (8002) - 身份认证
- ✅ DOC (8001) - 文档管理
- ✅ AI (8003) - AI服务
- ✅ FLOW (8004) - 工作流
- ✅ LIMS (8006) - 实验室管理
- ✅ HRM (8010) - 人力资源
- ✅ ERP (8009) - 企业资源计划
- ✅ MOBILE (8019) - 移动工作台
- ✅ NOTIFICATION (8023) - 通知服务

### 启动其他服务

#### 1. 启动 QMS (质量管理)
```bash
cd services/topems-qms/backend
cargo run
```
> 监听端口: 8012

#### 2. 启动 EHS (安全环保)
```bash
cd services/topems-ehs/backend
cargo run
```
> 监听端口: 8013

#### 3. 启动 RS (研发管理)
```bash
cd services/topems-rs/backend
cargo run
```
> 监听端口: 8005

#### 4. 启动其他服务 (示例)
```bash
# CRM (客户关系管理) - 端口 8014
cd services/topems-crm/backend && cargo run

# BI (商业智能) - 端口 8022
cd services/topems-bi/backend && cargo run

# PDM (产品数据管理) - 端口 8015
cd services/topems-pdm/backend && cargo run

# SRM (供应商管理) - 端口 8018
cd services/topems-srm/backend && cargo run
```

## 🔍 检查服务状态

### 方法1: 使用 manage-services.sh
```bash
cd /Users/xingzhai/TOPEMS
bash scripts/manage-services.sh status
```

### 方法2: 使用 lsof
```bash
lsof -i :8001 -i :8002 -i :8003 -i :8004 -i :8005 -i :8006 -i :8009 -i :8010 -i :8019 -i :8023
```

### 方法3: 使用健康检查
```bash
# 测试单个服务
curl http://localhost:8002/health  # IAM
curl http://localhost:8001/health  # DOC
curl http://localhost:8003/health  # AI
curl http://localhost:8004/health  # FLOW
curl http://localhost:8006/health  # LIMS
curl http://localhost:8010/health  # HRM
curl http://localhost:8009/health  # ERP
curl http://localhost:8019/health  # MOBILE
curl http://localhost:8023/health  # NOTIFICATION
```

## ⚠️ 常见问题

### Q: 端口已被占用
**错误**: `Error: Address already in use`

**解决方案**:
1. 查看哪个进程占用了端口:
   ```bash
   lsof -i :端口号
   ```

2. 停止占用进程:
   ```bash
   kill -9 <进程ID>
   ```

3. 或者修改服务端口配置

### Q: 目录不存在
**错误**: `no such file or directory: services/xxx/backend`

**解决方案**:
1. 检查目录是否正确:
   ```bash
   ls services/
   ```

2. 正确的路径格式:
   ```bash
   services/topems-服务名/backend
   # 例如:
   services/topems-qms/backend
   ```

### Q: Cargo 未安装
**错误**: `command not found: cargo`

**解决方案**:
1. 安装 Rust:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. 激活 Rust:
   ```bash
   source ~/.cargo/env
   ```

## 📊 服务端口对照表

| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| IAM | topems-iam | 8002 | ✅ 运行中 |
| DOC | topems-doc | 8001 | ✅ 运行中 |
| AI | topems-ai | 8003 | ✅ 运行中 |
| FLOW | topems-flow | 8004 | ✅ 运行中 |
| LIMS | topems-lims | 8006 | ✅ 运行中 |
| HRM | topems-hrm | 8010 | ✅ 运行中 |
| ERP | topems-erp | 8009 | ✅ 运行中 |
| MOBILE | topems-mobile | 8019 | ✅ 运行中 |
| NOTIFICATION | notification-service | 8023 | ✅ 运行中 |
| QMS | topems-qms | 8012 | ❌ 未启动 |
| EHS | topems-ehs | 8013 | ❌ 未启动 |
| RS | topems-rs | 8005 | ❌ 未启动 |
| CRM | topems-crm | 8014 | ❌ 未启动 |
| BI | topems-bi | 8022 | ❌ 未启动 |
| PDM | topems-pdm | 8015 | ❌ 未启动 |
| SRM | topems-srm | 8018 | ❌ 未启动 |
| IM | topems-im | 8016 | ❌ 未启动 |
| GIS | topems-gis | 8011 | ❌ 未启动 |

## 🎯 推荐的启动顺序

如果需要启动多个服务，建议按以下顺序：

1. **先启动 IAM** (如果未运行)
   ```bash
   cd platform/topems-iam/backend && cargo run
   ```

2. **然后启动其他服务**
   ```bash
   # 每个服务在单独的终端中运行
   cd services/topems-erp/backend && cargo run --bin topems-erp
   ```

## 📝 启动多个服务的终端配置

建议为每个服务打开一个独立的终端：

```
终端 1: IAM (8002)
终端 2: DOC (8001)
终端 3: AI (8003)
终端 4: FLOW (8004)
终端 5: LIMS (8006)
终端 6: HRM (8010)
终端 7: ERP (8009)
终端 8: MOBILE (8019)
终端 9: NOTIFICATION (8023)
```

## 🔧 停止服务

### 方法1: Ctrl+C
在运行 `cargo run` 的终端中按 `Ctrl+C`

### 方法2: 使用 manage-services.sh
```bash
# 停止单个服务
bash scripts/manage-services.sh stop notification

# 停止所有服务
bash scripts/manage-services.sh stop-all
```

### 方法3: 使用 kill
```bash
# 查找进程
lsof -i :8023

# 停止进程 (将 <PID> 替换为实际的进程ID)
kill -9 <PID>
```

## ✅ 验证服务运行

启动服务后，验证是否正常运行：

```bash
# 检查进程
ps aux | grep topems

# 健康检查
curl http://localhost:端口/health

# 查看端口占用
lsof -i :端口号
```

## 🗄️ 数据库服务

所有服务使用共享的 PostgreSQL 数据库：

- **主机**: localhost
- **端口**: 5432
- **数据库名**: topems
- **用户名**: topems
- **密码**: topems_secret

数据库初始化脚本位于: `database/postgres/init.sql`

---

**提示**: 使用 `bash scripts/start-all.sh` 可以一键启动所有服务！
