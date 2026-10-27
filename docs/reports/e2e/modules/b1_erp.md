# erp 模块测试报告（b1 批次）

- 执行：b1（OrganizeAgent 子代理）｜执行时间 2026-10-27 00:46 CST｜登录账号 test_admin（超管）
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, access_token | ✅ |
| 2 | POST | /api/erp/materials | {"code":"e2e_erp_b1_001","name":"E2E测试物料B1","unit":"个","category":"成品","unit_price":"100.50"} | code=200, success=true, data.id=2e1e7643-65b9-49fd-911b-881b85636b30, status=active, unit_price="100.5000" | ✅ |
| 3 | GET | /api/erp/materials/2e1e7643-65b9-49fd-911b-881b85636b30 | - | code=200, success=true, code/name/unit/category/unit_price 与创建一致 | ✅ |

## 读回验证
创建返回 id=2e1e7643-65b9-49fd-911b-881b85636b30 → get-by-id 取回核对：
- code=e2e_erp_b1_001 ✅
- name=E2E测试物料B1 ✅
- unit=个 ✅
- category=成品 ✅
- unit_price="100.5000"（Decimal 落库，scale=4）✅
- status=active ✅（缺省状态）
- safety_stock=0.0、tax_rate=0.0（缺省值）

关键字段全部落库一致。

## 结论
**通过**。create→读回全链路 OK。四个必填字段 code/name/unit/category 与 api_reference（models/material.rs:29）一致；unit_price 以 Decimal 字符串传入被正确接受。

## 备注
- 测试数据保留：material e2e_erp_b1_001（id=2e1e7643-65b9-49fd-911b-881b85636b30）。
- 未调用 delete（遵守禁硬删约束）。
