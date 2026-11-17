# 零租户历史数据回填执行预案（2026-11-18）

> 状态：**预案，未执行**。生产零 DDL、零数据修复、零停服。
> 本文与待上生产迁移 `20261118090000` / `20261118093000` / `20261118100000` /
> `20261118103000` 进**同一个窗口**，窗口由业务方确认后另行开。
> 事实基线：`docs/database/zero-tenant-inventory-2026-11-18.md`（2026-11-17 superuser 复核）。

## 1. 口径

- 零租户行定义：`tenant_id = '00000000-0000-0000-0000-000000000000'`（全零哨兵）。
- 回填映射源：`public.core_tenant_users(user_id → tenant_id)`，条件 `deleted_at IS NULL`。
  - `iam.users` 无 `tenant_id` 列，`public.core_users` 0 行，均不可用。
  - 现存映射 3 行、3 个不同 user_id，无一对多，映射唯一。
- 三类：
  1. **可确定回填**：有 `user_id` 且能在 `core_tenant_users` 唯一映射到非零租户。
  2. **保留零租户**：平台级 / 登录前事件，天然无租户归属，不强行归属。
  3. **无法解析挂起**：有 `user_id` 但无映射（用户已删/未建映射），不猜，挂起等数据治理。

## 2. 实测三类读数（2026-11-17，生产 `topems_prod`）

| 表 | 零租户总行 | 可确定回填 | 保留零租户 | 无法解析挂起 | 判别口径 |
|---|---:|---:|---:|---:|---|
| `public.audit_logs` | 153 | **0** | **140** | **13** | `user_id IS NULL` → 保留；有 `user_id` 无映射 → 挂起 |
| `public.core_login_logs` | 137 | **54** | **31** | **52** | `status='failed'` → 保留；`success` 可映射 → 回填；`success` 无映射 → 挂起 |

补充：

- `audit_logs` 的 140 行保留行为 `action='create' AND entity_type='auth'`（登录前/系统事件），
  13 行挂起行有 `user_id` 但对应账号未落 `core_tenant_users`。
- `core_login_logs`：`failed` 31 行、`success` 106 行（54 + 52）。
- 两表 `tenant_id IS NULL` 均为 0 行，无「NULL 归属」问题。
- 结论：**本窗口 `audit_logs` 不写任何数据**（可确定回填 0），只做读数与验收；
  `core_login_logs` 回填 54 行。

## 3. dry-run 计数 SQL（只读，执行前必须逐项等于预期）

```sql
-- 3.1 audit_logs 三类
WITH z AS (
  SELECT * FROM public.audit_logs
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
)
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE user_id IS NULL) AS keep_zero,
  count(*) FILTER (
    WHERE user_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.core_tenant_users u
                   WHERE u.user_id = z.user_id AND u.deleted_at IS NULL)
  ) AS resolvable,
  count(*) FILTER (
    WHERE user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.core_tenant_users u
                       WHERE u.user_id = z.user_id AND u.deleted_at IS NULL)
  ) AS pending
FROM z;
-- 预期：total=153, keep_zero=140, resolvable=0, pending=13
```

```sql
-- 3.2 core_login_logs 三类
WITH z AS (
  SELECT * FROM public.core_login_logs
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
)
SELECT
  count(*) AS total,
  count(*) FILTER (WHERE status = 'failed') AS keep_zero,
  count(*) FILTER (
    WHERE status <> 'failed'
      AND EXISTS (SELECT 1 FROM public.core_tenant_users u
                   WHERE u.user_id = z.user_id AND u.deleted_at IS NULL)
  ) AS resolvable,
  count(*) FILTER (
    WHERE status <> 'failed'
      AND NOT EXISTS (SELECT 1 FROM public.core_tenant_users u
                       WHERE u.user_id = z.user_id AND u.deleted_at IS NULL)
  ) AS pending
FROM z;
-- 预期：total=137, keep_zero=31, resolvable=54, pending=52
```

```sql
-- 3.3 安全断言（预期均为 0）
SELECT count(*) FROM public.audit_logs       WHERE tenant_id IS NULL;
SELECT count(*) FROM public.core_login_logs  WHERE tenant_id IS NULL;
```

> 任一读数与预期不等 → **中止窗口**，回查上游写入与映射，不执行回填。

## 4. 分批回填语句（仅 `core_login_logs`，54 行）

先开事务，并在事务内做临时快照；验证不通过直接 `ROLLBACK`，不产出持久 DDL。

```sql
BEGIN;

-- 4.1 事务内快照（TEMP，会话结束即消失；用于事务内反向回滚）
CREATE TEMP TABLE _bf_login_snapshot ON COMMIT DROP AS
SELECT l.id, l.tenant_id AS old_tenant_id
  FROM public.core_login_logs l
 WHERE l.tenant_id = '00000000-0000-0000-0000-000000000000'
   AND l.status <> 'failed'
   AND EXISTS (SELECT 1 FROM public.core_tenant_users u
                WHERE u.user_id = l.user_id AND u.deleted_at IS NULL);

-- 4.2 分批回填（每批 50 行，按 id 顺序；54 行 → 2 批）
DO $$
DECLARE n int;
BEGIN
  LOOP
    WITH batch AS (
      SELECT l.id, u.tenant_id AS new_tenant_id
        FROM public.core_login_logs l
        JOIN public.core_tenant_users u
          ON u.user_id = l.user_id AND u.deleted_at IS NULL
       WHERE l.tenant_id = '00000000-0000-0000-0000-000000000000'
         AND l.status <> 'failed'
       ORDER BY l.id
       LIMIT 50
    ), upd AS (
      UPDATE public.core_login_logs l
         SET tenant_id = b.new_tenant_id
        FROM batch b
       WHERE l.id = b.id
      RETURNING 1
    )
    SELECT count(*) INTO n FROM upd;
    RAISE NOTICE '本轮回填 % 行', n;
    EXIT WHEN n = 0;
  END LOOP;
END $$;
```

> `audit_logs` 本窗口可确定回填 0 行，**不执行 UPDATE**。

## 5. 事务内验收（不达标立即 `ROLLBACK`）

```sql
-- 5.1 回填后三类
WITH z AS (
  SELECT * FROM public.core_login_logs
   WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
)
SELECT count(*) AS zero_total,
       count(*) FILTER (WHERE status = 'failed') AS keep_zero,
       count(*) FILTER (
         WHERE EXISTS (SELECT 1 FROM public.core_tenant_users u
                        WHERE u.user_id = z.user_id AND u.deleted_at IS NULL)
       ) AS resolvable_left
  FROM z;
-- 预期：zero_total=83, keep_zero=31, resolvable_left=0

-- 5.2 回填行落点抽检（预期 54 行、0 行落全零）
SELECT count(*) AS backfilled,
       count(*) FILTER (WHERE tenant_id = '00000000-0000-0000-0000-000000000000') AS still_zero
  FROM public.core_login_logs l
 WHERE l.status <> 'failed'
   AND l.id IN (SELECT id FROM _bf_login_snapshot);

-- 5.3 逐行租户正确性（预期 0 行不一致）
SELECT count(*) AS mismatch
  FROM public.core_login_logs l
  JOIN public.core_tenant_users u ON u.user_id = l.user_id AND u.deleted_at IS NULL
 WHERE l.id IN (SELECT id FROM _bf_login_snapshot)
   AND l.tenant_id <> u.tenant_id;

-- 5.4 反向回滚（仅当 5.1~5.3 任一不达标，执行后 ROLLBACK）
UPDATE public.core_login_logs l
   SET tenant_id = s.old_tenant_id
  FROM _bf_login_snapshot s
 WHERE l.id = s.id;

COMMIT;
```

## 6. 提交后回滚方式

- **首选**：窗口前对该表做逻辑备份（`pg_dump --table=public.core_login_logs`），
  提交后如需回退，按 `id` 从备份恢复 54 行 `tenant_id`。
- **次选（需单独 DDL 登记）**：若业务要求可即时反向，可建持久快照表
  `public._backfill_login_logs_20261118(id uuid primary key, old_tenant_id uuid)`，
  回填前 INSERT，回退时 `UPDATE ... FROM`；验收后另行开 DDL 删除该表。
- 本文默认走「事务内快照 + 逻辑备份」，不新增持久表。

## 7. 验收读数（窗口关闭门槛）

| 项 | 窗口前 | 窗口后 |
|---|---:|---:|
| `public.audit_logs` 零租户行 | 153 | 153（不变） |
| `public.core_login_logs` 零租户行 | 137 | **83** |
| `core_login_logs` 可确定回填剩余 | 54 | **0** |
| `core_login_logs` 挂起行 | 52 | 52（不变） |
| `audit_logs` / `core_login_logs` NULL 租户 | 0 / 0 | 0 / 0 |
| 回填行租户错配 | — | **0** |

另需抽查 RLS 可见性：以租户 A 的 `app.tenant_id` 连库，只能看到 A 自己的登录日志；
全零行对普通租户不可见（系统通道 `app.rls_system=on` 可见）。

## 8. 窗口与时长估计

同窗口执行对象：

- `20261118090000_allow_all_residuals_strict_and_deny`
- `20261118093000_bi_core_tables_rls_strict`
- `20261118100000_qms_inspection_tables_rls_strict`
- `20261118103000_residual_loose_tables_rls_strict`
- 本回填（54 行）

估计：4 个迁移均作用于 0/1 行表，DDL 锁秒级；回填 54 行 2 批、毫秒级；
备份 + 前后读数 + 抽查约 5–10 分钟。**整窗 10–15 分钟**，建议低峰执行。
失败即 `ROLLBACK`，不产生部分回填。

## 9. 遗留登记（本窗口不处理）

1. **`analytics_sync_records` 无 `tenant_id` 列**（bi/analytics 影子表）：
   代码侧只做 GUC 作用域、无谓词；需 DDL 补列或切 `public` 权威表后再收严。
2. **`svc/analytics/src/modules/bi/websocket.rs` 3 处裸池读** `analytics_dashboards`
   （已是严格表）：既有遗留，需改请求事务，另行排期。
3. **动态数据集表谓词前提**：`bi.analytics_datasets` 等动态 SQL 拼接，
   需先落表白名单 / 参数化前提，再谈租户谓词收严。

> 以上三条仅登记，不夹带进本窗口。
