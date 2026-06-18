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
```

#### 方式二：在 psql 中执行

```sql
-- 连接数据库后执行
\i database/init/01_rebuild_database.sql
\i database/init/02_create_plugin_tables.sql
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
(22 rows)
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
# unified-core 服务
SEARCH_PATH=unified_core,public

# ERP 插件服务
SEARCH_PATH=plugin_erp,public

# HRM 插件服务
SEARCH_PATH=plugin_hrm,public

# AI 插件服务
SEARCH_PATH=plugin_ai,public
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
SELECT * FROM public.companies;
SELECT * FROM unified_core.users;
SELECT * FROM plugin_erp.assets;
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
| `shared` | `public` | 共享实体（公司、部门、员工） |
| `iam` | `unified_core` | 用户、角色、权限 |
| `doc` | `unified_core` | 文档管理 |
| `flow` | `unified_core` | 工作流引擎 |
| `notification` | `unified_core` | 通知服务 |
| `erp` | `plugin_erp` | ERP 企业资源计划 |
| `hrm` | `plugin_hrm` | HRM 人力资源管理 |
| `crm` | `plugin_crm` | CRM 客户关系管理 |
| `ai` | `plugin_ai` | AI 知识库 |

### B. 默认账户信息

| 项目 | 值 |
|------|-----|
| 默认租户代码 | `default` |
| 默认租户ID | `00000000-0000-0000-0000-000000000001` |
| 管理员用户名 | `admin` |
| 管理员密码 | `admin123` |
| 管理员邮箱 | `admin@topems.com` |

### C. 端口配置

| 服务 | 端口 | Schema |
|------|------|--------|
| unified-core | 8000 | unified_core, public |
| erp | 8010 | plugin_erp, public |
| hrm | 8011 | plugin_hrm, public |
| crm | 8012 | plugin_crm, public |
| ai | 8062 | plugin_ai, public |

---

## 联系支持

如有问题，请联系：
- 技术支持：support@topems.com
- 文档仓库：https://github.com/topems/docs

---

**版本**: v2.0.0  
**最后更新**: 2026-06-18
