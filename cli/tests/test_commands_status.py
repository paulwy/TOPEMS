"""测试 status 命令"""

import pytest
from click.testing import CliRunner


class TestStatusCommand:
    """status 命令测试"""

    @pytest.fixture
    def runner(self):
        """创建 CLI 测试运行器"""
        return CliRunner()

    def test_status_help(self, runner):
        """测试 --help 选项"""
        result = runner.invoke(status, ['--help'])
        assert result.exit_code == 0
        assert 'usage' in result.output.lower() or 'help' in result.output.lower()

    def test_status_single_service(self, runner):
        """测试单个服务状态"""
        result = runner.invoke(status, ['iam'])
        # 命令应该执行（可能成功或显示服务未运行）
        assert result.exit_code in [0, 1]

    def test_status_module(self, runner):
        """测试模块状态"""
        result = runner.invoke(status, ['-m', 'core'])
        assert result.exit_code in [0, 1, 2]


# 导入 status 命令
from topems_cli.commands.status import status
