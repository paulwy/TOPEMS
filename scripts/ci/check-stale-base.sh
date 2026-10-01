#!/usr/bin/env bash
# [2026-10-02] stale-base 守卫：拒绝基于落后 base 的推送（pre-push 第一道门禁）
# 背景：多机协作事故（TRAE 机）——基于过时 origin/main 开发后推送，门禁编译的
#       是旧 base 代码，报错无法区分「你的改动」与「base 自带」，且 push 会被
#       远端 non-fast-forward rejected。本脚本在 cargo 门禁前先拦截旧 base。
# 行为：fetch 最新远端 refs → 校验 origin/main 是 HEAD 的祖先 → 落后即拒绝。
# 边界：fetch 失败（离线/网络）放行；origin/main 不存在（新仓库首推）放行。
set -u

# 1) 刷新远端 refs（只读，不影响工作区）；失败不阻断（离线场景放行）
if ! git fetch origin --quiet 2>/dev/null; then
  echo "[stale-base] fetch origin 失败（离线？），跳过检查"
  exit 0
fi

# 2) origin/main 不存在（新仓库首次推送）→ 放行
if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  exit 0
fi

# 3) 校验：origin/main 必须是 HEAD 的祖先（HEAD 包含远端全部提交）→ 放行
if git merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  exit 0
fi

# 4) 落后 → 拒绝并给出修复路径
echo "✋ [stale-base] 推送被拦截：你的提交基于落后于 origin/main 的 base"
echo ""
echo "   远端已有你本地没有的提交（可能来自其他机器），在旧 base 上推送会："
echo "     • 门禁编译的是旧 base 代码，错误无法区分『你的改动』与『base 自带』"
echo "     • push 大概率被远端 rejected（non-fast-forward），历史被叉开"
echo ""
echo "   修复（二选一）："
echo "     a) git pull --rebase origin main        # 推荐：重放你的提交到最新 base"
echo "     b) bash scripts/sync_base.sh             # 同步 + 编译快验"
echo ""
echo "   注：若本地有未提交改动，先 git stash 再 rebase，完成后 git stash pop。"
exit 1
