#!/usr/bin/env bash
# backup-offsite.sh — 每周把最新生产 dump 归档到 MacBook Pro（离线备份仓）
#
# 用法：
#   backup-offsite.sh            归档最新一份 dump 到远端（幂等，已存在则跳过）
#   backup-offsite.sh --verify   对远端所有归档做可读性校验（每月跑）
#   backup-offsite.sh --check    只做前置检查（凭证/挂载/容量），不拷贝
#
# 凭证文件：~/topems/.secrets/smb-mbp.env（chmod 600，在 gitignore 内）
#   SMB_USER="xingzhai"
#   SMB_PASS="***"
#   SMB_HOST="192.168.110.213"
#   SMB_SHARE="share"
#   REMOTE_SUBDIR="topems-archive"   # 可选
#   RETENTION_COUNT="26"             # 可选，远端保留份数（默认 26 ≈ 半年）
#
# 设计要点：
#   - 远端滚动归档：保留最近 RETENTION_COUNT 份（该机磁盘仅剩约 2 GB，不能无限增长）
#   - 落盘用 .part + mv，保证远端不会出现半份文件
#   - 归档前后各校验一次：本机 pg_restore --list + 远端 sha256 一致性 + 远端副本可读
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@18/bin:/usr/bin:/bin:/usr/sbin:/sbin"

BACKUP_DIR="$HOME/topems/backups"
ARCHIVE_DIR="$HOME/topems/backups-offsite"
LOG_FILE="$ARCHIVE_DIR/backup-offsite.log"
INDEX_FILE="$ARCHIVE_DIR/offsite-index.csv"
ENV_FILE="$HOME/topems/.secrets/smb-mbp.env"
MOUNT_POINT="$ARCHIVE_DIR/mnt"
MODE="${1:-copy}"

mkdir -p "$ARCHIVE_DIR" "$MOUNT_POINT"

log() { echo "[$(date -Iseconds)] $*" >> "$LOG_FILE"; }
fail() { log "FAILED: $*"; echo "FAILED: $*" >&2; exit 1; }

# ---------- 前置检查 ----------
[ -r "$ENV_FILE" ] || fail "缺少凭证文件 ${ENV_FILE}"

set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a
: "${SMB_USER:?SMB_USER 未设置}"
: "${SMB_PASS:?SMB_PASS 未设置}"
: "${SMB_HOST:?SMB_HOST 未设置}"
: "${SMB_SHARE:?SMB_SHARE 未设置}"
REMOTE_SUBDIR="${REMOTE_SUBDIR:-topems-archive}"
RETENTION_COUNT="${RETENTION_COUNT:-26}"

# 挂载标识：mount 输出以 //user@host/share 开头，用它做幂等判断（不依赖挂载点路径写法）
IDENTITY="//${SMB_USER}@${SMB_HOST}/${SMB_SHARE}"
SMB_PATH="//${SMB_USER}:${SMB_PASS}@${SMB_HOST}/${SMB_SHARE}"

# 只认本脚本自己的挂载点：Time Machine 会把同一共享挂到
is_mounted() { mount | grep -q "^${IDENTITY} on ${MOUNT_POINT} " ; }

log "===== 开始（模式：${MODE}，目标：${SMB_USER}@${SMB_HOST}/${SMB_SHARE}）====="

# ---------- 挂载（幂等） ----------
if ! is_mounted; then
  mount_smbfs -o noatime "$SMB_PATH" "$MOUNT_POINT" \
    || fail "SMB 挂载失败（目标机是否开机/文件共享是否开启/凭证是否正确）"
fi

# 固定使用自己的挂载点，避免复用 Time Machine 的 nobrowse 挂载（/Volumes/.timemachine/… 下无权写）
REMOTE_ROOT="$MOUNT_POINT"
REMOTE_DIR="${REMOTE_ROOT}/${REMOTE_SUBDIR}"
mkdir -p "$REMOTE_DIR" || fail "无法创建远端目录 ${REMOTE_DIR}"

detach() {
  if is_mounted; then
    diskutil unmount "$REMOTE_ROOT" >/dev/null 2>&1 \
      || umount "$REMOTE_ROOT" >/dev/null 2>&1 || true
    log "已卸载 ${REMOTE_ROOT}"
  fi
}
rc=0
trap 'rc=$?; detach; exit $rc' EXIT

# ---------- 模式：check ----------
if [ "$MODE" = "--check" ]; then
  FREE=$(df -h "$REMOTE_ROOT" | tail -1 | awk '{print $4}')
  COUNT=$(grep -c '^[0-9]' "$INDEX_FILE" 2>/dev/null) || COUNT=0
  log "CHECK OK：挂载正常，远端已有 ${COUNT} 份归档，可用空间 ${FREE}，保留上限 ${RETENTION_COUNT}"
  echo "OK：远端可写，已有 ${COUNT} 份归档，可用 ${FREE}，保留上限 ${RETENTION_COUNT} 份"
  exit 0
fi

# ---------- 模式：verify ----------
if [ "$MODE" = "--verify" ]; then
  TOTAL=0; BAD=0
  # 以本机归档索引为准（launchd 环境下对 SMB 卷的目录遍历不可靠，按文件名精确访问才稳）
  if [ -f "$INDEX_FILE" ]; then
    while IFS=, read -r _ts name _sha _size; do
      [ "$_ts" = "time" ] && continue
      [ -n "$name" ] || continue
      f="${REMOTE_DIR}/${name}"
      TOTAL=$((TOTAL + 1))
      if [ -e "$f" ] && pg_restore --list "$f" >/dev/null 2>&1; then
        log "VERIFY OK：${name}"
      else
        BAD=$((BAD + 1))
        log "VERIFY FAILED：${name} 缺失或不可读"
      fi
    done < "$INDEX_FILE" || true
  else
    log "VERIFY：索引缺失，退回目录遍历"
    for f in "$REMOTE_DIR"/topems_prod-*.dump; do
      [ -e "$f" ] || continue
      TOTAL=$((TOTAL + 1))
      if pg_restore --list "$f" >/dev/null 2>&1; then
        log "VERIFY OK：$(basename "$f")"
      else
        BAD=$((BAD + 1))
        log "VERIFY FAILED：$(basename "$f") 不可读"
      fi
    done
  fi
  if [ "$BAD" -eq 0 ]; then
    log "VERIFY 汇总：${TOTAL} 份全部可读"
    echo "OK：${TOTAL} 份归档全部可读"
  else
    fail "校验发现 ${BAD}/${TOTAL} 份归档损坏"
  fi
  exit 0
fi

# ---------- 模式：copy ----------
LATEST=$(find "$BACKUP_DIR" -maxdepth 1 -name 'topems_prod-*.dump' -type f 2>/dev/null | sort -r | head -1) || LATEST=""
[ -n "$LATEST" ] || fail "未找到任何 dump（${BACKUP_DIR}）"
NAME=$(basename "$LATEST")

# 归档前先验本机这份是否完好
pg_restore --list "$LATEST" >/dev/null 2>&1 || fail "本机副本不可读：${NAME}"

DEST="${REMOTE_DIR}/${NAME}"
if [ -f "$DEST" ]; then
  log "SKIP：远端已存在 ${NAME}"
  echo "SKIP：${NAME} 已归档"
else
  TMP="${DEST}.part"
  cp "$LATEST" "$TMP" || fail "拷贝失败：${NAME}"
  mv "$TMP" "$DEST" || fail "远端落盘失败：${NAME}"

  LOCAL_SHA=$(shasum -a 256 "$LATEST" | awk '{print $1}')
  REMOTE_SHA=$(shasum -a 256 "$DEST" | awk '{print $1}')
  [ "$LOCAL_SHA" = "$REMOTE_SHA" ] || fail "校验不一致：${NAME}（本机 ${LOCAL_SHA} / 远端 ${REMOTE_SHA}）"
  pg_restore --list "$DEST" >/dev/null 2>&1 || fail "远端副本不可读：${NAME}"

  SIZE=$(du -h "$DEST" | awk '{print $1}')
  if [ ! -f "$INDEX_FILE" ]; then
    echo "time,file,sha256,size" >> "$INDEX_FILE"
  fi
  echo "$(date -Iseconds),${NAME},${LOCAL_SHA},${SIZE}" >> "$INDEX_FILE"

  log "OK：已归档 ${NAME}（${SIZE}，sha256 ${LOCAL_SHA}）"
  echo "OK：已归档 ${NAME}（${SIZE}）"
fi

# ---------- 顺带归档最新配置快照（体积 < 2 MB，随周任务一起走） ----------
CONF_DIR="$HOME/topems/backups/config"
CONF_LATEST=$(find "$CONF_DIR" -maxdepth 1 -name 'config-snapshot-*.tar.gz' -type f 2>/dev/null | sort -r | head -1) || CONF_LATEST=""
if [ -n "$CONF_LATEST" ]; then
  CONF_REMOTE_DIR="${REMOTE_DIR}/config"
  mkdir -p "$CONF_REMOTE_DIR"
  CN=$(basename "$CONF_LATEST")
  if [ -f "${CONF_REMOTE_DIR}/${CN}" ]; then
    log "SKIP：配置快照 ${CN} 已存在"
  else
    cp "$CONF_LATEST" "${CONF_REMOTE_DIR}/${CN}.part" \
      && mv "${CONF_REMOTE_DIR}/${CN}.part" "${CONF_REMOTE_DIR}/${CN}" \
      || fail "配置快照归档失败：${CN}"
    log "OK：已归档配置快照 ${CN}"
    echo "OK：已归档配置快照 ${CN}"
  fi
  ls -t "$CONF_REMOTE_DIR"/config-snapshot-*.tar.gz 2>/dev/null \
    | tail -n +9 | while IFS= read -r oldc; do
        rm -f "$oldc" && log "PRUNE：配置快照 $(basename "$oldc")"
      done || true
fi

# ---------- 保留策略：只留最近 N 份 ----------
PRUNED=0
while IFS= read -r old; do
  [ -n "$old" ] || continue
  if rm -f "$old"; then
    PRUNED=$((PRUNED + 1))
    log "PRUNE：删除过期归档 $(basename "$old")"
  fi
done < <(ls -t "$REMOTE_DIR"/topems_prod-*.dump 2>/dev/null | tail -n +$((RETENTION_COUNT + 1))) || true
if [ "$PRUNED" -gt 0 ]; then
  echo "已清理 ${PRUNED} 份过期归档（保留 ${RETENTION_COUNT} 份）"
fi

TOTAL=$(grep -c '^[0-9]' "$INDEX_FILE" 2>/dev/null) || TOTAL=0
log "完成：远端现有 ${TOTAL} 份归档"

exit 0
