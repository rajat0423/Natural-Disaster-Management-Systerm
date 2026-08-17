/**
 * ============================================================
 * ResearchMetrics.jsx — Computer Vision Benchmark & Model Evaluation
 * ============================================================
 *
 * Displays empirical evaluation metrics, confusion matrices, and CPU latency
 * benchmarks measured on the controlled multi-disaster xBD benchmark dataset.
 */

import React from 'react';

function ResearchMetrics() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #dee2e6', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1d3557', margin: 0 }}>
            🔬 AI Model Evaluation & Computer Vision Benchmarks
          </h2>
          <span style={{ backgroundColor: '#457b9d', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Controlled xBD Benchmark
          </span>
        </div>
        <p style={{ color: '#6c757d', fontSize: '13px', margin: 0 }}>
          Empirical evaluation results of the Two-Stage Deep Learning Pipeline measured on held-out disaster validation and test partitions using standard CPU inference (Intel Core i5, single-thread).
        </p>
      </div>

      {/* Scientific Integrity Alert */}
      <div style={{
        backgroundColor: '#e8f4f8',
        border: '1px solid #b8daff',
        borderRadius: '6px',
        padding: '12px 16px',
        marginBottom: '24px',
        fontSize: '12px',
        color: '#004085',
        lineHeight: 1.5
      }}>
        <strong>📌 Evaluation Protocol & Definitions:</strong> All metrics are reported transparently from our multi-disaster xBD test split (10 held-out pairs, 2,621,440 evaluation pixels, 694 building instances). Stage 1 metrics report standard <strong>Pixel-Level Intersection over Union (IoU = 43.08%)</strong> and <strong>Sørensen–Dice Coefficient (Dice F1 = 60.22%)</strong> at threshold $\tau = 0.50$. Stage 2 reports 4-class Siamese classifier metrics on oracle building crops (Protocol A) and unconstrained end-to-end tile inference (Protocol B).
      </div>

      {/* Stage 1: Building Localization Panel */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1d3557', margin: 0 }}>
              Stage 1: Binary Building Footprint Localization
            </h3>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>
              Architecture: U-Net with ImageNet-Pretrained ResNet34 Backbone (6-channel Pre + Post Input)
            </span>
          </div>
          <span style={{ backgroundColor: '#2a9d8f', color: '#fff', fontSize: '11px', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
            Building IoU: 43.08% | Building F1 / Dice: 60.22%
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#2a9d8f' }}>43.08%</div>
            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>Pixel-Level Building IoU</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d3557' }}>60.22%</div>
            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>Pixel-Level Dice / F1</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d3557' }}>48.64%</div>
            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>Pixel Precision</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d3557' }}>79.04%</div>
            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>Pixel Recall</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d3557' }}>88.16%</div>
            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>Overall Pixel Accuracy</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#e63946' }}>660 ms</div>
            <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 600 }}>CPU Latency / Full Pair</div>
          </div>
        </div>

        {/* Stage 1 Confusion Matrix Breakdown */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '12px 16px', borderRadius: '6px', fontSize: '11px', color: '#495057', marginBottom: '10px' }}>
          <strong>📊 Stage 1 Exact Pixel Breakdown (Test Split):</strong> TP = 235,025 | FP = 248,187 | FN = 62,322 | TN = 2,075,906 | Total Ground Truth Building Pixels = 297,347.
        </div>

        <div style={{ fontSize: '12px', color: '#495057', backgroundColor: '#f8f9fa', padding: '10px 14px', borderRadius: '6px' }}>
          <strong>💡 Stage 1 Improvement:</strong> Decoupling binary localization from damage classification improved Building IoU by <strong>8.9×</strong> (4.86% → 43.08%) and Building F1 by <strong>7.3×</strong> (8.22% → 60.22%) compared to the original 5-class joint segmentation model.
        </div>
      </div>

      {/* Stage 2: Damage Classification Panel */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '20px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1d3557', margin: 0 }}>
              Stage 2: 4-Class Siamese Damage Classifier
            </h3>
            <span style={{ fontSize: '12px', color: '#6c757d' }}>
              Architecture: Siamese ResNet18 Feature Extractor (Pre + Post + |Pre - Post| Difference Fusion → 1,536-dim Head)
            </span>
          </div>
          <span style={{ backgroundColor: '#e63946', color: '#fff', fontSize: '11px', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
            Macro F1: 31.99% | Throughput: 150.3 bldgs/s
          </span>
        </div>

        {/* 4-Class Breakdown Table */}
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1faee', borderBottom: '2px solid #ced4da' }}>
                <th style={{ padding: '8px 12px', color: '#1d3557' }}>Damage Severity Class</th>
                <th style={{ padding: '8px 12px', color: '#1d3557' }}>Test Samples</th>
                <th style={{ padding: '8px 12px', color: '#1d3557' }}>Class Precision</th>
                <th style={{ padding: '8px 12px', color: '#1d3557' }}>Class Recall</th>
                <th style={{ padding: '8px 12px', color: '#1d3557' }}>Class F1-Score</th>
                <th style={{ padding: '8px 12px', color: '#1d3557' }}>Primary Failure Mode</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2ecc71' }}>🟢 No Damage</td>
                <td style={{ padding: '8px 12px' }}>581</td>
                <td style={{ padding: '8px 12px' }}>93.15%</td>
                <td style={{ padding: '8px 12px' }}>51.29%</td>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>66.15%</td>
                <td style={{ padding: '8px 12px', color: '#6c757d' }}>Over-predicted as Minor due to shadow/illumination changes</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f39c12' }}>🟡 Minor Damage</td>
                <td style={{ padding: '8px 12px' }}>75</td>
                <td style={{ padding: '8px 12px' }}>38.00%</td>
                <td style={{ padding: '8px 12px' }}>50.67%</td>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>43.43%</td>
                <td style={{ padding: '8px 12px', color: '#6c757d' }}>Subtle shingle loss hard to distinguish at 0.5m GSD</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#e67e22' }}>🟠 Major Damage</td>
                <td style={{ padding: '8px 12px' }}>24</td>
                <td style={{ padding: '8px 12px' }}>3.42%</td>
                <td style={{ padding: '8px 12px' }}>33.33%</td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#e63946' }}>6.21%</td>
                <td style={{ padding: '8px 12px', color: '#6c757d' }}>Severe class imbalance (only 24 test crops); confused with Destroyed</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#e74c3c' }}>🔴 Destroyed</td>
                <td style={{ padding: '8px 12px' }}>14</td>
                <td style={{ padding: '8px 12px' }}>7.09%</td>
                <td style={{ padding: '8px 12px' }}>42.86%</td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#e63946' }}>12.16%</td>
                <td style={{ padding: '8px 12px', color: '#6c757d' }}>Rubble confusion with ground burn scars</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Oracle vs End-to-End Comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1d3557', marginBottom: '8px' }}>
              Protocol A: Oracle Evaluation (Ground Truth Crops)
            </h4>
            <ul style={{ fontSize: '11px', color: '#495057', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
              <li><strong>Test Crops:</strong> 694 buildings</li>
              <li><strong>Accuracy:</strong> 50.58%</li>
              <li><strong>Macro F1:</strong> 31.99% | <strong>Weighted F1:</strong> 60.77%</li>
              <li><strong>Inference Latency:</strong> 6.65 ms / building crop (150.3 buildings/second on CPU)</li>
            </ul>
          </div>

          <div style={{ backgroundColor: '#f8f9fa', padding: '14px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1d3557', marginBottom: '8px' }}>
              Protocol B: Unconstrained End-to-End Pipeline
            </h4>
            <ul style={{ fontSize: '11px', color: '#495057', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
              <li><strong>Full Tiles Analyzed:</strong> 10 multi-disaster test tiles (1024×1024)</li>
              <li><strong>Stage 1 Detected Buildings:</strong> 909 structures</li>
              <li><strong>Classification Accuracy on Localized:</strong> 41.58%</li>
              <li><strong>Total Tile Latency:</strong> 2,835.9 ms (~2.84 s per 1024×1024 satellite pair)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Model Parameter Summary */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1d3557', marginBottom: '8px' }}>
          Deep Learning Model Complexity & Weight Footprint
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
          <div><strong>Stage 1 Model:</strong> U-Net ResNet34 (24.4M params, 97.8 MB)</div>
          <div><strong>Stage 2 Model:</strong> Siamese ResNet18 (12.0M params, 48.1 MB)</div>
          <div><strong>Hardware Target:</strong> Intel Core i5-1335U (CPU Only, ₹0 cost)</div>
          <div><strong>Quantization:</strong> FP32 baseline (PyTorch 2.6.0)</div>
        </div>
      </div>

    </div>
  );
}

export default ResearchMetrics;
