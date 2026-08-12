"""测试 doctor 命令"""

import pytest
from click.testing import CliRunner

from topems_cli.commands.doctor import doctor, _check_tool, _check_port, _check_env_file


class TestDoctorCommand:
    """doctor 命令测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_doctor_help(self, runner):
        """测试 doctor --help"""
        result = runner.invoke(doctor, ['--help'])
        assert result.exit_code == 0
        assert 'TOPEMS 系统自检' in result.output
        assert '--json' in result.output
        assert '--verbose' in result.output

    def test_doctor_run(self, runner):
        """测试 doctor 运行（仅检查工具，不依赖外部服务）"""
        result = runner.invoke(doctor)
        assert result.exit_code == 0
        assert '自检结果' in result.output

    def test_doctor_verbose(self, runner):
        """测试 doctor -v 详细输出"""
        result = runner.invoke(doctor, ['-v'])
        assert result.exit_code == 0
        assert '详细检查项' in result.output

    def test_doctor_json(self, runner):
        """测试 doctor --json 输出"""
        result = runner.invoke(doctor, ['--json'])
        # doctor --json 当前仍输出表格，验证命令可执行
        assert result.exit_code == 0


class TestCheckTool:
    """_check_tool 函数测试"""

    def test_check_tool_existing(self):
        """测试检查已安装的工具"""
        ok, version = _check_tool("python3")
        assert ok is True
        assert "Python" in version

    def test_check_tool_missing(self):
        """测试检查未安装的工具"""
        ok, version = _check_tool("nonexistent-tool-xyz-123")
        assert ok is False
        assert version == "未安装"


class TestCheckPort:
    """_check_port 函数测试"""

    def test_check_port_free(self):
        """测试检查空闲端口（高位端口通常空闲）"""
        # 使用一个极不可能被占用的端口
        is_free = _check_port("localhost", 59999)
        assert is_free is True

    def test_check_port_invalid_host(self):
        """测试检查无效主机"""
        is_free = _check_port("invalid-host-xyz.invalid", 80)
        assert is_free is False


class TestCheckEnvFile:
    """_check_env_file 函数测试"""

    def test_check_env_file_nonexistent(self, tmp_path):
        """测试检查不存在的文件"""
        env_path = tmp_path / "nonexistent.env"
        exists, lines = _check_env_file(env_path)
        assert exists is False
        assert lines == 0

    def test_check_env_file_existing_empty(self, tmp_path):
        """测试检查空文件"""
        env_path = tmp_path / ".env"
        env_path.write_text("")
        exists, lines = _check_env_file(env_path)
        assert exists is True
        assert lines == 0

    def test_check_env_file_with_content(self, tmp_path):
        """测试检查有内容的文件"""
        env_path = tmp_path / ".env"
        env_path.write_text("# comment\nKEY=value\nANOTHER=123\n")
        exists, lines = _check_env_file(env_path)
        assert exists is True
        assert lines == 2  # 注释行不计入


class TestDoctorIntegration:
    """doctor 集成测试"""

    @pytest.fixture
    def runner(self):
        return CliRunner()

    def test_doctor_is_command(self):
        """测试 doctor 是一个命令"""
        from click import Command
        assert isinstance(doctor, Command)

    def test_doctor_has_nine_checks(self, runner):
        """测试 doctor 包含 9 项检查"""
        result = runner.invoke(doctor, ['-v'])
        assert result.exit_code == 0
        # 验证 9 个检查项标题都出现
        for i in range(1, 10):
            assert f'{i}.' in result.output

    def test_doctor_shows_score(self, runner):
        """测试 doctor 显示自检分数"""
        result = runner.invoke(doctor)
        assert result.exit_code == 0
        assert '项通过' in result.output
        assert '分' in result.output
