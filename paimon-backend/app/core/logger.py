"""
Logging configuration module.

Provides centralized logging setup with console and file handlers,
log rotation, and environment-specific log levels.
"""

import logging
import logging.handlers
import sys
from pathlib import Path

from app.core.config import settings

# Global logger configuration
_loggers: dict[str, logging.Logger] = {}
_setup_complete = False


def setup_logging(
    log_file: str | None = None,
    log_level: str | None = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
) -> None:
    """
    Configure logging with console and file handlers.

    Args:
        log_file: Path to log file (default: logs/app.log)
        log_level: Logging level (default: based on ENVIRONMENT)
        max_bytes: Maximum size of log file before rotation
        backup_count: Number of backup log files to keep
    """
    global _setup_complete

    # Determine log level based on environment if not specified
    if log_level is None:
        if settings.ENVIRONMENT == "development":
            log_level = "DEBUG"
        elif settings.ENVIRONMENT == "production":
            log_level = "INFO"
        else:
            log_level = "INFO"

    # Determine log file path
    if log_file is None:
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        log_file = str(log_dir / "app.log")
    else:
        # Ensure log directory exists
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    root_logger.addHandler(console_handler)

    # File handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(getattr(logging, log_level.upper()))
    root_logger.addHandler(file_handler)

    _setup_complete = True

    # Log setup completion
    root_logger.info(
        f"Logging configured: level={log_level}, file={log_file}, "
        f"max_bytes={max_bytes}, backup_count={backup_count}"
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for the given name.

    Args:
        name: Logger name (usually __name__ of the module)

    Returns:
        Configured logger instance
    """
    global _loggers, _setup_complete

    # Setup logging if not already done
    if not _setup_complete:
        setup_logging()

    # Return cached logger if exists
    if name in _loggers:
        return _loggers[name]

    # Get root logger (which has all handlers configured)
    root_logger = logging.getLogger()

    # For tests, return root logger to access handlers
    # In production, named loggers inherit from root
    logger = logging.getLogger(name) if name != "root" else root_logger
    _loggers[name] = logger

    return logger


# Setup logging on module import
setup_logging()
