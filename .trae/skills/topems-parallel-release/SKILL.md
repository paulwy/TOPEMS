---
name: "topems-parallel-release"
description: "按 TOPEMS 4 轨并行流程推进代码并归档 V24X 版本。触发：当用户说『并行加快推进』、要求开新版本 V24N 或一次推进多个遗留 TODO 时立即调用。"
---

# TOPEMS 4 轨并行发布工作流 (V24N Parallel Release)

## 适用场景与触发条件

✅ **触发**（任一条满足即调用本 Skill）：
- 用户显式说：「并行加快推进」「加速」「多轨推进」「开新版本 V24N」
- 用户意图明确一次处理多个 TODO/V24N 后续扩展（一次改 3+ 个方向）
- 刚完成一个 V24N 版本，用户继续要求「继续」且隐含多方向

❌ **不要用本 Skill**：
- 用户单点修改（只修一个 bug、只改一个文件）
- 纯问答 / 纯文档 / 纯设置类请求
- 首次 clone 后项目 bootstrap 初始化（非版本型迭代）

## 标准化 5 步流程

```
Step 0 现状盘点  →  Step 1 定 4 轨任务清单  →  Step 2 用 general_purpose_task ×4 并行执行
      ↓                                                                ↓
Step 5 E（V24N 文档 + 提交推送） ←  Step 4 端到端复现验收 ← Step 3 结果合并
```

每一步硬性规则与推荐模板如下。

---

## Step 0 · 现状盘点（并行扫描，≤ 10 分钟）

**目标**：不要拍脑袋定任务，用「数据 + 历史清单」选 4 条高价值、可独立验证、无交叉依赖的子任务。

**并发扫描清单（一次 Run/Grep 全部）**：
1. 读 `docs/roadmap/TODO.md`，搜索 `后续扩展`，取最近一个版本（如 V245 后续扩展）的未勾条目作为优先候选
2. `git log --oneline -n 6`：确认上一版本号末尾两位，本次 V24N 末位 +1（例如 `0d58325 feat(v245)` → 新版本 = V246）
3. 质量门禁基线复测（跑 dry-run 或 short 输出）：
   - `node scripts/ci/check-axum-layer-order.cjs 2>&1 | grep -E "R[123]:|Integrity conclusion"`  → 记录 R1/R2/R3 实际数值
   - 查看 Perm-Gate 是否有未清 WARN（pre-commit 最后有 dry-run 输出即可，不用重跑脚本路径查）
   - `cargo check --workspace --message-format=short 2>&1 | tail -5` → exit 0 判断
   - `pnpm --filter topems-portal run typecheck 2>&1 | tail -5` → web 端 TS 0 判断
4. 可自动化验证的候选池（优先选有明确数字的：0/非 0、有/无）：
   - Rust 层：cargo test --workspace --no-run 是否 0 errors；单个 --tests crate 编译；全 workspace dead_code/duplicate/... warnings 计数
   - 前端层：packages/* 各包 `tsc --noEmit`（0 error 基线）；lint；test
   - Gate 层：Perm R1~R6 每条规则计数；i18n R11 Z-P1 样式指南 HIGH/MEDIUM 计数；Axum R1/R2/R3
   - 文档层：V24(N-1) 后续扩展未勾条目；V23(N-2) 更早的扩展闭包
   - CI/脚本层：ci.yml 有无 job 缺口（如缺少 tests）；脚本阈值是否长期宽松可以收紧
5. **历史经验复用规则**：从 `TOPEMS/.trae/memory` 里快速 grep 最近版本关键词，确认相同坑不要重复打勾再做一次

**盘点产出**（写在会话开头 TodoWrite 里）：
- 新版本号（V24N）
- 候选任务 6-8 条，每条标注：预期改动文件数、是否独立、是否有明确验收数字
- 选 4 条并发度最高者：
  - ✅ A 轨：Rust 后端（可独立 cargo check）
  - ✅ B 轨：前端（可独立 tsc / lint）
  - ✅ C 轨：Gate 规则 / perm / i18n（可独立 node 脚本）
  - ✅ D 轨：CI / 脚本 / 文档闭合（不影响前面 3 轨编译）
  - ❌ 不选 A + A'（两个 Rust 都改同一组 mod，冲突率 >50%）

---

## Step 1 · 定 4 轨任务清单（TodoWrite）

**命名规范**（对应 TODO 条目的 id/content，方便 V24N 章节复用）：
```
A. <Rust 后端/测试/架构 任务名>
B. <前端 TS/UI/包 任务名>
C. <质量门禁/Gate 规则/静态检查 任务名>
D. <CI/脚本/工具链配置 任务名>
0. 现状盘点（高）
E. V24N TODO.md 更新 + 提交推送（中）
```
所有 A/B/C/D 4 个轨必须能**独立通过 1 条命令验收**（如 `cargo check ... exit 0` / `node script.js ... 0 WARN` / `tsc --noEmit 0 errors`），否则不适合并发，放回 Step 0 候选池。

---

## Step 2 · 用 `general_purpose_task` 并行执行 4 轨

**调用模板**（放在一条 TodoWrite 更新后，4 个 general_purpose_task 同一条 assistant 消息里 = 真正并发）：

```
<|tool_call_begin|>[{"name":"TodoWrite",... 把 A/B/C/D 4 个 status 从 pending→in_progress ...}<|tool_call_end|>
<|tool_call_begin|>[{"name":"general_purpose_task", "description":"A: ... 摘要 ...", "query":"... 任务 A 的详细 150-300 词 ...", "response_language":"Chinese"},
{"name":"general_purpose_task", "description":"B: ... 摘要 ...", "query":"... 任务 B 的详细 150-300 词 ...", "response_language":"Chinese"},
{"name":"general_purpose_task", "description":"C: ... 摘要 ...", "query":"... 任务 C 的详细 150-300 词 ...", "response_language":"Chinese"},
{"name":"general_purpose_task", "description":"D: ... 摘要 ...", "query":"... 任务 D 的详细 150-300 词 ...", "response_language":"Chinese"}]<|tool_call_end|>
```

### general_purpose_task query 编写规则（每轨 150-300 字，避免漏关键）

每条 query **必须包含**：
1. **WHAT**：要做的操作（读什么文件、改什么位置）
2. **WHY**：V24N 的目标（为什么改；不改动的当前现象；改动后预期数值）
3. **HOW**：精确改法模板（函数名、常量名、推荐 Edit 位置前后 5 行上下文），不要贴完整代码（子任务 agent 会先读文件）
4. **EDGE CASES**：若 X 情况发生（如某 import 路径不存在/旧格式），怎么 fallback（至少 1-2 个备选）
5. **VERIFY**：至少 1 条明确命令 + 结果判断（exit 0 / 数字 ≤ N / 某正则匹配）

每条 query **禁止包含**：
- 敏感信息（真实 token / 凭据）
- 之前某次运行的临时文件路径（用项目相对路径）
- 明确的行号（行号是易变质数据；用"在 X 函数之后 / 匹配 Y 模式插入"描述）
- 破坏性操作（如"删整个模块"、"所有 test 改成 #[ignore]"）

---

## Step 3 · 结果合并

4 个 sub-agent 返回后先做**快速健康检查**：
- A 轨：有没有 `cargo check exit 0 / Finished` 字样？如果只有 warning 也算通过；error 则定位错误文件
- B 轨：每 package `errors / exit 0` 表格是否明确？若 >50 errors 标记为「后续扩展，不本次强修」
- C 轨：Gate 数值比较（修改前 X → 修改后 Y）必须明确；如果 Y<X 但未到 0，也算通过（标注 V24N+1 再清）
- D 轨：YAML/JSON 语法校验结果；配置项实际写入行验证

4 轨有 1 轨失败未达预期的处理顺序：
1. **不要重跑 general_purpose_task** — 改成直接在会话里读目标文件 + Edit 修
2. 其他 3 轨已完成的内容不要回滚（加速原则：局部失败 < 整体串行重做）
3. 如果失败任务阻塞 E（文档归档）：先把它降级为 V24N 后续扩展先不做，继续写 V24N 文档

---

## Step 4 · 端到端复现验收（关键，必须本地跑命令验证）

返回结果后再跑**最少 1 条命令复现**（每条 A/B/C/D 1 条），避免子任务 agent 的独立 dry-run 没覆盖全局副作用：
```bash
# A 轨 Rust 编译
cargo test --workspace --no-run --message-format=short 2>&1 | tail -5

# B 轨 packages 0 基线
for pkg in "@topems/tokens" "@topems/shared-types" ...; do
  pnpm --filter "$pkg" exec tsc --noEmit --project tsconfig.json; echo "exit $?"
done

# C 轨 Perm/Axum Gate 数值
node scripts/ci/perm-matrix-toolkit.cjs ci-report --dry-run 2>&1 | grep -E "R[1-6]:\s+\d"
node scripts/ci/check-axum-layer-order.cjs 2>&1 | grep -E "R[1-3]:\s+\d|Integrity conclusion"

# D 轨 YAML 结构
ruby -ryaml -e "puts YAML.load_file('.github/workflows/ci.yml').class"
```

如果全局复现与子任务局部结果不一致（典型：A 轨独立 cargo check 过，但 workspace test 因其他 crate 新增 use 冲突），优先修冲突。冲突修复 ≤ 5 行 Edit 的直接做；> 5 行写 V24N+1 后续扩展。

---

## Step 5 · V24N 版本归档（TODO.md）+ 提交推送

### 5.1 写入模板

写入位置：`docs/roadmap/TODO.md`，在 V24(N-1) 后续扩展段下方，紧邻标题 `## 🎯 V24N — ...（并行推进 · ✅ 完成）`。

**必须包含 7 个小节**（每个 A/B/C/D 轨各一节 + 变更文件清单 + 最终验收矩阵 + 后续扩展）：

```markdown
## 🎯 V24<N> — <一句话概述 4 轨内容>（并行推进 · ✅ 完成）

> 日期：YYYY-MM-DD | 代码改动 X files（Rust A + TS B + YAML D + 其他 C）+ 文档 1 file | 验收：<最关键 3-5 个指标，如 R1/R2/R3=0 · ... 0 errors>

### A. <A 轨标题>
- 背景：一句话
- 首次错误分类 / 改动前基线：表格或列表
- 变更（<N> files）：
  - [file1.rs](file:///abs/path/to/file1.rs) — 一句话做了什么
  - [file2.rs](file:///abs/path/to/file2.rs) — 一句话做了什么
- 验收：代码块贴关键命令 + 关键结果（exit 0 / 数值 0）

### B. <B 轨标题>
...（A 同样结构，尽量用表格对比前后）

### C. <C 轨标题>
...（**必须加一个「根因」callout**，任何 Gate 规则清理都有扫描仪行为边界或格式化陷阱；文档化能减少未来踩坑）

### D. <D 轨标题>
...（CI/脚本改动附上关键 YAML / JS 片段 + 校验结论 Hash OK / Syntax OK）

### 变更文件清单（共 X files）
按语言类型分组（Rust / 前端 / 脚本 / CI YAML / 文档），每条附绝对文件链接

### 最终验收矩阵
- [x] <A 轨验收命令> — <结果>
- [x] <B 轨验收命令> — <结果>
- [x] <C 轨验收命令> — <结果>
- [x] <D 轨验收命令> — <结果>
... 以及各轨内部的 sub-assertion 全勾

### V24N 后续扩展（留给 V24(N+1)+）
- [ ] <如果 A 轨留下悬而未决/分阶段项>：例如「R2 阈值 10→3→0 分阶段守绿」
- [ ] <如果 B 轨某 package 有 >50 errors 本次没修>：明确命令或范围
- [ ] <如果 C 轨 Scanner 行为边界本次最小侵入>：明确长期正确解（TS AST / Rust AST）
- [ ] <连续 2 个版本以上列入但未做的高价值项>：标注"优先级提升"
- [ ] <D 轨 CI 收紧阶段项>：例如「连续 3 次 CI 绿后 step 末尾 exit 0 → exit $FAILED」
```

### 5.2 文档位置与排序规则

新版本标题必须按**数字递增**顺序：
```
V240 → V241 → V242 → V243 → V244 → V245 → V246
```
如果文档插入错误（把 V246 写在 V245 之前），用 Node.js 脚本对 `lines.slice` 块交换重新排序，排序完成后用 grep `^## 🎯 V24` 核对 L 值递增。

### 5.3 提交 + 推送

**提交消息规范**（遵守 [.trae/rules/git-commit-message.md](file:///Users/air/TOPEMS/.trae/rules/git-commit-message.md) 的 Conventional Commits 格式）：
```
feat(v24<n>): <A 轨 1 句>, <B 轨 1 句>, <C 轨 1 句>, <D 轨 1 句>

<V24N 概要 body 3-5 段，每轨 1 段，不用列完整变更清单（详细在 TODO.md）>

文档：docs/roadmap/TODO.md 新增 V24<n> 章节 + V24<n-1> 后续扩展 <数量> 条勾 ✓
```

⚠️ **提交消息中不要包含 `$`、反引号 3 连、嵌套 shell 展开字符**（避免 git commit 多参数的 pathspec 陷阱）。若消息中必须有 `$FAIL` 这类 shell 变量名，用 `-F <msg_file>` 方式：
```bash
# 方案：写临时文件 → commit -F → 删除
cat > _tmp_v24<n>_msg.txt << 'EOF'
feat(v24<n>): ... 这里可以安全写 $FAIL / 任何特殊字符 ...
EOF
git commit -F _tmp_v24<n>_msg.txt ; rm _tmp_v24<n>_msg.txt
```

提交完成后 `git push origin main`。**不要用 `--force` / `--force-with-lease` 强推**（除非与用户确认回滚场景）。

### 5.4 TodoWrite status 收尾

提交推送成功后：
- A/B/C/D status 保持 `completed` + `summary`（1 句关键结果 + 数字证据）
- E status → `completed` + `summary`（commit hash（前 9 位） + files changed + pre-commit 全绿亮点）

---

## 安全红线（绝不破坏）

1. **不要 suppress 警告了事**：dead_code/duplicate 等警告默认接入生产 handler 或改模块可见性，`#[allow(...)]` 只用于预留 DTO 或跨 crate 预留
2. **不要删测试用例** 来通过 `cargo test --no-run`；测试缺导入就补 use，模块未暴露就 `pub mod`
3. **Axum LAST-added = OUTERMOST = 先执行**：任何中间件新增时，**tenant_middleware 必须在更内层（代码上写在 auth_middleware 之前）**
4. **Gate 规则阈值收紧永远用缓冲逐步收敛**：999999 → 10 → 3 → 0，每阶段 ≥2 个版本节点守绿验证，不跳级
5. **前端类型修复仅限简单 3 类以内**：TS2688 @types 缺失 / TS6133 未使用导入删去 / TS2322 Lucide sx 移 Box。错误 >30 个一律写后续扩展，不本次硬啃
6. **文档中包含的敏感数据必须擦除**：SKILL 可复用，不含临时路径/用户凭据；版本章节归档也不要放 commit 前的中间命令输出

---

## 示例：4 轨任务挑选速查表

| 场景 | 推荐 A 轨（Rust） | 推荐 B 轨（前端） | 推荐 C 轨（Gate） | 推荐 D 轨（CI/脚本） |
|---|---|---|---|---|
| 刚完成 V245，用户说"继续并行" | cargo test --workspace 真运行（非 --no-run） | packages/* vitest 0 基线 | Perm R2-WEAK-PASS 8 条（前 3 条 finance/write...）逐条常量表对齐 | ci.yml 新增 cargo test step（失败不阻断，建立基线） |
| V246 后续扩展中有连续 ≥3 个 Tauri 项 | Tauri Token 加密（keystore 插件） | 审计日志前端页（路由 + Mock） | i18n R11 HIGH 计数复盘（确保仍 0） | Perm Scanner 跨行 AST 解析 POC |
| 项目刚重启，R1/R2 >0 | 先把 R1 层序错处修到 0 | 修复 web tsc 前 10 个 blocking 错误 | R2 漏洞实修（CASE B）+ 白名单豁免（CASE A） | 阈值暂时放宽到 R2:999999 到修好再收紧 |
