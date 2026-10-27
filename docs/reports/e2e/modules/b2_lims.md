# lims 模块测试报告（b2 批次）

- 执行：b2（子代理批次）｜执行时间 2026-10-27 00:47-00:50 CST｜登录账号 test_admin（超管）

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, data.access_token(JWT) | ✅ |
| 2 | POST | /api/lims/samples | {"sample_name":"e2e_lims_b2_001","sample_type":"water","quantity":10,"unit":"mL"} | **HTTP 500**, envelope code=500, success=false, message="服务器内部错误，请稍后重试" | ❌（panic，见根因） |
| 3 | POST | /api/lims/samples | {"sample_name":"e2e_lims_b2_002","sample_type":"water","unit":"mL"}（quantity 缺省） | HTTP 200, envelope code=200, success=true, data.id=af19b59e-7cf2-4d66-bc7f-44e23a3abe8d, sample_no=SMP-91C484B0, quantity=null, status=received, message="样品登记成功" | ✅ |
| 4 | GET | /api/lims/samples/{id} | id=af19b59e-7cf2-4d66-bc7f-44e23a3abe8d | HTTP 200, success=true, message="获取样品成功"，sample_name/sample_type/unit/status 与创建一致 | ✅ |
| 5 | GET | /api/lims/samples?page=1&page_size=20 | - | **HTTP 500**, envelope code=500, success=false, message="服务器内部错误，请稍后重试" | ❌（同根因 panic） |

## 读回验证
- b2_002（绕过用例）：创建返回 id=af19b59e-7cf2-4d66-bc7f-44e23a3abe8d → get-by-id 取回，sample_no=SMP-91C484B0、sample_name=e2e_lims_b2_002、sample_type=water、unit=mL、quantity=null、status=received，与创建响应完全一致，落库成功。
- b2_001（失败用例）：API 返回 500，但经直接 SQL 复核，行**实际已提交落库**：id=99bb8a40-f621-4ad0-8673-f7ec03b3361d、sample_no=SMP-2BE68C1B、sample_name=e2e_lims_b2_001、quantity=10.00、status=received。
- list 读回不可用：表中任一存活行 quantity 非空即触发 handler panic（当前即 b2_001 行），故 list 恒 500，无法用于列表读回。

## 结论
**通过（核心 create+get-by-id 闭环成立，但发现一处系统性缺陷，必须修复）**。

### 根因（服务端日志实证，/private/tmp/topems_server.log）
```
panicked at svc/lims/src/modules/sample.rs:342:27:
called `Result::unwrap()` on an `Err` value: ColumnDecode { index: "\"quantity\"",
source: "mismatched types; Rust type `core::option::Option<f64>` (as SQL type `FLOAT8`)
is not compatible with SQL type `NUMERIC`" }
list 路径同款 panic：svc/lims/src/modules/sample.rs:241:31（同 quantity 列）
```
- DB 列 `qa_lab_samples.quantity` 为 `numeric(12,2)`，而 handler `row.get("quantity")` 目标类型为 `Option<f64>`（FLOAT8），sqlx 不支持 NUMERIC→f64 解码，`Row::get` 内部 unwrap 直接 panic，被 `CatchPanicLayer`（svc/server/src/registry.rs:220）兜底为通用 500「服务器内部错误，请稍后重试」。
- 时序细节：register_sample 中 `tx.commit()`（sample.rs:322）先于 `Sample{ row.get(...) }` 构造（:334+），故带 quantity 的创建**事务已提交、行已落库**，仅响应为 500——客户端误以为失败，实际产生了"孤儿"已落库数据。
- 绕过方式：请求不带 quantity（NULL 列经 Option 短路解码，不触达内部类型编解码器）即可走通；但只要表中存在任何 quantity 非空的行，list_samples（:241）逐行解码即 panic。
- 修复方向（建议）：`quantity` 改用 `rust_decimal::Decimal` 解码，或 RETURNING/SELECT 中 `quantity::TEXT` 后按 String 读回再转 f64。

## 备注
- 测试数据保留（未删，含"孤儿"行 b2_001）：
  - e2e_lims_b2_001：id=99bb8a40-f621-4ad0-8673-f7ec03b3361d，sample_no=SMP-2BE68C1B，quantity=10.00（API 响应 500 但 DB 已落库）。
  - e2e_lims_b2_002：id=af19b59e-7cf2-4d66-bc7f-44e23a3abe8d，sample_no=SMP-91C484B0，quantity=null（完整通过用例）。
- lims 删除为软删除（deleted_at），未调用。
- 响应时间字段 `received_at` 等由 `::TEXT` 转换返回字符串；create 返回 message="样品登记成功"。
