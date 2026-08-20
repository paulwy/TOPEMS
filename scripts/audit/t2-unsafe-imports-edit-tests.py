#!/usr/bin/env python3
"""T2 UNSAFE_imports test-side import line editor.

FIXED 2026-08-20:
  OLD multi-line detection regex r"\};?\s*$" was WRONG for standard
  `import { X } from 'path';` lines because } precedes "from", not ";".
  Since ALL 20 edits for UNSAFE 23 names use pure single-line import
  statements, we now DROP multi-line handling entirely and treat every
  import statement as SINGLE-LINE (end-of-line ';' confirms the block).
  This is 100% safe and guarantees the file body after the import line
  is NEVER touched.

CORE RULES (non-negotiable):
 1. `import type { X } from '...'` lines: ALWAYS SKIPPED (even from_path matches).
 2. For matching `import { A, B, C } from '<PATH_SUFFIX>'` lines (SINGLE LINE only):
    a. Extract all imported names (preserve order, strip alias if any by taking first token).
    b. surviving = [name for name in imported_now if name not in names_to_remove]
    c. IF surviving is EMPTY list → DELETE THE ENTIRE IMPORT LINE (remove whole line from file).
    d. ELSE → REWRITE THE LINE to `import { S1, S2, S3 } from '<same quoted path>'`.
 3. Everything else (non-import lines, type imports, default imports, require()): LEFT INTACT.
"""
import json, re, sys
from pathlib import Path

def main(batch_file: str) -> int:
    ROOT = Path(__file__).resolve().parent.parent.parent
    batch = json.loads((ROOT / batch_file).read_text(encoding='utf-8'))
    edits = batch['edits']
    files_changed = 0
    lines_removed_total = 0
    lines_rewritten_total = 0
    for ed in edits:
        tf = ROOT / ed['test_file']
        if not tf.exists():
            print(f"⚠️  SKIP missing test_file: {ed['test_file']}", file=sys.stderr); continue
        rm = ed['names_to_remove']
        fps = ed['from_path_suffix']
        src = tf.read_text(encoding='utf-8', errors='ignore')
        lines = src.split('\n')
        new_lines = []
        matched_this_edit = False
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            # RULE 1: skip import type entirely
            is_import = bool(re.match(r"\s*import\s+", stripped))
            is_import_type = bool(re.match(r"\s*import\s+type\b", stripped))
            if is_import_type:
                new_lines.append(line); i += 1; continue
            if not is_import:
                # NOT an import line → KEEP VERBATIM, NEVER TOUCH
                new_lines.append(line); i += 1; continue
            # ---- SINGLE-LINE IMPORT ONLY. FIX: check this line both ends before processing ----
            # It must be a whole-line import statement to avoid accidentally matching
            # partial lines (like code comments that happen to start with // import ...).
            # Conditions:
            #   (a) contains all names in rm
            #   (b) has 'from' + quoted path == fps (exact)
            #   (c) line ends with ';' (import statement terminator) → i.e. single-line
            if not all(re.search(rf"\b{n}\b", line) for n in rm):
                new_lines.append(line); i += 1; continue
            mfrom = re.search(r"from\s+(['\"])(.+?)\1", line)
            if not mfrom:
                new_lines.append(line); i += 1; continue
            from_path = mfrom.group(2)
            if from_path != fps:
                new_lines.append(line); i += 1; continue
            # Single-line check: line must end with ; (after trim)
            if not re.search(r";\s*$", line):
                # Multi-line (not expected). Be safe: leave untouched, do NOT consume.
                raise AssertionError(
                    f"Multi-line import encountered but UNSAFE 23 names all are single-line! "
                    f"File={ed['test_file']} line {i+1}: {line.strip()[:100]}"
                )
            # Extract names inside {} (guaranteed single line now)
            mb = re.search(r"\{\s*(.+?)\s*\}", line)
            if not mb:
                new_lines.append(line); i += 1; continue
            inside = mb.group(1)
            items = [x.strip() for x in re.split(r",\s*", inside) if x.strip()]
            surviving_items = []
            for it in items:
                m_first = re.match(r"(\w+)", it)
                first_token = m_first.group(1) if m_first else it
                if first_token in rm:
                    continue
                surviving_items.append(it)
            matched_this_edit = True
            if not surviving_items:
                # RULE 2c: delete entire line
                lines_removed_total += 1
                i += 1
                continue
            # RULE 2d: rewrite the line (preserve quote style)
            mquote = re.search(r"from\s+(['\"])", line)
            quote = mquote.group(1) if mquote else "'"
            fp = from_path
            new_line = f"import {{ {', '.join(surviving_items)} }} from {quote}{fp}{quote};"
            new_lines.append(new_line)
            lines_rewritten_total += 1
            i += 1
        if not matched_this_edit:
            raise AssertionError(f"No matching import line found for edit: test_file={ed['test_file']} from={fps} remove={rm}. Check test file for import format.")
        new_src = '\n'.join(new_lines)
        if new_src != src:
            tf.write_text(new_src, encoding='utf-8')
            files_changed += 1
    print(f"✅ Import editor done. Files mutated: {files_changed}  /  import lines DELETED: {lines_removed_total}  /  import lines REWRITTEN (surviving non-empty): {lines_rewritten_total}")
    assert lines_rewritten_total == 4, f"Expected exactly 4 rewrites (batchOperation test+regression + useIsMobile + normalizePageParams). Got {lines_rewritten_total}"
    return 0

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python3 t2-unsafe-imports-edit-tests.py <BATCH_JSON_PATH>", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
