# B74 · CRM 客户与客户财务状态迁移约束（2026-11-21）

## 现状（改动前）
- `crm.customers.status` 与 `crm.customer_finance.status` 都有 DB CHECK（active/inactive/archived）。
- 客户编辑只做严格解析，但允许 active 直接跳 archived、archived 直接回 active；客户财务编辑的 `status` 完全未校验，任意字符串直写，非法值只能靠 DB 23514 变成 500。
- 本地数据：`crm.customers` 301 行全 active；`crm.customer_finance` 1 行 active。

## 改动
1. `CustomerStatus` 增加 `can_transition_to`：active↔inactive、二者→archived、archived→inactive，禁止 archived 直接回 active。
2. 客户编辑接口按当前态校验迁移，非法跳转 409；当前态为 NULL 时允许首次赋合法值；当前态非法 409。
3. 客户财务 upsert 的 `status` 改为严格解析 + 同一迁移规则；非法值 400，非法跳转 409，不再依赖 DB 约束兜底。

## 验证
- `cargo check -p topems-crm`、`cargo clippy -p topems-crm --all-targets -- -D warnings` 干净。
- 单元测试覆盖合法链与 archived→active 拒绝。
- 存量均为 active，无需数据迁移。

## 残留
- `Customer` / `CustomerFinanceInfo` 的 API 模型仍用字符串承载状态，枚举只用于请求校验和写入；后续可改为强类型但不影响本轮一致性。
- 客户财务 `risklevel` 仍是自由文本，未纳入本批。
