# iam 模块测试报告（种子样例）

- 执行：seed（z1 批次，OrganizeAgent 亲自执行）｜登录账号 test_admin（超管）

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/core/iam/auth/login | {"username":"test_admin","password":"admin123"} | success=true, data.access_token(JWT), expires_in=86400 | ✅ |
| 2 | POST | /api/core/iam/users | {"username":"e2e_iam_z1_user1","email":"e2e_iam_z1_user1@topems.local","password":"secret123","full_name":"E2E Seed User 1"} | code=201, success=true, data.id=6978d5f6-ea38-4c5e-9b1c-15a7230b8a78 | ✅ |
| 3 | GET | /api/core/iam/users?search=e2e_iam_z1&page=1&page_size=10 | - | code=200, data.total=4，目标用户出现在列表 | ✅ |
| 4 | GET | /api/core/iam/users/{id} | id=6978d5f6... | code=200, success=true，username/email/full_name 与创建一致 | ✅ |

## 读回验证
创建响应返回 id=6978d5f6-ea38-4c5e-9b1c-15a7230b8a78 → list search 与 get-by-id 均取回，username=e2e_iam_z1_user1、email、full_name 字段与创建请求完全一致，落库成功。

## 结论
**通过**。登录（公共路由）→ 创建用户 → 列表/详情读回全链路 OK。创建接口返回 code=201（HTTP 语义），读回 code=200；envelope 为 {code,success,data,message}。

## 备注
- 测试数据保留：user e2e_iam_z1_user1（id=6978d5f6-ea38-4c5e-9b1c-15a7230b8a78）。
- iam 删除为软删除（deleted_at IS NULL）。
