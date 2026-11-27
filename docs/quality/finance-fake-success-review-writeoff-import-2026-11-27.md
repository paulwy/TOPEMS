# Finance「假通过」三连：合规审查恒判通过 / 付款核销不落应付 / U8 导入计成功不落库（B368，2026-11-27）

这三个端点彼此无关，坏法一模一样：**把入参丢掉，然后返回成功**。共同的写法是
`let _ = <入参>;` 后面跟 `Ok(..)` / 2xx——调用方看到成功，账和审计记录已经是错的。
B367 修的是「查询失败」被吞成成功，这一批修的是**根本没实现却在报成功**。

## 缺口一：合规自动审查对每条规则都判「通过」

`svc/finance/src/modules/risk_v54.rs`：

```rust
fn evaluate_rule(rule: &ReviewRule, _entity_type: &str, _entity_id: &str) -> bool {
    let _ = rule;
    true
}
```

`AutoComplianceReviewer::review_entity` 对租户下每条审查规则调用它，拿到的 `passed` 直接 INSERT 进
`finance.finance_v54_review_results`，然后回「审查完成」。

后果不是「少了个功能」，而是**伪造合规审计轨迹**：监管/内审抽查时，库里是一串「每条规则都通过」的
记录，比「没有记录」更难解释——因为你无法证明这些绿是算出来的。

修法：`evaluate_rule` 改返回 `Result<bool, TopemsError>`，显形为
`ServiceUnavailable("合规自动审查规则引擎尚未实现（X-Stub）：未生成任何审查结果，请人工审查")`，
`review_entity` 用 `?` 传播，handler 走 `err_resp` → 503。**一行审查结果都不写。**

另外 `risk_v54.rs` 里原本有个测试 `evaluate_rule_always_returns_true`，把这个假行为固化成了契约
（`assert!(AutoComplianceReviewer::evaluate_rule(&rule, "", ""))`）——门禁测试在替 bug 背书。
已替换为 `evaluate_rule_refuses_to_fabricate_a_pass`。

## 缺口二：付款核销不动应付，却回「核销成功」

`svc/finance/src/services/finance/payment_record.rs::write_off_payment`：

```rust
UPDATE finance.erp_payment_records SET status = 'written_off' ...   // 只改状态
let _ = payable_id;
let _ = write_off_amount;
Ok(json!({"status": status, "message": "核销成功"}))
```

`payable_id` / `write_off_amount` 一个都不用：**应付余额一分未减、核销明细一条不写**，付款记录却已进终态
`written_off`。结果就是「付款记录已核销 + 应付仍挂账」，对账时最难查的那一类差异。
`batch_write_off_payments` 逐条调的就是这个函数，所以批量核销同样全量假成功。

真正落账的核销在同服务另一条链上：`write_off_payment_item` 写
`finance.core_finance_payment_items` 的 `write_off_amount` / `remaining_amount` / `write_off_status`，
带 `rows_affected()==0 → 并发失败` 守卫。

修法：不擅自发明应付记账规则（`erp.payables` / `finance.erp_payables` / `finance.payables` 三张表并存，
口径未定），先把这条 legacy 路径**显形拒绝**：`ServiceUnavailable` + 指向
`/payment-items/{id}/write-off`，并 `tracing::warn!` 记下 payment_id / payable_id / 金额 / 当前态。

## 缺口三：U8 凭证导入把 0 行当成 N 张成功

`svc/finance/src/services/finance/u8_import.rs`：

```rust
async fn import_single_voucher(&self, tenant_id: Uuid, voucher_data: &Value) -> Result<(), TopemsError> {
    let _ = tenant_id;
    let _ = voucher_data;
    Ok(())
}
```

100 张凭证 → 100 次 `Ok(())` → `success_count = 100`、`status = completed`，批次记录
`finance.finance_u8_import_records` 写成「已完成」，凭证表 0 行。而且 `import_vouchers` 是**先插批次
记录（processing）再循环**，所以失败也会留下一条看起来「跑完了」的批次。

修法：

1. `import_single_voucher` 返回 `ServiceUnavailable("U8 凭证导入落库尚未实现（X-Stub）：未写入任何凭证")`；
   批次会以 `success_count=0 / failed_count=N / status=failed` + `error_message` 收尾（这是真话，保留记录）。
2. `import_vouchers_handler`（`/api/finance/u8-import/import`）在 `total_count>0 && success_count==0`
   时回 **503**，不再用 `ApiResponse::success(.., "导入成功")` 交差。
3. 顺带定格了另一个假端点 `/vouchers/import/u8`（`modules/mod.rs::import_vouchers_u8`）：它以前只
   `Uuid::new_v4()` + 回 `status=pending / 0/0/0` + 「导入已提交」，既不解析 `file_content` 也不落库。
   现在回 **501**，带上是否收到文件名/字符数。
4. B367 给 `/vouchers/import` 写的 501 文案原本指向 `/vouchers/import/u8`——**指向了另一个假成功端点**。
   已改为指向 `/api/finance/u8-import/import`，并注明该接口当前同样不落库。

## 附带清理：另外 5 处参数丢弃

同一批把 finance 里剩下的 `let _ = <ident>;` 全部清掉（都不影响行为，但会让真桩混在里面看不出来）：

| 位置 | 原写法 | 处理 |
| --- | --- | --- |
| `sales_invoice.rs::red_flush` | `let _ = cancelled;`（存在性守卫的结果） | 绑定改 `_cancelled`，删掉丢弃语句 |
| `domain/compliance.rs::check_data_retention` | `let _ = period_start; let _ = period_end;` | 参数改 `_period_start`/`_period_end` |
| `services/finance/reversal.rs` | 第二个归集循环里 `let _ = i;` | 去掉多余的 `enumerate` |
| `domain/event_handler.rs::HandlerResult::failure` | `let _ = message;` | 参数改 `_message`（见遗留） |

## 附带：修 upstream `291b2b419` 打红的 perm-matrix R5

推送时 `perm-matrix` 门禁（`ci-report`，R5 = FAIL）整片红：34 个 handler 的 `#[utoipa::path]`
既没有 `permission()` 也没有 `security()`。定位到上游 `291b2b419 fix(finance): 注解 path/方法/登记三件套对齐`
——它用脚本给「spec 有路由、代码无注解」的 32 个 handler 批量补注解，只写了 `path/tag/responses`，
把权限声明漏了。结果是**任何提交 `.rs` 的推送都被这条门禁拦住**（B367 当时 R5=0，之后才被打破）。

补法不是统一填 `BearerAuth = []`（那等于文档上说「登录即可」，比缺注解更容易误导），而是按
**路由层真实生效的 `require_permission` 口径**逐条补：

| 路由组 | 注解补的码 | 依据 |
| --- | --- | --- |
| settlement-center 读 / 写 / 审批（14 条） | `finance:settlement:read` / `:write` / `:approve` | `settlement_center/routes.rs:51,85,107` 三段 layer |
| 凭证增改删、模板增改删、分录增改删（7 条） | `finance:voucher:create` / `:update` / `:delete` | `modules/mod.rs` 9416 / 9486 / 9560 三段 layer |
| 科目辅助账（1 条） | `finance:account:read` | `modules/mod.rs:9241` |
| 报表（2 条） | `finance:report:read` | `modules/mod.rs:9596`（B363 同口径） |
| collections 改/删、payment-records 改/删（4 条） | `finance:receivable:read`、`finance:payment:read` | ar_ap / payment 路由组 layer |
| risk_v54（3）、decision_v60（1）、forecast_v53（1）、reconcile_orders（1）、reconciliation（1） | `finance:risk:read`、`:dashboard:read`、`:budget:read`、`:reconcile_orders:read`、`:reconciliation:read` | 各模块 `create_routes` 单一 layer |
| `GET /api/finance/`（首页） | `security(())`（公开） | `main.rs::home` 无鉴权 |

**补的过程本身暴露了 4 个写接口挂在读码后面**：`PUT/DELETE /collections/{id}` 在
`finance:receivable:read` 组里、`PUT/DELETE /payment-records/{id}` 在 `finance:payment:read` 组里；
`/reconciliations` 等结算写接口虽然分了 `:write`/`:approve`，但同一 router 的 `/reconciliations/{id}/reconcile`
也在 write 组、`/links/{id}` DELETE 同样。注解按「现状」写，**现状是否合理另记遗留**。

注：这些注解补的是 `security()`，`docs/api/openapi.json` 里对应条目仍是 `BearerAuth: []`
（spec 由聚合产物生成，本次未重生成），所以 spec 与本批注解之间有码级差异——已记入遗留。

## 棘轮

**crate 级**（`svc/finance/src/noop_stub_ratchet.rs`，4 个断言）：

1. `finance_has_no_param_discard_stubs_in_production_code`：递归扫 `src/**/*.rs`，`#[cfg(test)]` 段之前
   不允许 `let _ = <纯小写标识符>;` 单独成句（当前 0 处）。
2. `compliance_review_does_not_fabricate_a_pass`：不得退回 `-> bool` + `let _ = rule` 形态，且必须保留
   「尚未实现」显形。
3. `legacy_payment_write_off_does_not_claim_success_without_payable_update`：不得出现「核销成功」。
4. `u8_voucher_import_does_not_count_unwritten_vouchers_as_success`：`import_single_voucher` 不得空实现。

**全仓门禁**（`scripts/ci/check-noop-param-discard.cjs`，接 `lefthook.yml` 的 `noop-param-discard`，
`--changed-only` 只拦本次改动）：svc/lib 生产代码里的同类写法。全仓首跑 **28 处 / 21 个文件**：

| 服务 | 处数 |
| --- | --- |
| portal | 9 |
| erp | 6 |
| integration | 4 |
| lims | 2 |
| wms | 2 |
| ai / communication / master-data / pm / unified-core | 各 1 |

这些是下一批的现成清单（`svc/erp/src/modules/mdm_v49_retirement.rs` 3 处、`portal/*` 9 处最集中）。
默认模式只报告不失败，`--strict` 才会因存量失败——避免一次性把别人的提交全堵住。

## 验证

- `cargo test -p topems-finance --lib`：1168 passed（含新增 4 个棘轮断言）。
- `cargo clippy -p topems-finance --lib -- -D warnings`：干净。
- `bash scripts/ci/run-cargo-changed.sh clippy`（含 test target）：干净。
- `node scripts/ci/check-noop-param-discard.cjs --changed-only`：本次改动文件 0 命中。
- `node scripts/ci/perm-matrix-toolkit.cjs ci-report`：R5 34 → **0**，exit 0（R3 WARN 14 条为既有）。
- `cargo fmt --all` 已执行。

## 遗留

- **写接口挂在读权限码后面**：`PUT/DELETE /collections/{id}`（`finance:receivable:read`）、
  `PUT/DELETE /payment-records/{id}`（`finance:payment:read`）、`POST /reconcile/auto`、
  `POST /audit-v52/anomaly/detect`、`PUT /finance-v54/risk/alerts/{id}/acknowledge` 等都是写操作却只在读组里。
  本批只把注解对齐到「现状」，收紧（拆 `:write` 组 / 补 `:write` 码）是独立一批。
- `docs/api/openapi.json` 未重生成：本批 34 条 `security()` 与 spec 里的 `BearerAuth: []` 不一致，
  下次聚合生成时会被吸收；期间契约对账（`api-contract.mjs`）只看路径，不受影响。
- `HandlerResult::failure(message)` 的失败原因仍然**不随结果返回**（结构体只有
  `success / side_effects / next_events`）。要真正带上原因需要改结构体与下游序列化契约，单独一批做。
- 付款核销的正确实现要落在 `finance.core_finance_payment_items` 那条链上；legacy
  `erp_payment_records` 的核销应当下线（需要确认前端是否还在调 `/payments/{id}/write-off`）。
- 凭证导入（U8 / 通用）整体未实现：要么补解析 + 落库，要么按 `scripts/ci/openapi-known-stubs.json`
  口径把这三条（`/vouchers/import`、`/vouchers/import/u8`、`/u8-import/import`）登记为已知桩。
  这三条目前都在 spec 里且返回 501/503，属「已显形但未登记」。
- 前端 `apps/web/src/api/finance/voucher.ts`：`import()` 打 `/vouchers/import`（501）、
  `importU8()` 打的字段（`file_name/file_content/import_mode`）与后端
  `ImportVouchersRequest`（`source_system/vouchers/import_mode`）也不一致，等导入实现补完后一并改。
- `risk_v54::review_entity` 加载规则时未过滤 `deleted_at` / `enabled`（`ReviewRule` 结构体本身没有这两个
  字段），等规则引擎实现时一起收。
