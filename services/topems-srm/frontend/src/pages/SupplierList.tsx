import { useState, useEffect } from 'react';
import { supplierApi, type Supplier } from '../api';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      const data = await supplierApi.list();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>供应商列表</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>编号</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>名称</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>类别</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>风险等级</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{supplier.supplier_no}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{supplier.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{supplier.category}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{supplier.status}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{supplier.risk_level}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {new Date(supplier.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}