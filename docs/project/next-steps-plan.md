# TOPEMS 下一步工作规划

> 依据 `TODO.md` 待办 + 本轮已完成工作（Expo SDK 57 迁移 / EAS 配置 / dependabot 修复 / B 级孤儿下线）重新排定。
> 日期：2026-10-13

## 0. 状态基线（2026-10-13 核实）

- 本地 `origin/main..HEAD = 0`，**全部提交已 push**。TODO.md 中此前标注"未 push"的提交（B1 事件投影、D6 outbox、生产收口、ehs 契约补齐等）**已被并行线推送到 origin/main**，标注过时。
- 工作区剩余未提交改动 = 并行线进行中工作（`svc/*.rs` 10 个服务、`scripts/run_monolith.sh`、`.sqlx` 缓存、`sheets/`、`apps/web/.storybook` 删除），**非本线待办，保持不触碰**。

---

## 一、P0 · 生产环境收口（阻塞于环境，最高优先）

> 均需真实生产 Linux/Windows 环境，本线（macOS）无法完成，需部署负责人执行。

| # | 待办 | 前置 | 验证口径 |
|---|---|---|---|
| 1 | 生产机实跑 `install/update/rollback.sh` | systemd 环境 | 容器内已验 EXIT=0，生产机最终确认 |
| 2 | 生产机 `smoke-prod.sh` 全项 PASS | 环境 | 层1 自动 + 层2 专项（财务借贷/工单事件化/质量链/插件/BI/WS 看板） |
| 3 | 生产服务 `/health` 全绿 | 环境 | `health-check.sh` 就绪 |
| 4 | nginx 生产验证 | 生产 Linux | `nginx -t` + 6 域冒烟（macOS epoll 限制） |
| 5 | 验证库 5433 pgvector 对齐 0.8.7 | 环境 | `ALTER EXTENSION vector UPDATE` |
| 6 | Windows 部署实跑 | WSL2 环境待建 | `docs/deploy/windows-deployment.md` |

**建议**：P0 是上线的硬门槛，但被环境阻塞。若生产环境本周内可到位，应**优先投入**；否则与 P1 并行推进（P1 不依赖环境）。

---

## 二、P1 · 移动端原生验证（本轮新增，可立即启动）

> 源于 Expo SDK 50→57 迁移（已 push `2bfaa4eb4`）。迁移后**原生端未实跑**，是当前唯一真实风险点。

| 步骤 | 动作 | 说明 |
|---|---|---|
| 1 | `eas login` | 需开发者本人 Expo 账号 |
| 2 | `eas init` | 关联项目，生成 projectId |
| 3 | `eas build --platform android --profile preview` | 内部 APK，成本 $0（Free 档） |
| 4 | 真机按清单验证 | 见 `docs/deploy/mobile-eas-build-runbook.md` §4：扫码/通知/React 19/离线 |

**建议**：这是"迁移已推送但未验证"的闭环缺口，优先级最高、不依赖生产环境、零成本，**建议本周内完成**。

---

## 三、P2 · 技术债专项（已登记，可独立批次）

### 3a. 事务一致性（D6）— ✅ 已完成全服务推广
> 核实结论（2026-10-13）：**D6 范围已定为"全服务推广"并全部落地**，非"待拍板"。
- **实现**：`lib/shared-event/src/event/commit_retry.rs`（198 行共享模块，`58de84a89`）：`push_retry_typed` / `push_retry_searchable` / `run_relay`（15s 任务），Redis ZSET 键 `topems:event_retry:{service_name}`，指数退避 30s×attempts、最大 8 次。
- **范围**：**8 个发布服务全部完成"commit 后 emit + ZSET 重试"**——erp（customer/sales_order/purchase_order，relay 内嵌模块）+ finance/wms/hrm/scm/crm/mes/pm（main.rs 各注册 run_relay）。已 push origin/main（commit 链 cde039d56/58de84a89/fb9f186f8/3efef271c/b9d632b61/82139bb75/340a2d09c/0dbff2671/e22550402，`1144` 行确认"D6 全链已 push"）。
- **决策已落定**：重试载体 = Redis ZSET（**未落 0013 迁移**）；后台任务 = 服务内嵌（非独立进程）；完整 outbox（A）/ CDC（C）仅登记演进路线未实施。
- **残留（本次范围外，已评估 2026-10-13）**：
  - **hrm MDM 主数据事件**：评估结论 = **维持现状，无需纳入 ZSET**。MDM 走独立 `master_data` 总线，与主 EventType 总线平行的可靠性栈——消费侧 `process_mdm_message`（`stream_subscriber.rs:367`）与标准事件**共用消费组重试**（成功 ACK / 失败不 ACK 重投 / 超限推 `topems:mdm_dlq:{prefix}` 再 ACK），且 MDM 另走 **RabbitMQ 双发**（`publish_to_rabbitmq`）兜底发布失败。D6 决策文档第 2.1 节明确将 MDM 排除在 D6 范围，系**正确设计非遗漏**；套 ZSET 属过度工程。
  - **wms `inventory.rs:108` 死代码**：✅ **已删除**（`publish_inventory_updated` 无任何调用点，连同 unused import 一并清理）。

### 3b. 前端/权限基线债（独立批次）
| 项 | 说明 |
|---|---|
| R3=9 | 9 个 admin-only handler 缺 gate 标注（communication/ehs/master-data/portal），致 frontend-test shard4 + coverage 红 |
| R5=7 | ai/wms 权限矩阵缺口 |
| menu-health | P1=52 / R3=271（v2 路由重构债） |
| axum-layer | aps/feedback 组 |

### 3c. 观测缺口（独立批次）
- 观测缺口 G1/G2/G3（边指标 status 维度 / 出站延迟直方图 / shared-core 死指标）——代码在 lib/svc 边界外，仅登记建议

---

## 四、P3 · 环境性 / 待外部条件

| 项 | 阻塞 | 触发条件 |
|---|---|---|
| CI 实跑（38 jobs + Docker/E2E/Secret Scan/Deploy K8s） | GitHub 账户 Billing | 恢复后重跑，预期除基线债外全绿 |
| B15 真实业务流量窗口重采 | 27 服务全启 + 代表性流量 | 生产环境就绪后 |
| rust-audit（rsa RUSTSEC-2023-0071） | 无上游修复 | 等上游或评估替换 jsonwebtoken |

---

## 五、建议执行顺序（本周）

```
本周优先：
  P1 移动端原生验证（零成本、无环境依赖、闭环迁移风险）→ 最优先
  3a D6 事务一致性范围确认（决策阻塞，需你拍板）
并行：
  P0 生产环境收口（等环境到位）
  P2 技术债独立批次（可指派，不依赖环境）
```

**关键决策待办（需你拍板）**：
1. P2 3b 前端/权限债（R3=9 / R5=7 / menu-health）是否本周派批
2. hrm MDM 主数据事件是否纳入 ZSET 重试（需另设计 master_data 通道，D6 范围外残留）

---

> 返回 [根 TODO.md（最新执行日志）](../../TODO.md) · [docs/deploy/mobile-eas-build-runbook.md](../deploy/mobile-eas-build-runbook.md)
