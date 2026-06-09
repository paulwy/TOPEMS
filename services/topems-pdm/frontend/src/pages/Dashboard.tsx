import { useEffect, useState } from 'react';
import { productApi, documentApi, materialApi, versionApi } from '../api/client';
import type { Product, ProductDocument, Material, ProductVersion } from '../types';

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<ProductDocument[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, docsData, materialsData, versionsData] = await Promise.all([
        productApi.list(),
        documentApi.list(),
        materialApi.list(),
        versionApi.list(),
      ]);
      setProducts(productsData);
      setDocuments(docsData);
      setMaterials(materialsData);
      setVersions(versionsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: '产品总数', value: products.length, icon: '📦', color: 'from-purple-500 to-indigo-500' },
    { label: '文档数量', value: documents.length, icon: '📄', color: 'from-blue-500 to-cyan-500' },
    { label: '物料总数', value: materials.length, icon: '🧱', color: 'from-green-500 to-teal-500' },
    { label: '版本记录', value: versions.length, icon: '🔄', color: 'from-orange-500 to-red-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-gray-500 mt-1">欢迎使用 TOPEMS 产品数据管理系统</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-xl bg-gradient-to-br ${stat.color}`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最新产品</h2>
          {products.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无产品数据</p>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.product_no}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    product.status === 'active' ? 'bg-green-100 text-green-700' :
                    product.status === 'inactive' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最新文档</h2>
          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无文档数据</p>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">{doc.document_type}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    doc.status === 'active' ? 'bg-green-100 text-green-700' :
                    doc.status === 'inactive' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
