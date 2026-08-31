#!/usr/bin/env bash
# =============================================================
# TOPEMS 版本发布脚本（P2-3：CHANGELOG 接入发布流程）
#
# 将 CHANGELOG 生成（scripts/ci/generate-changelog.py）纳入发布动作，
# 确保每次打 tag 前 CHANGELOG.md 已更新、草案已生成。
#
# 用法：
#   ./scripts/release.sh draft            # 生成草案到 docs/changelog/draft.md
#   ./scripts/release.sh tag <VERSION>    # 校验 CHANGELOG 已含 <VERSION> 后打 tag
#   ./scripts/release.sh check            # 只校验（不写文件、不打 tag）
#
# 说明：
#   - tag 支持 semver（v1.2.3）与构建序号（V473）两种命名
#   - draft 只生成草案，不修改 CHANGELOG.md（Keep a Changelog 叙事保留人工维护）
#   - tag 前强制校验 CHANGELOG.md 已含对应版本章节，防漏
# =============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GEN="$ROOT/scripts/ci/generate-changelog.py"
CHANGELOG="$ROOT/CHANGELOG.md"
DRAFT="$ROOT/docs/changelog/draft.md"

die() { echo "❌ $*" >&2; exit 1; }

# 最近 tag（git describe 按可达性取最近一个）
last_tag() { git -C "$ROOT" describe --tags --abbrev=0 2>/dev/null || echo ""; }

check_changelog_present() {
  [ -f "$CHANGELOG" ] || die "CHANGELOG.md 不存在: $CHANGELOG"
  grep -q "^## \[未发布\]" "$CHANGELOG" || die "CHANGELOG.md 缺少 [未发布] 章节"
  echo "✅ CHANGELOG.md 存在且含 [未发布] 章节"
}

do_draft() {
  check_changelog_present
  local tag
  tag="$(last_tag || true)"
  echo "→ 基于最近 tag: ${tag:-无} 生成草案…"
  python3 "$GEN" --write
  echo "✅ 草案已写入 ${DRAFT}（人工复核后合并到 CHANGELOG.md）"
}

do_tag() {
  local version="${1:-}"
  [ -n "$version" ] || die "缺少版本号，用法: ./scripts/release.sh tag <VERSION>"
  check_changelog_present
  # 校验 CHANGELOG 已含对应版本章节（支持 1.2.3 / v1.2.3 / V473）
  local norm="${version#v}"
  if ! grep -qE "^## \[[Vv]?${norm#V}\]" "$CHANGELOG"; then
    echo "⚠️  CHANGELOG.md 未发现版本章节 [${version}]"
    echo "   → 请先: python3 $GEN --write，核对后将 [未发布] 转为版本章节并提交"
    die "CHANGELOG 未包含版本 ${version}，拒绝打 tag"
  fi
  git -C "$ROOT" tag -a "$version" -m "Release $version"
  echo "✅ 已打 tag: ${version}（CHANGELOG 已含对应章节）"
  echo "→ 推送: git push origin $version 触发发布 CI"
}

do_check() {
  check_changelog_present
  local tag
  tag="$(last_tag)"
  echo "→ 最近 tag: ${tag:-（无）}"
  python3 "$GEN" > /dev/null || die "草案生成失败"
  echo "✅ 校验通过：CHANGELOG 结构完整，草案可生成"
}

case "${1:-}" in
  draft)  do_draft ;;
  tag)    do_tag "${2:-}" ;;
  check)  do_check ;;
  *) echo "用法: $0 {draft|tag <VERSION>|check}"; exit 1 ;;
esac
