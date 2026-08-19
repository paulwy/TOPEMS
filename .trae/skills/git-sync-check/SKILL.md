---
name: "git-sync-check"
description: "Git 双端同步检查 + rebase 拉取：工作区干净检查 → fetch 差距预览 → pull --rebase（或 up-to-date skip）→ 最终 SHA 一致性核对。触发：用户说『拉取代码』『同步最新』『fetch』『pull』或任何 Git 同步意图时立即调用。"
---

# Git Sync Check · 双端同步检查 + 安全拉取

## 触发条件（任一条命中即调用）
- 用户显式说：『拉取代码』『同步最新』『pull』『fetch』『拉一下』『跟远端同步』
- 准备做任何改代码 / 归档操作之前（可选预检，避免在旧基线上做半天后 rebase 冲突）
- 工作区可能埋着上一次 rebase 中断、子模块未 init 等隐患时

## 标准化 6 步流程（默认输出模板）
> 设计原则：**先看差距再 pull，先本地干后远端，绝不因为 pull 污染工作区或丢失 reflog。**

```
Step 1 工作区干净检查 → Step 2 fetch 并对比 origin/main SHA 变化
      ↓                          ↓
Step 5 最终同步核对 ← Step 4 pull --rebase (up-to-date 则 skip) ← Step 3 差距预览(领先/落后数 + commits 明细)
      ↓
Step 6 最新 3-5 条 commits 列表
```

---

### Step 1 · 工作区干净检查
**目的**：有未暂存改动 + pull 进来的文件 touch 同一行 → 自动 conflict，先看一眼避免尴尬。

```bash
ST=$(git status --short)
if [ -z "$ST" ]; then
  echo "✅ 工作区干净 (0 files)"
else
  N=$(echo "$ST" | wc -l | tr -d ' ')
  echo "⚠️  工作区有 $N 处改动，列前 10:"
  echo "$ST" | head -10
  # 带分类：M=modified ??=untracked D=deleted R=renamed
fi
```

**异常分流**：
- `??` 只有 `logs/_stale-*` / `.DS_Store` 等被 `.gitignore` 漏掉的：**不改状态**，继续流程
- 出现 `M` 且属于核心代码：先问用户"先 stash 还是先 commit"，或默认用 `git stash push -m "sync-check autosave $(date +%H%M%S)"`（结束后提醒 `git stash pop`）
- 出现 `UU` / `AA`（上次 merge/rebase 未收尾）：直接跳到 **失败模式 #3**

---

### Step 2 · fetch + 显示 origin/main SHA 变化
**目的**：fetch 不动本地 HEAD，先客观看到远端有没有新东西。打印 origin/main 的 **before** 和 **after**，远端真的动了才 pull。

```bash
BEFORE_FETCH=$(git rev-parse --short origin/main 2>/dev/null || echo "N/A")
git fetch origin main 2>&1 | tail -3
AFTER_FETCH=$(git rev-parse --short origin/main 2>/dev/null || echo "N/A")
echo "origin/main before fetch: $BEFORE_FETCH"
echo "origin/main after  fetch: $AFTER_FETCH"
```

如果 `BEFORE_FETCH == AFTER_FETCH` 且 Step 3 远端领先 = 0，基本确定可直接进"up-to-date"跳过 Step 4。

---

### Step 3 · 差距预览（一定要在 pull 之前给用户看）
**目的**：把"pull 会发生什么"翻译成两条数字 + 一个列表，让用户一眼判断这是一次常规同步还是大版本跨越。

```bash
LOCAL_AHEAD=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
REMOTE_AHEAD=$(git log HEAD..origin/main --oneline 2>/dev/null | wc -l | tr -d ' ')

echo "本地领先远端: $LOCAL_AHEAD commits"
echo "远端领先本地: $REMOTE_AHEAD commits"
```

**差距展示规则**：
- `REMOTE_AHEAD > 0`：列出远端新增 commits 的 oneline（头 10 条即可，再多省略号截断），统计 `files changed / +/-` 可附在 pull 成功后补一条
- `LOCAL_AHEAD > 0 & REMOTE_AHEAD > 0`：明确标注"**双向分叉（会触发 rebase）**"，在 Step 4 里必须加 rebase 冲突预案
- 两个都 0：打印 `ℹ️  已是最新（本地=远端），无需 pull`，Step 4 直接 skip

---

### Step 4 · git pull --rebase（或 skip）
**原则：永远 `git pull --rebase`，不用无参数的 `git pull`（生成 merge commit 污染线性历史）**。

```bash
BEFORE=$(git rev-parse --short HEAD)
echo "pull 前 HEAD = $BEFORE"

if [ "$LOCAL_AHEAD" -eq 0 ] && [ "$REMOTE_AHEAD" -eq 0 ]; then
  echo "⏭️  skip pull (up-to-date)"
else
  git pull --rebase origin main 2>&1 | tail -5
fi

AFTER=$(git rev-parse --short HEAD)
echo "pull 后 HEAD = $AFTER"
```

**双向分叉时附加两条信息**：
- pull 成功 → 追加"✅ rebase 顺利（`$BEFORE` → `$AFTER`，新增 $REMOTE_AHEAD 条在本地 $LOCAL_AHEAD 条之后）"
- pull 失败 → 跳到 **失败模式 #1**

---

### Step 5 · 最终同步核对（硬性检查项，不能省）

```bash
echo "=== 最终同步状态 ==="
git status -sb

LOCAL_HEAD=$(git rev-parse --short HEAD)
REMOTE_HEAD=$(git rev-parse --short origin/main 2>/dev/null || \
  git ls-remote origin refs/heads/main | awk '{print substr($1,1,9)}')

echo "本地 HEAD: $LOCAL_HEAD"
echo "远端 HEAD: $REMOTE_HEAD"

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
  echo "✅ 双端 SHA 一致 = $LOCAL_HEAD"
else
  echo "⚠️  双端 SHA 不一致 (本地 $LOCAL_HEAD ≠ 远端 $REMOTE_HEAD)"
  # 原因一般是：本地有未 push 的 commits，或 origin/main 比 HEAD 还多几条没 pull
fi
```

✅ 理想输出：
```
## main...origin/main
本地 HEAD: a1b2c3d4e
远端 HEAD: a1b2c3d4e
✅ 双端 SHA 一致
```

---

### Step 6 · 最新 commits 列表（拉取后看一眼变化点）
```bash
N=5
echo "最新 $N 条 commits:"
git log --oneline -n $N
```

如果 Step 3 里 REMOTE_AHEAD ≥ 1，这里再多列一条"本次新增"：
```bash
if [ "$REMOTE_AHEAD" -gt 0 ] && [ "$LOCAL_HEAD" != "$BEFORE" ]; then
  echo ""
  echo "本次新增 commits (${BEFORE:0:9}..${LOCAL_HEAD:0:9}):"
  git diff --stat "$BEFORE".."$LOCAL_HEAD" | tail -1
fi
```

---

## 失败模式与回滚（TOPEMS 项目实际触发过 ≥1 次的坑）

| # | 场景 | 现象 | 标准处置 |
|---|------|------|---------|
| 1 | rebase 冲突停住 | `git status` 出现 `both modified` / `Unmerged paths` | ⚠️ **不要 `git rebase --skip`（会丢本地 commit）**；按下列顺序：<br>1. `git diff --name-only --diff-filter=U` 看冲突文件清单<br>2. ≤ 3 个文件 & 各 1-2 处冲突：直接 `Read` 文件 + Edit 保留两边（若 TOPEMS 场景：远端是 V256/V257 docs 新章节，本地是刚加的 Skill，一般不同行）<br>3. > 3 文件或 > 10 处冲突：`git rebase --abort` → 把本地改动 `git branch sync-savepoint` → `git reset --hard origin/main` → 再 cherry-pick savepoint 上自己的 commit，告知用户<br>4. 解决完：`git add -A && git rebase --continue` |
| 2 | Step 1 工作区有 `M`（用户未提交的临时改动）| pull 时 git 会报 `error: cannot pull with rebase: You have unstaged changes.` | 默认 `git stash push -m "sync-check autosave $(date +%H%M%S)"`（pull 成功后提醒 `git stash list` 看 key，`git stash pop` 恢复）；或 `git commit -am "wip: autosave"` 让 rebase 更顺 |
| 3 | `git status` 里有 `UU / AA / DU`（历史 merge/rebase 中断） | 仓库一直处于 conflict 状态，任何 pull 失败 | 先 `git status` 看上下文，再三选一：<br>· 本地无任何有价值改动：`git reset --hard HEAD~1` 后退一步或 `git reset --hard origin/main`<br>· 想抢救冲突：按失败模式 #1 手动合并，最后 `git merge --continue` 或 `git rebase --continue`<br>· 不确定时 → 问用户 |
| 4 | `git fetch origin main` 报 `Permission denied (publickey)` | 远端未授权或 SSH 环境变量丢失 | 不用排错（排错要交互），直接告诉用户"fetch 未授权，GitHub 需要登录或检查 ~/.ssh/id_ed25519"，**不继续 Step 3+** |
| 5 | submodule 未 init | pull 后 `apps/xxx` 目录空 | `git submodule update --init --recursive` 单独跑一次 |

---

## 典型回复模板（pull 成功后直接贴给用户）

```markdown
## ✅ 拉取完成

\`\`\`
pull 前: <BEFORE> (<1 句 commit msg 摘要>)
pull 后: <AFTER>  (<1 句 commit msg 摘要>)
方式:   git pull --rebase origin main · 0 冲突
差距:   本地领先 <LOCAL_AHEAD> · 远端领先 <REMOTE_AHEAD>
体量:   <M> files · +<INS> / -<DEL>
\`\`\`

### 同步状态
| 项目 | 值 |
|------|----|
| 本地 HEAD | \`<AFTER>\` |
| 远端 HEAD | \`<AFTER>\` |
| diff | ✅ 双端一致 |
| git status -sb | \`## main...origin/main\` |
| 工作区 | ✅ 干净 |

### 新增 <REMOTE_AHEAD> 条 commits
\`\`\`
<oneline 列表>
\`\`\`
```

### 如果 up-to-date（无需 pull）时的模板
```markdown
## ℹ️ 已是最新

- 本地 HEAD / origin/main = **<SHA>**（零差异）
- 工作区：✅ 干净
- 最新 3 条 commits：
  - ...
  - ...
  - ...
无需再次 pull。
```
