# TOPEMS 数据库迁移指南

## 概述

TOPEMS使用PostgreSQL作为主数据库，每个微服务拥有独立的schema。数据库迁移脚本位于各服务的`migrations`目录下。

## Schema 结构

```
topems (database)
├── shared          # 共享表（审计日志、权限、数据字典等）
├── iam             # 身份认证与访问管理
├── erp             # 企业资源计划
├── hrm             # 人力资源管理
├── crm             # 客户关系管理
├── pm              # 项目管理
├── rs              # 研发管理
├── scm             # 供应链管理
├── srm             # 供应商关系管理
├── wms             # 仓库管理
├── mes             # 制造执行系统
├── qms             # 质量管理系统
├── lims            # 实验室信息管理
├── ehs             # 环境健康安全
├── gis             # 地理信息系统
├── ai              # 人工智能服务
├── im              # 即时通讯
├── mobile          # 移动端服务
├── bi              # 商业智能
├── doc             # 文档管理
├── file            # 文件服务
├── mail            # 邮件服务
├── flow            # 工作流引擎
├── pdm             # 产品数据管理
├── portal          # 门户服务
├── report          # 报表服务
├── notification    # 通知服务
└── integration     # 集成服务
```

## 迁移脚本命名规范

迁移脚本采用以下命名格式：

```
YYYYMMDDHHMMSS_<description>.sql
```

例如：`20260608100000_create_hrm_schema.sql`

## 运行迁移

### 方式一：使用 init-db-unified.sh（推荐）

```bash
bash scripts/init-db-unified.sh
```

### 方式二：使用 psql 命令行

```bash
# 设置环境变量
export PGPASSWORD=topems_secret

# 运行单个迁移脚本
psql -h localhost -p 5432 -U topems -d topems -f svc/hrm/migrations/20260608100000_create_hrm_schema.sql

# 运行所有迁移（按顺序）
for f in svc/*/migrations/*.sql; do
    echo "Running: $f"
    psql -h localhost -p 5432 -U topems -d topems -f "$f"
done
```

### 方式三：使用迁移工具

```bash
# 安装迁移工具（如果提供）
cargo install sqlx-cli

# 运行迁移
sqlx migrate run
```

## 各服务迁移脚本列表

### IAM (身份认证)

| 文件 | 描述 |
|------|------|
| 20260522000001_create_iam_schema.sql | 创建IAM基础表 |
| 20260522000002_seed_default_users.sql | 初始化默认用户 |
| 20260603000001_create_password_reset_tokens.sql | 密码重置令牌表 |
| 20260604000001_add_profile_features.sql | 用户资料扩展 |

### HRM (人力资源)

| 文件 | 描述 |
|------|------|
| 20260608100000_create_hrm_schema.sql | 创建HRM基础表 |
| 20260609000000_create_initialization_schema.sql | 初始化配置表 |

### CRM (客户关系)

| 文件 | 描述 |
|------|------|
| 20260608100001_create_crm_schema.sql | 创建CRM基础表 |

### PM (项目管理)

| 文件 | 描述 |
|------|------|
| 20260609100003_create_pm_schema.sql | 创建PM基础表 |

### SRM (供应商管理)

| 文件 | 描述 |
|------|------|
| 20260609100002_create_srm_schema.sql | 创建SRM基础表 |

### EHS (环境健康安全)

| 文件 | 描述 |
|------|------|
| 20260609100000_create_ehs_schema.sql | 创建EHS基础表 |

### GIS (地理信息)

| 文件 | 描述 |
|------|------|
| 20260608100000_create_gis_schema.sql | 创建GIS基础表 |

### AI (人工智能)

| 文件 | 描述 |
|------|------|
| 20260606000001_create_vector_tables.sql | 向量数据库表 |
| 20260608000001_create_qa_and_analysis_tables.sql | QA与分析表 |

### 其他服务

- **MES**: `20260608100003_create_mes_schema.sql`
- **QMS**: `20260608100002_create_qms_schema.sql`
- **LIMS**: `20260608100000_create_lims_schema.sql`
- **WMS**: `20260608100004_create_wms_schema.sql`
- **SCM**: `20260609100001_create_scm_schema.sql`
- **BI**: `001_init.sql`
- **DOC**: `20260523000001_create_doc_schema.sql`, `20260527000001_create_templates_and_help_center_schema.sql`, `20260605000001_create_archive_schema.sql`
- **ERP**: `20260601000001_project_contracts.sql`, `20260601000002_project_budgets.sql`, `20260601000003_payment_schedules.sql`, `20260608100000_create_erp_schema.sql`

## 迁移方式

TOPEMS 支持两种数据库迁移方式：

### 方式一：SQL 文件迁移

传统的 SQL 迁移脚本，位于各服务的 `migrations` 目录下。

适用服务：`iam`, `pm`, `portal`, `integration`, `erp`, `hrm`, `crm`, `rs`, `lims`, `mes`, `qms`, `ehs`, `scm`, `srm`, `wms`, `file`, `mail`, `im`, `gis`, `bi`, `report`, `ai`

### 方式二：Rust 原生迁移

部分服务使用 Rust 代码在启动时自动创建表结构，无需手动执行 SQL 文件。

适用服务：`notification`, `doc`, `flow`, `pdm`, `mobile`

这些服务的数据库表会在服务首次启动时自动创建，具体逻辑位于各服务的 `init_database()` 或 `init_database_tables()` 函数中。

### 自动迁移检查

启动脚本 `topems-standalone.sh` 会在服务启动前自动检查数据库迁移状态：
- 对于 SQL 文件迁移的服务，检查是否有未运行的迁移文件
- 对于 Rust 原生迁移的服务，通过启动服务自动完成表创建
- 迁移进度可通过 `status` 命令查看

## 回滚迁移

### 方式一：使用psql回滚

```bash
# 回滚特定迁移（删除创建的表）
psql -h localhost -p 5432 -U topems -d topems -c "DROP TABLE IF EXISTS hrm.employees CASCADE;"
```

### 方式二：创建回滚脚本

为每个迁移创建对应的回滚脚本：

```bash
# 例如：rollback_20260608100000_create_hrm_schema.sql
DROP TABLE IF EXISTS hrm.employees CASCADE;
DROP TABLE IF EXISTS hrm.departments CASCADE;
-- ... 其他表
```

## 常见问题

### 1. 迁移脚本执行失败

**问题**: 迁移脚本执行时报错

**解决方案**:
- 检查数据库连接配置
- 确保依赖的schema已创建
- 检查表是否已存在（添加 `IF NOT EXISTS` 或 `DROP TABLE ... CASCADE`）

### 2. Schema不存在

**问题**: `schema "xxx" does not exist`

**解决方案**:
```sql
CREATE SCHEMA IF NOT EXISTS xxx;
GRANT USAGE ON SCHEMA xxx TO topems;
```

### 3. 权限不足

**问题**: `permission denied for schema`

**解决方案**:
```sql
GRANT ALL PRIVILEGES ON SCHEMA xxx TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA xxx TO topems;
```

## 最佳实践

1. **始终使用事务**: 将迁移脚本包装在事务中
2. **幂等性**: 使用 `IF NOT EXISTS` 或 `CREATE OR REPLACE`
3. **回滚脚本**: 为每个迁移创建对应的回滚脚本
4. **测试迁移**: 在测试环境先执行迁移
5. **文档记录**: 记录每个迁移的目的和影响
