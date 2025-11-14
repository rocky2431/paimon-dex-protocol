# Paimon DEX Backend API

Backend API for Paimon DEX - RWA veDEX Protocol on Binance Smart Chain.

## Tech Stack

- **Framework**: FastAPI + Uvicorn
- **Database**: PostgreSQL (Supabase) + SQLAlchemy ORM
- **Cache**: Redis (Upstash)
- **Authentication**: JWT + Web3 Signature
- **Blockchain**: BSC + web3.py
- **Code Quality**: Black + Ruff + MyPy

## Project Structure

```
paimon-backend/
├── app/
│   ├── core/           # Configuration and core utilities
│   ├── routers/        # API route handlers
│   ├── services/       # Business logic
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic schemas
│   └── main.py         # FastAPI application
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── pyproject.toml      # Poetry dependencies
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Poetry (dependency management)
- PostgreSQL (or Supabase account)
- Redis (or Upstash account)

### Installation

1. **Install dependencies with Poetry**:

```bash
poetry install
```

2. **Configure environment variables**:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run development server**:

```bash
poetry run uvicorn app.main:app --reload
```

Or:

```bash
poetry run python app/main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

### Run Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run specific test file
poetry run pytest tests/unit/test_main.py -v
```

### Code Quality

```bash
# Format code with Black
poetry run black app tests

# Lint with Ruff
poetry run ruff check app tests

# Type check with MyPy
poetry run mypy app
```

### Auto-format on save

Configure your IDE to run Black and Ruff on save:

**VS Code** (`.vscode/settings.json`):
```json
{
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true
}
```

## API Documentation

### Endpoints

#### Root
- `GET /` - API information

#### Health
- `GET /health` - Health check

### Authentication Flow

1. User signs message with wallet
2. Backend verifies signature
3. Backend generates JWT token
4. Client stores token in httpOnly cookie
5. Client includes token in subsequent requests

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret key for JWT signing
- `BSC_RPC_URL`: BSC RPC endpoint
- `BLOCKPASS_CLIENT_ID`: Blockpass KYC client ID
- `TASKON_API_KEY`: TaskOn API key

## Deployment

### Railway / Render

1. Create new project
2. Connect GitHub repository
3. Set environment variables
4. Deploy

Build command:
```bash
pip install poetry && poetry install --no-dev
```

Start command:
```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Contributing

1. Follow TDD workflow (RED → GREEN → REFACTOR)
2. Ensure all tests pass before committing
3. Use conventional commits format
4. Maintain >80% test coverage

## License

Proprietary - Paimon Team
