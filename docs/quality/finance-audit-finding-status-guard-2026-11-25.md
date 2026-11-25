# B289 Finance V52 审计发现状态守卫（2026-11-25）

## 结论

`finance.finance_audit_findings_v52.status` 已有 `open/resolved/ignored` 三态 CHECK、NOT NULL、默认 `open`，但 `AutoAuditEngine::resolve_finding` 只有一条无条件 UPDATE：

- 已 `resolved` 的发现可被再次“解决”，重复覆写 `resolved_at` 与 `evidence.resolution`。
- 已 `ignored` 的发现也能被改成 `resolved`，绕过忽略决定。
- 记录不存在时 `fetch_one` 直接返回数据库错误，handler 落 500。

## 状态机

`svc/finance/src/modules/audit_v52.rs::FindingStatus`

- `open → resolved / ignored`
- `resolved / ignored` 为终态
- 同态幂等

## 代码改动

- `FindingStatus` 补 `can_transition_to` 与 `Copy`，新增 2 项单测（值域往返、迁移矩阵）。
- `resolve_finding`：
  - 先按 `id + tenant_id` 读取整条 `AuditFinding`；缺失 `TopemsError::NotFound` → 404。
  - 当前态不在规范集合 → 400。
  - 已 `resolved`：幂等返回原记录，不重复写 `resolved_at` / resolution。
  - 已 `ignored`：状态机拒绝 → 400。
  - UPDATE 增加 `AND status = 'open'`，`fetch_optional` 0 行返回 400 并发冲突。
  - 返回类型从 `sqlx::Error` 收敛为 `TopemsError`。

## 数据库

无 DDL。三态 CHECK `ck_finance_audit_findings_v52_status_standard` 已存在并 VALIDATE，本地表当前 0 行。

## 验证

- `cargo check -p topems-finance` PASS。
- `cargo test -p topems-finance finding_status --lib` 4 passed（含既有 2 项）。

## 遗留

`ignored` 目前没有独立写入口（本批只处理 resolve），后续可在规则管理批次补“忽略”动作并复用同一状态机。
