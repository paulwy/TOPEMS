# mobile 模块测试报告（b4 批次）

- 执行：b4 批次（rd/search/mobile 联合执行）｜登录账号 test_admin（超管）｜执行时间 2026-10-27 00:48 (UTC+8)

## 用例清单
| # | method | path | body(摘要) | 响应(状态码+关键字段) | 结论 |
|---|---|---|---|---|---|
| 1 | GET | /api/mobile/approvals?page=1&page_size=10 | - | code=200, success=true, data.items=[], data.total=0, message=获取审批任务列表成功 | ✅ |
| 2 | GET | /api/mobile/approvals/pending | - | code=200, success=true, data=[], message=获取待审批任务成功 | ✅ |
| 3 | GET | /api/mobile/approvals/history | - | code=200, success=true, data.items=[], data.total=0, message=获取审批历史成功 | ✅ |
| 4 | GET | /api/mobile/offline/status | - | code=200, success=true, data={last_sync_time:null, pending_records:0, sync_status:"synced", network_status:"online"} | ✅ |
| 5 | POST | /api/mobile/offline/sync | 按文档 `{"operations":[...],"last_sync_time":null}` | 422 反序列化失败：`missing field sync_type` | ❌ 参数修正 |
| 6 | POST | /api/mobile/offline/sync | {"sync_type":"incremental","data":{"operations":[{"operation_type":"create","entity_type":"inventory","entity_id":"b9b9bb75-5abc-46aa-926b-35867d3dcd5b","operation_data":{"qty":10,"note":"e2e b4 offline op"}}]},"last_sync_time":null,"records_count":1} | code=200, success=true, data.sync_id=cf51cd15-3d3c-4c63-9b2b-5a04636e58af, status="completed", synced_count=1, failed_count=0, next_sync_time=+5min | ✅ |
| 7 | GET | /api/mobile/offline/status（同步后复查） | - | code=200, last_sync_time 已回写为 2026-10-26T16:48:30.887927Z（用例 6 同步时刻），pending_records=0 | ✅ 写后读回 |

## 读回验证
- 用例 6 同步成功后，用例 7 的 offline/status 显示 `last_sync_time=2026-10-26T16:48:30.887927Z`，与同步响应 server_time 完全一致 → 同步写记录已落库并被状态接口读回，写链路闭环。
- entity_id=b9b9bb75-5abc-46aa-926b-35867d3dcd5b（e2e 前缀语义，UUID 随机生成防冲突）。

## 结论
**通过**。审批列表/pending/history、离线状态读、离线同步写（含写后状态回读）全链路 OK。

## 备注（与 api_reference.md 的偏差，已查源码确认）
- 实际挂载的同步请求结构为 `OfflineSyncRequest`（svc/mobile/src/modules/offline.rs:16-22），必填：`sync_type:String`、`data:serde_json::Value`、`records_count:i32`，`last_sync_time` 可选。**api_reference.md 记载的 `{operations:[CreateOfflineOperation]}` 是同仓另一结构 SyncRequest（offline_sync.rs:21），未挂到本路由**。批量操作数据应包在 `data.operations` 内。
- 同步记录落库表 `mobile.offline_sync_records`（schema_defense.rs 自愈列定义：sync_type/sync_data/status/synced_count/failed_count）。
- 测试数据保留：sync 批次 cf51cd15-3d3c-4c63-9b2b-5a04636e58af（status=completed），未删除。
