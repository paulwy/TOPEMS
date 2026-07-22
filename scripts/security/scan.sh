#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

EXIT_CODE=0
SUMMARY_FILE=$(mktemp)
PATTERNS_FILE=$(mktemp)
SECRET_MATCHES=$(mktemp)
PNPM_AUDIT_OUT=$(mktemp)
trap 'rm -f "$SUMMARY_FILE" "$PATTERNS_FILE" "$SECRET_MATCHES" "$PNPM_AUDIT_OUT"' EXIT

append() {
  echo "$*" >> "$SUMMARY_FILE"
}

append "# Security Scan Summary"
append ""
append "| Check | Status | Details |"
append "|-------|--------|---------|"

# Rust dependency audit
rust_status="✅ Passed"
rust_details="No vulnerabilities reported"
if ! command -v cargo-audit &>/dev/null; then
  rust_status="⚠️ Skipped"
  rust_details="cargo-audit is not installed"
elif [ ! -f Cargo.lock ]; then
  rust_status="⚠️ Skipped"
  rust_details="Cargo.lock not found"
else
  set +e
  rust_output=$(cargo audit --json 2>&1)
  rust_exit=$?
  set -e

  set +e
  severity_exit=$(echo "$rust_output" | python3 -c '
import sys, json
data = sys.stdin.read().strip()
if not data:
    sys.exit(0)
try:
    d = json.loads(data)
except Exception:
    sys.exit(12)
vulns = d.get("vulnerabilities", {}).get("list", [])
sevs = set((v.get("advisory", {}).get("severity") or "").lower() for v in vulns if v.get("advisory", {}).get("severity"))
if not sevs and not vulns:
    sys.exit(0)
if not sevs and vulns:
    sys.exit(11)
if "critical" in sevs or "high" in sevs:
    sys.exit(10)
sys.exit(11)
' 2>&1)
  sev_code=$?
  set -e

  if [ "$sev_code" -eq 10 ]; then
    rust_status="❌ Failed"
    rust_details="HIGH/CRITICAL vulnerabilities found"
    EXIT_CODE=1
  elif [ "$sev_code" -eq 11 ]; then
    rust_status="⚠️ Warning"
    rust_details="Vulnerabilities found, but none HIGH/CRITICAL"
  elif [ "$sev_code" -eq 12 ]; then
    if echo "$rust_output" | grep -qiE 'Severity:[[:space:]]*(high|critical)'; then
      rust_status="❌ Failed"
      rust_details="HIGH/CRITICAL vulnerabilities reported"
      EXIT_CODE=1
    elif [ "$rust_exit" -ne 0 ]; then
      rust_status="⚠️ Warning"
      rust_details="cargo audit reported issues (severity unclear)"
    fi
  fi
fi
append "| Rust Audit | $rust_status | $rust_details |"
append ""

# Node.js dependency audit
node_status="✅ Passed"
node_details="No high-severity vulnerabilities in production dependencies"
if ! command -v pnpm &>/dev/null; then
  node_status="⚠️ Skipped"
  node_details="pnpm is not installed"
elif [ ! -f package.json ]; then
  node_status="⚠️ Skipped"
  node_details="package.json not found"
else
  set +e
  pnpm audit --prod --audit-level=high > "$PNPM_AUDIT_OUT" 2>&1
  node_exit=$?
  set -e
  if [ "$node_exit" -ne 0 ]; then
    if grep -qiE 'audit endpoint.*not exist|does not have an implementation of audit|doesn.t have an implementation of audit|private npm registry' "$PNPM_AUDIT_OUT"; then
      node_status="⚠️ Skipped"
      node_details="pnpm audit unavailable (private/unsupported registry)"
    else
      node_status="❌ Failed"
      node_details="pnpm audit reported HIGH/CRITICAL vulnerabilities"
      EXIT_CODE=1
    fi
  fi
  cat "$PNPM_AUDIT_OUT"
fi
append "| Node Audit | $node_status | $node_details |"
append ""

# Secret scanning
cat > "$PATTERNS_FILE" <<'EOF'
AKIA[0-9A-Z]{16}
-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----
[a-zA-Z0-9_+-]+://[^/]*:[^/]*@
(api[_-]?key|apikey|secret|token|password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{8,}["']
EOF

secret_status="✅ Passed"
secret_details="No secrets detected"

if [ -d .git ]; then
  set +e
  git grep -I -nE -f "$PATTERNS_FILE" -- ':!scripts/security/scan.sh' ':!*.lock' ':!*.log' > "$SECRET_MATCHES"
  grep_exit=$?
  set -e
  if [ "$grep_exit" -eq 0 ]; then
    secret_status="⚠️ Warning"
    secret_details="Potential secrets found (see logs)"
    match_count=$(wc -l < "$SECRET_MATCHES")
    echo ""
    echo "## Secret Scan Findings ($match_count total)"
    head -n 100 "$SECRET_MATCHES"
    if [ "$match_count" -gt 100 ]; then
      echo "... and $((match_count - 100)) more matches"
    fi

    set +e
    python3 - "$SECRET_MATCHES" <<'PY'
import re, sys
aws_re = re.compile(r'AKIA[0-9A-Z]{16}')
begin_re = re.compile(r'-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----')
end_re = re.compile(r'-----END (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----')
b64_re = re.compile(r'^[A-Za-z0-9+/=\s]{40,}$')

critical = False
with open(sys.argv[1], 'r', errors='ignore') as fh:
    for line in fh:
        line = line.rstrip('\n')
        if aws_re.search(line):
            critical = True
            break
        if begin_re.search(line):
            parts = line.split(':', 2)
            if len(parts) < 2:
                continue
            filepath = parts[0]
            try:
                lineno = int(parts[1])
            except ValueError:
                continue
            try:
                with open(filepath, 'r', errors='ignore') as src:
                    lines = src.readlines()
            except Exception:
                continue
            start = max(0, lineno - 1)
            end = min(len(lines), lineno + 50)
            saw_b64 = False
            saw_end = False
            for i in range(start, end):
                l = lines[i]
                if b64_re.match(l.strip()):
                    saw_b64 = True
                if end_re.search(l):
                    saw_end = True
                    break
            if saw_b64 and saw_end:
                critical = True
                break
sys.exit(1 if critical else 0)
PY
    critical_exit=$?
    set -e
    if [ "$critical_exit" -eq 1 ]; then
      secret_status="❌ Failed"
      secret_details="Critical secrets (private key / AWS key) detected"
      EXIT_CODE=1
    fi
  fi
else
  secret_status="⚠️ Skipped"
  secret_details="Not a git repository"
fi
append "| Secret Scan | $secret_status | $secret_details |"
append ""

# .env files in git tracked files
env_status="✅ Passed"
env_details="No .env files tracked by git"
if [ -d .git ]; then
  set +e
  env_files=$(git ls-files | grep -E '\.env' || true)
  set -e
  if [ -n "$env_files" ]; then
    env_status="⚠️ Warning"
    env_details=".env files found in git tracked files"
    echo ""
    echo "## Tracked .env Files"
    echo "$env_files"
  fi
else
  env_status="⚠️ Skipped"
  env_details="Not a git repository"
fi
append "| Env Files | $env_status | $env_details |"
append ""

append "---"
if [ "$EXIT_CODE" -eq 0 ]; then
  append "**Result:** ✅ No HIGH/CRITICAL security issues detected."
else
  append "**Result:** ❌ HIGH/CRITICAL security issues detected."
fi

cat "$SUMMARY_FILE"
exit "$EXIT_CODE"
