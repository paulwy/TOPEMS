import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/ProductList';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/documents" element={<div className="p-8"><h1 className="text-2xl font-bold text-gray-900">文档管理 - 开发中</h1></div>} />
          <Route path="/materials" element={<div className="p-8"><h1 className="text-2xl font-bold text-gray-900">物料管理 - 开发中</h1></div>} />
          <Route path="/versions" element={<div className="p-8"><h1 className="text-2xl font-bold text-gray-900">版本管理 - 开发中</h1></div>} />
          <Route path="/configs" element={<div className="p-8"><h1 className="text-2xl font-bold text-gray-900">配置管理 - 开发中</h1></div>} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
