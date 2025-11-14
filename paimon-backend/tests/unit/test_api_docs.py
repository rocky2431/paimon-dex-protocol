"""
Unit tests for API documentation configuration.

Tests OpenAPI/Swagger UI and ReDoc accessibility, schema documentation,
and Try it out functionality.
"""

from fastapi.testclient import TestClient


class TestOpenAPIEndpoints:
    """Test OpenAPI documentation endpoints."""

    def test_openapi_json_accessible(self):
        """Test OpenAPI JSON schema is accessible."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"

        # Verify OpenAPI schema structure
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema

    def test_swagger_ui_accessible(self):
        """Test Swagger UI (/docs) is accessible."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/docs")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        # Swagger UI should contain these elements
        assert b"swagger-ui" in response.content or b"Swagger UI" in response.content

    def test_redoc_accessible(self):
        """Test ReDoc (/redoc) is accessible."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/redoc")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        # ReDoc should contain these elements
        assert b"redoc" in response.content or b"ReDoc" in response.content


class TestAPIMetadata:
    """Test API metadata configuration."""

    def test_api_has_title(self):
        """Test API has a title."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        assert "info" in schema
        assert "title" in schema["info"]
        assert len(schema["info"]["title"]) > 0

    def test_api_has_version(self):
        """Test API has a version."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        assert "version" in schema["info"]
        assert len(schema["info"]["version"]) > 0

    def test_api_has_description(self):
        """Test API has a description."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        assert "description" in schema["info"]
        assert len(schema["info"]["description"]) > 0

    def test_api_has_contact_info(self):
        """Test API has contact information."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Contact info should be present
        assert "contact" in schema["info"]
        assert "name" in schema["info"]["contact"]

    def test_api_has_license_info(self):
        """Test API has license information."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # License info should be present
        assert "license" in schema["info"]
        assert "name" in schema["info"]["license"]


class TestEndpointsDocumentation:
    """Test API endpoints are documented."""

    def test_root_endpoint_in_docs(self):
        """Test root endpoint is documented."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Root endpoint should be documented
        assert "/" in schema["paths"]
        assert "get" in schema["paths"]["/"]

    def test_health_endpoint_in_docs(self):
        """Test health endpoint is documented."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Health endpoint should be documented
        assert "/health" in schema["paths"]
        assert "get" in schema["paths"]["/health"]

    def test_endpoints_have_descriptions(self):
        """Test endpoints have descriptions."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check root endpoint has description
        root_get = schema["paths"]["/"]["get"]
        assert "summary" in root_get or "description" in root_get

    def test_endpoints_have_tags(self):
        """Test endpoints are organized with tags."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Check root endpoint has tags
        root_get = schema["paths"]["/"]["get"]
        assert "tags" in root_get
        assert len(root_get["tags"]) > 0


class TestSchemaDocumentation:
    """Test Pydantic schema documentation."""

    def test_response_schemas_defined(self):
        """Test response schemas are defined."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/openapi.json")
        schema = response.json()

        # Components should have schemas
        if "components" in schema:
            assert "schemas" in schema["components"]

    def test_example_schema_has_field_descriptions(self):
        """Test example schema has field descriptions."""
        from app.schemas import example

        # Import the example schema
        ExampleSchema = example.ExampleResponse

        # Check schema_json includes descriptions
        schema_dict = ExampleSchema.model_json_schema()

        # Properties should have descriptions
        if "properties" in schema_dict:
            # At least one property should have a description
            has_description = any(
                "description" in prop for prop in schema_dict["properties"].values()
            )
            assert has_description

    def test_example_schema_has_examples(self):
        """Test example schema has example values."""
        from app.schemas import example

        ExampleSchema = example.ExampleResponse

        # Check schema includes examples
        schema_dict = ExampleSchema.model_json_schema()

        # Check if examples are defined (either at schema level or field level)
        has_examples = "examples" in schema_dict or any(
            "examples" in prop or "example" in prop
            for prop in schema_dict.get("properties", {}).values()
        )
        assert has_examples


class TestTryItOutFunctionality:
    """Test 'Try it out' functionality works."""

    def test_can_call_root_endpoint(self):
        """Test can call root endpoint through client."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data or "title" in data

    def test_can_call_health_endpoint(self):
        """Test can call health endpoint through client."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
