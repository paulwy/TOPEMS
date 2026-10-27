# rd 模块测试报告（b4 批次）

- 执行：b4 批次（rd/search/mobile 联合执行）｜登录账号 test_admin（超管）｜执行时间 2026-10-27 00:47 (UTC+8)

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | POST | /api/rd/projects | {"name":"E2E B4 RD Project 001","code":"e2e_rd_b4_001","project_type":"experiment",...} | 422 反序列化失败：`unknown variant experiment, expected one of R_D, PRODUCTION, DESIGN, CONSTRUCTION, SERVICE` | ❌ 参数修正 |
| 2 | POST | /api/rd/projects | project_type 改为 "RD" | 422 反序列化失败：`unknown variant RD, expected one of R_D, PRODUCTION, ...` | ❌ 参数修正 |
| 3 | POST | /api/rd/projects | {"name":"E2E B4 RD Project 001","code":"e2e_rd_b4_001","project_type":"R_D","leader":"e2e_tester","start_date":"2026-11-01T00:00:00Z","description":"e2e b4 batch test rd project"} | code=200, success=true, data.id=5867fe77-8da4-4117-86d2-74a1149d040e, project_type 回显="R&D", status="draft" | ✅ |
| 4 | GET | /api/rd/projects/5867fe77-8da4-4117-86d2-74a1149d040e | - | code=200, success=true，全字段与创建一致 | ✅ |
| 5 | GET | /api/rd/projects?page=1&page_size=10&search=e2e_rd_b4_001 | - | code=200, data.total=1，data.projects[0] 即目标项目 | ✅ |

## 读回验证
创建返回 id=5867fe77-8da4-4117-86d2-74a1149d040e → get-by-id 与 list(search=e2e_rd_b4_001) 均取回：
- name=E2E B4 RD Project 001、code=e2e_rd_b4_001、leader=e2e_tester、start_date=2026-11-01T00:00:00Z、description 与创建请求完全一致；
- 服务端自动填充：status=draft、risk_level=MEDIUM、priority=3、progress=0、created_by=e2e_tester。落库成功。

## 结论
**通过**。create → get-by-id → list 读回全链路 OK。

## 备注（与 api_reference.md 的偏差，已查源码确认）
- api_reference.md 示例 `project_type:"experiment"` 与源码不符。`svc/rd/src/models/project.rs:7-16`：枚举 `#[serde(rename_all="SCREAMING_SNAKE_CASE")]`，变体为 `RD/Production/Design/Construction/Service`；实测 JSON 合法取值为 **`R_D`**（`R_D` 经 rename 后原样接受）、`PRODUCTION`、`DESIGN`、`CONSTRUCTION`、`SERVICE`。序列化回显为展示串 `R&D`。
- 列表结构为 `data.projects` + `data.total/page/page_size`。
- 测试数据保留：project e2e_rd_b4_001（id=5867fe77-8da4-4117-86d2-74a1149d040e），未删除。
