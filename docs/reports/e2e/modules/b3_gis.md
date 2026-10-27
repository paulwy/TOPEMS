# gis 模块测试报告（b3 批次）

- 执行：b3 批次（SubAgent 执行）｜登录账号 test_admin（超管）
- 执行时间：2026-10-27 00:48 (UTC+8)
- 被测入口：http://localhost:8099

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/gis/business-locations | {"business_name":"e2e_gis_b3_001","business_code":"e2e_gis_b3_001","business_type":"workshop","position":{"type":"Point","coordinates":[114.5,38.0]}} | HTTP 200，code=200, success=true, data.id=a0632a81-6785-4c0f-a4ff-694bb3189b35, status=active, message="创建业务位置成功" | ✅ |
| 2 | GET | /api/gis/business-locations/a0632a81-6785-4c0f-a4ff-694bb3189b35 | id 读回 | code=200, success=true，business_name/code/type/position 与创建一致 | ✅ |
| 3 | GET | /api/gis/business-locations?page=1&page_size=10 | - | code=200, data.business_locations[0].id=a0632a81…, total=1，目标记录在列表 | ✅ |

## 读回验证
创建返回 id=a0632a81-6785-4c0f-a4ff-694bb3189b35 → get-by-id 与 list 均取回，关键字段比对：
- business_name = `e2e_gis_b3_001` ✅
- business_code = `e2e_gis_b3_001` ✅
- business_type = `workshop` ✅
- position = `{"type":"Point","coordinates":[114.5,38.0]}`（GeoJSON 原样落库）✅
- status = `active`，tenant_id=00000000-…-0001 ✅
落库成功。

## 结论
**通过**。create → get-by-id → list 全链路 OK，position GeoJSON 正确持久化。列表信封为 data.business_locations + total（非通用 items）。

## 备注
- 测试数据保留：business-location e2e_gis_b3_001（id=a0632a81-6785-4c0f-a4ff-694bb3189b35），未删除。
- create 响应 HTTP 状态码即 200（非 201）。
