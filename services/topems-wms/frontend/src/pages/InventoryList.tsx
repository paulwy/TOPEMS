import { useState, useEffect } from 'react'
import { inventoryApi, InventoryItem } from '../api'

function InventoryList() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    specification: '',
    unit: '',
    quantity: 0,
    locationId: '',
    warehouseId: '',
    minQuantity: 0,
    maxQuantity: 0,
  })

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      const res = await inventoryApi.getInventory()
      if (res.data.success && res.data.data) {
        setItems(res.data.data.items || [])
      }
    } catch (e) {
      console.error('加载库存列表失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await inventoryApi.updateInventory(editing.id, formData)
      } else {
        await inventoryApi.createInventory(formData)
      }
      setShowForm(false)
      setEditing(null)
      setFormData({
        sku: '',
        name: '',
        specification: '',
        unit: '',
        quantity: 0,
        locationId: '',
        warehouseId: '',
        minQuantity: 0,
        maxQuantity: 0,
      })
      loadInventory()
    } catch (e) {
      console.error('操作失败', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个库存项吗？')) return
    try {
      await inventoryApi.deleteInventory(id)
      loadInventory()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditing(item)
    setFormData({
      sku: item.sku,
      name: item.name,
      specification: item.specification || '',
      unit: item.unit || '',
      quantity: item.quantity,
      locationId: item.locationId || '',
      warehouseId: item.warehouseId || '',
      minQuantity: item.minQuantity || 0,
      maxQuantity: item.maxQuantity || 0,
    })
    setShowForm(true)
  }

  if (loading) return <div className="p-4 text-slate-600">加载中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-slate-800">库存列表</h2>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({
              sku: '',
              name: '',
              specification: '',
              unit: '',
              quantity: 0,
              locationId: '',
              warehouseId: '',
              minQuantity: 0,
              maxQuantity: 0,
            })
            setShowForm(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + 新增库存
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                规格
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                数量
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                单位
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
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                  {item.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {item.specification || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                  {item.quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {item.unit || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.status === 'normal'
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'low'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.status === 'normal' ? '正常' : item.status === 'low' ? '不足' : '异常'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            暂无库存数据
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                {editing ? '编辑库存' : '新增库存'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SKU *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      名称 *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      规格
                    </label>
                    <input
                      type="text"
                      value={formData.specification}
                      onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      单位
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      数量 *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      最小库存
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({ ...formData, minQuantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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

export default InventoryList
