"""
============================================================
Health and Model Info Endpoints
============================================================

Purpose:
  These endpoints let Spring Boot verify that the AI service
  is running and check what model is loaded.

Endpoints:
  GET /health      → Is the AI service alive?
  GET /model/info  → What model is loaded? What device?

How to test:
  Start the service, then visit:
    http://localhost:8000/health
    http://localhost:8000/model/info
"""

import platform
import sys
from datetime import datetime, timezone

import torch
from fastapi import APIRouter

# -------------------------------------------------------
# Create a router (group of related endpoints)
# -------------------------------------------------------
# A router is like a mini-app. We define endpoints here,
# then register this router in main.py with app.include_router().
router = APIRouter()


@router.get("/health")
@router.get("/api/health")
def health_check():
    """
    Simple health check.

    Returns basic info confirming the service is running.
    Spring Boot calls this endpoint to verify connectivity.
    """
    return {
        "status": "UP",
        "service": "disaster-management-ai-service",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/model/info")
def model_info():
    """
    Report what AI capabilities are available.

    This tells the backend:
    - Is PyTorch available?
    - Is a GPU available? (probably not on your machine)
    - What Python version is running?
    - Is a model loaded? (not yet in Milestone 1)

    Later milestones will add actual model details here.
    """
    return {
        "model_loaded": False,
        "model_name": None,
        "model_version": None,
        "pytorch_version": torch.__version__,
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "cuda_available": torch.cuda.is_available(),
        "python_version": sys.version,
        "platform": platform.platform(),
    }
