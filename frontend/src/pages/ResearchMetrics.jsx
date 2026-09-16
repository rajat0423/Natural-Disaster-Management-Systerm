/**
 * ============================================================
 * ResearchMetrics.jsx — Empirical Evaluation & CV Benchmarks
 * ============================================================
 */

import React from 'react';

function ResearchMetrics() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1150px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
          AI Model Evaluation & Empirical Benchmarks
        </h1>
        <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
          Rigorous performance metrics evaluated on held-out xBD multi-hazard disaster test partitions (68 total pairs, 3,495 annotated buildings).
        </p>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: STAGE 1 BUILDING LOCALIZATION                     */}
      {/* ============================================================ */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Stage 1: Binary Building Localization (ResNet34 U-Net, 6-Channel Input)
            </h2>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Evaluated on 10 held-out test disaster pairs (2,621,440 pixels, 297,347 ground-truth building pixels, threshold &tau; = 0.50)
            </div>
          </div>
          <span style={{ backgroundColor: '#f0fdf4', color: '#166534', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
            Authoritative Baseline
          </span>
        </div>

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Building IoU (Jaccard)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>43.08%</div>
            <div style={{ fontSize: '9px', color: '#059669', marginTop: '2px' }}>Primary Semantic Metric</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sørensen-Dice / F1</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>60.22%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Harmonic Mean</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pixel Recall</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>79.04%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>235,025 / 297,347 px</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pixel Precision</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>48.64%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>235,025 / 483,212 px</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Instance Recovery</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>84.04%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>583 / 694 GT Buildings</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Full Pair Latency</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>660.4 ms</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>271.5 ms / crop</div>
          </div>
        </div>

        {/* Controlled Study Table */}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
          Controlled Stage 1 Improvement Study (Validation-Tuned Configurations):
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Configuration</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>IoU</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Dice / F1</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Precision</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Recall</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Latency (CPU)</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Engineering Assessment</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#f0fdf4' }}>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>Baseline (&tau; = 0.50, Raw Mask)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>43.08%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>60.22%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>48.64%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>79.04%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>271.5 ms</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#166534' }}>Authoritative Baseline (Maximizes building recall for safety)</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Exp 1: Val Optimal &tau;* (&tau;* = 0.70)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>45.45%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>62.49%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>60.35%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>64.79%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>282.4 ms</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#ea580c' }}>+2.36% IoU precision gain, but discards 14.3% true building recall</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Exp 2: Morphological 3x3 Filter</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>45.43%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>62.48%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>60.43%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>64.68%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>403.8 ms</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#64748b' }}>Negligible delta with +48% CPU latency penalty</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Exp 3: 4-Fold Flip TTA</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>44.92%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>61.99%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>61.32%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>62.68%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>1,607.7 ms</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#dc2626' }}>5.9x CPU compute penalty without test-set gain</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2: STAGE 2 BUILDING DAMAGE CLASSIFICATION            */}
      {/* ============================================================ */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Stage 2: Building Damage Classification (Siamese ResNet18 + Difference Fusion)
            </h2>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Evaluated across 694 test buildings (583 No Damage, 75 Minor, 15 Major, 21 Destroyed)
            </div>
          </div>
          <span style={{ backgroundColor: '#f1f5f9', color: '#334155', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
            Siamese Fusion
          </span>
        </div>

        {/* Stage 2 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Oracle Overall Accuracy</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>50.58%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>351 / 694 bldgs</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Macro F1-Score</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>31.99%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>4-Class Unweighted</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Weighted F1-Score</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>60.77%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Support-Weighted</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Minor Damage F1</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>43.43%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Recall: 50.67%</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Destroyed F1</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>12.16%</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Recall: 42.86%</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>CPU Inference Speed</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>150.3 /s</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>6.65 ms / building</div>
          </div>
        </div>

        {/* Per-Class Breakdown Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Damage Class</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Precision</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Recall</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>F1-Score</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Test Support</th>
              <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>Class Imbalance Context</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#10b981' }}>No Damage (0)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>93.15%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>51.29%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>66.15%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>583 bldgs</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#64748b' }}>Majority class (84.0% of test dataset)</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#f59e0b' }}>Minor Damage (1)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>38.00%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>50.67%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>43.43%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>75 bldgs</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#64748b' }}>Balanced Focal Loss recovery improvement</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#f97316' }}>Major Damage (2)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>3.42%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>33.33%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>6.21%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>15 bldgs</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#64748b' }}>Extremely rare class (2.2% test support)</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700, color: '#ef4444' }}>Destroyed (3)</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>7.09%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>42.86%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>12.16%</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>21 bldgs</td>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', color: '#64748b' }}>Critical structure destruction category</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3: SYSTEM LATENCIES & PROCESSING PERFORMANCE         */}
      {/* ============================================================ */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
          Processing Performance & Measured Latencies (Intel i5 CPU)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Stage 1 Full Tile Segmentation</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>660.4 ms</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>271.5 ms / 512x512 crop</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Stage 2 Siamese Inference</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>6.65 ms</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>150.3 bldgs / sec throughput</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>End-to-End AI Pipeline</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>2.84 s</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Localization + Cropping + Triage</div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Hazard Routing (Dijkstra)</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>191.9 ms</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Graph search with roadblocks</div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 4: DATASET SCOPE, INDIA ADAPTATION & LIMITATIONS     */}
      {/* ============================================================ */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
          Dataset Scope, Geographic Adaptation & Limitations
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', fontSize: '11px' }}>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#0f172a', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Current Dataset
            </strong>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.4 }}>
              Evaluated on the xBD multi-hazard benchmark, consisting of pre- and post-disaster satellite imagery across earthquakes, tsunamis, volcanic eruptions, floods, and wildfires.
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#0f172a', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Current Demonstration
            </strong>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.4 }}>
              Demonstrates end-to-end integration using the 2018 Woolsey Fire historical dataset (Malibu / Ventura County, California) with 181 vector building polygons and 8 road corridors.
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#0f172a', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              India Adaptation
            </strong>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.4 }}>
              The software architecture supports new geographical scenarios. India-specific computer vision accuracy requires labelled Indian satellite imagery (e.g. ISRO/NRSC) for validation and transfer fine-tuning.
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#0f172a', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Live Data Architecture
            </strong>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.4 }}>
              The platform is designed to ingest live tile streams via REST/WMS endpoints. The present demonstration uses precomputed results for high-fidelity interactive analysis without server latency.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

export default ResearchMetrics;
