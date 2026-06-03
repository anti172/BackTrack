import { Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './pages/JoinPage';
import HackPage from './pages/HackPage';
import AdminPage from './pages/AdminPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminRoute from './components/AdminRoute';
import GroupsPage from './pages/GroupsPage';
import Level2HackPage from './pages/Level2HackPage';
import Level2DonePage from './pages/Level2DonePage';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-bracket">&gt;</span>
          BackTrack
          <span className="logo-cursor">_</span>
        </div>
        <p className="tagline">Bevezetés a visszalépéses keresésbe</p>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<JoinPage />} />
          <Route path="/hack" element={<HackPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/level2" element={<Level2HackPage />} />
          <Route path="/level2/done" element={<Level2DonePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
