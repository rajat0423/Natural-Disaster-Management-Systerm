/**
 * ============================================================
 * ResearchMetrics.jsx — Real Evaluation Data Dashboard
 * ============================================================
 * 
 * Fetches actual evaluation metrics from the AI service API.
 * Displays baseline xBD metrics, India-tuned comparison (when available),
 * dataset info, confusion matrix, and training status.
 */

import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';

const AI_BASE = 'http://localhost:8000/api';
const CLASS_NAMES = ['Background', 'No Damage', 'Minor Damage', 'Major Damage', 'Destroyed'];
const CLASS_COLORS = ['#94a3b8', '#10b981', '#f59e0b', '#f97316', '#ef4444'];

function ResearchMetrics() {
  const [baseline, setBaseline] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [models, setModels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('baseline');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bRes, cRes, mRes] = await Promise.allSettled([
        fetch(`${AI_BASE}/evaluation/baseline`).then(r => r.ok ? r.json() : null),
        fetch(`${AI_BASE}/evaluation/comparison`).then(r => r.ok ? r.json() : null),
        fetch(`${AI_BASE}/models`).then(r => r.ok ? r.json() : null),
      ]);
      setBaseline(bRes.status === 'fulfilled' ? bRes.value : null);
      setComparison(cRes.status === 'fulfilled' ? cRes.value : null);
      setModels(mRes.status === 'fulfilled' ? mRes.value : null);
    } catch (e) {
      setError('Failed to load evaluation data. Is the AI service running on port 8000?');
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner message="Loading evaluation metrics..." />;
  if (error) return <ErrorState title="AI Service Unavailable" message={error} onRetry={loadData} />;

  const pct = (v) => v != null ? (v * 100).toFixed(2) + '%' : 'N/A';
  const tabs = [
    { id: 'baseline', label: 'Baseline Evaluation' },
    { id: 'comparison', label: 'Baseline vs India-Tuned' },
    { id: 'dataset', label: 'Dataset Info' },
    { id: 'models', label: 'Model Registry' },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', color: '#f8fafc' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
        Research Evaluation Dashboard
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>
        Real metrics from model evaluation — no fabricated numbers
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #334155' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 20px', background: activeTab === t.id ? '#1e293b' : 'transparent',
            color: activeTab === t.id ? '#f97316' : '#94a3b8', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === t.id ? '2px solid #f97316' : '2px solid transparent',
            fontSize: '0.85rem', fontWeight: activeTab === t.id ? 700 : 400, marginBottom: -2
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'baseline' && <BaselineTab data={baseline} pct={pct} />}
      {activeTab === 'comparison' && <ComparisonTab data={comparison} pct={pct} />}
      {activeTab === 'dataset' && <DatasetTab data={baseline} />}
      {activeTab === 'models' && <ModelsTab data={models} />}
    </div>
  );
}

/* ============================================================
   BASELINE TAB
   ============================================================ */
function BaselineTab({ data, pct }) {
  if (!data || !data.metrics) {
    return <NoDataBox message="Baseline evaluation has not been run yet. Run scripts/run_baseline_eval.py first." />;
  }
  const m = data.metrics;
  const cm = m.confusion_matrix;

  return (
    <div>
      <SectionTitle>xBD Baseline Model — Test Set Results</SectionTitle>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 16 }}>
        Model: {data.model} | Test tiles: {data.test_tiles} | Timestamp: {data.timestamp}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard label="Overall Accuracy" value={pct(m.overall_accuracy)} />
        <MetricCard label="Mean IoU" value={pct(m.mean_iou)} />
        <MetricCard label="Building mIoU" value={pct(m.building_mean_iou)} />
        <MetricCard label="Macro F1" value={pct(m.macro_f1)} />
        <MetricCard label="Building F1" value={pct(m.building_macro_f1)} />
      </div>

      {/* Latency */}
      {data.latency_ms && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: 8 }}>Inference Latency (CPU)</h3>
          <div style={{ display: 'flex', gap: 24, color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>Mean: <b style={{ color: '#f8fafc' }}>{data.latency_ms.mean.toFixed(0)}ms</b></span>
            <span>Std: {data.latency_ms.std.toFixed(0)}ms</span>
            <span>Min: {data.latency_ms.min.toFixed(0)}ms</span>
            <span>Max: {data.latency_ms.max.toFixed(0)}ms</span>
          </div>
        </div>
      )}

      {/* Per-class metrics */}
      <SectionTitle>Per-Class Metrics</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #334155' }}>
            {['Class', 'Precision', 'Recall', 'F1-Score', 'IoU', 'Support'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.values(m.per_class).map((pc, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: CLASS_COLORS[i], marginRight: 8 }} />
                {CLASS_NAMES[i]}
              </td>
              <td style={{ padding: '8px 12px' }}>{pct(pc.precision)}</td>
              <td style={{ padding: '8px 12px' }}>{pct(pc.recall)}</td>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{pct(pc.f1)}</td>
              <td style={{ padding: '8px 12px' }}>{pct(pc.iou)}</td>
              <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{pc.support?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Confusion Matrix */}
      {cm && (
        <>
          <SectionTitle>Confusion Matrix</SectionTitle>
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: 6, color: '#64748b' }}>Actual \ Predicted</th>
                  {CLASS_NAMES.map(c => <th key={c} style={{ padding: 6, color: '#94a3b8', minWidth: 80 }}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {cm.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ padding: 6, fontWeight: 600, color: CLASS_COLORS[ri] }}>{CLASS_NAMES[ri]}</td>
                    {row.map((val, ci) => {
                      const isDiag = ri === ci;
                      const maxRow = Math.max(...row);
                      const intensity = maxRow > 0 ? val / maxRow : 0;
                      return (
                        <td key={ci} style={{
                          padding: 6, textAlign: 'center',
                          background: isDiag ? `rgba(16, 185, 129, ${intensity * 0.3})` : `rgba(239, 68, 68, ${intensity * 0.15})`,
                          fontWeight: isDiag ? 700 : 400, color: '#f8fafc',
                          border: '1px solid #1e293b'
                        }}>{val.toLocaleString()}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Honest assessment */}
      <div style={{ background: '#422006', border: '1px solid #78350f', borderRadius: 8, padding: 16 }}>
        <h3 style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: 8 }}>Honest Assessment</h3>
        <p style={{ color: '#fde68a', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
          The baseline model shows poor performance on minority damage classes (Minor/Major/Destroyed).
          This is expected for a model trained on a small xBD subset (68 pairs) with severe class imbalance.
          The model over-predicts Major Damage and Destroyed, resulting in very low precision for these classes.
          India-tuned fine-tuning is expected to improve performance on Indian disaster scenarios only
          when real satellite imagery and verified damage labels are available.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   COMPARISON TAB
   ============================================================ */
function ComparisonTab({ data, pct }) {
  if (!data) {
    return <NoDataBox message="Comparison data unavailable. Check AI service connection." />;
  }
  if (!data.comparison_available) {
    return (
      <div>
        <SectionTitle>Baseline vs India-Tuned Comparison</SectionTitle>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔬</div>
          <h3 style={{ color: '#f8fafc', marginBottom: 8 }}>India-Tuned Model Not Yet Trained</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
            {data.note || 'The India-tuned model requires downloading real Sentinel-2 satellite imagery for Chamoli/Wayanad/Dharali and running fine-tuning with verified damage labels.'}
          </p>
          <div style={{ marginTop: 16, color: '#64748b', fontSize: '0.8rem' }}>
            <p>Sentinel-2 imagery found: Chamoli (Feb 2021, 8% cloud) ✅ | Wayanad (monsoon, blocked) ❌ | Dharali (Jul 2025, 28% cloud) ⚠️</p>
          </div>
        </div>
      </div>
    );
  }

  const bm = data.baseline?.metrics;
  const im = data.india_tuned?.metrics;
  const d = data.delta;
  const rows = [
    ['Overall Accuracy', bm?.overall_accuracy, im?.overall_accuracy, d?.overall_accuracy],
    ['Mean IoU', bm?.mean_iou, im?.mean_iou, d?.mean_iou],
    ['Building mIoU', bm?.building_mean_iou, im?.building_mean_iou, d?.building_mean_iou],
    ['Macro F1', bm?.macro_f1, im?.macro_f1, d?.macro_f1],
  ];

  return (
    <div>
      <SectionTitle>Baseline vs India-Tuned Comparison</SectionTitle>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #334155' }}>
            {['Metric', 'Baseline (xBD)', 'India-Tuned', 'Delta'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#94a3b8' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, bv, iv, dv]) => (
            <tr key={name} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{name}</td>
              <td style={{ padding: '8px 12px' }}>{pct(bv)}</td>
              <td style={{ padding: '8px 12px' }}>{pct(iv)}</td>
              <td style={{ padding: '8px 12px', color: dv > 0 ? '#10b981' : dv < 0 ? '#ef4444' : '#94a3b8' }}>
                {dv != null ? (dv > 0 ? '+' : '') + (dv * 100).toFixed(2) + '%' : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   DATASET TAB
   ============================================================ */
function DatasetTab({ data }) {
  const disasters = data?.disasters_in_dataset || {};
  const split = data?.split || {};

  return (
    <div>
      <SectionTitle>Training Dataset Information</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: '0.9rem', color: '#f97316', marginBottom: 12 }}>xBD Subset v2</h3>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.8 }}>
            <div>Total pairs: <b style={{ color: '#f8fafc' }}>{data?.total_manifest_pairs || 68}</b></div>
            <div>Train: <b style={{ color: '#f8fafc' }}>{split.train || 'N/A'}</b> | Val: <b style={{ color: '#f8fafc' }}>{split.val || 'N/A'}</b> | Test: <b style={{ color: '#f8fafc' }}>{split.test || 'N/A'}</b></div>
            <div>Tile size: 1024x1024 px (resized to 512x512)</div>
            <div>Input mode: Pre+Post 6-channel stack</div>
            <div>Classes: 5 (Background + 4 damage levels)</div>
          </div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: '0.9rem', color: '#f97316', marginBottom: 12 }}>Disaster Distribution</h3>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.8 }}>
            {Object.entries(disasters).map(([name, count]) => (
              <div key={name}>{name}: <b style={{ color: '#f8fafc' }}>{count}</b> pairs</div>
            ))}
          </div>
        </div>
      </div>

      {/* India scenarios */}
      <SectionTitle>India Disaster Scenarios</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { name: 'Chamoli 2021', labels: 'simulated_demo', note: 'EIDC shapefiles available but not yet downloaded', imagery: 'Sentinel-2 found (8% cloud)', color: '#10b981' },
          { name: 'Wayanad 2024', labels: 'simulated_demo', note: 'OSM HOT tags exist but not yet ingested', imagery: 'No optical imagery (monsoon)', color: '#f59e0b' },
          { name: 'Dharali 2025', labels: 'simulated_demo', note: 'Weak inference only — no verified ground truth', imagery: 'Sentinel-2 found (28% cloud)', color: '#ef4444' },
        ].map(s => (
          <div key={s.name} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 16 }}>
            <h4 style={{ color: s.color, fontSize: '0.85rem', marginBottom: 8 }}>{s.name}</h4>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6 }}>
              <div>Labels: <b>{s.labels}</b></div>
              <div>Note: {s.note}</div>
              <div>Imagery: {s.imagery}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   MODELS TAB
   ============================================================ */
function ModelsTab({ data }) {
  if (!data || !data.models) {
    return <NoDataBox message="Model registry unavailable. Check AI service connection." />;
  }

  return (
    <div>
      <SectionTitle>Model Registry</SectionTitle>
      <div style={{ display: 'grid', gap: 12 }}>
        {data.models.map(m => (
          <div key={m.id} style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', margin: '0 0 4px' }}>{m.name}</h4>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {m.architecture} | {(m.parameters || 0).toLocaleString()} params | Input: {m.input_mode}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                Training data: {m.training_data}
              </div>
            </div>
            <span style={{
              padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
              background: m.status === 'available' ? '#065f46' : '#78350f',
              color: m.status === 'available' ? '#34d399' : '#fbbf24'
            }}>
              {m.status === 'available' ? '✓ Available' : '⏳ ' + m.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function SectionTitle({ children }) {
  return <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: 6 }}>{children}</h2>;
}

function MetricCard({ label, value }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f97316' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function NoDataBox({ message }) {
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>📊</div>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{message}</p>
    </div>
  );
}

export default ResearchMetrics;
