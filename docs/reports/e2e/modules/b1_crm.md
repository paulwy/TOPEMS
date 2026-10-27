# crm 模块测试报告（b1 批次）

- 执行：b1（OrganizeAgent 子代理）｜执行时间 2026-10-27 00:46 CST｜登录账号 test_admin（超管）
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, data.access_token(JWT, 24h) | ✅ |
| 2 | POST | /api/crm/customers | {"name":"e2e_crm_b1_001","customer_type":"enterprise","email":"e2e_crm_b1_001@topems.local","phone":"13800000001"} | code=200, success=true, data.id=59398ed2-931c-4fb4-8dfd-5ef12b5b2811, owner_id 自动=90b1afcf-707c-483a-90ee-60d307504f8b, rating="C" | ✅ |
| 3 | GET | /api/crm/customers/59398ed2-931c-4fb4-8dfd-5ef12b5b2811 | - | code=200, success=true, name/customer_type/email/phone 与创建一致 | ✅ |

## 读回验证
创建返回 id=59398ed2-931c-4fb4-8dfd-5ef12b5b2811 → get-by-id 取回核对：
- name=e2e_crm_b1_001 ✅
- customer_type=enterprise ✅
- email=e2e_crm_b1_001@topems.local ✅
- phone=13800000001 ✅
- owner_id=90b1afcf-...（缺省时由 handler 从 JWT claims 补齐，与登录用户 sub 一致）✅
- deleted_at=null（软删除标记）

关键字段全部落库一致。

## 结论
**通过**。create→读回全链路 OK。POST 返回 code=200（非 201），envelope={code,success,data,message,timestamp}；owner_id 缺省取 claims 行为与 api_reference 一致。

## 备注
- 测试数据保留：customer e2e_crm_b1_001（id=59398ed2-931c-4fb4-8dfd-5ef12b5b2811）。
- 该客户 id 被 finance 模块同批次复用为 sales-invoice.customer_id（跨模块资源共享）。
- 未调用 delete（遵守禁硬删约束）。
