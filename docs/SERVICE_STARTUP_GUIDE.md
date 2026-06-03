# TOPEMS 服务启动指南

## 📍 快速启动命令

### 端口规划说明
服务按功能分组，端口范围如下：
- **8000-8009**: 核心平台服务（基础设施层）
- **8010-8019**: 企业资源服务
- **8020-8029**: 研发创新服务
- **8030-8039**: 制造质量服务
- **8040-8049**: 供应链服务
- **8050-8059**: 专业服务

### 核心平台服务 (8000-8009)
```bash
# IAM 身份认证 - 端口 8000
cd services/topems-iam/backend && cargo run --bin topems-iam

# DOC 文档管理 - 端口 8001
cd services/topems-doc/backend && cargo run

# FLOW 工作流 - 端口 8002
cd services/topems-flow/backend && cargo run

# NOTIFICATION 通知服务 - 端口 8003
cd services/topems-notification/backend && cargo run

# INTEGRATION 系统集成 - 端口 8004
cd services/topems-integration/backend && cargo run

# PORTAL 统一门户 - 端口 8005
cd services/topems-portal/backend && cargo run
```

### 企业资源服务 (8010-8019)
```bash
# ERP 企业资源计划 - 端口 8010
cd services/topems-erp/backend && cargo run

# HRM 人力资源 - 端口 8011
cd services/topems-hrm/backend && cargo run

# CRM 客户关系管理 - 端口 8012
cd services/topems-crm/backend && cargo run
```

### 研发创新服务 (8020-8029)
```bash
# RS 研发管理 - 端口 8020
cd services/topems-rs/backend && cargo run

# LIMS 实验室管理 - 端口 8021
cd services/topems-lims/backend && cargo run

# AI 服务 - 端口 8022
cd services/topems-ai/backend && cargo run

# PDM 产品数据管理 - 端口 8023
cd services/topems-pdm/backend && cargo run
```

### 制造质量服务 (8030-8039)
```bash
# MES 制造执行 - 端口 8030
cd services/topems-mes/backend && cargo run

# QMS 质量管理 - 端口 8031
cd services/topems-qms/backend && cargo run

# EHS 安全环保 - 端口 8032
cd services/topems-ehs/backend && cargo run
```

### 供应链服务 (8040-8049)
```bash
# SCM 供应链管理 - 端口 8040
cd services/topems-scm/backend && cargo run

# SRM 供应商管理 - 端口 8041
cd services/topems-srm/backend && cargo run

# WMS 仓库管理 - 端口 8042
cd services/topems-wms/backend && cargo run
```

### 专业服务 (8050-8059)
```bash
# GIS 地理信息 - 端口 8050
cd services/topems-gis/backend && cargo run

# IM 即时通讯 - 端口 8051
cd services/topems-im/backend && cargo run

# BI 商业智能 - 端口 8052
cd services/topems-bi/backend && cargo run

# REPORT 报表服务 - 端口 8053
cd services/report-service && cargo run

# MAIL 邮件服务 - 端口 8054
cd services/topems-mail/backend && cargo run

# MOBILE 移动工作台 - 端口 8055
cd services/topems-mobile/backend && cargo run
```

## 🔍 检查服务状态

### 方法1: 使用 manage-services.sh
```bash
cd /Users/xingzhai/TOPEMS
bash scripts/manage-services.sh status
```

### 方法2: 使用 lsof
```bash
# 检查核心平台服务 (8000-8009)
lsof -i :8000 -i :8001 -i :8002 -i :8003 -i :8004 -i :8005

# 检查企业资源服务 (8010-8019)
lsof -i :8010 -i :8011 -i :8012

# 检查研发创新服务 (8020-8029)
lsof -i :8020 -i :8021 -i :8022 -i :8023

# 检查制造质量服务 (8030-8039)
lsof -i :8030 -i :8031 -i :8032

# 检查供应链服务 (8040-8049)
lsof -i :8040 -i :8041 -i :8042

# 检查专业服务 (8050-8059)
lsof -i :8050 -i :8051 -i :8052 -i :8053 -i :8054 -i :8055
```

### 方法3: 使用健康检查
```bash
# 核心平台服务 (8000-8009)
curl http://localhost:8000/health  # IAM
curl http://localhost:8001/health  # DOC
curl http://localhost:8002/health  # FLOW
curl http://localhost:8003/health  # NOTIFICATION
curl http://localhost:8004/health  # INTEGRATION
curl http://localhost:8005/health  # PORTAL

# 企业资源服务 (8010-8019)
curl http://localhost:8010/health  # ERP
curl http://localhost:8011/health  # HRM
curl http://localhost:8012/health  # CRM

# 研发创新服务 (8020-8029)
curl http://localhost:8020/health  # RS
curl http://localhost:8021/health  # LIMS
curl http://localhost:8022/health  # AI
curl http://localhost:8023/health  # PDM

# 制造质量服务 (8030-8039)
curl http://localhost:8030/health  # MES
curl http://localhost:8031/health  # QMS
curl http://localhost:8032/health  # EHS

# 供应链服务 (8040-8049)
curl http://localhost:8040/health  # SCM
curl http://localhost:8041/health  # SRM
curl http://localhost:8042/health  # WMS

# 专业服务 (8050-8059)
curl http://localhost:8050/health  # GIS
curl http://localhost:8051/health  # IM
curl http://localhost:8052/health  # BI
curl http://localhost:8053/health  # REPORT
curl http://localhost:8054/health  # MAIL
curl http://localhost:8055/health  # MOBILE
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

### 核心平台服务 (8000-8009)
| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| IAM | topems-iam | 8000 | ✅ 运行中 |
| DOC | topems-doc | 8001 | ✅ 运行中 |
| FLOW | topems-flow | 8002 | ✅ 运行中 |
| NOTIFICATION | topems-notification | 8003 | ✅ 运行中 |
| INTEGRATION | topems-integration | 8004 | ❌ 未启动 |
| PORTAL | topems-portal | 8005 | ❌ 未启动 |

### 企业资源服务 (8010-8019)
| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| ERP | topems-erp | 8010 | ✅ 运行中 |
| HRM | topems-hrm | 8011 | ✅ 运行中 |
| CRM | topems-crm | 8012 | ❌ 未启动 |

### 研发创新服务 (8020-8029)
| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| RS | topems-rs | 8020 | ❌ 未启动 |
| LIMS | topems-lims | 8021 | ✅ 运行中 |
| AI | topems-ai | 8022 | ✅ 运行中 |
| PDM | topems-pdm | 8023 | ❌ 未启动 |

### 制造质量服务 (8030-8039)
| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| MES | topems-mes | 8030 | ❌ 未启动 |
| QMS | topems-qms | 8031 | ❌ 未启动 |
| EHS | topems-ehs | 8032 | ❌ 未启动 |

### 供应链服务 (8040-8049)
| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| SCM | topems-scm | 8040 | ❌ 未启动 |
| SRM | topems-srm | 8041 | ❌ 未启动 |
| WMS | topems-wms | 8042 | ❌ 未启动 |

### 专业服务 (8050-8059)
| 服务名 | 目录 | 端口 | 状态 |
|--------|------|------|------|
| GIS | topems-gis | 8050 | ❌ 未启动 |
| IM | topems-im | 8051 | ❌ 未启动 |
| BI | topems-bi | 8052 | ❌ 未启动 |
| REPORT | report-service | 8053 | ❌ 未启动 |
| MAIL | topems-mail | 8054 | ❌ 未启动 |
| MOBILE | topems-mobile | 8055 | ✅ 运行中 |

## 🎯 推荐的启动顺序

服务按依赖关系和重要性排序，建议按以下顺序启动：

**1. 核心平台服务 (基础设施层)** - 必须优先启动
```bash
cd services/topems-iam/backend && cargo run --bin topems-iam     # 8000
cd services/topems-doc/backend && cargo run                     # 8001
cd services/topems-flow/backend && cargo run                    # 8002
cd services/topems-notification/backend && cargo run            # 8003
cd services/topems-integration/backend && cargo run             # 8004
cd services/topems-portal/backend && cargo run                  # 8005
```

**2. 企业资源服务** - 业务核心
```bash
cd services/topems-erp/backend && cargo run                     # 8010
cd services/topems-hrm/backend && cargo run                     # 8011
cd services/topems-crm/backend && cargo run                     # 8012
```

**3. 研发创新服务** - 业务支撑
```bash
cd services/topems-rs/backend && cargo run                      # 8020
cd services/topems-lims/backend && cargo run                    # 8021
cd services/topems-ai/backend && cargo run                      # 8022
cd services/topems-pdm/backend && cargo run                     # 8023
```

**4. 其他服务** - 按需启动
```bash
# 制造质量
cd services/topems-mes/backend && cargo run                     # 8030
cd services/topems-qms/backend && cargo run                     # 8031
cd services/topems-ehs/backend && cargo run                     # 8032

# 供应链
cd services/topems-scm/backend && cargo run                     # 8040
cd services/topems-srm/backend && cargo run                     # 8041
cd services/topems-wms/backend && cargo run                     # 8042

# 专业服务
cd services/topems-gis/backend && cargo run                     # 8050
cd services/topems-im/backend && cargo run                      # 8051
cd services/topems-bi/backend && cargo run                      # 8052
cd services/report-service && cargo run                         # 8053
cd services/topems-mail/backend && cargo run                    # 8054
cd services/topems-mobile/backend && cargo run                  # 8055
```

## 📝 启动多个服务的终端配置

建议为每个服务打开一个独立的终端：

```
核心平台 (8000-8009):
  终端 1: IAM           (8000) - 身份认证
  终端 2: DOC           (8001) - 文档管理
  终端 3: FLOW          (8002) - 工作流
  终端 4: NOTIFICATION  (8003) - 通知服务
  终端 5: INTEGRATION   (8004) - 系统集成
  终端 6: PORTAL        (8005) - 统一门户

企业资源 (8010-8019):
  终端 7: ERP           (8010) - 企业资源计划
  终端 8: HRM           (8011) - 人力资源
  终端 9: CRM           (8012) - 客户关系管理

研发创新 (8020-8029):
  终端 10: RS           (8020) - 研发管理
  终端 11: LIMS         (8021) - 实验室管理
  终端 12: AI           (8022) - AI服务
  终端 13: PDM          (8023) - 产品数据管理

制造质量 (8030-8039):
  终端 14: MES          (8030) - 制造执行
  终端 15: QMS          (8031) - 质量管理
  终端 16: EHS          (8032) - 安全环保

供应链 (8040-8049):
  终端 17: SCM          (8040) - 供应链管理
  终端 18: SRM          (8041) - 供应商管理
  终端 19: WMS          (8042) - 仓库管理

专业服务 (8050-8059):
  终端 20: GIS          (8050) - 地理信息
  终端 21: IM           (8051) - 即时通讯
  终端 22: BI           (8052) - 商业智能
  终端 23: REPORT       (8053) - 报表服务
  终端 24: MAIL         (8054) - 邮件服务
  终端 25: MOBILE       (8055) - 移动工作台
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
