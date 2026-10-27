# wms 模块测试报告（b1 批次）

- 执行：b1（OrganizeAgent 子代理）｜执行时间 2026-10-27 00:46 CST｜登录账号 test_admin（超管）
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, access_token | ✅ |
| 2 | POST | /api/wms/warehouses | {"name":"e2e_wms_b1_001","code":"E2E-WH-B1-001","address":"e2e test addr"} | code=200, success=true, data.id=d88aa45e-7c72-4fb1-ba3f-7fa47b0cfce9, status=active | ✅ |
| 3 | GET | /api/wms/warehouses/d88aa45e-7c72-4fb1-ba3f-7fa47b0cfce9 | - | code=200, success=true, name/code/address/status 与创建一致 | ✅ |

## 读回验证
创建返回 id=d88aa45e-7c72-4fb1-ba3f-7fa47b0cfce9 → get-by-id 取回核对：
- name=e2e_wms_b1_001 ✅（唯一必填字段）
- code=E2E-WH-B1-001 ✅
- address=e2e test addr ✅
- status=active ✅（缺省状态）
- tenant_id=null（wms 仓库表当前未注入租户列，读回原样）

关键字段全部落库一致。

## 结论
**通过**。create→读回全链路 OK。name 必填、其余字段可选与 api_reference（models/warehouse.rs:22）一致。

## 备注
- 测试数据保留：warehouse e2e_wms_b1_001（id=d88aa45e-7c72-4fb1-ba3f-7fa47b0cfce9）。
- 注意点：wms 仓库记录 `tenant_id=null`，与 crm/finance 的租户注入行为不同；本批次为超管账号，不影响结果，但反映 wms 写路径未按 claims 注入 tenant_id（与 RLS 租户隔离口径可能存在偏差，仅记录）。
- 未调用 delete（遵守禁硬删约束）。
