# hrm 模块测试报告（b3 批次）

- 执行：b3 批次（SubAgent 执行）｜登录账号 test_admin（超管）
- 执行时间：2026-10-27 00:46–00:50 (UTC+8)
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | code=0, success=true, data.access_token(JWT, 581字符) | ✅ |
| 2 | POST | /api/hrm/employees | {"employee_number":"e2e_hrm_b3_001","name":"E2E测试员工B3-001"} | HTTP 500，envelope {code:500, success:false, data:null, message:"内部服务器错误"} | ❌ |
| 3 | GET | /api/hrm/employees?page=1&page_size=5 | - | code=200, success=true, data.items 有存量员工，列表接口本身可用 | ✅(辅助) |
| 4 | GET | /api/hrm/employees?search=e2e_hrm_b3&page=1&page_size=5 | - | code=200, data.items=[], total=0（确认 create 未落库） | ✅(辅助) |

## 读回验证
- create 未成功，无 id 返回；search=e2e_hrm_b3 返回 total=0，确认数据库无残留。

## 结论
**失败**（create 链路断裂，非数据冲突，重试无效）。
- 错误响应原文：`{"code":500,"success":false,"data":null,"message":"内部服务器错误"}`（HTTP 500）。
- 根因（源码+DB 实查定位）：`svc/hrm/src/services/employee_service.rs:232-256` 的 INSERT 列清单包含 `organization_id`，但 `hrm.employees` 表实际列只有 `org_id`/`company_id`，**不存在 `organization_id` 列**。在 psql 复现同一条 INSERT 首段即报：
  `ERROR: column "organization_id" of relation "employees" does not exist`。
  属代码与 DB schema 漂移，任何最小请求体都会确定性 500。

## 备注
- 测试数据：无落库（create 被 DB 拒绝、事务回滚）；探查性 INSERT 亦已回滚，无残留。
- 读路径（list/search）正常，信封 data.items + total + page + pageSize。
- 修复建议：INSERT 列清单移除 `organization_id`（改用已存在的 `org_id`），或补迁移加列。
