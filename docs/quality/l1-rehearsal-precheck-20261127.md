# L1 待投放迁移投放前预检清单复核（2026-11-27，只读）

> 只读预检：未写种子迁移、未投放 prod、未执行 replay。唯一投放入口 `scripts/migration/apply-forward.sh --prod`，禁 `sqlx migrate run`。
> 数据源：prod `topems_prod` peer socket 只读连接；本机 `topems` 账本对照。

## 1. 范围与账本状态

| 版本 | 文件 | 性质 | prod 账本 | 本机账本 | manifest |
|---|---|---|---|---|---|
| `20261126160001` | `iam_tenant_permissions_rls_fail_closed.sql` | 非破坏性 RLS 加固 | 未记账 | 未记账 | `to_apply` |
| `20261126170000` | `drop_iam_users_legacy_columns.sql` | destructive DROP CONSTRAINT/COLUMN | 未记账 | 未记账 | `to_apply` |
| `20261126180000` | `dedupe_core_role_permissions.sql` | DELETE 去重 | **已落地** success=t | 未记账 | `to_apply`（prod 幂等空跑已生效） |
| `20261126190000` | `mes_basics_tenant_not_null.sql` | ALTER SET NOT NULL | **已落地** success=t | 未记账 | `to_apply`（已生效） |

prod 账本：**811 条 / 0 失败 / max `20261126190000`**；已落地 `110000/130000/140000/150000/160000/180000/190000`。本机账本 735 条 / max `20261124150000`，四版本均未记账（dev 滞后，L3）。

## 2. 逐项预检（待投放两版本）

| 预检项 | `160001` RLS fail-closed | `170000` DROP 三列 |
|---|---|---|
| 账本双库未记账 | ✓ prod/本机均无账本行 | ✓ prod/本机均无账本行 |
| checksum 与 `checksums.txt` 一致 | ✓ `cb377945…b563211` | ✓ `293c44e4…5ecb0f8d` |
| manifest 登记 `to_apply` | ✓（manifest 3254 行） | ✓（manifest 3262 行） |
| 前置对象在位 | 表 `iam.tenant_permissions` 在；prod `RLS=f/FORCE=f`、无任何策略；旧 fail-open `rls_tenant_isolation` 策略 0 条（DROP IF EXISTS 为兜底） | prod 三列 `roles/permissions/role_id` 在；FK `users_role_id_fkey` 在；索引 `idx_users_role_id` 在；`role_id` 悬空 3 行（reviewer/admin→`3333…001`、tenant_admin→`3333…004`，占位 UUID，无入向业务读取） |
| destructive 标记 | 非破坏性，无 destructive 标记 | ✓ gate `allow` ×2（DROP CONSTRAINT / DROP COLUMN）；kind、reason、owner=iam、ticket `IAM-LEGACY-20261126`、expires `2027-05-25`、`rows-at-review=0`、backup 双 CSV 路径 |
| 后置断言 | ✓ 校验 ENABLE+FORCE 同时成立；新策略不含空租户/未设置/零租户豁免分支；旧 `rls_tenant_isolation` 无残留（不符即 `RAISE EXCEPTION`） | ✓ 收尾断言三列已不存在（残留即 `RAISE EXCEPTION` 回滚） |
| backup 快照 | —（非破坏性） | ✓ `backups/db-iam-users-legacy-columns/iam.users-topems_prod-20261126.csv`（表头 + 9 用户）、`iam.users-topems-20261126.csv`（表头 + 2 用户）；列 `id/username/email/is_superuser/role_id/roles/permissions` |
| 幂等/守卫 | `to_regclass` 守卫缺表跳过；策略存在 ALTER / 不存在 CREATE | `to_regclass` + `IF EXISTS` 守卫；新库/已清理库自动跳过 |

## 3. 已落地两版本复核（退出待投放清单）

- **`180000` 去重**：prod `core_role_permissions` 2923 行 = 2923 去重对，重复对 **0**；distinct 授权一条不丢。
- **`190000` mes_basics NOT NULL**：`mes.workshops / production_lines / shifts / work_calendars` 四表均 **0 行**；四列 `tenant_id` 均 `is_nullable=NO`；preflight 零 NULL 行前置已满足。

## 4. 静态门禁读数（`validate.sh`，只读）

- Total migration files checked 898；**Errors=0**；Checksum errors=0；Duplicate versions=0；Schema drift issues=0；Explicit transaction blocks=0。
- Warnings=4（既有静态分类告警，非阻断）；version ordering / idempotency / multi-responsibility / missing down 计数为既有口径，非本轮新增问题。

## 5. 投放窗口执行要点（沿用台账 §162/163，未变更）

- **顺序**：先 `160001`（非破坏性）后 `170000`（破坏性）；其余 pending 版本显式进 `--defer`。
- **命令形态**：`bash scripts/migration/apply-forward.sh --db topems_prod --prod --anchor 20261126190000 --only 20261126160001,20261126170000 --defer <其余 pending> --allow-destructive=20261126170000`；环境 `PROD_CHANGE_TICKET=IAM-LEGACY-20261126`。注：prod 下 `--anchor` 必须与账本 max 完全一致（当前 `20261126190000`）；`--allow-destructive` 仅单版本生效，文件内每个 `destructive-ticket` 都必须被 `PROD_CHANGE_TICKET` 显式列出；任何 pending 既不在 `--only` 也不在 `--defer` 会在 DDL 前硬失败。
- **破坏性预演**：`170000` DROP 行数必须为 0；投放前确认无长事务/锁等待。
- **投放前基线测试**（引用既有读数，窗口前复核重跑）：unified-core lib **571**、shared-auth lib **226**、shared 集成 `auth_test` **17**。
- **投放后回归**：RLS（`verify-rls.sh`，FORCE=t、策略 fail-closed、无旧豁免分支）；授权冒烟（`verify-runtime-permissions.sh` 非超管读 200/写 403、`verify_menu_authority.sh`、`verify-route-matrix.sh`）；登录冒烟 `admin/reviewer/tenant_admin/chi/wangy` 200；超管全量放行、普通用户按关联表角色/权限；用户列表/详情/`/users/me` 回显 roles/permissions 正确；账本两版本已记账、checksum 一致，`ledger-ddl-drift`/`manifest-drift` 门禁绿。
- **回滚/兜底**：`170000` 三列数据以 backup CSV 为重建依据（无自动回滚迁移，破坏性窗口）；失败按脚本输出「已应用清单 + 未应用清单 + 逆序回滚入口」处置，已落账前序版本保持不回滚。

## 6. 预检结论

待投放两版本前置对象、checksum、manifest、destructive 标记、后置断言、backup 与静态门禁均满足投放条件；**阻塞项仅为独立 replay 窗口本身**（prod 投放授权与回归时段），无代码/迁移侧待修项。`reviewer` 例外身份由 `is_superuser` 布尔兜底，不依赖被删三列，投放不降级、不清理。
