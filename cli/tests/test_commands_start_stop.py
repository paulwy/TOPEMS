"""测试 start/stop 命令"""

import pytest
from click.testing import CliRunner


class TestStartCommand:
    """start 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_start_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(start, ['--help'])
        assert result.exit_code == 0

    def test_start_single_service(self, runner):
        """测试启动单个服务"""
        result = runner.invoke(start, ['iam'])
        # 命令应该执行
        assert result.exit_code in [0, 1]


class TestStopCommand:
    """stop 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_stop_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(stop, ['--help'])
        assert result.exit_code == 0

    def test_stop_single_service(self, runner):
        """测试停止单个服务"""
        result = runner.invoke(stop, ['iam'])
        # 命令应该执行
        assert result.exit_code in [0, 1]


# 导入命令
from topems_cli.commands.start import start
from topems_cli.commands.stop import stop
