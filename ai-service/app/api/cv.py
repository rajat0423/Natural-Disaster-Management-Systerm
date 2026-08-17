"""
============================================================
FastAPI Computer Vision Endpoint Router
============================================================

Endpoints:
  - GET  /api/cv/model-info    -> Returns model status, architecture, and parameter counts
  - POST /api/cv/predict-pair  -> Runs live inference and returns GeoJSON FeatureCollection
"""

import os
import time
import json
import torch
import numpy as np
import cv2
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.cv.models import BuildingDamageUNet
from app.cv.geojson_converter import mask_to_geojson

router = APIRouter(prefix="/api/cv", tags=["Computer Vision"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOT_DIR = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(ROOT_DIR, "data", "xbd_subset_v2")

# Global model cache for fast CPU inference
_model_cache = {}


def get_model(mode="pre_post"):
    if mode not in _model_cache:
        model = BuildingDamageUNet(mode=mode, num_classes=5)
        weight_file = "unet_resnet34_pre_post.pth" if mode == "pre_post" else "unet_resnet34_post_only.pth"
        weight_path = os.path.join(MODELS_DIR, weight_file)
        
        if os.path.exists(weight_path):
            state_dict = torch.load(weight_path, map_location="cpu")
            model.load_state_dict(state_dict)
            print(f"[FastAPI CV] Loaded weights from {weight_path}")
        else:
            print(f"[FastAPI CV] Warning: Weights file {weight_path} not found. Running with base weights.")
            
        model.eval()
        _model_cache[mode] = model
    return _model_cache[mode]


@router.get("/model-info")
def get_model_info():
    """Returns metadata about the trained U-Net ResNet34 models."""
    model_b = get_model(mode="pre_post")
    tot_params, train_params = model_b.count_parameters()
    
    results_path = os.path.join(BASE_DIR, "outputs", "evaluation_results.json")
    results_data = {}
    if os.path.exists(results_path):
        with open(results_path, "r") as f:
            results_data = json.load(f)
            
    return {
        "status": "OPERATIONAL",
        "architecture": "U-Net with ResNet34 Encoder",
        "supported_modes": ["pre_post (6-channel)", "post_only (3-channel)"],
        "total_parameters": tot_params,
        "trainable_parameters": train_params,
        "classes": {
            0: "Background",
            1: "No Damage",
            2: "Minor Damage",
            3: "Major Damage",
            4: "Destroyed"
        },
        "default_model": "unet_resnet34_pre_post.pth",
        "benchmark_summary": {
            "mean_latency_ms": results_data.get("model_b_pre_post", {}).get("latency", {}).get("mean_latency_ms", 443.2),
            "throughput_fps": results_data.get("model_b_pre_post", {}).get("latency", {}).get("tiles_per_second", 2.25),
            "building_macro_f1": results_data.get("model_b_pre_post", {}).get("building_macro_f1", 0.082)
        }
    }


class PredictPairRequest(BaseModel):
    pair_id: str
    mode: Optional[str] = "pre_post"
    base_lat: Optional[float] = 34.0522
    base_lon: Optional[float] = -118.6850


@router.post("/predict-pair")
def predict_pair(req: PredictPairRequest):
    """
    Performs building damage segmentation on a pair and returns GeoJSON.
    """
    pre_img_path = os.path.join(DATA_DIR, "images", f"{req.pair_id}_pre_disaster.png")
    post_img_path = os.path.join(DATA_DIR, "images", f"{req.pair_id}_post_disaster.png")
    
    if not os.path.exists(post_img_path):
        raise HTTPException(status_code=404, detail=f"Image pair not found: {req.pair_id}")
        
    pre_bgr = cv2.imread(pre_img_path) if os.path.exists(pre_img_path) else None
    post_bgr = cv2.imread(post_img_path)
    
    if pre_bgr is None:
        pre_bgr = np.zeros((1024, 1024, 3), dtype=np.uint8)
    if post_bgr is None:
        raise HTTPException(status_code=400, detail="Could not read post-disaster image")
        
    # Resize to 512x512 for fast CPU inference
    pre_rgb = cv2.cvtColor(cv2.resize(pre_bgr, (512, 512)), cv2.COLOR_BGR2RGB)
    post_rgb = cv2.cvtColor(cv2.resize(post_bgr, (512, 512)), cv2.COLOR_BGR2RGB)
    
    # Normalize
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    
    pre_norm = ((pre_rgb.astype(np.float32) / 255.0) - mean) / std
    post_norm = ((post_rgb.astype(np.float32) / 255.0) - mean) / std
    
    pre_tensor = np.transpose(pre_norm, (2, 0, 1))
    post_tensor = np.transpose(post_norm, (2, 0, 1))
    
    if req.mode == "post_only":
        input_arr = post_tensor
    else:
        input_arr = np.concatenate([pre_tensor, post_tensor], axis=0)
        
    input_torch = torch.tensor(input_arr, dtype=torch.float32).unsqueeze(0)
    
    model = get_model(req.mode)
    t0 = time.perf_counter()
    with torch.no_grad():
        logits = model(input_torch)
        probs = torch.softmax(logits, dim=1).squeeze(0).numpy()
        pred_mask = np.argmax(probs, axis=0)
    latency_ms = (time.perf_counter() - t0) * 1000.0
    
    geojson_fc = mask_to_geojson(pred_mask, probs, base_lat=req.base_lat, base_lon=req.base_lon)
    geojson_fc["metadata"]["inference_latency_ms"] = round(latency_ms, 2)
    geojson_fc["metadata"]["pair_id"] = req.pair_id
    geojson_fc["metadata"]["mode"] = req.mode
    
    return geojson_fc
