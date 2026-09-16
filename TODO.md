# TOPEMS UI v3 迁移与优化 - 项目状态

## ✅ 已完成（P0 + P1）

### UI v3 两级菜单系统
- [x] 17 个一级模块
- [x] 79 个二级菜单
- [x] 菜单路径与实际路由匹配
- [x] 自动面包屑生成
- [x] 点击一级菜单只展开/折叠，不自动跳转

### Header 功能
- [x] Notifications 通知按钮
- [x] Settings 设置按钮
- [x] Profile 用户下拉菜单（个人中心、账号设置、退出登录）
- [x] DevTools 快捷键切换（Ctrl + Shift + D）

### 后端 API 实现
- [x] 独立服务：MES (8030)、SCM (8040)、WMS (8041)
- [x] unified-core 兼容层：简化版 API（用于开发调试）

### 脚本与配置
- [x] topems.sh 更新（MES/SCM/WMS 标记为已合并）
- [x] services.conf 更新
- [x] vite.config.ts 代理配置更新

---

## 📊 当前菜单统计（最终版）

**一级模块：17 个**
| 模块 | 二级菜单数 |
|------|-----------|
| 制造执行（MES） | 7 |
| 企业资源（ERP） | 7 |
| 供应链（SCM） | 8 |
| 客户管理（CRM） | 5 |
| 质量管理（QMS） | 5 |
| 仓储物流（WMS） | 5 |
| 数据决策（BI） | 7 |
| 地理信息（GIS） | 4 |
| 文档协同（DOC） | 4 |
| 消息中心（IM） | 2 |
| 人力资源（HRM） | 6 |
| 财务（Finance） | 7 |
| 系统管理（Admin） | 6 |
| 项目管理（PM） | 6 |
| 资产管理（Asset） | 5 |
| 产品数据（PDM） | 6 |

**二级菜单总数：83 个**

---

## 🚧 待改进（P2 - 长期）

### 专业模块（低优先级）
- [ ] 研发管理（RD）
- [ ] 环境健康安全（EHS）
- [ ] 实验室信息（LIMS）
- [ ] 高级排程（APS）
- [ ] 办公自动化（OA）

### 技术优化
- [x] crm contracts 后端实现（2026-09-16：CrmContractRedesignPage known_gap 转 matched，GET/POST/PUT /contracts + 迁移 + RLS）
- [x] GIS 服务认证问题修复（auth layer 顺序修正 + business-locations CRUD 闭环）
- [x] server 统一认证专项（2026-09-16：21 个 real_module 移除 inject_dev_claims 无条件伪造 superadmin 后门，接入真实 JWT auth_middleware；health 端点豁免；commit 09273803f）
- [x] 全模块 500 冒烟修复（2026-09-16：认证统一后逐模块真实 API 冒烟——rd tenant_id/experiments/formulas 缺列、gis 45 处 SQL 缺 SELECT、qms jsonb bind 类型、crm/contacts approval_status+deleted_at 缺列、finance accounts/tree、mes/equipment、wms/outbound-orders 补列；18 个真实服务全部 200，commit 192681e6f）
- [x] communication/ai 服务接入 server（2026-09-16：communication 已接，routes 补 nest(api_prefix) 修复 404，commit 8ce227f15；core 组 search/monitor/plugin-registry/integration/mobile 批量接入，commit e9126d983，已注册模块 24→29）
- [x] ai 服务接入 server（2026-09-16：AiRealModule 复用独立部署 AppState 组装链，create_routes 加 include_api_info 参数避免 /api、/api-docs 冲突；冒烟 /api/ai/analysis/history、/api/ai/connectors、/api/ai/agent/tools 200；模块 30→31 全量闭环，commit 0b807c9d6 + 01776b3d8）
- [x] unified-core 接入 server（2026-09-16：build_router 挂根路径冲突风险高，nest /api/core 隔离；/api/core/health、/api/core/api、/api/core/metrics 200，模块 29→30，commit e9da724ed）
- [x] unified-core 嵌入模式重构 + 端到端登录链路打通（2026-09-16：create_routes 增加 embed_mode 参数，嵌入时 core 业务路由挂根、跳过 public 冲突路由与 wms/mes/scm，修复 /api/core 双重前缀致登录 404；unified_core_real_module 改用 build_router_embedded；前端 VITE_CORE_PORT=8099 支持模块化单体代理；实测 POST /api/core/iam/auth/login 200 登录成功、users/me 200、permissions/metadata 200，前端 :3000 → vite proxy → 8099 全链路打通；commits 5653676fa/ec13cc90c/b2039af74）
- [ ] MUI elevation 警告修复
- [ ] 更多模块的业务 API 实现
- [ ] dashboard 等演示模块认证一致性（当前无 token 可访问演示数据，低风险；后续可挂只读认证或隐藏）

---

## 📝 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| WebSocket 连接中断 | ⚠️ 已知 | 重连时偶发，自动恢复 |
| MUI elevation 警告 | ⚠️ 警告 | 不影响功能 |
| GIS 认证 | ✅ 已修复 (fbcc1c6e9) | auth layer 顺序修正 + business-locations CRUD 闭环 |
| finance 真实模块降级（must be owner） | ✅ 已修复 | 全库业务 schema/表 owner 统一为 topems_app；MIGRATE_URL 迁移池用户统一（topems→topems_app），portal schema 防御 permission denied 同步消除 |
