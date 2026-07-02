#!/bin/bash
# =============================================================================
# TOPEMS V2 Phase 2 - Chart Recharts Migration + CircularProgress Unification
# =============================================================================
# 1. Migrate recharts direct imports in page files to use chart wrappers
# 2. Unify CircularProgress -> LoadingSpinner across the codebase
# 3. Clean up .bak files from previous failed script runs
# 4. Print summary report
# =============================================================================

set -euo pipefail

BASE_DIR="/Users/air/TOPEMS"
SRC_DIR="$BASE_DIR/apps/web/src"

# ---------------------------------------------------------------------------
# Color & formatting helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

DRY_RUN="${DRY_RUN:-0}"

box_header() {
    local title="$1"
    local line
    line=$(printf '=%.0s' $(jot -b '' 70 2>/dev/null || seq -s '' 70 | tr -d '0-9' | head -c 70))
    if [ -z "$line" ]; then
        line="======================================================================"
    fi
    echo ""
    echo -e "${CYAN}${line}${NC}"
    echo -e "${BOLD}  $title${NC}"
    echo -e "${CYAN}${line}${NC}"
    echo ""
}

log_info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[DONE]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[SKIP]${NC} $*"; }
log_err()   { echo -e "${RED}[FAIL]${NC} $*"; }
log_dry()   { echo -e "${YELLOW}[DRY-RUN]${NC} $*"; }

# macOS bash 3.2 compatible: no mapfile, no associative arrays
# Use arrays indexed by number and parallel description arrays when needed.

# ---------------------------------------------------------------------------
# Counter variables
# ---------------------------------------------------------------------------
RECHARTS_TOTAL=0
RECHARTS_TODO_ADDED=0
RECHARTS_IMPORT_ADDED=0
RECHARTS_SKIPPED=0

SPINNER_TOTAL=0
SPINNER_REPLACED=0
SPINNER_TODO_ADDED=0
SPINNER_SKIPPED=0

BAK_COUNT=0
BAK_DELETED=0

MANUAL_ATTENTION=0
MANUAL_FILES=""

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="$BASE_DIR/.bak-v2-phase2-$TIMESTAMP"

create_backup() {
    local file="$1"
    local rel
    rel="${file#$BASE_DIR/}"
    local dest="$BACKUP_DIR/$rel"
    if [ "$DRY_RUN" = "1" ]; then
        log_dry "Would backup: $rel"
        return 0
    fi
    mkdir -p "$(dirname "$dest")"
    cp -f "$file" "$dest"
}

backup_file() {
    local file="$1"
    if [ -f "$BACKUP_DIR/.backup_done" ]; then
        return 0
    fi
    create_backup "$file"
}

# Mark that initial backup has been done (we'll do one big backup per-step)
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
}

# =============================================================================
# STEP 1: Migrate recharts direct imports in page files
# =============================================================================
step1_recharts_migration() {
    box_header "Step 1: recharts Direct Import Migration (TODO + Import Addition)"

    # The 7 page files that need migration
    local page_files=(
        "src/pages/workflow/WorkflowStatisticsPage.tsx"
        "src/pages/monitor/MonitorMetricsPage.tsx"
        "src/pages/lims/LimsSampleDetailPage.tsx"
        "src/pages/bi/BIAnalyticsPage.tsx"
        "src/pages/bi/BIModuleDetailPage.tsx"
        "src/pages/bi/BIComparisonPage.tsx"
        "src/pages/pm/PmReportPage.tsx"
    )

    # Chart wrapper mapping: recharts component -> wrapper export name
    # We'll use parallel arrays since bash 3.2 has no associative arrays
    # recharts_names[i] -> wrapper_names[i]
    local recharts_names=(BarChart LineChart PieChart AreaChart RadarChart)
    local wrapper_names=(BarChart LineChart PieChart AreaChart RadarChart)

    ensure_backup_dir

    for pf in "${page_files[@]}"; do
        local filepath="$BASE_DIR/$pf"
        if [ ! -f "$filepath" ]; then
            log_warn "File not found, skipping: $pf"
            RECHARTS_SKIPPED=$((RECHARTS_SKIPPED + 1))
            continue
        fi

        RECHARTS_TOTAL=$((RECHARTS_TOTAL + 1))
        log_info "Processing: $pf"

        # Find recharts imports using grep
        local recharts_imports
        recharts_imports=$(grep -n "from 'recharts'" "$filepath" 2>/dev/null || true)
        recharts_imports+=$(grep -n 'from "recharts"' "$filepath" 2>/dev/null || true)

        if [ -z "$recharts_imports" ]; then
            log_warn "No recharts imports found in $pf"
            RECHARTS_SKIPPED=$((RECHARTS_SKIPPED + 1))
            continue
        fi

        # Extract the imported components from recharts
        local imported_components=""
        local wrapper_components=""
        local has_utils=0

        # Parse the import line to find which recharts components are used
        local import_line
        import_line=$(echo "$recharts_imports" | head -1 | sed 's/^[0-9]*:[[:space:]]*//')

        # Check for each wrapper component
        local i
        for i in 0 1 2 3 4; do
            local rname="${recharts_names[$i]}"
            local wname="${wrapper_names[$i]}"
            # Check if this component is in the import line
            if echo "$import_line" | grep -qE "(^|[,{[:space:]])${rname}([,}[:space:]]|\$)"; then
                if [ -n "$imported_components" ]; then
                    imported_components="$imported_components, $rname"
                else
                    imported_components="$rname"
                fi
                # For BarChart and LineChart, use the Component variant to avoid naming collision
                if [ "$rname" = "BarChart" ] || [ "$rname" = "LineChart" ]; then
                    if [ -n "$wrapper_components" ]; then
                        wrapper_components="$wrapper_components, ${wname}Component"
                    else
                        wrapper_components="${wname}Component"
                    fi
                else
                    if [ -n "$wrapper_components" ]; then
                        wrapper_components="$wrapper_components, $wname"
                    else
                        wrapper_components="$wname"
                    fi
                fi
            fi
        done

        # Check for utility imports (ResponsiveContainer, Tooltip, Legend, etc.)
        if echo "$import_line" | grep -qE "(ResponsiveContainer|Tooltip|Legend|CartesianGrid|XAxis|YAxis|Cell|Brush|ReferenceLine|ReferenceArea|ZAxis|RadialBar|Sector)"; then
            has_utils=1
        fi

        # Check if chart wrapper import already exists
        local has_wrapper_import
        has_wrapper_import=$(grep -c "from '@/components/charts'" "$filepath" 2>/dev/null || echo "0")
        has_wrapper_import=$(echo "$has_wrapper_import" | tr -d '[:space:]')

        if [ "$has_wrapper_import" != "0" ] && [ "$has_wrapper_import" -gt 0 ]; then
            log_warn "Already has chart wrapper import: $pf"
            # Still add TODO if there are remaining recharts component imports
            if [ -n "$imported_components" ]; then
                local utils_note=""
                if [ "$has_utils" = "1" ]; then
                    utils_note=" (utilities like ResponsiveContainer/Tooltip can stay as recharts imports)"
                fi
                log_info "TODO: Replace recharts components [$imported_components] with chart wrappers in $pf$utils_note"
                RECHARTS_TODO_ADDED=$((RECHARTS_TODO_ADDED + 1))
                MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
                MANUAL_FILES="$MANUAL_FILES  - $pf (recharts components still used)\n"
            fi
            continue
        fi

        # Build the action
        if [ -z "$wrapper_components" ]; then
            if [ "$has_utils" = "1" ]; then
                log_warn "Only recharts utilities imported (no wrappable components) in $pf - no wrapper needed"
                RECHARTS_SKIPPED=$((RECHARTS_SKIPPED + 1))
            else
                log_warn "No wrappable recharts components found in $pf"
                RECHARTS_SKIPPED=$((RECHARTS_SKIPPED + 1))
            fi
            continue
        fi

        # Add TODO comment and import statement
        local utils_note=""
        if [ "$has_utils" = "1" ]; then
            utils_note=" Note: ResponsiveContainer, Tooltip, Legend, etc. from recharts should remain."
        fi

        local todo_line="// TODO(v2-phase2): Migrate recharts imports [$imported_components] to chart wrappers. Replace usages with: ${wrapper_components}.${utils_note}"
        local import_line_new="import { ${wrapper_components} } from '@/components/charts';"

        if [ "$DRY_RUN" = "1" ]; then
            log_dry "Would add import: $import_line_new"
            log_dry "Would add TODO: $todo_line"
            RECHARTS_TODO_ADDED=$((RECHARTS_TODO_ADDED + 1))
            RECHARTS_IMPORT_ADDED=$((RECHARTS_IMPORT_ADDED + 1))
            MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
            MANUAL_FILES="$MANUAL_FILES  - $pf (needs recharts -> chart wrapper migration)\n"
            continue
        fi

        # Create backup of this file
        create_backup "$filepath"

        # Insert the chart wrapper import after the last import line
        # Find the last import line number
        local last_import_line
        last_import_line=$(grep -n "^import " "$filepath" | tail -1 | cut -d: -f1)

        if [ -z "$last_import_line" ]; then
            log_warn "Could not find import statements in $pf"
            RECHARTS_SKIPPED=$((RECHARTS_SKIPPED + 1))
            continue
        fi

        # Use awk to insert after the last import line
        local tmp_file="$filepath.tmp.$$"
        awk -v line="$last_import_line" \
            -v todo="$todo_line" \
            -v imp="$import_line_new" \
            'NR == line { print; print ""; print todo; print imp; next } 1' \
            "$filepath" > "$tmp_file"

        if [ -s "$tmp_file" ]; then
            mv "$tmp_file" "$filepath"
            log_ok "Added chart wrapper import to $pf"
            log_ok "TODO added: migrate [$imported_components] -> ${wrapper_components}"
            RECHARTS_TODO_ADDED=$((RECHARTS_TODO_ADDED + 1))
            RECHARTS_IMPORT_ADDED=$((RECHARTS_IMPORT_ADDED + 1))
            MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
            MANUAL_FILES="$MANUAL_FILES  - $pf (needs recharts -> chart wrapper migration)\n"
        else
            rm -f "$tmp_file"
            log_err "Failed to modify $pf"
            RECHARTS_SKIPPED=$((RECHARTS_SKIPPED + 1))
        fi
    done
}

# =============================================================================
# STEP 2: Unify CircularProgress -> LoadingSpinner
# =============================================================================
step2_spinner_unification() {
    box_header "Step 2: Unify CircularProgress -> LoadingSpinner"

    # Find all files using CircularProgress, excluding .bak, theme files, and the loaders themselves
    local spinner_files=()
    while IFS= read -r file; do
        local basename
        basename=$(basename "$file")
        # Skip .bak files
        case "$file" in
            *.bak*) continue ;;
        esac
        # Skip theme.ts files
        case "$basename" in
            theme.ts|theme.tsx) continue ;;
        esac
        # Skip the loader files themselves
        case "$file" in
            */LoadingSpinner.tsx) continue ;;
            */LoadingFallback.tsx) continue ;;
        esac
        spinner_files+=("$file")
    done < <(grep -rl "CircularProgress" "$SRC_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null || true)

    local total_count=${#spinner_files[@]}
    log_info "Found $total_count files using CircularProgress"

    ensure_backup_dir

    for file in "${spinner_files[@]}"; do
        local rel_path="${file#$BASE_DIR/}"
        SPINNER_TOTAL=$((SPINNER_TOTAL + 1))

        # Check if LoadingSpinner import already exists
        local has_spinner_import
        has_spinner_import=$(grep -c "from '@/components/common/LoadingSpinner'" "$file" 2>/dev/null || echo "0")
        has_spinner_import=$(echo "$has_spinner_import" | tr -d '[:space:]')

        if [ "$has_spinner_import" != "0" ] && [ "$has_spinner_import" -gt 0 ]; then
            log_warn "Already has LoadingSpinner import: $rel_path"
            # Check if CircularProgress is still used alongside
            local cp_remaining
            cp_remaining=$(grep -c "CircularProgress" "$file" 2>/dev/null || echo "0")
            cp_remaining=$(echo "$cp_remaining" | tr -d '[:space:]')
            if [ "$cp_remaining" = "0" ]; then
                log_ok "CircularProgress already removed: $rel_path"
            else
                log_info "TODO: Still has CircularProgress usages: $rel_path"
                MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
                MANUAL_FILES="$MANUAL_FILES  - $rel_path (CircularProgress + LoadingSpinner coexist)\n"
            fi
            SPINNER_SKIPPED=$((SPINNER_SKIPPED + 1))
            continue
        fi

        # Analyze the usage pattern
        # Case 1: Simple - just <CircularProgress /> or <CircularProgress size={N} />
        # Case 2: Complex - inside Box with custom styling, or additional props like sx, className, etc.

        # Check for simple patterns:
        #   <CircularProgress />
        #   <CircularProgress size={N} />
        #   <CircularProgress size={N} sx={...} /> (still simple if sx is minimal)

        # Extract all CircularProgress usages with surrounding context
        local has_complex=0
        local simple_matches=()
        local complex_matches=()

        # Use grep to find all lines with CircularProgress
        while IFS= read -r match_line; do
            local line_num
            line_num=$(echo "$match_line" | cut -d: -f1)
            local line_content
            line_content=$(echo "$match_line" | cut -d: -f2-)

            # Check if it's a JSX usage (contains <CircularProgress)
            if echo "$line_content" | grep -q "<CircularProgress"; then
                # Check for complexity: additional props beyond size
                # Strip size prop and see if there's anything else
                local stripped
                stripped=$(echo "$line_content" | sed 's/<CircularProgress//' | sed 's/size={[^}]*}//' | sed 's/size="[^"]*"//' | sed 's/\/>//' | sed 's/>//' | tr -d '[:space:]')

                if [ -z "$stripped" ]; then
                    # Simple: just <CircularProgress /> or <CircularProgress size={N} />
                    simple_matches+=("$line_num:$line_content")
                else
                    # Complex: has other props
                    complex_matches+=("$line_num:$line_content")
                    has_complex=1
                fi
            fi
        done < <(grep -n "CircularProgress" "$file" 2>/dev/null || true)

        local simple_count=${#simple_matches[@]}
        local complex_count=${#complex_matches[@]}

        if [ "$simple_count" -gt 0 ] && [ "$has_complex" = "0" ]; then
            # All usages are simple - we can do the replacement
            log_info "Simple replacement: $rel_path ($simple_count usages)"

            if [ "$DRY_RUN" = "1" ]; then
                log_dry "Would replace CircularProgress with LoadingSpinner in $rel_path"
                for sm in "${simple_matches[@]}"; do
                    log_dry "  Line: $sm"
                done
                SPINNER_REPLACED=$((SPINNER_REPLACED + simple_count))
                continue
            fi

            # Create backup
            create_backup "$file"

            # Perform replacement using sed
            local tmp_file="$file.tmp.$$"
            local result=1

            # First add LoadingSpinner import if not present
            # Then replace <CircularProgress /> with <LoadingSpinner />
            # And <CircularProgress size={N} /> with mapped size

            awk '
            BEGIN { import_added = 0 }
            /^import / { last_import = NR }
            {
                # Handle <CircularProgress />
                line = $0
                gsub(/<CircularProgress \/>/, "<LoadingSpinner />", line)
                gsub(/<CircularProgress\/>/, "<LoadingSpinner/>", line)

                # Handle <CircularProgress size={N} />
                # size < 20 -> "sm", size < 40 -> "md", else "lg"
                while (match(line, /<CircularProgress size=\{([0-9]+)\} \/>/)) {
                    before = substr(line, 1, RSTART - 1)
                    after = substr(line, RSTART + RLENGTH)
                    size_val = substr(line, RSTART + 22, RLENGTH - 27)
                    gsub(/[^0-9]/, "", size_val)

                    if (size_val + 0 < 20) { mapped = "sm" }
                    else if (size_val + 0 < 40) { mapped = "md" }
                    else { mapped = "lg" }

                    line = before "<LoadingSpinner size=\"" mapped "\" />" after
                }

                # Handle <CircularProgress size="N" />
                while (match(line, /<CircularProgress size="([0-9]+)" \/>/)) {
                    before = substr(line, 1, RSTART - 1)
                    after = substr(line, RSTART + RLENGTH)
                    size_val = substr(line, RSTART + 22, RLENGTH - 28)
                    gsub(/[^0-9]/, "", size_val)

                    if (size_val + 0 < 20) { mapped = "sm" }
                    else if (size_val + 0 < 40) { mapped = "md" }
                    else { mapped = "lg" }

                    line = before "<LoadingSpinner size=\"" mapped "\" />" after
                }

                print line
            }
            END {
            }
            ' "$file" > "$tmp_file"

            if [ -s "$tmp_file" ]; then
                # Now check if CircularProgress is still referenced (for import)
                local cp_still_used
                cp_still_used=$(grep -c "CircularProgress" "$tmp_file" 2>/dev/null || echo "0")
                cp_still_used=$(echo "$cp_still_used" | tr -d '[:space:]')

                if [ "$cp_still_used" = "0" ]; then
                    # Remove the CircularProgress import line and add LoadingSpinner import
                    # Find MUI CircularProgress import
                    local cp_import_line
                    cp_import_line=$(grep -n "CircularProgress" "$tmp_file" | head -1 | cut -d: -f1)

                    if [ -n "$cp_import_line" ]; then
                        # Check if CircularProgress is imported with other MUI components
                        local import_content
                        import_content=$(sed -n "${cp_import_line}p" "$tmp_file")

                        if echo "$import_content" | grep -q "from.*@mui"; then
                            # It's a MUI import - need to handle carefully
                            # Check if CircularProgress is the only import from this line
                            local other_imports
                            other_imports=$(echo "$import_content" | sed 's/CircularProgress//g' | sed 's/{[[:space:]]*//' | sed 's/[[:space:]]*}//' | tr -d '[:space:]')

                            if [ -z "$other_imports" ]; then
                                # Only CircularProgress - replace entire import
                                local last_import_new
                                last_import_new=$(grep -n "^import " "$tmp_file" | tail -1 | cut -d: -f1)

                                # Remove CircularProgress import line
                                sed '' "${cp_import_line}d" "$tmp_file" > "${tmp_file}.2"

                                # Add LoadingSpinner import after last import
                                awk -v line="$((last_import_new - 1))" \
                                    -v imp="import LoadingSpinner from '@/components/common/LoadingSpinner';" \
                                    'NR == line { print imp } 1' \
                                    "${tmp_file}.2" > "${tmp_file}.3"

                                if [ -s "${tmp_file}.3" ]; then
                                    mv "${tmp_file}.3" "$file"
                                    rm -f "${tmp_file}" "${tmp_file}.2"
                                    log_ok "Replaced CircularProgress with LoadingSpinner in $rel_path"
                                    SPINNER_REPLACED=$((SPINNER_REPLACED + simple_count))
                                    result=0
                                else
                                    rm -f "${tmp_file}" "${tmp_file}.2" "${tmp_file}.3"
                                    log_err "Failed import replacement in $rel_path"
                                fi
                            else
                                # CircularProgress is one of several MUI imports - just remove it from the import
                                local modified_import
                                modified_import=$(echo "$import_content" | sed 's/CircularProgress,[[:space:]]*//' | sed 's/,[[:space:]]*CircularProgress//' | sed 's/CircularProgress[[:space:]]*//' | sed 's/[[:space:]]*,[[:space:]]*,/,/' | sed 's/{[[:space:]]*,/{/' | sed 's/,[[:space:]]*}/}/')

                                sed '' "${cp_import_line}s|.*|${modified_import}|" "$tmp_file" > "${tmp_file}.2"

                                # Add LoadingSpinner import
                                local last_import_new
                                last_import_new=$(grep -n "^import " "$tmp_file" | tail -1 | cut -d: -f1)
                                awk -v line="$last_import_new" \
                                    -v imp="import LoadingSpinner from '@/components/common/LoadingSpinner';" \
                                    'NR == line { print; print imp; next } 1' \
                                    "${tmp_file}.2" > "${tmp_file}.3"

                                if [ -s "${tmp_file}.3" ]; then
                                    mv "${tmp_file}.3" "$file"
                                    rm -f "${tmp_file}" "${tmp_file}.2"
                                    log_ok "Replaced CircularProgress with LoadingSpinner in $rel_path (kept other MUI imports)"
                                    SPINNER_REPLACED=$((SPINNER_REPLACED + simple_count))
                                    result=0
                                else
                                    rm -f "${tmp_file}" "${tmp_file}.2" "${tmp_file}.3"
                                    log_err "Failed import replacement in $rel_path"
                                fi
                            fi
                        else
                            # Non-MUI import (unlikely but handle it)
                            mv "$tmp_file" "$file"
                            log_ok "Replaced CircularProgress usages in $rel_path (import needs manual cleanup)"
                            MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
                            MANUAL_FILES="$MANUAL_FILES  - $rel_path (CircularProgress import needs manual removal)\n"
                            SPINNER_REPLACED=$((SPINNER_REPLACED + simple_count))
                        fi
                    else
                        # No import line found for CircularProgress (type import?)
                        mv "$tmp_file" "$file"
                        log_ok "Replaced CircularProgress usages in $rel_path"
                        SPINNER_REPLACED=$((SPINNER_REPLACED + simple_count))
                    fi
                else
                    rm -f "$tmp_file"
                    log_warn "CircularProgress still referenced after replacement in $rel_path - adding TODO"
                    SPINNER_TODO_ADDED=$((SPINNER_TODO_ADDED + 1))
                    MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
                    MANUAL_FILES="$MANUAL_FILES  - $rel_path (complex CircularProgress usage)\n"
                fi
            else
                rm -f "$tmp_file"
                log_err "Failed to process $rel_path"
            fi
        elif [ "$has_complex" = "1" ]; then
            # Complex usage - just add TODO
            log_warn "Complex CircularProgress usage in $rel_path ($simple_count simple, $complex_count complex)"

            if [ "$DRY_RUN" = "1" ]; then
                log_dry "Would add TODO comment to $rel_path"
                for cm in "${complex_matches[@]}"; do
                    log_dry "  Complex: $cm"
                done
                SPINNER_TODO_ADDED=$((SPINNER_TODO_ADDED + 1))
                MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
                MANUAL_FILES="$MANUAL_FILES  - $rel_path (complex CircularProgress usage, $complex_count instances)\n"
                continue
            fi

            # Add TODO comment at the top of the file (after imports)
            create_backup "$file"

            local last_import_ln
            last_import_ln=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)

            if [ -n "$last_import_ln" ]; then
                local todo_spinner
                todo_spinner="// TODO(v2-phase2): Replace CircularProgress with LoadingSpinner from '@/components/common/LoadingSpinner'. Complex usage found - manual review needed."

                local tmp_file="$file.tmp.$$"
                awk -v line="$last_import_ln" \
                    -v todo="$todo_spinner" \
                    'NR == line { print; print ""; print todo; next } 1' \
                    "$file" > "$tmp_file"

                if [ -s "$tmp_file" ]; then
                    mv "$tmp_file" "$file"
                    log_ok "Added TODO comment to $rel_path"
                else
                    rm -f "$tmp_file"
                    log_err "Failed to add TODO to $rel_path"
                fi
            fi

            SPINNER_TODO_ADDED=$((SPINNER_TODO_ADDED + 1))
            MANUAL_ATTENTION=$((MANUAL_ATTENTION + 1))
            MANUAL_FILES="$MANUAL_FILES  - $rel_path (complex CircularProgress usage, $complex_count instances)\n"
        else
            # CircularProgress found only in import or type references, not JSX
            log_warn "CircularProgress found only in imports/types in $rel_path"
            SPINNER_SKIPPED=$((SPINNER_SKIPPED + 1))
        fi
    done
}

# =============================================================================
# STEP 3: Clean up .bak files
# =============================================================================
step3_cleanup_bak_files() {
    box_header "Step 3: Clean up .bak files from previous script runs"

    local bak_patterns=(
        ".bak.phase7-1"
        ".bak.phase7-2"
        ".bak.phase7-4"
        ".bak.phase8"
    )

    ensure_backup_dir

    for pattern in "${bak_patterns[@]}"; do
        log_info "Searching for: *${pattern}* in $SRC_DIR"
        while IFS= read -r bak_file; do
            if [ -z "$bak_file" ]; then continue; fi
            local rel_path="${bak_file#$BASE_DIR/}"
            BAK_COUNT=$((BAK_COUNT + 1))

            if [ "$DRY_RUN" = "1" ]; then
                log_dry "Would delete: $rel_path"
                BAK_DELETED=$((BAK_DELETED + 1))
                continue
            fi

            if rm -f "$bak_file"; then
                log_ok "Deleted: $rel_path"
                BAK_DELETED=$((BAK_DELETED + 1))
            else
                log_err "Failed to delete: $rel_path"
            fi
        done < <(find "$SRC_DIR" -name "*${pattern}*" -type f 2>/dev/null || true)
    done

    if [ "$BAK_COUNT" = "0" ]; then
        log_info "No .bak files found matching the patterns"
    fi
}

# =============================================================================
# STEP 4: Report
# =============================================================================
step4_report() {
    box_header "Step 4: Summary Report"

    echo -e "${BOLD}  recharts Migration:${NC}"
    echo -e "    Total page files to process:     ${BOLD}$RECHARTS_TOTAL${NC}"
    echo -e "    Import statements added:         ${GREEN}$RECHARTS_IMPORT_ADDED${NC}"
    echo -e "    TODO comments added:             ${YELLOW}$RECHARTS_TODO_ADDED${NC}"
    echo -e "    Skipped (no action needed):      ${BLUE}$RECHARTS_SKIPPED${NC}"
    echo ""

    echo -e "${BOLD}  CircularProgress -> LoadingSpinner:${NC}"
    echo -e "    Total files found:               ${BOLD}$SPINNER_TOTAL${NC}"
    echo -e "    Simple replacements done:        ${GREEN}$SPINNER_REPLACED${NC}"
    echo -e "    Complex cases (TODO added):      ${YELLOW}$SPINNER_TODO_ADDED${NC}"
    echo -e "    Skipped:                         ${BLUE}$SPINNER_SKIPPED${NC}"
    echo ""

    echo -e "${BOLD}  .bak File Cleanup:${NC}"
    echo -e "    Files found:                     ${BOLD}$BAK_COUNT${NC}"
    echo -e "    Files deleted:                   ${GREEN}$BAK_DELETED${NC}"
    echo ""

    if [ "$MANUAL_ATTENTION" -gt 0 ]; then
        echo -e "${BOLD}${YELLOW}  Files needing manual attention (${MANUAL_ATTENTION}):${NC}"
        echo ""
        echo -e "$MANUAL_FILES"
    else
        echo -e "${GREEN}  No files need manual attention.${NC}"
    fi

    if [ "$DRY_RUN" = "1" ]; then
        echo ""
        echo -e "${YELLOW}${BOLD}  *** DRY RUN MODE - No files were modified ***${NC}"
    else
        echo ""
        echo -e "${GREEN}${BOLD}  Backup created at: $BACKUP_DIR${NC}"
    fi

    echo ""
}

# =============================================================================
# Main
# =============================================================================
main() {
    if [ "$DRY_RUN" = "1" ]; then
        box_header "TOPEMS V2 Phase 2 - DRY RUN MODE"
    else
        box_header "TOPEMS V2 Phase 2 - Chart & Loading Migration"
    fi

    log_info "Base directory: $BASE_DIR"
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    [ "$DRY_RUN" = "1" ] && log_info "Mode: DRY RUN (set DRY_RUN=1 to enable)"

    echo ""

    step1_recharts_migration
    step2_spinner_unification
    step3_cleanup_bak_files
    step4_report
}

main "$@"
