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
        return r.get('issues', []) if isinstance(r, dict) else getattr(r, 'issues', [])

    def _confidence_of(r):
        if isinstance(r, dict):
            cs = r.get('confidence_scores', {})
            return cs.get('overall_confidence', 0)
        else:
            return getattr(getattr(r, 'confidence_scores', None), 'overall_confidence', 0)

    successful = sum(1 for r in all_results if _status_of(r) in ["VERIFIED", "PARTIALLY_VERIFIED"])
    failed = sum(1 for r in all_results if _status_of(r) in ["UNVERIFIED", "FLAGGED"])

    issues_count = {}
    for result in all_results:
        for issue in _issues_of(result):
            key = issue.get('issue') if isinstance(issue, dict) else getattr(issue, 'issue', None)
            if not key:
                continue
            issues_count[key] = issues_count.get(key, 0) + 1

    most_common_issues = sorted(issues_count.items(), key=lambda x: x[1], reverse=True)[:5]
    most_common_issues = [issue for issue, count in most_common_issues]

    avg_conf = sum(_confidence_of(r) for r in all_results) / total if total > 0 else 0

    return ValidationStatsResponse(
        total_validations=total,
        successful=successful,
        failed=failed,
        success_rate=successful / total if total > 0 else 0,
        average_confidence=avg_conf,
        most_common_issues=most_common_issues
    )


# ==================== Single Provider Validation ====================

@app.post("/validate", response_model=SingleValidationResponse)
async def validate_provider(provider: ProviderInput):
    """
    Validate a single provider.
    
    Returns comprehensive validation result with confidence scores.
    """
    try:
        result = ValidationService.validate_provider(provider)
        return SingleValidationResponse(
            success=True,
            data=result,
            processing_time_ms=result.processing_time_ms
        )
    except Exception as e:
        return SingleValidationResponse(
            success=False,
            error=str(e),
            processing_time_ms=0
        )


@app.post("/validate/batch", response_model=BatchValidationResponse)
async def validate_batch(
    request: BatchValidationRequest,
    background_tasks: BackgroundTasks
):
    """
    Validate multiple providers in batch.
    
    Returns batch job ID immediately. Use /batch/{batch_id} to check status.
    """
    batch_id = str(uuid.uuid4())
    
    # Queue background task
    background_tasks.add_task(
        ValidationService.validate_batch,
        request.providers,
        batch_id
    )
    
    # Return queued response
    return BatchValidationResponse(
        batch_id=batch_id,
        status="QUEUED",
        total_providers=len(request.providers)
    )


@app.get("/batch/{batch_id}", response_model=BatchValidationResponse)
async def get_batch_status(batch_id: str):
    """Get status of a batch validation job."""
    batch = ValidationService.get_batch_status(batch_id)
    
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    
    return batch


# ==================== File Upload ====================

@app.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a provider list file (PDF or Excel).
    
    Extracts provider information and returns list of providers found.
    """
    try:
        # Validate file
        file_content = await file.read()
        file_type = FileProcessor.get_file_type(file.filename)
        
        if file_type == 'unknown':
            raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or XLSX")
        
        if not FileProcessor.validate_file(file_content, file_type):
            raise HTTPException(status_code=400, detail="Invalid or corrupted file")
        
        # Extract providers
        if file_type == 'pdf':
            extracted_providers = FileProcessor.extract_from_pdf(file_content)
        else:  # xlsx
            extracted_providers = FileProcessor.extract_from_excel(file_content)
        
        # Convert to ProviderInput objects
        providers = []
        for provider_dict in extracted_providers:
