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
        "training_data": "xBD v2 subset (68 pairs, 5 global disasters)",
        "parameters": 24_446_357,
        "input_mode": "pre_post",
        "num_classes": 5,
        "weights_file": os.path.join("ai-service", "models", "unet_resnet34_pre_post.pth"),
        "status": "available"
    },
    "xbd_baseline_post_only": {
        "id": "xbd_baseline_post_only",
        "name": "xBD Baseline (Post-Only)",
        "architecture": "U-Net ResNet34",
        "training_data": "xBD v2 subset (68 pairs, 5 global disasters)",
        "parameters": 24_446_357,
        "input_mode": "post_only",
        "num_classes": 5,
        "weights_file": os.path.join("ai-service", "models", "unet_resnet34_post_only.pth"),
        "status": "available"
    },
    "india_tuned_v1": {
        "id": "india_tuned_v1",
        "name": "India-Tuned v1 (Experiment 0)",
        "architecture": "U-Net ResNet34 (Unweighted Fine-Tuning)",
        "training_data": "Chamoli 2021 (NERC EIDC) + Cyclone Fani 2019 (Copernicus EMSR357)",
        "parameters": 24_446_357,
        "input_mode": "pre_post",
        "num_classes": 5,
        "weights_file": os.path.join("models", "india_v1", "best_model.pth"),
        "status": "available"
    },
    "india_tuned_v2": {
        "id": "india_tuned_v2",
        "name": "India-Tuned v2 (Experiment 1: Class-Weighted)",
        "architecture": "U-Net ResNet34 (Balanced Loss)",
        "training_data": "Chamoli 2021 + Cyclone Fani 2019 (Class-Weighted CE + Cosine LR)",
        "parameters": 24_446_357,
        "input_mode": "pre_post",
        "num_classes": 5,
        "weights_file": os.path.join("models", "india_v2", "best_model.pth"),
        "status": "available"
    },
    "india_tuned_v3": {
        "id": "india_tuned_v3",
        "name": "India-Tuned v3 (Experiment 3: Two-Stage Decoupled & Native Semantics)",
        "architecture": "Two-Stage Architecture (Stage 1 Localization + Stage 2 Native Footprint Classification)",
        "training_data": "Chamoli 2021 (NERC EIDC Native Binary) + Cyclone Fani 2019 (EMSR357 Points) + Manual Subset (166 bldgs)",
        "parameters": 24_446_357,
        "input_mode": "two_stage_pre_post",
        "num_classes": 2,
        "weights_file": os.path.join("models", "india_v2", "best_model.pth"),
        "status": "available"
    }
}


def _load_json(filename):
    """Load a JSON file from the evaluation directory."""
    path = os.path.join(EVAL_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


@router.get("/models")
def list_models():
    """List all registered models with availability status."""
    models = []
    for mid, info in MODEL_REGISTRY.items():
        wpath = os.path.join(ROOT_DIR, info["weights_file"]) if info.get("weights_file") else None
        info_copy = dict(info)
        info_copy["weights_exist"] = os.path.exists(wpath) if wpath else False
        if info_copy["weights_exist"]:
            info_copy["weights_size_mb"] = round(os.path.getsize(wpath) / 1e6, 1)
        models.append(info_copy)
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
    comp_data = _load_json("baseline_vs_india.json")
    if comp_data and "baseline" in comp_data and "india_tuned" in comp_data:
        b = comp_data["baseline"]
        i = comp_data["india_tuned"]
        delta = {
            "overall_accuracy": i["overall_accuracy"] - b["overall_accuracy"],
            "mean_iou": i["mean_iou"] - b["mean_iou"],
            "macro_f1": i["macro_f1"] - b["macro_f1"],
            "building_mean_iou": i["building_mean_iou"] - b["building_mean_iou"],
        }
        return {
            "baseline": b,
            "india_tuned": i,
            "delta": delta,
            "comparison_available": True,
            "per_event": {
                "baseline": b.get("per_event", {}),
                "india_tuned": i.get("per_event", {})
            }
        }

    # Fallback to separate files if needed
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
    comp_data = _load_json("baseline_vs_india.json")
    if comp_data and "india_tuned" in comp_data:
        per_ev = comp_data["india_tuned"].get("per_event", {})
        baseline_ev = comp_data["baseline"].get("per_event", {})
        if "dharali_2025" in per_ev:
            return {
                "status": "completed",
                "test_event": "dharali_2025",
                "training_events": ["chamoli_2021", "fani_2019"],
                "scientific_disclosure": "Dharali 2025 has zero verified building-by-building ground-truth damage labels. Quantitative building damage metrics are N/A. Evaluated strictly as qualitative zero-shot inference on an unseen disaster scenario.",
                "quantitative_damage_metrics": "N/A",
                "qualitative_zero_shot": "Available (20 ha ISRO debris fan overlay & operational zone generation)",
                "baseline_metrics": baseline_ev.get("dharali_2025", {}),
                "india_tuned_metrics": per_ev["dharali_2025"],
                "delta_miou": per_ev["dharali_2025"]["mean_iou"] - baseline_ev.get("dharali_2025", {}).get("mean_iou", 0),
                "delta_building_miou": per_ev["dharali_2025"]["building_mean_iou"] - baseline_ev.get("dharali_2025", {}).get("building_mean_iou", 0),
                "note": "qualitative zero-shot inference on an unseen disaster scenario."
            }

    return {
        "status": "not_run",
        "note": "Cross-event experiment requires trained India model."
    }
