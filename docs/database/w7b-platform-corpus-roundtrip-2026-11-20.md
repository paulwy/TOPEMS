# W7-B 平台语料 5 表回滚↔重放演练（2026-11-20）

> 范围：`20261118110000_platform_corpus_rls_strict.sql` 与同名 rollback。
> 目的：在不动生产的前提下，验证「已应用状态 → 回滚 → 重新应用」的完整闭环和断言。
> 结论：**roundtrip 通过**，回滚后的 NULL 基线与重放后的哨兵态均与预期一致。

## 1. 演练环境

| 项 | 值 |
|---|---|
| 源库 | `topems_test_full`（已应用 `20261118110000`） |
| 演练库 | `topems_w7b_rt_20261120`（`createdb -T` 克隆，演练后已删除） |
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

## 4. 租户可见性复核

迁移态下以 `SET ROLE topems` + `app.tenant_id=11111111-...` 读取：

| 表 | 租户可见行 |
|---|---:|
| `core_finance_currencies` | 8 |
| `core_finance_report_line_map` | 48 |
| `core_roles` | 16 |
| `project_type_configs` | 1 |
| `sync_policies` | 0（唯一净减少，DEC-15 已拍板） |

空 `app.tenant_id` 时前 4 表均为 0，符合 fail-closed 预期。

## 5. 边界

- 本次演练源库是测试库，不是生产快照；不能替代生产窗口前的快照只读复核。
- 生产窗口仍需按 `docs/database/window-rls-strict-20261118-runbook.md` 执行：停写、生产快照读数、同窗口二进制切换、逐版本 `apply-forward --prod`。
- 本文只证明迁移与回滚脚本自身可往返，不代表生产数据分布与测试库完全一致。
