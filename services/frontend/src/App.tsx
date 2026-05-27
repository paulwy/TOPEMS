import { useState, useEffect } from 'react'

interface ProductionPlan {
  id: string
  product_name: string
  product_code: string
  planned_quantity: number
  start_date: string
  end_date: string
  status: string
  created_by: string
}

interface SupplyChainOrder {
  id: string
  order_type: string
  material_name: string
  quantity: number
  supplier_customer: string
  status: string
  order_date: string
  expected_date: string
  created_by: string
}

interface FinancialRecord {
  id: string
  record_type: string
  description: string
  amount: number
  category: string
  date: string
  reference_number: string
  created_by: string
}

function App() {
  const [activeTab, setActiveTab] = useState<'production' | 'supply' | 'financial'>('production')
  const [showForm, setShowForm] = useState(false)
  
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([])
  const [supplyChainOrders, setSupplyChainOrders] = useState<SupplyChainOrder[]>([])
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([])
  
  const [loading, setLoading] = useState(true)

  const [planForm, setPlanForm] = useState({
    product_name: '',
    product_code: '',
    planned_quantity: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    created_by: '',
  })

  const [orderForm, setOrderForm] = useState({
    order_type: '采购',
    material_name: '',
    quantity: 0,
    supplier_customer: '',
    expected_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    created_by: '',
  })

  const [recordForm, setRecordForm] = useState({
    record_type: '收入',
    description: '',
    amount: 0,
    category: '',
    reference_number: '',
    created_by: '',
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      const [plansRes, ordersRes, recordsRes] = await Promise.all([
        fetch('/api/v1/production-plans'),
        fetch('/api/v1/supply-chain-orders'),
        fetch('/api/v1/financial-records'),
      ])

      const plansData = await plansRes.json()
      const ordersData = await ordersRes.json()
      const recordsData = await recordsRes.json()

      if (plansData.success) setProductionPlans(plansData.data || [])
      if (ordersData.success) setSupplyChainOrders(ordersData.data || [])
      if (recordsData.success) setFinancialRecords(recordsData.data || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/v1/production-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setPlanForm({
          product_name: '',
          product_code: '',
          planned_quantity: 0,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_by: '',
        })
        fetchAllData()
      }
    } catch (err) {
      console.error('Failed to add plan:', err)
    }
  }

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/v1/supply-chain-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setOrderForm({
          order_type: '采购',
          material_name: '',
          quantity: 0,
          supplier_customer: '',
          expected_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_by: '',
        })
        fetchAllData()
      }
    } catch (err) {
      console.error('Failed to add order:', err)
    }
  }

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/v1/financial-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordForm),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setRecordForm({
          record_type: '收入',
          description: '',
          amount: 0,
          category: '',
          reference_number: '',
          created_by: '',
        })
        fetchAllData()
      }
    } catch (err) {
      console.error('Failed to add record:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '计划中':
      case '待处理':
        return 'bg-blue-100 text-blue-800'
      case '进行中':
      case '已发货':
        return 'bg-yellow-100 text-yellow-800'
      case '已完成':
      case '已交付':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOrderTypeColor = (type: string) => {
    return type === '采购' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const getRecordTypeColor = (type: string) => {
    return type === '收入' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const totalIncome = financialRecords
    .filter(r => r.record_type === '收入')
    .reduce((sum, r) => sum + r.amount, 0)

  const totalExpense = financialRecords
    .filter(r => r.record_type === '支出')
    .reduce((sum, r) => sum + r.amount, 0)

  const netIncome = totalIncome - totalExpense

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏭 TOPEMS ERP - 新材料企业资源管理系统
          </h1>
          <p className="text-gray-600">
            生产计划、供应链管理、财务分析一体化平台
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setActiveTab('production'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'production'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📋 生产计划
          </button>
          <button
            onClick={() => { setActiveTab('supply'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'supply'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            🚚 供应链管理
          </button>
          <button
            onClick={() => { setActiveTab('financial'); setShowForm(false); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'financial'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            💰 财务管理
          </button>
        </div>

        {activeTab === 'production' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">生产计划管理</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                {showForm ? '取消' : '新增计划'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">创建生产计划</h3>
                <form onSubmit={handleAddPlan} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
                    <input
                      type="text"
                      value={planForm.product_name}
                      onChange={(e) => setPlanForm({ ...planForm, product_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">产品代码</label>
                    <input
                      type="text"
                      value={planForm.product_code}
                      onChange={(e) => setPlanForm({ ...planForm, product_code: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">计划数量</label>
                    <input
                      type="number"
                      value={planForm.planned_quantity}
                      onChange={(e) => setPlanForm({ ...planForm, planned_quantity: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">创建人</label>
                    <input
                      type="text"
                      value={planForm.created_by}
                      onChange={(e) => setPlanForm({ ...planForm, created_by: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={planForm.start_date}
                      onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={planForm.end_date}
                      onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      创建计划
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {productionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {plan.product_name}
                          <span className="ml-3 text-sm text-gray-500 font-mono">
                            {plan.product_code}
                          </span>
                        </h3>
                        <p className="text-gray-600 mt-1">数量: {plan.planned_quantity}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {plan.start_date} - {plan.end_date} | 创建人: {plan.created_by}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(plan.status)}`}
                      >
                        {plan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'supply' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">供应链管理</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                {showForm ? '取消' : '新增订单'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">创建供应链订单</h3>
                <form onSubmit={handleAddOrder} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">订单类型</label>
                    <select
                      value={orderForm.order_type}
                      onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="采购">采购订单</option>
                      <option value="销售">销售订单</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">物资名称</label>
                    <input
                      type="text"
                      value={orderForm.material_name}
                      onChange={(e) => setOrderForm({ ...orderForm, material_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                    <input
                      type="number"
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商/客户</label>
                    <input
                      type="text"
                      value={orderForm.supplier_customer}
                      onChange={(e) => setOrderForm({ ...orderForm, supplier_customer: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">期望交期</label>
                    <input
                      type="date"
                      value={orderForm.expected_date}
                      onChange={(e) => setOrderForm({ ...orderForm, expected_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">创建人</label>
                    <input
                      type="text"
                      value={orderForm.created_by}
                      onChange={(e) => setOrderForm({ ...orderForm, created_by: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      创建订单
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {supplyChainOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {order.material_name}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          数量: {order.quantity} | {order.supplier_customer}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          订单日期: {order.order_date} | 期望交期: {order.expected_date} | 创建人: {order.created_by}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderTypeColor(order.order_type)}`}
                        >
                          {order.order_type}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">总收入</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ¥{totalIncome.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">总支出</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  ¥{totalExpense.toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500">净收入</h3>
                <p className={`text-2xl font-bold mt-2 ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ¥{netIncome.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">财务记录</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                {showForm ? '取消' : '新增记录'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium mb-4">添加财务记录</h3>
                <form onSubmit={handleAddRecord} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select
                      value={recordForm.record_type}
                      onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      <option value="收入">收入</option>
                      <option value="支出">支出</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                    <input
                      type="number"
                      step="0.01"
                      value={recordForm.amount}
                      onChange={(e) => setRecordForm({ ...recordForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                    <input
                      type="text"
                      value={recordForm.category}
                      onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      placeholder="如：原材料、人工、销售等"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">参考编号</label>
                    <input
                      type="text"
                      value={recordForm.reference_number}
                      onChange={(e) => setRecordForm({ ...recordForm, reference_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <input
                      type="text"
                      value={recordForm.description}
                      onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">创建人</label>
                    <input
                      type="text"
                      value={recordForm.created_by}
                      onChange={(e) => setRecordForm({ ...recordForm, created_by: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                      添加记录
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {financialRecords.map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {record.description}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          分类: {record.category} {record.reference_number && `| 编号: ${record.reference_number}`}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          日期: {record.date} | 创建人: {record.created_by}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getRecordTypeColor(record.record_type)}`}
                        >
                          {record.record_type}
                        </span>
                        <p className={`font-bold ${record.record_type === '收入' ? 'text-green-600' : 'text-red-600'}`}>
                          {record.record_type === '收入' ? '+' : '-'}¥{record.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
