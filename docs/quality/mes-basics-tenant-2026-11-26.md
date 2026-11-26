# B352：MES 基础资料（车间/产线/班次/工作日历）租户收敛

日期：2026-11-26
范围：`svc/mes/src/modules/basics.rs`、`database/migrations/20261126190000_mes_basics_tenant_not_null.sql`（+ rollback、manifest、checksums）
迁移：有 DDL，仅收紧 `tenant_id NOT NULL`，不写业务数据

## 一、问题

1. **写路径只靠 RLS，不写租户谓词。** `mes.workshops`、`production_lines`、`shifts`、`work_calendars` 四组资源的 `update_*` / `delete_*` 全部是：

   ```sql
   UPDATE mes.workshops SET ... WHERE id = $1 AND deleted_at IS NULL
   UPDATE mes.workshops SET deleted_at = NOW() WHERE id = $1
   ```

   租户隔离完全依赖 RLS。`app.rls_system='on'`（系统通道）、RLS 策略被误删、或策略被改成 fail-open 时，任意租户可改/删其他租户的车间、产线、班次、日历。

2. **单条读同样无租户谓词。** `get_*` 四个 handler 都是 `WHERE id = $1 AND deleted_at IS NULL`，跨租户 ID 能读到别人的记录。

3. **列表无租户谓词。** 四个 `list_*` 用动态 `where_sql` 拼 `deleted_at IS NULL` + status/search，行查询与 COUNT 都不带 `tenant_id`；同样只靠 RLS。

4. **列本身可空。** 四张表 `tenant_id` 均 `is_nullable=YES`，任何绕过 handler 的写入（脚本、后台任务、历史迁移）都能留下 `tenant_id IS NULL` 的行；而这种行对 RLS 恒不匹配，等于“写入即隐身”。

## 二、数据事实（本机 2026-11-26）

| 表 | 行数 | tenant NULL | 已软删 | tenant_id 可空 | RLS 策略 |
| --- | --- | --- | --- | --- | --- |
| mes.workshops | 0 | 0 | 0 | 是 | 1（rls_tenant_isolation） |
| mes.production_lines | 0 | 0 | 0 | 是 | 1 |
| mes.shifts | 0 | 0 | 0 | 是 | 1 |
| mes.work_calendars | 0 | 0 | 0 | 是 | 1 |

四张表为空，收紧约束不影响存量数据。status 取值由既有 `ck_*_status_standard`（active/inactive/archived）保证，本批不动。

## 三、改动

### Rust（`basics.rs`，共 16 个 handler）

- `update_*`（4）：`AND tenant_id = $n::uuid` + 绑定租户；命中 0 行仍返回 404。
- `delete_*`（4）：`AND tenant_id = $n::uuid` + 绑定；`rows_affected == 0` → 404（原逻辑保留）。
- `get_*`（4）：`AND tenant_id = $n::uuid`，跨租户 ID 返回 404。
- `list_*`（4）：`where_sql` 追加 `AND tenant_id = $n::uuid`，参数序号按 status/search 是否存在动态计算（`1 + status? + search?`），行查询与 COUNT 同步绑定，避免占位符错位。
- 租户解析统一 `crate::shared::permission::require_write_tenant(&claims)`：缺失/零租户 → 400，不回退平台租户。读接口同样用它，保证“没有租户上下文就不返回全量”。

### DDL（`20261126190000`）

1. `SET LOCAL app.rls_system='on'` + 系统租户，保证 preflight 能看到全量行。
2. preflight `DO`：统计四表 `tenant_id IS NULL` 行数，>0 即 `RAISE EXCEPTION`（ERRCODE 23502）并整笔回滚，报错里带四表计数。不猜测回填：基础资料无父行可继承，NULL 行归属只能人工判定。
3. 四表 `ALTER COLUMN tenant_id SET NOT NULL`。
4. 后置 `DO`：断言四列 `is_nullable='NO'`。
5. rollback：四列 `DROP NOT NULL`。

## 四、验证

| 项 | 结果 |
| --- | --- |
| preflight 反向验证 | 事务内插入 `tenant_id IS NULL` 的 workshops 探针行 → 迁移在 preflight 处报 23502 并整体回滚，探针行未残留 |
| 正向应用（本机事务内 + 写 `_sqlx_migrations` SHA-384） | 四列 `is_nullable` 全部变为 `NO` |
| `bash scripts/migration/validate.sh`（连跑两次） | 0 / 0，`checksums.txt` 收录 `c0143e98…` |
| `bash scripts/migration/gen-manifest.sh --check` | 无漂移（registered=288, unregistered_pending=0, checksum_mismatch=0） |
| `node scripts/ci/check-destructive-sql.mjs` | PASS（无 UPDATE/DELETE/DROP） |
| `node scripts/ci/check-directed-migrations.mjs --changed-only` | PASS |
| `cargo fmt -p topems-mes` | 无差异 |
| `cargo check -p topems-mes` | 通过（36m54s，绝大部分时间在等并行构建的 target 锁） |
| `cargo clippy -p topems-mes --all-targets -- -D warnings` | 0 warning / 0 error |

## 五、剩余

1. 四张表的 `create_*` 已绑定租户，但 `tenant_id` 之外没有对 `workshop_id`（产线→车间）做同租户校验，跨租户挂靠仍可能；下一批补父子一致性。
2. RLS 仍是最后一道闸，本批是“显式谓词 + 非空”双保险，不替代 RLS 复核。
3. 前端若有按 id 的编辑入口，跨租户 ID 现在会得到 404 而非 403，前端提示文案可统一。
