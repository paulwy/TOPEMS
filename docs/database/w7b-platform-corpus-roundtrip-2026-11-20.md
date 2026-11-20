# W7-B 平台语料 5 表回滚↔重放演练（2026-11-20）

> 范围：`20261118110000_platform_corpus_rls_strict.sql` 与同名 rollback。
> 目的：在不动生产的前提下，验证「已应用状态 → 回滚 → 重新应用」的完整闭环和断言。
> 结论：**roundtrip 通过**，回滚后的 NULL 基线与重放后的哨兵态均与预期一致。

## 1. 演练环境

| 项 | 值 |
|---|---|
| 源库 1 | `topems_test_full`（已应用 `20261118110000`） |
| 演练库 1 | `topems_w7b_rt_20261120`（`createdb -T` 克隆，演练后已删除） |
| 源库 2 | `topems_w7_reh_prod_20261111`（生产快照克隆） |
| 演练库 2 | `topems_w7b_prodsnap_20261120`（生产快照再克隆，演练后已删除） |
| 执行方式 | `psql -X -q -v ON_ERROR_STOP=1 -f`，任一断言失败即非 0 退出 |
| 生产影响 | 零；未连接生产库，未写生产账本 |

## 2. 回滚结果

回滚脚本执行成功，5 表恢复为迁移前的 NULL 平台行：

| 表 | NULL 行 | 哨兵行 |
|---|---:|---:|
| `finance.core_finance_currencies` | 8 | 0 |
| `finance.core_finance_report_line_map` | 48 | 0 |
| `public.core_roles` | 16 | 0 |
| `pm.project_type_configs` | 1 | 0 |
| `mobile.sync_policies` | 1 | 0 |

回滚脚本内置后置断言全部通过：策略恢复为 `rls_tenant_isolation` + `rls_global_read`，NULL 行数与期望一致，哨兵行归零。

## 3. 重放结果

在同一演练库重新执行迁移，5 表恢复为全零哨兵、NULL 归零：

| 表 | NULL 行 | 哨兵行 |
|---|---:|---:|
| `finance.core_finance_currencies` | 0 | 8 |
| `finance.core_finance_report_line_map` | 0 | 48 |
| `public.core_roles` | 0 | 16 |
| `pm.project_type_configs` | 0 | 1 |
| `mobile.sync_policies` | 0 | 1 |

迁移内置前置/后置断言全部通过；前 4 表恢复 `rls_platform_read`，`mobile.sync_policies` 仅保留 `rls_tenant_isolation`。

## 4. 生产快照副本复核

以本地既有生产克隆 `topems_w7_reh_prod_20261111`（72 MB，0 活动连接）再克隆为 `topems_w7b_prodsnap_20261120`，直接执行同一迁移：

| 表 | 迁移前 NULL | 迁移后 NULL | 迁移后哨兵 |
|---|---:|---:|---:|
| `finance.core_finance_currencies` | 8 | 0 | 8 |
| `finance.core_finance_report_line_map` | 48 | 0 | 48 |
| `public.core_roles` | 16 | 0 | 16 |
| `pm.project_type_configs` | 1 | 0 | 1 |
| `mobile.sync_policies` | 1 | 0 | 1 |

迁移脚本前置断言全部通过：生产副本的实际 NULL 分布与脚本硬编码的 `8/48/16/1/1` 完全一致，未触发「与基线不符」异常。

迁移后以 `SET ROLE topems` + 非空租户 GUC 读取：`currencies=8`、`report_line_map=48`、`core_roles=16`、`project_type_configs=1`、`sync_policies=0`。

## 5. apply-forward 入口复核

在同一生产快照克隆上，不用裸 `psql`，改用正式入口 `scripts/migration/apply-forward.sh`：

```bash
bash scripts/migration/apply-forward.sh \
  --dsn "postgresql:///$DB?host=/tmp" \
  --anchor 20261112095000 \
  --only 20261118110000 \
  --defer <其余全部 pending> \
  --drill-gate-guc-auto
```

结果：

- 账本水位 `20261112095000`，本轮白名单只含 `20261118110000`，其余 pending 全部显式 defer。
- 待应用 1 条，无白名单外版本。
- 破坏性行数预演逐条通过：`8 / 48 / 16 / 1 / 1`，均等于文件声明的 `destructive-max-rows`。
- `== OK：应用 1 条，无失败`，退出码 0。
- `_sqlx_migrations` 中 `20261118110000` 已写入且 `success = true`。
- 应用后 5 表 NULL 全为 0，哨兵行 `8/48/16/1/1`。

说明：`--drill-gate-guc-auto` 只在隔离库演练中使用，用于等价还原生产特权会话的系统通道；生产窗口按 runbook 使用 `--prod`。

## 6. 租户可见性复核

迁移态下以 `SET ROLE topems` + `app.tenant_id=11111111-...` 读取：

| 表 | 租户可见行 |
|---|---:|
| `core_finance_currencies` | 8 |
| `core_finance_report_line_map` | 48 |
| `core_roles` | 16 |
| `project_type_configs` | 1 |
| `sync_policies` | 0（唯一净减少，DEC-15 已拍板） |

空 `app.tenant_id` 时前 4 表均为 0，符合 fail-closed 预期。

## 7. 边界

- 生产副本复核使用的是 2026-11-11 的生产快照克隆，不是窗口当天的生产库；不能替代窗口前的实时只读复核。
- 生产窗口仍需按 `docs/database/window-rls-strict-20261118-runbook.md` 执行：停写、生产快照读数、同窗口二进制切换、逐版本 `apply-forward --prod`。
- 本文只证明迁移与回滚脚本自身可往返，不代表生产数据分布与测试库完全一致。
