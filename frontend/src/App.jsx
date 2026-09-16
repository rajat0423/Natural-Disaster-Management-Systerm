/**
 * ============================================================
 * DRAS — Disaster Response & Assessment System
 * ============================================================
 * Main application with React Router navigation
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TopBar from './components/Navigation/TopBar';
import Breadcrumb from './components/Navigation/Breadcrumb';
import LandingOverview from './pages/LandingOverview';
import ScenarioSelector from './pages/ScenarioSelector';
import DisasterMap from './pages/DisasterMap';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ResearchMetrics from './pages/ResearchMetrics';
import ReportView from './pages/ReportView';
import SystemHealth from './pages/SystemHealth';

function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Breadcrumb />
      <main style={{ paddingTop: '100px', minHeight: '100vh', background: '#0f172a' }}>
        <Routes>
          <Route path="/" element={<LandingOverview />} />
          <Route path="/scenarios" element={<ScenarioSelector />} />
          <Route path="/scenario/:scenarioId/map" element={<DisasterMap />} />
          <Route path="/scenario/:scenarioId/dashboard" element={<ExecutiveDashboard />} />
          <Route path="/scenario/:scenarioId/reports" element={<ReportView />} />
          <Route path="/research" element={<ResearchMetrics />} />
          <Route path="/system" element={<SystemHealth />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
