# Finance 模块域查询吞错 + 凭证导入假成功（B367，2026-11-27）

## 缺口一：10 处统计/存在性查询「失败即取默认值」

`svc/finance/src/modules/mod.rs`（不是 `financial_reports.rs`，那是 B366）里：

| handler | 吞掉的查询 | 失败后的后果 |
| --- | --- | --- |
| `get_template_usage_stats_handler` | `rule_count`、`generated_voucher_count`、`last_used_at` | 用量统计回 0 / null |
| `add_template_entry_handler` | 模板存在性 `count`、`MAX(sort_order)` | **404「凭证模板不存在」**（模板明明在，只是查询挂了）；`sort_order` 从 1 重排、与既有分录撞序 |
| `update_template_entry_handler` | 分录归属 `owns` | 404「模板分录不存在」，把 DB 故障说成数据不存在 |
| `reorder_template_entries_handler` | 模板存在性 `count` | 同上 |
| `get_next_voucher_no` | 既有凭证数 `count` | **直接返回 `000001`**——与库里已有凭证号撞号，接着写库就是唯一约束冲突或重复号 |
| `get_opening_balances` | `total`（COUNT） | items 非空但 `total: 0`，前端分页算成 0 页 |
| `list_expense_approvals` | `total`（COUNT） | 同上，items 与 total 自相矛盾 |

其中 `get_next_voucher_no` 最危险：编号生成器在查询失败时给出一个必然重复的号。

## 缺口二：两处 multipart 上传把错误静默丢掉

`while let Ok(Some(field)) = multipart.next_field().await` + `field.bytes().await.unwrap_or_default()`：
上传流中断被当成「没有更多字段」，或者文件内容读取失败被当成空文件——用户看到「缺少 file 字段」或
「导入完成」，实际是传输失败。

两处（模板导入 / 凭证导入）都改成显式 `loop + match`：`Err` → `FileFormatError`，不再吞。

## 缺口三：`import_vouchers_general` 是假成功端点

该端点解析完文件后返回：

```json
{"total": 0, "success": 0, "failed": 0, "errors": []}  // message: "导入完成"
```

**一条凭证都没写，却告诉用户导入完成**。真正落库的导入在 `/vouchers/import/u8` 等分支。
现在改为 `501` + 明确文案（带收到字节数、指向 `/vouchers/import/u8`），不再假装成功。
前端 `apps/web/src/api/finance/voucher.ts` 已有 `importVouchers` 调用此路径，需要切到 u8 分支（记入遗留）。

## 棘轮

新增 `query_error_ratchet::finance_module_handlers_do_not_swallow_query_errors`：
扫 `modules/mod.rs`（截止本测试模块之前，避免自匹配），任何 `.unwrap_or*` 若其前 60 字节内
`.await` 之后只剩空白，即失败。用「`.await` 后仅剩空白」而不是「前 60 字节含 `.await`」，
是为了不误伤 `while let Ok(Some(x)) = y.await { ... .unwrap_or("") }` 这类合法写法。

这条棘轮第一次跑就多抓出 3 个我没计划的真实问题：两处 multipart 吞错、一个假成功导入端点。

## 验证

- `cargo test -p topems-finance --lib`：1164 passed（含新棘轮）。
- `cargo clippy -p topems-finance --lib -- -D warnings`：干净。
- `cargo fmt --all` 已执行。

## 遗留

- 前端 `importVouchers` 仍打 `/vouchers/import`（现在 501），需切到 `/vouchers/import/u8`。
- `financial_report_exists(...).unwrap_or(false)`（`financial_reports.rs`，5 处）仍是 404 语义偏差，B366 已记录。
- 同文件还有其它 `.unwrap_or(...)`（参数解析、`field.name().unwrap_or("")`）属于合理默认，未动。
