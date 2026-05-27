import { useState } from 'react';
import SupplierList from './pages/SupplierList';
import { evaluationApi, purchaseOrderApi, type SupplierEvaluation, type PurchaseOrder } from './api';

type TabType = 'suppliers' | 'evaluations' | 'orders';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  const tabs = [
    { id: 'suppliers' as TabType, label: '供应商管理' },
    { id: 'evaluations' as TabType, label: '供应商评估' },
    { id: 'orders' as TabType, label: '采购订单' },
  ];

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'evaluations' && evaluations.length === 0) {
      try {
        const data = await evaluationApi.list();
        setEvaluations(data);
      } catch (error) {
        console.error('Failed to fetch evaluations:', error);
      }
    }
    if (tab === 'orders' && orders.length === 0) {
      try {
        const data = await purchaseOrderApi.list();
        setOrders(data);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#2c3e50', color: 'white', padding: '1rem' }}>
        <h1>TOPEMS-SRM 供应商关系管理系统</h1>
      </header>
      <nav style={{ background: '#34495e', padding: '0.5rem' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              background: activeTab === tab.id ? '#2980b9' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              marginRight: '0.5rem',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main>
        {activeTab === 'suppliers' && <SupplierList />}
        {activeTab === 'evaluations' && (
          <div style={{ padding: '20px' }}>
            <h2>供应商评估列表</h2>
            {evaluations.length === 0 ? (
              <p>暂无评估数据</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>评估编号</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>供应商ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>评估日期</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>综合评分</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evalItem) => (
                    <tr key={evalItem.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{evalItem.evaluation_no}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{evalItem.supplier_id}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {new Date(evalItem.evaluation_date).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{evalItem.overall_score}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{evalItem.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'orders' && (
          <div style={{ padding: '20px' }}>
            <h2>采购订单列表</h2>
            {orders.length === 0 ? (
              <p>暂无订单数据</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>订单编号</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>供应商ID</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>订单日期</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>总金额</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{order.po_no}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{order.supplier_id}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {new Date(order.order_date).toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {order.total_amount?.toLocaleString()} {order.currency}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{order.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}