import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HR from './pages/HR';
import CRM from './pages/CRM';
import ERP from './pages/ERP';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <MemoryRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/erp" element={<ERP />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </MemoryRouter>
  );
}

export default App;