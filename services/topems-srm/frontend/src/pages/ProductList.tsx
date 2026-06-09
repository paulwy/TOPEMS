import { useEffect, useState } from 'react';
import { productApi } from '../api/client';
import type { SupplierProduct } from '../types';

export function ProductList() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productApi.list();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'discontinued':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
          <p className="text-gray-500 mt-1">管理供应商产品和服务</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <span>➕</span>
          <span>添加产品</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-lg">📦</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(product.status)}`}>
                    {product.status}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 font-mono">{product.product_no}</p>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                  👁️
                </button>
                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  ✏️
                </button>
              </div>
            </div>
            
            {product.description && (
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {product.category && (
                  <div>
                    <p className="text-gray-500">类别</p>
                    <p className="text-gray-900">{product.category}</p>
                  </div>
                )}
                {product.unit_price && (
                  <div>
                    <p className="text-gray-500">单价</p>
                    <p className="text-gray-900 font-medium">
                      {product.unit_price.toLocaleString()} {product.currency}
                    </p>
                  </div>
                )}
                {product.min_order_qty && (
                  <div>
                    <p className="text-gray-500">最小起订</p>
                    <p className="text-gray-900">{product.min_order_qty} {product.unit || ''}</p>
                  </div>
                )}
                {product.lead_time_days && (
                  <div>
                    <p className="text-gray-500">交付周期</p>
                    <p className="text-gray-900">{product.lead_time_days} 天</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">📦</div>
          <p className="text-gray-500">暂无产品数据</p>
        </div>
      )}
    </div>
  );
}
