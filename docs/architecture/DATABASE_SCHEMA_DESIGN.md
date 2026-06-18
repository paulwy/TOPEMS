# 统一数据库架构设计（已过时）

## ⚠️ 重要通知

**本文档已过时，请参考最新版本：**

- **最新文档**: [database.md](./database.md) v2.0.0
- **更新日期**: 2026-06-18
- **变更原因**: 完全重构数据库架构，对齐产品架构计划

---

## 文档历史

### v1.0 (2026-06-10) - 已废弃

本文档描述了第一次数据库架构统一的设计方案，包括：
- 将 `shared` schema 用于共享实体
- 迁移 `companies`, `departments`, `employees` 到 `shared` schema
- 解决重复表问题

### v2.0 (2026-06-18) - 当前版本

根据产品架构计划，完全重构数据库架构：
- 采用 `unified_core + plugin_*` 架构
- 共享实体迁移到 `public` schema
- 核心平台整合到 `unified_core` schema
- 业务插件使用 `plugin_` 前缀

---

## 架构对比

### 旧架构 (v1.0)

```
┌─────────────────────────────────────────┐
│         PostgreSQL 数据库                │
├─────────────────────────────────────────┤
│  shared (共享实体)                       │
│    ├── companies                        │
│    ├── departments                      │
│    ├── employees                        │
│    └── audit_logs                       │
├─────────────────────────────────────────┤
│  iam, doc, flow, notification           │
│  erp, hrm, crm, ai, ...                 │
└─────────────────────────────────────────┘
```

### 新架构 (v2.0)

```
┌─────────────────────────────────────────┐
│         PostgreSQL 数据库                │
├─────────────────────────────────────────┤
│  public (共享实体 + 租户管理)            │
│    ├── tenants                          │
│    ├── companies                        │
│    ├── departments                      │
│    ├── employees                        │
│    └── audit_logs                       │
├─────────────────────────────────────────┤
│  unified_core (核心平台)                 │
│    ├── users, roles, permissions        │
│    ├── documents, workflows             │
│    ├── messages, notifications          │
│    └── plugins                          │
├─────────────────────────────────────────┤
│  plugin_* (业务插件)                     │
│    ├── plugin_erp                       │
│    ├── plugin_hrm                       │
│    ├── plugin_crm                       │
│    ├── plugin_ai                        │
│    └── ...                              │
└─────────────────────────────────────────┘
```

---

## 迁移路径

### 从 v1.0 到 v2.0

如果您当前使用的是 v1.0 架构，请按照以下步骤迁移：

1. **阅读新文档**
   - [database.md](./database.md) - 新的数据库设计规范
   - [数据库重建指南](../../database/init/README.md) - 执行步骤

2. **备份数据**
   ```bash
   pg_dump -h localhost -U topems -d topems -F c -f backup_v1.dump
   ```

3. **执行重建脚本**
   ```bash
   psql -h localhost -U topems -d topems -f database/init/01_rebuild_database.sql
   psql -h localhost -U topems -d topems -f database/init/02_create_plugin_tables.sql
   ```

4. **更新服务配置**
   - 更新 `SEARCH_PATH` 环境变量
   - 更新代码中的 Schema 引用

---

## 关键变更

| 变更项 | v1.0 | v2.0 |
|--------|------|------|
| 共享实体 Schema | `shared` | `public` |
| 核心平台 Schema | `iam`, `doc`, `flow` | `unified_core` |
| 插件 Schema 命名 | `erp`, `hrm` | `plugin_erp`, `plugin_hrm` |
| 租户管理 | 无 | `public.tenants` |
| 多租户隔离 | 无 | 租户上下文函数 |
| AI 知识库 | `ai` schema | `plugin_ai` + pgvector |

---

## 相关文档

- **最新文档**: [database.md](./database.md)
- **产品架构**: [product-architecture-plan.md](../product-architecture-plan.md)
- **重建指南**: [database/init/README.md](../../database/init/README.md)
- **重建脚本**: [database/init/01_rebuild_database.sql](../../database/init/01_rebuild_database.sql)

---

**版本**: v1.0 (已废弃)  
**创建日期**: 2026-06-10  
**废弃日期**: 2026-06-18  
**替代版本**: v2.0.0
