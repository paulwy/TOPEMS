# RLS 实时盘点（Live Coverage）

> 本文件基于运行库 `postgres://topems@localhost:5432/topems` 实时查询（information_schema + pg_class），**权威口径**；`check-rls-coverage.py` 静态扫描（仅迁移 SQL）结果见 `rls-coverage-report.md` 并已标注局限。生成日期：2026-09-08（实施后）。

## 实施后状态（迁移 20260908000015 试点 + 20260908000016 全量）

| 项 | 数量 |
|---|---|
| 含 tenant_id/org_id 列的对象 | 570（普通表 **567** + 视图 3） |
| 含租户列普通表 | 567 |
| RLS 已启用（relrowsecurity=t） | **567（100%）** |
| 含租户列但未启用 RLS | **0** |
| 策略 `rls_tenant_isolation` | 331 个（试点 4 + 全量 327，ALL） |
| 视图（不单列，由底层表控制） | 3（`public.assets` 等） |

## 策略模板

```sql
CREATE POLICY rls_tenant_isolation ON <table>
USING (
  current_setting('app.current_tenant_id', true) IS NULL        -- 无上下文：放行（兼容）
  OR current_setting('app.current_tenant_id', true) = ''        -- 空上下文：放行
  OR tenant_id IS NULL                                          -- 共享/系统行：放行
  OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid  -- 本租户
)
WITH CHECK (同 USING);
-- text/varchar tenant_id 列：末项改用 ::text
-- 未使用 FORCE ROW LEVEL SECURITY：superuser/owner 管理通道保留
```

## 语义验证（试点，非 superuser 角色）

- 有租户上下文（`SET app.current_tenant_id='<uuid>'`）→ SELECT 仅见本租户行 ✓
- 越权写入他租户行 → `ERROR: new row violates row-level security policy` ✓
- 无上下文 → 全放行（兼容现有连接）✓
- superuser 绕过 RLS（预期，未 FORCE）✓

## 阶段 2（隔离真正生效，待专项）

1. **服务会话注入租户上下文**：后端连接建立时 `SET app.current_tenant_id = <当前请求租户>`（当前全仓 rg 无任何 `current_setting('app.current_tenant_id')` 设置代码）。
2. **应用角色非 superuser 化**：`topems` 为 Superuser（RLS 默认绕过）——需专用业务角色（可选项：FORCE ROW LEVEL SECURITY + 策略白名单）。
3. 逐服务回归：多租户数据互不可见。

## 未启用对象明细（追溯：实施前 334 张目标清单）

实施前目标 334 张 = 普通表 331（试点 4 先启用，全量 327 补足）+ 视图 3（剔除）。实施后普通表 0 未启用；清单不再单独维护，迁移文件 `20260908000016_rls_enable_all.sql` 内含全量表名。
