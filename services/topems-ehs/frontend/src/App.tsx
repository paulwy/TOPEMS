import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { HealthPage } from './pages/HealthPage';
import { SafetyPage } from './pages/SafetyPage';
import { RiskPage } from './pages/RiskPage';
import { TrainingPage } from './pages/TrainingPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/environment" element={<EnvironmentPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/training" element={<TrainingPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
