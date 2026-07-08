# 服务架构统一整合实施方案

> **版本**: v1.0  
> **日期**: 2026-07-08  
> **状态**: Phase 2 进行中（QMS 已完成）  
> **负责人**: Architecture Team  
> **关联任务**: V5.2 架构统一与债务清理

---

## 一、背景与目标

### 1.1 问题背景

在 V5.0 系统全面体检中发现，后端服务存在严重的架构不统一问题：

- **多套代码组织模式并存**：模块式（analytics/unified-core）、平铺式（crm/scm/hrm 等）、混合式（qms 有两套代码）
- **重复服务/重复模块**：BI + Report 曾拆分为两个服务，QMS 内部有两套实现，SCM + SRM 供应商功能重叠
- **路由前缀不统一**：同领域服务使用不同的 API 路径前缀
- **端口分配混乱**：部分服务共享端口或端口冲突（如 report 曾有 8061 冲突）
- **废弃代码未清理**：svc/shared、svc/report 等已迁移但目录保留

### 1.2 整合目标

以 `analytics-service` 的模块式架构（`modules/bi/` + `modules/report/`）为标杆，统一所有服务的代码组织模式，消除重复和混淆，提升可维护性。

| 指标 | 当前状态 | 目标 |
|------|---------|------|
| 服务代码组织模式 | 3 种模式混乱 | 统一为 modules/ 模式 |
| 死代码/废弃目录 | 5 处 | 0 处 |
| 端口冲突服务 | 2 对 | 0 对 |
| 路由前缀一致性 | ~60% | 100% |
| 插件注册方式 | 多种写法 | 统一 PluginInfo 结构 |

---

## 二、现状分析

### 2.1 服务代码组织模式分类

| 模式 | 代表服务 | 数量 | 结构特征 |
|------|---------|------|---------|
| **模块式（标杆）** | analytics、unified-core | 2 | `modules/{module_name}/` 自包含 handler+model+service+plugin |
| **平铺式** | crm、scm、hrm、erp、wms、mes、pdm、pm、rs、lims、ehs、ai、finance、doc、portal、mobile、integration、monitor、gis、srm | 19 | `api/` + `models/` + `services/` 顶层平铺 |
| **混合式（有问题）** | qms | 1 | 同时有 api/ 和 modules/qms/，后者是死代码 |

### 2.2 重复/冲突服务清单

| 序号 | 重复对象 | 涉及服务 | 严重程度 | 说明 |
|------|---------|---------|---------|------|
| 1 | QMS 两套代码 | svc/qms | 🔴 高 | modules/qms/ 是死代码，没人引用 |
| 2 | 供应商主数据 | svc/scm + svc/srm | 🟡 中 | SCM 有供应商准入，SRM 有供应商全生命周期，数据需同步 |
| 3 | 财务功能 | svc/erp + svc/finance | 🟡 中 | ERP 有业务财务（费用/预算/应收应付），Finance 有财务会计（总账/凭证），边界模糊 |
| 4 | svc/shared 废弃目录 | svc/shared | 🟢 低 | 已迁移到 lib/topems-shared，但目录未删 |
| 5 | svc/report 废弃目录 | svc/report | 🟢 低 | 已迁移到 svc/analytics，未从工作区移除（已修复） |

### 2.3 标杆服务：analytics-service

```
svc/analytics/
├── Cargo.toml                  # 单一二进制，无 [[bin]] 拆分
├── src/
│   ├── main.rs                 # 唯一入口，统一路由挂载
│   ├── shared/                 # 跨模块共享代码
│   └── modules/
│       ├── mod.rs              # 模块注册 + 路由合并
│       ├── bi/
│       │   ├── mod.rs          # 模块内部路由 + DB 初始化
│       │   ├── plugin.rs       # 插件信息注册
│       │   ├── dashboard.rs    # 业务 handler
│       │   ├── datasource.rs   # 业务 handler
│       │   └── ...             # 更多业务文件
│       └── report/
│           ├── mod.rs
│           ├── report_plugin.rs
│           ├── report.rs
│           ├── template.rs
│           ├── schedule.rs
│           ├── subscription.rs
│           └── scheduler.rs
```

**设计原则**：
- 每个业务模块自包含（handler/model/service/plugin）
- `modules/mod.rs` 统一导出 `create_routes()` 和 `init_database()`
- `main.rs` 只做服务启动和路由合并
- 单一二进制，不按模块拆分独立进程

---

## 三、分阶段实施方案

### Phase 1：死代码与废弃目录清理（1天，低风险）

**目标**：消除所有确定无用的死代码和废弃目录，减少认知负担

| 序号 | 任务 | 操作 | 验收标准 | 风险等级 |
|------|------|------|---------|---------|
| 1.1 | QMS modules/qms/ 死代码删除 | 删除 `svc/qms/src/modules/` 整个目录 | `cargo build -p topems-qms` 通过；grep 确认无引用 | 🟢 低 |
| 1.2 | svc/shared 废弃目录删除 | 删除 `svc/shared/` 整个目录（已在工作区外） | 工作区构建无影响；确认无其他服务引用 svc/shared | 🟢 低 |
| 1.3 | svc/report 标记为归档 | 保留代码但添加 ARCHIVED.md 说明已迁移 | 文档清晰，新人不会误使用 | 🟢 低 |

**验证方法**：
```bash
cargo build --workspace  # 全部编译通过
cargo test --workspace   # 全部测试通过
```

---

### Phase 2：服务代码组织模式统一（5-7天，中风险）

**目标**：将所有平铺式服务统一为 modules/ 模式，以 analytics 为标杆

**实施策略**：逐个服务迁移，每个服务独立 PR，保证可回滚

#### 2.1 迁移模板（每个服务通用）

迁移前（平铺式）：
```
svc/crm/
├── src/
│   ├── main.rs
│   ├── plugin.rs
│   ├── api/
│   │   ├── mod.rs
│   │   ├── customer.rs
│   │   ├── contact.rs
│   │   └── ...
│   ├── models/
│   │   ├── mod.rs
│   │   ├── customer.rs
│   │   └── ...
│   └── services/
│       ├── mod.rs
│       └── permission.rs
```

迁移后（模块式）：
```
svc/crm/
├── src/
│   ├── main.rs
│   ├── shared/                 # 新增：跨模块共享
│   │   └── mod.rs
│   └── modules/                # 新增：业务模块目录
│       ├── mod.rs              # 新增：统一 create_routes() + init_database()
│       ├── crm_plugin.rs       # 从 plugin.rs 迁入
│       ├── customer/           # 从 api/customer.rs + models/customer.rs 合并
│       │   ├── mod.rs
│       │   ├── handler.rs
│       │   └── model.rs
│       ├── contact/
│       ├── opportunity/
│       └── ...
```

#### 2.2 迁移优先级

| 优先级 | 服务 | 模块数量 | 预估工时 | 理由 |
|--------|------|---------|---------|------|
| P0 | qms | ~12 | 1天 | 已删除死代码，直接重构为模块式 |
| P1 | crm | ~15 | 1天 | 核心业务服务，模块清晰 |
| P1 | scm | ~15 | 1天 | 供应链核心，模块清晰 |
| P1 | hrm | ~15 | 1天 | 人力核心，模块清晰 |
| P2 | mes | ~15 | 1天 | 生产制造核心 |
| P2 | wms | ~15 | 1天 | 仓储核心 |
| P2 | pm | ~20 | 1.5天 | 项目管理，模块多 |
| P3 | 其余服务 | 各 3-10 | 2天 | erp、finance、lims、ehs、ai、srm、rs、pdm 等 |

#### 2.3 每个服务的迁移步骤

1. **创建 modules 目录骨架**：`modules/mod.rs` + `modules/{service}_plugin.rs`
2. **逐个模块迁移**：将 `api/x.rs` + 对应 `models/x.rs` 合并为 `modules/x/handler.rs` + `modules/x/model.rs`
3. **迁移 services**：通用服务（如 permission、audit、cache）放入 `shared/`
4. **更新 main.rs**：从 `.merge(api::create_routes())` 改为 `.merge(modules::create_routes())`
5. **验证编译**：`cargo check -p {service}` 通过
6. **验证测试**：`cargo test -p {service}` 通过
7. **删除旧目录**：`api/`、`models/`、`services/`（确认无引用后）

---

### Phase 3：业务域整合（可选，3-5天，高风险）

**目标**：合并职责重叠的服务，减少服务数量和数据同步成本

> ⚠️ 本阶段需业务确认后再实施，建议 Phase 1-2 完成后评估

#### 3.1 ERP 财务 + Finance 整合

**方案 A：合并为单一 finance 服务**
- 路由统一为 `/api/finance/*`
- ERP 的财务模块迁入 finance 服务的 `modules/erp_finance/`
- 端口统一为 80xx（待定）

**方案 B：明确边界，不合并**
- ERP 负责业务财务（应收/应付/费用/预算）
- Finance 负责财务会计（总账/凭证/报表/年结）
- 通过 service_client 调用，数据隔离

#### 3.2 SCM + SRM 供应商整合

**方案 A：SRM 为主，SCM 调用 SRM API**
- 供应商主数据统一由 SRM 管理
- SCM 通过 service_client 获取供应商信息
- SCM 保留供应商准入审批流程，数据写入 SRM

**方案 B：合并为单一供应链服务**
- SCM + SRM 合并为 `supply-chain-service`
- 模块式：`modules/supplier/`、`modules/purchase/`、`modules/inventory/` 等
- 端口统一

---

## 四、验收标准

### 4.1 Phase 1 验收

- [ ] `svc/qms/src/modules/` 目录已删除
- [ ] `svc/shared/` 目录已删除
- [ ] `cargo build --workspace` 零错误
- [ ] `cargo test --workspace` 全部通过
- [ ] grep 全项目确认无对已删除目录的引用

### 4.2 Phase 2 验收

- [ ] 所有服务均采用 `modules/` 模式组织代码
- [ ] 每个服务有且仅有一个 `main.rs` 入口
- [ ] 每个模块自包含（handler + model + service 同目录）
- [ ] `modules/mod.rs` 统一导出 `create_routes()` 和 `init_database()`
- [ ] `cargo build --workspace` 零错误
- [ ] `cargo test --workspace` 全部通过
- [ ] 前端 API 调用路径无变化（后端路由前缀保持兼容）
- [ ] 插件注册接口返回数据结构一致

### 4.3 Phase 3 验收（可选）

- [ ] 业务确认整合方案
- [ ] 合并后服务功能完整（与合并前等价）
- [ ] 数据迁移脚本就绪
- [ ] 前端路由/代理配置同步更新
- [ ] 插件注册信息更新

---

## 五、风险与回滚

### 5.1 风险清单

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| Phase 2 重构引入 bug | 功能异常 | 中 | 逐模块迁移，每步验证，保留 git 历史 |
| 前端 API 路径变化 | 前端调用失败 | 中 | 保持路由前缀不变，只调整内部代码结构 |
| 测试覆盖不足 | 回归问题 | 中 | 优先迁移有集成测试的服务 |
| 服务间依赖变化 | 编译失败 | 低 | 先更新 shared 库，再逐个服务迁移 |

### 5.2 回滚策略

- **Phase 1**：`git revert` 删除操作即可
- **Phase 2**：每个服务独立 commit，单服务回滚不影响其他
- **Phase 3**：涉及数据迁移，需准备回滚脚本

---

## 六、里程碑

| 里程碑 | 内容 | 预计完成 | 负责人 |
|--------|------|---------|--------|
| M1 | Phase 1 完成：死代码清理 | Day 1 | Architecture |
| M2 | Phase 2 完成：核心服务模式统一（crm/scm/hrm/mes/wms） | Day 5 | Architecture |
| M3 | Phase 2 完成：全部服务模式统一 | Day 8 | Architecture |
| M4 | Phase 3 评估：业务域整合方案确认 | Day 10 | Product + Architecture |
| M5 | Phase 3 完成（如确认实施） | Day 15 | Architecture |

---

## 七、关联文档

- [V5.0系统全面体检报告](./system-health-check-20260705.md)
- [后端技术债务报告](./backend-tech-debt.md)
- [端口分配规则](../port-allocation-rules.md)
- [服务引导指南](../guides/devops/service-bootstrap-guide.md)

---

## 八、变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2026-07-08 | 初始版本，基于 analytics 整合经验制定 | Architecture Team |
