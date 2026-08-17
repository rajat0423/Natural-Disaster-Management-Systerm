"""
============================================================
Disaster Management System — Two-Stage End-to-End CV Pipeline
============================================================

Combines:
  - Stage 1: Pre+Post U-Net ResNet34 Building Localization
  - Stage 2: Siamese ResNet18 Multi-Temporal Damage Classifier
  - Polygon Extraction -> Shapely Vectorization -> GeoJSON FeatureCollection
"""

import os
import sys
import time
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from shapely.geometry import Polygon, mapping

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(os.path.join(ROOT_DIR, "ai-service"))

from app.cv.stage1_localization import BuildingLocalizationUNet
from app.cv.stage2_damage_classification import SiameseDamageClassifier, DAMAGE_CLASSES

MODELS_DIR = os.path.join(ROOT_DIR, "ai-service", "models")
STAGE1_MODEL_PATH = os.path.join(MODELS_DIR, "stage1_building_loc_best.pth")
STAGE2_MODEL_PATH = os.path.join(MODELS_DIR, "stage2_damage_clf_best.pth")


class TwoStageDisasterPipeline:
    def __init__(self, stage1_weights=STAGE1_MODEL_PATH, stage2_weights=STAGE2_MODEL_PATH, device="cpu"):
        self.device = torch.device(device)
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
        # 1. Load Stage 1 Localization Model
        self.stage1 = BuildingLocalizationUNet(in_channels=6)
        if os.path.exists(stage1_weights):
            self.stage1.load_state_dict(torch.load(stage1_weights, map_location=self.device, weights_only=True))
            print(f"[Pipeline] Loaded Stage 1 Localization weights from {stage1_weights}")
        self.stage1.to(self.device)
        self.stage1.eval()
        
        # 2. Load Stage 2 Siamese Damage Classifier
        self.stage2 = SiameseDamageClassifier(num_classes=4, pretrained=False)
        if os.path.exists(stage2_weights):
            self.stage2.load_state_dict(torch.load(stage2_weights, map_location=self.device, weights_only=True))
            print(f"[Pipeline] Loaded Stage 2 Damage Classifier weights from {stage2_weights}")
        self.stage2.to(self.device)
        self.stage2.eval()

    def predict_pair(self, pre_rgb, post_rgb, bldg_threshold=0.5, crop_size=(64, 64), min_area=15, padding=8):
        """
        Runs the complete Two-Stage inference pipeline on a paired pre/post disaster tile.
        
        pre_rgb: (H, W, 3) uint8 numpy array (RGB)
        post_rgb: (H, W, 3) uint8 numpy array (RGB)
        
        Returns: (GeoJSON FeatureCollection dict, benchmark dict)
        """
        t0_total = time.perf_counter()
        orig_h, orig_w, _ = pre_rgb.shape
        
        # 1. Resize to (512, 512) for Stage 1 Localization
        t_size = (512, 512)
        pre_s1 = cv2.resize(pre_rgb, t_size, interpolation=cv2.INTER_LINEAR)
        post_s1 = cv2.resize(post_rgb, t_size, interpolation=cv2.INTER_LINEAR)
        
        # Normalize
        pre_norm = (pre_s1.astype(np.float32) / 255.0 - self.mean) / self.std
        post_norm = (post_s1.astype(np.float32) / 255.0 - self.mean) / self.std
        
        pre_t = np.transpose(pre_norm, (2, 0, 1))
        post_t = np.transpose(post_norm, (2, 0, 1))
        input_6ch = torch.tensor(np.concatenate([pre_t, post_t], axis=0), dtype=torch.float32).unsqueeze(0).to(self.device)
        
        # Stage 1 Inference
        t0_s1 = time.perf_counter()
        with torch.no_grad():
            logits_s1 = self.stage1(input_6ch)
            prob_mask_s1 = torch.sigmoid(logits_s1).squeeze().cpu().numpy()
        dt_s1_ms = (time.perf_counter() - t0_s1) * 1000.0
        
        # Threshold & resize binary mask back to original resolution
        bin_mask_512 = (prob_mask_s1 >= bldg_threshold).astype(np.uint8)
        bin_mask_orig = cv2.resize(bin_mask_512, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
        
        # Extract polygon contours
        cnts, _ = cv2.findContours(bin_mask_orig, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Extract Stage 2 Crops
        crop_pre_list = []
        crop_post_list = []
        valid_polygons = []
        areas = []
        
        for cnt in cnts:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            x0 = max(0, x - padding)
            y0 = max(0, y - padding)
            x1 = min(orig_w, x + w + padding)
            y1 = min(orig_h, x + h + padding)
            
            c_pre = cv2.resize(pre_rgb[y0:y1, x0:x1], crop_size, interpolation=cv2.INTER_LINEAR)
            c_post = cv2.resize(post_rgb[y0:y1, x0:x1], crop_size, interpolation=cv2.INTER_LINEAR)
            
            c_pre_n = (c_pre.astype(np.float32) / 255.0 - self.mean) / self.std
            c_post_n = (c_post.astype(np.float32) / 255.0 - self.mean) / self.std
            
            crop_pre_list.append(torch.tensor(np.transpose(c_pre_n, (2, 0, 1)), dtype=torch.float32))
            crop_post_list.append(torch.tensor(np.transpose(c_post_n, (2, 0, 1)), dtype=torch.float32))
            
            # Simplify polygon contour slightly for smooth GeoJSON output
            epsilon = 0.015 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) >= 3:
                pts = approx.squeeze(1).tolist()
                if pts[0] != pts[-1]:
                    pts.append(pts[0])
                valid_polygons.append(Polygon(pts))
            else:
                valid_polygons.append(None)
            areas.append(area)
            
        # Stage 2 Inference
        dt_s2_ms = 0.0
        features = []
        damage_counts = {"no-damage": 0, "minor-damage": 0, "major-damage": 0, "destroyed": 0}
        
        if len(crop_pre_list) > 0:
            batch_pre = torch.stack(crop_pre_list, dim=0).to(self.device)
            batch_post = torch.stack(crop_post_list, dim=0).to(self.device)
            
            t0_s2 = time.perf_counter()
            with torch.no_grad():
                logits_s2 = self.stage2(batch_pre, batch_post)
                probs_s2 = F.softmax(logits_s2, dim=1).cpu().numpy()
            dt_s2_ms = (time.perf_counter() - t0_s2) * 1000.0
            
            preds_s2 = np.argmax(probs_s2, axis=1)
            
            for i, poly in enumerate(valid_polygons):
                if poly is None or not poly.is_valid:
                    continue
                p_cls = preds_s2[i]
                p_name = DAMAGE_CLASSES[p_cls]
                p_conf = float(probs_s2[i, p_cls])
                p_probs = {DAMAGE_CLASSES[k]: round(float(probs_s2[i, k]), 4) for k in range(4)}
                
                damage_counts[p_name] += 1
                
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[list(pt) for pt in poly.exterior.coords]]
                    },
                    "properties": {
                        "building_id": i + 1,
                        "damage_class": p_name,
                        "confidence": round(p_conf, 4),
                        "probabilities": p_probs,
                        "area_pixels": float(areas[i])
                    }
                })
                
        dt_total_ms = (time.perf_counter() - t0_total) * 1000.0
        
        geojson_collection = {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "total_buildings_detected": len(features),
                "damage_summary": damage_counts,
                "stage1_latency_ms": round(dt_s1_ms, 2),
                "stage2_latency_ms": round(dt_s2_ms, 2),
                "total_latency_ms": round(dt_total_ms, 2)
            }
        }
        
        return geojson_collection
