#!/usr/bin/env bash
# ============================================================================
# TopEMS nginx 生产 conf → 本机演练 conf 生成器（A1）
#
# 生产 conf（deploy/nginx/topems.conf）含平台专属/环境专属指令，本机 macOS
# nginx 无法直接加载。P0-3 双轨合一后唯一对外入口为 upstream server_service
# -> localhost:8099（无前缀 map 路由表）。本脚本生成等价演练 conf，用于
# 在本机完成加载 + upstream 8099 校验 + 冒烟。
#
# 根因（2026-10-07 实测定位）：
#   1. `user www-data;`        → macOS 无此用户（getpwnam 失败）→ 删除
#   2. `use epoll;`             → macOS 事件模型为 kqueue → 删除（默认 kqueue）
#   3. `pid /run/nginx.pid`     → macOS 无 /run → 指向本机前缀
#   4. `include /etc/nginx/mime.types` → brew 路径
#   5. `ssl_certificate /etc/nginx/certs/*.pem` → 自签证书路径
#   6. upstream 端口（8000-8096）→ 统一 localhost:8099（monolith 统一入口）
#   7. `brotli` 指令            → brew nginx 无 brotli 模块 → 删除
#
# 用法：
#   bash scripts/gen-nginx-drill-conf.sh [输出目录]  # 默认 /tmp/topems-nginx-dev
# 输出：topems-drill.conf + certs/（自签）+ html/index.html
# ============================================================================
set -euo pipefail
OUT="${1:-/tmp/topems-nginx-dev}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/deploy/nginx/topems.conf"

mkdir -p "$OUT/certs" "$OUT/html"
echo "ok" > "$OUT/html/index.html"

# 自签证书（30 天，CN=localhost + SAN）
if [[ ! -f "$OUT/certs/fullchain.pem" ]]; then
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$OUT/certs/privkey.pem" -out "$OUT/certs/fullchain.pem" -days 30 \
    -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null
  cp "$OUT/certs/fullchain.pem" "$OUT/certs/chain.pem"
fi

cp "$SRC" "$OUT/topems-drill.conf"
python3 - "$OUT" <<'PYEOF'
import pathlib, re, sys
out = sys.argv[1]
p = pathlib.Path(f"{out}/topems-drill.conf")
s = p.read_text()
s = s.replace("user www-data;\n", "")                       # 1
s = s.replace("    use epoll;\n", "")                       # 2
s = s.replace("pid /run/nginx.pid;", "pid %s/nginx.pid;" % out)  # 3
s = s.replace("include /etc/nginx/mime.types;", "include /opt/homebrew/etc/nginx/mime.types;")  # 4
s = s.replace("/etc/nginx/certs/", "%s/certs/" % out)       # 5
s = re.sub(r"(server localhost:)\d+", r"\g<1>8099", s)      # 6
s = re.sub(r"^[ \t]*brotli[^;]*;[ \t]*\n", "", s, flags=re.M)  # 7
s = s.replace("root /usr/share/nginx/html;", "root %s/html;" % out)
# 8: nginx >=1.25.1 建议独立 http2 指令；本机 1.31 对 listen ... http2 报 deprecated warn
s = re.sub(r"^([ \t]*)listen\s+443 ssl http2;[ \t]*\n", r"\1listen 443 ssl;\n\1http2 on;\n", s, flags=re.M)
# 9: 本机自签证书无 OCSP responder，ssl_stapling on/verify 报 warn → 演练关掉（生产正式证书保留 on）
s = re.sub(r"^([ \t]*)(ssl_stapling(?:_verify)?)\s+on;[ \t]*\n", r"\1\2 off;\n", s, flags=re.M)
p.write_text(s)
print(f"drill conf: {out}/topems-drill.conf (upstream server_service -> localhost:8099)")
PYEOF
echo "生成完成：$OUT/topems-drill.conf（nginx -t -c 校验 + nginx -c 启动后跑 verify-nginx-prod.sh --insecure）"
