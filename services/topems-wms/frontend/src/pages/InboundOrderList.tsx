import { useState, useEffect } from 'react'
import { inboundOrderApi, InboundOrder } from '../api'

function InboundOrderList() {
  const [orders, setOrders] = useState<InboundOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InboundOrder | null>(null)
  const [formData, setFormData] = useState({
    orderNumber: '',
    warehouseId: '',
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedArrival: '',
    totalAmount: 0,
    remarks: '',
  })

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const res = await inboundOrderApi.getInboundOrders()
      if (res.data.success && res.data.data) {
        setOrders(res.data.data.orders || [])
      }
    } catch (e) {
      console.error('加载入库订单列表失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        orderDate: new Date(formData.orderDate).toISOString(),
        expectedArrival: formData.expectedArrival ? new Date(formData.expectedArrival).toISOString() : undefined,
      }
      if (editing) {
        await inboundOrderApi.updateInboundOrder(editing.id, data)
      } else {
        await inboundOrderApi.createInboundOrder(data)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({
        orderNumber: '',
        warehouseId: '',
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedArrival: '',
        totalAmount: 0,
        remarks: '',
      })
      loadOrders()
    } catch (e) {
      console.error('操作失败', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个入库订单吗？')) return
    try {
      await inboundOrderApi.deleteInboundOrder(id)
      loadOrders()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const handleEdit = (order: InboundOrder) => {
    setEditing(order)
    setFormData({
      orderNumber: order.orderNumber,
      warehouseId: order.warehouseId || '',
      supplierId: order.supplierId || '',
      orderDate: new Date(order.orderDate).toISOString().split('T')[0],
      expectedArrival: order.expectedArrival ? new Date(order.expectedArrival).toISOString().split('T')[0] : '',
      totalAmount: order.totalAmount || 0,
      remarks: order.remarks || '',
    })
    setShowForm(true)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '待处理', className: 'bg-yellow-100 text-yellow-800' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      cancelled: { label: '已取消', className: 'bg-red-100 text-red-800' },
    }
    const s = statusMap[status] || { label: status, className: 'bg-slate-100 text-slate-800' }
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.className}`}>{s.label}</span>
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">入库订单列表</h2>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({
              orderNumber: '',
              warehouseId: '',
              supplierId: '',
              orderDate: new Date().toISOString().split('T')[0],
              expectedArrival: '',
              totalAmount: 0,
              remarks: '',
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + 新增入库订单
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                订单号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                订单日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                预计到货
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                总金额
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                  {order.orderNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {new Date(order.orderDate).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {order.expectedArrival ? new Date(order.expectedArrival).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                  {order.totalAmount ? `¥${order.totalAmount.toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(order)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            暂无入库订单数据
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editing ? '编辑入库订单' : '新增入库订单'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    订单号 *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      订单日期 *
                    </label>
                    <input
                      required
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      预计到货
                    </label>
                    <input
                      type="date"
                      value={formData.expectedArrival}
                      onChange={(e) => setFormData({ ...formData, expectedArrival: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    总金额
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    备注
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditing(null)
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InboundOrderList
