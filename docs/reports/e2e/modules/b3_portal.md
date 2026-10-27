# portal 模块测试报告（b3 批次）

- 执行：b3 批次（SubAgent 执行）｜登录账号 test_admin（超管）
- 执行时间：2026-10-27 00:49–00:50 (UTC+8)
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/portal/todos | {"title":"e2e_portal_b3_001","service":"hrm","due_date":"2026-11-01","priority":"high"}（未传 user_id，由 claims 注入，符合规范） | HTTP 500，envelope {code:500, success:false, data:null, message:"待办事项添加失败"} | ❌ |
| 2 | GET | /api/portal/todos | - | code=200, success=true，data 仅返回 2 条内置默认待办（default-1/default-2，内存兜底），无任何 DB 记录 | ✅(辅助) |

## 读回验证
- create 未成功，无 id 返回；list 仅内置默认项，确认 DB 未落库。

## 结论
**失败**（create 链路断裂，非数据冲突，重试无效）。
- 错误响应原文：`{"code":500,"success":false,"data":null,"message":"待办事项添加失败"}`（HTTP 500）。
- 根因（源码+DB 实查定位）：`svc/portal/src/modules/todos.rs:104-120` 的 `add_local_todo` INSERT 列清单为 `(user_id, title, service_code, service_name, due_date, priority, todo_type, tenant_id)`，但 `portal.portal_todos` 表当前**仅有 id / deleted_at / tenant_id 三列**（疑似空库自愈只建了壳表，业务列迁移未执行）。psql 复现即报：
  `ERROR: column "user_id" of relation "portal_todos" does not exist`。
  属代码与 DB schema 漂移（缺整张业务列），任何最小请求体都会确定性 500。

## 备注
- 测试数据：无落库（create 被 DB 拒绝、事务回滚）。
- list 接口正常，但返回的是 `default_todos()` 内存兜底数据，不代表 DB 可读写。
- 修复建议：对 portal.portal_todos 补迁移，增列 user_id/uuid、title/varchar、service_code/varchar、service_name/varchar、due_date/date、priority/varchar、todo_type/varchar、completed/bool、completed_at、link_url、updated_at 等。
