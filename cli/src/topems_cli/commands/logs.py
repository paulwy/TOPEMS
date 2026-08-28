"""logs 命令 - 查看服务日志

与 scripts/topems.sh 的 logs 命令功能重叠。
日常开发推荐使用 ./scripts/topems.sh logs（零依赖）。
本命令提供 rich 语法高亮和 --follow 持续跟踪，作为可选替代。
"""

import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.live import Live
from rich.syntax import Syntax
from rich.text import Text

console = Console()


def _get_log_path(service_name: str) -> Path:
    """获取日志文件路径（与 manager.py _get_log_path 对齐）"""
    return Path(__file__).parent.parent.parent.parent.parent / "logs" / f"{service_name}.log"


def get_log_content(service_name: str, lines: int = 100) -> str:
    """获取日志内容"""
    log_path = _get_log_path(service_name)

    if not log_path.exists():
        return f"日志文件不存在: {log_path}\n\n提示: 服务可能尚未启动或日志未写入"

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            all_lines = f.readlines()
            return "".join(all_lines[-lines:])
    except Exception as e:
        return f"读取日志失败: {e}"


def tail_log(service_name: str, lines: int = 100):
    """持续跟踪日志"""
    log_path = _get_log_path(service_name)

    if not log_path.exists():
        console.print(f"[yellow]日志文件不存在: {log_path}[/yellow]")
        return

    try:
        with open(log_path, "r", encoding="utf-8") as f:
            # 跳到末尾
            f.seek(0, 2)
            while True:
                line = f.readline()
                if not line:
                    import time
                    time.sleep(0.5)
                    continue
                yield line.rstrip()
    except KeyboardInterrupt:
        pass


@click.command()
@click.argument("service", required=False)
@click.option("--lines", "-n", default=100, help="显示行数")
@click.option("--follow", "-f", is_flag=True, help="持续跟踪日志")
def logs(service: str, lines: int, follow: bool):
    """查看 TOPEMS 服务日志

    示例:
        topems logs iam          查看 iam 服务日志
        topems logs -n 200      查看最近 200 行
        topems logs -f          持续跟踪日志
    """
    if not service:
        console.print("[yellow]请指定服务名称[/yellow]")
        console.print("使用 --help 查看帮助")
        return

    if follow:
        console.print(f"[cyan]持续跟踪 {service} 日志 (Ctrl+C 退出)...[/cyan]\n")
        for line in tail_log(service, lines):
            console.print(line)
    else:
        content = get_log_content(service, lines)
        syntax = Syntax(content, "bash", theme="monokai", line_numbers=True)
        console.print(syntax)
