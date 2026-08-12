#!/usr/bin/env python3
"""TOPEMS coverage report aggregator.

Reads:
  - <OUTPUT_DIR>/per-crate/*.json (per-Rust-crate llvm-cov summaries)
  - <PROJECT_ROOT>/apps/web/coverage/coverage-summary.json (vitest)

Produces:
  - <OUTPUT_DIR>/report.md  (human-readable Markdown)
  - <OUTPUT_DIR>/report.json (machine-readable, threshold-annotated)
  - Console ASCII summary table

Exit codes:
   0 OK (all thresholds passed or no thresholds given)
   1 Threshold(s) NOT satisfied
  99 Internal error (guarded top-level; should not happen)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


GREEN_TIER = 40.0
YELLOW_TIER = 15.0


def tier(pct: float) -> str:
    if pct >= GREEN_TIER:
        return "green"
    if pct >= YELLOW_TIER:
        return "yellow"
    return "red"


def tier_md(t: str) -> str:
    return {"green": "🟢", "yellow": "🟡", "red": "🔴"}.get(t, "⚪")


# ---------------- 工具链/元数据 ----------------
def git_commit_short(prj: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(prj), capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def git_branch(prj: Path) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(prj), capture_output=True, text=True, timeout=10,
        )
        return r.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def _run(cmd: list[str], cwd: Path | str | None = None) -> str:
    try:
        r = subprocess.run(cmd, cwd=str(cwd) if cwd else None,
                           capture_output=True, text=True, timeout=10)
        out = r.stdout.strip()
        return out.splitlines()[0] if out else "n/a"
    except Exception:
        return "n/a"


def toolchain_versions(prj: Path) -> dict:
    try:
        vitest_v = subprocess.run(
            ["bash", "-lc", "pnpm vitest --version 2>/dev/null | head -1"],
            cwd=str(prj / "apps" / "web"),
            capture_output=True, text=True, timeout=15,
        ).stdout.strip()
        vitest_v = vitest_v.splitlines()[0] if vitest_v else "n/a"
    except Exception:
        vitest_v = "n/a"
    return {
        "rust":     _run(["rustc", "--version"]),
        "llvm_cov": _run(["bash", "-lc",
                          "llvm-cov --version 2>/dev/null | head -1 || true"]),
        "node":     _run(["node", "--version"]),
        "pnpm":     _run(["pnpm", "--version"]),
        "vitest":   vitest_v,
    }


# ---------------- Rust: 读取 per-crate JSON ----------------
def _cov_fields(section: dict) -> tuple[float, int, int]:
    cnt = int(section.get("count", 0) or 0)
    cvd = int(section.get("covered", 0) or 0)
    pct_raw = section.get("percent")
    if not isinstance(pct_raw, (int, float)):
        pct = round(100.0 * cvd / cnt, 2) if cnt else 0.0
    else:
        pct = round(float(pct_raw), 2)
    return pct, cvd, cnt


def read_rust_per_crate(output_dir: Path) -> list[dict]:
    per_dir = output_dir / "per-crate"
    if not per_dir.is_dir():
        return []
    rows: list[dict] = []
    for p in sorted(per_dir.glob("*.json")):
        try:
            with p.open() as fh:
                d = json.load(fh)
        except Exception as e:
            rows.append({"crate": p.stem, "status": "failed",
                         "reason": f"json_parse_error: {e}"})
            continue
        status = d.get("status", "ok")
        if status != "ok" or "totals" not in d:
            # 保留原始 status + reason + crate
            row = {"crate": d.get("crate", p.stem),
                   "status": status,
                   "reason": d.get("reason", f"status={status}")}
            rows.append(row)
            continue
        t = d["totals"]
        lp, lc, ln = _cov_fields(t.get("lines", {}))
        fp, fc, fn = _cov_fields(t.get("functions", {}))
        bp, bc, bn = _cov_fields(t.get("branches", {}))
        name = d["crate"]
        if name.startswith("topems-shared") or name == "topems" or name.startswith("shared"):
            cat = "lib"
        elif name.startswith("topems-") and "tools" not in name:
            cat = "svc"
        else:
            cat = "other"
        rows.append({
            "crate": name,
            "status": "ok",
            "category": cat,
            "lines_pct": lp, "lines_covered": lc, "lines_count": ln,
            "functions_pct": fp, "functions_covered": fc, "functions_count": fn,
            "branches_pct": bp,  "branches_covered":  bc, "branches_count":  bn,
            "files_count": int(d.get("files_count", 0) or 0),
            "tier": tier(lp),
        })
    ok = [r for r in rows if r.get("status") == "ok"]
    ok.sort(key=lambda r: r["lines_pct"], reverse=True)
    rest = [r for r in rows if r.get("status") != "ok"]
    return ok + rest


# ---------------- TS: 读取 vitest coverage-summary.json ----------------
def read_ts_summary(prj: Path) -> dict | None:
    path = prj / "apps" / "web" / "coverage" / "coverage-summary.json"
    if not path.is_file():
        return None
    try:
        with path.open() as fh:
            d = json.load(fh)
    except Exception:
        return None
    total = d.get("total", {}) or {}
    out: dict = {}
    for key in ("lines", "functions", "statements", "branches"):
        s = total.get(key, {}) or {}
        tot = int(s.get("total", 0) or 0)
        cvd = int(s.get("covered", 0) or 0)
        pct_in = s.get("pct")
        if not isinstance(pct_in, (int, float)):
            pct = round(100.0 * cvd / tot, 2) if tot else 0.0
        else:
            pct = round(float(pct_in), 2)
        out[key] = {"pct": pct, "covered": cvd, "total": tot}
    return out


# ---------------- 汇总 ----------------
def build_summary(rust_rows: list[dict], ts: dict | None) -> dict:
    rust: dict = {"crates_count": 0}
    ok = [r for r in rust_rows if r.get("status") == "ok"]
    if ok:
        rust["crates_count"] = len(ok)
        def _sum(fc: str, fn_: str) -> tuple[int, int]:
            c = sum(r[fc]   for r in ok)
            n = sum(r[fn_]  for r in ok)
            return c, n
        lc, ln = _sum("lines_covered", "lines_count")
        fc, fn = _sum("functions_covered", "functions_count")
        bc, bn = _sum("branches_covered", "branches_count")
        rust.update({
            "lines_pct":       round(100.0 * lc / ln, 2) if ln else 0.0,
            "lines_covered":   lc, "lines_count": ln,
            "functions_pct":   round(100.0 * fc / fn, 2) if fn else 0.0,
            "functions_covered": fc, "functions_count": fn,
            "branches_pct":    round(100.0 * bc / bn, 2) if bn else 0.0,
            "branches_covered": bc, "branches_count": bn,
        })
    else:
        rust.update({
            "lines_pct": 0.0, "functions_pct": 0.0, "branches_pct": 0.0,
            "lines_covered": 0, "lines_count": 0,
            "functions_covered": 0, "functions_count": 0,
            "branches_covered":  0, "branches_count":  0,
        })

    ts_out: dict | None = None
    if ts:
        ts_out = {
            "lines_pct":      ts["lines"]["pct"],
            "functions_pct":  ts["functions"]["pct"],
            "branches_pct":   ts["branches"]["pct"],
            "statements_pct": ts["statements"]["pct"],
            "statements_covered": ts["statements"]["covered"],
            "statements_total":   ts["statements"]["total"],
            "lines_covered": ts["lines"]["covered"],
            "lines_total":   ts["lines"]["total"],
        }

    overall_pct: float | None = None
    if rust.get("lines_count") or (ts and ts["statements"]["total"]):
        cov = rust["lines_covered"] + (ts["statements"]["covered"] if ts else 0)
        tot = rust["lines_count"]   + (ts["statements"]["total"]   if ts else 0)
        overall_pct = round(100.0 * cov / tot, 2) if tot else 0.0
    overall = {"lines_pct": overall_pct, "crate_weighted": True}
    return {"rust": rust, "ts": ts_out, "overall": overall}


def eval_threshold(summary: dict, args: argparse.Namespace) -> dict:
    failures: list[str] = []

    def _check(label: str, actual: float | None, threshold: str | None) -> None:
        if threshold is None or actual is None:
            return
        try:
            th = float(threshold)
        except ValueError:
            failures.append(f"{label}: invalid threshold '{threshold}'")
            return
        if actual < th:
            failures.append(f"{label}: actual {actual}% < threshold {th}%")

    r = summary.get("rust", {})
    t = summary.get("ts") or {}
    _check("overall", summary.get("overall", {}).get("lines_pct"), args.fail_under)
    _check("rust",    r.get("lines_pct"),                            args.fail_rust_under)
    _check("ts",      t.get("lines_pct"),                            args.fail_ts_under)
    enabled = bool(args.fail_under or args.fail_rust_under or args.fail_ts_under)
    return {
        "enabled": enabled,
        "fail_under_lines":       float(args.fail_under)      if args.fail_under      else None,
        "fail_rust_under_lines":  float(args.fail_rust_under) if args.fail_rust_under else None,
        "fail_ts_under_lines":    float(args.fail_ts_under)   if args.fail_ts_under   else None,
        "actual_overall_lines_pct": summary.get("overall", {}).get("lines_pct"),
        "reasons": failures,
        "passed": (len(failures) == 0) if enabled else True,
    }


# ---------------- Markdown ----------------
def _md_row(r: dict, rank: str) -> str:
    t = tier_md(r.get("tier", "red"))
    cat = {"lib": "lib", "svc": "svc", "other": "oth"}.get(r.get("category", "other"), "oth")
    return (f"| {rank} | `{r['crate']}` | {cat} | {r['lines_pct']}% | "
            f"{r['lines_covered']}/{r['lines_count']} | "
            f"{r['functions_pct']}% | {r['branches_pct']}% | {t} |")


def build_markdown(meta: dict, summary: dict, rust_rows: list[dict], threshold: dict) -> str:
    r = summary["rust"]
    t = summary.get("ts")
    o = summary["overall"]

    def tt(pct: float | None) -> str:
        return tier_md(tier(pct)) if isinstance(pct, (int, float)) else "—"

    lines: list[str] = []
    lines.append("# TOPEMS 测试覆盖率基线报告")
    lines.append("")
    lines.append(f"> **生成时间**：{meta['generated_at']}  ")
    lines.append(f"> **Git**：{meta['git_branch']} @ `{meta['git_commit']}`  ")
    mode_note = f"{r['crates_count']} crates + apps/web"
    lines.append(f"> **模式**：{meta['mode']}（{mode_note}）  ")
    tc = meta.get("toolchain", {})
    lines.append(f"> **工具链**：{tc.get('rust','?')} / {tc.get('vitest','?')}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 总览")
    lines.append("")
    lines.append("| 维度 | 行覆盖 | 函数覆盖 | 分支覆盖 | Tier |")
    lines.append("|:----:|:------:|:--------:|:--------:|:----:|")
    lines.append(f"| **Rust（加权，{r['crates_count']} crate）** | {r['lines_pct']}% | "
                 f"{r['functions_pct']}% | {r['branches_pct']}% | {tt(r['lines_pct'])} |")
    if t:
        lines.append(f"| **TS（apps/web，vitest）** | {t['lines_pct']}% | "
                     f"{t['functions_pct']}% | {t['branches_pct']}% | {tt(t['lines_pct'])} |")
    else:
        lines.append("| **TS（apps/web，vitest）** | — | — | — | — |")
    overall_pct = o["lines_pct"]
    lines.append(f"| **整体合并** | **{overall_pct if overall_pct is not None else '—'}%** | "
                 f"— | — | {tt(overall_pct)} |")
    lines.append("")
    if threshold["enabled"]:
        pf = "✅ PASS" if threshold["passed"] else "❌ FAIL"
        reasons = ("<br>".join(threshold["reasons"])) if threshold["reasons"] else "所有阈值通过"
        lines.append(f"> **阈值判断**：{pf}  ")
        detail_bits = []
        if threshold["fail_under_lines"] is not None:
            detail_bits.append(f"overall < {threshold['fail_under_lines']}%")
        if threshold["fail_rust_under_lines"] is not None:
            detail_bits.append(f"rust < {threshold['fail_rust_under_lines']}%")
        if threshold["fail_ts_under_lines"] is not None:
            detail_bits.append(f"ts < {threshold['fail_ts_under_lines']}%")
        lines.append(f"> 启用阈值：{' / '.join(detail_bits) if detail_bits else '(none)'}  ")
        lines.append(f"> 细节：{reasons}")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Rust 分 Crate 明细（按行覆盖降序）")
    lines.append("")
    lines.append("| # | Crate | 分类 | 行覆盖 | 行已测/总数 | 函数覆盖 | 分支覆盖 | Tier |")
    lines.append("|--:|:------|:----:|:------:|:----------:|:--------:|:--------:|:----:|")
    rank = 1
    ok_count = 0
    for row in rust_rows:
        if row.get("status") != "ok":
            continue
        lines.append(_md_row(row, str(rank)))
        rank += 1
        ok_count += 1
    if ok_count == 0:
        lines.append("| — | _(no ok crates)_ | — | — | — | — | — | — |")
    skipped = [r for r in rust_rows if r.get("status") != "ok"]
    if skipped:
        lines.append("")
        lines.append("### 跳过 / 失败的 Crates（不参与汇总）")
        lines.append("")
        lines.append("| Crate | status | 原因 |")
        lines.append("|:------|:------:|:-----|")
        for r_s in skipped:
            lines.append(f"| `{r_s.get('crate','?')}` | {r_s.get('status','?')} | "
                         f"{r_s.get('reason','-')} |")
    lines.append("")
    lines.append("**每 Crate HTML 详情**：`target/coverage/html/<crate>/index.html`（`--no-html` 不生成）")
    lines.append("")
    if t:
        lines.append("---")
        lines.append("")
        lines.append("## TypeScript（apps/web）")
        lines.append("")
        lines.append("| 维度 | 语句 | 行 | 函数 | 分支 |")
        lines.append("|:-----|:----:|:--:|:----:|:----:|")
        lines.append(f"| 总计 | {t['statements_pct']}% | {t['lines_pct']}% | "
                     f"{t['functions_pct']}% | {t['branches_pct']}% |")
        lines.append("")
        lines.append("**HTML 详情**：`apps/web/coverage/index.html`")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 数据来源")
    lines.append("")
    lines.append("- 机器可读 JSON：`report.json`（与本 report.md 同目录）")
    lines.append("- 复现命令：`./scripts/ci/coverage-baseline.sh --fast`")
    lines.append("")
    return "\n".join(lines) + "\n"


# ---------------- 控制台 ASCII 摘要 ----------------
def console_summary(summary: dict, threshold: dict) -> str:
    r = summary["rust"]
    t = summary.get("ts")
    o = summary["overall"]
    out: list[str] = []
    out.append("")
    out.append("================ TOPEMS COVERAGE SUMMARY ================")
    def pct(x: float | None, w: int = 5) -> str:
        return f"{x:{w}.1f}%" if isinstance(x, (int, float)) else "    — "
    out.append(f"  Rust (n={r['crates_count']:>3})       lines {pct(r['lines_pct'])}  "
               f"func {pct(r['functions_pct'])}  br {pct(r['branches_pct'])}  "
               f"[{tier(r['lines_pct'])}]")
    if t:
        out.append(f"  TS (apps/web)                  lines {pct(t['lines_pct'])}  "
                   f"func {pct(t['functions_pct'])}  br {pct(t['branches_pct'])}  "
                   f"[{tier(t['lines_pct'])}]")
    overall_pct = o["lines_pct"]
    if isinstance(overall_pct, (int, float)):
        out.append(f"  OVERALL                       lines {pct(overall_pct)}  "
                   f"[{tier(overall_pct)}]")
    else:
        out.append("  OVERALL                       lines      —  [unknown]")
    if threshold["enabled"]:
        pf = "PASS" if threshold["passed"] else "FAIL"
        out.append(f"  THRESHOLD                     {pf}  (reasons: {len(threshold['reasons'])})")
        for reason in threshold["reasons"]:
            out.append(f"    - {reason}")
    out.append("==========================================================")
    return "\n".join(out)


# ---------------- argparse 接线 ----------------
def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(
        prog="coverage-report.py",
        description="Aggregate TOPEMS coverage artifacts into MD+JSON.",
    )
    ap.add_argument("--mode", default="fast", choices=["fast", "full", "custom"])
    ap.add_argument("--output-dir", required=True, type=Path,
                    help="Directory containing per-crate/*.json and for report.md/json output")
    ap.add_argument("--project-root", required=True, type=Path,
                    help="TOPEMS project root (for git metadata + TS coverage path)")
    ap.add_argument("--fail-under",         default=None, type=str,
                    help="Overall line coverage < PCT (float) -> exit 1")
    ap.add_argument("--fail-rust-under",    default=None, type=str,
                    help="Rust line coverage < PCT (float) -> exit 1")
    ap.add_argument("--fail-ts-under",      default=None, type=str,
                    help="TS line coverage < PCT (float) -> exit 1")
    return ap.parse_args()


def main() -> int:
    try:
        args = parse_args()
        output_dir: Path = args.output_dir.expanduser().resolve()
        project_root: Path = args.project_root.expanduser().resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

        rust_rows = read_rust_per_crate(output_dir)
        ts_summary = read_ts_summary(project_root)
        summary = build_summary(rust_rows, ts_summary)
        threshold = eval_threshold(summary, args)

        meta = {
            "generated_at": now,
            "mode": args.mode,
            "version": "1",
            "git_commit": git_commit_short(project_root),
            "git_branch": git_branch(project_root),
            "toolchain": toolchain_versions(project_root),
        }

        report = {
            "meta": meta,
            "summary": summary,
            "rust_per_crate": rust_rows,
            "threshold": threshold,
        }

        report_json_path = output_dir / "report.json"
        with report_json_path.open("w") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        md = build_markdown(meta, summary, rust_rows, threshold)
        report_md_path = output_dir / "report.md"
        with report_md_path.open("w") as f:
            f.write(md)

        print(console_summary(summary, threshold))
        print(f"MD   → {report_md_path}")
        print(f"JSON → {report_json_path}")

        if not threshold["passed"]:
            return 1
        return 0
    except Exception as e:  # pragma: no cover - top-level guard
        print(f"[FATAL] {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 99


if __name__ == "__main__":
    sys.exit(main())
