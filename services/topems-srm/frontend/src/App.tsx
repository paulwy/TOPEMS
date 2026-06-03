import { useState } from 'react';
import SupplierList from './pages/SupplierList';
import { evaluationApi, purchaseOrderApi, type SupplierEvaluation, type PurchaseOrder } from './api';

interface Contract {
  id: string;
  contract_no: string;
  supplier_id: string;
  supplier_name: string;
  contract_type: string;
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface PurchaseRequirement {
  id: string;
  req_no: string;
  material_code: string;
  material_name: string;
  quantity: number;
  unit: string;
  required_date: string;
  status: string;
  department: string;
}

type TabType = 'suppliers' | 'evaluations' | 'orders' | 'contracts' | 'requirements';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [requirements, setRequirements] = useState<PurchaseRequirement[]>([]);

  const tabs = [
    { id: 'suppliers' as TabType, label: '供应商管理' },
    { id: 'evaluations' as TabType, label: '供应商评估' },
    { id: 'orders' as TabType, label: '采购订单' },
    { id: 'contracts' as TabType, label: '合同管理' },
    { id: 'requirements' as TabType, label: '采购需求' },
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
    if (tab === 'contracts' && contracts.length === 0) {
      const mockContracts: Contract[] = [
        { id: '1', contract_no: 'CT-2024-001', supplier_id: 'SUP-001', supplier_name: '鑫源材料科技', contract_type: '框架协议', amount: 5000000, currency: 'CNY', start_date: '2024-01-01', end_date: '2024-12-31', status: '有效' },
        { id: '2', contract_no: 'CT-2024-002', supplier_id: 'SUP-002', supplier_name: '恒信化工', contract_type: '采购合同', amount: 2000000, currency: 'CNY', start_date: '2024-03-15', end_date: '2024-06-15', status: '已完成' },
        { id: '3', contract_no: 'CT-2024-003', supplier_id: 'SUP-003', supplier_name: '鼎盛原料', contract_type: '采购合同', amount: 1500000, currency: 'CNY', start_date: '2024-05-01', end_date: '2024-11-30', status: '有效' },
      ];
      setContracts(mockContracts);
    }
    if (tab === 'requirements' && requirements.length === 0) {
      const mockRequirements: PurchaseRequirement[] = [
        { id: '1', req_no: 'PR-2024-001', material_code: 'M001', material_name: '原材料A', quantity: 500, unit: '吨', required_date: '2024-07-15', status: '已处理', department: '生产部' },
        { id: '2', req_no: 'PR-2024-002', material_code: 'M002', material_name: '原材料B', quantity: 300, unit: '吨', required_date: '2024-07-20', status: '待处理', department: '生产部' },
        { id: '3', req_no: 'PR-2024-003', material_code: 'M003', material_name: '包装材料', quantity: 1000, unit: '箱', required_date: '2024-07-25', status: '待处理', department: '物流部' },
      ];
      setRequirements(mockRequirements);
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
        {activeTab === 'contracts' && (
          <div style={{ padding: '20px' }}>
            <h2>合同管理</h2>
            {contracts.length === 0 ? (
              <p>暂无合同数据</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>合同编号</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>供应商名称</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>合同类型</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>金额</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>有效期</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{contract.contract_no}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{contract.supplier_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{contract.contract_type}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {contract.amount.toLocaleString()} {contract.currency}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {contract.start_date} ~ {contract.end_date}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: contract.status === '有效' ? '#d4edda' : '#f8d7da',
                          color: contract.status === '有效' ? '#155724' : '#721c24'
                        }}>
                          {contract.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'requirements' && (
          <div style={{ padding: '20px' }}>
            <h2>采购需求列表</h2>
            {requirements.length === 0 ? (
              <p>暂无采购需求</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>需求编号</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>物料编码</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>物料名称</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>需求数量</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>需求日期</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>申请部门</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => (
                    <tr key={req.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{req.req_no}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{req.material_code}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{req.material_name}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{req.quantity} {req.unit}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{req.required_date}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{req.department}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: req.status === '已处理' ? '#d4edda' : '#fff3cd',
                          color: req.status === '已处理' ? '#155724' : '#856404'
                        }}>
                          {req.status}
                        </span>
                      </td>
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