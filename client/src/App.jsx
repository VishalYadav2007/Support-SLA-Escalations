import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import StitchPage from './components/stitch/StitchPage';
import TicketsPage from './pages/TicketsPage';
import OverviewPage from './pages/OverviewPage';
import ReportsPage from './pages/ReportsPage';
import TeamPage from './pages/TeamPage';

function TicketsRoute() {
  const [showModal, setShowModal] = useState(false);
  return <TicketsPage showModal={showModal} setShowModal={setShowModal} query="" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StitchPage />} />
      <Route path="/settings" element={<StitchPage />} />
      <Route path="/queue" element={<TicketsRoute />} />
      <Route path="/tickets" element={<TicketsRoute />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/escalations" element={<TicketsRoute />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="*" element={<StitchPage />} />
    </Routes>
  );
}
