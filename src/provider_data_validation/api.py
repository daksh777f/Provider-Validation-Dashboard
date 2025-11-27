"""
FastAPI application for Provider Data Validation System.
Main entry point for the API server.
"""

import os
import uuid
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio

from .config import settings
from .logger import logger

from .models import (
    ProviderInput, ValidationResult, BatchValidationRequest, BatchValidationResponse,
    SingleValidationResponse, FileUploadResponse, HealthCheckResponse, 
    ErrorResponse, ValidationStatsResponse, VerificationRequest
)
from .services import ValidationService
from .tools.file_processor import FileProcessor

# Create FastAPI app
app = FastAPI(
    title="Provider Data Validation System",
    description="AI-powered provider verification across multiple data sources",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware (use FRONTEND_URL or configured origins)
cors_origins = [
    "http://localhost:5173",      # Vite default dev server
    "http://localhost:5174",      # Alternative Vite port
    "http://localhost:3000",      # Alternative frontend port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "http://localhost:8000",       # Same origin
]

if settings.FRONTEND_URL:
    cors_origins.append(settings.FRONTEND_URL)

if settings.CORS_ORIGINS:
    cors_origins.extend([o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()])

# Remove duplicates
cors_origins = list(set(cors_origins))

logger.info(f"CORS origins configured: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Store for file uploads
uploaded_files: dict = {}


# ==================== Health & Status ====================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Check API health status."""
    # Best-effort: check Ollama availability
    if not settings.ENABLE_LLM:
        ollama_status = "disabled"
    else:
        ollama_status = "unknown"
        try:
            import httpx
            resp = httpx.get(settings.OLLAMA_BASE_URL + "/api/tags", timeout=2)
            ollama_status = "operational" if resp.status_code == 200 else "unavailable"
        except Exception:
            ollama_status = "unavailable"

    return HealthCheckResponse(
        status="healthy",
        components={
            "api": "operational",
            "validation_service": "operational",
            "file_processor": "operational",
            "ollama": ollama_status
        },
        system_info={
            "workers": 1,
            "queued_jobs": ValidationService.get_batch_count() if hasattr(ValidationService, 'get_batch_count') else 0
        }
    )


@app.get("/stats", response_model=ValidationStatsResponse)
async def get_stats():
    """Get validation statistics."""
    all_results = []
    batches = []
    if hasattr(ValidationService, 'get_all_results'):
        batches = ValidationService.get_all_results()
    else:
        try:
            batches = list(ValidationService.batch_jobs.values())
        except Exception:
            batches = []

    for batch in batches:
        # batch may be a dict (from Redis) or a model
        results = batch.get('results') if isinstance(batch, dict) else getattr(batch, 'results', [])
        if results:
            all_results.extend(results)

    total = len(all_results)

    def _status_of(r):
        return r.get('validation_status') if isinstance(r, dict) else getattr(r, 'validation_status', None)

    def _issues_of(r):
