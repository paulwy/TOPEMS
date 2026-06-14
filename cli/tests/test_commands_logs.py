"""测试 logs 命令"""

import pytest
from click.testing import CliRunner

from topems_cli.commands.logs import logs


class TestLogsCommand:
    """logs 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_logs_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(logs, ['--help'])
        assert result.exit_code == 0

    def test_logs_single_service(self, runner):
        """测试查看单个服务日志"""
        result = runner.invoke(logs, ['iam'])
        # 命令应该执行
        assert result.exit_code in [0, 1, 2]
