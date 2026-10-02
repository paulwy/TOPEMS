# TRAE 机独立身份隔离清单（权限层硬闸前置）

> 背景：TOPEMS 仓库 0 协作者，TRAE 机一直以 **paulwy（所有者）** 身份 push
> （其 SSH key 认证为 paulwy）。所有者不受协作者权限限制，因此「降权限为 Read」
> 对当前配置无效。要让 GitHub 权限层真正拦住 TRAE 的直接 push，必须先给它
> 一个**独立身份**：独立 GitHub 账号 + 独立 SSH key + Read 协作者。
>
> 适用：免费个人账户私有仓库（L1 分支保护不生效）下的最强替代硬闸。
>
> ⚠️ **2026-10-03 实测修正（重要）**：免费个人账户私有仓库的协作者**只能授予
> Write**——Read/Triage 角色仅组织仓库支持（GitHub 官方文档 + API 实测 422
> "Cannot assign ... permission of read/triage"）。因此**本清单第 6 步的
> "角色选 Read" 在当前账户形态下无法实现**，topmap163 实际为 Write（能直接
> push）。权限层物理硬闸需**升级 GitHub Team 组织**后才成立（组织私有仓库支持
> Read 角色 + 分支保护）。升级前有效防线 = 本地门禁 + CI 红灯 + 快速回滚 +
> 推送纪律（详见 git-collab-guide.md「2026-10-03 实测补录」）。

## 目标效果

- TRAE 机 push 被 GitHub 物理拒绝（Read 无 push 权限）→ 只能 fork + PR
- PR 由 paulwy（main 维护者）审阅、CI 把关后 merge
- 坏提交无法直接进 main（权限层硬闸，不依赖门禁纪律）

## 第 0 步：备份 TRAE 机未推提交（重要）

```bash
cd <repo>
git status --porcelain          # 有改动先 commit 或 stash
git log --oneline origin/main..HEAD   # 如有本地未推提交：git push origin <branch> 备份或复制到别处
```

## 第 1 步：注册独立 GitHub 账号（TRAE 专用）

- 浏览器：github.com/signup，注册新账号（如 `trae-bot`）
- 无需付费；仅用于 Read 访问本仓库

## 第 2 步：TRAE 机生成独立 SSH key

```bash
ssh-keygen -t ed25519 -C "trae-bot" -f ~/.ssh/id_ed25519_trae
cat ~/.ssh/id_ed25519_trae.pub    # 复制输出
```

## 第 3 步：公钥加到新账号

- 浏览器登录 **trae-bot** → Settings → SSH and GPG keys → New SSH key
- 粘贴上一步的公钥

## 第 4 步：TRAE 机 SSH 配置指向新 key

编辑 `~/.ssh/config`（没有则新建）：

```sshconfig
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_trae
    IdentitiesOnly yes
```

> 若 TRAE 机**还需要 paulwy 身份访问其他仓库**，改用 Host 别名区分，不要覆盖
> github.com 默认：`Host github-paulwy` + `HostName github.com` + paulwy 的
> IdentityFile，该机器上 paulwy 仓库的 remote 用 `git@github-paulwy:owner/repo.git`。

## 第 5 步：验证身份已切换

```bash
ssh -T git@github.com
# 应输出：Hi trae-bot! You've successfully authenticated...
# （若仍显示 Hi paulwy!：检查第 4 步的 IdentityFile 与 IdentitiesOnly）
```

## 第 6 步：paulwy 把 trae-bot 加为协作者（实测：只能 Write）

- paulwy 账号 → GitHub → TOPEMS → Settings → Collaborators → Add people
- 搜索 trae-bot → 角色选 **Write**（⚠️ 2026-10-03 实测：Read 不可分配，API 422
  "Cannot assign ... permission of read"；Write 是免费个人仓库唯一可选）

## 第 7 步：TRAE 机验证硬闸生效（push 被拒）

```bash
git fetch origin && git reset --hard origin/main   # 先同步（Read 可 pull，不受影响）
git push --dry-run origin main
# 应报：remote: Permission to paulwy/TOPEMS.git denied to trae-bot
#       ! [remote rejected] main -> main (pre-receive hook declined)
# 这证明权限层硬闸生效——比门禁可靠（物理层拒绝）
# ⚠️ 2026-10-03 实测：Write 协作者不会报 Permission denied（dry-run 显示
#    main -> main）。此验证仅在升级 Team 组织（Read 角色）后适用。
```

## 第 8 步：TRAE 机新的协作流程（fork + PR）

```bash
# 一次性的 fork
git remote add fork git@github.com:trae-bot/TOPEMS.git

# 每次开发：基于最新 upstream main
git fetch origin && git reset --hard origin/main
git checkout -b feature/xxx
# ... 开发、本地门禁照常（doctor 已装，push 到 fork 仍跑 pre-push 门禁）...

# 推送分支到 fork
git push fork feature/xxx

# GitHub 网页开 PR：trae-bot/TOPEMS → paulwy/TOPEMS (main)
# paulwy 审阅 CI 结果（cargo-check/clippy/test 等全量）后 merge
```

## 第 9 步：fork 与上游保持同步（定期）

```bash
git fetch origin          # origin = paulwy/TOPEMS
git rebase origin/main    # 或 merge；rebase 保持线性
```

## 回滚（如需恢复 paulwy 身份）

- 删除 `~/.ssh/config` 中 github.com 的 IdentityFile 两行
- `ssh-add -D` 清理内存中的 key 缓存
- 恢复使用 paulwy 的 key 后 `ssh -T git@github.com` 应显示 Hi paulwy!

## 注意

- **本地门禁（doctor）继续保留**：TRAE 机 push 到 fork 时 pre-push 门禁照常运行，
  双保险（先本地把关，再 PR 由维护者把关）。
- **main 的最终合入权只在 paulwy**：Read 协作者无法 merge，PR 必须由你操作。
- 升级 Team 组织后，分支保护 + 独立账号全链路生效，本清单的 PR 流程可保留
  作为标准协作模式。
