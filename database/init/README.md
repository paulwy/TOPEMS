# TOPEMS 数据库重建指南

## 概述

本文档提供 TOPEMS 数据库重建的详细步骤和注意事项。数据库重建将完全对齐产品架构计划，采用 `unified_core + plugin_*` 架构。

## ⚠️ 重要警告

**此操作将删除所有现有数据！仅适用于开发环境！**

生产环境请使用迁移脚本，或先进行完整数据备份。

---

## 前置条件

### 1. 环境要求

- PostgreSQL 16+ （支持 pgvector 扩展）
- 数据库连接信息：
  ```bash
  Host: localhost
  Port: 5432
  Database: topems
  Username: topems
  Password: topems_secret
  ```

### 2. 权限要求

执行用户需要以下权限：
- CREATE/DROP SCHEMA
- CREATE/DROP TABLE
- CREATE EXTENSION
- SUPERUSER 或足够的权限

---

## 重建步骤

### 步骤 1：备份现有数据（可选）

如果需要保留现有数据，请先备份：

```bash
# 备份整个数据库
pg_dump -h localhost -U topems -d topems -F c -f topems_backup_$(date +%Y%m%d_%H%M%S).dump

# 或仅备份数据（不含结构）
pg_dump -h localhost -U topems -d topems --data-only -F c -f topems_data_backup_$(date +%Y%m%d).dump
```

### 步骤 2：停止所有服务

停止所有使用数据库的服务：

```bash
# 停止所有 TOPEMS 服务
cd /Users/xingzhai/TOPEMS

# 停止 unified-core
pkill -f "unified-core"

# 停止所有插件服务
pkill -f "topems-"

# 或使用 Docker Compose
docker-compose down
```

### 步骤 3：连接数据库

使用 psql 连接到 PostgreSQL：

```bash
psql -h localhost -U topems -d topems
```

### 步骤 4：执行重建脚本

#### 方式一：使用 psql 执行

```bash
# 在项目根目录执行
cd /Users/xingzhai/TOPEMS

# 执行核心重建脚本
psql -h localhost -U topems -d topems -f database/init/01_rebuild_database.sql

# 执行插件表结构脚本
psql -h localhost -U topems -d topems -f database/init/02_create_plugin_tables.sql

# 初始化权限数据
psql -h localhost -U topems -d topems -f database/init/03_init_permissions.sql

# 创建供应链模块表（SCM/WMS/SRM）
psql -h localhost -U topems -d topems -f database/init/04_create_scm_wms_srm_tables.sql

# 初始化移动端数据
psql -h localhost -U topems -d topems -f database/init/05_mobile_init.sql

# 创建 shared schema 及跨服务共享表（单位、币种、字典、地区等）
psql -h localhost -U topems -d topems -f database/init/06_create_shared_schema.sql
```

#### 方式二：在 psql 中执行

```sql
-- 连接数据库后执行
\i database/init/01_rebuild_database.sql
\i database/init/02_create_plugin_tables.sql
\i database/init/03_init_permissions.sql
\i database/init/04_create_scm_wms_srm_tables.sql
\i database/init/05_mobile_init.sql
\i database/init/06_create_shared_schema.sql
```

### 步骤 5：验证重建结果

#### 5.1 检查 Schema

```sql
-- 查看所有 Schema
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;
```

**预期结果：**
```
schema_name
--------------------
public
shared
unified_core
plugin_ai
plugin_bi
plugin_crm
plugin_erp
plugin_erp
plugin_gis
plugin_hrm
plugin_integration
plugin_lims
plugin_mes
plugin_mobile
plugin_pdm
plugin_pm
plugin_portal
plugin_qms
plugin_report
plugin_rs
plugin_scm
plugin_srm
plugin_wms
(23 rows)
```

#### 5.2 检查核心表

```sql
-- 检查 public schema 表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 检查 unified_core schema 表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'unified_core'
ORDER BY table_name;

-- 检查 plugin_ai schema 表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'plugin_ai'
ORDER BY table_name;
```

#### 5.3 检查扩展

```sql
-- 检查已安装扩展
SELECT extname, extversion FROM pg_extension;
```

**预期结果：**
```
extname     | extversion
------------+------------
plpgsql     | 1.0
uuid-ossp   | 1.1
vector      | 0.5.0
(3 rows)
```

#### 5.4 检查初始数据

```sql
-- 检查默认租户
SELECT id, name, code, plan, status FROM public.tenants;

-- 检查默认用户
SELECT id, username, email, full_name FROM unified_core.users;

-- 检查默认角色
SELECT id, name, code, scope FROM unified_core.roles;

-- 检查权限数量
SELECT COUNT(*) FROM unified_core.permissions;
```

### 步骤 6：更新服务配置

#### 6.1 更新环境变量

所有服务需要更新以下环境变量：

```bash
# .env 文件示例

# 数据库连接
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems

# 服务名称（用于 search_path 配置）
SERVICE_NAME=topems-iam  # 或 topems-erp, topems-hrm 等

# Search Path 配置
# unified-core 服务 (使用 public schema)
SEARCH_PATH=public

# ERP 业务服务 (访问 erp schema + public + shared)
SEARCH_PATH=erp, public, shared

# HRM 业务服务
SEARCH_PATH=hrm, public, shared

# AI 业务服务
SEARCH_PATH=ai_service, public, shared

# PM / WMS / CRM / SCM / SRM 等业务服务
SEARCH_PATH={svc}, public, shared

# 大多数业务服务 (无需 shared)
SEARCH_PATH={svc}, public

# RD 服务 (使用 rs schema)
SEARCH_PATH=rs, public
```

#### 6.2 更新代码中的 Schema 引用

所有 SQL 查询需要更新为新的 Schema 名称：

**旧代码：**
```sql
SELECT * FROM shared.companies;
SELECT * FROM iam.users;
SELECT * FROM erp.assets;
```

**新代码：**
```sql
-- 业务表通过服务 schema 访问 (search_path 会自动解析)
SELECT * FROM companies;       -- 业务服务自身 schema 中的表
SELECT * FROM core_tenants;    -- 位于 public schema
SELECT * FROM shared.units;    -- 显式引用 shared schema 中的表

-- 跨 schema 引用建议显式指定
SELECT * FROM public.core_permissions;
SELECT * FROM shared.currencies;
```

### 步骤 7：重启服务

```bash
# 重启所有服务
cd /Users/xingzhai/TOPEMS

# 启动 unified-core
cd svc/unified-core
cargo run --release

# 启动插件服务（示例）
cd ../erp
cargo run --release

# 或使用 Docker Compose
docker-compose up -d
```

### 步骤 8：测试验证

#### 8.1 测试用户登录

```bash
# 使用默认管理员账户登录
curl -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "tenant_code": "default"
  }'
```

#### 8.2 测试租户隔离

```sql
-- 设置租户上下文
SELECT set_tenant_context('00000000-0000-0000-0000-000000000001');

-- 查询当前租户ID
SELECT get_current_tenant_id();
```

#### 8.3 测试 AI 知识库

```sql
-- 创建知识库
INSERT INTO plugin_ai.knowledge_bases (tenant_id, name, type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test KB', 'document');

-- 查询知识库
SELECT * FROM plugin_ai.knowledge_bases;
```

#### 8.4 测试 shared schema 访问

```sql
-- 验证 shared schema 已创建
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'shared';

-- 查询默认计量单位
SELECT id, code, name FROM shared.units LIMIT 5;

-- 查询默认币种
SELECT code, name, symbol FROM shared.currencies;

-- 查询默认字典类型
SELECT code, name, category FROM shared.shared_dict_types;
```

---

## 数据迁移（如需保留现有数据）

### 方案一：导出导入

```bash
# 1. 从旧数据库导出数据
pg_dump -h localhost -U topems -d topems --data-only -F c -f old_data.dump

# 2. 重建数据库（执行上述步骤）

# 3. 导入数据（需要手动调整表名映射）
pg_restore -h localhost -U topems -d topems --data-only old_data.dump
```

### 方案二：编写迁移脚本

创建自定义迁移脚本，将数据从旧 Schema 迁移到新 Schema：

```sql
-- 示例：迁移公司数据
INSERT INTO public.companies (
    id, tenant_id, organization_id, name, short_name, code,
    address, phone, email, status, created_at, updated_at
)
SELECT 
    id, 
    '00000000-0000-0000-0000-000000000001' as tenant_id,  -- 默认租户
    organization_id, 
    name, 
    short_name, 
    code,
    address, 
    phone, 
    email, 
    status, 
    created_at, 
    updated_at
FROM shared.companies;

-- 迁移用户数据
INSERT INTO unified_core.users (...)
SELECT ... FROM iam.users;

-- 迁移 ERP 数据
INSERT INTO plugin_erp.assets (...)
SELECT ... FROM erp.assets;
```

---

## 回滚方案

如果重建失败，可以恢复备份：

```bash
# 删除当前数据库
dropdb -h localhost -U topems topems

# 创建新数据库
createdb -h localhost -U topems topems

# 恢复备份
pg_restore -h localhost -U topems -d topems topems_backup_YYYYMMDD_HHMMSS.dump
```

---

## 常见问题

### Q1: 执行脚本时报错 "permission denied"

**解决方案：**
```bash
# 使用超级用户执行
psql -h localhost -U postgres -d topems -f database/init/01_rebuild_database.sql
```

### Q2: 扩展安装失败

**解决方案：**
```bash
# 确保 PostgreSQL 安装了 contrib 包
# Ubuntu/Debian
sudo apt-get install postgresql-contrib-16

# macOS (Homebrew)
brew install postgresql@16
```

### Q3: 向量索引创建失败

**解决方案：**
```sql
-- 检查 pgvector 扩展版本
SELECT extversion FROM pg_extension WHERE extname = 'vector';

-- 如果版本过低，升级扩展
ALTER EXTENSION vector UPDATE;
```

### Q4: 服务启动失败

**检查项：**
1. 确认 search_path 配置正确
2. 确认表名和字段名已更新
3. 检查数据库连接配置
4. 查看服务日志

---

## 附录

### A. Schema 命名对照表

| 旧 Schema | 新 Schema | 说明 |
|-----------|-----------|------|
| `shared` (旧) | `public` + `shared` (新) | 基础实体放 public；跨服务共享（单位、币种、字典）放 shared |
| `iam` | `unified_core` | 用户、角色、权限 |
| `doc` | `unified_core` | 文档管理 |
| `flow` | `unified_core` | 工作流引擎 |
| `notification` | `unified_core` | 通知服务 |
| `erp` | `plugin_erp` / `erp` | ERP 企业资源计划 |
| `hrm` | `plugin_hrm` / `hrm` | HRM 人力资源管理 |
| `crm` | `plugin_crm` / `crm` | CRM 客户关系管理 |
| `ai` | `plugin_ai` / `ai_service` | AI 知识库 |

### B. Schema 访问策略（search_path）

服务通过 `SEARCH_PATH` 环境变量控制表查找顺序：

| 分类 | search_path 模板 | 典型服务 |
|------|------------------|---------|
| 核心服务 | `public` | unified-core, master-data, billing, ticket, feedback, communication |
| 业务服务（简单） | `{svc}, public` | erp, finance, mes, pdm, qms, lims, ehs, gis, analytics, portal, mobile, integration |
| 业务服务（访问 shared） | `{svc}, public, shared` | pm, wms, crm, scm, srm, ai, hrm |
| RD 服务 | `rs, public` | rd |

**设计原则：**
- 业务 schema 优先，避免访问到其他 schema 的同名表
- `public` 包含核心表（tenants, users, roles, permissions 等）
- `shared` 存放跨服务共享的只读/低频写表（units, currencies, dict_types 等）
- `shared` 放在最后，仅作为兜底，避免遮蔽业务表和 public 表

### C. 默认账户信息

| 项目 | 值 |
|------|-----|
| 默认租户代码 | `default` |
| 默认租户ID | `00000000-0000-0000-0000-000000000001` |
| 管理员用户名 | `admin` |
| 管理员密码 | `admin123` |
| 管理员邮箱 | `admin@topems.com` |

### D. 端口配置

| 服务 | 端口 | Schema | Search Path |
|------|------|--------|-------------|
| unified-core | 8000 | public | public |
| erp | 8010 | erp | erp, public, shared |
| hrm | 8020 | hrm | hrm, public, shared |
| crm | 8029 | crm | crm, public, shared |
| pm | 8023 | pm | pm, public, shared |
| finance | 8011 | finance | finance, public |
| mes | 8030 | mes | mes, public |
| srm | 8042 | srm | srm, public, shared |
| scm | 8040 | scm | scm, public, shared |
| wms | 8041 | wms | wms, public, shared |
| qms | 8050 | qms | qms, public |
| lims | 8051 | lims | lims, public |
| ehs | 8052 | ehs | ehs, public |
| rd | 8053 | rs | rs, public |
| analytics | 8060 | analytics | analytics, public |
| mobile | 8070 | mobile | mobile, public |

---

## 联系支持

如有问题，请联系：
- 技术支持：support@topems.com
- 文档仓库：https://github.com/topems/docs

---

**版本**: v2.1.0  
**最后更新**: 2026-08-08

## 更新日志

### v2.1.0 (2026-08-08)
- 新增 `06_create_shared_schema.sql` 脚本，创建 shared schema 及 15 张跨服务共享表
- 更新 search_path 策略：业务 schema → public → shared（shared 兜底，避免遮蔽）
- 修正 unified_core / plugin_* 命名为当前项目实际 schema 命名
- 完善端口配置表，补充 Search Path 列
- 新增 shared schema 访问测试步骤（8.4）
- 新增 Schema 访问策略附录（B）
