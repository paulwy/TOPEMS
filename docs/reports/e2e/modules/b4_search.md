# search 模块测试报告（b4 批次）

- 执行：b4 批次（rd/search/mobile 联合执行）｜登录账号 test_admin（超管）｜执行时间 2026-10-27 00:47 (UTC+8)

## 用例清单
| # | method | path | body/参数(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | GET | /api/search/?q=e2e_rd_b4_001&page=1&page_size=10 | 文档参数 q | 422 反序列化失败：`missing field keyword` | ❌ 参数修正 |
| 2 | GET | /api/search?keyword=e2e_rd_b4_001&page=1&page_size=10 | b4 新建 rd 项目唯一标识 | code=200, success=true, data.items=[], data.total=0, search_type="exact" | ✅ 接口可用（命中 0） |
| 3 | GET | /api/search?keyword=e2e&page=1&page_size=10 | 宽搜前缀 | code=200, data.items=[], data.total=0 | ✅ 接口可用（命中 0） |
| 4 | GET | /api/search/suggestions?q=e2e | - | code=200, success=true, data.suggestions=[] | ✅ |
| 5 | GET | /api/search/recent | - | code=200, data=["e2e","e2e_rd_b4_001"]（用例 2/3 搜索后 fire-and-forget 落库） | ✅ |
| 6 | DELETE | /api/search/recent | - | code=200, success=true, data="cleared" | ✅ |
| 7 | GET | /api/search/recent（DELETE 后复查） | - | code=200, data=[] 已清空 | ✅ |

## 索引链路验证（针对"新建 rd 项目是否可被检索"）
- 测试前置：rd 模块已创建 e2e_rd_b4_001（id=5867fe77-8da4-4117-86d2-74a1149d040e，同批次报告）。
- 检索结果：keyword=e2e_rd_b4_001 → total=0；keyword=e2e → total=0。
- 源码确认（svc/search/src/handlers.rs）：`search_all()` 仅聚合 4 类实体——user（core_users 直查）、customer / sales_order / purchase_order（读 `public.search_entity_projections` 投影表，注释注明"erp 事件维护"）、document（core_files 直查）。**rd 项目（及本批次任何 rd 写路径）不在 search 索引覆盖范围内**，也没有 rd → search 的事件投影接线。
- 结论：**这是预期机制限制，不是缺陷**。search 是只读投影服务，索引范围由代码硬编码为 user/customer/order/document 四类；rd 域当前未接入投影管线。宽搜 e2e 命中 0 同时也说明 customer/order 投影表中暂无任何 e2e 前缀数据（其他批次未造投影数据）。

## 结论
**通过**。检索入口（keyword 参数）、suggestions、recent 读/写/清空全链路可用；recent 搜索记录落库与清空均实测生效。"新建 rd 数据不可被检索"判定为索引覆盖范围的预期机制限制（非缺陷）。

## 备注
- 与 api_reference.md 偏差：检索参数实为 **`keyword`**（必填），文档写的 `q` 是 suggestions 的参数（SuggestionsQuery.q）；主检索路径为 `/api/search`（非 `/api/search/`，尾斜杠路径亦被 axum 接受）。响应结构 data.items + total + search_type + facets + suggestions。
- DELETE /recent 仅清空当前用户（JWT claims.sub）的 recent 记录，已实测清空成功，未触碰他人数据。
