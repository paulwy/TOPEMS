#!/usr/bin/env python3
"""存量错误泄露迁移工具（一次性 codemod，按服务执行）

把 `ApiResponse::error(500, &format!("固定文案: {}", e))` 改写为
`ApiResponse::from(TopemsError::internal("固定文案", e))`，并为文件补全 `TopemsError` 导入。

背景与规范：docs/architecture/unified-error-handling-decision.md（§4 迁移路径）

设计原则 —— **宁窄勿宽**：
  默认仅改写 `<500, &format!("<无占位符的固定文案>: {}", <错误变量>)>` 这一完全确定的形态。
  其余形态（format 串含额外占位符、`e.to_string()`、非 500 状态码等）一律跳过并列出，
  交由人工判断——机械改写若猜错，会静默改变响应状态码语义。

  加 `--include-4xx` 可额外改写 `<400|403|404|409|503, &format!("固定文案: {}", e)>`：
  这类是"客户端输入非法"，按 ADR §4.1 的既定策略处理——**保留原状态码**、客户端回
  逐字静态文案（用 classify() 里 msg 原样回显的变体）、细节只进 tracing::warn!。
  之所以做成开关而非默认：它会改变客户端可见文案（摘掉泄露位），应当是显式决定。
  机械化的价值在于**文案从前缀逐字复制**——人工重打曾把 "GeoJSON解析失败" 写成
  "GeoJSON 解析失败"（多一空格），改变客户端可见文案。

用法：
  python3 scripts/migrations/migrate_error_leaks.py --service gis --dry-run
  python3 scripts/migrations/migrate_error_leaks.py --service gis
  python3 scripts/migrations/migrate_error_leaks.py --service ticket --include-4xx

写盘后自动对改动文件跑 pin 工具链 rustfmt 收尾（`--no-format` 可关）：
  单行形态在函数名较长 / 缩进较深时会超过 100 列，rustfmt 会折行。
  早期版本声称"emitted 即 rustfmt 规范输出"，只对短行成立——unified-core 的
  `TopemsError::internal("list_documents", e)` 就被判漂移。不要自己复刻 rustfmt
  的折行启发式，直接调用它作为权威收尾。

配套校验（改完必跑）：
  cargo check -p topems-<service>
  rustfmt --edition 2021 --check <改动文件>     # 应零输出
  node scripts/ci/check-error-handling.cjs --changed-only
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from typing import Iterator

# 错误变量命名（与 scripts/ci/check-error-handling.cjs 的 ERR_VAR 保持一致）
ERR_VAR = r"(?:e|err|error|ex|io_err|sql_err|db_err|db_error|repo_err|err_msg|anyhow_err)"

CALL = re.compile(r"ApiResponse::error\(")

# 文案串：不含引号、反斜杠转义与花括号 —— 保证"逐字复制回 Rust 字符串"是安全的
CTX = r'(?P<ctx>[^"\\{}]*): \{\}'

# 可机械迁移的完整参数体（已归一化空白）：
#   `500, &format!("查询失败: {}", e)` / `StatusCode::INTERNAL_SERVER_ERROR.as_u16(), &format!("...", e),`
BODY = re.compile(
    r"^\s*(?:500|StatusCode::INTERNAL_SERVER_ERROR\.as_u16\(\))\s*,\s*"
    r"&?\s*format!\(\s*\"" + CTX + r"\"\s*,\s*"
    r"&?(?P<err>" + ERR_VAR + r")(?:\.to_string\(\))?\s*\)\s*,?\s*$"
)

# `<500, &e.to_string()>` 直出形态（unified-core 35 处 / finance 364 处的主形态）。
# 上下文取所在函数名——只进日志，客户端消息由 internal() 恒定为通用文案。
BODY_TOSTRING = re.compile(
    r"^\s*500\s*,\s*&?(?P<err>" + ERR_VAR + r")\.to_string\(\)\s*,?\s*$"
)

# 4xx/5xx 客户端输入类（--include-4xx 时启用）。
# 变体选择约束：classify() 必须**原样回显 msg**，否则会改变客户端文案。
#   400 ValidationFailed / 403 OperationNotAllowed / 404 ResourceNotFound(非 NotFound，后者会加"未找到: "前缀) /
#   409 ResourceAlreadyExists / 503 ServiceUnavailable
BODY_4XX = re.compile(
    r"^\s*(?P<code>400|403|404|409|503)\s*,\s*"
    r"&?\s*format!\(\s*\"" + CTX + r"\"\s*,\s*"
    r"&?(?P<err>" + ERR_VAR + r")(?:\.to_string\(\))?\s*\)\s*,?\s*$"
)

CODE_TO_VARIANT = {
    "400": "ValidationFailed",
    "403": "OperationNotAllowed",
    "404": "ResourceNotFound",
    "409": "ResourceAlreadyExists",
    "503": "ServiceUnavailable",
}

# 疑似泄露但需人工判断（用于提示，不自动改写）
MAYBE_LEAK = re.compile(r"format!.*?\{\}\s*\",?\s*" + ERR_VAR + r"\b")


def extract_args(text: str, open_idx: int) -> tuple[int, str]:
    """从 `(` 的索引起做括号配平，返回 (结束索引 exclusive, 参数文本)。跳过字符串字面量。"""
    depth = 1
    in_str = False
    esc = False
    j = open_idx + 1
    while j < len(text) and depth > 0:
        c = text[j]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    return j + 1, text[open_idx + 1 : j]
        j += 1
    return len(text), text[open_idx + 1 :]


def add_import(text: str) -> str:
    """确保文件能解析到 TopemsError。注意判断"是否已导入"，而非"是否出现该符号"。

    关键约束：`TopemsError` 位于 crate 根（`lib/shared-core/src/lib.rs` 的
    `pub use error::{..., TopemsError}`），**不在 `response` 模块**。
    因此绝不能把它拼进 `use topems_shared_core::response::{...}` —— 那是编译错误。
    对已有的分组导入一律"另起一行"追加独立导入。
    """
    if re.search(r"^\s*use\s+.*\bTopemsError\b", text, re.M):
        return text

    # a) 单条导入 → 合并为嵌套分组（合法：crate 根同时导出 response 与 TopemsError）
    pat = "use topems_shared_core::response::ApiResponse;"
    if pat in text:
        return text.replace(
            pat, "use topems_shared_core::{response::ApiResponse, TopemsError};", 1
        )

    # b) 其它任何形式的 ApiResponse 导入（含分组）→ 紧随其后追加一条独立导入，
    #    不修改原有导入语句，避免猜错模块归属。
    m = re.search(
        r"^[ \t]*use\s+topems_shared_core::[^;\n]*\bApiResponse\b[^;\n]*;", text, re.M
    )
    if m:
        return text[: m.end()] + "\nuse topems_shared_core::TopemsError;" + text[m.end() :]

    # c) 兜底：插到第一条 use 语句之前
    m = re.search(r"^use .*?;$", text, re.M)
    if m:
        return text[: m.start()] + "use topems_shared_core::TopemsError;\n" + text[m.start() :]
    return "use topems_shared_core::TopemsError;\n" + text


def iter_rust_files(root: str) -> Iterator[str]:
    for dp, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in {"target", "node_modules", ".git", "_archive"}]
        for fn in files:
            if fn.endswith(".rs"):
                yield os.path.join(dp, fn)


def prune_unused_status_code(text: str) -> str:
    """摘掉因迁移而变成孤儿的 `StatusCode` 导入。

    迁移把 `StatusCode::INTERNAL_SERVER_ERROR.as_u16()` 换成了 `TopemsError::internal(..)`，
    若该文件里 `StatusCode` 再无其它用途，导入即变成 unused —— 而 CI 门禁是
    `cargo clippy -- -D warnings`，unused import 会直接把门禁打红。

    注意：本函数只写回"摘除导入"的结果，判断用的 `without_uses` 是**局部副本**，
    即使启发式剥注释判断失误也不会污染输出文件。
    """
    # 只按"行首 use 语句"剥离（`[^;]*` 跨行，DOTALL），避免把注释里的 use 也吃掉
    without_uses = re.sub(r"^[ \t]*use\b[^;]*;", "", text, flags=re.M | re.S)
    # 注释里写 StatusCode 不算使用；但只在"该行 `//` 之前双引号成对"时才判为真注释，
    # 以免把字符串字面量里的 `//` 误当注释起点而吃掉后面的代码。
    def strip_line_comment(line: str) -> str:
        idx = line.find("//")
        if idx < 0:
            return line
        return line[:idx] if line[:idx].count('"') % 2 == 0 else line

    without_uses = "\n".join(strip_line_comment(l) for l in without_uses.split("\n"))
    if re.search(r"\bStatusCode\b", without_uses):
        return text  # 仍有使用，不动

    original = text
    # 1) 分组导入里的独立一项：整行删除
    text = re.sub(r"^[ \t]*http::StatusCode,[ \t]*\n", "", text, flags=re.M)
    # 2) 独占一行的完整导入
    text = re.sub(r"^[ \t]*use\s+[\w:]*http::StatusCode;[ \t]*\n", "", text, flags=re.M)
    # 3) 同一行内的分组项：`use axum::{http::StatusCode, Json};`
    text = re.sub(r"(use\s+[^;\n]*?\{[^}]*?)\bhttp::StatusCode\s*,\s*", r"\1", text)
    text = re.sub(r"(use\s+[^;\n]*?\{[^}]*?),\s*http::StatusCode\b", r"\1", text)
    # 4) 收尾：分组只剩一项时收成直写（否则 rustfmt --check 会判漂移）
    text = re.sub(r"(use\s+[\w:]+::)\{\s*([\w:]+)\s*\};", r"\1\2;", text)
    return text if text != original else original


def build_4xx_replacement(content: str, start: int, ctx: str, err: str, variant: str) -> str:
    """生成 4xx 改写文本。

    采用 `ApiResponse::from({ tracing::warn!(..); TopemsError::X(..) })` 块表达式，
    这样在 `Json(...)` 参数位与 `return` 语句两种上下文中都成立，且**不新增库 API**。

    缩进按调用点所在行的前导空白计算（内层 +4）——emitted 即为 rustfmt 规范格式，
    否则 `cargo fmt --check`（Gate J）会判漂移。已用 pin 工具链实测确认。
    """
    line_start = content.rfind("\n", 0, start) + 1
    indent = re.match(r"[ \t]*", content[line_start:start]).group(0)
    inner = indent + "    "
    return (
        "ApiResponse::from({\n"
        f'{inner}tracing::warn!("{ctx}: {{}}", {err});\n'
        f'{inner}TopemsError::{variant}("{ctx}".to_string())\n'
        f"{indent}}})"
    )


def enclosing_fn_name(content: str, pos: int) -> str | None:
    """取调用点之前最近的 `fn` / `async fn` 名，作 internal() 的日志上下文。"""
    last = None
    for last in re.finditer(r"(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)", content[:pos]):
        pass
    return last.group(1) if last else None


def relocate(
    content: str, path: str, include_4xx: bool = False
) -> tuple[str, int, list[str]]:
    """返回 (新内容, 改写处数, 需人工清单)"""
    edits: list[tuple[int, int, str]] = []
    manual: list[str] = []
    n_4xx = 0

    for m in CALL.finditer(content):
        open_idx = content.index("(", m.start())
        end, body = extract_args(content, open_idx)
        norm = " ".join(body.split())

        hit = BODY.match(norm)
        hit4 = BODY_4XX.match(norm) if (not hit and include_4xx) else None
        hit_ts = BODY_TOSTRING.match(norm) if (not hit and not hit4) else None

        if hit:
            edits.append(
                (
                    m.start(),
                    end,
                    f'ApiResponse::from(TopemsError::internal("{hit.group("ctx")}", '
                    f'{hit.group("err")}))',
                )
            )
        elif hit4:
            edits.append(
                (
                    m.start(),
                    end,
                    build_4xx_replacement(
                        content,
                        m.start(),
                        hit4.group("ctx"),
                        hit4.group("err"),
                        CODE_TO_VARIANT[hit4.group("code")],
                    ),
                )
            )
            n_4xx += 1
        elif hit_ts:
            fname = enclosing_fn_name(content, m.start())
            if fname:
                edits.append(
                    (
                        m.start(),
                        end,
                        f'ApiResponse::from(TopemsError::internal("{fname}", '
                        f'{hit_ts.group("err")}))',
                    )
                )
            else:
                line = content[: m.start()].count("\n") + 1
                manual.append(f"{path}:{line}  to_string直出且找不到所在函数  {norm[:120]}")
        elif MAYBE_LEAK.search(norm):
            line = content[: m.start()].count("\n") + 1
            manual.append(f"{path}:{line}  {norm[:120]}")

    if not edits:
        return content, 0, manual

    for start, end, repl in reversed(edits):
        content = content[:start] + repl + content[end:]
    content = prune_unused_status_code(content)
    return content, len(edits), manual


def self_test() -> int:
    """对 add_import 做形态回归——这些形态取自仓库真实代码，不是臆造的。"""
    cases = [
        # (说明, 输入, 期望结果)
        (
            "单条导入 → 合并为嵌套分组",
            "use topems_shared_core::response::ApiResponse;\n",
            "use topems_shared_core::{response::ApiResponse, TopemsError};\n",
        ),
        (
            "分组导入（wms/tms/crm 形态）→ 另起一行，不污染 response 分组",
            "use topems_shared_core::response::{api_error, ApiResponse};\n",
            "use topems_shared_core::response::{api_error, ApiResponse};\n"
            "use topems_shared_core::TopemsError;\n",
        ),
        (
            "分组导入 + PaginationParams（tms 形态）",
            "use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};\n",
            "use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};\n"
            "use topems_shared_core::TopemsError;\n",
        ),
        (
            "已导入 error::TopemsError（finance/rd 形态）→ 保持原样",
            "use topems_shared_core::error::TopemsError;\n",
            "use topems_shared_core::error::TopemsError;\n",
        ),
        (
            "已导入 crate 根 TopemsError → 保持原样",
            "use topems_shared_core::{response::ApiResponse, TopemsError};\n",
            "use topems_shared_core::{response::ApiResponse, TopemsError};\n",
        ),
        (
            "仅有分组导入且无 response 前缀 → 追加独立导入",
            "use topems_shared_core::{response::{ApiResponse}, LOG_TARGET};\n",
            "use topems_shared_core::{response::{ApiResponse}, LOG_TARGET};\n"
            "use topems_shared_core::TopemsError;\n",
        ),
        (
            "无任何导入 → 兜底插到首行",
            "fn main() {}\n",
            "use topems_shared_core::TopemsError;\nfn main() {}\n",
        ),
    ]
    failed = 0
    for desc, src, want in cases:
        got = add_import(src)
        ok = got == want
        if not ok:
            failed += 1
        print(f"  {'✅' if ok else '❌'} {desc}")
        if not ok:
            print(f"     输入: {src!r}\n     期望: {want!r}\n     实际: {got!r}")

    # 禁止项：任何情况下都不得生成 response 分组里的 TopemsError
    bad = add_import("use topems_shared_core::response::{api_error, ApiResponse};\n")
    if "response::{api_error, ApiResponse, TopemsError}" in bad:
        failed += 1
        print("  ❌ 禁止项：不得把 TopemsError 拼进 response 分组")

    print("\n--- prune_unused_status_code ---")
    prune_cases = [
        (
            "分组内独立项（gis/erp 主形态）→ 摘除",
            "use axum::{\n    extract::{Path, Query, State},\n    http::StatusCode,\n    Json,\n};\n"
            "fn f() {}\n",
            "use axum::{\n    extract::{Path, Query, State},\n    Json,\n};\nfn f() {}\n",
        ),
        (
            "仍有其它用途 → 保持原样",
            "use axum::{http::StatusCode, Json};\nfn f() -> StatusCode { StatusCode::OK }\n",
            "use axum::{http::StatusCode, Json};\nfn f() -> StatusCode { StatusCode::OK }\n",
        ),
        (
            "行内分组项 → 移除并收成直写",
            "use axum::{http::StatusCode, Json};\nfn f() {}\n",
            "use axum::Json;\nfn f() {}\n",
        ),
        (
            "独占一行的完整导入 → 整行删除",
            "use axum::http::StatusCode;\nuse axum::Json;\nfn f() {}\n",
            "use axum::Json;\nfn f() {}\n",
        ),
        (
            "注释里出现 StatusCode 不算使用 → 仍摘除",
            "use axum::{http::StatusCode, Json};\n// StatusCode 已不需要\nfn f() {}\n",
            "use axum::Json;\n// StatusCode 已不需要\nfn f() {}\n",
        ),
        (
            "字符串里的 // 不被误当注释 → 真实使用仍能识别，不摘除",
            'use axum::{http::StatusCode, Json};\n'
            'fn f() -> StatusCode { let _u = "http://x"; StatusCode::OK }\n',
            'use axum::{http::StatusCode, Json};\n'
            'fn f() -> StatusCode { let _u = "http://x"; StatusCode::OK }\n',
        ),
    ]
    for desc, src, want in prune_cases:
        got = prune_unused_status_code(src)
        ok = got == want
        if not ok:
            failed += 1
        print(f"  {'✅' if ok else '❌'} {desc}")
        if not ok:
            print(f"     输入: {src!r}\n     期望: {want!r}\n     实际: {got!r}")

    print("\n--- relocate：500 形态 ---")
    rel_cases = [
        (
            "单行 500 → internal()",
            'return Json(ApiResponse::error(500, &format!("查询失败: {}", e)));\n',
            'return Json(ApiResponse::from(TopemsError::internal("查询失败", e)));\n',
        ),
        (
            "跨行 500 → internal()（V517 单行实现曾漏检的形态）",
            "Json(ApiResponse::error(\n    500,\n    &format!(\"查询失败: {}\", e),\n))\n",
            'Json(ApiResponse::from(TopemsError::internal("查询失败", e)))\n',
        ),
        (
            "StatusCode::INTERNAL_SERVER_ERROR.as_u16() → internal()",
            "Json(ApiResponse::error(\n"
            "    StatusCode::INTERNAL_SERVER_ERROR.as_u16(),\n"
            '    &format!("查询失败: {}", e),\n'
            "))\n",
            'Json(ApiResponse::from(TopemsError::internal("查询失败", e)))\n',
        ),
        (
            "有额外占位符 → 不动（宁窄勿宽）",
            'Json(ApiResponse::error(500, &format!("{} 查询失败: {}", id, e)))\n',
            'Json(ApiResponse::error(500, &format!("{} 查询失败: {}", id, e)))\n',
        ),
        (
            "e.to_string() 直出 → 用所在函数名做上下文（unified-core/finance 主形态）",
            "async fn list_documents() {\n"
            "    Json(ApiResponse::error(500, &e.to_string()))\n"
            "}\n",
            "async fn list_documents() {\n"
            '    Json(ApiResponse::from(TopemsError::internal("list_documents", e)))\n'
            "}\n",
        ),
        (
            "e.to_string() 直出但找不到所在函数 → 不动（宁窄勿宽）",
            "Json(ApiResponse::error(500, &e.to_string()))\n",
            "Json(ApiResponse::error(500, &e.to_string()))\n",
        ),
        (
            "to_string 直出的错误变量名归一化（err/db_error 等）",
            "fn save() {\n"
            "    return Json(ApiResponse::error(500, &db_error.to_string()));\n"
            "}\n",
            "fn save() {\n"
            '    return Json(ApiResponse::from(TopemsError::internal("save", db_error)));\n'
            "}\n",
        ),
    ]

    rel_4xx_cases = [        (
            "跨行 400 → 保留 400 + 静态文案 + 细节进日志",
            False,
            'return Json(ApiResponse::error(\n'
            "    400,\n"
            '    &format!("Invalid LIMS sample ID: {}", e),\n'
            "))\n",
            'return Json(ApiResponse::error(\n'
            "    400,\n"
            '    &format!("Invalid LIMS sample ID: {}", e),\n'
            "))\n",
        ),
        (
            "跨行 400（启用 --include-4xx）",
            True,
            'return Json(ApiResponse::error(\n'
            "    400,\n"
            '    &format!("Invalid LIMS sample ID: {}", e),\n'
            "))\n",
            "return Json(ApiResponse::from({\n"
            '    tracing::warn!("Invalid LIMS sample ID: {}", e);\n'
            '    TopemsError::ValidationFailed("Invalid LIMS sample ID".to_string())\n'
            "}))\n",
        ),
        (
            "缩进跟随调用点（内层 +4）",
            True,
            "        Err(e) => Json(ApiResponse::error(400, &format!(\"解析失败: {}\", e))),\n",
            "        Err(e) => Json(ApiResponse::from({\n"
            '            tracing::warn!("解析失败: {}", e);\n'
            '            TopemsError::ValidationFailed("解析失败".to_string())\n'
            "        })),\n",
        ),
        (
            "404 用 ResourceNotFound（而非 NotFound，后者会加「未找到: 」前缀）",
            True,
            'Json(ApiResponse::error(404, &format!("设备不存在: {}", e)))\n',
            "Json(ApiResponse::from({\n"
            '    tracing::warn!("设备不存在: {}", e);\n'
            '    TopemsError::ResourceNotFound("设备不存在".to_string())\n'
            "}))\n",
        ),
        (
            "503 用 ServiceUnavailable（保留 503 语义）",
            True,
            'Json(ApiResponse::error(503, &format!("Database error: {}", e)))\n',
            "Json(ApiResponse::from({\n"
            '    tracing::warn!("Database error: {}", e);\n'
            '    TopemsError::ServiceUnavailable("Database error".to_string())\n'
            "}))\n",
        ),
        (
            "字符串里的反斜杠 → 不动（不生成非法字符串字面量）",
            True,
            'Json(ApiResponse::error(400, &format!("bad \\\\ path: {}", e)))\n',
            'Json(ApiResponse::error(400, &format!("bad \\\\ path: {}", e)))\n',
        ),
    ]

    for desc, src, want in rel_cases:
        got, _, _ = relocate(src, "t.rs")
        ok = got == want
        if not ok:
            failed += 1
        print(f"  {'✅' if ok else '❌'} {desc}")
        if not ok:
            print(f"     输入: {src!r}\n     期望: {want!r}\n     实际: {got!r}")

    print("\n--- relocate：4xx 形态（--include-4xx）---")
    for desc, flag, src, want in rel_4xx_cases:
        got, _, _ = relocate(src, "t.rs", include_4xx=flag)
        ok = got == want
        if not ok:
            failed += 1
        print(f"  {'✅' if ok else '❌'} {desc}")
        if not ok:
            print(f"     输入: {src!r}\n     期望: {want!r}\n     实际: {got!r}")

    # 不变式：4xx 变体的客户端消息必须逐字等于原文案
    # （classify() 对 Internal/Database 等会替换文案，故绝不使用它们）
    verbatim_variants = {
        "400": "ValidationFailed",
        "403": "OperationNotAllowed",
        "404": "ResourceNotFound",
        "409": "ResourceAlreadyExists",
        "503": "ServiceUnavailable",
    }
    if CODE_TO_VARIANT != verbatim_variants:
        failed += 1
        print("  ❌ 不变式破坏：CODE_TO_VARIANT 被改动，须同步复核 classify() 是否仍原样回显 msg")

    print(f"\n自测：{'全部通过' if failed == 0 else f'{failed} 项失败'}")
    return 1 if failed else 0

def run_rustfmt(paths: list[str]) -> bool:
    """用 pin 工具链对改动文件做权威格式化。返回是否成功。"""
    if not paths:
        return True
    attempts = [
        ["rustup", "run", "nightly-2026-07-01", "rustfmt", "--edition", "2021", *paths],
        ["rustfmt", "--edition", "2021", *paths],
    ]
    for cmd in attempts:
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        except (OSError, subprocess.SubprocessError):
            continue
        if r.returncode == 0:
            print(f"  ✅ rustfmt 收尾完成（{' '.join(cmd[:5])} …）")
            return True
        print(f"  ⚠️  rustfmt 失败：{r.stderr.strip()[:200]}")
    print("  ⚠️  未找到可用的 rustfmt，请手工执行：rustfmt --edition 2021 <改动文件>")
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description="存量错误泄露迁移 codemod")
    ap.add_argument("--service", help="svc 下的服务名，如 gis")
    ap.add_argument("--dry-run", action="store_true", help="只报告，不写文件")
    ap.add_argument("--root", default="svc", help="svc 目录（默认相对仓库根）")
    ap.add_argument("--self-test", action="store_true", help="校验迁移与导入补全逻辑")
    ap.add_argument(
        "--include-4xx",
        action="store_true",
        help="额外改写 400/403/404/409/503 的泄露点（保留原状态码，客户端回静态文案，细节进日志）",
    )
    ap.add_argument(
        "--no-format",
        action="store_true",
        help="写盘后不跑 rustfmt 收尾（默认会跑）",
    )
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not args.service:
        ap.error("需要 --service（或使用 --self-test）")

    root = os.path.join(args.root, args.service, "src")
    if not os.path.isdir(root):
        print(f"❌ 目录不存在: {root}", file=sys.stderr)
        return 2

    total = 0
    touched: list[tuple[str, int]] = []
    manual_all: list[str] = []

    for path in iter_rust_files(root):
        with open(path, encoding="utf-8") as fh:
            original = fh.read()

        text, n, manual = relocate(original, path, include_4xx=args.include_4xx)
        manual_all.extend(manual)

        if "TopemsError::" in text:
            text = add_import(text)

        if text != original:
            touched.append((path, n))
            total += n
            if not args.dry_run:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write(text)

    mode = "DRY-RUN（未写盘）" if args.dry_run else "已写盘"
    scope = "500 形态 + 4xx 形态" if args.include_4xx else "仅 500 形态"
    print(f"\n=== {args.service} 迁移 {mode}（范围：{scope}）===")
    print(f"改写调用数: {total}")
    print(f"涉及文件数: {len(touched)}")
    for p, n in sorted(touched):
        print(f"  {n:3d}  {p}")

    if manual_all:
        print(f"\n--- 需人工判断（{len(manual_all)} 处，脚本不动）---")
        for item in manual_all:
            print("  ", item)

    if not args.dry_run and total:
        if not args.no_format:
            print("\n--- rustfmt 收尾 ---")
            run_rustfmt([p for p, _ in touched])
        print("\n下一步：cargo check → rustfmt --check → node scripts/ci/check-error-handling.cjs --changed-only")
    return 0


if __name__ == "__main__":
    sys.exit(main())
