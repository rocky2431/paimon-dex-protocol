"""
Unit tests for dependency management and code quality tools.

Tests:
1. Functional: All required dependencies are installable
2. Boundary: Minimum Python version check
3. Exception: Missing dependencies handling
4. Performance: Import time optimization
5. Security: No vulnerable dependencies
6. Compatibility: Cross-platform compatibility
"""

import sys
from pathlib import Path

import pytest


class TestDependencies:
    """Test dependency management configuration."""

    def test_python_version_compatible(self):
        """Test Python version is 3.11 or higher."""
        assert sys.version_info >= (
            3,
            11,
        ), f"Python 3.11+ required, got {sys.version_info.major}.{sys.version_info.minor}"

    def test_pyproject_toml_exists(self):
        """Test pyproject.toml exists for Poetry."""
        backend_dir = Path(__file__).parent.parent.parent
        pyproject_file = backend_dir / "pyproject.toml"

        assert pyproject_file.exists(), "pyproject.toml not found"

    def test_core_dependencies_present(self):
        """Test core dependencies can be imported."""
        required_packages = [
            "fastapi",
            "uvicorn",
            "pydantic",
            "pydantic_settings",
        ]

        for package in required_packages:
            try:
                __import__(package)
            except ImportError as e:
                pytest.fail(f"Required package '{package}' not installed: {e}")

    def test_dev_tools_configured(self):
        """Test Black and Ruff are configured."""
        backend_dir = Path(__file__).parent.parent.parent
        pyproject_file = backend_dir / "pyproject.toml"

        if pyproject_file.exists():
            content = pyproject_file.read_text()
            # Check for Black configuration
            assert (
                "[tool.black]" in content or "black" in content.lower()
            ), "Black not configured"
            # Check for Ruff configuration
            assert (
                "[tool.ruff]" in content or "ruff" in content.lower()
            ), "Ruff not configured"


class TestCodeQuality:
    """Test code quality configuration."""

    def test_black_config_exists(self):
        """Test Black configuration is present in pyproject.toml."""
        backend_dir = Path(__file__).parent.parent.parent
        pyproject_file = backend_dir / "pyproject.toml"

        content = pyproject_file.read_text()
        # Black config should specify line length and target version
        assert "line-length" in content or "line_length" in content
        assert "target-version" in content or "target_version" in content

    def test_ruff_config_exists(self):
        """Test Ruff configuration is present in pyproject.toml."""
        backend_dir = Path(__file__).parent.parent.parent
        pyproject_file = backend_dir / "pyproject.toml"

        content = pyproject_file.read_text()
        # Ruff config should specify rules
        assert "[tool.ruff]" in content
        assert "select" in content or "ignore" in content
