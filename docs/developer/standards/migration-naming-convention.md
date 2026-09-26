# 迁移文件命名规范

> **生效日期**: 2026-08-08 (V67.2)
> **适用范围**: 全局 `database/migrations/` 和各服务 `svc/*/migrations/`

## 命名格式

```
YYYYMMDDHHMMSS_description.sql
```

### 示例
- `20260601000001_iam.sql` ✅
- `20260724000004_seed_module_permissions.sql` ✅
- `001-iam.sql` ❌ (已过时，仅保留历史文件不改名)

## 排序规则

迁移执行器按**文件名字典序**排序后依次执行。

当前 `database/migrations/` 中 13 个历史文件使用 `001-xxx` ~ `013-xxx` 编号前缀。由于 ASCII 中 `"0" < "2"`，这些文件在字典序下正确排在所有 `YYYYMMDD` 前缀文件之前。

**不重命名历史文件**的原因：
1. 迁移追踪器可能记录了原文件名，重命名会导致重复执行
2. 生产环境 `checksums.txt` 与文件名绑定
3. 当前排序已正确，无运行时风险

## 新迁移要求

1. **必须**使用 `YYYYMMDDHHMMSS_description.sql` 格式
2. **必须**同时在 `database/checksums.txt` 追加 SHA-256 校验和
3. **建议**在 该清单已归档（2026-07-24 快照），当前迁移主链见 database/migrations（278 个）
4. CI 门禁：`git diff --name-only -- '*migrations*.sql'` 非空时，检查 `checksums.txt` 是否同步更新

## 种子数据时序

种子 SQL（`seed_*.sql`）的 `INSERT INTO` 目标表必须已在更早的迁移文件中 `CREATE TABLE`。

### 当前种子依赖图
```
20260724000004_seed_module_permissions.sql
  → INSERT INTO core_roles (定义于 001-iam.sql) ✅

20260724000005_seed_module_menus.sql
  → INSERT INTO core_menus, core_menu_groups (定义于 012-menu.sql) ✅
```

字典序保证 `012-menu.sql` < `20260724000005_seed_module_menus.sql`，时序正确。
