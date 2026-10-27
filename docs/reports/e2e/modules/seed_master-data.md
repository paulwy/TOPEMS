# master-data 模块测试报告（种子样例）

- 执行：seed（z1 批次，OrganizeAgent 亲自执行）｜登录账号 test_admin（超管）

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/master-data/master-data/materials | {"material_code":"RM-E2E-Z1-001","material_name":"E2E种子钢板","unit":"kg"} | code=200, success=true, data.id=1248f237-4c4f-4bc8-92bd-bc45bf1b013e | ✅ |
| 2 | GET | /api/master-data/master-data/materials?search=E2E-Z1&page=1&page_size=10 | - | code=200, data.total=1，目标物料在列表 | ✅ |
| 3 | GET | /api/master-data/master-data/materials/{id} | id=1248f237... | code=200, success=true，material_code/name/unit/status=active 与创建一致 | ✅ |

## 读回验证
创建返回 id=1248f237-4c4f-4bc8-92bd-bc45bf1b013e → list search 与 get-by-id 取回，material_code=RM-E2E-Z1-001、material_name=E2E种子钢板、unit=kg、status=active 完全匹配，落库成功。

## 结论
**通过**。注意：本模块为**双重前缀** `/api/master-data/master-data/materials`（real_module nest /api/master-data + 内部再 nest /master-data），实测路径有效。列表 envelope 用 data.items + data.total（非 users 数组字段名，各模块列表结构不同，以实测为准）。

## 备注
- 测试数据保留：material RM-E2E-Z1-001（id=1248f237-4c4f-4bc8-92bd-bc45bf1b013e）。
- 列表分页参数 page/page_size 有效；search 支持模糊匹配。
