import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SupplierList } from './pages/SupplierList';
import { EvaluationList } from './pages/EvaluationList';
import { ContractList } from './pages/ContractList';
import { ProductList } from './pages/ProductList';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/evaluations" element={<EvaluationList />} />
          <Route path="/contracts" element={<ContractList />} />
          <Route path="/products" element={<ProductList />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
