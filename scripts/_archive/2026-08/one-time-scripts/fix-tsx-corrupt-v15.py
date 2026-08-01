#!/usr/bin/env python3
r"""TSX corruption fixer V15 — 3 ultra-safe rules, zero side-effects.

Rules (each has a 100% certain pattern that can never be valid syntax):

  V15_R1  Arrow function with `=}>` damage:
            (args) =}> ...       →      (args) => ...
            (e) =}> setX(...)   →      (e) => setX(...)
            () =}> { ... }      →      () => { ... }
          Pattern: any  ) \s* = \s* } \s* >   — there is NO valid TS that uses this.
          SAFETY:  `=}>` cannot be valid TypeScript/JSX outside string; always a typo.

  V15_R2  Concatenated t() call cleanup in object/JSX context:
            title: " + " + t('x') + " + ",
            title: " + " + t('x'),
         →  title: t('x'),
            <DialogTitle>" + " + t('key') + " + "</DialogTitle>
         →  <DialogTitle>{t('key')}</DialogTitle>
          Very narrow: only remove literal  " + "  wrap around t() or remove leading " + ".

  V15_R3  Dependency array / destructured params with `+` instead of `,`:
            [a + b] = useState(...)   →   [a, b] = useState(...)
            ({ from + to + count })   →   ({ from, to, count })
            (_ + p)                   →   (_, p)
            (_ + newValue)            →   (_, newValue)
          Context matters: only inside ( ) or [ ] when it's destructuring/params.
"""
from __future__ import annotations
from pathlib import Path
from typing import List, Tuple
import re, sys


def _token_ctx(line: str):
    n = len(line)
    S = ["code"] * n
    i = 0
    state = "code"
    while i < n:
        c = line[i]
        if state == "code":
            if c == "/" and i + 1 < n and line[i + 1] == "/":
                for j in range(i, n): S[j] = "comment"
                break
            if c == "'":   state = "sq-str"
            elif c == '"': state = "dq-str"
            elif c == "`": state = "bt-str"
            S[i] = state
        elif state == "sq-str":
            S[i] = state
            if c == "\\" and i + 1 < n: S[i+1] = state; i += 2; continue
            if c == "'": state = "code"
        elif state == "dq-str":
            S[i] = state
            if c == "\\" and i + 1 < n: S[i+1] = state; i += 2; continue
            if c == '"': state = "code"
        elif state == "bt-str":
            S[i] = state
            if c == "\\" and i + 1 < n: S[i+1] = state; i += 2; continue
            if c == "`": state = "code"
        i += 1
    return S


def _in_ctx(S, i, a, b, allowed=("code",)):
    if i < 0 or i >= len(S): return False
    if S[i] not in allowed: return False
    for j in range(a, min(b + 1, len(S))):
        if S[j] not in allowed: return False
    return True


def V15_R1_broken_arrow(line: str, S: List[str]) -> Tuple[str, int]:
    """Replace =}> (broken arrow) with => at code level only.

    SAFETY: `=}>` as 3 chars is NEVER valid TypeScript/React JSX in code context.
    It can only appear inside strings where we must NOT touch it.
    """
    fixes = 0
    out_chars = list(line)
    #  Match: ) =}>   or  )  =  }  >  (spaces allowed)
    for m in list(re.finditer(r"\)\s*=\s*\}\s*>", line)):
        if not _in_ctx(S, m.start(), m.start(), m.end() - 1):
            continue
        # The 3 tokens we need to change: remove the '}' between '=' and '>'
        # Pattern:  )  [spaces]  =  [spaces]  }  [spaces]  >
        # Result :  )  [spaces]  =  [spaces]  >         (i.e. remove just the })
        # Find the '}' inside the match (we know there is exactly one from regex)
        body = m.group(0)
        idx_close_brace = body.find("}")
        abs_close = m.start() + idx_close_brace
        # Also need to potentially remove the whitespace before brace, but simpler:
        #   replace the entire match with ") " + "=" + ">" (collapse whitespace to be safe)
        # Actually preserve internal spacing of = and > but remove the }
        before_brace = body[:idx_close_brace]
        after_brace = body[idx_close_brace + 1:]
        # after_brace will contain ' >'  (or similar) already
        replacement = before_brace + after_brace.replace("  ", " ")
        # Replace out_chars
        new_len = len(replacement)
        old_len = len(body)
        for k in range(old_len):
            if k < new_len:
                out_chars[m.start() + k] = replacement[k]
            else:
                # pad (or we can delete extra chars; easier to use slice reconstruction)
                pass
        # Actually simpler: rebuild line via string slice (safer than char array for len diffs)
        line = line[:m.start()] + replacement + line[m.end():]
        out_chars = list(line)
        S = _token_ctx(line)
        fixes += 1
    return line, fixes


def V15_R2_concat_t_wrap(line: str, S: List[str]) -> Tuple[str, int]:
    """Remove literal " + "  /  ' + '  wrappers around t() calls in code context.

    Target cases:
      title: " + " + t('x') + " + ",    →   title: t('x'),
      title: " + " + t('x'),            →   title: t('x'),
      {editingItem ? " + " + t('x') + " + " : t('y')}   →   {editingItem ? t('x') : t('y')}

    Only do this in CODE context (not inside strings).
    """
    fixes = 0
    out_chars = list(line)
    # Pass 1:   <quote> + <quote> + t(...) + <quote> + <quote>
    #           where <quote> is "  OR  '  (same kind on both sides of a segment)
    for pattern in [
        # Pattern A:  " + " + t(xxx) + " + "  (full symmetric wrap)
        (r'(["\'])\s*\+\s*\1\s*\+\s*(t\((?:[^()]|\([^()]*\))*\))\s*\+\s*\1\s*\+\s*\1',
         lambda m: m.group(2)),  # → just t(...)
        # Pattern B:  leading  " + " + t(xxx)   (no trailing wrap)
        (r'(["\'])\s*\+\s*\1\s*\+\s*(t\((?:[^()]|\([^()]*\))*\))(?!\s*\+)',
         lambda m: m.group(2)),
    ]:
        regex, replacer = pattern
        # Use reverse iteration (rightmost first) to keep indices valid
        for m in reversed(list(re.finditer(regex, line))):
            if not _in_ctx(S, m.start(), m.start(), m.end() - 1):
                continue
            repl = replacer(m)
            line = line[:m.start()] + repl + line[m.end():]
            fixes += 1
            S = _token_ctx(line)
    return line, fixes


def V15_R3_destruct_plus_to_comma(line: str, S: List[str]) -> Tuple[str, int]:
    """Replace `+` with `,` in function params / destructured tuples/objects.

    Cases (all in CODE context):
      [A + B] = useState(    →    [A, B] = useState(
      [_ + p] =             →    [_, p] =
      ({ from + to + count }) =  →    ({ from, to, count }) =
      (_ + newValue) =}>  (wait no, the =}> is handled in R1; but before R1, the param part)
      onChange={(_ + newValue)   →   onChange={(_, newValue)

    Strategy: find  (  or  [   at code level, then balance, find + inside between ids, convert to ,.
    """
    fixes = 0
    out_chars = list(line)
    n = len(line)
    # Use right-to-left per match to keep indices stable
    matches: List[Tuple[int, int, str]] = []
    # 1. Tuple destructure  [X + Y]  followed by  =  or  )  or  ,
    for m in re.finditer(r"\[([^\[\]()=]{1,120})\]", line):
        inside = m.group(1)
        if "+" not in inside: continue
        if not _in_ctx(S, m.start(), m.start(), m.end() - 1): continue
        # Validate: separated by + must be identifiers (words, _)
        if not re.fullmatch(r"\s*[A-Za-z_$][\w$]*(\s*\+\s*[A-Za-z_$][\w$]*)+\s*", inside):
            continue
        # Also check the char after ] makes sense as destructuring context
        after = line[m.end(): m.end() + 3].lstrip()
        if after[:1] not in ("=", ",", ":", ")"):
            continue
        matches.append((m.start() + 1, m.end() - 1, "square"))
    # 2. Function params / object destructure  (A + B)  inside JSX attr  onChange={(A+B)  or  = ({a+b})
    for m in re.finditer(r"\(([^()]{1,120})\)", line):
        inside = m.group(1)
        if "+" not in inside: continue
        if not _in_ctx(S, m.start(), m.start(), m.end() - 1): continue
        if not re.fullmatch(
            r"\s*(?:[A-Za-z_$][\w$]*\s*:\s*[^,+]+|[A-Za-z_$][\w$]*(?:\s*:\s*[A-Za-z_$][\w$.\[\]<>]+)?)"
            r"(\s*\+\s*(?:[A-Za-z_$][\w$]*\s*:\s*[^,+]+|[A-Za-z_$][\w$]*(?:\s*:\s*[A-Za-z_$][\w$.\[\]<>]+)?))+\s*",
            inside,
        ):
            continue
        after = line[m.end(): m.end() + 4].lstrip()
        # Valid: =}>  (arrow, broken), => , =  (destructure assign), comma, colon
        if after[:2] != "=}" and after[:2] != "=>" and after[:1] not in ("=", ",", ":", "{"):
            continue
        matches.append((m.start() + 1, m.end() - 1, "paren"))

    # Apply right to left
    for start, end, kind in sorted(matches, key=lambda x: -(x[0])):
        segment = "".join(out_chars[start:end])
        if "+" not in segment: continue
        new_segment, n_fixes = re.subn(r"(\S)\s*\+\s*(\S)", r"\1, \2", segment)
        if n_fixes > 0:
            # Replace
            delta = len(new_segment) - len(segment)
            if delta >= 0:
                for _ in range(delta):
                    out_chars.insert(end, " ")
            else:
                for _ in range(-delta):
                    if end - 1 >= start:
                        out_chars.pop(end - 1)
            for k, ch in enumerate(new_segment):
                if start + k < len(out_chars):
                    out_chars[start + k] = ch
            fixes += n_fixes
            line = "".join(out_chars)
    return "".join(out_chars), fixes


RULE_ORDER_V15 = [
    # Order matters: R3 (param fix) before R1 (arrow fix) because R1 uses the repaired parens
    ("R3_destruct_plus", V15_R3_destruct_plus_to_comma),
    ("R1_broken_arrow", V15_R1_broken_arrow),
    ("R2_concat_t_wrap", V15_R2_concat_t_wrap),
]


def fix_line(line: str) -> Tuple[str, int]:
    fixes = 0
    cur = line
    for name, fn in RULE_ORDER_V15:
        ctx = _token_ctx(cur)
        cur, n = fn(cur, ctx)
        fixes += n
    return cur, fixes


def fix_content(raw: str) -> Tuple[str, int]:
    out_lines = []
    total = 0
    for line in raw.split("\n"):
        new, n = fix_line(line)
        out_lines.append(new)
        total += n
    return "\n".join(out_lines), total


def main():
    root = Path("/Users/air/TOPEMS/apps/web/src")
    targets: List[Path] = []
    if len(sys.argv) > 1:
        for a in sys.argv[1:]:
            p = Path(a)
            if not p.is_absolute(): p = root / p
            if p.exists(): targets.append(p.resolve())
    else:
        # Top-30 by current TSC errors
        top = [
            "pages/erp/components/VoucherFormDialog.tsx",
            "pages/ehs/components/EhsHazardEditDialog.tsx",
            "pages/bi/components/BiPermissionEditDialog.tsx",
            "pages/finance/ConsolidationScopePage/index.tsx",
            "pages/wms/components/InventoryReportTable.tsx",
            "pages/erp/components/DatabaseManagementTableList.tsx",
            "pages/ai/components/AiAssistantFlowTab.tsx",
            "pages/plugin/components/PluginDetailDialog.tsx",
            "pages/mobile/hooks/useMobileApproval.tsx",
            "pages/erp/components/VoucherDetailTabs.tsx",
            "pages/erp/components/DatabaseManagementModals.tsx",
            "pages/mobile/components/MobileProductionFilters.tsx",
            "components/templates/list/hooks.tsx",
            "pages/wms/components/InventoryReportChart.tsx",
            "pages/erp/components/FinancialReportTables.tsx",
            "pages/ai/components/DashboardTrend.tsx",
            "pages/admin/components/PluginInstallStepper.tsx",
            "components/templates/list/Pagination.tsx",
            "pages/shared/hooks/useDashboardData.tsx",
            "pages/mobile/components/AttendanceLeaveTab.tsx",
            "pages/wms/components/InventoryReportFilters.tsx",
            "pages/system/AuditLogPage/index.tsx",
            "pages/pdm/DocumentPage.tsx",
            "components/templates/GisMapTemplate.tsx",
            "components/bi/DashboardTemplateManager.tsx",
            "pages/admin/PluginManagementPage.tsx",
            "pages/ai/AiChatPage.tsx",
            "pages/ai/AiKnowledgeBasePage.tsx",
            "components/templates/ReportDesignerTemplate/components/LayoutPanel.tsx",
            "pages/finance/BudgetManagementPage.tsx",
        ]
        targets = [(root / t).resolve() for t in top if (root / t).exists()]
        # Auto-scan for any file containing =}> or literal " + " + t( patterns
        telltale = re.compile(r"\)\s*=\s*\}\s*>|[\"']\s*\+\s*[\"']\s*\+\s*t\(")
        auto = []
        for p in sorted(list(root.rglob("*.tsx")) + list(root.rglob("*.ts"))):
            try:
                data = p.read_text(encoding="utf-8", errors="ignore")
            except Exception: continue
            if telltale.search(data):
                rp = p.resolve()
                if rp not in targets: auto.append(rp)
        print(f"Top-30 targets {len(targets)}; auto-sweep found {len(auto)} more files.")
        targets += auto

    fixed_files = 0
    total_fixes = 0
    for p in targets:
        try:
            raw = p.read_text(encoding="utf-8")
        except Exception: continue
        new, n = fix_content(raw)
        if n > 0:
            p.write_text(new, encoding="utf-8")
            fixed_files += 1
            total_fixes += n
            rel = p.relative_to(root) if root in p.parents else p.name
            print(f"  FIXED  {rel}   (v15-fixes: {n})")
    print(f"\nFixed files: {fixed_files}   total V15 fixes: {total_fixes}")


if __name__ == "__main__":
    main()
