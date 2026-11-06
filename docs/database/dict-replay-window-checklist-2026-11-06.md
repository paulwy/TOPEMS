# prod 字典回灌 + 发布窗口清单（可执行，未执行）

- 日期：2026-11-06
- 状态：**仅方案与本地演练；prod 未执行任何 DML/DDL**
- 关联：
  - 方案存档：[prod-dict-seed-replay-plan-2026-11-06.md](prod-dict-seed-replay-plan-2026-11-06.md)
  - 本地演练：[dict-replay-rehearsal-2026-11-06.md](dict-replay-rehearsal-2026-11-06.md)
  - 执行脚本：[scripts/db/dict-replay-window.sh](../../scripts/db/dict-replay-window.sh)
  - 核对 SQL：[scripts/db/sql/dict_replay_verify.sql](../../scripts/db/sql/dict_replay_verify.sql)
- 口径：**先灌后发**（先合并字典，再发布迁移与二进制）。4 个 legacy 类及其 items 必须保留。

## 1. 窗口前置

| 项 | 要求 |
| --- | --- |
| 窗口时长 | **30–45 分钟**（备份 2、回灌 <1、清理 <1、核对 2、发布+重启 10–15、冒烟 5、缓冲 10） |
| DSN-owner | 表 owner / DBA，用于迁移、`TRUNCATE`、备份恢复（`xingzhai` 或 `topems`） |
| DSN-app | `topems_app`（非 superuser、非 bypassrls），用于 backup / replay / verify |
| 回灌二进制 | `target/debug/examples/seed_dict_replay`，必须由**本次发布 commit** 构建 |
| 发布 commit | 固定 sha，禁止窗口内从 main 重新拉取未评审代码 |
| 迁移锚点 | 窗口前执行 `select max(version) from _sqlx_migrations where success`，与仓库 `diff` 核对 pending 清单 |
| Token | 超管 JWT、普通租户 JWT、用于通知冒烟的真实 `user_id` |
| legacy 清单 | `department_type` / `education` / `marital_status` / `position_level`（代码常量 `LEGACY_DICT_TYPES`） |

**发布前必须确认**：pending 迁移里除 `20261107000008_dict_tenant_isolation_strict.sql` 外，其余均为
已评审的并行批次；若出现未知迁移，暂停窗口，不执行 `apply-forward`。

## 2. 时间线

| 阶段 | 动作 | 脚本 | 通过标准 |
| --- | --- | --- | --- |
| T-10m | 停止字典写流量（维护页/只读开关）；记录 `window_start` | 人工 | 无新写 |
| T0 | 备份两表 + 文本基线 + SHA256 | `backup` | dump 可 `pg_restore -l` 读取 |
| T+2m | 合并回灌 | `replay` | 输出 `all_types=78`（含 probe）、legacy 4/17 |
| T+3m | 清理 `zz_b4_probe2` | `cleanup` | 类型总数 77、probe=0 |
| T+4m | 6 组核对 | `verify` | `ALL 6 GROUPS OK` |
| T+4m | 应用迁移（先灌后发） | `release` | 迁移成功、策略唯一且含 `app.rls_system` |
| T+6m | 部署二进制、滚动重启（先 master-data，再 server） | 人工 | `/ready` 200，无启动期 seed 报错 |
| T+15m | 冒烟 | `smoke` | 超管 77、普通租户不泄露、通知 200 |
| T+20m | 观察 10 分钟 | 人工 | 5xx < 1%、无 RLS 报错 |
| 结束 | 恢复写流量；记录执行结果 | 人工 | 验收表签字 |

## 3. 逐步命令

环境变量：

```bash
export DICT_WINDOW_CONFIRM=yes
export APP_DSN='postgres://topems_app:...@127.0.0.1:5432/topems_prod'
export OWNER_DSN='postgres://xingzhai@127.0.0.1:5432/topems_prod'   # 或 tunnel
export OUT=/secure/topems/dict-window-$(date +%Y%m%d_%H%M%S)
```

### 3.1 备份

```bash
scripts/db/dict-replay-window.sh backup --dsn "$APP_DSN" --out-dir "$OUT"
```

产物：`dict_before_<ts>.dump`、`.sha256`、`.txt`（逐行类型/项基线）、`window_start.txt`。
备份必须使用 `PGOPTIONS="-c app.rls_system=on"` + `--enable-row-security`（脚本已内置），
否则严格策略下会漏行。

验收：`pg_restore -l "$OUT/dict_before_*.dump" | grep 'TABLE DATA'` 能看到两张表。

### 3.2 回灌（合并，不清表）

```bash
scripts/db/dict-replay-window.sh replay --dsn "$APP_DSN" --out-dir "$OUT" \
  --seed-bin target/debug/examples/seed_dict_replay
```

- 二进制必须设置 `DICT_REPLAY_CONFIRM=yes` 才执行（脚本已传）。
- 回灌在单事务内 `app.rls_system='on'` + 租户 `…0001`；`INSERT ... ON CONFLICT`，无 `DELETE/TRUNCATE`。
- 预期：`all_types=78`（含 probe）、`legacy=4`、`items=397`；
  legacy 分项 4/4/4/5。

### 3.3 清理测试残留

```bash
scripts/db/dict-replay-window.sh cleanup --dsn "$APP_DSN" --out-dir "$OUT"
```

守卫：`zz_b4_probe2` 必须 0 项、`category='general'`，否则拒绝删除并终止窗口。

### 3.4 6 组核对

```bash
scripts/db/dict-replay-window.sh verify --dsn "$APP_DSN" --out-dir "$OUT"
```

| 组 | 断言 |
| --- | --- |
| G1 | 类型总数 77、标准类 73、项 397 |
| G2 | legacy 4 类存在，分项 4/4/4/5，合计 17 |
| G3 | 所有行 `tenant_id=…0001`，无 NULL / 全零 |
| G4 | 标准类无空项，标准类项数 380（379 + 存量 `regular`） |
| G5 | 系统租户可见 77；普通租户 0 行（系统通道关闭） |
| G6 | 无 `zz_*` / `B4-*` 残留 |

任一组失败：**停止发布，进入回滚**（第 5 节）。

### 3.5 发布（迁移 + 二进制）

```bash
scripts/db/dict-replay-window.sh release --dsn "$OWNER_DSN" \
  --anchor <窗口前 max(version)> --prod --out-dir "$OUT"
```

然后人工：

1. 部署固定 commit 的 `topems-master-data` / `topems-server` 二进制；
2. 先重启 master-data（确认日志无 `seed_dict_data` 失败）；
3. 再重启 server/BFF；`curl -f /ready` 连续 3 次 200。

发布后复核策略：

```sql
SET app.rls_system='on';
SELECT tablename, qual FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('core_dict_types','core_dict_items');
-- 每表 1 条，qual 含 app.rls_system
```

### 3.6 冒烟

```bash
scripts/db/dict-replay-window.sh smoke --base-url https://<bff> \
  --super-token "$SUPER" --tenant-token "$TENANT" \
  --tenant-id <普通租户UUID> --expect-tenant-total 0 \
  --notify-user-id <真实用户UUID> --out-dir "$OUT"
```

三项：

1. **超管字典列表**：`GET /api/master-data/dict/dict-types?page=1&page_size=100`，`total >= 77`，包含 legacy 4 类。
2. **普通租户可见性**：同接口，`total` 等于该租户自有字典数（prod 预期 0），且不出现 legacy/系统类。
3. **通知创建**：`POST /api/communication/notification/notifications`，HTTP 200。

## 4. 回滚判据

出现任一情况立即回滚：

- G1–G6 任一组失败，或回灌后总数 ≠ 77 / 397；
- legacy 4 类或分项 4/4/4/5 缺失；
- 超管字典列表为空 / 普通租户看到系统字典；
- 通知创建 500（与字典无关的存量问题除外，需先判定）；
- master-data 5xx 持续 > 5%，或日志出现 `app.rls_system` / RLS 相关错误；
- 发布后 `/ready` 连续 3 次失败。

## 5. 双回滚路径

### 路径 A：增量回滚（快，保留存量与 legacy）

```bash
scripts/db/dict-replay-window.sh rollback-incremental --dsn "$APP_DSN" \
  --out-dir "$OUT"            # 默认使用 $OUT/window_start.txt
```

- 删除 `created_at >= window_start` 的 items/types，即窗口内新增的 373 项 / 71 类；
- 保留 probe 之外的存量 6 类 / 24 项与 legacy 4/17；
- 局限：`gender` / `employee_status` 的 `name` 若被 seed 更新，不会回退（其余字段不变）；
- 适用：发布后发现业务异常，但尚未产生新的业务写入。

### 路径 B：备份恢复（完整，需 owner + 短暂停写）

```bash
scripts/db/dict-replay-window.sh rollback-restore --dsn "$OWNER_DSN" --out-dir "$OUT"
```

- `TRUNCATE` 两表（需 owner），再按依赖顺序恢复：先 `core_dict_types`、后 `core_dict_items`；
- **必须**使用 `-n public -t <table>`；`pg_restore -t public.core_dict_types` 不会匹配任何对象
  （演练中已踩坑），且默认忽略错误会静默丢数据，因此脚本已加 `--exit-on-error`；
- 恢复后回到备份时点：7 类 / 24 项（含 `zz_b4_probe2`），legacy 4/17；
- `TRUNCATE` 期间字典不可用，必须停止写流量；策略保持收紧后的版本，不随数据回滚。

> 策略本身不回滚：不恢复 NULL/0 放行。如确需回退迁移，走新的前向迁移，不做 down。

## 6. 演练结论

已在本地 scratch 库完整演练（详见 [演练记录](dict-replay-rehearsal-2026-11-06.md)）：

- 回灌 → 清理 → 6 组核对：`types=77, standard_codes=73, items=397, legacy=4/17`，`ALL 6 GROUPS OK`；
- 迁移后复核策略唯一且含 `app.rls_system`；
- 增量回滚：`DELETE 373 items / 71 types`，legacy 4/17 保留，终态 6/24；
- 备份恢复：终态 7/24（含 probe），legacy 4/17；
- 演练中发现并修复 `pg_restore -t schema.table` 不匹配 + 默认忽略错误的问题。

## 7. 执行记录（窗口时填写）

| 项 | 值 |
| --- | --- |
| 发布 commit | |
| 窗口开始 / 结束 | |
| 备份 dump + SHA256 | |
| 回灌输出 | |
| 6 组核对 | |
| 迁移版本 | |
| 冒烟结果 | |
| 是否回滚 / 路径 | |
| 执行人 / 复核人 | |
