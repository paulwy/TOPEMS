#!/usr/bin/env bash
# Migration validation script for TOPEMS
# Checks filename format, version ordering, idempotency, down migrations,
# checksums, and optional schema drift via DATABASE_URL.
#
# Designed to be portable across bash 3.2+ (macOS) and bash 4+ (Linux).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION_DIRS=(
  "database/migrations"
  "migrations"
)
# Service-level migrations
while IFS= read -r -d '' svc_dir; do
  MIGRATION_DIRS+=("${svc_dir#"$REPO_ROOT"/}")
done < <(find "$REPO_ROOT/svc" -mindepth 2 -maxdepth 2 -type d -name migrations -print0 2>/dev/null | sort -z)

CHECKSUM_FILE="database/migrations/checksums.txt"
CHECKSUM_PATH="$REPO_ROOT/$CHECKSUM_FILE"

# Counters and collectors
ERRORS=0
WARNINGS=0
INVALID_FILES=()
ORDER_ISSUES=()
IDEMPOTENCY_WARNINGS=()
DOWN_MIGRATION_WARNINGS=()
CHECKSUM_ERRORS=()
SCHEMA_DRIFT=()

# Terminal colors
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED=''
  YELLOW=''
  GREEN=''
  BLUE=''
  NC=''
fi

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; WARNINGS=$((WARNINGS + 1)); }
log_err()  { echo -e "${RED}[ERR]${NC}  $*"; ERRORS=$((ERRORS + 1)); }

# Normalize path to repo-relative
rel_path() {
  local path="$1"
  echo "${path#"$REPO_ROOT"/}"
}

# Extract version/timestamp from filename
extract_version() {
  local name="$1"
  # Timestamp: YYYYMMDDhhmmss
  if [[ "$name" =~ ^([0-9]{14})_.*\.sql$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  # Legacy sequential: NNN-name.sql or NNN_name.sql
  if [[ "$name" =~ ^([0-9]{3})[-_].*\.sql$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  # Special files like rls_remaining_tables.sql get no version
  echo ""
}

# Check if filename is a valid migration file
is_valid_migration_name() {
  local name="$1"
  [[ "$name" =~ ^[0-9]{14}_.*\.sql$ ]] || \
  [[ "$name" =~ ^[0-9]{3}[-_].*\.sql$ ]] || \
  [[ "$name" =~ ^rls_.*\.sql$ ]]
}

# Check idempotency keywords in file content
check_idempotency() {
  local file="$1"
  local lowered
  lowered="$(tr '[:upper:]' '[:lower:]' < "$file")"

  if [[ "$lowered" =~ if[[:space:]]+not[[:space:]]+exists ]] || \
     [[ "$lowered" =~ create[[:space:]]+or[[:space:]]+replace ]] || \
     [[ "$lowered" =~ drop[[:space:]]+table[[:space:]]+if[[:space:]]+exists ]] || \
     [[ "$lowered" =~ \$\$[[:space:]]*(declare|begin) ]]; then
    return 0
  fi
  return 1
}

# Compute sha256 of a file
sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Look up a previous checksum by relative path
get_prev_checksum() {
  local rel="$1"
  if [[ -f "$CHECKSUM_PATH" ]]; then
    grep -F "  $rel" "$CHECKSUM_PATH" 2>/dev/null | awk '{print $1}' | tail -n 1
  fi
}

# Main
log_info "TOPEMS Migration Validator"
log_info "Repository root: $REPO_ROOT"
log_info "Scanning migration directories..."

TOTAL_FILES=0
VALID_FILES=()

for dir in "${MIGRATION_DIRS[@]}"; do
  full_dir="$REPO_ROOT/$dir"
  [[ -d "$full_dir" ]] || continue
  log_info "Checking $dir"

  # Gather .sql files (exclude backups)
  files=()
  while IFS= read -r -d '' f; do
    files+=("$f")
  done < <(find "$full_dir" -maxdepth 1 -type f \( -name '*.sql' \) ! -name '*.backup' ! -name '*.sql.backup' -print0 | sort -z)

  for file in "${files[@]}"; do
    name="$(basename "$file")"
    rel="$(rel_path "$file")"
    TOTAL_FILES=$((TOTAL_FILES + 1))
    VALID_FILES+=("$rel")

    # Filename format check
    if ! is_valid_migration_name "$name"; then
      INVALID_FILES+=("$rel")
      log_err "Invalid filename: $rel"
      continue
    fi
  done
done

if [[ ${#INVALID_FILES[@]} -eq 0 ]]; then
  log_ok "All $TOTAL_FILES migration filenames are valid"
else
  log_err "${#INVALID_FILES[@]} invalid migration filename(s) found"
fi

# Version ordering check (within each directory)
log_info "Checking version ordering..."
ORDER_OK=true
for dir in "${MIGRATION_DIRS[@]}"; do
  full_dir="$REPO_ROOT/$dir"
  [[ -d "$full_dir" ]] || continue

  ordered_versions=()

  if git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    # Process commits in chronological order (oldest first).
    # Within each commit, sort added migration files by version so bulk additions
    # are checked in a deterministic order.
    while IFS= read -r commit; do
      [[ -z "$commit" ]] && continue
      commit_versions=()
      while IFS= read -r file; do
        [[ -z "$file" || ! -f "$REPO_ROOT/$file" ]] && continue
        version="$(extract_version "$(basename "$file")")"
        [[ -z "$version" ]] && continue
        commit_versions+=("$version")
      done < <(git -C "$REPO_ROOT" diff-tree --no-commit-id --name-only -r "$commit" -- "$dir/*.sql" 2>/dev/null)

      # Sort versions within the commit numerically
      if [[ ${#commit_versions[@]} -gt 0 ]]; then
        while IFS= read -r v; do
          ordered_versions+=("$v")
        done < <(printf '%s\n' "${commit_versions[@]}" | sort -n)
      fi
    done < <(git -C "$REPO_ROOT" log --diff-filter=A --format='%H' --reverse -- "$dir/*.sql" 2>/dev/null)
  fi

  # Fallback to filesystem order if git is unavailable or no tracked files
  if [[ ${#ordered_versions[@]} -eq 0 ]]; then
    while IFS= read -r -d '' file; do
      version="$(extract_version "$(basename "$file")")"
      [[ -z "$version" ]] && continue
      ordered_versions+=("$version")
    done < <(find "$full_dir" -maxdepth 1 -type f \( -name '*.sql' \) ! -name '*.backup' ! -name '*.sql.backup' -print0 | sort -z)
  fi

  prev_version=""
  for version in "${ordered_versions[@]}"; do
    if [[ -n "$prev_version" ]] && (( 10#$version <= 10#$prev_version )); then
      ORDER_ISSUES+=("$dir: $version <= previous ($prev_version)")
      ORDER_OK=false
    fi
    prev_version="$version"
  done
done

if $ORDER_OK; then
  log_ok "Migration versions are strictly increasing"
else
  if [[ "${STRICT_MODE:-false}" == "true" ]]; then
    log_err "Migration version ordering issues found (STRICT_MODE enabled)"
  else
    log_warn "Migration version ordering issues found (treating as warning; set STRICT_MODE=true to fail)"
  fi
  for issue in "${ORDER_ISSUES[@]}"; do
    echo "  - $issue"
  done
fi

# Idempotency check
log_info "Checking idempotency..."
IDEMPOTENT_OK=true
for dir in "${MIGRATION_DIRS[@]}"; do
  full_dir="$REPO_ROOT/$dir"
  [[ -d "$full_dir" ]] || continue
  while IFS= read -r -d '' file; do
    if ! check_idempotency "$file"; then
      rel="$(rel_path "$file")"
      IDEMPOTENCY_WARNINGS+=("$rel")
      IDEMPOTENT_OK=false
    fi
  done < <(find "$full_dir" -maxdepth 1 -type f \( -name '*.sql' \) ! -name '*.backup' ! -name '*.sql.backup' -print0 | sort -z)
done

if $IDEMPOTENT_OK; then
  log_ok "All migrations appear idempotent"
else
  log_warn "${#IDEMPOTENCY_WARNINGS[@]} migration(s) may not be idempotent"
  for f in "${IDEMPOTENCY_WARNINGS[@]}"; do
    echo "  - $f"
  done
fi

# Down migration presence check
log_info "Checking for down migrations..."
DOWN_OK=true
for dir in "${MIGRATION_DIRS[@]}"; do
  full_dir="$REPO_ROOT/$dir"
  [[ -d "$full_dir" ]] || continue
  while IFS= read -r -d '' file; do
    name="$(basename "$file")"
    [[ "$name" == *.down.sql ]] && continue
    base="${name%.sql}"
    down_file="$full_dir/${base}.down.sql"
    if [[ ! -f "$down_file" ]]; then
      rel="$(rel_path "$file")"
      DOWN_MIGRATION_WARNINGS+=("$rel")
      DOWN_OK=false
    fi
  done < <(find "$full_dir" -maxdepth 1 -type f \( -name '*.sql' \) ! -name '*.backup' ! -name '*.sql.backup' ! -name '*.down.sql' -print0 | sort -z)
done

if $DOWN_OK; then
  log_ok "All up migrations have corresponding down migrations"
else
  log_warn "${#DOWN_MIGRATION_WARNINGS[@]} up migration(s) missing down migrations"
  for f in "${DOWN_MIGRATION_WARNINGS[@]}"; do
    echo "  - $f"
  done
fi

# Checksum check
log_info "Checking checksums..."
mkdir -p "$(dirname "$CHECKSUM_PATH")"

CHECKSUM_OK=true
CHECKSUM_TMP="$(mktemp)"
trap 'rm -f "$CHECKSUM_TMP"' EXIT

for dir in "${MIGRATION_DIRS[@]}"; do
  full_dir="$REPO_ROOT/$dir"
  [[ -d "$full_dir" ]] || continue
  while IFS= read -r -d '' file; do
    rel="$(rel_path "$file")"
    hash="$(sha256_file "$file")"
    echo "$hash  $rel" >> "$CHECKSUM_TMP"
    prev_hash="$(get_prev_checksum "$rel")"
    if [[ -n "$prev_hash" && "$prev_hash" != "$hash" ]]; then
      CHECKSUM_ERRORS+=("$rel")
      CHECKSUM_OK=false
    fi
  done < <(find "$full_dir" -maxdepth 1 -type f \( -name '*.sql' \) ! -name '*.backup' ! -name '*.sql.backup' -print0 | sort -z)
done

# Check for removed files (present in checksum file but not found)
if [[ -f "$CHECKSUM_PATH" ]]; then
  while read -r hash rel; do
    [[ -z "$hash" || "$hash" =~ ^# || -z "$rel" ]] && continue
    if [[ ! -f "$REPO_ROOT/$rel" ]]; then
      CHECKSUM_ERRORS+=("$rel (removed)")
      CHECKSUM_OK=false
    fi
  done < "$CHECKSUM_PATH"
fi

# Write new checksums
{
  echo "# TOPEMS migration checksums (SHA-256)"
  echo "# Generated by scripts/migration/validate.sh"
  echo "# DO NOT EDIT MANUALLY"
  sort "$CHECKSUM_TMP"
} > "$CHECKSUM_PATH"

if $CHECKSUM_OK; then
  log_ok "Checksums verified / updated at $CHECKSUM_FILE"
else
  log_err "Checksum mismatch or missing migrations detected"
  for f in "${CHECKSUM_ERRORS[@]}"; do
    echo "  - $f"
  done
fi

# Schema drift check (optional)
if [[ -n "${DATABASE_URL:-}" ]]; then
  log_info "DATABASE_URL is set; checking schema_migrations..."
  if ! command -v psql >/dev/null 2>&1; then
    log_warn "psql not found; skipping schema drift check"
  else
    if psql "$DATABASE_URL" -c "SELECT 1 FROM schema_migrations LIMIT 1" >/dev/null 2>&1; then
      log_ok "schema_migrations table exists"

      applied_count=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM schema_migrations WHERE status = 'success'" 2>/dev/null | tr -d ' ')
      log_info "Applied successful migrations in database: ${applied_count:-0}"

      missing_in_db=()
      for dir in "${MIGRATION_DIRS[@]}"; do
        full_dir="$REPO_ROOT/$dir"
        [[ -d "$full_dir" ]] || continue
        plugin_code=""
        if [[ "$dir" =~ ^svc/([^/]+)/migrations$ ]]; then
          plugin_code="${BASH_REMATCH[1]}"
        fi
        while IFS= read -r -d '' file; do
          name="$(basename "$file")"
          version="$(extract_version "$name")"
          [[ -z "$version" ]] && continue
          if [[ "$plugin_code" == "database" || "$plugin_code" == "migrations" || -z "$plugin_code" ]]; then
            found=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version' AND status = 'success'" 2>/dev/null | tr -d ' ')
          else
            found=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM schema_migrations WHERE plugin_code = '$plugin_code' AND version = '$version' AND status = 'success'" 2>/dev/null | tr -d ' ')
          fi
          if [[ "${found:-0}" -eq 0 ]]; then
            missing_in_db+=("$(rel_path "$file")")
          fi
        done < <(find "$full_dir" -maxdepth 1 -type f \( -name '*.sql' \) ! -name '*.backup' ! -name '*.sql.backup' -print0 | sort -z)
      done

      if [[ ${#missing_in_db[@]} -eq 0 ]]; then
        log_ok "All local migrations are recorded in schema_migrations"
      else
        log_warn "${#missing_in_db[@]} local migration(s) not found in schema_migrations"
        for f in "${missing_in_db[@]}"; do
          echo "  - $f"
        done
      fi
    else
      SCHEMA_DRIFT+=("schema_migrations table not found")
      log_err "schema_migrations table does not exist or is not accessible"
    fi
  fi
else
  log_info "DATABASE_URL not set; skipping schema drift check"
fi

# Summary
log_info "Validation Summary"
echo ""
echo "Total migration files checked: $TOTAL_FILES"
echo "Invalid filenames:             ${#INVALID_FILES[@]}"
echo "Version ordering issues:       ${#ORDER_ISSUES[@]}"
echo "Idempotency warnings:          ${#IDEMPOTENCY_WARNINGS[@]}"
echo "Missing down migrations:       ${#DOWN_MIGRATION_WARNINGS[@]}"
echo "Checksum errors:               ${#CHECKSUM_ERRORS[@]}"
echo "Schema drift issues:           ${#SCHEMA_DRIFT[@]}"
echo "Errors:                        $ERRORS"
echo "Warnings:                      $WARNINGS"
echo ""

# GitHub Actions step summary
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Migration Validation Summary"
    echo ""
    echo "| Check | Count | Status |"
    echo "|-------|-------|--------|"
    echo "| Total migration files | $TOTAL_FILES | - |"
    echo "| Invalid filenames | ${#INVALID_FILES[@]} | $([ ${#INVALID_FILES[@]} -eq 0 ] && echo '✅' || echo '❌') |"
    echo "| Version ordering issues | ${#ORDER_ISSUES[@]} | $([ ${#ORDER_ISSUES[@]} -eq 0 ] && echo '✅' || echo '❌') |"
    echo "| Idempotency warnings | ${#IDEMPOTENCY_WARNINGS[@]} | $([ ${#IDEMPOTENCY_WARNINGS[@]} -eq 0 ] && echo '✅' || echo '⚠️') |"
    echo "| Missing down migrations | ${#DOWN_MIGRATION_WARNINGS[@]} | $([ ${#DOWN_MIGRATION_WARNINGS[@]} -eq 0 ] && echo '✅' || echo '⚠️') |"
    echo "| Checksum errors | ${#CHECKSUM_ERRORS[@]} | $([ ${#CHECKSUM_ERRORS[@]} -eq 0 ] && echo '✅' || echo '❌') |"
    echo "| Schema drift issues | ${#SCHEMA_DRIFT[@]} | $([ ${#SCHEMA_DRIFT[@]} -eq 0 ] && echo '✅' || echo '❌') |"
    echo ""
    if [[ $ERRORS -gt 0 ]]; then
      echo "❌ **Migration validation failed with $ERRORS error(s).**"
    else
      echo "✅ **Migration validation passed.**"
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [[ $ERRORS -gt 0 ]]; then
  exit 1
fi
exit 0
