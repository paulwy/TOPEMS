# pm 模块测试报告（b3 批次）

- 执行：b3 批次（SubAgent 执行）｜登录账号 test_admin（超管）
- 执行时间：2026-10-27 00:48–00:50 (UTC+8)
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/pm/projects | {"name":"e2e_pm_b3_001","code":"e2e_pm_b3_001","project_type":"capital"} | HTTP 500，envelope {code:500, success:false, data:null, message:"创建项目失败"} | ❌ |
| 2 | GET | /api/pm/projects?page=1&page_size=5 | - | code=200, success=true, data.projects 有存量项目（如 B1-FULL），列表接口本身可用 | ✅(辅助) |

## 读回验证
- create 未成功，无 id 返回；探测 INSERT 事务回滚，DB 无 e2e_pm_b3 残留（list 中无该 code）。

## 结论
**失败**（create 链路断裂，非数据冲突，重试无效）。
- 错误响应原文：`{"code":500,"success":false,"data":null,"message":"创建项目失败"}`（HTTP 500）。
- 根因（源码+DB 实查定位）：`svc/pm/src/modules/project.rs:266-272` 的 INSERT 把 tags 写成 `to_jsonb($16::text[])`（即向 tags 列插入 **jsonb**），但 `pm.projects.tags` 列实际类型为 **text[]**。psql 复现同一条 INSERT 即报：
  `ERROR: column "tags" is of type text[] but expression is of type jsonb / HINT: You will need to rewrite or cast the expression`。
  属代码与 DB schema 漂移（代码按 tags=jsonb 设计，库表为 text[]），任何最小请求体都会确定性 500。

## 备注
- 测试数据：无落库（create 被 DB 拒绝、事务回滚）。
- 读路径（list）正常，信封 data.projects + total。
- 修复建议二选一：迁移把 pm.projects.tags 改为 jsonb；或 INSERT 去掉 to_jsonb、直接绑 text[]（并对齐 Project 结构 tags 反序列化类型）。
