# B145 · 财务审计发现 / 智能告警状态收口

日期：2026-11-22

## 目标

替换两张 0 行表上值集错误的 VALID CHECK，统一到 `FindingStatus` 与 `AlertStatus`；本地应用，生产快照保持只读。

## 收口前

- `finance.finance_audit_findings_v52`：本地 0 行，nullable 无默认；已有 VALID 错误 CHECK `active/inactive/archived`，会拦截 `open/resolved/ignored`。
- `finance.finance_v60_alerts`：本地 0 行，`NOT NULL` 默认 `active`；已有 VALID 错误 CHECK `active/inactive/archived/draft/pending/acknowledged/resolved`，缺 `suppressed`。
- 生产快照两表不存在。
- `audit_v52::FindingStatus` 三值、`forecasting::AlertStatus` 四值均已存在；审计列表 `status` 直接绑定原始字符串，非法值返回空列表。

## 代码改动

- `FindingStatus`：补 `DB_VALUES = open/resolved/ignored`、`DEFAULT = Open`、`from_db_str`，`as_str` 公开。
- 审计发现列表在进入引擎前严格解析 `status`，非法值 400；查询与 COUNT 继续绑定规范值。
- `AlertStatus`：补 `DB_VALUES = active/acknowledged/resolved/suppressed`、`DEFAULT = Active`、`as_str/from_db_str`。
- 告警表写入仍由决策模块只写 `active/acknowledged/resolved`，`suppressed` 保留给内部抑制态。

## 本地应用

候选：`docs/database/finance-audit-alert-status-check-candidates-2026-11-22.sql`

本地 `topems` 单事务：

- 先 DROP 两个错误 VALID 约束。
- 审计发现：NULL 回填 `open`（0 行）、默认 `open`、`NOT NULL`、三值 `NOT VALID`。
- 智能告警：默认 `active`、四值 `NOT VALID`。
- 两表仍 0 行，约束均 `NOT VALID`。
- 生产快照未修改。

## 队列

补 `FindingStatus/AlertStatus` 映射并重算：`resolved_enums` 127→129，财务域未解决枚举清零。

## 门禁

- finance clippy 通过；`cargo test -p topems-finance --lib` 1111 passed / 0 failed / 1 ignored。
- 盘点 208/191/152/206、色板缺口 0；队列 144/152 一致。
- request-txn 1651、scope-api 176/144 未增，txn-write-non2xx 通过。
