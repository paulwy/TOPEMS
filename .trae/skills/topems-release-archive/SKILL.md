---
name: "topems-release-archive"
description: "TOPEMS 版本发布与归档：SHA 回填双 docs 修正、main 分支推送、V25N tag 创建推送、41M tgz 打包 + 归档 SHA 一致性修正。触发：并行4轨门禁通过后、或用户说『推送代码』『打tag V25N』『归档tgz』『发布版本』时立即调用。"
---

# TOPEMS Release Archive · 版本发布与归档三件套

## 分工边界（与 topems-parallel-release 配合）

| Skill | 负责范围 |
|-------|---------|
| `topems-parallel-release` | Step 0–4：盘点 → 定4轨清单 → 并行执行 → 合并 → 端到端门禁通过 + **首段 docs 章节（`<待提交回填>` 占位）写入** |
| `topems-release-archive`（本 Skill）| Step 5 发布链：主 feat commit → SHA 回填双 docs 修正 → pull --rebase → push main → tag V25N → push tag → tgz 打包 → 归档 SHA 一致性修正 → 最终同步校验 |

---

## 触发条件（任一条命中即调用）
- 用户显式说：『推送代码』『打 tag V25N』『归档』『发布 V25N』『出 release』
- `topems-parallel-release` Step 4 端到端复现通过后，V25N 章节 Baseline SHA 仍显示 `<待提交回填>` 占位
- 用户要求"收尾"、"把刚才的 V25N 提交一下"、"同步到 origin"、"生成归档"

---

## 标准化 6 步发布链

### Step A · 预检（Pre-flight，必须通过）
在动手前 30s 跑完以下命令，若任一红就先解决再走发布链：

```bash
# 1. 工作区无未暂存改动（除 docs/roadmap/TODO.md 占位段未 SHA 回填外）
git status --short

# 2. TODO.md 含 "<待提交回填>" 或 "{FINAL}" 占位符（预期在 V25N 章标题下方一行）
grep -n "待提交回填\|{FINAL}" docs/roadmap/TODO.md | tail -4

# 3. 最新 commit msg 是 feat(v25n)（尚未推送的主改动 commit）
git log --oneline -n 1

# 4. 远端无领先 commit（避免 rebase 冲突阻塞）
git fetch origin main
git log HEAD..origin/main --oneline
```

**预检失败的降级预案**：
- 工作区有 1–3 个无关改动（如 Cargo.lock 自动更新）→ 单独 `git add` + chore commit 剥离
- 远端已有 1–2 个其他人的 commit → `git pull --rebase origin main` 先合并，再往下
- TODO.md 里没找到 V25N 章节 → 补写（复用 topems-parallel-release Step 5.1 模板）再归档

---

### Step B · 主 feat commit（feat(v25n)）
TODO.md 首段已经写好（占位 SHA `<待提交回填>`），直接一次性提交所有工作区文件（50+）。

```bash
git add -A
BEFORE=$(git rev-parse --short HEAD)
echo "Before: $BEFORE"

git commit -m "feat(v25<n>): <A 轨一句话>, <B 轨一句话>, <C 轨一句话>, <D 轨一句话>

A 轨(...):
  ...（关键 3-6 个文件清单）

B 轨(...):
  ...

C 轨(...):
  ...

D 轨(...):
  ...

全门禁通过: perm / axum / cargo / tsc / i18n
文档: docs/roadmap/TODO.md 新增 V25<n> 章节 + V25<n-1> 后续扩展 X 条打勾 ✓"

AFTER=$(git rev-parse --short HEAD)
echo "After feat SHA: $AFTER"
```

⚠️ 提交消息不要出现 `$(...)`、3 连反引号或未转义 `$`（避免 pathspec 展开）。必须出现特殊字符时改用：
```bash
cat > _tmp_v25<n>_msg.txt << 'EOF'
feat(v25<n>): ... 可安全用 $FAIL / R[1-9] / 反引号 ...
EOF
git commit -F _tmp_v25<n>_msg.txt ; rm _tmp_v25<n>_msg.txt
```

---

### Step C · SHA 回填链（3 次 docs 修正，顺序严格）
> 目标：3 次连续 docs(roadmap) commit，让 **V25N 章标题行**里的 3 个关键信息按实际值正确，顺序不颠倒。

| docs commit # | 替换内容（Edit TODO.md） | 结果行示例 |
|---------------|-------------------------|------------|
| #1（Baseline）| `<待提交回填>` → `$AFTER`（Step B 的 feat SHA，**9 位**） | `**Tag**: \`TOPEMS-V255\` · Baseline SHA: \`ad7b86862\` · ... · 归档: \`releases/archives/TOPEMS-V255-{FINAL}.tar.gz\` (.gitignore 排除)` |
| #2（Archive path）| `{FINAL}` → 「docs-1 的 commit SHA」 | 上一行里 `{FINAL}` 换成真实 `f4d57e233` |
| #3（Archive SHA final 对齐）| 如 tgz 实际用了 docs-2 之后的 FINAL，再改一次 archive SHA，保证**磁盘真实文件 = TODO.md 写的 = 最终 push 的 main HEAD** | 修正后归档路径 = `TOPEMS-V255-f4a7179e9.tar.gz`（tgz 真实打包用哪个就写哪个） |

```bash
# docs #1: Baseline SHA → AFTER
#   （用 Edit 工具直接替换 "Baseline SHA: \`<待提交回填>\`"，避免 sed 对 unicode 正则错误）
git add docs/roadmap/TODO.md
git commit -m "docs(roadmap): V25<n> baseline SHA $AFTER 回填"
FINAL1=$(git rev-parse --short HEAD)

# docs #2: Archive path {FINAL} → FINAL1
#   （Edit 替换 "TOPEMS-V25<n>-{FINAL}.tar.gz" → "TOPEMS-V25<n>-$FINAL1.tar.gz"）
git add docs/roadmap/TODO.md
git commit -m "docs(roadmap): V25<n> tgz archive path releases/archives/TOPEMS-V25<n>-$FINAL1.tar.gz"
FINAL2=$(git rev-parse --short HEAD)

# Step D(打 tag) 在这两者之间——tag V25<n> 指向 FINAL2（代码+章节+路径都对的稳定点）
# 然后再做 Step F(tgz)，再 docs #3 修最终对齐
```

⚠️ **典型陷阱**：sed 替换 `|` 分隔 + Unicode ✅ / `` ` `` 组合时经常报 `repetition-operator operand invalid`。**永远用 Edit 工具做字符串替换**，不用 sed。

---

### Step D · 同步 main + 打 tag V25N（顺序严格：先 pull → 再 push main → 再 tag → 再 push tag）

```bash
# D1. pull --rebase origin main（避免任何落后的合并 commit）
git pull --rebase origin main 2>&1 | tail -3

# D2. push main
git push origin main 2>&1 | tail -3

# D3. 打 annotated tag V25<n>（tag 指向 FINAL2 = 归档路径修正后的 commit，稳定可复现）
git tag -a V25<n> -m "V25<n> · <3-5 个关键词，如 R2真扫 + mapping12svc> · SHA $FINAL2 · <X> files · 全门禁通过"

# D4. push tag（单独 push 不跟 main 混，方便失败重跑）
git push origin V25<n> 2>&1 | tail -3
```

**tag 修正规则（tag 打错才用）**：删除 tag → 重建 → 强制 push tag（**不强制 push main branch**）：
```bash
# 仅限 tag 需要重打时使用
git tag -d V25<n>
git push origin :refs/tags/V25<n>
# 重新 D3+D4
```

---

### Step E · 归档 tgz（40–45 MB 典型）
目录：`releases/archives/`（已在 `.gitignore` 中，不入库）

```bash
mkdir -p releases/archives

# 用 FINAL2（tag V25<n> 指向的 commit SHA）作为文件名后缀，tag & archive 一一对应
TGZ="releases/archives/TOPEMS-V25<n>-${FINAL2}.tar.gz"
tar -czf "$TGZ" \
  --exclude='./target' \
  --exclude='./node_modules' \
  --exclude='./.git' \
  --exclude='./releases/archives' \
  .

ls -lh "$TGZ"   # 期望 -rw-r--r-- ... 38~48M
```

---

### Step F · 归档 SHA 一致性修正 docs #3 + 最终 push（闭环）
打包用的是 `FINAL2`，但 Step C docs #2 写的可能是 `FINAL1`（因为打包在 docs #2 之后做，顺序）。这一步对齐一次：

```bash
# F1. 用 Edit 改 TODO.md：把归档路径里的 SHA 替换为 FINAL2（真实 tgz 文件名的 SHA）
#     行样式：
#   **Tag**: `TOPEMS-V255` · Baseline SHA: `$AFTER` · Status: **全门禁通过** ✅ · 归档: `releases/archives/TOPEMS-V255-$FINAL2.tar.gz` (41M · .gitignore 排除 · 最终 commit $FINAL2)

# F2. 第 3 次 docs commit
git add docs/roadmap/TODO.md
git commit -m "docs(roadmap): V25<n> tgz archive SHA corrected ($FINAL2)"

# F3. 再 push main（tag V25<n> 不动，tag 指向 FINAL2 是稳定可复现的代码节点，
#     之后的 docs #3 是纯粹的归档元数据修正，不重新打 tag）
git push origin main 2>&1 | tail -3
```

---

### Step G · 最终同步校验（必须跑，给用户展示）

```bash
echo "=== 1. main 分支本地=远端 ==="
git status -sb                       # 期望: ## main...origin/main (无 ahead/behind)
echo ""
echo "=== 2. tag V25<n> 本地=远端 ==="
echo "本地 V25<n> = $(git rev-parse --short V25<n>)"
echo "远端 V25<n> = $(git ls-remote --tags --exit-code origin refs/tags/V25<n> | awk '{print substr($1,1,9)}' | head -1)"
echo ""
echo "=== 3. 归档文件存在且 ≥30M ==="
ls -lh releases/archives/TOPEMS-V25<n>-*.tar.gz | head -1
echo ""
echo "=== 4. 最新 5 条 commits ==="
git log --oneline -n 5
echo ""
echo "=== 5. TODO.md V25<n> 章标题行核对 ==="
grep -n "### V25<n>" docs/roadmap/TODO.md -A 1 | head -4
```

✅ 校验通过输出特征：
- status: `## main...origin/main`
- 两处 V25N SHA 字符串 **完全相同（9 位）**
- `ls -lh` 显示 **≥ 35M**（含 Rust src + node src + 所有文档）
- 最新 commit 是 `docs(roadmap): V25<n> tgz archive SHA corrected (...)`

---

## 与 TODO.md 的核对清单（归档完成后自检）
- [x] Baseline SHA 9 位 == Step B 主 feat commit SHA
- [x] 归档路径里的 SHA 9 位 == `$FINAL2` == tag V25N 指向的 SHA
- [x] V25(N-1) 后续扩展里的本次已完项全部从 `[ ]` → `[x]`
- [x] V25(N) 后续扩展 5-7 条写入（R3 清零、下一批 svc、第二轮 mapping、V25N+2 移除 deprecated wrappers 等）
- [x] 归档文件大小 ≥ 30M（防止 exclude 错误造成空包）
- [x] `git ls-remote --tags origin V25<n>` 非空输出

---

## 已知失败模式与回滚（≥1 次发生过的坑）

| # | 失败模式 | 根因 | 解决 |
|---|---------|------|------|
| 1 | `sed: RE error: repetition-operator operand invalid` | sed `\|` 分隔 pattern 里有 `` ` ``/`✅` 等 Unicode 组合 | 用 Edit 工具做字符串替换，不用 sed |
| 2 | 归档 SHA 写成 docs-1 的 FINAL1，但 tgz 实际用了 docs-2 之后的 FINAL2 | 先写路径 placeholder 再打包造成偏移 | 再做 docs #3 修正一次 TODO.md，不重打 tag |
| 3 | `git push origin V25N` 报 `tag already exists` | 远端已有同名 tag（一般是上一轮测试残留）| 仅 tag 场景：本地 `git tag -d V25N` + 远端 `git push origin :refs/tags/V25N` 后重建；**不删 main branch 任何东西** |
| 4 | `git pull --rebase` 停在 rebase 冲突 | 远端有人推了与 TODO.md 同一行的改动 | `git rebase --abort` → 手动把 V25N 段内容剪切到剪贴板 → `git pull origin main`（merge 策略）→ 重新粘贴 Edit 一次 → 重新从 Step B 末尾接着做 |

---

## 典型输出模板（给用户最终回复用）

```
## ✅ V25<n> 推送 + 归档完成

| 项目 | 本地 | 远端 | 状态 |
|------|------|------|------|
| main 分支（HEAD $FINAL3）| ✅ | ✅ | 已同步 |
| tag V25<n> SHA | $FINAL2 | $FINAL2 | ✅ 已同步 |
| 工作区改动 | 0 | - | ✅ 干净 |

### Commits 已推送（main）
$FINAL3 docs(roadmap): V25<n> tgz archive SHA corrected ($FINAL2)
$FINAL2 docs(roadmap): V25<n> tgz archive path TOPEMS-V25<n>-$FINAL1.tar.gz
$FINAL1 docs(roadmap): V25<n> baseline SHA $AFTER 回填
$AFTER feat(v25<n>): <A>, <B>, <C>, <D>
<prev> <上一个版本 SHA> docs(roadmap): ...

### 归档
releases/archives/TOPEMS-V25<n>-$FINAL2.tar.gz · 41M · .gitignore excluded
```
