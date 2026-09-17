"""
============================================================
Evaluation & Model Registry Endpoints
============================================================

Serves actual evaluation metrics from saved JSON files.
Provides model version information and comparison results.

Endpoints:
  GET /api/models                 -> List available models
  GET /api/models/{model_id}/metrics -> Get evaluation metrics
  GET /api/evaluation/baseline    -> Baseline xBD metrics
  GET /api/evaluation/comparison  -> Baseline vs India-tuned
  GET /api/evaluation/cross-event -> Cross-event experiment results
"""

import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["evaluation"])

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
EVAL_DIR = os.path.join(ROOT_DIR, 'outputs', 'india_evaluation')
MODELS_DIR = os.path.join(ROOT_DIR, 'ai-service', 'models')

# Model registry - what we actually have
MODEL_REGISTRY = {
    "xbd_baseline_pre_post": {
        "id": "xbd_baseline_pre_post",
        "name": "xBD Baseline (Pre+Post)",
        "architecture": "U-Net ResNet34",
        "training_data": "xBD v2 subset (68 pairs, 5 disasters)",
        "parameters": 24_446_357,
        "input_mode": "pre_post",
        "num_classes": 5,
        "weights_file": "unet_resnet34_pre_post.pth",
        "status": "available"
    },
    "xbd_baseline_post_only": {
        "id": "xbd_baseline_post_only",
        "name": "xBD Baseline (Post-Only)",
        "architecture": "U-Net ResNet34",
        "training_data": "xBD v2 subset (68 pairs, 5 disasters)",
        "parameters": 24_446_357,
        "input_mode": "post_only",
        "num_classes": 5,
        "weights_file": "unet_resnet34_post_only.pth",
        "status": "available"
    },
    "india_tuned_v1": {
        "id": "india_tuned_v1",
        "name": "India-Tuned v1",
        "architecture": "U-Net ResNet34 (fine-tuned from xBD baseline)",
        "training_data": "Pending - requires Chamoli/Wayanad satellite imagery",
        "parameters": 24_446_357,
        "input_mode": "pre_post",
        "num_classes": 5,
        "weights_file": None,
        "status": "not_trained"
    }
}


def _load_json(filename):
    """Load a JSON file from the evaluation directory."""
    path = os.path.join(EVAL_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return json.load(f)


@router.get("/models")
def list_models():
    """List all registered models with availability status."""
    models = []
    for mid, info in MODEL_REGISTRY.items():
        # Check if weights actually exist
        if info["weights_file"]:
            wpath = os.path.join(ROOT_DIR, 'ai-service', 'models', info["weights_file"])
            info["weights_exist"] = os.path.exists(wpath)
            if info["weights_exist"]:
                info["weights_size_mb"] = round(os.path.getsize(wpath) / 1e6, 1)
        models.append(info)
    return {"models": models, "count": len(models)}


@router.get("/evaluation/baseline")
def get_baseline_metrics():
    """Return actual baseline evaluation metrics from the xBD test set."""
    data = _load_json("baseline_xbd_metrics.json")
    if not data:
        raise HTTPException(404, "Baseline evaluation has not been run yet.")
    return data


@router.get("/evaluation/comparison")
def get_comparison():
    """Compare baseline vs India-tuned model metrics."""
    baseline = _load_json("baseline_xbd_metrics.json")
    india = _load_json("india_tuned_metrics.json")

    result = {
        "baseline": baseline,
        "india_tuned": india,
        "comparison_available": baseline is not None and india is not None
    }

    if result["comparison_available"]:
        bm = baseline["metrics"]
        im = india["metrics"]
        result["delta"] = {
            "overall_accuracy": im["overall_accuracy"] - bm["overall_accuracy"],
            "mean_iou": im["mean_iou"] - bm["mean_iou"],
            "macro_f1": im["macro_f1"] - bm["macro_f1"],
            "building_mean_iou": im["building_mean_iou"] - bm["building_mean_iou"],
        }
    else:
        result["note"] = "India-tuned model has not been trained yet. Only baseline metrics are available."

    return result


@router.get("/evaluation/cross-event")
def get_cross_event():
    """Return cross-event generalisation experiment results."""
    data = _load_json("cross_event_results.json")
    if not data:
        return {
            "status": "not_run",
            "note": "Cross-event experiment requires trained India model and real satellite imagery."
        }
    return data
