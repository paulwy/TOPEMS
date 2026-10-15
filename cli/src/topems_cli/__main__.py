"""TOPEMS CLI 入口点"""

import sys
from pathlib import Path

import click
from rich.console import Console

# 添加 src 目录到 Python 路径
src_path = Path(__file__).parent
sys.path.insert(0, str(src_path))

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def main():
    """TOPEMS 服务管理命令行工具

    用于管理 TOPEMS 系统的各种服务，包括启动、停止、状态查看等功能。
    """
    pass


# 注册子命令
from .commands.start import start
from .commands.stop import stop
from .commands.status import status
from .commands.logs import logs
from .commands.test import test
from .commands.cleanup import cleanup
from .commands.build import build
from .commands.db import db
from .commands.dev import dev
from .commands.doctor import doctor
from .commands.ops import reset_password, run, run_stop

main.add_command(start, name="start")
main.add_command(stop, name="stop")
main.add_command(status, name="status")
main.add_command(logs, name="logs")
main.add_command(test, name="test")
main.add_command(cleanup, name="cleanup")
main.add_command(build, name="build")
main.add_command(db, name="db")
main.add_command(dev, name="dev")
main.add_command(doctor, name="doctor")
main.add_command(reset_password, name="reset-password")
main.add_command(reset_password, name="update-password")  # 别名（对齐 topems.sh:4034）
main.add_command(run, name="run")
main.add_command(run_stop, name="run-stop")

# Docker 命令组始终注册（命令面稳定，help 恒定可见）；daemon 可用性由各命令内部检查并友好提示
from .commands.docker import docker
main.add_command(docker, name="docker")


if __name__ == "__main__":
    main()
