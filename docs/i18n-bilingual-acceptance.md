# TOPEMS 中英双语端到端验收报告

> 验收日期：2026-09-22
> 验收范围：**前端界面 i18n** + **后端业务数据多语言**
> 结论：**双语链路端到端闭环，英文界面真实可用**（业务数据英文值由业务侧逐步补充，界面文案 100% 英文）
> 配套文档：接入方法见 [backend-i18n-guide.md](backend-i18n-guide.md)（本报告只讲验收结果）

---

## 1. 验收目标与方法

| 维度 | 目标 | 方法 |
|------|------|------|
| 前端界面 i18n | 切换 en 后页面无中文残留、无 rawkey | 语言包静态扫描（键对齐 + CJK 残留）+ 浏览器 en 模式实测 |
| 后端数据多语言 | `X-Lang: en` 请求返回英文业务值 | API 端点 en/zh 对比抽验 + 真库数据核对 |
| 端到端 | 前端 en 界面 + 后端 en 数据真实联动 | 页面实测 + 写入/读取差异化验证 |

---

## 2. 前端 i18n 验收

### 2.1 语言包结构

```
apps/web/src/i18n/locales/
├── zh/    # ~70 个命名空间 JSON（admin/ai/common/components/crm/ehs/erp/...）
└── en/    # 同名同构
```

### 2.2 静态扫描结果

| 检查项 | 结果 |
|--------|------|
| zh/en 键双向对齐（en 缺键） | **0** |
| en 多出键（zh 缺） | **0** |
| en 值含中文（CJK 残留） | **0** |
| 历史遗留键差集（`ai.codeCompletion` / `shared.aiUiGenerator` / `finance.fixed_asset` 等） | 已确认清零（此前轮次修复） |

### 2.3 页面实测（en 模式）

| 页面 | 验证内容 | 结果 |
|------|----------|------|
| `/dashboard` | 导航（Home/Manufacturing/ERP/SCM/CRM/QMS/WMS/BI/GIS/...）、首页文案、时间筛选 | ✅ 全英文 |
| `/mes/equipment` | 页面标题、子页签、筛选器、表格列头（Equipment Code/Name/Type/Model/Location/Status）、空态、分页（`1-10 Total 10 Item`） | ✅ 全英文，无 rawkey |

---

## 3. 后端数据多语言验收

### 3.1 架构（摘要）

- **字段级 `*_en` 列 + SQL `CASE WHEN` 切换**：`CASE WHEN ${locale}='en' THEN COALESCE(col_en, col) ELSE col END`
- **语言解析**：`Locale::from_headers(&headers)`（`lib/shared-core/src/locale.rs`），`X-Lang` 优先 → `Accept-Language` → 缺失回退 `zh`
- **迁移链**：迁移 `000098–000107` 新增 **42 个 `*_en` 列**，5432/5433 双库均已应用（记录 246 = 246，无失败）

### 3.2 模块覆盖（P1.3 全量核查）

| 阶段 | 内容 | 结果 |
|------|------|------|
| 首轮扫描 | `sqlx::query("...")` 字符串 SQL，筛出 43 候选 | 人工分类确认 **13 组真遗漏** |
| 补齐 | plugin-registry / ticket / rd / scm / tms / wms / qms / lims / crm / mes 相关 handler | 全部补 `CASE WHEN` |
| 补扫 | 多行 `r#"..."#` 宏查询盲区 | 再抓 **4 处** 全部补齐（equipment 维护、OEE、物料需求、生产看板） |
| 核查通过 | ehs 4 列（P0.2）、dashboard/integration/data_sync 统计类 | 无需双语，通过 |

### 3.3 端到端差异化验证（真实写入）

以 mes 设备为例（其余模块代码抽查一致）：

```bash
# PUT 写入英文名
PUT /api/mes/equipment/{id}  {"equipment_name_en":"Bilingual Verification Equipment"}
# GET 差异化
X-Lang: en  →  name = "Bilingual Verification Equipment"
X-Lang: zh  →  name = "双语验证测试设备"
```

- 运行库中 **6 个表**存在非空 `*_en` 数据（crm.customers / erp.announcements / hrm.departments / mes.equipment / mes.process_flows / pm.projects），逐一核对代码均接 `CASE WHEN`
- 验证用测试数据（含 `*_en`）验收后已**软删/清理还原**（`deleted_at` 置位，符合清理约定）；列表正确隐藏，回退中文属预期行为

---

## 4. 验收中发现并修复的问题

| # | 问题 | 根因 | 修复 | 提交 |
|---|------|------|------|------|
| 1 | `PUT /api/mes/equipment/{id}` 恒 500 | UPDATE SQL 引用不存在的 `name` 列（表列实为 `equipment_name`），`sqlx::query` 运行时不校验列名 | 列名修正 | `a8657c6fe` |
| 2 | 软删设备仍显示在列表 | 列表查询漏 `deleted_at IS NULL`（详情与其他模块均有） | count/list 统一补过滤 | `a8657c6fe` |
| 3 | 设备页分页显示 `11-10Total10Item` | crud 模式 `baseIndex=1`（1-based）直接传给 MUI `TablePagination`（期望 0-based） | page/序号按 baseIndex 归一 + 模板补空格 | `125cd7267` |
| 4 | mes 编译/缓存同步 | 双语 SQL 改动后根 `.sqlx` 缓存未同步（CI 离线编译必红） | `mes_guard --prepare` 同步 160 个缓存 | `09e93887b` |

---

## 5. 当前状态与遗留

### 已闭环
- [x] 前端 i18n：界面文案 100% 英文，键对齐，无 CJK/rawkey
- [x] 后端数据多语言：`*_en` 体系 + CASE WHEN 全覆盖（42 列、13+4 处补齐）
- [x] 验收发现 bug 全部修复并推送
- [x] workspace 质量门：`RUSTFLAGS="-D warnings" cargo check --workspace --tests` 0 error（CI Gate L 等价）

### 遗留
- [ ] **CI 绿灯人工确认**：GitHub Actions 三个 job（cargo-check / mes-online-check / sqlx-prepare --check）需在可上网环境打开 `https://github.com/paulwy/TOPEMS/actions` 确认（本机网络无法自动读取）
- [ ] **业务英文数据**：`*_en` 列当前以业务侧逐步录入为主，测试数据已清理还原
