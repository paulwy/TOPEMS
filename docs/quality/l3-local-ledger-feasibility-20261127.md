# L3 本机账本 replay 对齐可行性核查（2026-11-27，只读诊断）

> 只读核查：未执行 replay、未改本机/prod 库。目标是判断本机 dev 账本对齐链尾的可行路径、阻塞点与风险。

## 1. 账本现状（只读实测）

| 口径 | 本机 `topems` (5432 socket) | prod `topems_prod` |
|---|---|---|
| 账本条数 | 735 | 813（distinct 版本） |
| max version | `20261124150000` | `20261126190000` |
| 失败行 | 0 | 0 |
| 磁盘迁移文件 | 884 唯一版本（`database/migrations/*.sql`） | — |

- **本机 pending 163**（磁盘有、账本无）：
  - **尾巴 37**：version > `20261124150000`，可由 `apply-forward` 正常续跑（anchor=账本 max）。
  - **中间缺口 126**：version < `20261124150000`，基线快照合并跳号；对象已由本机基线快照覆盖，账本号缺失。
- **账本 0–13** 为 init 基线占位行（`000_create_schemas`…`013_login_log`），非脏数据。
- **三方差集**：prod 有本机无 100 版本；本机有 prod 无 22 版本（早期 `20261107…` batch 编号，基线合并口径差异，台账 L3 既有记录吻合）。
- **本机库规模**：87 MB；`iam.users` 2、`core_roles` 13、`core_permissions` 355（prod 1162 子集）、`core_role_permissions` 4689（含冗余约 3774，待 `180000` 去重）。
- **5433 验证实例**：socket `/tmp/.s.PGSQL.5433` 不存在，实例未启动；不阻塞 5432 本机回放。

## 2. 尾巴 37 风险扫描

- **destructive-gate `allow` 17 个**：15 个 `*_status_standard` 状态约束规范化（fail-closed 断言：归一后仍有越界值即 `RAISE EXCEPTION`）、`20261126110000_drop_legacy_core_users`、`20261126180000_dedupe_core_role_permissions`。
- **含 DROP TABLE / TRUNCATE / DELETE 3 个**：`20261125140000_public_search_recent`、`20261126110000_drop_legacy_core_users`、`20261126180000_dedupe_core_role_permissions`。
- 其余为 RLS 加固、索引/约束/种子/菜单等增量。

## 3. 两条对齐路径

### 路径 A（推荐，链尾对齐 / 验证用途）：隔离库重建回放

- 现成脚本：`scripts/migration/rebuild-from-baseline.sh`、`scripts/db/provision-env.sh`。
- 流程：DROP/CREATE scratch 库 → 恢复结构基线快照 → 载入 prod 账本锚点 → 恢复参考数据基线（11 张配置表，排除 PII/单据/日志）→ `apply-forward.sh` 回放 version > anchor 至链尾 → 终态断言（表数/账本条数/锚点/参考数据指纹）。
- 基线快照在位：最新锚点 `20261117235500`（schema/ledger/data 三件套）；锚点之后版本走前向回放。
- 优点：账本连续到链尾、不污染 dev 主库、隔离可重复；#52 已用同路径重建 status 基线库对齐链尾并通过目录重生成。
- 注意：重建的是隔离验证库，不是 `topems` dev 主库；种子/参考数据由基线 + 前向种子批次叠加。

### 路径 B（dev 主库续跑尾巴）：滞后库前向补 37

- 命令口径：`apply-forward.sh --db topems --anchor 20261124150000`，只回放 version > anchor 的尾巴 37；非 prod 演练场景前向追加 `--drill-gate-guc-auto` 自动注入闸门 GUC 与系统通道。
- **126 中间缺口不补账**：`apply-forward` 正常模式只收 version > anchor；旧版本禁止 in-place 重放。rewind 需 `ALLOW_ANCHOR_REWIND=1` + `PROD_CHANGE_TICKET`，且仅演练用，不建议对 dev 主库做。缺口对象已在基线快照中，账本号缺失属口径差异，非功能缺口。
- 前置/风险：
  - `*_status_standard` fail-closed 断言：本机若存在五态/枚举之外的脏状态值会中断回放，回放前宜先核对相关状态列取值分布。
  - destructive 迁移（drop legacy users、dedupe）在本机需 ticket 与 gate 放行；`180000` 会把本机冗余授权 3774 收敛到 distinct 对。
  - 本机 355 权限码为 prod 子集，续跑尾巴不会反向补全种子权限；种子由基线/迁移种子批次覆盖。

## 4. 阻塞与前提

- **不阻塞**：5432 本机可连；基线快照与重建脚本在位；`validate.sh` 静态门禁 Errors=0。
- **待明确**：① 是否需要在 `topems` dev 主库续跑（路径 B），还是只建隔离验证库（路径 A）；② 路径 B 回放 destructive 迁移的 ticket 口径；③ 若需 5433 独立验证实例，须先启动实例。
- **不建议**：对滞后 dev 主库做账本 rewind 补 126 中间缺口；旧版本 in-place 重放被脚本守卫禁止，且基线快照已覆盖对象效果。

## 5. 结论

本机账本滞后属基线合并口径 + 尾巴未续跑，**无脏账本行（0 失败）、无断链必断的前置缺口**（schema/表对象覆盖齐全，1398 表 / 34 schema，与 prod 1373 / 34 同量级）。链尾对齐优先走路径 A 隔离库重建回放；dev 主库仅在需要本机完整增量环境时按路径 B 续跑尾巴 37，中间 126 缺口保持账本口径差异。本轮不执行 replay。
