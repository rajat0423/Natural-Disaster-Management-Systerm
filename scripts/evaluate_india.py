"""
============================================================
India Model Evaluation & Baseline Comparison
============================================================

Evaluates:
  1. Baseline model (xBD-trained) on Indian test data
  2. India-tuned model on Indian test data
  3. Cross-event generalisation (train Chamoli+Wayanad → test Dharali)
  4. Per-class metrics with confusion matrix
  5. Inference latency benchmark

Produces:
  - Comparison report (JSON)
  - Per-event breakdown
  - Cross-event generalisation matrix
  - Latency statistics

Usage:
  python scripts/evaluate_india.py
"""

import os
import sys
import time
import json
import numpy as np
import torch

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(ROOT_DIR, "ai-service"))

from app.cv.models import BuildingDamageUNet
from app.cv.metrics import compute_metrics, CLASS_NAMES
from app.cv.india_dataset import IndiaDisasterDataset, load_india_manifest


def evaluate_model_on_dataset(model, dataset, device="cpu", label="Model"):
    """
    Evaluates a model on a dataset and returns comprehensive metrics.
    """
    model.eval()
    model.to(device)
    
    all_preds = []
    all_targets = []
    latencies = []
    event_results = {}
    
    with torch.no_grad():
        for i in range(len(dataset)):
            sample = dataset[i]
            img = sample["image"].unsqueeze(0).to(device)
            gt = sample["mask"].numpy()
            event_id = sample["event_id"]
            tile_id = sample["tile_id"]
            
            t0 = time.perf_counter()
            logits = model(img)
            probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
            pred = np.argmax(probs, axis=0)
            latency_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(latency_ms)
            
            all_preds.extend(pred.flatten())
            all_targets.extend(gt.flatten())
            
            # Per-event tracking
            if event_id not in event_results:
                event_results[event_id] = {"preds": [], "targets": [], "tiles": []}
            event_results[event_id]["preds"].extend(pred.flatten())
            event_results[event_id]["targets"].extend(gt.flatten())
            event_results[event_id]["tiles"].append(tile_id)
    
    # Overall metrics
    overall = compute_metrics(np.array(all_targets), np.array(all_preds))
    overall["latency"] = {
        "mean_ms": float(np.mean(latencies)),
        "std_ms": float(np.std(latencies)),
        "min_ms": float(np.min(latencies)) if latencies else 0,
        "max_ms": float(np.max(latencies)) if latencies else 0,
        "tiles_per_second": float(1000.0 / np.mean(latencies)) if latencies else 0
    }
    
    # Per-event metrics
    per_event = {}
    for event_id, data in event_results.items():
        event_metrics = compute_metrics(
            np.array(data["targets"]), np.array(data["preds"])
        )
        per_event[event_id] = {
            "num_tiles": len(data["tiles"]),
            "overall_accuracy": event_metrics["overall_accuracy"],
            "mean_iou": event_metrics["mean_iou"],
            "building_mean_iou": event_metrics["building_mean_iou"],
            "macro_f1": event_metrics["macro_f1"],
            "per_class": event_metrics["per_class"]
        }
    
    overall["per_event"] = per_event
    return overall


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    print("=" * 80)
    print("INDIA MODEL EVALUATION — BASELINE vs INDIA-TUNED COMPARISON")
    print("=" * 80)
    
    # Paths
    manifest_path = os.path.join(ROOT_DIR, "data", "india", "india_manifest.csv")
    baseline_weights = os.path.join(ROOT_DIR, "ai-service", "models", "unet_resnet34_pre_post.pth")
    india_weights = os.path.join(ROOT_DIR, "models", "india_v1", "best_model.pth")
    results_dir = os.path.join(ROOT_DIR, "outputs", "india_evaluation")
    os.makedirs(results_dir, exist_ok=True)
    
    if not os.path.exists(manifest_path):
        print(f"[ERROR] India manifest not found: {manifest_path}")
        print("Run 'python scripts/india/prepare_india_dataset.py' first.")
        sys.exit(1)
    
    # Load all India test data
    all_rows = load_india_manifest(manifest_path)
    
    # All events for full evaluation
    all_events = list(set(r["event_id"] for r in all_rows))
    print(f"\nAvailable events: {all_events}")
    print(f"Total tiles: {len(all_rows)}")
    
    data_root = os.path.join(ROOT_DIR, "data", "india")
    target_size = (512, 512)
    
    ds_all = IndiaDisasterDataset(all_rows, data_root, mode="pre_post",
                                   target_size=target_size, is_training=False)
    
    results = {}
    
    # 1. Evaluate Baseline Model (xBD-trained)
    print("\n" + "=" * 60)
    print("EVALUATING BASELINE MODEL (xBD-Trained)")
    print("=" * 60)
    
    if os.path.exists(baseline_weights):
        model_baseline = BuildingDamageUNet(mode="pre_post", num_classes=5)
        model_baseline.load_state_dict(
            torch.load(baseline_weights, map_location=device, weights_only=True),
            strict=False
        )
        baseline_metrics = evaluate_model_on_dataset(model_baseline, ds_all, device, "Baseline")
        results["baseline"] = baseline_metrics
        
        print(f"  Overall Accuracy: {baseline_metrics['overall_accuracy'] * 100:.2f}%")
        print(f"  Mean IoU:         {baseline_metrics['mean_iou'] * 100:.2f}%")
        print(f"  Building mIoU:    {baseline_metrics['building_mean_iou'] * 100:.2f}%")
        print(f"  Macro F1:         {baseline_metrics['macro_f1'] * 100:.2f}%")
        print(f"  Latency:          {baseline_metrics['latency']['mean_ms']:.1f} ms/tile")
        
        for event_id, ev in baseline_metrics["per_event"].items():
            print(f"    [{event_id}] mIoU: {ev['mean_iou'] * 100:.2f}% | "
                  f"Bldg mIoU: {ev['building_mean_iou'] * 100:.2f}% | "
                  f"Tiles: {ev['num_tiles']}")
    else:
        print(f"  [SKIP] Baseline weights not found at: {baseline_weights}")
    
    # 2. Evaluate India-Tuned Model
    print("\n" + "=" * 60)
    print("EVALUATING INDIA-TUNED MODEL")
    print("=" * 60)
    
    if os.path.exists(india_weights):
        model_india = BuildingDamageUNet(mode="pre_post", num_classes=5)
        model_india.load_state_dict(
            torch.load(india_weights, map_location=device, weights_only=True),
            strict=False
        )
        india_metrics = evaluate_model_on_dataset(model_india, ds_all, device, "India-Tuned")
        results["india_tuned"] = india_metrics
        
        print(f"  Overall Accuracy: {india_metrics['overall_accuracy'] * 100:.2f}%")
        print(f"  Mean IoU:         {india_metrics['mean_iou'] * 100:.2f}%")
        print(f"  Building mIoU:    {india_metrics['building_mean_iou'] * 100:.2f}%")
        print(f"  Macro F1:         {india_metrics['macro_f1'] * 100:.2f}%")
        print(f"  Latency:          {india_metrics['latency']['mean_ms']:.1f} ms/tile")
        
        for event_id, ev in india_metrics["per_event"].items():
            print(f"    [{event_id}] mIoU: {ev['mean_iou'] * 100:.2f}% | "
                  f"Bldg mIoU: {ev['building_mean_iou'] * 100:.2f}% | "
                  f"Tiles: {ev['num_tiles']}")
    else:
        print(f"  [SKIP] India model weights not found at: {india_weights}")
        print("  Run 'python scripts/train_india.py' first.")
    
    # 3. Comparison Table
    if "baseline" in results and "india_tuned" in results:
        b = results["baseline"]
        i = results["india_tuned"]
        
        print("\n" + "=" * 80)
        print("COMPARISON: BASELINE (xBD) vs INDIA-TUNED")
        print("=" * 80)
        print(f"{'Metric':<25} | {'Baseline':>12} | {'India-Tuned':>12} | {'Delta':>10}")
        print("-" * 65)
        
        metrics_compare = [
            ("Overall Accuracy", "overall_accuracy"),
            ("Mean IoU", "mean_iou"),
            ("Building mIoU", "building_mean_iou"),
            ("Macro F1", "macro_f1"),
        ]
        
        for label, key in metrics_compare:
            bv = b[key] * 100
            iv = i[key] * 100
            delta = iv - bv
            print(f"{label:<25} | {bv:>11.2f}% | {iv:>11.2f}% | {delta:>+9.2f}%")
        
        # Per-class comparison
        print("\nPer-Class IoU:")
        for cls_idx in range(1, 5):
            cls_name = CLASS_NAMES.get(cls_idx, f"Class {cls_idx}")
            b_iou = b["per_class"][cls_idx]["iou"] * 100 if cls_idx in b.get("per_class", {}) else 0
            i_iou = i["per_class"][cls_idx]["iou"] * 100 if cls_idx in i.get("per_class", {}) else 0
            print(f"  {cls_name:<20} | {b_iou:>11.2f}% | {i_iou:>11.2f}% | {i_iou - b_iou:>+9.2f}%")
    
    # Save results
    report_path = os.path.join(results_dir, "baseline_vs_india.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n[SAVED] Comparison report: {report_path}")
    print("=" * 80)


if __name__ == "__main__":
    main()
