# 状态 DB CHECK 缺口归因队列（W5-B / B21）

- 日期：2026-11-21
- 范围：`scripts/ci/status-db-check-queue.mjs`、`docs/database/status-db-check-queue-2026-11-21.json`、`docs/quality/finance-status-check-candidates-2026-11-21.md`（口径修正）
- 结论：108 个“Rust 有状态、DB 无 CHECK/ENUM”的值按可执行性分成 4 桶：15 个已有候选 DDL 等窗口、11 个是 API 投影不需要 CHECK、34 个疑似落库但缺表列映射、48 个属内部状态。队列可复现、可比对。

## 1. 为什么要先归因

“值不在 DB CHECK”只是读数，不代表每个值都该加约束：

- GraphQL/API 投影类型（`*Gql`、`graphql_*.rs`）不对应表列，加 CHECK 没有意义。
- 域值对象、计算中间态（如 `settled`、`aborted`）不落库或由其他字段推导。
- 真正需要 CHECK 的是“有表列、代码写入、值域可定”的那部分。

不先分开，就会对着 108 个值盲目加约束，既做不完也容易把合法写入拦死。

## 2. 分桶结果

| 桶 | 值 | 枚举 | 含义 | 下一步 |
| --- | --- | --- | --- | --- |
| `finance_candidate_ready` | 15 | 25 | 值已被 B19 候选 DDL 的某列集合覆盖 | 等生产窗口，按候选文件执行 |
| `api_projection` | 11 | 25 | GraphQL/API 投影类型，不对应表列 | 不做 CHECK |
| `persisted_unmapped` | 34 | 56 | 所在文件有 sqlx/query 迹象，疑似落库 | 逐枚举确认表列后进候选 DDL |
| `internal_state` | 48 | 32 | 域值对象/计算中间态/UI 状态 | 暂不做 CHECK |

合计 108 值 / 99 枚举，与盘点一致。

`persisted_unmapped` 按域分布：master-data 15、portal 21、rd 5、erp 4、shared 系 13、plugin-registry 7、其余 5。这是下一阶段的主要工作量。

## 3. 关键提醒：这是启发式，不是结论

- 判定依据只有两类信号：文件名/枚举名含 GraphQL 特征；文件内出现 `sqlx`、`query!`、`query_as`。
- 同一文件可能用 sqlx 写别的表，因此 `persisted_unmapped` 里存在误报（如 `expired`、`healthy`、`warning` 这类通用词）。
- 同理 `finance_candidate_ready` 里有非 finance 域的值（erp/master-data/portal/pm/rd/analytics 合计 11 个），原因是值字符串与候选集合重合，不代表那些表的约束已就绪。
- 任何值落 CHECK 前都必须人工确认：表、列、是否可空、历史别名。

## 4. 产物

- 脚本：`scripts/ci/status-db-check-queue.mjs`，读盘点 + 候选 SQL，输出 `docs/database/status-db-check-queue-2026-11-21.json`；`--check` 校验队列与两者一致。
- 队列每行含 `module / file / enum / values_by_bucket / candidate_targets`，`candidate_targets` 直接给出候选约束名，窗口执行时可直接对照。
- 建脚本 `--check` 未接 lefthook：队列依赖盘点与候选两个文件，接入时机放在候选 DDL 定稿后。

## 5. 口径修正

B19 原文写“24 个状态列 / 24 条 ALTER”，实际是 **25 个状态列、24 张表、25 条约束**（`financial_reports` 的 `status` 与 `approval_status` 各一条）。已在 `docs/quality/finance-status-check-candidates-2026-11-21.md` 与 TODO 中修正，演练结论不变（25 条 ALTER 全部成功、非法值被 23514 拦下、回滚零残留）。

## 6. 验证

- `node scripts/ci/status-db-check-queue.mjs`：99 枚举 / 108 值，四桶合计 108。
- `node scripts/ci/status-db-check-queue.mjs --check`：PASS。

## 7. 遗留

- 34 个 `persisted_unmapped` 值尚未映射到具体表列，需逐枚举读代码确认（下一批起按域推进，先 master-data 与 portal）。
- `core_finance_payment_workflow.status` 仍按外部工作流投影处理，未进入任何桶。
- 生产窗口未开，`finance_candidate_ready` 的 15 个值仍未真正受 DB 约束保护。
