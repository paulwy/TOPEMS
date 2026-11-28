#!/usr/bin/env bash
# =============================================================================
# WMS RLS 主动只读探针（生产只读 / GET only）
#
# 目的：在零流量、WMS 业务表 0 行时，回答「读回 0 行」到底是「表为空」还是
#       「被 RLS 挡住」。做法分四层：
#   A. HTTP 契约矩阵：无 token / 超户缺租户头 / 非超户 / 超户+租户头 / 非超户伪造租户头
#   B. 执行证据：请求前后 pg_stat_user_tables 扫描计数增量 —— 证明查询确实打到了表上
#   C. 运行时差分：以应用角色（非超户、非表属主特权）在只读事务里对比
#      无 GUC / 租户 A / 租户 B / 系统通道 四种上下文，用 ehs.safety_hazards（有 1 行）
#      验证 fail-closed 谓词真的在过滤；WMS 表本身为空，只验证机制不验证数据
#   D. 形状与角色：39/39/0/39/38、策略谓词、应用角色非 super/bypassrls、窗口内 RLS 违例=0
#
# 运行位置：xingzhai 生产本机（127.0.0.1:8099 / unix socket），人工执行，非常驻。
# 只读保证：
#   - HTTP 仅 GET，无任何写接口；不修改配置、不重启服务
#   - SQL 全部为 SELECT / pg_catalog / pg_stat_*，以及 BEGIN READ ONLY ... ROLLBACK
# 用法：
#   bash wms-rls-probe.sh
#   BASE=http://127.0.0.1:8099 TENANT_A=<uuid> bash wms-rls-probe.sh
# 退出码：0 全通过；非 0 为失败项数量
# =============================================================================
set -u

BASE="${BASE:-http://127.0.0.1:8099}"
PSQL="${PSQL:-/opt/homebrew/bin/psql}"
DB="${DB:-topems_prod}"
APP_ROLE="${APP_ROLE:-topems_prod}"
PLIST="${PLIST:-$HOME/Library/LaunchAgents/com.topems.server.plist}"
PGLOG="${PGLOG:-/opt/homebrew/var/log/postgresql@18.log}"
TENANT_A="${TENANT_A:-00000000-0000-0000-0000-000000000001}"
TENANT_B="${TENANT_B:-11111111-1111-1111-1111-111111111111}"
# 非超户探针主体：必须是库中真实存在、非超户、挂在 TENANT_A 下、角色含 wms:read 的账号
# （非超户请求的权限由服务端授权表按 user_id 解析，token 内的 permissions 不生效）
PROBE_USER="${PROBE_USER:-0d000000-0000-4000-8000-000000000001}"
PROBE_USERNAME="${PROBE_USERNAME:-tenant_admin}"

TMP="$(mktemp -d /tmp/wms-probe.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0
WARN=0
START_PG="$(date '+%Y-%m-%d %H:%M:%S')"

ok()   { PASS=$((PASS + 1)); printf '[PASS] %s\n' "$*"; }
bad()  { FAIL=$((FAIL + 1)); printf '[FAIL] %s\n' "$*"; }
warn() { WARN=$((WARN + 1)); printf '[WARN] %s\n' "$*"; }

echo "# WMS RLS 主动只读探针"
echo "# 库身份: ${DB} @ $(hostname) (应用角色 ${APP_ROLE})"
echo "# 起跑: ${START_PG}  基址: ${BASE}  租户A: ${TENANT_A}  租户B: ${TENANT_B}"
echo

# -----------------------------------------------------------------------------
# 0. 令牌：从 launchd plist 读取 JWT_SECRET，现场签发 15 分钟探针令牌（不落盘打印）
# -----------------------------------------------------------------------------
if [ ! -f "$PLIST" ]; then
  bad "找不到 plist: $PLIST"
  echo "RESULT: FAIL"
  exit 1
fi
if ! python3 - "$PLIST" "$TENANT_A" "$PROBE_USER" "$PROBE_USERNAME" "$TMP" <<'PY'
import base64, hashlib, hmac, json, plistlib, sys, time, uuid

plist, tenant_a, probe_user, probe_username, out = sys.argv[1:6]
with open(plist, "rb") as f:
    secret = plistlib.load(f)["EnvironmentVariables"]["JWT_SECRET"].encode()


def b64(raw: bytes) -> bytes:
    return base64.urlsafe_b64encode(raw).rstrip(b"=")


def mint(name: str, claims: dict) -> None:
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64(json.dumps(claims, separators=(",", ":")).encode())
    sig = b64(hmac.new(secret, b".".join([head, body]), hashlib.sha256).digest())
    with open(f"{out}/{name}.tok", "wb") as f:
        f.write(b".".join([head, body, sig]))


now = int(time.time())
base = {
    "sub": probe_user,
    "username": probe_username,
    "role": "admin",
    "roles": ["admin"],
    "permissions": [],
    "is_superuser": False,
    "iat": now,
    "exp": now + 900,
    "must_change_password": False,
}
mint("user_a", dict(base, tenant_id=tenant_a))
mint("user_none", dict(base))
# 超户：tenant_id 省略，由中间件从 x-tenant-id 解析；缺头应 400
mint("super", dict(base, sub=str(uuid.uuid4()), username="probe_super",
                   permissions=["*"], is_superuser=True))
PY
then
  bad "令牌签发失败（plist 无 JWT_SECRET 或 python3 异常）"
  echo "RESULT: FAIL"
  exit 1
fi
TOK_USER="$(cat "$TMP/user_a.tok")"
TOK_NONE="$(cat "$TMP/user_none.tok")"
TOK_SUPER="$(cat "$TMP/super.tok")"
ok "令牌签发：非超户($PROBE_USERNAME@$TENANT_A) / 无租户非超户 / 超户"

# 非超户探针主体前置校验：真实、非超户、启用、挂 TENANT_A、角色含 wms:read
preflight="$("$PSQL" -d "$DB" -X -A -F'|' -t -c "
select u.id||'|'||case when u.is_superuser then 't' else 'f' end||'|'||u.status||'|'||
       coalesce(tu.tenant_id::text,'-')||'|'||
       count(p.id) filter (where p.code='wms:read')
  from iam.users u
  left join public.core_tenant_users tu on tu.user_id=u.id
  left join public.core_user_roles ur on ur.user_id=u.id
  left join public.core_role_permissions rp on rp.role_id=ur.role_id
  left join public.core_permissions p on p.id=rp.permission_id
 where u.id='$PROBE_USER'
 group by u.id,u.is_superuser,u.status,tu.tenant_id" 2>/dev/null | tr -d ' ')"
want="$PROBE_USER|f|active|$TENANT_A|1"
if [ "$preflight" = "$want" ]; then
  ok "非超户主体校验通过: $PROBE_USERNAME 非超户/启用/租户A/含 wms:read"
else
  bad "非超户主体校验失败: 实际[$preflight] 期望[$want]（换 PROBE_USER 或先修授权）"
  echo "RESULT: FAIL"
  exit "$FAIL"
fi

# -----------------------------------------------------------------------------
# 1. 覆盖入口：WMS 列表类 GET（39 张表中可无参读取的入口）
# -----------------------------------------------------------------------------
cat > "$TMP/eps" <<'EOF'
/api/wms/dashboard
/api/wms/warehouses
/api/wms/locations
/api/wms/inventory
/api/wms/inventory/statistics
/api/wms/inventory/low-stock
/api/wms/batches
/api/wms/batches/statistics
/api/wms/inbound-orders
/api/wms/outbound-orders
/api/wms/transfers
/api/wms/cycle-counts
/api/wms/stock-takes
/api/wms/wave-picks
/api/wms/inventory-alerts
/api/wms/inventory-alerts/statistics
/api/wms/inventory-alerts/rules
/api/wms/inventory-alerts/records
/api/wms/inventory-movements
/api/wms/serial-numbers
/api/wms/serial-numbers/statistics
/api/wms/audit-logs
/api/wms/slotting/zones
/api/wms/slotting/rules
/api/wms/slotting/suggestions
/api/wms/picking/lists
/api/wms/labor/efficiency
/api/wms/analytics/flow-trend
/api/wms/analytics/dashboard-summary
EOF

snap() {
  # 统计视图有 flush 延迟，先强制刷一次再取快照，否则增量会串到下一个请求窗口
  "$PSQL" -d "$DB" -X -A -t -c "select pg_stat_force_next_flush()" >/dev/null 2>&1
  sleep 0.05
  "$PSQL" -d "$DB" -X -A -F'|' -t -c \
    "select relname, coalesce(seq_scan,0)+coalesce(idx_scan,0) from pg_stat_user_tables where schemaname='wms' order by 1" 2>/dev/null
}

is_unscoped_pool() {
  # 已逐行核对（2a3da1cff）：只有 flow-trend 直接用 &state.db 且无任何租户 GUC；
  # serial-numbers 两处走请求事务 txn_arc，dashboard-summary 走 scope_read_for_tenant，均有 GUC。
  case "$1" in
    /api/wms/analytics/flow-trend) return 0 ;;
    *) return 1 ;;
  esac
}

digest() {
  python3 - "$1" <<'PY'
import json, sys
try:
    body = json.load(open(sys.argv[1]))
except Exception:
    print("body=非JSON")
    sys.exit()
d = body.get("data")
if isinstance(d, dict) and isinstance(d.get("items"), list):
    print("items=%d total=%s" % (len(d["items"]), d.get("total")))
elif isinstance(d, list):
    print("items=%d" % len(d))
elif isinstance(d, dict):
    print("keys=" + ",".join(list(d.keys())[:6]))
else:
    print("code=%s msg=%s" % (body.get("code"), str(body.get("message"))[:40]))
PY
}

# -----------------------------------------------------------------------------
# 2. HTTP 矩阵 + 扫描计数增量
# -----------------------------------------------------------------------------
snap > "$TMP/s_all1"
while IFS= read -r ep; do
  [ -z "$ep" ] && continue
  url="$BASE$ep"
  c0=$(curl -s -o "$TMP/b0" -m 8 -w '%{http_code}' "$url")
  c1=$(curl -s -o "$TMP/b1" -m 8 -w '%{http_code}' -H "Authorization: Bearer $TOK_SUPER" "$url")
  c2=$(curl -s -o "$TMP/b2" -m 8 -w '%{http_code}' -H "Authorization: Bearer $TOK_USER" "$url")
  c3=$(curl -s -o "$TMP/b3" -m 8 -w '%{http_code}' -H "Authorization: Bearer $TOK_SUPER" -H "x-tenant-id: $TENANT_A" "$url")
  c4=$(curl -s -o "$TMP/b4" -m 8 -w '%{http_code}' -H "Authorization: Bearer $TOK_USER" -H "x-tenant-id: $TENANT_B" "$url")

  d_user="$(digest "$TMP/b2")"
  d_super="$(digest "$TMP/b3")"

  good=1
  [ "$c0" = "401" ] || { bad "$ep 无token=$c0 期望401"; good=0; }
  [ "$c1" = "400" ] || { bad "$ep 超户缺租户头=$c1 期望400"; good=0; }
  [ "$c2" = "200" ] || { bad "$ep 非超户=$c2 期望200 $(head -c 80 "$TMP/b2")"; good=0; }
  [ "$c3" = "200" ] || { bad "$ep 超户+租户头=$c3 期望200 $(head -c 80 "$TMP/b3")"; good=0; }
  [ "$c4" = "200" ] || { bad "$ep 非超户+伪造头=$c4 期望200 $(head -c 80 "$TMP/b4")"; good=0; }

  if [ "$c2" = "200" ] && [ "$c4" = "200" ] && [ "$d_user" != "$(digest "$TMP/b4")" ]; then
    bad "$ep 非超户伪造 x-tenant-id 改变了返回（$d_user vs $(digest "$TMP/b4")）"
    good=0
  fi

  if [ "$good" = "1" ]; then
    if is_unscoped_pool "$ep"; then
      warn "$ep [无租户作用域] 401/400/200/200/200 非超户[$d_user] 超户[$d_super]：裸池无 GUC，FORCE RLS 下必然读空（功能已坏，非泄漏）"
    else
      ok "$ep 401/400/200/200/200 非超户[$d_user] 超户[$d_super]"
    fi
  fi
done < "$TMP/eps"
sleep 1.2
snap > "$TMP/s_all2"

echo
echo "# 扫描覆盖（整个探针窗口累计，wms 39 张表）"
awk -F'|' 'NR==FNR { a[$1]=$2; next } { d=$2-a[$1]+0; if (d>0) { print "  " $1 "(+" d ")"; n++ } } END { print "  覆盖表数=" n+0 "/39" }' "$TMP/s_all1" "$TMP/s_all2"
echo "# 未被任何 GET 入口触达的表："
awk -F'|' 'NR==FNR { a[$1]=$2; next } { if ($2-a[$1]+0 <= 0) print "  " $1 }' "$TMP/s_all1" "$TMP/s_all2"

# 非超户、claims 无 tenant_id：中间件必须 400，不能退回随机租户或系统通道
c_nt=$(curl -s -o "$TMP/bnt" -m 8 -w '%{http_code}' -H "Authorization: Bearer $TOK_NONE" "$BASE/api/wms/inventory")
if [ "$c_nt" = "400" ]; then
  ok "非超户缺 tenant_id → 400（拒绝进入随机租户兜底）"
else
  bad "非超户缺 tenant_id → $c_nt 期望 400"
fi

# -----------------------------------------------------------------------------
# 3. 形状、角色、运行时差分
# -----------------------------------------------------------------------------
shape="$("$PSQL" -d "$DB" -X -A -F'|' -t -c "
select (select count(*) from pg_policies where schemaname='wms')||'|'||
       (select count(*) from pg_policies where schemaname='wms' and qual='true' and with_check='true')||'|'||
       (select count(*) from pg_policies where schemaname='wms' and policyname like 'wms_allow_all_%')||'|'||
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='wms' and c.relkind='r' and c.relrowsecurity)||'|'||
       (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='wms' and c.relkind='r' and c.relforcerowsecurity)" 2>/dev/null)"
if [ "$shape" = "39|0|0|39|38" ]; then
  ok "策略形状 pols|tt|old|rls|frc = $shape"
else
  bad "策略形状偏离: $shape 期望 39|0|0|39|38"
fi

role_attr="$("$PSQL" -d "$DB" -X -A -F'|' -t -c \
  "select case when rolsuper then 't' else 'f' end||'|'||case when rolbypassrls then 't' else 'f' end from pg_roles where rolname='$APP_ROLE'" 2>/dev/null | tr -d ' ')"
if [ "$role_attr" = "f|f" ]; then
  ok "应用角色 $APP_ROLE 非 super / 非 bypassrls（RLS 生效）"
else
  bad "应用角色 $APP_ROLE super|bypassrls=$role_attr 期望 f|f（RLS 会被绕过）"
fi

echo
echo "# 运行时差分（应用角色 ${APP_ROLE}，只读事务）"
"$PSQL" -U "$APP_ROLE" -d "$DB" -X -A -F'|' -t -v ON_ERROR_STOP=1 > "$TMP/diff" 2>&1 <<SQL
begin read only;
select 'ehs_noguc', count(*) from ehs.safety_hazards;
select 'wms_inv_noguc', count(*) from wms.inventory;
select 'wms_ledger_noguc', count(*) from wms.schema_defense_ledger;
rollback;
begin read only;
select set_config('app.tenant_id','$TENANT_A',true), set_config('app.rls_system','off',true) is not null;
select 'ehs_tenantA', count(*) from ehs.safety_hazards;
select 'wms_inv_tenantA', count(*) from wms.inventory;
rollback;
begin read only;
select set_config('app.tenant_id','$TENANT_B',true), set_config('app.rls_system','off',true) is not null;
select 'ehs_tenantB', count(*) from ehs.safety_hazards;
rollback;
begin read only;
select set_config('app.tenant_id','$TENANT_A',true), set_config('app.rls_system','on',true) is not null;
select 'ehs_system', count(*) from ehs.safety_hazards;
select 'wms_inv_system', count(*) from wms.inventory;
rollback;
SQL
grep -E '^(ehs_|wms_)' "$TMP/diff" | sed 's/^/  /'

val() { awk -F'|' -v k="$1" '$1==k {print $2}' "$TMP/diff" | head -1; }

[ "$(val ehs_noguc)" = "0" ]   && ok "ehs 无 GUC → 0 行（fail-closed）"        || bad "ehs 无 GUC → $(val ehs_noguc) 期望 0"
[ "$(val ehs_tenantA)" = "1" ] && ok "ehs 租户A → 1 行（本租户可见）"          || bad "ehs 租户A → $(val ehs_tenantA) 期望 1"
[ "$(val ehs_tenantB)" = "0" ] && ok "ehs 租户B → 0 行（跨租户不可见）"        || bad "ehs 租户B → $(val ehs_tenantB) 期望 0"
[ "$(val ehs_system)" = "1" ]  && ok "ehs 系统通道 → 1 行（超户全量通道）"      || bad "ehs 系统通道 → $(val ehs_system) 期望 1"
[ "$(val wms_inv_noguc)" = "0" ] && ok "wms.inventory 无 GUC → 0 行（符合 fail-closed；表本身为空）" || bad "wms.inventory 无 GUC → $(val wms_inv_noguc)"
if [ "$(val wms_ledger_noguc)" = "1" ]; then
  warn "wms.schema_defense_ledger 无 GUC 仍读到 1 行：该表无 FORCE RLS（属主 topems_prod 绕过），属已知例外（全局账本表，无 tenant_id）"
else
  warn "wms.schema_defense_ledger 无 GUC → $(val wms_ledger_noguc) 行（与预期 1 不同，复核 FORCE 设置）"
fi

# -----------------------------------------------------------------------------
# 4. 窗口内 RLS 违例
# -----------------------------------------------------------------------------
viol="$(awk -v s="$START_PG" '/violates row-level security policy/ { if ($1 " " $2 >= s) c++ } END { print c+0 }' "$PGLOG" 2>/dev/null)"
if [ "$viol" = "0" ]; then
  ok "探针窗口内 RLS 违例 0 条"
else
  bad "探针窗口内 RLS 违例 $viol 条"
  awk -v s="$START_PG" '/violates row-level security policy/ && ($1 " " $2 >= s) { print }' "$PGLOG" | tail -5 | sed 's/^/  /'
fi

echo
echo "SUMMARY pass=$PASS fail=$FAIL warn=$WARN"
if [ "$FAIL" -eq 0 ]; then
  echo "RESULT: PASS"
else
  echo "RESULT: FAIL"
fi
exit "$FAIL"
