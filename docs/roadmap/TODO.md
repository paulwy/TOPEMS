# TOPEMS 项目任务规划与路线图

> **版本**: V264+ | **更新日期**: 2026-08-21
>
> **V259-V264+ Backlog 全量收闭**。5 大主题 16 条全部完成，无活跃缺口。

---

## 📊 当前状态

**所有 Backlog 已清空**。V259-V264+ 版本节点全部闭环。

### 质量门禁基线

| 门禁 | 指标 | 状态 |
|------|------|------|
| axum-layer-gate | R1/R2/R3 = 0/0/0 | ✅ |
| perm-gate | R1/R3/R5 = 0/0/0 | ✅ |
| cargo check | 0 errors · CRM 0 warnings | ✅ |
| tsc apps/web | 0 errors | ✅ |
| tsc shared packages | 6/6 passed | ✅ |
| props-alignment | 100% realness (359 routes) | ✅ |

### 代码净减

V254(-531) + V257(-19074 BFF) + V258(-2814 dead exports) + V264+(-96 dead exports) ≈ **净减 22,500+ 行**

---

## 📚 归档索引

> 已完成版本的详细验收矩阵、变更统计、EDGE CASE 记录均已按时间轴拆分至以下归档文档。

| 归档文件 | 版本范围 | 核心产物覆盖 |
|---------|---------|-------------|
| 📘 [V67-V99-foundation.md](archive/V67-V99-foundation.md) | V67.2 ~ V99 | 数据层 P0 修复 / 导航统一 / Schema 防御 / OpenAPI 契约 |
| 📗 [V178-V210-modules.md](archive/V178-V210-modules.md) | V178 ~ V210 | MES/QMS/WMS/TMS/APS 6 大模块 / 导航三联校验 / utoipa 注解 |
| 📙 [V211-V230-quality.md](archive/V211-V230-quality.md) | V210.5 ~ V230 | 覆盖率冲刺 / Design Token 2845→169 / i18n 清零 R5→R13 |
| 📕 [V231-V258-closure.md](archive/V231-V258-closure.md) | V231 ~ V258 | 架构冗余收修 / R5 security 清零 / Tauri Stronghold+IPC / 前端泛型 / 死代码 2814 条 |
| 📒 [V259-V264-backlog-closure.md](archive/V259-V264-backlog-closure.md) | V259 ~ V264+ | V252 CRUD 审计 Phase 1-6 / V232 Strict-Zero P0-P4 / Backlog 5 主题 16 条全完成 / L1-VALUE 96 dead exports / Tauri 生态 5/5 / CI 双开关 blocking |

**快速跳转**：
- 最早的设计决策 → V67-V99
- MES/QMS/WMS/TMS/APS 业务逻辑 → V178-V210
- i18n / Design Token 经验 → V211-V230
- Tauri keystore / 前端泛型 / CI Gate → V231-V258
- V252 CRUD 审计 / V232 Strict-Zero / Backlog 全量收闭 → V259-V264+
