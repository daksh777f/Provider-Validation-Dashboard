"""Tests for validation service."""
import pytest
from src.provider_data_validation.models import ProviderInput
from src.provider_data_validation.services import ValidationService


def test_validate_provider_returns_result():
    """Test that validating a provider returns a ValidationResult."""
    provider = ProviderInput(
        provider_name="Dr. Sarah Johnson",
        phone="555-0123",
        address="123 Medical Center",
        specialty="Cardiology"
