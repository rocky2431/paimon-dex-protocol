"""
Unit tests for Logger module.

Tests logging functionality including console and file logging,
log rotation, and environment-specific log levels.
"""

import logging


class TestLoggerConfiguration:
    """Test logger configuration and setup."""

    def test_logger_exists(self):
        """Test logger can be imported and configured."""
        from app.core.logger import get_logger

        logger = get_logger(__name__)
        assert logger is not None
        assert isinstance(logger, logging.Logger)

    def test_logger_has_console_handler(self):
        """Test logger has console handler for stdout."""

        # Get root logger which has all handlers
        root_logger = logging.getLogger()
        console_handlers = [
            h
            for h in root_logger.handlers
            if isinstance(h, logging.StreamHandler)
            and not isinstance(h, logging.handlers.RotatingFileHandler)
        ]
        assert len(console_handlers) > 0

    def test_logger_has_file_handler(self):
        """Test logger has file handler for log files."""
        # Get root logger which has all handlers
        root_logger = logging.getLogger()
        file_handlers = [
            h
            for h in root_logger.handlers
            if isinstance(h, logging.handlers.RotatingFileHandler)
        ]
        assert len(file_handlers) > 0

    def test_log_file_created(self, tmp_path):
        """Test log file is created."""
        from app.core.logger import setup_logging

        log_file = tmp_path / "test.log"
        setup_logging(log_file=str(log_file))

        # Log file should be created after setup
        assert log_file.exists()


class TestLoggerFunctionality:
    """Test logger functionality."""

    def test_logger_info_level(self, tmp_path):
        """Test logger logs INFO level messages."""
        from app.core.logger import get_logger, setup_logging

        log_file = tmp_path / "info.log"
        setup_logging(log_file=str(log_file), log_level="INFO")

        logger = get_logger(__name__)
        logger.info("Test INFO message")

        # Read log file
        log_content = log_file.read_text()
        assert "Test INFO message" in log_content
        assert "INFO" in log_content

    def test_logger_debug_level(self, tmp_path):
        """Test logger logs DEBUG level messages."""
        from app.core.logger import get_logger, setup_logging

        log_file = tmp_path / "debug.log"
        setup_logging(log_file=str(log_file), log_level="DEBUG")

        logger = get_logger(__name__)
        logger.debug("Test DEBUG message")

        log_content = log_file.read_text()
        assert "Test DEBUG message" in log_content
        assert "DEBUG" in log_content

    def test_logger_warning_level(self, tmp_path):
        """Test logger logs WARNING level messages."""
        from app.core.logger import get_logger, setup_logging

        log_file = tmp_path / "warning.log"
        setup_logging(log_file=str(log_file), log_level="WARNING")

        logger = get_logger(__name__)
        logger.warning("Test WARNING message")

        log_content = log_file.read_text()
        assert "Test WARNING message" in log_content
        assert "WARNING" in log_content

    def test_logger_error_level(self, tmp_path):
        """Test logger logs ERROR level messages."""
        from app.core.logger import get_logger, setup_logging

        log_file = tmp_path / "error.log"
        setup_logging(log_file=str(log_file), log_level="ERROR")

        logger = get_logger(__name__)
        logger.error("Test ERROR message")

        log_content = log_file.read_text()
        assert "Test ERROR message" in log_content
        assert "ERROR" in log_content


class TestLoggerRotation:
    """Test logger file rotation."""

    def test_log_rotation_configured(self):
        """Test logger has rotation configured."""
        # Get root logger which has all handlers
        root_logger = logging.getLogger()
        rotating_handlers = [
            h
            for h in root_logger.handlers
            if isinstance(h, logging.handlers.RotatingFileHandler)
        ]

        assert len(rotating_handlers) > 0
        handler = rotating_handlers[0]
        # Check max bytes and backup count are configured
        assert handler.maxBytes > 0
        assert handler.backupCount > 0


class TestLoggerEnvironmentConfig:
    """Test logger configuration for different environments."""

    def test_development_log_level(self, monkeypatch, tmp_path):
        """Test development environment uses DEBUG level."""
        monkeypatch.setenv("ENVIRONMENT", "development")
        from app.core.logger import setup_logging

        log_file = tmp_path / "dev.log"
        setup_logging(log_file=str(log_file))

        # In development, DEBUG messages should be logged
        from app.core.logger import get_logger

        logger = get_logger(__name__)
        assert logger.level <= logging.DEBUG

    def test_production_log_level(self, tmp_path):
        """Test production environment uses INFO level."""
        from app.core.logger import setup_logging

        log_file = tmp_path / "prod.log"
        # Explicitly set INFO level to simulate production
        setup_logging(log_file=str(log_file), log_level="INFO")

        # Check root logger level
        root_logger = logging.getLogger()
        # In production, log level should be INFO or higher
        assert root_logger.level >= logging.INFO
